import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../features/auth/AuthProvider";
import { AppRoutes } from "./AppRoutes";

function renderApp() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("role-based shell", () => {
  it("shows prototype student navigation and switches to the FAQ screen", async () => {
    renderApp();
    expect(await screen.findByText("Samagama")).toBeInTheDocument();

    const nav = screen.getByRole("navigation");
    await userEvent.click(within(nav).getByRole("button", { name: /browse faqs/i }));

    expect(screen.getByPlaceholderText(/search faqs by title or keyword/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^search$/i })).toBeInTheDocument();
  });
});
