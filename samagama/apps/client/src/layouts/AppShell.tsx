import { LogOut, MoonStar } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { roleLabels } from "../data/mockData";
import { useAuth } from "../features/auth/AuthProvider";
import { navByRole } from "./navigation";

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  if (!user) return null;
  const nav = navByRole[user.role] ?? [];
  const active = nav.find((item) => item.path === location.pathname);

  return (
    <div className="appShell">
      <header className="topbar">
        <div className="brand">
          Samagama <span>Portal</span>
        </div>
        <span className="breadcrumb">{active?.label ?? "Dashboard"}</span>
        <div className="topbarActions">
          <button className="iconButton" aria-label="Toggle theme">
            <MoonStar aria-hidden="true" />
          </button>
          <button className="rolePill" onClick={logout}>
            {roleLabels[user.role]}
            <LogOut aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className="sidebar" aria-label="Primary navigation">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <div key={`${item.section ?? ""}-${item.path}-${item.label}`}>
                {item.section ? <div className="navSection">{item.section}</div> : null}
                <NavLink
                  to={item.path}
                  end
                  className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}
                >
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.badge ? <strong>{item.badge}</strong> : null}
                </NavLink>
              </div>
            );
          })}
        </aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
