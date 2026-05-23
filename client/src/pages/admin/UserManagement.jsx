import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button.jsx";
import ConfirmDialog from "@/components/ui/ConfirmDialog.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import { useAdminUsers, useUpdateUser } from "@/hooks/useAdminAnalytics.js";
import { cn } from "@/lib/utils.js";

const roles = ["student", "moderator", "admin"];

const UserSkeleton = () => (
  <div className="mx-auto max-w-7xl space-y-5">
    <div className="h-24 rounded-xl bg-surface" />
    <div className="h-[620px] rounded-xl bg-surface" />
  </div>
);

const formatDate = (value) => (value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "Unknown");

function UserManagementContent() {
  const { data: users } = useAdminUsers();
  const updateUser = useUpdateUser();
  const [dialog, setDialog] = useState(null);

  const applyChange = () => {
    if (!dialog) return;
    updateUser.mutate({ id: dialog.user._id, payload: dialog.payload });
    setDialog(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accentBlue">User Management</p>
        <h1 className="mt-2 font-display text-4xl text-textPrimary md:text-5xl">Access Control</h1>
        <p className="mt-2 max-w-3xl text-sm text-textMuted">Role changes alter moderation authority immediately. Suspensions preserve existing content for institutional continuity.</p>
      </header>

      <section className="premium-card overflow-hidden">
        {/* Anti-pattern guard: activity combines join and last-active signals to keep this operational table at six columns. */}
        <div className="grid grid-cols-[1fr_1.2fr_120px_120px_170px_130px] gap-3 border-b border-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-textMuted">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Status</span>
          <span>Activity</span>
          <span>Action</span>
        </div>
        <div className="divide-y divide-white/5">
          {users.length === 0 && (
            <div className="p-4">
              <EmptyState title="No users found" description="No accounts match the current access-control view." variant="search" />
            </div>
          )}
          {users.map((user) => (
            <div key={user._id} className="grid grid-cols-[1fr_1.2fr_120px_120px_170px_130px] items-center gap-3 px-4 py-3 text-sm">
              <span className="truncate font-semibold text-textPrimary">{user.name}</span>
              <span className="truncate text-textMuted">{user.email}</span>
              <select
                value={user.role}
                onChange={(event) => setDialog({ type: "role", user, payload: { role: event.target.value }, message: `Change ${user.name} from ${user.role} to ${event.target.value}.` })}
                className="h-8 rounded-lg border border-white/10 bg-white/5 px-2 text-textPrimary"
              >
                {roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <span className={cn("w-fit rounded-full px-2 py-1 text-xs capitalize", user.status === "active" ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>{user.status}</span>
              <span className="text-textMuted">
                Joined {formatDate(user.createdAt)}
                <span className="block text-xs">Last active {formatDate(user.updatedAt)}</span>
              </span>
              <Button
                size="sm"
                variant={user.status === "active" ? "destructive" : "outline"}
                className={user.status === "active" ? "" : "border-white/10 bg-white/5"}
                onClick={() => setDialog({
                  type: "status",
                  user,
                  payload: { status: user.status === "active" ? "suspended" : "active" },
                  message: user.status === "active"
                    ? "This will prevent the user from submitting answers. Existing content is preserved."
                    : "This restores access for submissions and moderation according to role."
                })}
              >
                {user.status === "active" ? "Suspend" : "Activate"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(dialog)}
        title="Confirm Access Change"
        description={dialog?.message}
        confirmLabel="Confirm change"
        confirmVariant={dialog?.payload?.status === "suspended" ? "danger" : "primary"}
        onConfirm={applyChange}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

export default function UserManagement() {
  return (
    <Suspense fallback={<UserSkeleton />}>
      <UserManagementContent />
    </Suspense>
  );
}
