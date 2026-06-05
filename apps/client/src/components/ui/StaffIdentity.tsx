// Premium trust/authority identity row — Twitter/X-style verification for staff roles.
import { Shield, Crown, Clock } from 'lucide-react';

type StaffRole = 'moderator' | 't-moderator' | 'admin' | 't-admin';

const STAFF_ROLES = new Set<string>(['moderator', 't-moderator', 'admin', 't-admin']);

function isStaff(role: string): role is StaffRole {
  return STAFF_ROLES.has(role);
}

// ── avatarColor ────────────────────────────────────────────────────────────────
const PALETTE = [
  { bg: '#DBEAFE', fg: '#1E40AF' },
  { bg: '#FCE7F3', fg: '#9D174D' },
  { bg: '#D1FAE5', fg: '#065F46' },
  { bg: '#FEF3C7', fg: '#92400E' },
  { bg: '#EDE9FE', fg: '#5B21B6' },
  { bg: '#FEE2E2', fg: '#991B1B' },
  { bg: '#E0F2FE', fg: '#075985' },
  { bg: '#FDF4FF', fg: '#7E22CE' },
];
function avatarColor(name: string) {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return PALETTE[n % PALETTE.length];
}

// ── VerifiedCheckmark — overlays bottom-right of the avatar ───────────────────
function VerifiedCheckmark({ role }: { role: StaffRole }) {
  const isAdmin = role === 'admin' || role === 't-admin';
  return (
    <div
      style={{
        position: 'absolute',
        bottom: -3,
        right: -3,
        width: 13,
        height: 13,
        borderRadius: '50%',
        background: isAdmin ? '#1D4ED8' : '#2563EB',
        border: '1.5px solid var(--color-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isAdmin
          ? '0 0 0 2px rgba(29,78,216,0.25), 0 1px 3px rgba(0,0,0,0.2)'
          : '0 1px 3px rgba(0,0,0,0.15)',
        zIndex: 1,
      }}
    >
      {/* Inline checkmark SVG — crisp at 13 px */}
      <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
        <path d="M1.5 4L3.2 5.8L6.5 2.2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── RolePill ──────────────────────────────────────────────────────────────────
function RolePill({ role }: { role: StaffRole }) {
  const isTemp = role === 't-moderator' || role === 't-admin';
  const isAdmin = role === 'admin' || role === 't-admin';

  const pillStyles: React.CSSProperties = (() => {
    if (role === 'admin') return {
      background: '#1E3A8A',
      color: '#fff',
      border: '1px solid #1D4ED8',
      boxShadow: '0 0 0 2px rgba(29,78,216,0.18), 0 1px 4px rgba(29,78,216,0.25)',
    };
    if (role === 't-admin') return {
      background: 'linear-gradient(90deg, #312E81 0%, #1D4ED8 100%)',
      color: '#fff',
      border: '1px solid rgba(99,102,241,0.5)',
      boxShadow: '0 0 0 1.5px rgba(99,102,241,0.2), 0 1px 4px rgba(99,102,241,0.2)',
    };
    if (role === 'moderator') return {
      background: '#EFF6FF',
      color: '#1D4ED8',
      border: '1px solid #BFDBFE',
    };
    // t-moderator
    return {
      background: 'linear-gradient(90deg, #FFFBEB 0%, #EFF6FF 100%)',
      color: '#B45309',
      border: '1px dashed #D97706',
    };
  })();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 7px',
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        flexShrink: 0,
        ...pillStyles,
      }}
    >
      {isAdmin
        ? <Crown size={9} style={{ flexShrink: 0 }} />
        : <Shield size={9} style={{ flexShrink: 0 }} />}
      {isTemp && <Clock size={8} style={{ flexShrink: 0, marginLeft: 1 }} />}
      {role === 'moderator' && 'Moderator'}
      {role === 't-moderator' && 'T-Moderator'}
      {role === 'admin' && 'Admin'}
      {role === 't-admin' && 'T-Admin'}
    </span>
  );
}

// ── StaffIdentity — the public API ────────────────────────────────────────────

/**
 * Renders an author identity row with platform-style verification for staff.
 *
 * Usage:
 *   <StaffIdentity name="Jahnvi" role="moderator" timestamp={answer.createdAt} />
 *   <StaffIdentity name="Priya" role="student" avatarSize={22} />
 */
export function StaffIdentity({
  name,
  role = 'student',
  timestamp,
  avatarSize = 26,
}: {
  name: string;
  role?: string;
  timestamp?: string;
  avatarSize?: number;
}) {
  const color = avatarColor(name);
  const staff = isStaff(role);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {/* Avatar + optional verification badge */}
      <div style={{ position: 'relative', flexShrink: 0, width: avatarSize, height: avatarSize }}>
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: '50%',
            background: color.bg,
            color: color.fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: avatarSize * 0.42,
            fontWeight: 800,
          }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
        {staff && <VerifiedCheckmark role={role as StaffRole} />}
      </div>

      {/* Name */}
      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>
        {name}
      </span>

      {/* Role pill — staff only */}
      {staff && <RolePill role={role as StaffRole} />}

      {/* Timestamp */}
      {timestamp && (
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 2 }}>
          · {timeAgo(timestamp)}
        </span>
      )}
    </div>
  );
}

// ── timeAgo helper (local — avoids cross-feature import) ─────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
