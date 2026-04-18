import { useMemo, useState } from 'react'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Field from '../ui/Field'

const POST_CATEGORY_ZH = {
  Life: '生活问答',
  Visa: '签证居留',
  Housing: '租房买房',
  Jobs: '求职交流',
  SecondHand: '二手避坑',
  Recommendations: '本地推荐',
  MutualHelp: '同城互助',
  Chat: '闲聊',
}

function formatDateTime(value) {
  if (!value) return '刚刚'
  return value.slice(0, 16).replace('T', ' ')
}

function ReplyItem({ reply, canManage, onDelete }) {
  return (
    <div className="rounded-2xl bg-surface-muted px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">{reply.owner_name || '社区用户'}</p>
          <p className="mt-1 text-xs text-text-subtle">{formatDateTime(reply.created_at)}</p>
        </div>
        {canManage && (
          <Button variant="ghost" size="sm" onClick={() => onDelete(reply)}>
            删除
          </Button>
        )}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-text-muted">
        {reply.content}
      </p>
    </div>
  )
}

export default function PostDetailModal({
  post,
  replies,
  loadingReplies,
  canManage,
  canManageReply,
  onEdit,
  onDelete,
  onReply,
  onDeleteReply,
  onLoginRequired,
  onClose,
  user,
}) {
  const [replyContent, setReplyContent] = useState('')
  const [savingReply, setSavingReply] = useState(false)
  const [replyError, setReplyError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const replyLabel = useMemo(() => {
    const count = replies.length || post.reply_count || 0
    return `${count} 条回复`
  }, [post.reply_count, replies.length])

  const handleReplySubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      onLoginRequired?.()
      return
    }
    if (!replyContent.trim()) {
      setReplyError('回复内容不能为空')
      return
    }

    setSavingReply(true)
    setReplyError(null)
    try {
      await onReply(replyContent.trim())
      setReplyContent('')
    } catch (err) {
      setReplyError(err.response?.data?.detail || '回复失败')
    } finally {
      setSavingReply(false)
    }
  }

  return (
    <Modal onClose={onClose} title="交流详情" size="lg">
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="#B8843C">{POST_CATEGORY_ZH[post.category] || post.category}</Badge>
          <span className="text-xs text-text-subtle">{post.city || '城市未填写'}</span>
          <span className="text-xs text-text-subtle">·</span>
          <span className="text-xs text-text-subtle">{post.owner_name || '社区用户'}</span>
          <span className="text-xs text-text-subtle">·</span>
          <span className="text-xs text-text-subtle">{formatDateTime(post.created_at)}</span>
        </div>

        <div>
          <h2 className="text-xl font-black leading-snug text-text" style={{ fontFamily: 'var(--font-headline)' }}>
            {post.title}
          </h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-text-muted">
            {post.content || '帖子正文待补充。'}
          </p>
        </div>

        {canManage && (
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            {!confirmDelete ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>删除</Button>
                <Button variant="primary" size="sm" icon="edit" onClick={onEdit}>编辑</Button>
              </>
            ) : (
              <div className="flex w-full items-center gap-2">
                <span className="flex-1 text-xs text-text-muted">确认删除这篇帖子？相关回复也会一起隐藏。</span>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>取消</Button>
                <Button variant="danger" size="sm" onClick={onDelete}>删除</Button>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-border pt-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-text">{replyLabel}</p>
            {!user && (
              <Button variant="ghost" size="sm" onClick={onLoginRequired}>
                登录后回复
              </Button>
            )}
          </div>

          <form onSubmit={handleReplySubmit} className="mt-4 grid gap-3">
            <Field label="写回复" error={replyError}>
              <textarea
                id="post-reply-content"
                rows={4}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={user ? '分享你的建议、经验或补充信息' : '登录后可参与回复'}
                disabled={!user || savingReply}
                className="resize-none"
              />
            </Field>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon="reply"
                loading={savingReply}
                disabled={!user || !replyContent.trim()}
              >
                {savingReply ? '发送中…' : '回复'}
              </Button>
            </div>
          </form>

          <div className="mt-5 grid gap-3">
            {loadingReplies ? (
              <div className="flex items-center justify-center py-8">
                <span className="material-symbols-outlined animate-spin text-accent" style={{ fontSize: 24 }}>progress_activity</span>
              </div>
            ) : replies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border-strong bg-surface-muted px-4 py-5 text-sm text-text-muted">
                还没有回复，你可以来当第一个回应的人。
              </div>
            ) : (
              replies.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  canManage={canManageReply(reply)}
                  onDelete={onDeleteReply}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
