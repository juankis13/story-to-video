from __future__ import annotations

import os
import uuid
from collections.abc import Callable
from pathlib import Path

from gtts import gTTS
from moviepy import AudioFileClip, CompositeAudioClip, ImageClip, concatenate_videoclips
from PIL import Image, ImageDraw, ImageFont

from backend.models import VideoFormat
from backend.story_processor import estimate_reading_time, split_into_scenes, wrap_text_for_video

OUTPUT_DIR = Path(__file__).parent.parent / "output"
TEMP_DIR = Path(__file__).parent.parent / "output" / "temp"

FORMAT_DIMENSIONS: dict[VideoFormat, tuple[int, int]] = {
    VideoFormat.YOUTUBE: (1920, 1080),
    VideoFormat.FACEBOOK: (1080, 1080),
    VideoFormat.SHORTS: (1080, 1920),
}


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def find_system_font() -> str:
    """Find an available system font."""
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    ]
    for path in font_paths:
        if os.path.exists(path):
            return path
    return "Helvetica"


def create_slide_image(
    text: str,
    width: int,
    height: int,
    bg_color: str = "#1a1a2e",
    text_color: str = "#ffffff",
    accent_color: str = "#e94560",
    is_title: bool = False,
) -> str:
    """Create a slide image with text using Pillow."""
    bg_rgb = hex_to_rgb(bg_color)
    text_rgb = hex_to_rgb(text_color)
    accent_rgb = hex_to_rgb(accent_color)

    img = Image.new("RGB", (width, height), bg_rgb)
    draw = ImageDraw.Draw(img)

    # Draw accent bar at top
    bar_height = 6
    draw.rectangle([0, 0, width, bar_height], fill=accent_rgb)

    # Draw subtle border
    border = 40
    draw.rectangle(
        [border, border, width - border, height - border],
        outline=(*accent_rgb, 80),
        width=2,
    )

    font_path = find_system_font()

    if is_title:
        font_size = min(width, height) // 12
    else:
        font_size = min(width, height) // 18

    try:
        font = ImageFont.truetype(font_path, font_size)
    except (OSError, IOError):
        font = ImageFont.load_default()

    max_chars = width // (font_size // 2)
    wrapped = wrap_text_for_video(text, max_width=max_chars)

    bbox = draw.textbbox((0, 0), wrapped, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    x = (width - text_w) // 2
    y = (height - text_h) // 2

    # Draw text shadow
    shadow_offset = 3
    draw.text(
        (x + shadow_offset, y + shadow_offset),
        wrapped,
        fill=(0, 0, 0),
        font=font,
    )

    # Draw main text
    draw.text((x, y), wrapped, fill=text_rgb, font=font)

    # Draw decorative dots
    dot_y = height - border - 20
    for i in range(3):
        dot_x = width // 2 - 30 + i * 30
        draw.ellipse([dot_x - 5, dot_y - 5, dot_x + 5, dot_y + 5], fill=accent_rgb)

    temp_path = str(TEMP_DIR / f"slide_{uuid.uuid4().hex[:8]}.png")
    img.save(temp_path, "PNG")
    return temp_path


def generate_tts_audio(text: str, language: str = "es", filename: str | None = None) -> str:
    """Generate TTS audio file from text."""
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    if filename is None:
        filename = f"audio_{uuid.uuid4().hex[:8]}.mp3"
    output_path = str(TEMP_DIR / filename)

    tts = gTTS(text=text, lang=language, slow=False)
    tts.save(output_path)
    return output_path


def generate_video(
    story_id: str,
    title: str,
    content: str,
    author: str = "Anónimo",
    language: str = "es",
    video_format: VideoFormat = VideoFormat.YOUTUBE,
    bg_color: str = "#1a1a2e",
    text_color: str = "#ffffff",
    accent_color: str = "#e94560",
    progress_callback: Callable | None = None,
) -> dict:
    """Generate a complete video from a story."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

    width, height = FORMAT_DIMENSIONS[video_format]

    if progress_callback:
        progress_callback("processing", 5, "Procesando historia...")

    scenes = split_into_scenes(content)

    # Add title scene
    title_scene = {"text": f"{title}\n\nPor: {author}", "type": "title"}
    scenes.insert(0, title_scene)

    # Add outro scene
    outro_scene = {
        "text": "¡Gracias por ver!\n\nSuscríbete para más historias",
        "type": "outro",
    }
    scenes.append(outro_scene)

    if progress_callback:
        progress_callback("generating_audio", 10, "Generando narración...")

    # Generate audio for narration scenes only
    full_narration = ". ".join(
        [s["text"] for s in scenes if s["type"] not in ("title", "outro")]
    )

    # Generate one continuous audio file for the narration
    narration_audio_path = generate_tts_audio(full_narration, language)
    narration_audio = AudioFileClip(narration_audio_path)

    if progress_callback:
        progress_callback("composing_video", 40, "Componiendo video...")

    # Create video clips for each scene
    video_clips: list[ImageClip] = []
    narration_scenes = [s for s in scenes if s["type"] not in ("title", "outro")]
    total_narration_duration = narration_audio.duration

    # Calculate duration per narration scene proportionally
    total_words = sum(len(s["text"].split()) for s in narration_scenes)

    # Title slide
    title_img = create_slide_image(
        scenes[0]["text"], width, height, bg_color, text_color, accent_color, is_title=True
    )
    title_clip = ImageClip(title_img, duration=4)
    video_clips.append(title_clip)

    # Narration slides
    for i, scene in enumerate(narration_scenes):
        scene_words = len(scene["text"].split())
        if total_words > 0:
            scene_duration = (scene_words / total_words) * total_narration_duration
        else:
            scene_duration = estimate_reading_time(scene["text"])
        scene_duration = max(scene_duration, 2.0)

        slide_img = create_slide_image(
            scene["text"], width, height, bg_color, text_color, accent_color
        )
        clip = ImageClip(slide_img, duration=scene_duration)
        video_clips.append(clip)

        if progress_callback:
            pct = 40 + int((i / len(narration_scenes)) * 40)
            progress_callback(
                "composing_video", pct, f"Creando escena {i + 1}/{len(narration_scenes)}..."
            )

    # Outro slide
    outro_img = create_slide_image(
        scenes[-1]["text"], width, height, bg_color, accent_color, text_color, is_title=True
    )
    outro_clip = ImageClip(outro_img, duration=4)
    video_clips.append(outro_clip)

    if progress_callback:
        progress_callback("composing_video", 85, "Renderizando video final...")

    # Concatenate all video clips
    final_video = concatenate_videoclips(video_clips, method="compose")

    # Add narration audio offset by title duration
    narration_with_offset = narration_audio.with_start(4)  # after title slide
    final_video = final_video.with_audio(CompositeAudioClip([narration_with_offset]))

    # Output path
    output_filename = f"{story_id}.mp4"
    output_path = str(OUTPUT_DIR / output_filename)

    final_video.write_videofile(
        output_path,
        fps=24,
        codec="libx264",
        audio_codec="aac",
        preset="medium",
        threads=2,
        logger=None,
        ffmpeg_params=["-pix_fmt", "yuv420p"],
    )

    video_duration = final_video.duration

    # Close clips to release resources
    final_video.close()
    narration_audio.close()

    if progress_callback:
        progress_callback("done", 100, "¡Video generado exitosamente!")

    # Cleanup temp files
    for scene_file in TEMP_DIR.glob("slide_*.png"):
        try:
            scene_file.unlink()
        except OSError:
            pass
    try:
        Path(narration_audio_path).unlink()
    except OSError:
        pass

    return {
        "video_path": output_path,
        "duration": video_duration,
        "scenes_count": len(scenes),
    }
