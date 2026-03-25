// Renders LLM summary with **headers**, - bullets, and inline **bold**
function renderInline(text) {
  const parts = text.split(/\*\*(.+?)\*\*/)
  return parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i} className="text-on-surface font-semibold">{p}</strong> : p
  )
}

export default function SummaryText({ text }) {
  if (!text) return null

  const lines = text.split('\n')
  const elements = []
  let bullets = []

  const flushBullets = () => {
    if (!bullets.length) return
    elements.push(
      <ul key={`ul-${elements.length}`} className="flex flex-col gap-1 pl-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-secondary mt-px shrink-0" style={{ fontSize: 10 }}>▸</span>
            <span>{renderInline(b)}</span>
          </li>
        ))}
      </ul>
    )
    bullets = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // Standalone **Header**
    const header = line.match(/^\*\*(.+)\*\*$/)
    if (header) {
      flushBullets()
      elements.push(
        <p key={`h-${elements.length}`} className="text-secondary font-bold uppercase tracking-widest" style={{ fontSize: 10 }}>
          {header[1]}
        </p>
      )
      continue
    }

    // Bullet line
    if (line.startsWith('- ') || line.startsWith('• ')) {
      bullets.push(line.slice(2))
      continue
    }

    // Numbered list  e.g. "1. text"
    const numbered = line.match(/^\d+\.\s+(.+)/)
    if (numbered) {
      bullets.push(numbered[1])
      continue
    }

    // Plain paragraph
    flushBullets()
    elements.push(
      <p key={`p-${elements.length}`}>{renderInline(line)}</p>
    )
  }

  flushBullets()

  return (
    <div className="flex flex-col gap-1.5 text-xs text-on-surface-variant leading-relaxed">
      {elements}
    </div>
  )
}
