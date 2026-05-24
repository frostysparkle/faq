import { Building2, GraduationCap, Settings, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { UserRole } from "@samagama/shared";
import { useAuth } from "./AuthProvider";

const roles: Array<{
  role: UserRole;
  title: string;
  description: string;
  icon: typeof GraduationCap;
}> = [
  {
    role: "student",
    title: "Student",
    description: "Browse FAQs, ask questions, use chatbot",
    icon: GraduationCap
  },
  {
    role: "moderator",
    title: "Moderator",
    description: "Review answers, approve content, manage flags",
    icon: ShieldCheck
  },
  {
    role: "admin",
    title: "Admin",
    description: "Full access: FAQs, users, analytics, settings",
    icon: Settings
  }
];

export function LoginPage() {
  const { loginAs } = useAuth();
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(role: UserRole) {
    setError(null);
    setLoadingRole(role);
    try {
      await loginAs(role);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setLoadingRole(null);
    }
  }

  return (
    <main className="loginShell">
      <section className="loginCard" aria-labelledby="login-title">
        <div className="loginMark">
          <Building2 aria-hidden="true" />
        </div>
        <h1 id="login-title">Samagama Portal</h1>
        <p>Internship FAQ & Community Platform</p>
        <div className="sectionLabel">Sign in as</div>
        {roles.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className="roleButton"
              key={item.role}
              onClick={() => void handleLogin(item.role)}
              disabled={loadingRole !== null}
            >
              <Icon aria-hidden="true" />
              <span>
                <strong>{loadingRole === item.role ? "Signing in..." : item.title}</strong>
                <small>{item.description}</small>
              </span>
            </button>
          );
        })}
        {error ? <div className="formError">{error}</div> : null}
      </section>
    </main>
  );
}
