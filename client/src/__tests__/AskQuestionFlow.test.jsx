import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AskQuestionFlow from "@/pages/community/AskQuestionFlow.jsx";

jest.mock("react-markdown", () => ({ children }) => <div>{children}</div>);
jest.mock("rehype-raw", () => jest.fn());
jest.mock("rehype-sanitize", () => jest.fn());

jest.mock("@/hooks/useCategories.js", () => ({
  useCategories: jest.fn()
}));

jest.mock("@/hooks/useTags.js", () => ({
  useTags: jest.fn()
}));

jest.mock("@/hooks/useCommunity.js", () => ({
  useCheckExistingAnswers: jest.fn(),
  useCreateQuestion: jest.fn(),
  useQuestionLazy: jest.fn(() => ({ data: null }))
}));

jest.mock("@/hooks/useFaqs.js", () => ({
  useFaqLazy: jest.fn(() => ({ data: null }))
}));

const { useCategories } = jest.requireMock("@/hooks/useCategories.js");
const { useTags } = jest.requireMock("@/hooks/useTags.js");
const { useCheckExistingAnswers, useCreateQuestion } = jest.requireMock("@/hooks/useCommunity.js");

const match = {
  _id: "faq1",
  type: "faq",
  title: "Stipend payment delay",
  preview: "Official stipend delay guidance.",
  finalScore: 0.82
};

const fillStepOne = () => {
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Why is my stipend payment delayed?" } });
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: "cat1" } });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "My stipend payment has not arrived and I need to know the official escalation path." }
  });
};

const renderFlow = () =>
  render(
    <MemoryRouter>
      <AskQuestionFlow />
    </MemoryRouter>
  );

beforeEach(() => {
  jest.useRealTimers();
  useCategories.mockReturnValue({ data: [{ _id: "cat1", name: "Stipend & Payments" }] });
  useTags.mockReturnValue({ data: [{ _id: "tag1", name: "payment-delay" }] });
  useCheckExistingAnswers.mockReturnValue({
    data: { matches: [match], checkedAt: new Date().toISOString(), searchMode: "hybrid" },
    isFetching: false
  });
  useCreateQuestion.mockReturnValue({ mutateAsync: jest.fn().mockResolvedValue({ _id: "q1" }), isPending: false, isError: false });
});

it("advances from step 1 to step 2 on valid input", async () => {
  renderFlow();
  fillStepOne();

  fireEvent.click(screen.getByRole("button", { name: /Next/i }));

  expect(await screen.findByText("Let's find your answer before you wait.")).toBeInTheDocument();
});

it("shows existing answer results on step 2", async () => {
  renderFlow();
  fillStepOne();
  fireEvent.click(screen.getByRole("button", { name: /Next/i }));

  expect(await screen.findByText("Stipend payment delay")).toBeInTheDocument();
});

it("does not expose submission until the existing check is completed", async () => {
  renderFlow();
  fillStepOne();
  fireEvent.click(screen.getByRole("button", { name: /Next/i }));

  expect(await screen.findByText("Let's find your answer before you wait.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Submit Question/i })).not.toBeInTheDocument();
});

it("shows the None of these button after 5 seconds", async () => {
  jest.useFakeTimers();
  renderFlow();
  fillStepOne();
  fireEvent.click(screen.getByRole("button", { name: /Next/i }));
  await screen.findByText("Stipend payment delay");

  expect(screen.queryByRole("button", { name: /None of these/i })).not.toBeInTheDocument();
  act(() => {
    jest.advanceTimersByTime(5000);
  });

  expect(await screen.findByRole("button", { name: /None of these/i })).toBeInTheDocument();
});

it("shows review summary before submission", async () => {
  jest.useFakeTimers();
  renderFlow();
  fillStepOne();
  fireEvent.click(screen.getByRole("button", { name: /Next/i }));
  await screen.findByText("Stipend payment delay");
  act(() => {
    jest.advanceTimersByTime(5000);
  });
  fireEvent.click(await screen.findByRole("button", { name: /None of these/i }));

  await waitFor(() => {
    expect(screen.getByText("Review and submit")).toBeInTheDocument();
  });
  expect(screen.getByText("Existing answer check")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Submit Question/i })).toBeInTheDocument();
});
