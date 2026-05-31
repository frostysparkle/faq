import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, Menu, MessageSquare, Moon, Search, Sparkles, Sun, X } from 'lucide-react';
import { useAuth } from '../features/auth/AuthProvider';
import { useTheme } from '../features/theme/ThemeProvider';
import { Sidebar } from './Sidebar';
import { ChatbotFab } from './ChatbotFab';
import { useUnifiedSearch, type SearchDoc } from '../hooks/useUnifiedSearch';

const DEBOUNCE_MS = 250;

export function AppShell() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const { search, clear, results, isReady, error } = useUnifiedSearch('/api/help-data/export');

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!searchContainerRef.current?.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInput = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { clear(); return; }
    debounceRef.current = setTimeout(() => search(value), DEBOUNCE_MS);
  };

  const clearSearch = () => {
    setSearchValue('');
    clear();
    setSearchFocused(false);
  };

  const totalResults = results.faqs.length + results.community.length;
  const showDropdown = searchFocused && searchValue.trim().length > 0;

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

          {/* Unified Search — inline with live dropdown */}
          <div ref={searchContainerRef} style={{ flex: 1, maxWidth: 520, position: 'relative' }}>
            <div
              className="topbar-search"
              onClick={() => { setSearchFocused(true); searchRef.current?.focus(); }}
            >
              <Search size={14} color="var(--color-text-muted)" />
              <Sparkles size={13} color="var(--color-primary)" style={{ opacity: 0.6 }} />
              <input
                ref={searchRef}
                value={searchValue}
                onChange={(e) => handleInput(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { clearSearch(); searchRef.current?.blur(); }
                }}
                placeholder={isReady ? 'Search FAQs & Community Q&A…  ⌘K' : 'Loading search index…'}
                aria-label="Search FAQs and Community Q&A"
                style={{
                  border: 'none', background: 'none', outline: 'none',
                  color: 'var(--color-text)', fontSize: 13, flex: 1, fontFamily: 'inherit',
                }}
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); clearSearch(); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px 4px', display: 'flex', alignItems: 'center', lineHeight: 1 }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Results dropdown */}
            {showDropdown && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 2000,
                background: 'var(--color-card)', borderRadius: 14,
                boxShadow: '0 12px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid var(--color-border)',
                maxHeight: 460, overflowY: 'auto',
                animation: 'ym-slide-up 0.16s ease-out',
              }}>
                {error ? (
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-danger)' }}>Search engine failed to load</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{error}</div>
                  </div>
                ) : !isReady ? (
                  <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-primary)', animation: 'pulse 1.2s ease-in-out infinite', flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Building search index…</span>
                  </div>
                ) : totalResults === 0 ? (
                  <div style={{ padding: '22px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>No results for "{searchValue}"</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Try different keywords</div>
                  </div>
                ) : (
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                      {totalResults} result{totalResults !== 1 ? 's' : ''} · {results.faqs.length} FAQ · {results.community.length} Community
                    </div>

                    {results.faqs.length > 0 && (
                      <div style={{ marginBottom: results.community.length > 0 ? 10 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <BookOpen size={11} color="var(--color-success)" />
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Official FAQs</span>
                        </div>
                        {results.faqs.map((doc) => (
                          <DropdownRow key={doc.id} doc={doc} onClick={() => { navigate('/faqs'); clearSearch(); }} />
                        ))}
                      </div>
                    )}

                    {results.community.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <MessageSquare size={11} color="var(--color-primary)" />
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Community Q&A</span>
                        </div>
                        {results.community.map((doc) => (
                          <DropdownRow key={doc.id} doc={doc} onClick={() => {
                            navigate(`/community/${doc.id.replace('com_', '')}`);
                            clearSearch();
                          }} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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

// ─── Compact dropdown result row ──────────────────────────────────────────────

function DropdownRow({ doc, onClick }: { doc: SearchDoc; onClick: () => void }) {
  const isFaq = doc.type === 'faq';
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-pill)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%',
        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        padding: '7px 8px', borderRadius: 8, transition: 'background 0.1s',
      }}
    >
      <span style={{
        flexShrink: 0, marginTop: 2, fontSize: 9, fontWeight: 700, padding: '2px 6px',
        borderRadius: 5, letterSpacing: '0.05em', textTransform: 'uppercase',
        background: isFaq ? 'var(--color-success-bg)' : 'var(--color-primary-bg)',
        color: isFaq ? 'var(--color-success)' : 'var(--color-primary)',
      }}>
        {isFaq ? 'FAQ' : 'Comm'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
          {doc.content}
        </div>
      </div>
    </button>
  );
}
