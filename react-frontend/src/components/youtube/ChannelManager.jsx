import { useState } from 'react'
import { api } from '../../api'

const CATEGORIES = [
  'Tecnologia', 'Desporto', 'Manga/Anime', 'Entretenimento',
  'Notícias', 'Ciência', 'Educação', 'Música', 'Jogos', 'Outros',
]

export default function ChannelManager({ channels, onUpdate }) {
  const [handle, setHandle] = useState('')
  const [category, setCategory] = useState('Tecnologia')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async e => {
    e.preventDefault()
    if (!handle.trim()) return
    setAdding(true)
    setError('')
    try {
      await api.addChannel(handle.trim(), category)
      setHandle('')
      onUpdate()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add channel.')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (ch) => {
    await api.removeChannel(ch.handle)
    onUpdate()
  }

  return (
    <div className="rounded-xl p-4" style={{ background: '#131b2e', outline: '1px solid rgba(70,69,84,0.15)' }}>
      <h3 className="text-sm font-bold font-headline mb-3 text-on-surface">Manage Channels</h3>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={handle}
          onChange={e => setHandle(e.target.value)}
          placeholder="@channel or youtube.com/@channel"
          className="flex-1 px-3 py-1.5 rounded-lg text-xs text-on-surface placeholder-on-surface-variant outline-none transition-all"
          style={{ background: '#2d3449', border: '1px solid rgba(70,69,84,0.3)' }}
          onFocus={e => e.target.style.borderColor = 'rgba(68,226,205,0.5)'}
          onBlur={e => e.target.style.borderColor = 'rgba(70,69,84,0.3)'}
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-2 py-1.5 rounded-lg text-xs text-on-surface outline-none"
          style={{ background: '#2d3449', border: '1px solid rgba(70,69,84,0.3)' }}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button type="submit" disabled={adding}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-on-primary transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #c2c1ff, #5e5ce6)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
          Add
        </button>
      </form>

      {error && <p className="text-error text-xs mb-3">{error}</p>}

      {channels.length === 0 ? (
        <p className="text-on-surface-variant text-xs text-center py-3">No channels added yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {channels.map(ch => (
            <div key={ch.handle} className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: '#222a3d' }}>
              <div>
                <a href={`https://www.youtube.com/${ch.handle}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-semibold text-on-surface hover:text-secondary transition-colors">
                  {ch.name}
                </a>
                <p className="text-xs text-on-surface-variant">{ch.handle} · {ch.category}</p>
              </div>
              <button onClick={() => handleRemove(ch)}
                className="text-on-surface-variant hover:text-error transition-colors p-0.5">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
