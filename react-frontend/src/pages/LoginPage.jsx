import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../auth'
import Modal from '../components/ui/Modal'

export default function LoginPage({ onClose }) {
  const { login } = useAuth()

  const handleSuccess = async (response) => {
    try {
      await login(response.credential)
      onClose()
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  return (
    <Modal onClose={onClose} size="sm" hideClose>
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <h1
          className="text-2xl font-extrabold text-accent tracking-tight"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          DiaryNews
        </h1>
        <p className="text-sm text-text-muted">登录以访问更多功能</p>
        <div className="flex justify-center pt-1">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => console.error('Google login error')}
            theme="outline"
            shape="pill"
            size="large"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-text-subtle hover:text-text transition-colors mt-2"
        >
          取消
        </button>
      </div>
    </Modal>
  )
}
