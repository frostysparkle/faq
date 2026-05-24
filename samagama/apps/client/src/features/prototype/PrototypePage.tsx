import {
  useEffect,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  Bell,
  BookOpen,
  Bot,
  Bookmark,
  CheckCircle,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  Flag,
  GitMerge,
  Hash,
  HelpCircle,
  Home,
  Layers,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Send,
  Settings,
  Shield,
  Sun,
  ThumbsDown,
  ThumbsUp,
  Users,
  X,
  XCircle,
  type LucideIcon
} from "lucide-react";
import type { UserRole } from "@samagama/shared";
import { apiRequest } from "../../api/client";
import { communityQuestions, moderationItems } from "../../data/mockData";
import { useAuth } from "../auth/AuthProvider";
import {
  useCategories,
  useFaqs,
  useRecentlyUpdatedFaqs,
  useRecentlyViewedFaqs,
  useRecordFaqView,
  type CategoryViewModel,
  type FaqViewModel
} from "../faq/faqApi";

type ThemeName = "light" | "dark";
type ScreenId =
  | "home"
  | "faqs"
  | "ask"
  | "community"
  | "my-q"
  | "chatbot"
  | "recent"
  | "mod-home"
  | "pending"
  | "flagged"
  | "unresolved"
  | "dupes"
  | "admin-home"
  | "faq-mgmt"
  | "categories"
  | "tags"
  | "users"
  | "mod-q"
  | "bot-feedback"
  | "settings";

interface ThemeTokens {
  bg: string;
  sidebar: string;
  sidebarHover: string;
  sidebarActive: string;
  sidebarText: string;
  sidebarActiveText: string;
  sidebarBorder: string;
  topbar: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentBg: string;
  accentText: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  pill: string;
  pillText: string;
  input: string;
  shadow: string;
}

interface NavItem {
  id: ScreenId;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface ChatResponse {
  answer: string;
  sources: Array<{ id: string; title: string; type: "faq" | "answer"; score: number }>;
  fallback: boolean;
}

interface PrototypeFaqFilters {
  search: string;
  submitted: string;
  categoryId: string | undefined;
  status: string | undefined;
}

interface ChatMessage {
  role: "bot" | "user";
  text: string;
  sources: string[];
}

const T: Record<ThemeName, ThemeTokens> = {
  light: {
    bg: "#f0f4f8",
    sidebar: "#0f2744",
    sidebarHover: "rgba(255,255,255,0.08)",
    sidebarActive: "rgba(8,145,178,0.35)",
    sidebarText: "rgba(255,255,255,0.65)",
    sidebarActiveText: "#7dd3fc",
    sidebarBorder: "rgba(255,255,255,0.1)",
    topbar: "#ffffff",
    card: "#ffffff",
    text: "#0f172a",
    textMuted: "#64748b",
    border: "#e2e8f0",
    accent: "#0891b2",
    accentBg: "#e0f2fe",
    accentText: "#0e7490",
    success: "#059669",
    successBg: "#d1fae5",
    warning: "#d97706",
    warningBg: "#fef3c7",
    danger: "#dc2626",
    dangerBg: "#fee2e2",
    pill: "#f1f5f9",
    pillText: "#475569",
    input: "#f8fafc",
    shadow: "0 1px 3px rgba(0,0,0,0.08)"
  },
  dark: {
    bg: "#0b1628",
    sidebar: "#060e1c",
    sidebarHover: "rgba(255,255,255,0.06)",
    sidebarActive: "rgba(8,145,178,0.3)",
    sidebarText: "rgba(255,255,255,0.55)",
    sidebarActiveText: "#7dd3fc",
    sidebarBorder: "rgba(255,255,255,0.07)",
    topbar: "#131e30",
    card: "#131e30",
    text: "#f1f5f9",
    textMuted: "#94a3b8",
    border: "#1e3048",
    accent: "#0891b2",
    accentBg: "#0c3047",
    accentText: "#38bdf8",
    success: "#10b981",
    successBg: "#042f1a",
    warning: "#f59e0b",
    warningBg: "#2d1a00",
    danger: "#f87171",
    dangerBg: "#2d0a0a",
    pill: "#1e3048",
    pillText: "#94a3b8",
    input: "#0b1628",
    shadow: "0 1px 4px rgba(0,0,0,0.3)"
  }
};

const navByRole: Record<UserRole, NavItem[]> = {
  student: [
    { id: "home", label: "Home", icon: Home },
    { id: "faqs", label: "Browse FAQs", icon: BookOpen },
    { id: "ask", label: "Ask a Question", icon: HelpCircle },
    { id: "community", label: "Community Q&A", icon: MessageCircle },
    { id: "my-q", label: "My Questions", icon: Bookmark },
    { id: "chatbot", label: "Yaksha Chatbot", icon: Bot },
    { id: "recent", label: "Recently Viewed", icon: Clock }
  ],
  moderator: [
    { id: "mod-home", label: "Dashboard", icon: LayoutDashboard },
    { id: "pending", label: "Pending Answers", icon: MessageSquare, badge: 3 },
    { id: "flagged", label: "Flagged FAQs", icon: Flag, badge: 3 },
    { id: "unresolved", label: "Unresolved Questions", icon: HelpCircle, badge: 5 },
    { id: "dupes", label: "Duplicate Candidates", icon: GitMerge, badge: 3 },
    { id: "faqs", label: "Browse FAQs", icon: BookOpen }
  ],
  admin: [
    { id: "admin-home", label: "Overview", icon: LayoutDashboard },
    { id: "faq-mgmt", label: "FAQ Management", icon: BookOpen },
    { id: "categories", label: "Categories", icon: Layers },
    { id: "tags", label: "Tags", icon: Hash },
    { id: "users", label: "User Management", icon: Users },
    { id: "mod-q", label: "Moderation Queue", icon: Shield, badge: 7 },
    { id: "bot-feedback", label: "Chatbot Feedback", icon: Bot },
    { id: "settings", label: "Settings", icon: Settings }
  ]
};

const defaultScreen: Record<UserRole, ScreenId> = {
  student: "home",
  moderator: "mod-home",
  admin: "admin-home"
};

const roleName: Record<UserRole, string> = {
  student: "Priya Sharma",
  moderator: "Dr. Asha Kumar",
  admin: "Admin User"
};

const roleInitial: Record<UserRole, string> = {
  student: "P",
  moderator: "A",
  admin: "A"
};

const fallbackTags = [
  "noc",
  "certificate",
  "download",
  "login",
  "password",
  "attendance",
  "remote",
  "wfh",
  "leave",
  "stipend",
  "payment",
  "deadline",
  "project",
  "submission",
  "technical",
  "bug",
  "policy",
  "deduction",
  "equipment",
  "guidelines",
  "completion",
  "cohort"
];

const demoUsers = [
  { id: 1, name: "Priya Sharma", email: "priya.s@samagama.in", role: "Student", status: "Active" },
  { id: 2, name: "Rahul Menon", email: "rahul.m@samagama.in", role: "Student", status: "Active" },
  {
    id: 3,
    name: "Dr. Asha Kumar",
    email: "asha.k@samagama.in",
    role: "Moderator",
    status: "Active"
  },
  {
    id: 4,
    name: "Vikram Tiwari",
    email: "vikram.t@samagama.in",
    role: "Student",
    status: "Inactive"
  },
  { id: 5, name: "Admin User", email: "admin@samagama.in", role: "Admin", status: "Active" }
];

function Badge({
  label,
  color = "default",
  t
}: {
  label: string;
  color?: "default" | "accent" | "success" | "warning" | "danger";
  t: ThemeTokens;
}) {
  const colors = {
    default: { bg: t.pill, text: t.pillText },
    accent: { bg: t.accentBg, text: t.accentText },
    success: { bg: t.successBg, text: t.success },
    warning: { bg: t.warningBg, text: t.warning },
    danger: { bg: t.dangerBg, text: t.danger }
  };
  const c = colors[color];
  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 20,
        background: c.bg,
        color: c.text,
        fontWeight: 500,
        whiteSpace: "nowrap"
      }}
    >
      {label}
    </span>
  );
}

