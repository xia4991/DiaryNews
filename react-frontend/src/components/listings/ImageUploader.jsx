import { useState, useRef, useCallback } from 'react'
import { api } from '../../api'

const MAX_IMAGES = 8
const ACCEPT = 'image/jpeg,image/png,image/webp'

export default function ImageUploader({ images = [], onChange, max = MAX_IMAGES }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)
  const dragItem = useRef(null)

  const uploadFiles = useCallback(async (files) => {
    const toUpload = Array.from(files).slice(0, max - images.length)
    if (!toUpload.length) return
    setUploading(true)
    setError(null)
    try {
      const results = await Promise.all(toUpload.map(f => api.uploadMedia(f)))
      onChange([...images, ...results])
    } catch (err) {
      setError(err.response?.data?.detail || '上传失败')
    } finally {
      setUploading(false)
    }
  }, [images, onChange, max])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files)
  }

  const handleRemove = (index) => {
    onChange(images.filter((_, i) => i !== index))
  }

  const handleDragStart = (index) => {
    dragItem.current = index
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (dragItem.current === null || dragItem.current === index) return
    const reordered = [...images]
    const [moved] = reordered.splice(dragItem.current, 1)
    reordered.splice(index, 0, moved)
    dragItem.current = index
    onChange(reordered)
  }

  const handleDragEnd = () => {
    dragItem.current = null
  }

  const canAdd = images.length < max

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-text-muted">
        图片 <span className="font-normal text-text-subtle">({images.length}/{max})</span>
      </label>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, i) => (
            <div
              key={img.storage_key}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-surface-muted cursor-grab active:cursor-grabbing"
            >
              <img
                src={img.thumb_url || img.url}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-accent/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  封面
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors ${
            dragOver
              ? 'border-accent bg-accent-subtle'
              : 'border-border-strong hover:border-accent hover:bg-surface-muted'
          }`}
        >
          <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 28 }}>
            {uploading ? 'progress_activity' : 'add_photo_alternate'}
          </span>
          <span className="text-xs text-text-muted">
            {uploading ? '上传中...' : '点击或拖放图片'}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => { uploadFiles(e.target.files); e.target.value = '' }}
          />
        </div>
      )}

      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  )
}
