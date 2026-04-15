from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.vocab_list import VocabularyList
from app.schemas.list import (
    CreateListRequest,
    DeleteLanguageRequest,
    ListResponse,
    RenameLanguageRequest,
    UpdateListRequest,
)

router = APIRouter(prefix="/lists", tags=["lists"])


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
        select(VocabularyList).where(VocabularyList.user_id == user.id)
    ).all()

    return lists


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
    vocab_list = db.scalar(
        select(VocabularyList).where(
            VocabularyList.id == list_id,
            VocabularyList.user_id == user.id
        )
    )

    if not vocab_list:
        raise HTTPException(status_code=404, detail="List not found")

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
    vocab_list = db.scalar(
        select(VocabularyList).where(
            VocabularyList.id == list_id,
            VocabularyList.user_id == user.id
        )
    )

    if not vocab_list:
        raise HTTPException(status_code=404, detail="List not found")

    db.delete(vocab_list)
    db.commit()

    return {"message": "List deleted successfully"}
