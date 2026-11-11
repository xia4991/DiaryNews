import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Field from '../ui/Field'

const STATUS_ZH = { active: '在线', hidden: '隐藏' }
const STATUS_COLORS = { active: '#10B981', hidden: '#F59E0B' }
const MAX_POINTS = 8
const MAX_DATES = 12
const MAX_KEYWORDS = 12
const INPUT_CLASS =
  'bg-surface border border-border-strong rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent'

const splitLines = (value) => value.split('\n').map((line) => line.trim()).filter(Boolean)
const splitKeywords = (value) => [
  ...new Set(value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean)),
]

function todayKey() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function FocusTopicEditorModal({ topic, onSave, onClose }) {
  const [title, setTitle] = useState(topic?.title || '')
  const [statusText, setStatusText] = useState(topic?.status_text || '')
  const [pointsText, setPointsText] = useState((topic?.points || []).join('\n'))
  const [dates, setDates] = useState(() => (topic?.dates || []).map((d) => ({ ...d })))
  const [keywordsText, setKeywordsText] = useState((topic?.keywords || []).join(', '))
  const [linkUrl, setLinkUrl] = useState(topic?.link_url || '')
  const [linkLabel, setLinkLabel] = useState(topic?.link_label || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const linkInvalid = Boolean(linkUrl.trim()) && !/^https?:\/\//i.test(linkUrl.trim())

  const updateDate = (index, patch) =>
    setDates((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextTitle = title.trim()
    const points = splitLines(pointsText)
    const keywords = splitKeywords(keywordsText)
    const cleanDates = dates
      .map((d) => ({ date: d.date || '', label: (d.label || '').trim() }))
      .filter((d) => d.date || d.label)

    if (!nextTitle) return setError('标题不能为空')
    if (points.length > MAX_POINTS) return setError(`要点最多 ${MAX_POINTS} 条`)
    if (points.some((p) => p.length > 140)) return setError('每条要点最多 140 字')
    if (cleanDates.some((d) => !d.date || !d.label)) return setError('每个关键日期都需要日期和说明')
    if (keywords.some((k) => k.length < 2)) return setError('每个关键词至少 2 个字符')
    if (keywords.length > MAX_KEYWORDS) return setError(`关键词最多 ${MAX_KEYWORDS} 个`)
    if (linkInvalid) return setError('')

    setSaving(true)
    setError('')
    try {
      await onSave({
        title: nextTitle,
        status_text: statusText.trim(),
        points,
        dates: cleanDates,
        keywords,
        link_url: linkUrl.trim(),
        link_label: linkLabel.trim(),
      })
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title={topic ? '编辑话题' : '新建话题'} size="md">
      <form onSubmit={handleSubmit} className="grid gap-4">
        <Field label="标题" required>
          <input
            id="focus-title"
            type="text"
            maxLength={60}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：2027 国家预算（OE）"
          />
        </Field>

        <Field label="当前状态" hint="一句话说明现在进行到哪一步">
          <input
            id="focus-status-text"
            type="text"
            maxLength={80}
            value={statusText}
            onChange={(e) => setStatusText(e.target.value)}
            placeholder="例如：议会专项审议中"
          />
        </Field>

        <Field label="要点" hint={`每行一条，最多 ${MAX_POINTS} 条；首页按这里的顺序显示`}>
          <textarea
            id="focus-points"
            rows={5}
            value={pointsText}
            onChange={(e) => setPointsText(e.target.value)}
            placeholder={'最低工资上调至 …\n个税档位调整 …'}
          />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-semibold text-text-muted">关键日期</legend>
          {dates.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="date"
                aria-label={`第 ${index + 1} 个日期`}
                value={item.date || ''}
                onChange={(e) => updateDate(index, { date: e.target.value })}
                className={`${INPUT_CLASS} w-36 shrink-0`}
              />
              <input
                type="text"
                aria-label={`第 ${index + 1} 个日期的说明`}
                maxLength={60}
                value={item.label || ''}
                onChange={(e) => updateDate(index, { label: e.target.value })}
                placeholder="例如：议会最终表决"
                className={`${INPUT_CLASS} min-w-0 flex-1`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon="close"
                aria-label={`删除第 ${index + 1} 个日期`}
                onClick={() => setDates((prev) => prev.filter((_, i) => i !== index))}
              />
            </div>
          ))}
          {dates.length < MAX_DATES ? (
            <div>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                icon="add"
                onClick={() => setDates((prev) => [...prev, { date: '', label: '' }])}
              >
                添加日期
              </Button>
            </div>
          ) : null}
          <p className="text-[11px] text-text-subtle">保存后按日期先后排列；首页会自动显示“还有 N 天”或“已过”。</p>
        </fieldset>

        <Field
          label="新闻关键词"
          hint="用逗号分隔。新闻标题（葡语或中文）包含任一关键词，就会出现在这个话题下。留空则不显示相关新闻。"
        >
          <input
            id="focus-keywords"
            type="text"
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            placeholder="OE2027, Orçamento do Estado, 国家预算"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
          <Field label="详情链接（可选）" error={linkInvalid ? '需要以 http:// 或 https:// 开头' : ''}>
            <input
              id="focus-link"
              type="url"
              inputMode="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://"
            />
          </Field>
          <Field label="链接文字">
            <input
              id="focus-link-label"
              type="text"
              maxLength={20}
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              placeholder="官方页面"
            />
          </Field>
        </div>

        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" icon="save" loading={saving}>
            {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function FocusTopicsSection() {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await api.listAdminFocusTopics()
      setTopics(data.items || [])
      setLoadError('')
    } catch (err) {
      setLoadError(err.response?.data?.detail || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const run = async (id, action) => {
    setBusyId(id)
    setActionError('')
    try {
      await action()
      await load()
    } catch (err) {
      setActionError(err.response?.data?.detail || '操作失败')
    } finally {
      setBusyId(null)
    }
  }

  const handleCreate = async (payload) => {
    const lastOrder = topics.reduce((max, t) => Math.max(max, t.sort_order || 0), -1)
    await api.createAdminFocusTopic({ ...payload, sort_order: lastOrder + 1 })
    await load()
  }

  const handleUpdate = async (id, payload) => {
    await api.updateAdminFocusTopic(id, payload)
    await load()
  }

  const handleMove = (index, delta) => {
    const next = [...topics]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    run(next[target].id, () =>
      Promise.all(
        next
          .map((t, i) => (t.sort_order === i ? null : api.updateAdminFocusTopic(t.id, { sort_order: i })))
          .filter(Boolean),
      ),
    )
  }

  const handleDelete = (topic) => {
    if (!window.confirm(`删除话题“${topic.title}”？删除后不能恢复。`)) return
    run(topic.id, () => api.deleteAdminFocusTopic(topic.id))
  }

  const today = todayKey()

  return (
    <div className="space-y-4">
      {creating && <FocusTopicEditorModal onSave={handleCreate} onClose={() => setCreating(false)} />}
      {editing && (
        <FocusTopicEditorModal
          topic={editing}
          onSave={(payload) => handleUpdate(editing.id, payload)}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="flex items-center gap-2">
        <h2 className="text-xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
          重点关注
        </h2>
        <Button variant="primary" size="sm" icon="add" onClick={() => setCreating(true)} className="ml-auto">
          新建话题
        </Button>
      </div>
      <p className="text-sm text-text-muted">
        显示在首页最上方。状态、要点和日期在这里维护；相关新闻按关键词自动匹配。
      </p>

      {actionError ? <p role="alert" className="text-sm text-danger">{actionError}</p> : null}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="material-symbols-outlined animate-spin text-accent" style={{ fontSize: 28 }}>progress_activity</span>
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-text-muted">
          <p className="text-sm">{loadError}</p>
          <Button variant="subtle" size="sm" icon="refresh" onClick={load}>重试</Button>
        </div>
      ) : topics.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-text-muted">
          <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 40 }}>event_note</span>
          <p className="text-sm">还没有话题。新建后会出现在首页最上方。</p>
        </div>
      ) : (
        topics.map((topic, index) => {
          const busy = busyId === topic.id
          const statusColor = STATUS_COLORS[topic.status] || '#6B7280'
          return (
            <Card key={topic.id} className="rounded-2xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color={statusColor}>{STATUS_ZH[topic.status] || topic.status}</Badge>
                    <span className="text-xs text-text-subtle">第 {index + 1} 位</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-text">{topic.title}</p>
                  {topic.status_text ? (
                    <p className="mt-1 text-sm font-semibold text-accent">{topic.status_text}</p>
                  ) : null}

                  {topic.dates.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-sm">
                      {topic.dates.map((d) => (
                        <li key={`${d.date}-${d.label}`} className={d.date < today ? 'text-text-subtle' : 'text-text'}>
                          <span className="tabular-nums">{d.date}</span>
                          <span className="ml-2">{d.label}</span>
                          {d.date < today ? <span className="ml-2 text-xs">已过</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {topic.points.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-text-muted">
                      {topic.points.map((point) => <li key={point}>{point}</li>)}
                    </ul>
                  ) : null}

                  <p className="mt-3 text-xs text-text-subtle">
                    关键词：{topic.keywords.length > 0 ? topic.keywords.join('、') : '未设置（不显示相关新闻）'}
                  </p>
                  {topic.keywords.length > 0 ? (
                    <div className="mt-1 text-xs text-text-subtle">
                      {topic.news.length > 0 ? (
                        <>
                          <p>当前匹配到的新闻：</p>
                          <ul className="mt-1 list-disc space-y-0.5 pl-5">
                            {topic.news.map((a) => <li key={a.link}>{a.title_zh || a.title}</li>)}
                          </ul>
                        </>
                      ) : (
                        <p>当前没有匹配到新闻，可以换几个关键词试试。</p>
                      )}
                    </div>
                  ) : null}

                  {topic.link_url ? (
                    <p className="mt-2 break-all text-xs text-text-subtle">
                      {topic.link_label || '链接'}：
                      <a href={topic.link_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        {topic.link_url}
                      </a>
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-text-subtle">
                    更新于 {topic.updated_at?.slice(0, 16).replace('T', ' ')} UTC
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 lg:w-56 lg:justify-end">
                  <Button variant="ghost" size="sm" icon="edit" disabled={busy} onClick={() => setEditing(topic)}>
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="arrow_upward"
                    disabled={busy || index === 0}
                    onClick={() => handleMove(index, -1)}
                  >
                    上移
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="arrow_downward"
                    disabled={busy || index === topics.length - 1}
                    onClick={() => handleMove(index, 1)}
                  >
                    下移
                  </Button>
                  {topic.status === 'active' ? (
                    <Button
                      variant="subtle"
                      size="sm"
                      icon="visibility_off"
                      disabled={busy}
                      onClick={() => run(topic.id, () => api.updateAdminFocusTopic(topic.id, { status: 'hidden' }))}
                    >
                      隐藏
                    </Button>
                  ) : (
                    <Button
                      variant="subtle"
                      size="sm"
                      icon="check_circle"
                      disabled={busy}
                      onClick={() => run(topic.id, () => api.updateAdminFocusTopic(topic.id, { status: 'active' }))}
                    >
                      上线
                    </Button>
                  )}
                  <Button variant="danger" size="sm" icon="delete" disabled={busy} onClick={() => handleDelete(topic)}>
                    删除
                  </Button>
                </div>
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
