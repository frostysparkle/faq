import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell.jsx";
import LoginPage from "@/features/auth/LoginPage.jsx";
import { tokenStore } from "@/lib/tokenStore.js";

export function RequireAuth() {
  const location = useLocation();
  const navigate = useNavigate();
  const accessToken = tokenStore.getAccessToken();

  useEffect(() => {
    const handleExpired = () => navigate("/login", { replace: true });

    window.addEventListener("samagama:auth-expired", handleExpired);
    return () => window.removeEventListener("samagama:auth-expired", handleExpired);
  }, [navigate]);

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <AppShell />;
}

export function LoginRoute() {
  if (tokenStore.getAccessToken()) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage />;
}
