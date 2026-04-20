import { useEffect, useMemo, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { api } from '../../api'

function getYesterdayDate() {
  const today = new Date()
  today.setDate(today.getDate() - 1)
  return today.toISOString().slice(0, 10)
}

export default function DailyBriefGenerateModal({ briefType, label, onClose, onGenerated }) {
  const [selectedDate, setSelectedDate] = useState(getYesterdayDate)
  const [existingDates, setExistingDates] = useState([])
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoadingExisting(true)
    api.listNewsBriefs({ type: briefType, limit: 30 })
      .then((data) => {
        if (!active) return
        setExistingDates((data.items || []).map((item) => item.brief_date))
      })
      .catch(() => {
        if (!active) return
        setExistingDates([])
      })
      .finally(() => {
        if (active) setLoadingExisting(false)
      })

    return () => { active = false }
  }, [briefType])

  const alreadyExists = useMemo(
    () => existingDates.includes(selectedDate),
    [existingDates, selectedDate]
  )

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    setResult(null)
    try {
      const data = await api.generateNewsBrief({ type: briefType, date: selectedDate })
      setResult(data)
      if (!alreadyExists) {
        setExistingDates((prev) => [...prev, selectedDate].sort().reverse())
      }
      if (typeof onGenerated === 'function') {
        onGenerated(data.brief)
      }
    } catch (err) {
      setError(err.response?.data?.detail || '生成日报失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={`生成${label}日报`}
      subtitle="选择日期后生成；如果这一天已经有日报，会直接覆盖重新生成。"
      size="lg"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-4">
          <label className="block text-sm font-semibold text-text">选择日期</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-border-strong"
          />
          <p className="mt-3 text-xs leading-6 text-text-muted">
            {loadingExisting
              ? '正在读取现有日报状态…'
              : alreadyExists
                ? '这一天已经生成过日报，再次提交会覆盖旧内容。'
                : '这一天还没有日报，提交后会新生成一份。'}
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-[#E8B5B5] bg-[#FFF4F4] px-4 py-3 text-sm text-[#9B3D3D]">
            {error}
          </div>
        )}

        {result?.brief && (
          <div className="rounded-2xl border border-[#D8E2EF] bg-[linear-gradient(135deg,#f7fbff_0%,#eef4fb_100%)] px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-text">
                {result.replaced ? '已重新生成' : '已生成'}
              </span>
              <span className="text-xs text-text-subtle">{result.brief.brief_date}</span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-text">{result.brief.title}</h3>
            <p className="mt-2 text-sm leading-7 text-text-muted">{result.brief.summary_zh}</p>
            <div className="mt-3 grid gap-2">
              {(result.brief.bullets || []).slice(0, 4).map((item, index) => (
                <p key={`${index}-${item}`} className="text-sm leading-6 text-text">
                  {index + 1}. {item}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
          <Button
            icon={alreadyExists ? 'autorenew' : 'edit_calendar'}
            loading={submitting}
            onClick={handleSubmit}
          >
            {alreadyExists ? '重新生成日报' : '生成日报'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
