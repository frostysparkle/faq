// Persistent shell: sidebar + topbar + content outlet.
// Renders the floating chatbot button for students only (Change Spec §4).
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, Menu, Moon, Search, Sun } from 'lucide-react';
import { useAuth } from '../features/auth/AuthProvider';
import { useTheme } from '../features/theme/ThemeProvider';
import { Sidebar } from './Sidebar';
import { ChatbotFab } from './ChatbotFab';

export function AppShell() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  if (!user) return null; // RequireAuth handles redirect; this guards the type narrowing.

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        role={user.role}
        userName={user.name}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header
          style={{
            background: 'var(--color-topbar)',
            borderBottom: '1px solid var(--color-border)',
            padding: '0 20px',
            height: 54,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
            style={iconButtonStyle}
          >
            <Menu size={18} />
          </button>

          <div
            style={{
              flex: 1,
              maxWidth: 320,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--color-input)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '7px 12px',
            }}
          >
            <Search size={14} color="var(--color-text-muted)" />
            <input
              placeholder="Quick search…"
              aria-label="Quick search"
              style={{
                border: 'none',
                background: 'none',
                outline: 'none',
                color: 'var(--color-text)',
                fontSize: 13,
                flex: 1,
              }}
            />
          </div>

          <div style={{ flex: 1 }} />

          <button aria-label="Notifications" style={iconButtonStyle}>
            <Bell size={18} />
          </button>

          <button
            onClick={toggle}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            style={{
              background: 'var(--color-pill)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
              color: 'var(--color-pill-text)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {theme === 'light' ? (
              <>
                <Moon size={14} /> Dark
              </>
            ) : (
              <>
                <Sun size={14} /> Light
              </>
            )}
          </button>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          <Outlet />
        </main>
      </div>

      {/* Floating chatbot button — students only. */}
      {user.role === 'student' && <ChatbotFab />}
    </div>
  );
}

const iconButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-muted)',
  padding: 6,
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
};
