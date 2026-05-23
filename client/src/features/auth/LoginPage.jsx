import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { loginUserSchema } from "@samagama/shared/schemas";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { queryClient } from "@/lib/queryClient.js";
import { tokenStore } from "@/lib/tokenStore.js";
import { login } from "./authApi.js";

const demoAccounts = [
  { role: "Admin", email: "admin@samagama.dev", password: "Admin@1234", badge: "published" },
  { role: "Moderator", email: "mod1@samagama.dev", password: "Mod@1234", badge: "pending" },
  { role: "Student", email: "student1@samagama.dev", password: "Student@1234", badge: "muted" }
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from?.pathname ?? "/";
  const form = useForm({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (result) => {
      tokenStore.setTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
      tokenStore.setUser(result.user);
      queryClient.setQueryData(["auth", "me"], result.user);
      navigate(returnTo, { replace: true });
    }
  });

  const fillDemoAccount = (account) => {
    form.setValue("email", account.email, { shouldValidate: true });
    form.setValue("password", account.password, { shouldValidate: true });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-deep px-4 py-10 text-textPrimary">
      <Card className="w-full max-w-md border-white/10 bg-surface shadow-workspace">
        <CardHeader>
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-base font-bold text-white">S</div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Institutional Console</p>
              <CardTitle className="font-display text-3xl">Samagama Navigator</CardTitle>
            </div>
          </div>
          <CardDescription className="text-textMuted">
            Sign in to access verified FAQs, community Q&A, moderation workflows, and intelligence dashboards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input id="email" type="email" autoComplete="email" placeholder="admin@samagama.dev" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-sm text-danger">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input id="password" type="password" autoComplete="current-password" placeholder="Enter password" {...form.register("password")} />
              {form.formState.errors.password && (
                <p className="text-sm text-danger">{form.formState.errors.password.message}</p>
              )}
            </div>
            {loginMutation.isError && (
              <p className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
                {loginMutation.error?.response?.data?.error?.message ?? "Unable to sign in"}
              </p>
            )}
            <Button type="submit" className="w-full" loading={loginMutation.isPending}>
              Sign in
            </Button>
          </form>

          <div className="mt-6 border-t border-white/5 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textMuted">Demo access</p>
            <div className="mt-3 grid gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm transition-colors hover:border-accent/30 hover:bg-accent/10"
                  onClick={() => fillDemoAccount(account)}
                >
                  <span>
                    <span className="block font-semibold text-textPrimary">{account.email}</span>
                    <span className="text-xs text-textMuted">{account.password}</span>
                  </span>
                  <Badge variant={account.badge}>{account.role}</Badge>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
