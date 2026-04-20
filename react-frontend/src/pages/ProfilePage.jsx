import { useMemo, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'

export default function ProfilePage({ onBack, user }) {
  const { setUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const avatarLetter = useMemo(
    () => (user?.name || user?.google_name || user?.email || '?').charAt(0).toUpperCase(),
    [user]
  )

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    if (!name.trim()) {
      setError('公开昵称不能为空')
      return
    }

    setSaving(true)
    try {
      const updated = await api.updateMe({ name: name.trim(), phone: phone.trim() })
      setUser(updated)
      setSaved(true)
    } catch (err) {
      setError(err.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await api.exportMyData()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `huarenpt-data-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setError('数据导出失败')
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteMyAccount()
      localStorage.removeItem('token')
      setUser(null)
      onBack()
    } catch {
      setError('账号注销失败')
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6">
      <Card className="overflow-hidden rounded-[30px] border-[#DCCEBF] bg-[linear-gradient(135deg,#fffaf3_0%,#f4ede0_100%)] p-0 shadow-[0_24px_56px_rgba(86,60,33,0.10)]">
        <div className="grid gap-6 px-5 py-5 sm:px-7 sm:py-7 lg:grid-cols-[minmax(0,1.1fr)_320px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge color="#9D3D33">Profile</Badge>
              <Button variant="ghost" size="sm" icon="arrow_back" onClick={onBack}>
                返回首页
              </Button>
            </div>

            <h1
              className="mt-4 text-[1.95rem] font-black tracking-tight text-text sm:text-4xl"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              个人资料
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted sm:text-[15px]">
              你可以在这里设置平台公开昵称。默认会使用 Google 名称，但保存后，平台会优先显示你自己设置的昵称。
            </p>

            <form onSubmit={handleSave} className="mt-6 grid gap-4">
              <Field
                label="公开昵称"
                required
                hint="这个名字会显示在你发布的内容、社区帖子和回复中。"
                error={!name.trim() && error ? error : ''}
              >
                <input
                  id="profile-page-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入你想公开显示的昵称"
                />
              </Field>

              <Field
                label="联系电话（可选）"
                hint="发布招聘、房产、二手等信息时，可作为默认联系方式展示。"
              >
                <input
                  id="profile-page-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+351 912 345 678"
                />
              </Field>

              {error && name.trim() ? (
                <p className="text-sm text-danger">{error}</p>
              ) : null}

              {saved ? (
                <div className="rounded-2xl border border-[#BCD8C2] bg-[#2E7D5A10] px-4 py-3 text-sm text-[#2E7D5A]">
                  资料已保存。之后再次使用 Google 登录时，平台也会继续保留你的公开昵称。
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onBack}>
                  取消
                </Button>
                <Button type="submit" variant="primary" icon="save" loading={saving}>
                  {saving ? '保存中…' : '保存资料'}
                </Button>
              </div>
            </form>
          </div>

          <div className="grid gap-4">
            <Card className="rounded-[24px] border-white/80 bg-white/86 shadow-none">
              <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">账户信息</p>
              <div className="mt-4 flex items-center gap-4">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover ring-4 ring-white/70"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-subtle text-xl font-black text-accent">
                    {avatarLetter}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-lg font-black text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                    {user?.name || '未设置昵称'}
                  </p>
                  <p className="mt-1 break-all text-sm text-text-muted">{user?.email || '未登录'}</p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[24px] border-white/80 bg-white/86 shadow-none">
              <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">隐私说明</p>
              <div className="mt-4 grid gap-3 text-sm leading-7 text-text-muted">
                <p>首次登录时，平台会默认使用你的 Google 名称作为公开昵称。</p>
                <p>你保存过公开昵称后，平台会优先使用这个昵称，不会在后续登录时自动改回 Google 名称。</p>
                <p>Google 名称只会作为账户来源参考保留，不会强制覆盖你的公开显示名。</p>
              </div>
            </Card>

            <Card className="rounded-[24px] border-white/80 bg-white/86 shadow-none">
              <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">当前来源</p>
              <div className="mt-4 grid gap-3 text-sm text-text-muted">
                <div className="rounded-2xl bg-surface-muted px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">当前公开昵称</p>
                  <p className="mt-2 font-semibold text-text">{user?.name || '未设置'}</p>
                </div>
                <div className="rounded-2xl bg-surface-muted px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">Google 名称</p>
                  <p className="mt-2 font-semibold text-text">{user?.google_name || '暂无记录'}</p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[24px] border-white/80 bg-white/86 shadow-none">
              <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">数据与账户</p>
              <div className="mt-4 grid gap-3">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-2 rounded-xl bg-surface-muted px-4 py-3 text-sm font-semibold text-text transition-colors hover:bg-[#e8e0d4]"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
                  {exporting ? '导出中...' : '导出我的数据'}
                </button>
                <p className="px-1 text-xs leading-5 text-text-subtle">
                  下载你在平台上的所有数据（个人资料、发布内容、社区帖子等），JSON 格式。
                </p>

                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-2 rounded-xl bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#DC2626] transition-colors hover:bg-[#FEE2E2]"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete_forever</span>
                    注销账号
                  </button>
                ) : (
                  <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-4">
                    <p className="text-sm font-semibold text-[#DC2626]">确认注销？</p>
                    <p className="mt-1 text-xs leading-5 text-[#991B1B]">
                      此操作将永久删除你的账户及所有关联数据（发布的信息、帖子、回复等），不可恢复。
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="rounded-lg px-4 py-2 text-xs font-semibold text-text-muted bg-white hover:bg-gray-50"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="rounded-lg px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C]"
                      >
                        {deleting ? '删除中...' : '确认永久删除'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  )
}
