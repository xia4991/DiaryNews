import { useState } from 'react'
import Modal from '../ui/Modal'
import Field from '../ui/Field'
import Button from '../ui/Button'

export default function IdeaModal({ idea, categories, onSave, onClose }) {
  const isEdit = Boolean(idea)
  const [title, setTitle] = useState(idea?.title ?? '')
  const [category, setCategory] = useState(idea?.category ?? 'General')
  const [content, setContent] = useState(idea?.content ?? '')
  const [saving, setSaving] = useState(false)

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
    <Modal onClose={onClose} title={isEdit ? 'Edit Idea' : 'New Idea'} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title" required>
          <input
            id="idea-title"
            autoFocus
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Idea title…"
          />
        </Field>

        <Field label="Category">
          <input
            id="idea-category"
            list="idea-categories"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="General"
          />
        </Field>
        <datalist id="idea-categories">
          {categories.map(c => <option key={c} value={c} />)}
        </datalist>

        <Field label="Content">
          <textarea
            id="idea-content"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your idea…"
            rows={6}
            className="resize-none"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="primary"
            icon="save"
            loading={saving}
            disabled={!title.trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
