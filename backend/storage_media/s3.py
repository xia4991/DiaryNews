from backend.storage_media.base import MediaStorage


class S3MediaStorage(MediaStorage):
    """Stub. Implement when object-storage migration is needed."""

    def store(self, data: bytes, directory: str, ext: str) -> str:
        raise NotImplementedError("S3MediaStorage.store is not yet implemented")

    def url(self, key: str) -> str:
        raise NotImplementedError("S3MediaStorage.url is not yet implemented")

    def delete(self, key: str) -> None:
        raise NotImplementedError("S3MediaStorage.delete is not yet implemented")
