import { useState } from 'react'
import IdeaModal from '../components/ideas/IdeaModal'
import SectionHeader from '../components/ui/SectionHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

export default function IdeasTab({ ideas, onCreate, onUpdate, onDelete }) {
  const [modal, setModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('All')

  const categories = ['All', ...Array.from(new Set(ideas.map(i => i.category))).sort()]

  const filtered = categoryFilter === 'All'
    ? ideas
    : ideas.filter(i => i.category === categoryFilter)

  const handleSave = async (data) => {
    if (modal === 'new') {
      await onCreate(data)
    } else {
      await onUpdate(modal.id, data)
    }
  }

  const handleDelete = async (id) => {
    await onDelete(id)
    setConfirmDelete(null)
  }

  const filterClass = active =>
    `px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
      active
        ? 'bg-accent text-text-onaccent'
        : 'bg-bg-subtle text-text-muted hover:text-text'
    }`

  return (
    <>
      {modal !== null && (
        <IdeaModal
          idea={modal === 'new' ? null : modal}
          categories={categories.filter(c => c !== 'All')}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      <SectionHeader
        title="Ideas"
        subtitle="Product and community notes."
        action={
          <Button variant="primary" icon="add" onClick={() => setModal('new')}>
            New Idea
          </Button>
        }
      />

      <div className="flex items-center gap-2 flex-wrap mb-5">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={filterClass(categoryFilter === cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
          <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 40 }}>lightbulb</span>
          <p className="text-sm">
            {categoryFilter === 'All' ? 'No ideas yet. Create your first one!' : `No ideas in "${categoryFilter}".`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(idea => (
          <Card
            key={idea.id}
            interactive
            padding="md"
            onClick={() => setModal(idea)}
            className="flex flex-col gap-3 group"
          >
            <div className="flex items-center justify-between">
              <Badge color="#2B6CB0">{idea.category}</Badge>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(idea.id) }}
                className="text-text-subtle hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Delete idea"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
              </button>
            </div>

            <h3
              className="text-[15px] font-bold text-text leading-snug"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {idea.title}
            </h3>

            {idea.content && (
              <p className="text-[13px] text-text-muted leading-relaxed line-clamp-3">
                {idea.content}
              </p>
            )}

            <span className="text-[11px] text-text-subtle mt-auto tabular-nums">
              {idea.updated_at?.slice(0, 10)}
            </span>

            {confirmDelete === idea.id && (
              <div
                className="flex items-center gap-2 pt-2 border-t border-border"
                onClick={e => e.stopPropagation()}
              >
                <span className="text-xs text-text-muted flex-1">Delete?</span>
                <button
                  onClick={() => handleDelete(idea.id)}
                  className="text-xs font-semibold text-danger hover:underline"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="text-xs font-semibold text-text-muted hover:text-text"
                >
                  Cancel
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  )
}
