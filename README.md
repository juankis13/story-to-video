# Story2Video 🎬

Aplicación web para convertir historias reales en videos profesionales listos para YouTube, Facebook e Instagram.

## Características

- **Narración automática**: Convierte texto en voz usando Google Text-to-Speech (gTTS)
- **Múltiples formatos**: YouTube (16:9), Facebook (1:1), Shorts/Reels (9:16)
- **Personalización**: Colores de fondo, texto y acento configurables
- **Multi-idioma**: Soporte para español, inglés, portugués, francés, alemán e italiano
- **Slides visuales**: Generación automática de slides con texto estilizado
- **Progreso en tiempo real**: Barra de progreso durante la generación del video
- **Descarga directa**: Video MP4 listo para subir a redes sociales

## Arquitectura

```
story-to-video/
├── backend/
│   ├── app.py              # FastAPI application
│   ├── models.py           # Pydantic models
│   ├── story_processor.py  # Text processing utilities
│   └── video_generator.py  # Video generation pipeline
├── frontend/
│   ├── index.html          # Main HTML page
│   ├── css/style.css       # Styles
│   └── js/app.js           # Frontend logic
├── output/                 # Generated videos directory
├── pyproject.toml          # Python project config
└── README.md
```

## Requisitos

- Python 3.10+
- FFmpeg (para MoviePy)
- Fonts del sistema (DejaVu, Liberation, etc.)

## Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd story-to-video

# Crear entorno virtual e instalar dependencias
python3 -m venv .venv
source .venv/bin/activate
pip install -e .

# Instalar FFmpeg (si no está instalado)
sudo apt-get install -y ffmpeg fonts-dejavu-core
```

## Uso

```bash
# Iniciar el servidor
source .venv/bin/activate
uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```

Abre http://localhost:8000 en tu navegador.

## Pipeline de Video

1. **Procesamiento de texto**: La historia se divide en escenas basadas en párrafos y oraciones
2. **Generación de audio**: Se crea narración TTS para todo el contenido
3. **Creación de slides**: Se generan imágenes con texto estilizado para cada escena
4. **Composición**: Se combinan slides + audio en un video MP4 final
5. **Exportación**: El video se guarda como MP4 con codec H.264/AAC

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Página principal |
| POST | `/api/stories` | Enviar historia para generar video |
| GET | `/api/stories/{id}/status` | Verificar progreso |
| GET | `/api/videos/{id}/download` | Descargar video |
| GET | `/api/health` | Health check |

## Licencia

MIT
