import asyncio
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.models import StoryRequest, StoryResponse, VideoProgress, VideoStatus
from backend.video_generator import OUTPUT_DIR, generate_video

app = FastAPI(
    title="Story to Video",
    description="Convierte historias reales en videos para YouTube/Facebook",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for video jobs
video_jobs: dict[str, VideoProgress] = {}

# Serve frontend static files
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


def update_progress(story_id: str):
    def callback(status: str, percent: int, message: str):
        if story_id in video_jobs:
            video_jobs[story_id].status = VideoStatus(status)
            video_jobs[story_id].progress_percent = percent
            video_jobs[story_id].message = message

    return callback


async def process_video_task(story_id: str, request: StoryRequest):
    """Background task to generate video."""
    try:
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: generate_video(
                story_id=story_id,
                title=request.title,
                content=request.content,
                author=request.author,
                language=request.language,
                video_format=request.video_format,
                bg_color=request.bg_color,
                text_color=request.text_color,
                accent_color=request.accent_color,
                progress_callback=update_progress(story_id),
            ),
        )
        if story_id in video_jobs:
            video_jobs[story_id].status = VideoStatus.DONE
            video_jobs[story_id].progress_percent = 100
            video_jobs[story_id].message = "¡Video listo!"
            video_jobs[story_id].video_url = f"/api/videos/{story_id}/download"
    except Exception as e:
        if story_id in video_jobs:
            video_jobs[story_id].status = VideoStatus.ERROR
            video_jobs[story_id].message = f"Error: {str(e)}"


@app.get("/")
async def root():
    return FileResponse(str(FRONTEND_DIR / "index.html"))


@app.post("/api/stories", response_model=StoryResponse)
async def create_story(request: StoryRequest):
    """Submit a story to be converted into a video."""
    story_id = uuid.uuid4().hex[:12]

    video_jobs[story_id] = VideoProgress(
        id=story_id,
        status=VideoStatus.QUEUED,
        progress_percent=0,
        message="En cola de procesamiento...",
    )

    asyncio.create_task(process_video_task(story_id, request))

    return StoryResponse(
        id=story_id,
        title=request.title,
        author=request.author,
        status=VideoStatus.QUEUED,
        message="Historia recibida. Generando video...",
    )


@app.get("/api/stories/{story_id}/status", response_model=VideoProgress)
async def get_story_status(story_id: str):
    """Check the progress of video generation."""
    if story_id not in video_jobs:
        raise HTTPException(status_code=404, detail="Historia no encontrada")
    return video_jobs[story_id]


@app.get("/api/videos/{story_id}/download")
async def download_video(story_id: str):
    """Download the generated video."""
    video_path = OUTPUT_DIR / f"{story_id}.mp4"
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video no encontrado")

    return FileResponse(
        str(video_path),
        media_type="video/mp4",
        filename=f"historia_{story_id}.mp4",
    )


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "story-to-video"}
