from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.vocab_list import VocabularyList
from app.models.vocab_word import VocabularyWord
from app.services.fill_blank_sentences import generate_fill_blank_sentences
from app.schemas.list import (
    CreateWordRequest,
    CreateListRequest,
    DeleteLanguageRequest,
    GenerateFillBlankSentencesRequest,
    ListResponse,
    RecordWordPerformanceRequest,
    RenameLanguageRequest,
    UpdateWordRequest,
    UpdateListRequest,
    WordResponse,
)

router = APIRouter(prefix="/lists", tags=["lists"])


def calculate_strength(practice_attempts: int, correct_attempts: int) -> str:
    if practice_attempts == 0:
        return "weak"

    accuracy = correct_attempts / practice_attempts

    if practice_attempts >= 5 and accuracy >= 0.85:
        return "strong"

    if practice_attempts >= 3 and accuracy >= 0.6:
        return "okay"

    return "weak"


def get_owned_list_or_404(db: Session, user_id, list_id: UUID) -> VocabularyList:
    vocab_list = db.scalar(
        select(VocabularyList).where(
            VocabularyList.id == list_id,
            VocabularyList.user_id == user_id,
        )
    )

    if not vocab_list:
        raise HTTPException(status_code=404, detail="List not found")

    return vocab_list


