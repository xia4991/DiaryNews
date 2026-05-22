import { useMemo, useState } from 'react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { GUIDE_CATEGORIES, GUIDE_TYPE_META, PRACTICAL_GUIDES } from '../data/practicalGuides'

function guideMeta(type) {
  return GUIDE_TYPE_META[type] || GUIDE_TYPE_META.resource
}

function sortedGuides(items) {
  return [...items].sort((a, b) => {
    const importanceScore = { high: 3, medium: 2, low: 1 }
    const diff = (importanceScore[b.importance] || 0) - (importanceScore[a.importance] || 0)
    if (diff !== 0) return diff
    return (b.date || '').localeCompare(a.date || '')
  })
}

function GuideCard({ item, onOpen }) {
  const meta = guideMeta(item.type)
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`w-full rounded-[22px] border px-4 py-4 text-left transition-colors hover:bg-white sm:px-5 ${
        item.importance === 'high'
          ? 'border-[#E5C8BF] bg-[#FFF7F4]'
          : 'border-border bg-surface-muted'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge color={meta.color} icon={meta.icon}>{meta.label}</Badge>
        <span className="text-[11px] font-semibold text-text-subtle">{item.date}</span>
      </div>
      <h3 className="mt-3 text-base font-black leading-6 text-text sm:text-lg">
        {item.title}
      </h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-text-muted">
        {item.summary}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full border border-border bg-white/78 px-2.5 py-1 text-[11px] font-semibold text-text-subtle">
            {tag}
          </span>
        ))}
      </div>
    </button>
  )
}

function LinkList({ links }) {
  if (!links?.length) {
    return <p className="text-sm leading-6 text-text-muted">暂无外部链接。</p>
  }
  return (
    <div className="grid gap-2">
      {links.map((link) => (
        <a
          key={`${link.label}-${link.href}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted px-4 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface"
        >
          <span>{link.label}</span>
          <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 16 }}>open_in_new</span>
        </a>
      ))}
    </div>
  )
}

