import os
import uuid

from backend.storage_media.base import MediaStorage


class LocalMediaStorage(MediaStorage):
    """Write media to the local filesystem under `root/<dir>/<uuid>.<ext>`.
    URLs are served by FastAPI StaticFiles mounted at `public_url`."""

    def __init__(self, root: str, public_url: str):
        self.root = root.rstrip("/")
        self.public_url = public_url.rstrip("/")

    def _path(self, key: str) -> str:
        return os.path.join(self.root, key)

    def store(self, data: bytes, directory: str, ext: str) -> str:
        directory = directory.strip("/")
        ext = ext.lstrip(".").lower()
        os.makedirs(os.path.join(self.root, directory), exist_ok=True)
        key = f"{directory}/{uuid.uuid4().hex}.{ext}"
        with open(self._path(key), "wb") as f:
            f.write(data)
        return key

    def url(self, key: str) -> str:
        return f"{self.public_url}/{key}"

    def delete(self, key: str) -> None:
        try:
            os.remove(self._path(key))
        except FileNotFoundError:
            pass
