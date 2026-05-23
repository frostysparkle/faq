import { useMemo, useState } from "react";
import { Bell, LogOut, Search, Settings, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import CommandPalette from "@/components/ui/CommandPalette.jsx";
import { tokenStore } from "@/lib/tokenStore.js";

const pageNames = [
  ["/admin/intelligence", "Intelligence Overview"],
  ["/admin/faqs", "FAQ Management"],
  ["/admin/users", "User Management"],
  ["/moderator/console", "Moderation Console"],
  ["/moderator/queue", "Review Queue"],
  ["/assistant", "Guided Assistant"],
  ["/community", "Community"],
  ["/faqs", "FAQ Explorer"],
  ["/", "Dashboard"]
];

export default function TopBar({ commandBar, user = { role: "student" } }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const pageName = useMemo(() => pageNames.find(([path]) => (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)))?.[1] ?? "Workspace", [location.pathname]);
  const roleBadgeVariant = user.role === "admin" ? "published" : user.role === "moderator" ? "pending" : "muted";

  const logout = () => {
    tokenStore.clearTokens();
    navigate("/login", { replace: true });
  };

  return (
    <header className="flex h-16 items-center gap-4 border-b border-white/5 bg-deep/85 px-5 backdrop-blur">
      <div className="hidden min-w-44 items-center gap-3 md:flex">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-xs font-bold text-white">S</div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Navigator</p>
          <p className="text-sm font-semibold text-textPrimary">{pageName}</p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {commandBar ?? (
          <button
            type="button"
            // MICROINTERACTION: search bar focus expands by 40px with spring-like transition.
            onFocus={() => setPaletteOpen(true)}
            onClick={() => setPaletteOpen(true)}
            className="flex h-10 w-full max-w-xl items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-left text-sm text-textMuted transition-[max-width,border,background] duration-200 focus:max-w-[calc(36rem+40px)] focus:border-accent/40 focus:bg-white/[0.05] focus:outline-none"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Search or press Ctrl K
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warning" />
        </Button>
        <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 md:flex">
          <UserRound className="h-4 w-4 text-textMuted" aria-hidden="true" />
          <Badge variant={roleBadgeVariant}>{user.role}</Badge>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("/settings")} aria-label="Settings">
            <Settings className="h-4 w-4 text-textMuted" aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={logout} aria-label="Sign out">
            <LogOut className="h-4 w-4 text-textMuted" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
