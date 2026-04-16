import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    workers = int(os.environ.get("WORKERS", 1))
    reload = os.environ.get("ENV", "development") == "development"

    uvicorn.run(
        "backend.api:app",
        host="0.0.0.0",
        port=port,
        workers=workers if not reload else 1,
        reload=reload,
        reload_excludes=[".venv"] if reload else None,
    )
