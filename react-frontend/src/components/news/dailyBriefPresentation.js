function formatLocalIsoDate(date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getYesterdayBriefDate() {
  const yesterday = new Date()
  yesterday.setHours(0, 0, 0, 0)
  yesterday.setDate(yesterday.getDate() - 1)
  return formatLocalIsoDate(yesterday)
}

export function isYesterdayBrief(briefDate) {
  return briefDate === getYesterdayBriefDate()
}

function formatCalendarBriefTitle(briefDate) {
  if (!briefDate) return '当日回顾'
  const [_, month, day] = briefDate.split('-')
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  if (!monthNumber || !dayNumber) return '当日回顾'
  return `${monthNumber}月${dayNumber}日回顾`
}

export function presentBriefTitle(brief) {
  if (!brief?.title) return ''
  if (isYesterdayBrief(brief.brief_date)) return brief.title

  return formatCalendarBriefTitle(brief.brief_date)
}

export function presentBriefSummary(brief) {
  if (!brief?.summary_zh) return ''
  if (isYesterdayBrief(brief.brief_date)) return brief.summary_zh

  return brief.summary_zh
    .replace(/^昨天与在葡华人更相关的新闻回顾如下：/, '当日与在葡华人更相关的新闻回顾如下：')
    .replace(/^昨天葡萄牙新闻回顾如下：/, '当日葡萄牙新闻回顾如下：')
}

export function presentLeadBadge(briefDate, briefType) {
  if (isYesterdayBrief(briefDate)) {
    return briefType === 'china' ? '昨天回顾' : 'Yesterday Brief'
  }
  return briefType === 'china' ? '最近回顾' : 'Recent Brief'
}
