import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, Menu, Moon, Search, Sparkles, Sun } from 'lucide-react';
import { useAuth } from '../features/auth/AuthProvider';
import { useTheme } from '../features/theme/ThemeProvider';
import { Sidebar } from './Sidebar';
import { ChatbotFab } from './ChatbotFab';

export function AppShell() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  if (!user) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        role={user.role}
        userName={user.name}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          background: 'var(--color-topbar)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 20px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
          boxShadow: '0 1px 0 var(--color-border)',
        }}>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
            style={iconButtonStyle}
          >
            <Menu size={18} />
          </button>

          {/* Search bar */}
          <div style={{
            flex: 1, maxWidth: 340,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--color-input)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 10, padding: '7px 14px',
            transition: 'border-color 0.15s',
          }}>
            <Search size={14} color="var(--color-text-muted)" />
            <Sparkles size={13} color="var(--color-primary)" style={{ opacity: 0.6 }} />
            <input
              placeholder="Quick search…"
              aria-label="Quick search"
              style={{
                border: 'none', background: 'none', outline: 'none',
                color: 'var(--color-text)', fontSize: 13, flex: 1,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ flex: 1 }} />

          <button
            aria-label="Notifications"
            title="Notifications"
            style={iconButtonStyle}
          >
            <Bell size={18} />
          </button>

          <button
            onClick={toggle}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            style={{
              background: 'var(--color-pill)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 10, padding: '6px 14px',
              cursor: 'pointer', color: 'var(--color-pill-text)',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {theme === 'light' ? <><Moon size={14} /> Dark</> : <><Sun size={14} /> Light</>}
          </button>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
          <Outlet />
        </main>
      </div>

      {user.role === 'student' && <ChatbotFab />}
    </div>
  );
}

const iconButtonStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--color-text-muted)', padding: 7, borderRadius: 8,
  display: 'flex', alignItems: 'center', transition: 'background 0.15s',
};