function Btn({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled,
  style
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger" | "success" | "warning";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const sizes = {
    sm: { fontSize: 12, padding: "5px 12px" },
    md: { fontSize: 13, padding: "8px 16px" },
    lg: { fontSize: 14, padding: "10px 20px" }
  };
  const variants = {
    primary: { background: "#0891b2", color: "white", border: "none" },
    ghost: { background: "transparent", color: "inherit", border: "1px solid currentColor" },
    danger: { background: "#fee2e2", color: "#dc2626", border: "none" },
    success: { background: "#d1fae5", color: "#059669", border: "none" },
    warning: { background: "#fef3c7", color: "#d97706", border: "none" }
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: 8,
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        opacity: disabled ? 0.5 : 1,
        ...sizes[size],
        ...variants[variant],
        ...style
      }}
    >
      {children}
    </button>
  );
}

function Card({
  children,
  t,
  style
}: {
  children: ReactNode;
  t: ThemeTokens;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: "18px 20px",
        boxShadow: t.shadow,
        ...style
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  sub,
  action,
  t
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  t: ThemeTokens;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 16
      }}
    >
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>{title}</div>
        {sub ? <div style={{ fontSize: 13, color: t.textMuted, marginTop: 2 }}>{sub}</div> : null}
      </div>
      {action}
    </div>
  );
}

