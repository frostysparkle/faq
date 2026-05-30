import { useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, Menu, Moon, Search, Sparkles, Sun } from 'lucide-react';
import { useAuth } from '../features/auth/AuthProvider';
import { useTheme } from '../features/theme/ThemeProvider';
import { Sidebar } from './Sidebar';
import { ChatbotFab } from './ChatbotFab';

export function AppShell() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  if (!user) return null;

  const goToSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

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
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            padding: '0 20px',
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
            className="topbar-icon-btn"
          >
            <Menu size={18} />
          </button>

          {/* Functional search bar — Enter navigates to /search?q=... */}
          <div
            className="topbar-search"
            style={{ flex: 1, maxWidth: 340 }}
            onClick={() => searchRef.current?.focus()}
          >
            <Search size={14} color="var(--color-text-muted)" />
            <Sparkles size={13} color="var(--color-primary)" style={{ opacity: 0.6 }} />
            <input
              ref={searchRef}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { goToSearch(searchValue); setSearchValue(''); }
                if (e.key === 'Escape') { setSearchValue(''); searchRef.current?.blur(); }
              }}
              placeholder="Quick search…  ⌘K"
              aria-label="Quick search"
              style={{
                border: 'none',
                background: 'none',
                outline: 'none',
                color: 'var(--color-text)',
                fontSize: 13,
                flex: 1,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ flex: 1 }} />

          <button
            aria-label="Notifications"
            title="Notifications"
            className="topbar-icon-btn"
            style={{ position: 'relative' }}
          >
            <Bell size={18} />
            <span style={{
              position: 'absolute', top: 7, right: 7,
              width: 6, height: 6, borderRadius: '50%',
              background: '#3b82f6',
              border: '1.5px solid var(--color-topbar)',
            }} />
          </button>

          <button
            onClick={toggle}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className="topbar-icon-btn"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
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
