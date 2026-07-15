import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, token } = useAuthStore();

  if (token) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, ...user } = response.data;
      login(token, user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a2050 0%, #26316C 50%, #2d3a7c 100%)' }}
    >
      {/* Animated background orbs */}
      <div
        style={{
          position: 'absolute', width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(247,173,30,0.12) 0%, transparent 70%)',
          top: '-100px', right: '-100px',
          animation: 'float 8s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute', width: 300, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(247,173,30,0.08) 0%, transparent 70%)',
          bottom: '-80px', left: '-80px',
          animation: 'float 10s ease-in-out infinite reverse',
        }}
      />
      <div
        style={{
          position: 'absolute', width: 200, height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
          top: '30%', left: '10%',
          animation: 'float 12s ease-in-out infinite',
        }}
      />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-20px) rotate(1deg); }
          66%       { transform: translateY(10px) rotate(-1deg); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .login-card { animation: slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .input-field {
          width: 100%; height: 44px; padding: 0 14px;
          border-radius: 8px; border: 1.5px solid rgba(38,49,108,0.15);
          background: rgba(248,249,255,0.9);
          font-size: 13px; color: #26316C; font-family: inherit;
          transition: all 0.2s ease;
          outline: none;
        }
        .input-field:focus {
          border-color: #26316C;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(38,49,108,0.12);
        }
        .input-field::placeholder { color: #aab0cc; }
      `}</style>

      {/* Card */}
      <div
        className="login-card relative w-full"
        style={{ maxWidth: 420, margin: '0 16px' }}
      >
        {/* Logo area */}
        <div className="flex flex-col items-center mb-8">
          <div
            style={{
              width: 72, height: 72,
              background: 'linear-gradient(135deg, #F7AD1E, #e89a00)',
              borderRadius: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(247,173,30,0.4), 0 0 0 4px rgba(247,173,30,0.15)',
              marginBottom: 18,
              fontSize: 32,
            }}
          >
            ⊞
          </div>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>
            Enterprise POS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 6 }}>
            Sign in to continue
          </p>
        </div>

        {/* Form card */}
        <div
          style={{
            background: 'rgba(255,255,255,0.96)',
            borderRadius: 16,
            padding: '32px 32px 28px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25), 0 8px 24px rgba(38,49,108,0.2)',
            border: '1px solid rgba(255,255,255,0.5)',
          }}
        >
          {error && (
            <div
              style={{
                marginBottom: 20, padding: '10px 14px',
                background: 'rgba(224,62,62,0.08)',
                border: '1px solid rgba(224,62,62,0.25)',
                borderRadius: 8, color: '#c0392b',
                fontSize: 12, textAlign: 'center', fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label
                style={{
                  display: 'block', fontSize: 12, fontWeight: 600,
                  color: '#26316C', marginBottom: 6, letterSpacing: '0.02em',
                }}
              >
                USERNAME
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block', fontSize: 12, fontWeight: 600,
                  color: '#26316C', marginBottom: 6, letterSpacing: '0.02em',
                }}
              >
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold shine"
              style={{
                width: '100%', height: 46,
                borderRadius: 10, fontSize: 14,
                marginTop: 4,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: '2px solid rgba(38,49,108,0.3)',
                      borderTopColor: '#26316C',
                      animation: 'spin 0.7s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                  Signing in...
                </>
              ) : (
                'Sign In →'
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: 24, paddingTop: 20,
              borderTop: '1px solid rgba(38,49,108,0.08)',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: 11, color: '#aab0cc' }}>
              Default credentials: admin / admin
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            © 2025 Enterprise POS · All rights reserved
          </span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Login;
