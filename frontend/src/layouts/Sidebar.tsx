// Persistent sidebar. Sections come from the navByRole table.
import { NavLink } from 'react-router-dom';
import type { UserRole } from '@samagama/shared';
import { navByRole, type NavItem } from './navigation';
import { useAuth } from '../features/auth/AuthProvider';

interface SidebarProps {
  role: UserRole;
  userName: string;
  open: boolean;
  onToggle: () => void;
}

export function Sidebar({ role, userName, open }: SidebarProps) {
  const items = navByRole[role];
  const { logout } = useAuth();

  // Group consecutive items by their section header.
  const groups = groupBySection(items);

  return (
    <aside
      style={{
        width: open ? 236 : 60,
        background: 'var(--color-sidebar)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: open ? '18px 18px 14px' : '16px 12px',
          borderBottom: '1px solid var(--color-sidebar-border)',
        }}
      >
        {open ? (
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
              Samagama
            </div>
            <div
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}
              data-testid="role-label"
            >
              Internship Portal · {role}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 17, fontWeight: 800, color: 'white', textAlign: 'center' }}>
            S
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: '6px 10px', overflowY: 'auto' }}>
        {groups.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 8 }}>
            {open && group.section && (
              <div
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.35)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  padding: '8px 10px 4px',
                }}
              >
                {group.section}
              </div>
            )}
            {group.items.map((item) => (
              <SidebarLink key={item.path} item={item} open={open} />
            ))}
          </div>
        ))}
      </nav>

      {open && (
        <div
          style={{
            padding: '12px 14px',
            borderTop: '1px solid var(--color-sidebar-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: 'white',
              flexShrink: 0,
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'white',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {userName}
            </div>
            <button
              onClick={logout}
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function SidebarLink({ item, open }: { item: NavItem; open: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      style={({ isActive }) => ({
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: open ? 10 : 0,
        justifyContent: open ? 'flex-start' : 'center',
        padding: open ? '9px 10px' : '9px',
        borderRadius: 8,
        marginBottom: 2,
        background: isActive ? 'var(--color-sidebar-active)' : 'transparent',
        color: isActive ? 'var(--color-sidebar-active-text)' : 'var(--color-sidebar-text)',
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        textDecoration: 'none',
        transition: 'all 0.15s',
      })}
    >
      <Icon size={16} style={{ flexShrink: 0 }} />
      {open && (
        <span
          style={{
            flex: 1,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.label}
        </span>
      )}
      {open && item.badge && (
        <span
          style={{
            background: '#ef4444',
            color: 'white',
            borderRadius: 10,
            padding: '1px 6px',
            fontSize: 10,
            fontWeight: 700,
            minWidth: 18,
            textAlign: 'center',
          }}
        >
          {item.badge}
        </span>
      )}
    </NavLink>
  );
}

function groupBySection(items: NavItem[]): { section?: string; items: NavItem[] }[] {
  const groups: { section?: string; items: NavItem[] }[] = [];
  for (const item of items) {
    if (item.section || groups.length === 0) {
      groups.push({ section: item.section, items: [item] });
    } else {
      groups[groups.length - 1]!.items.push(item);
    }
  }
  return groups;
}
