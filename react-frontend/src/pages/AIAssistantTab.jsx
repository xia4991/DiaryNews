import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import SectionHeader from '../components/ui/SectionHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

const STARTER_QUESTIONS = [
  '续居留一般要先准备什么？',
  '租房押金和合同要注意什么？',
  'NIF 和 NISS 有什么区别？',
]

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const sources = Array.isArray(message.sources) ? message.sources : []

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-3xl rounded-2xl px-4 py-3 shadow-card ${
          isUser
            ? 'bg-accent text-text-onaccent'
            : 'border border-border bg-surface text-text'
        }`}
      >
        <div className="whitespace-pre-wrap text-sm leading-7">{message.content}</div>
        {!isUser && sources.length > 0 && (
          <div className="mt-3 border-t border-border/70 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">来源</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sources.map((source, index) => (
                <div
                  key={`${source.source_id || source.title}-${index}`}
                  className="rounded-full bg-bg-subtle px-3 py-1 text-xs text-text-muted"
                  title={source.path_or_ref || source.section || ''}
                >
                  {source.title}
                  {source.section ? ` · ${source.section}` : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LoginGate({ onLoginRequired }) {
  return (
    <div className="mx-auto w-full max-w-[980px]">
      <SectionHeader
        title="AI 助手"
        subtitle="登录后可以保存你的专属会话，并且访问受保护的 wiki 问答能力。"
      />

      <Card className="bg-[linear-gradient(135deg,rgba(157,61,51,0.08),rgba(43,108,176,0.08))]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-text">需要先登录</p>
            <p className="mt-2 text-sm leading-7 text-text-muted">
              AI 助手现在按账号隔离会话，未登录状态下不会再暴露公共聊天数据。
            </p>
          </div>
          <Button icon="login" onClick={onLoginRequired}>
            登录后继续
          </Button>
        </div>
      </Card>
    </div>
  )
}

function AuthenticatedAssistant({ user }) {
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [composer, setComposer] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [statusNote, setStatusNote] = useState('')

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) || null,
    [conversations, activeConversationId]
  )

  const loadConversations = useCallback(async (preferredId = null) => {
    setLoadingConversations(true)
    try {
      const data = await api.listChatConversations()
      setConversations(data || [])
      const nextId = preferredId || activeConversationId || data?.[0]?.id || null
      setActiveConversationId(nextId)
    } finally {
      setLoadingConversations(false)
    }
  }, [activeConversationId])

  const loadConversationDetail = useCallback(async (conversationId) => {
    if (!conversationId) {
      setMessages([])
      return
    }
    setLoadingMessages(true)
    try {
      const data = await api.getChatConversation(conversationId)
      setMessages(data.messages || [])
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    loadConversations().catch(() => {
      setLoadingConversations(false)
    })
  }, [loadConversations])

  useEffect(() => {
    loadConversationDetail(activeConversationId).catch(() => {
      setLoadingMessages(false)
      setMessages([])
    })
  }, [activeConversationId, loadConversationDetail])

  const handleCreateConversation = async (seedText = '新会话') => {
    const title = seedText.trim().slice(0, 24) || '新会话'
    const created = await api.createChatConversation({ title, topic_hint: null })
    await loadConversations(created.id)
    return created
  }

  const handleDeleteConversation = async () => {
    if (!activeConversationId) return
    await api.deleteChatConversation(activeConversationId)
    const remaining = conversations.filter((item) => item.id !== activeConversationId)
    setConversations(remaining)
    setActiveConversationId(remaining[0]?.id || null)
    setMessages([])
  }

  const handleSend = async (overrideText = null) => {
    const content = (overrideText ?? composer).trim()
    if (!content || sending) return

    setSending(true)
    setStatusNote('')
    try {
      let conversationId = activeConversationId
      if (!conversationId) {
        const created = await handleCreateConversation(content)
        conversationId = created.id
      }

      const result = await api.sendChatMessage(conversationId, { content })
      setMessages((prev) => [
        ...prev,
        result.user_message,
        result.assistant_message,
      ])
      setComposer('')
      await loadConversations(conversationId)
      if (!result.used_wiki) {
        setStatusNote('当前问题还缺少足够的 wiki 支撑内容。')
      }
    } finally {
      setSending(false)
    }
  }

  const handleReindex = async () => {
    setReindexing(true)
    try {
      const result = await api.reindexAssistantWiki()
      setStatusNote(`已重建 wiki 索引：${result.pages_indexed} 页，${result.chunks_indexed} 个片段。`)
    } finally {
      setReindexing(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] pb-2">
      <SectionHeader
        title="AI 助手"
        subtitle="当前版本只会根据 markdown wiki 回答。你补充的知识页越完整，助手越可靠。"
        action={(
          <div className="flex flex-wrap items-center gap-2">
            {user?.is_admin && (
              <Button variant="ghost" icon="sync" loading={reindexing} onClick={handleReindex}>
                重建 wiki 索引
              </Button>
            )}
            <Button icon="add_comment" onClick={() => handleCreateConversation()}>
              新建会话
            </Button>
          </div>
        )}
      />

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card className="bg-[linear-gradient(135deg,rgba(157,61,51,0.12),rgba(191,152,90,0.1))]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">知识范围</p>
                <h2 className="mt-2 text-lg font-semibold text-text">Markdown-Only v1</h2>
              </div>
              <Badge color="#9D3D33">Wiki</Badge>
            </div>
            <p className="mt-3 text-sm leading-7 text-text-muted">
              目前主要覆盖居留、法律、生活流程和基础工作信息。没有写进 wiki 的内容，助手会明确告诉你支持不足。
            </p>
          </Card>

          <Card>
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">示例问题</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {STARTER_QUESTIONS.map((question) => (
                <button
                  key={question}
                  onClick={() => handleSend(question)}
                  className="rounded-full border border-border bg-bg-subtle px-3 py-2 text-left text-xs font-medium text-text transition-colors hover:border-border-strong hover:bg-surface"
                >
                  {question}
                </button>
              ))}
            </div>
          </Card>

          <Card padding="sm">
            <div className="flex items-center justify-between gap-3 px-2 py-1">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">会话</p>
                <p className="mt-1 text-sm text-text-muted">保存最近的提问上下文</p>
              </div>
              <Badge color="#2B6CB0">{conversations.length}</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {loadingConversations ? (
                <p className="px-2 py-4 text-sm text-text-muted">正在加载会话…</p>
              ) : conversations.length === 0 ? (
                <p className="px-2 py-4 text-sm text-text-muted">还没有会话，先问第一个问题。</p>
              ) : (
                conversations.map((conversation) => {
                  const active = conversation.id === activeConversationId
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setActiveConversationId(conversation.id)}
                      className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                        active ? 'bg-accent-subtle text-text' : 'hover:bg-bg-subtle text-text-muted'
                      }`}
                    >
                      <p className="text-sm font-semibold">{conversation.title}</p>
                      <p className="mt-1 text-xs opacity-75">{conversation.topic_hint || 'general'}</p>
                    </button>
                  )
                })
              )}
            </div>
          </Card>
        </div>

        <Card className="min-h-[680px] overflow-hidden p-0">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">当前会话</p>
                <h2 className="mt-1 text-lg font-semibold text-text">
                  {activeConversation?.title || '开始新的 AI 助手会话'}
                </h2>
              </div>
              {activeConversation && (
                <Button variant="ghost" size="sm" icon="delete" onClick={handleDeleteConversation}>
                  删除会话
                </Button>
              )}
            </div>
            {statusNote && (
              <p className="mt-3 rounded-xl bg-bg-subtle px-3 py-2 text-sm text-text-muted">{statusNote}</p>
            )}
          </div>

          <div className="flex min-h-[540px] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
              {loadingMessages ? (
                <p className="text-sm text-text-muted">正在加载消息…</p>
              ) : messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-sm leading-7 text-text-muted">
                  这里会显示基于 wiki 的回答。当前最适合先补充高价值知识页，比如续居留、租房合同、税号社保号、公共机构说明。
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble key={`${message.id}-${message.role}`} message={message} />
                ))
              )}
            </div>

            <div className="border-t border-border bg-bg-subtle/60 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3">
                <textarea
                  value={composer}
                  onChange={(event) => setComposer(event.target.value)}
                  placeholder="输入一个与葡萄牙法律、居留、生活流程相关的问题…"
                  rows={4}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-subtle focus:border-border-strong"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-text-subtle">
                    当前回答只基于 `wiki/` markdown，不会自动联网查最新消息。
                  </p>
                  <Button icon="arrow_upward" loading={sending} onClick={() => handleSend()}>
                    发送问题
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function AIAssistantTab({ user, onLoginRequired }) {
  if (!user) {
    return <LoginGate onLoginRequired={onLoginRequired} />
  }
  return <AuthenticatedAssistant user={user} />
}
