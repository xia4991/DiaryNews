import { useState, useEffect } from 'react'

export default function IdeaModal({ idea, categories, onSave, onClose }) {
  const isEdit = Boolean(idea)
  const [title, setTitle] = useState(idea?.title ?? '')
  const [category, setCategory] = useState(idea?.category ?? 'General')
  const [content, setContent] = useState(idea?.content ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), category: category.trim() || 'General', content })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(6,14,32,0.88)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}>

      <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{ background: '#131b2e', border: '1px solid rgba(70,69,84,0.2)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-sm font-bold font-headline">
            {isEdit ? 'Edit Idea' : 'New Idea'}
          </h2>
          <button onClick={onClose}
            className="rounded-full p-1 text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 pb-5">

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Title</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Idea title…"
              required
              className="rounded-lg px-3 py-2 text-sm bg-transparent border outline-none focus:border-secondary transition-colors"
              style={{ borderColor: 'rgba(70,69,84,0.4)', color: '#dae2fd' }}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Category</label>
            <input
              list="idea-categories"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="General"
              className="rounded-lg px-3 py-2 text-sm bg-transparent border outline-none focus:border-secondary transition-colors"
              style={{ borderColor: 'rgba(70,69,84,0.4)', color: '#dae2fd' }}
            />
            <datalist id="idea-categories">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Content</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your idea…"
              rows={6}
              className="rounded-lg px-3 py-2 text-sm bg-transparent border outline-none focus:border-secondary transition-colors resize-none"
              style={{ borderColor: 'rgba(70,69,84,0.4)', color: '#dae2fd' }}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || !title.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-on-primary transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #c2c1ff, #5e5ce6)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                {saving ? 'hourglass_empty' : 'save'}
              </span>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
