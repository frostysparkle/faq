import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { loginSchema, type LoginInput } from '@samagama/shared';
import { useAuth } from './AuthProvider';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (user) {
    const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/';
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    try {
      await login(data);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-bg)' }}>

      {/* ── Left brand panel ────────────────────────────────────────────── */}
      <div
        style={{
          width: '42%',
          background: 'linear-gradient(145deg, #8b5cf6 0%, #6d28d9 60%, #4c1d95 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 52px',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
        className="login-brand-panel"
      >
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -80, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.035)' }} />
        <div style={{ position: 'absolute', top: '40%', right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

        {/* Dot-grid texture overlay */}
        <svg
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0.07,
            pointerEvents: 'none',
          }}
        >
          <defs>
            <pattern id="dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: '-1px',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>S</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>Samagama</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>Internship Portal</div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Your knowledge hub
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 14 }}>
            Everything you<br />need for your<br />internship
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 44 }}>
            150+ curated FAQs, peer Q&amp;A, and Yaksha — your AI assistant grounded in approved knowledge.
          </div>

          {/* Feature highlights */}
          {[
            { emoji: '📚', title: 'Curated FAQs', sub: '150+ answered questions, freshness-ranked' },
            { emoji: '💬', title: 'Community Q&A', sub: 'Peer answers, moderator approved' },
            { emoji: '🤖', title: 'Yaksha AI', sub: 'RAG chatbot grounded in approved FAQs' },
          ].map((f) => (
            <div
              key={f.title}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 14, padding: '12px 16px', marginBottom: 10,
                backdropFilter: 'blur(4px)',
                transition: 'background 0.18s, transform 0.18s',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.13)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: 22, flexShrink: 0 }}>{f.emoji}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{f.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Form card */}
          <div className="mod-card mod-card-blue" style={{ padding: '36px 32px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 13,
                background: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: '-0.5px',
                boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
              }}>S</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                  Welcome back
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Sign in to Samagama Portal
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label className="field-label">
                  Email address
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                  className="field-input"
                  style={errors.email ? { borderColor: 'var(--color-danger)' } : undefined}
                />
                {errors.email && (
                  <span style={{ display: 'block', marginTop: 5, fontSize: 12, color: 'var(--color-danger)' }}>
                    {errors.email.message}
                  </span>
                )}
              </div>

              {/* Password */}
              <div style={{ marginBottom: 24 }}>
                <label className="field-label">
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    {...register('password')}
                    aria-invalid={!!errors.password}
                    className="field-input"
                    style={{
                      paddingRight: 40,
                      ...(errors.password ? { borderColor: 'var(--color-danger)' } : {}),
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    data-tooltip={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center',
                      lineHeight: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <span style={{ display: 'block', marginTop: 5, fontSize: 12, color: 'var(--color-danger)' }}>
                    {errors.password.message}
                  </span>
                )}
              </div>

              {serverError && (
                <div role="alert" style={{
                  marginBottom: 18, padding: '10px 14px',
                  borderRadius: 10, background: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)', fontSize: 13,
                  border: '1px solid var(--color-danger)',
                }}>
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 12,
                  fontSize: 15,
                  letterSpacing: '-0.01em',
                }}
              >
                {isSubmitting ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: 'var(--color-text-muted)' }}>
            Samagama Internship Portal · Powered by Yaksha AI
          </div>
        </div>
      </div>
    </div>
  );
}