@router.post("", response_model=ListResponse)
def create_list(
    payload: CreateListRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # Check for duplicate
    existing = db.scalar(
        select(VocabularyList).where(
            VocabularyList.user_id == user.id,
            VocabularyList.language == payload.language,
            VocabularyList.name == payload.name
        )
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="List with this name already exists for this language"
        )

    vocab_list = VocabularyList(
        user_id=user.id,
        name=payload.name,
        language=payload.language,
    )

    db.add(vocab_list)
    db.commit()
    db.refresh(vocab_list)

    return vocab_list


@router.get("", response_model=list[ListResponse])
def get_lists(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    lists = db.scalars(
        select(VocabularyList)
        .options(selectinload(VocabularyList.words))
        .where(VocabularyList.user_id == user.id)
    ).all()

    return lists


@router.get("/{list_id}/words", response_model=list[WordResponse])
def get_words(
    list_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    get_owned_list_or_404(db, user.id, list_id)

    return db.scalars(
        select(VocabularyWord)
        .where(VocabularyWord.list_id == list_id)
        .order_by(VocabularyWord.created_at.desc())
    ).all()


@router.post("/{list_id}/words", response_model=WordResponse)
def create_word(
    list_id: UUID,
    payload: CreateWordRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    get_owned_list_or_404(db, user.id, list_id)

    existing_word = db.scalar(
        select(VocabularyWord).where(
            VocabularyWord.list_id == list_id,
            VocabularyWord.term == payload.term.strip(),
        )
    )
    if existing_word:
        raise HTTPException(status_code=400, detail="Word already exists in this deck")

    word = VocabularyWord(
        list_id=list_id,
        term=payload.term.strip(),
        definition=payload.definition.strip(),
        fill_blank_sentence=None,
        strength="weak",
    )
    db.add(word)
    db.commit()
    db.refresh(word)

    return word


@router.post("/words/performance", response_model=list[WordResponse])
def record_word_performance(
    payload: RecordWordPerformanceRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not payload.results:
        raise HTTPException(status_code=400, detail="At least one quiz result is required")

    word_ids = [result.word_id for result in payload.results]
    words = db.scalars(
        select(VocabularyWord)
        .join(VocabularyList, VocabularyList.id == VocabularyWord.list_id)
        .where(
            VocabularyWord.id.in_(word_ids),
            VocabularyList.user_id == user.id,
        )
    ).all()

    words_by_id = {word.id: word for word in words}

    if len(words_by_id) != len(set(word_ids)):
        raise HTTPException(status_code=404, detail="One or more words were not found")

    now = datetime.now(timezone.utc)

    for result in payload.results:
        word = words_by_id[result.word_id]
        word.practice_attempts += 1
        if result.is_correct:
            word.correct_attempts += 1
        word.last_practiced_at = now
        word.strength = calculate_strength(
            word.practice_attempts,
            word.correct_attempts,
        )

    db.commit()

    return [words_by_id[result.word_id] for result in payload.results]


@router.post("/words/fill-blank-sentences", response_model=list[WordResponse])
def ensure_fill_blank_sentences(
    payload: GenerateFillBlankSentencesRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not payload.word_ids:
        raise HTTPException(status_code=400, detail="At least one word is required")

    words = db.scalars(
        select(VocabularyWord)
        .join(VocabularyList, VocabularyList.id == VocabularyWord.list_id)
        .options(selectinload(VocabularyWord.vocabulary_list))
        .where(
            VocabularyWord.id.in_(payload.word_ids),
            VocabularyList.user_id == user.id,
        )
    ).all()

    words_by_id = {word.id: word for word in words}
    if len(words_by_id) != len(set(payload.word_ids)):
        raise HTTPException(status_code=404, detail="One or more words were not found")

    generated_sentences = generate_fill_blank_sentences(words)
    for word in words:
        generated_sentence = generated_sentences.get(str(word.id))
        if generated_sentence:
            word.fill_blank_sentence = generated_sentence

    if generated_sentences:
        db.commit()
        for word in words:
            db.refresh(word)

    return [words_by_id[word_id] for word_id in payload.word_ids]


@router.put("/{list_id}/words/{word_id}", response_model=WordResponse)
def update_word(
    list_id: UUID,
    word_id: UUID,
    payload: UpdateWordRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    get_owned_list_or_404(db, user.id, list_id)

    word = db.scalar(
        select(VocabularyWord).where(
            VocabularyWord.id == word_id,
            VocabularyWord.list_id == list_id,
        )
    )
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")

    next_term = payload.term.strip()
    existing_word = db.scalar(
        select(VocabularyWord).where(
            VocabularyWord.list_id == list_id,
            VocabularyWord.term == next_term,
            VocabularyWord.id != word_id,
        )
    )
    if existing_word:
        raise HTTPException(status_code=400, detail="Word already exists in this deck")

    word.term = next_term
    word.definition = payload.definition.strip()
    word.fill_blank_sentence = None
    db.commit()
    db.refresh(word)

    return word


@router.delete("/{list_id}/words/{word_id}")
def delete_word(
    list_id: UUID,
    word_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    get_owned_list_or_404(db, user.id, list_id)

    word = db.scalar(
        select(VocabularyWord).where(
            VocabularyWord.id == word_id,
            VocabularyWord.list_id == list_id,
        )
    )
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")

    db.delete(word)
    db.commit()

    return {"message": "Word deleted successfully"}


@router.post("/languages/rename", response_model=list[ListResponse])
def rename_language(
    payload: RenameLanguageRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    current_language = payload.current_language.strip()
    new_language = payload.new_language.strip()

    if not current_language or not new_language:
        raise HTTPException(status_code=400, detail="Language names are required")

    language_lists = db.scalars(
        select(VocabularyList).where(
            VocabularyList.user_id == user.id,
            VocabularyList.language == current_language,
        )
    ).all()

    if not language_lists:
        raise HTTPException(status_code=404, detail="Language not found")

    if current_language == new_language:
        return language_lists

    target_names = {
        vocab_list.name
        for vocab_list in db.scalars(
            select(VocabularyList).where(
                VocabularyList.user_id == user.id,
                VocabularyList.language == new_language,
            )
        ).all()
    }

    conflicts = sorted(
        vocab_list.name for vocab_list in language_lists if vocab_list.name in target_names
    )
    if conflicts:
        raise HTTPException(
            status_code=400,
            detail=(
                "Can't rename this language because these deck names already exist "
                f"in {new_language}: {', '.join(conflicts)}"
            ),
        )

    for vocab_list in language_lists:
        vocab_list.language = new_language

    db.commit()

    return db.scalars(
        select(VocabularyList).where(
            VocabularyList.user_id == user.id,
            VocabularyList.language == new_language,
        )
    ).all()


@router.post("/languages/delete")
def delete_language(
    payload: DeleteLanguageRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    language = payload.language.strip()

    if not language:
        raise HTTPException(status_code=400, detail="Language name is required")

    language_lists = db.scalars(
        select(VocabularyList).where(
            VocabularyList.user_id == user.id,
            VocabularyList.language == language,
        )
    ).all()

    if not language_lists:
        raise HTTPException(status_code=404, detail="Language not found")

    deleted_count = len(language_lists)
    for vocab_list in language_lists:
        db.delete(vocab_list)

    db.commit()

    return {
        "message": f"Deleted {deleted_count} deck(s) from {language}",
        "deleted_count": deleted_count,
    }


@router.put("/{list_id}", response_model=ListResponse)
def update_list(
    list_id: UUID,
    payload: UpdateListRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    vocab_list = get_owned_list_or_404(db, user.id, list_id)

    # Only check duplicates if name changed
    if payload.name != vocab_list.name:
        existing = db.scalar(
            select(VocabularyList).where(
                VocabularyList.user_id == user.id,
                VocabularyList.language == payload.language,
                VocabularyList.name == payload.name,
                VocabularyList.id != list_id
            )
        )

        if existing:
            raise HTTPException(
                status_code=400,
                detail="List with this name already exists for this language"
            )

    vocab_list.name = payload.name
    vocab_list.language = payload.language

    db.commit()
    db.refresh(vocab_list)

    return vocab_list


@router.delete("/{list_id}")
def delete_list(
    list_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    vocab_list = get_owned_list_or_404(db, user.id, list_id)

    db.delete(vocab_list)
    db.commit()

    return {"message": "List deleted successfully"}
