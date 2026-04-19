import json
from collections.abc import Iterable

from app.core.config import settings
from app.models.vocab_word import VocabularyWord


def build_fill_blank_fallback(definition: str) -> str:
    cleaned_definition = definition.strip().rstrip(".!?")
    normalized_definition = cleaned_definition.lower()

    special_cases = {
        "hello": "When I greet someone warmly, I say ____.",
        "hi": "When I greet someone warmly, I say ____.",
        "goodbye": "When I leave at the end of a conversation, I say ____.",
        "bye": "When I leave at the end of a conversation, I say ____.",
        "see you later": "When I leave at the end of a conversation, I say ____.",
        "thank you": "After someone helps me, I say ____.",
        "thanks": "After someone helps me, I say ____.",
        "please": "When I ask politely for something, I say ____.",
        "sorry": "If I make a mistake and want to apologize, I say ____.",
        "yes": "When I agree with someone, I say ____.",
        "no": "When I disagree or refuse something, I say ____.",
        "good morning": "At the start of the day, I greet someone by saying ____.",
        "good night": "Before going to sleep, I say ____.",
        "nice to meet you": "When I meet someone for the first time, I say ____.",
    }

    if normalized_definition in special_cases:
        return special_cases[normalized_definition]

    return (
        "Choose the word or phrase that best completes this idea: "
        f'"I want to say {cleaned_definition}, so I would use ____."'
    )


def can_generate_fill_blank_sentences() -> bool:
    if not settings.openai_api_key:
        return False

    try:
        from openai import OpenAI  # noqa: F401
    except ImportError:
        return False

    return True


def _normalize_sentence(sentence: str | None) -> str | None:
    if not sentence:
        return None

    cleaned = sentence.strip()
    if "____" not in cleaned:
        return None

    return cleaned


def generate_fill_blank_sentences(words: Iterable[VocabularyWord]) -> dict[str, str]:
    words_to_generate = [word for word in words if not word.fill_blank_sentence]
    if not words_to_generate or not can_generate_fill_blank_sentences():
        return {}

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        word_payload = [
            {
                "word_id": str(word.id),
                "term": word.term,
                "definition": word.definition,
                "language": word.vocabulary_list.language,
            }
            for word in words_to_generate
        ]

        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You create short, natural, beginner-friendly fill-in-the-blank "
                        "English sentences for a language-learning app. For each item, "
                        "return one English sentence containing exactly one blank written "
                        "as four underscores: ____. The sentence should strongly suggest "
                        "the English meaning, while the correct answer will be the target "
                        "language term. Keep the sentence simple and classroom-safe."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Return JSON with this exact shape: "
                        '{"sentences":[{"word_id":"uuid","sentence":"... ____ ..."}]}. '
                        "Use every provided word_id exactly once.\n\n"
                        f"Words:\n{json.dumps(word_payload, ensure_ascii=True)}"
                    ),
                },
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "fill_blank_sentences",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "sentences": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "word_id": {"type": "string"},
                                        "sentence": {"type": "string"},
                                    },
                                    "required": ["word_id", "sentence"],
                                    "additionalProperties": False,
                                },
                            }
                        },
                        "required": ["sentences"],
                        "additionalProperties": False,
                    },
                }
            },
        )

        parsed = json.loads(response.output_text)
        generated: dict[str, str] = {}
        for item in parsed.get("sentences", []):
            normalized_sentence = _normalize_sentence(item.get("sentence"))
            if normalized_sentence:
                generated[item["word_id"]] = normalized_sentence

        return generated
    except Exception:
        return {}
