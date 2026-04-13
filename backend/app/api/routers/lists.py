from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.vocab_list import VocabularyList
from app.schemas.list import CreateListRequest, ListResponse, UpdateListRequest

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
            VocabularyList.name == payload.name
        )
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="List with this name already exists"
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
                VocabularyList.name == payload.name,
                VocabularyList.id != list_id
            )
        )

        if existing:
            raise HTTPException(
                status_code=400,
                detail="List with this name already exists"
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