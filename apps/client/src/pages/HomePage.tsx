// Role-aware landing page. Real dashboards land in Phases 3-6; this is the foundation surface.
import { useAuth } from '../features/auth/AuthProvider';

export function HomePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div>
      <div
        style={{
          background: 'linear-gradient(135deg, #0891b2, #0f2744)',
          borderRadius: 16,
          padding: '28px 32px',
          marginBottom: 24,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 3 }}>Welcome back,</div>
        <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{user.name} 👋</div>
        <div style={{ fontSize: 13, opacity: 0.6 }}>
          Samagama Internship Portal · Signed in as <strong>{user.role}</strong>
        </div>
      </div>

      <div
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: 20,
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Foundation is up and running</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.6 }}>
          The auth flow, role-based navigation, theme toggle, and shared schemas are in place. FAQ
          discovery, community Q&A, moderation, and the RAG chatbot land in subsequent phases.
        </p>
      </div>
    </div>
  );
}