function FAQCard({
  faq,
  t,
  onOpen
}: {
  faq: FaqViewModel;
  t: ThemeTokens;
  onOpen?: (id: string) => void;
}) {
  const statusColor =
    faq.status === "Outdated" ? "warning" : faq.status === "Published" ? "success" : "default";
  return (
    <Card t={t} style={{ cursor: "pointer", padding: "14px 18px" }}>
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "flex-start"
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 6 }}>
            {faq.title}
          </div>
          <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5, marginBottom: 8 }}>
            {faq.answer}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <Badge label={faq.category} color="accent" t={t} />
            {faq.tags.map((tag) => (
              <Badge key={tag} label={`#${tag}`} t={t} />
            ))}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
            flexShrink: 0
          }}
        >
          <Badge label={faq.status} color={statusColor} t={t} />
          <div style={{ fontSize: 11, color: t.textMuted, display: "flex", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Eye size={11} />
              {faq.views}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <ThumbsUp size={11} />
              {faq.helpful}
            </span>
          </div>
          <div style={{ fontSize: 11, color: t.textMuted }}>{faq.updated}</div>
          {onOpen ? (
            <Btn size="sm" onClick={() => onOpen(faq.id)}>
              Open
            </Btn>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function QuestionCard({
  q,
  t
}: {
  q: {
    title: string;
    category: string;
    status: string;
    answers: number;
    updated?: string;
    date?: string;
    author: string;
    tags?: string[];
  };
  t: ThemeTokens;
}) {
  const statusColor =
    q.status === "Resolved" ? "success" : q.status === "Answered" ? "warning" : "accent";
  return (
    <Card t={t} style={{ cursor: "pointer", padding: "14px 18px" }}>
      <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 6 }}>
            {q.title}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Badge label={q.category} color="accent" t={t} />
            {(q.tags ?? []).map((tag) => (
              <Badge key={tag} label={`#${tag}`} t={t} />
            ))}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 5,
            flexShrink: 0
          }}
        >
          <Badge label={q.status} color={statusColor} t={t} />
          <div style={{ fontSize: 11, color: t.textMuted, display: "flex", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <MessageSquare size={11} />
              {q.answers}
            </span>
            <span>{q.updated ?? q.date}</span>
          </div>
          <div style={{ fontSize: 11, color: t.textMuted }}>by {q.author}</div>
        </div>
      </div>
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
  t
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  sub?: string;
  t: ThemeTokens;
}) {
  return (
    <Card t={t} style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: `${color}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <Icon size={20} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: t.text }}>{value}</div>
          <div style={{ fontSize: 12, color: t.textMuted }}>{label}</div>
          {sub ? <div style={{ fontSize: 11, color, marginTop: 1 }}>{sub}</div> : null}
        </div>
      </div>
    </Card>
  );
}

function StudentHome({
  t,
  setScreen,
  faqs,
  recentlyUpdated
}: {
  t: ThemeTokens;
  setScreen: (screen: ScreenId) => void;
  faqs: FaqViewModel[];
  recentlyUpdated: FaqViewModel[];
}) {
  return (
    <div>
      <div
        style={{
          background: "linear-gradient(135deg, #0891b2, #0f2744)",
          borderRadius: 16,
          padding: "28px 32px",
          marginBottom: 24,
          color: "white",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 3 }}>Welcome back,</div>
        <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Priya Sharma</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 20 }}>
          Samagama Internship Portal · Spring 2025 Cohort
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            ["Browse FAQs", "faqs"],
            ["Ask a Question", "ask"],
            ["Chat with Yaksha", "chatbot"]
          ].map(([label, screen]) => (
            <button
              key={screen}
              onClick={() => setScreen(screen as ScreenId)}
              style={{
                background: screen === "ask" ? "white" : "rgba(255,255,255,0.18)",
                border: screen === "ask" ? "none" : "1px solid rgba(255,255,255,0.3)",
                color: screen === "ask" ? "#0891b2" : "white",
                borderRadius: 8,
                padding: "7px 16px",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: screen === "ask" ? 600 : 500
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}
      >
        <StatCard
          label="FAQs Available"
          value={faqs.length}
          icon={BookOpen}
          color="#0891b2"
          sub="Live from MongoDB"
          t={t}
        />
        <StatCard
          label="Open Questions"
          value="28"
          icon={MessageCircle}
          color="#d97706"
          sub="Demo Q&A data"
          t={t}
        />
        <StatCard
          label="My Questions"
          value="3"
          icon={Bookmark}
          color="#059669"
          sub="1 resolved"
          t={t}
        />
      </div>

      <SectionHeader
        title="Recently Updated FAQs"
        t={t}
        action={
          <button
            onClick={() => setScreen("faqs")}
            style={{
              fontSize: 13,
              color: t.accent,
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "inherit"
            }}
          >
            View all <ChevronRight size={14} />
          </button>
        }
      />
      <Stack>
        {recentlyUpdated.slice(0, 3).map((faq) => (
          <FAQCard key={faq.id} faq={faq} t={t} />
        ))}
      </Stack>

      <div style={{ marginTop: 24 }}>
        <SectionHeader title="Recent Community Questions" t={t} />
        <Stack>
          {communityQuestions.slice(0, 3).map((q) => (
            <QuestionCard key={q.title} q={{ ...q, date: q.updated, tags: [] }} t={t} />
          ))}
        </Stack>
      </div>
    </div>
  );
}

function FAQsScreen({
  t,
  faqs,
  categories,
  filters,
  setFilters,
  onOpen
}: {
  t: ThemeTokens;
  faqs: FaqViewModel[];
  categories: CategoryViewModel[];
  filters: PrototypeFaqFilters;
  setFilters: Dispatch<SetStateAction<PrototypeFaqFilters>>;
  onOpen: (faqId: string) => void;
}) {
  return (
    <div>
      <SectionHeader
        title="Browse FAQs"
        sub={`${faqs.length} knowledge articles from the live API`}
        t={t}
      />
      <Card t={t} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: t.input,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              padding: "8px 12px"
            }}
          >
            <Search size={15} color={t.textMuted} />
            <input
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter")
                  setFilters((current) => ({ ...current, submitted: current.search }));
              }}
              placeholder="Search FAQs by title or keyword..."
              style={{
                border: "none",
                background: "none",
                outline: "none",
                color: t.text,
                fontSize: 14,
                flex: 1,
                fontFamily: "inherit"
              }}
            />
          </div>
          <Btn onClick={() => setFilters((current) => ({ ...current, submitted: current.search }))}>
            Search
          </Btn>
          <select
            value={filters.status ?? "All"}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value === "All" ? undefined : event.target.value
              }))
            }
            style={{
              background: t.input,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              padding: "8px 12px",
              color: t.text,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              outline: "none"
            }}
          >
            {["All", "published", "outdated", "archived"].map((status) => (
              <option key={status} value={status}>
                {status === "All"
                  ? "All Statuses"
                  : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <Chip
            label="All"
            active={!filters.categoryId}
            t={t}
            onClick={() => setFilters((current) => ({ ...current, categoryId: undefined }))}
          />
          {categories.slice(0, 9).map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              active={filters.categoryId === category.id}
              t={t}
              onClick={() => setFilters((current) => ({ ...current, categoryId: category.id }))}
            />
          ))}
        </div>
      </Card>
      {faqs.length === 0 ? (
        <Card t={t} style={{ textAlign: "center", padding: 40 }}>
          <BookOpen size={36} color={t.border} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 4 }}>
            No FAQs found
          </div>
          <div style={{ fontSize: 13, color: t.textMuted }}>
            Try a different search term or ask a new question.
          </div>
        </Card>
      ) : (
        <Stack>
          {faqs.map((faq) => (
            <FAQCard key={faq.id} faq={faq} t={t} onOpen={onOpen} />
          ))}
        </Stack>
      )}
    </div>
  );
}

function AskScreen({ t, relatedFaqs }: { t: ThemeTokens; relatedFaqs: FaqViewModel[] }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  return (
    <div>
      <SectionHeader
        title="Ask a Question"
        sub="We'll check existing answers before posting"
        t={t}
      />
      <div
        style={{
          display: "flex",
          marginBottom: 20,
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 10,
          overflow: "hidden"
        }}
      >
        {["1. Write", "2. Check Existing", "3. Submit"].map((label, index) => (
          <button
            key={label}
            onClick={() => step > index + 1 && setStep(index + 1)}
            style={{
              flex: 1,
              padding: "10px 8px",
              textAlign: "center",
              fontSize: 13,
              fontWeight: step === index + 1 ? 600 : 400,
              background:
                step === index + 1 ? t.accent : step > index + 1 ? t.accentBg : "transparent",
              color: step === index + 1 ? "white" : step > index + 1 ? t.accentText : t.textMuted,
              border: "none",
              borderRight: index < 2 ? `1px solid ${t.border}` : "none",
              cursor: step > index + 1 ? "pointer" : "default",
              fontFamily: "inherit"
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {step === 1 ? (
        <Card t={t}>
          <Field label="Question Title *" t={t}>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. How do I mark attendance for work from home?"
              style={inputStyle(t)}
            />
          </Field>
          <Field label="Description" t={t}>
            <textarea
              rows={4}
              placeholder="Describe your issue in detail..."
              style={{ ...inputStyle(t), resize: "vertical" }}
            />
          </Field>
          <Field label="Category" t={t}>
            <select style={inputStyle(t)}>
              {[
                "NOC",
                "Technical Issues",
                "Login & Access",
                "Certificates",
                "Attendance",
                "Stipend",
                "Deadlines"
              ].map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </Field>
          <Btn onClick={() => setStep(2)} disabled={title.length < 5}>
            Check Existing Answers
          </Btn>
        </Card>
      ) : null}
      {step === 2 ? (
        <div>
          <Notice t={t} tone="warning" title="Possibly related answers found">
            Check if any of these solves your issue before submitting.
          </Notice>
          <Stack>
            {relatedFaqs.slice(0, 2).map((faq) => (
              <FAQCard key={faq.id} faq={faq} t={t} />
            ))}
          </Stack>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setStep(1)}>
              Edit Question
            </Btn>
            <Btn onClick={() => setStep(3)}>None solved my issue. Submit</Btn>
          </div>
        </div>
      ) : null}
      {step === 3 ? (
        <Card t={t} style={{ textAlign: "center", padding: 48 }}>
          <CheckCircle size={42} color={t.success} style={{ margin: "0 auto 16px" }} />
          <div style={{ fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 8 }}>
            Question Submitted
          </div>
          <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 24 }}>
            Demo submission complete. Live Q&A write integration is next.
          </div>
          <Btn onClick={() => setStep(1)}>Ask Another Question</Btn>
        </Card>
      ) : null}
    </div>
  );
}

function CommunityScreen({ t }: { t: ThemeTokens }) {
  const [filter, setFilter] = useState("All");
  const questions =
    filter === "All"
      ? communityQuestions
      : communityQuestions.filter((question) => question.status === filter);
  return (
    <div>
      <SectionHeader
        title="Community Q&A"
        sub="Student questions · Peer answers · Moderator approved"
        t={t}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["All", "Open", "Answered", "Resolved"].map((item) => (
          <Chip
            key={item}
            label={item}
            active={filter === item}
            t={t}
            onClick={() => setFilter(item)}
            squared
          />
        ))}
      </div>
      <Stack>
        {questions.map((question) => (
          <QuestionCard
            key={question.title}
            q={{ ...question, date: question.updated, tags: [] }}
            t={t}
          />
        ))}
      </Stack>
    </div>
  );
}

function ChatbotScreen({ t, token }: { t: ThemeTokens; token: string | null }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Hello. I'm Yaksha, your Samagama internship assistant. I answer from approved FAQs and moderated Q&A.",
      sources: []
    }
  ]);
  const chatMutation = useMutation({
    mutationFn: async (message: string) =>
      apiRequest<ChatResponse>("/chat/query", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ message })
      })
  });

  async function send() {
    const message = input.trim();
    if (!message) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", text: message, sources: [] }]);
    try {
      const result = await chatMutation.mutateAsync(message);
      setMessages((current) => [
        ...current,
        { role: "bot", text: result.answer, sources: result.sources.map((source) => source.title) }
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          text: "I could not reach the chatbot service. Please try again later or ask in Community Q&A.",
          sources: []
        }
      ]);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 160px)" }}>
      <SectionHeader
        title="Yaksha Chatbot"
        sub="RAG-powered · Answers grounded in approved knowledge"
        t={t}
      />
      <div
        style={{
          flex: 1,
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: 16,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginBottom: 12
        }}
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            style={{
              display: "flex",
              justifyContent: message.role === "user" ? "flex-end" : "flex-start",
              gap: 8
            }}
          >
            {message.role === "bot" ? (
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: t.accent,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0
                }}
              >
                <Bot size={15} color="white" />
              </div>
            ) : null}
            <div style={{ maxWidth: "72%" }}>
              <div
                style={{
                  background: message.role === "user" ? t.accent : t.input,
                  color: message.role === "user" ? "white" : t.text,
                  borderRadius:
                    message.role === "user" ? "12px 12px 4px 12px" : "4px 12px 12px 12px",
                  padding: "10px 14px",
                  fontSize: 14,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap"
                }}
              >
                {message.text}
              </div>
              {message.sources.map((source) => (
                <div
                  key={source}
                  style={{
                    marginTop: 5,
                    fontSize: 11,
                    color: t.accent,
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}
                >
                  <BookOpen size={11} />
                  {source}
                </div>
              ))}
              {message.role === "bot" ? (
                <div style={{ marginTop: 5, display: "flex", gap: 10 }}>
                  <button style={feedbackButtonStyle(t.success)}>
                    <ThumbsUp size={11} />
                    Helpful
                  </button>
                  <button style={feedbackButtonStyle(t.danger)}>
                    <ThumbsDown size={11} />
                    Not helpful
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: "10px 12px",
          display: "flex",
          gap: 8,
          alignItems: "center"
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void send();
          }}
          placeholder="Ask Yaksha about your internship..."
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            color: t.text,
            fontSize: 14,
            fontFamily: "inherit"
          }}
        />
        <Btn size="sm" onClick={() => void send()} disabled={chatMutation.isPending}>
          <Send size={13} />
          Send
        </Btn>
      </div>
    </div>
  );
}

function ModerationDashboard({
  t,
  setScreen
}: {
  t: ThemeTokens;
  setScreen: (screen: ScreenId) => void;
}) {
  const items = [
    {
      label: "Pending Answers",
      value: 3,
      icon: MessageSquare,
      color: "#d97706",
      screen: "pending" as const
    },
    { label: "Flagged FAQs", value: 3, icon: Flag, color: "#dc2626", screen: "flagged" as const },
    {
      label: "Unresolved Questions",
      value: 5,
      icon: HelpCircle,
      color: "#7c3aed",
      screen: "unresolved" as const
    },
    {
      label: "Duplicate Candidates",
      value: 3,
      icon: GitMerge,
      color: "#0891b2",
      screen: "dupes" as const
    }
  ];
  return (
    <div>
      <SectionHeader title="Moderation Dashboard" sub="Items requiring your attention" t={t} />
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14, marginBottom: 28 }}
      >
        {items.map((item) => (
          <Card
            key={item.label}
            t={t}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}
          >
            <button
              onClick={() => setScreen(item.screen)}
              style={{
                all: "unset",
                display: "flex",
                alignItems: "center",
                gap: 14,
                width: "100%",
                cursor: "pointer"
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `${item.color}22`,
                  display: "grid",
                  placeItems: "center"
                }}
              >
                <item.icon size={22} color={item.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 13, color: t.textMuted }}>{item.label}</div>
              </div>
              <ChevronRight size={16} color={t.textMuted} />
            </button>
          </Card>
        ))}
      </div>
      <SectionHeader title="Latest Pending Answers" t={t} />
      <AnswerReviewList t={t} />
    </div>
  );
}

function AnswerReviewList({ t }: { t: ThemeTokens }) {
  return (
    <>
      {moderationItems.map((item) => (
        <Card key={item.question} t={t} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>Answer on:</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 10 }}>
            {item.question}
          </div>
          <div
            style={{
              background: t.input,
              border: `1px solid ${t.border}`,
              borderLeft: `3px solid ${t.accent}`,
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
              fontSize: 13,
              color: t.text,
              lineHeight: 1.6
            }}
          >
            {item.answer}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: t.textMuted }}>
              by {item.author} · {item.age}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="success" size="sm">
                <CheckCircle size={13} />
                Approve
              </Btn>
              <Btn variant="danger" size="sm">
                <XCircle size={13} />
                Reject
              </Btn>
              <Btn variant="ghost" size="sm">
                Request Changes
              </Btn>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}

function AdminHome({ t, faqs }: { t: ThemeTokens; faqs: FaqViewModel[] }) {
  const byCategory = Object.entries(
    faqs.reduce<Record<string, number>>((acc, faq) => {
      acc[faq.category] = (acc[faq.category] ?? 0) + 1;
      return acc;
    }, {})
  ).slice(0, 6);
  const max = Math.max(1, ...byCategory.map(([, count]) => count));
  return (
    <div>
      <SectionHeader title="Admin Overview" sub="Portal health at a glance" t={t} />
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}
      >
        <StatCard
          label="Total FAQs"
          value={faqs.length}
          icon={BookOpen}
          color="#0891b2"
          sub="Live API"
          t={t}
        />
        <StatCard
          label="Open Questions"
          value={28}
          icon={HelpCircle}
          color="#7c3aed"
          sub="Demo Q&A"
          t={t}
        />
        <StatCard
          label="Pending Moderation"
          value={7}
          icon={Shield}
          color="#d97706"
          sub="Action needed"
          t={t}
        />
        <StatCard
          label="Flagged Items"
          value={15}
          icon={Flag}
          color="#dc2626"
          sub="3 high priority"
          t={t}
        />
        <StatCard
          label="Chatbot Helpful"
          value="78%"
          icon={Bot}
          color="#059669"
          sub="Mock metric"
          t={t}
        />
        <StatCard
          label="Duplicate Candidates"
          value={3}
          icon={GitMerge}
          color="#ea580c"
          sub="Semantic alerts"
          t={t}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
        <Card t={t}>
          <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 16 }}>
            FAQs by Category
          </div>
          {byCategory.map(([category, count]) => (
            <div
              key={category}
              style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}
            >
              <div style={{ fontSize: 12, color: t.textMuted, width: 110, flexShrink: 0 }}>
                {category}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  background: t.input,
                  borderRadius: 4,
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(count / max) * 100}%`,
                    background: t.accent,
                    borderRadius: 4
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: t.text,
                  width: 28,
                  textAlign: "right"
                }}
              >
                {count}
              </div>
            </div>
          ))}
        </Card>
        <Card t={t}>
          <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 14 }}>
            Top Flagged FAQs
          </div>
          {faqs
            .filter((faq) => faq.status === "Outdated")
            .map((faq) => (
              <div
                key={faq.id}
                style={{
                  padding: "10px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>{faq.title}</div>
                  <div style={{ fontSize: 11, color: t.textMuted }}>{faq.category}</div>
                </div>
                <Btn size="sm">Review</Btn>
              </div>
            ))}
        </Card>
      </div>
    </div>
  );
}

