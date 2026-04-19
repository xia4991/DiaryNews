from fastapi import FastAPI
from fastapi.responses import HTMLResponse

from backend.chat.router import router

app = FastAPI(title="DiaryNews AI Assistant", version="1.0.0")
app.include_router(router, prefix="/api/chat")


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return """
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>DiaryNews AI Assistant</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; line-height: 1.6; }
          code { background: #f3efe6; padding: 2px 6px; border-radius: 6px; }
        </style>
      </head>
      <body>
        <h1>DiaryNews AI Assistant</h1>
        <p>Markdown-only assistant backend is running.</p>
        <p>Useful endpoints:</p>
        <ul>
          <li><code>GET /api/chat/health</code></li>
          <li><code>POST /api/chat/admin/reindex-wiki</code></li>
          <li><code>POST /api/chat/conversations</code></li>
          <li><code>POST /api/chat/conversations/{id}/messages</code></li>
        </ul>
      </body>
    </html>
    """


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.chat.main:app", host="0.0.0.0", port=8001, reload=False)
