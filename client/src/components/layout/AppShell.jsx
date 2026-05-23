import { Outlet } from "react-router-dom";
import Sidebar from "@/components/navigation/Sidebar.jsx";
import TopBar from "@/components/navigation/TopBar.jsx";
import { tokenStore } from "@/lib/tokenStore.js";

export default function AppShell({ commandBar, rightPanel, children }) {
  const user = tokenStore.getUser() ?? { name: "Samagama User", role: "student" };

  return (
    <div className="flex min-h-screen bg-deep text-textPrimary">
      <Sidebar user={user} />

      <div className="flex min-w-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <TopBar commandBar={commandBar} user={user} />
          <section data-app-scroll className="min-w-0 flex-1 overflow-auto p-5">
            {children ?? <Outlet />}
          </section>
        </main>

        {rightPanel && <aside className="hidden w-80 shrink-0 border-l border-white/5 bg-surface p-5 xl:block">{rightPanel}</aside>}
      </div>
    </div>
  );
}
