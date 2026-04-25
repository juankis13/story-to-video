from enum import Enum

from pydantic import BaseModel, Field


class VideoFormat(str, Enum):
    YOUTUBE = "youtube"  # 16:9 landscape
    FACEBOOK = "facebook"  # 1:1 square
    SHORTS = "shorts"  # 9:16 vertical (YouTube Shorts / Reels)


class StoryRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Story title")
    content: str = Field(..., min_length=10, max_length=50000, description="Story text content")
    author: str = Field(default="Anónimo", max_length=100, description="Story author")
    language: str = Field(default="es", description="Language code for TTS (e.g. 'es', 'en')")
    video_format: VideoFormat = Field(
        default=VideoFormat.YOUTUBE, description="Target video format"
    )
    bg_color: str = Field(default="#1a1a2e", description="Background color hex")
    text_color: str = Field(default="#ffffff", description="Text color hex")
    accent_color: str = Field(default="#e94560", description="Accent color hex")


class VideoStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    GENERATING_AUDIO = "generating_audio"
    COMPOSING_VIDEO = "composing_video"
    DONE = "done"
    ERROR = "error"


class StoryResponse(BaseModel):
    id: str
    title: str
    author: str
    status: VideoStatus
    message: str = ""
    video_url: str | None = None
    duration_seconds: float | None = None


class VideoProgress(BaseModel):
    id: str
    status: VideoStatus
    progress_percent: int = 0
    message: str = ""
    video_url: str | None = None
