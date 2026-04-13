import { useState } from 'react'
import IdeaModal from '../components/ideas/IdeaModal'

export default function IdeasTab({ ideas, onCreate, onUpdate, onDelete }) {
  const [modal, setModal] = useState(null) // null | 'new' | idea object
  const [confirmDelete, setConfirmDelete] = useState(null) // idea id
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

  return (
    <div className="pt-6">
      {/* Modal */}
      {modal !== null && (
        <IdeaModal
          idea={modal === 'new' ? null : modal}
          categories={categories.filter(c => c !== 'All')}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                categoryFilter === cat
                  ? 'text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              style={categoryFilter === cat
                ? { background: 'linear-gradient(135deg, #c2c1ff, #5e5ce6)' }
                : { background: 'rgba(255,255,255,0.05)' }}>
              {cat}
            </button>
          ))}
        </div>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-on-primary transition-all hover:brightness-110 active:scale-95 shrink-0"
          style={{ background: 'linear-gradient(135deg, #c2c1ff, #5e5ce6)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
          New Idea
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.4 }}>lightbulb</span>
          <p className="text-sm">{categoryFilter === 'All' ? 'No ideas yet. Create your first one!' : `No ideas in "${categoryFilter}".`}</p>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(idea => (
          <div key={idea.id}
            className="rounded-xl flex flex-col gap-3 p-4 cursor-pointer group transition-all hover:brightness-110"
            style={{ background: '#131b2e', outline: '1px solid rgba(70,69,84,0.15)' }}
            onClick={() => setModal(idea)}>

            {/* Category badge + delete */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(68,226,205,0.08)', color: '#44e2cd', border: '1px solid rgba(68,226,205,0.2)' }}>
                {idea.category}
              </span>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(idea.id) }}
                className="text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
              </button>
            </div>

            {/* Title */}
            <h3 className="text-sm font-bold leading-snug">{idea.title}</h3>

            {/* Content preview */}
            {idea.content && (
              <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{idea.content}</p>
            )}

            {/* Date */}
            <span className="text-xs text-on-surface-variant mt-auto">
              {idea.updated_at?.slice(0, 10)}
            </span>

            {/* Inline delete confirm */}
            {confirmDelete === idea.id && (
              <div className="flex items-center gap-2 pt-1 border-t"
                style={{ borderColor: 'rgba(70,69,84,0.3)' }}
                onClick={e => e.stopPropagation()}>
                <span className="text-xs text-on-surface-variant flex-1">Delete?</span>
                <button onClick={() => handleDelete(idea.id)}
                  className="text-xs font-bold text-error hover:underline">Yes</button>
                <button onClick={() => setConfirmDelete(null)}
                  className="text-xs font-bold text-on-surface-variant hover:underline">Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