function ManagementScreen({
  t,
  title,
  faqs
}: {
  t: ThemeTokens;
  title: string;
  faqs: FaqViewModel[];
}) {
  return (
    <div>
      <SectionHeader
        title={title}
        sub="Manage content and operational records"
        t={t}
        action={
          <Btn>
            <Plus size={14} />
            New
          </Btn>
        }
      />
      <Notice t={t} tone="warning" title="Duplicate detection enabled">
        Admin publishing flows will show duplicate candidates before save.
      </Notice>
      <Card t={t} style={{ padding: 0, overflow: "hidden" }}>
        <TableHeader t={t} columns={["Title", "Category", "Status", "Updated", "Actions"]} />
        {faqs.map((faq, index) => (
          <div key={faq.id} style={tableRowStyle(t, index < faqs.length - 1)}>
            <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>{faq.title}</div>
            <div style={{ fontSize: 12, color: t.accentText }}>{faq.category}</div>
            <div>
              <Badge
                label={faq.status}
                color={faq.status === "Outdated" ? "warning" : "success"}
                t={t}
              />
            </div>
            <div style={{ fontSize: 11, color: t.textMuted }}>{faq.updated}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <IconButton t={t}>
                <Edit size={12} />
              </IconButton>
              <IconButton t={t} danger>
                <Archive size={12} />
              </IconButton>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function CategoriesScreen({ t, categories }: { t: ThemeTokens; categories: CategoryViewModel[] }) {
  return (
    <div>
      <SectionHeader
        title="Category Management"
        sub="Manage FAQ categories"
        t={t}
        action={
          <Btn>
            <Plus size={14} />
            Add Category
          </Btn>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        {categories.map((category) => (
          <Card
            key={category.id}
            t={t}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 16px"
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{category.name}</div>
              <div style={{ fontSize: 12, color: t.textMuted }}>Live category</div>
            </div>
            <IconButton t={t}>
              <Edit size={12} />
            </IconButton>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TagsScreen({ t, faqs }: { t: ThemeTokens; faqs: FaqViewModel[] }) {
  const tags = Array.from(new Set([...faqs.flatMap((faq) => faq.tags), ...fallbackTags])).slice(
    0,
    32
  );
  return (
    <div>
      <SectionHeader
        title="Tag Management"
        sub="Manage FAQ keywords and tags"
        t={t}
        action={
          <Btn>
            <Plus size={14} />
            New Tag
          </Btn>
        }
      />
      <Card t={t}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {tags.map((tag) => (
            <div
              key={tag}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: t.input,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                padding: "6px 10px"
              }}
            >
              <span style={{ fontSize: 13, color: t.accentText, fontWeight: 500 }}>#{tag}</span>
              <X size={12} color={t.textMuted} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function UsersScreen({ t }: { t: ThemeTokens }) {
  return (
    <div>
      <SectionHeader
        title="User Management"
        sub="Manage roles and access"
        t={t}
        action={
          <Btn>
            <Plus size={14} />
            Add User
          </Btn>
        }
      />
      <Card t={t} style={{ padding: 0, overflow: "hidden" }}>
        <TableHeader t={t} columns={["Name", "Email", "Role", "Status", ""]} />
        {demoUsers.map((user, index) => (
          <div key={user.id} style={tableRowStyle(t, index < demoUsers.length - 1)}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{user.name}</div>
            <div style={{ fontSize: 12, color: t.textMuted }}>{user.email}</div>
            <div>
              <Badge
                label={user.role}
                color={
                  user.role === "Admin"
                    ? "danger"
                    : user.role === "Moderator"
                      ? "warning"
                      : "accent"
                }
                t={t}
              />
            </div>
            <div>
              <Badge
                label={user.status}
                color={user.status === "Active" ? "success" : "default"}
                t={t}
              />
            </div>
            <IconButton t={t}>
              <Edit size={12} />
            </IconButton>
          </div>
        ))}
      </Card>
    </div>
  );
}

function SettingsScreen({ t }: { t: ThemeTokens }) {
  const [threshold, setThreshold] = useState(80);
  const [provider, setProvider] = useState("mock");
  const providers = [
    ["mock", "Mock Provider", "Local development provider"],
    ["gemini", "Gemini API", "Production adapter target"],
    ["local-llama", "Local Llama", "Phase 2 institution server"]
  ] as const;

  return (
    <div>
      <SectionHeader title="Settings" sub="Configure system behavior" t={t} />
      <Card t={t} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <GitMerge size={18} color={t.accent} />
          <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>Duplicate Detection</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 8 }}>
          Strong merge threshold: <span style={{ color: t.accent }}>{threshold}%</span>
        </div>
        <input
          type="range"
          min={50}
          max={100}
          value={threshold}
          onChange={(event) => setThreshold(Number(event.target.value))}
          style={{ width: "100%", accentColor: t.accent }}
        />
      </Card>
      <Card t={t}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Bot size={18} color={t.accent} />
          <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>LLM Provider</div>
        </div>
        {providers.map(([value, label, desc]) => (
          <label
            key={value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: provider === value ? t.accentBg : t.input,
              border: `1px solid ${provider === value ? t.accent : t.border}`,
              borderRadius: 8,
              marginBottom: 8,
              cursor: "pointer"
            }}
          >
            <input
              type="radio"
              checked={provider === value}
              onChange={() => setProvider(value)}
              style={{ accentColor: t.accent }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{label}</div>
              <div style={{ fontSize: 11, color: t.textMuted }}>{desc}</div>
            </div>
          </label>
        ))}
      </Card>
    </div>
  );
}

export function PrototypePage() {
  const { user, token, loginAs, logout } = useAuth();
  const [theme, setTheme] = useState<ThemeName>("light");
  const [role, setRole] = useState<UserRole>("student");
  const [screen, setScreen] = useState<ScreenId>("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PrototypeFaqFilters>({
    search: "",
    submitted: "",
    categoryId: undefined,
    status: undefined
  });

  const t = T[theme];
  const categoriesQuery = useCategories();
  const faqsQuery = useFaqs({
    query: filters.submitted || undefined,
    categoryId: filters.categoryId,
    status: filters.status
  });
  const recentlyUpdatedQuery = useRecentlyUpdatedFaqs();
  const recentlyViewedQuery = useRecentlyViewedFaqs();
  const recordFaqView = useRecordFaqView();

  const categories = categoriesQuery.data ?? [];
  const faqs = faqsQuery.data ?? [];
  const recentlyUpdated = recentlyUpdatedQuery.data ?? faqs;
  const recentlyViewed = recentlyViewedQuery.data ?? [];

  useEffect(() => {
    if (!user) {
      void loginAs("student").catch((error) => {
        setRoleError(error instanceof Error ? error.message : "Unable to authenticate demo user.");
      });
    }
  }, [loginAs, user]);

  useEffect(() => {
    if (!document.querySelector("link[data-sp-font]")) {
      const link = document.createElement("link");
      link.href =
        "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
      link.rel = "stylesheet";
      link.dataset.spFont = "true";
      document.head.appendChild(link);
    }
  }, []);

  async function handleRole(nextRole: UserRole) {
    setRoleError(null);
    try {
      await loginAs(nextRole);
      setRole(nextRole);
      setScreen(defaultScreen[nextRole]);
    } catch (error) {
      setRoleError(error instanceof Error ? error.message : "Unable to switch role.");
    }
  }

  const nav = navByRole[role];

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        background: t.bg,
        overflow: "hidden"
      }}
    >
      <aside
        style={{
          width: sidebarOpen ? 236 : 60,
          background: t.sidebar,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            padding: sidebarOpen ? "18px 18px 14px" : "16px 12px",
            borderBottom: `1px solid ${t.sidebarBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarOpen ? "space-between" : "center",
            gap: 8
          }}
        >
          {sidebarOpen ? (
            <div>
              <div
                style={{ fontSize: 17, fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}
              >
                Samagama
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>
                Internship Portal
              </div>
            </div>
          ) : null}
          <button
            onClick={() => setSidebarOpen((open) => !open)}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: 7,
              padding: 7,
              cursor: "pointer",
              color: "white",
              display: "grid",
              placeItems: "center",
              flexShrink: 0
            }}
          >
            <Menu size={16} />
          </button>
        </div>

        {sidebarOpen ? (
          <div style={{ padding: "12px 12px 8px" }}>
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 6,
                paddingLeft: 3
              }}
            >
              Prototype · View as
            </div>
            <div
              style={{
                display: "flex",
                background: "rgba(0,0,0,0.25)",
                borderRadius: 8,
                padding: 3,
                gap: 2
              }}
            >
              {(
                [
                  ["student", "Student"],
                  ["moderator", "Mod"],
                  ["admin", "Admin"]
                ] as const
              ).map(([itemRole, label]) => (
                <button
                  key={itemRole}
                  onClick={() => void handleRole(itemRole)}
                  style={{
                    flex: 1,
                    background: role === itemRole ? "rgba(255,255,255,0.16)" : "transparent",
                    border: "none",
                    borderRadius: 6,
                    padding: "5px 3px",
                    color: role === itemRole ? "white" : "rgba(255,255,255,0.45)",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: role === itemRole ? 600 : 400
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <nav style={{ flex: 1, padding: "6px 10px", overflowY: "auto" }}>
          {nav.map((item) => {
            const active = screen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: sidebarOpen ? 10 : 0,
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                  padding: sidebarOpen ? "9px 10px" : 9,
                  borderRadius: 8,
                  marginBottom: 2,
                  background: active ? t.sidebarActive : t.sidebarHover,
                  border: "none",
                  cursor: "pointer",
                  color: active ? t.sidebarActiveText : t.sidebarText,
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400
                }}
              >
                <item.icon size={16} style={{ flexShrink: 0 }} />
                {sidebarOpen ? (
                  <span
                    style={{
                      flex: 1,
                      textAlign: "left",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {item.label}
                  </span>
                ) : null}
                {sidebarOpen && item.badge ? (
                  <span
                    style={{
                      background: "#ef4444",
                      color: "white",
                      borderRadius: 10,
                      padding: "1px 6px",
                      fontSize: 10,
                      fontWeight: 700
                    }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {sidebarOpen ? (
          <div
            style={{
              padding: "12px 14px",
              borderTop: `1px solid ${t.sidebarBorder}`,
              display: "flex",
              alignItems: "center",
              gap: 10
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: t.accent,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                fontSize: 13,
                fontWeight: 700,
                color: "white"
              }}
            >
              {roleInitial[role]}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "white",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {roleName[role]}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "capitalize"
                }}
              >
                {user?.role ?? role}
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                fontSize: 11
              }}
            >
              Exit
            </button>
          </div>
        ) : null}
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div
          style={{
            background: t.topbar,
            borderBottom: `1px solid ${t.border}`,
            padding: "0 20px",
            height: 54,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: t.input,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              padding: "7px 12px",
              maxWidth: 300
            }}
          >
            <Search size={14} color={t.textMuted} />
            <input
              placeholder="Quick search..."
              style={{
                border: "none",
                background: "none",
                outline: "none",
                color: t.text,
                fontSize: 13,
                flex: 1,
                fontFamily: "inherit"
              }}
            />
          </div>
          {roleError ? <span style={{ color: t.danger, fontSize: 12 }}>{roleError}</span> : null}
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: t.textMuted,
              position: "relative",
              padding: 6
            }}
          >
            <Bell size={18} color={t.textMuted} />
            <span
              style={{
                position: "absolute",
                top: 5,
                right: 5,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#ef4444"
              }}
            />
          </button>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            style={{
              background: t.pill,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              color: t.pillText,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontFamily: "inherit",
              fontWeight: 500
            }}
          >
            {theme === "light" ? (
              <>
                <Moon size={14} />
                Dark
              </>
            ) : (
              <>
                <Sun size={14} />
                Light
              </>
            )}
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          <Screen
            id={screen}
            t={t}
            token={token}
            setScreen={setScreen}
            faqs={faqs}
            recentlyUpdated={recentlyUpdated}
            recentlyViewed={recentlyViewed}
            categories={categories}
            filters={filters}
            setFilters={setFilters}
            onOpenFaq={(faqId) => recordFaqView.mutate(faqId)}
          />
        </div>
      </main>
    </div>
  );
}

function Screen(props: {
  id: ScreenId;
  t: ThemeTokens;
  token: string | null;
  setScreen: (screen: ScreenId) => void;
  faqs: FaqViewModel[];
  recentlyUpdated: FaqViewModel[];
  recentlyViewed: FaqViewModel[];
  categories: CategoryViewModel[];
  filters: PrototypeFaqFilters;
  setFilters: Dispatch<SetStateAction<PrototypeFaqFilters>>;
  onOpenFaq: (faqId: string) => void;
}) {
  const {
    id,
    t,
    setScreen,
    faqs,
    recentlyUpdated,
    recentlyViewed,
    categories,
    filters,
    setFilters,
    onOpenFaq,
    token
  } = props;
  if (id === "home")
    return (
      <StudentHome t={t} setScreen={setScreen} faqs={faqs} recentlyUpdated={recentlyUpdated} />
    );
  if (id === "faqs")
    return (
      <FAQsScreen
        t={t}
        faqs={faqs}
        categories={categories}
        filters={filters}
        setFilters={setFilters}
        onOpen={onOpenFaq}
      />
    );
  if (id === "ask") return <AskScreen t={t} relatedFaqs={faqs} />;
  if (id === "community") return <CommunityScreen t={t} />;
  if (id === "my-q") return <CommunityScreen t={t} />;
  if (id === "chatbot") return <ChatbotScreen t={t} token={token} />;
  if (id === "recent") return <RecentScreen t={t} items={recentlyViewed} />;
  if (id === "mod-home") return <ModerationDashboard t={t} setScreen={setScreen} />;
  if (id === "pending")
    return (
      <>
        <SectionHeader
          title="Pending Answers"
          sub="Review community answers before approval"
          t={t}
        />
        <AnswerReviewList t={t} />
      </>
    );
  if (id === "flagged") return <FlaggedScreen t={t} faqs={faqs} />;
  if (id === "unresolved") return <CommunityScreen t={t} />;
  if (id === "dupes") return <DuplicateScreen t={t} />;
  if (id === "admin-home") return <AdminHome t={t} faqs={faqs} />;
  if (id === "faq-mgmt") return <ManagementScreen t={t} title="FAQ Management" faqs={faqs} />;
  if (id === "categories") return <CategoriesScreen t={t} categories={categories} />;
  if (id === "tags") return <TagsScreen t={t} faqs={faqs} />;
  if (id === "users") return <UsersScreen t={t} />;
  if (id === "mod-q")
    return (
      <>
        <SectionHeader title="Moderation Queue" sub="All pending items across the platform" t={t} />
        <AnswerReviewList t={t} />
      </>
    );
  if (id === "bot-feedback") return <BotFeedbackScreen t={t} />;
  return <SettingsScreen t={t} />;
}

function RecentScreen({ t, items }: { t: ThemeTokens; items: FaqViewModel[] }) {
  return (
    <div>
      <SectionHeader title="Recently Viewed" sub="Your live browsing history" t={t} />
      {items.length ? (
        <Stack>
          {items.map((faq) => (
            <FAQCard key={faq.id} faq={faq} t={t} />
          ))}
        </Stack>
      ) : (
        <Card t={t} style={{ textAlign: "center", padding: 40 }}>
          <Clock size={34} color={t.border} />
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginTop: 10 }}>
            No recently viewed FAQs yet
          </div>
          <div style={{ fontSize: 13, color: t.textMuted }}>
            Open an FAQ from Browse FAQs to populate this view.
          </div>
        </Card>
      )}
    </div>
  );
}

function FlaggedScreen({ t, faqs }: { t: ThemeTokens; faqs: FaqViewModel[] }) {
  const flagged = faqs.filter((faq) => faq.status === "Outdated");
  return (
    <div>
      <SectionHeader title="Flagged FAQs" sub={`${flagged.length || 3} items need review`} t={t} />
      <Stack>
        {(flagged.length ? flagged : faqs.slice(0, 3)).map((faq) => (
          <Card t={t} key={faq.id}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 5 }}>
                  {faq.title}
                </div>
                <Badge
                  label={faq.status === "Outdated" ? "Outdated" : "Review"}
                  color={faq.status === "Outdated" ? "warning" : "danger"}
                  t={t}
                />
              </div>
              <span style={{ fontSize: 11, color: t.textMuted }}>{faq.updated}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="success" size="sm">
                Mark Resolved
              </Btn>
              <Btn size="sm">Suggest Edit</Btn>
              <Btn variant="ghost" size="sm">
                Dismiss
              </Btn>
            </div>
          </Card>
        ))}
      </Stack>
    </div>
  );
}

function DuplicateScreen({ t }: { t: ThemeTokens }) {
  const dupes = [
    ["How to get internship completion document?", "Certificate download process", 87],
    ["NOC download: where to find it?", "How do I submit my NOC?", 92],
    ["Mark WFH attendance process?", "How is attendance tracked?", 78]
  ] as const;
  return (
    <div>
      <SectionHeader
        title="Duplicate Candidates"
        sub="High-similarity FAQ pairs flagged by semantic search"
        t={t}
      />
      <Stack>
        {dupes.map(([incoming, existing, score]) => (
          <Card t={t} key={incoming}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                gap: 10,
                marginBottom: 12,
                alignItems: "stretch"
              }}
            >
              <CompareBox title="New Submission" body={incoming} t={t} />
              <div style={{ display: "grid", placeItems: "center", gap: 4 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    background: score >= 80 ? t.dangerBg : t.warningBg,
                    color: score >= 80 ? t.danger : t.warning,
                    borderRadius: 8,
                    padding: "6px 12px"
                  }}
                >
                  {score}%
                </div>
                <div style={{ fontSize: 10, color: t.textMuted }}>similar</div>
              </div>
              <CompareBox title="Existing FAQ" body={existing} t={t} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn size="sm">
                <GitMerge size={13} />
                Merge into Existing
              </Btn>
              <Btn variant="ghost" size="sm">
                Allow with Justification
              </Btn>
            </div>
          </Card>
        ))}
      </Stack>
    </div>
  );
}

function BotFeedbackScreen({ t }: { t: ThemeTokens }) {
  return (
    <div>
      <SectionHeader
        title="Chatbot Feedback"
        sub="Monitor Yaksha's performance and accuracy"
        t={t}
      />
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}
      >
        <StatCard label="Helpful Responses" value="78%" icon={ThumbsUp} color={t.success} t={t} />
        <StatCard label="Unhelpful Reported" value="22%" icon={ThumbsDown} color={t.danger} t={t} />
        <StatCard label="Avg. Sources Cited" value="2.4" icon={BookOpen} color={t.accent} t={t} />
      </div>
      <Card t={t}>
        <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 14 }}>
          Queries with No Source Found
        </div>
        {[
          "How to appeal NOC rejection?",
          "Leave policy for national holidays?",
          "Can internship be extended?"
        ].map((query) => (
          <div
            key={query}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: `1px solid ${t.border}`
            }}
          >
            <div style={{ fontSize: 13, color: t.text }}>{query}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge label="No Source" color="danger" t={t} />
              <Btn size="sm">
                <Plus size={12} />
                Create FAQ
              </Btn>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Chip({
  label,
  active,
  t,
  onClick,
  squared
}: {
  label: string;
  active: boolean;
  t: ThemeTokens;
  onClick: () => void;
  squared?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12,
        padding: "5px 13px",
        borderRadius: squared ? 8 : 20,
        border: squared ? `1px solid ${active ? t.accent : t.border}` : "none",
        cursor: "pointer",
        fontFamily: "inherit",
        fontWeight: 500,
        background: active ? t.accent : t.pill,
        color: active ? "white" : t.pillText
      }}
    >
      {label}
    </button>
  );
}

function Field({ label, t, children }: { label: string; t: ThemeTokens; children: ReactNode }) {
  return (
    <label
      style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 14 }}
    >
      <span style={{ display: "block", marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

function Notice({
  t,
  title,
  tone,
  children
}: {
  t: ThemeTokens;
  title: string;
  tone: "warning" | "info";
  children: ReactNode;
}) {
  const color = tone === "warning" ? t.warning : t.accent;
  const bg = tone === "warning" ? t.warningBg : t.accentBg;
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${color}40`,
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
        display: "flex",
        gap: 10
      }}
    >
      <AlertTriangle size={18} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 13, color: t.textMuted }}>{children}</div>
      </div>
    </div>
  );
}

function Stack({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>;
}

function inputStyle(t: ThemeTokens): CSSProperties {
  return {
    width: "100%",
    background: t.input,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: t.text,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box"
  };
}

function feedbackButtonStyle(color: string): CSSProperties {
  return {
    fontSize: 11,
    color,
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 3,
    fontFamily: "inherit",
    padding: 0
  };
}

function TableHeader({ t, columns }: { t: ThemeTokens; columns: string[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 0.9fr 0.5fr",
        padding: "10px 18px",
        background: t.input,
        borderBottom: `1px solid ${t.border}`,
        fontSize: 11,
        fontWeight: 700,
        color: t.textMuted,
        textTransform: "uppercase",
        letterSpacing: ".5px",
        gap: 12
      }}
    >
      {columns.map((column) => (
        <div key={column}>{column}</div>
      ))}
    </div>
  );
}

function tableRowStyle(t: ThemeTokens, bordered: boolean): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 0.9fr 0.5fr",
    padding: "13px 18px",
    borderBottom: bordered ? `1px solid ${t.border}` : "none",
    alignItems: "center",
    gap: 12
  };
}

function IconButton({
  t,
  danger,
  children
}: {
  t: ThemeTokens;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      style={{
        background: danger ? t.dangerBg : t.pill,
        border: "none",
        borderRadius: 6,
        padding: "5px 8px",
        cursor: "pointer",
        color: danger ? t.danger : t.text
      }}
    >
      {children}
    </button>
  );
}

function CompareBox({ title, body, t }: { title: string; body: string; t: ThemeTokens }) {
  return (
    <div
      style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}
    >
      <div
        style={{
          fontSize: 11,
          color: t.textMuted,
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: ".5px"
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{body}</div>
    </div>
  );
}
