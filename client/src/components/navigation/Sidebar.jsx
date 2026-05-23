import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Home,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCog,
  UserRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip.jsx";
import { cn } from "@/lib/utils.js";

const roleItems = {
  student: [
    { label: "Home", href: "/", icon: Home },
    { label: "FAQ Explorer", href: "/faqs", icon: HelpCircle },
    { label: "Community", href: "/community", icon: MessageSquareText },
    { label: "My Questions", href: "/student/questions", icon: UserRound },
    { label: "Guided Assistant", href: "/assistant", icon: Sparkles }
  ],
  moderator: [
    { label: "Review Queue", href: "/moderator/queue", icon: ShieldCheck },
    { label: "Moderation Console", href: "/moderator/console", icon: ShieldCheck }
  ],
  admin: [
    { label: "Intelligence", href: "/admin/intelligence", icon: BrainCircuit },
    { label: "FAQ Management", href: "/admin/faqs", icon: HelpCircle },
    { label: "User Management", href: "/admin/users", icon: UserCog }
  ]
};

const getItemsForRole = (role) => [
  ...roleItems.student,
  ...(role === "moderator" || role === "admin" ? roleItems.moderator : []),
  ...(role === "admin" ? roleItems.admin : [])
];

export default function Sidebar({ user = { name: "Kushagra", role: "admin" } }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const items = getItemsForRole(user.role ?? "student");
  const ToggleIcon = collapsed ? ChevronRight : ChevronLeft;

  return (
    <TooltipProvider delayDuration={150}>
      <aside className={cn("flex shrink-0 flex-col border-r border-white/5 bg-surface transition-[width] duration-200", collapsed ? "w-[76px]" : "w-64")}>
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-white">S</div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-textPrimary">Samagama</p>
                <p className="truncate text-xs text-textMuted">Navigator</p>
              </div>
            )}
          </Link>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>
            <ToggleIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href);
            const link = (
              <Link
                to={item.href}
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  "group flex h-10 items-center gap-3 rounded-lg border-l-2 px-3 text-sm font-medium transition-colors",
                  active ? "border-l-accent bg-accent/10 text-textPrimary" : "border-l-transparent text-textMuted hover:bg-white/5 hover:text-textPrimary",
                  collapsed && "justify-center px-0"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );

            return collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              <div key={item.href}>{link}</div>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-3">
          <div className={cn("flex items-center gap-3 rounded-xl bg-white/[0.03] p-3", collapsed && "justify-center p-2")}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-bold text-accent">
              {user.name?.charAt(0) ?? "S"}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-textPrimary">{user.name ?? "Samagama User"}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={user.role === "admin" ? "published" : "muted"}>{user.role ?? "student"}</Badge>
                  <Link to="/settings" className="text-textMuted hover:text-accent" aria-label="Settings">
                    <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
