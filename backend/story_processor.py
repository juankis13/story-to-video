import re
import textwrap


def split_into_scenes(content: str, max_chars_per_scene: int = 300) -> list[dict]:
    """Split story content into scenes for video slides."""
    paragraphs = [p.strip() for p in content.split("\n") if p.strip()]

    scenes: list[dict] = []
    for paragraph in paragraphs:
        sentences = re.split(r"(?<=[.!?])\s+", paragraph)
        current_chunk = ""

        for sentence in sentences:
            if len(current_chunk) + len(sentence) > max_chars_per_scene and current_chunk:
                scenes.append({"text": current_chunk.strip(), "type": "narration"})
                current_chunk = sentence
            else:
                current_chunk = f"{current_chunk} {sentence}".strip()

        if current_chunk:
            scenes.append({"text": current_chunk.strip(), "type": "narration"})

    return scenes


def wrap_text_for_video(text: str, max_width: int = 35) -> str:
    """Wrap text to fit within video frame."""
    return "\n".join(textwrap.wrap(text, width=max_width))


def estimate_reading_time(text: str, wpm: int = 140) -> float:
    """Estimate reading time in seconds for TTS pacing."""
    word_count = len(text.split())
    return max((word_count / wpm) * 60, 3.0)
