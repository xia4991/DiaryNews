import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../auth'

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="relative rounded-2xl p-8 w-80 text-center"
        style={{ background: '#131b2e', border: '1px solid rgba(70,69,84,0.4)' }}>
        <button onClick={onClose}
          className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
        </button>
        <h1 className="text-xl font-bold text-primary font-headline mb-2">DiaryNews</h1>
        <p className="text-sm text-on-surface-variant mb-6">登录以访问更多功能</p>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => console.error('Google login error')}
            theme="filled_black"
            shape="pill"
            size="large"
          />
        </div>
      </div>
    </div>
  )
}