function GuideDetail({ item, onBack }) {
  const meta = guideMeta(item.type)
  return (
    <div className="grid gap-6">
      <Button variant="ghost" icon="arrow_back" onClick={onBack} className="w-fit">
        返回实用指南
      </Button>

      <Card className="overflow-hidden rounded-[28px] border-[#D8E2EF] bg-[linear-gradient(135deg,#f7fbff_0%,#eef4fb_100%)] p-0 shadow-[0_20px_50px_rgba(43,108,176,0.08)]">
        <div className="px-5 py-5 sm:px-7 sm:py-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={meta.color} icon={meta.icon}>{meta.label}</Badge>
            <span className="text-xs font-semibold text-text-subtle">{item.category}</span>
            <span className="text-xs text-text-subtle">·</span>
            <span className="text-xs font-semibold text-text-subtle">{item.date}</span>
          </div>
          <h1
            className="mt-4 text-[1.75rem] font-black leading-tight tracking-tight text-text sm:text-4xl"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {item.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted sm:text-[15px]">
            {item.summary}
          </p>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="rounded-[28px] border-white/80 bg-white/94 shadow-[0_18px_42px_rgba(58,44,31,0.08)]">
          <div className="grid gap-5">
            {item.content.map((paragraph, index) => (
              <p key={`${item.id}-${index}`} className="text-[15px] leading-8 text-text">
                {paragraph}
              </p>
            ))}
          </div>
        </Card>

        <div className="grid content-start gap-5">
          <Card className="rounded-[24px] border-white/80 bg-white/92 shadow-none">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-subtle">相关链接</p>
            <div className="mt-4">
              <LinkList links={item.links} />
            </div>
          </Card>
          <Card className="rounded-[24px] border-white/80 bg-white/92 shadow-none">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-subtle">标签</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-text">
                  {tag}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function PracticalGuideTab() {
  const [activeCategory, setActiveCategory] = useState('全部')
  const [selectedGuide, setSelectedGuide] = useState(null)
  const filteredGuides = useMemo(() => {
    const items = activeCategory === '全部'
      ? PRACTICAL_GUIDES
      : PRACTICAL_GUIDES.filter((item) => item.category === activeCategory)
    return sortedGuides(items)
  }, [activeCategory])
  const priorityGuides = useMemo(
    () => sortedGuides(PRACTICAL_GUIDES.filter((item) => item.importance === 'high')).slice(0, 3),
    []
  )
  const recentImportant = useMemo(
    () => sortedGuides(PRACTICAL_GUIDES.filter((item) => item.type === 'important')).slice(0, 4),
    []
  )
  const officialLinks = useMemo(
    () => PRACTICAL_GUIDES.flatMap((item) => item.links || []).slice(0, 6),
    []
  )

  if (selectedGuide) {
    return <GuideDetail item={selectedGuide} onBack={() => setSelectedGuide(null)} />
  }

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden rounded-[28px] border-[#D8E2EF] bg-[linear-gradient(135deg,#f7fbff_0%,#eef4fb_100%)] p-0 shadow-[0_20px_50px_rgba(43,108,176,0.08)]">
        <div className="grid gap-5 px-5 py-5 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <Badge color="#2B6CB0" icon="menu_book">Guide Center</Badge>
            <h1
              className="mt-4 text-[1.9rem] font-black tracking-tight text-text sm:text-4xl"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              实用指南
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted sm:text-[15px]">
              重要信息、办事教程和常用资料，集中放在这里。
            </p>
          </div>

          <div className="grid gap-3">
            {priorityGuides.map((item) => {
              const meta = guideMeta(item.type)
              return (
                <button
                  key={`priority-${item.id}`}
                  type="button"
                  onClick={() => setSelectedGuide(item)}
                  className="flex items-start gap-3 rounded-2xl border border-white/75 bg-white/82 px-4 py-3 text-left transition-colors hover:bg-white"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${meta.color}18`, color: meta.color }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{meta.icon}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-text-subtle">
                      {item.category}
                    </span>
                    <span className="mt-1 block line-clamp-2 text-sm font-bold leading-6 text-text">
                      {item.title}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <div>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge color="#2E7D5A">内容浏览</Badge>
              <h2
                className="mt-3 text-2xl font-black tracking-tight text-text"
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                重要信息与教程
              </h2>
            </div>
            <div className="flex gap-1 overflow-x-auto rounded-full border border-border bg-white/78 p-1 shadow-[0_10px_24px_rgba(62,45,24,0.08)]">
              {GUIDE_CATEGORIES.map((category) => {
                const active = category === activeCategory
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 ${
                      active
                        ? 'bg-accent text-white shadow-[0_8px_18px_rgba(157,61,51,0.18)]'
                        : 'text-text-muted hover:bg-surface hover:text-text'
                    }`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>
          </div>

          <section className="grid gap-4 md:grid-cols-2">
            {filteredGuides.map((item) => (
              <GuideCard key={item.id} item={item} onOpen={setSelectedGuide} />
            ))}
          </section>
        </div>

        <div className="grid content-start gap-5">
          <Card className="rounded-[28px] border-white/80 bg-white/92 shadow-[0_20px_46px_rgba(58,44,31,0.08)]">
            <Badge color="#9D3D33">近期重要</Badge>
            <div className="mt-4 grid gap-3">
              {recentImportant.map((item) => (
                <button
                  key={`important-${item.id}`}
                  type="button"
                  onClick={() => setSelectedGuide(item)}
                  className="rounded-2xl border border-border bg-surface-muted px-4 py-3 text-left transition-colors hover:bg-surface"
                >
                  <p className="text-[11px] font-semibold text-text-subtle">{item.date}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-text">{item.title}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="rounded-[28px] border-white/80 bg-white/92 shadow-[0_20px_46px_rgba(58,44,31,0.08)]">
            <Badge color="#2B6CB0">常用链接</Badge>
            <div className="mt-4">
              <LinkList links={officialLinks} />
            </div>
          </Card>

          <Card className="rounded-[28px] border-white/80 bg-white/92 shadow-[0_20px_46px_rgba(58,44,31,0.08)]">
            <Badge color="#B8843C">办事提醒</Badge>
            <div className="mt-4 grid gap-3 text-sm leading-7 text-text-muted">
              <p>涉及身份、税务、银行和医疗的事项，以官方页面和窗口要求为准。</p>
              <p>重要文件建议同时保存电子版和纸质版，出门办理前再核对一次。</p>
              <p>遇到陌生链接要求提交证件或银行信息时，先从官方主站重新进入。</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
