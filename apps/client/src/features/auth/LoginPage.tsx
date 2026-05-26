// Login form. Uses React Hook Form + the shared Zod schema for validation.
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { loginSchema, type LoginInput } from '@samagama/shared';
import { useAuth } from './AuthProvider';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--color-bg)',
      }}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: 28,
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
          Samagama Portal
        </h1>
        <p style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 13 }}>
          Sign in to continue.
        </p>

        <label style={{ display: 'block', marginTop: 18 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Email</span>
          <input
            type="email"
            autoComplete="email"
            {...register('email')}
            style={inputStyle}
            aria-invalid={!!errors.email}
          />
          {errors.email && <ErrorText>{errors.email.message}</ErrorText>}
        </label>

        <label style={{ display: 'block', marginTop: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            {...register('password')}
            style={inputStyle}
            aria-invalid={!!errors.password}
          />
          {errors.password && <ErrorText>{errors.password.message}</ErrorText>}
        </label>

        {serverError && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              fontSize: 13,
            }}
          >
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            marginTop: 18,
            width: '100%',
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--color-primary)',
            color: 'white',
            fontWeight: 600,
            fontSize: 14,
            cursor: isSubmitting ? 'progress' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  marginTop: 6,
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-input)',
  color: 'var(--color-text)',
  fontSize: 14,
  outline: 'none',
};

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--color-danger)' }}>
      {children}
    </span>
  );
}
