import { useState } from 'react'
import Modal from '../ui/Modal'
import Field from '../ui/Field'
import Button from '../ui/Button'

const POST_CATEGORIES = [
  ['Life', '生活问答'],
  ['Visa', '签证居留'],
  ['Housing', '租房买房'],
  ['Jobs', '求职交流'],
  ['SecondHand', '二手避坑'],
  ['Recommendations', '本地推荐'],
  ['MutualHelp', '同城互助'],
  ['Chat', '闲聊'],
]

export default function PostFormModal({ post, onSave, onClose }) {
  const isEdit = Boolean(post)
  const [form, setForm] = useState({
    title: post?.title ?? '',
    category: post?.category ?? 'Life',
    content: post?.content ?? '',
    city: post?.city ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      setError('标题和正文都需要填写')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave({
        title: form.title.trim(),
        category: form.category,
        content: form.content.trim(),
        city: form.city.trim(),
      })
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title={isEdit ? '编辑交流帖' : '发布交流帖'} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="标题" required>
          <input
            id="post-title"
            autoFocus
            required
            value={form.title}
            onChange={set('title')}
            placeholder="例如 里斯本哪里办居留续签比较顺利？"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="分类" required>
            <select id="post-category" value={form.category} onChange={set('category')}>
              {POST_CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="城市">
            <input
              id="post-city"
              value={form.city}
              onChange={set('city')}
              placeholder="例如 Lisboa / Porto"
            />
          </Field>
        </div>

        <Field label="正文" required error={error}>
          <textarea
            id="post-content"
            required
            rows={7}
            value={form.content}
            onChange={set('content')}
            placeholder="把你的问题、经验或想法写清楚一点，别人会更容易回复你。"
            className="resize-none"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
          <Button
            type="submit"
            variant="primary"
            icon="send"
            loading={saving}
            disabled={!form.title.trim() || !form.content.trim()}
          >
            {saving ? '保存中…' : (isEdit ? '保存修改' : '发布帖子')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
