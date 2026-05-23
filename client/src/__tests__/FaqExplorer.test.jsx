import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FaqDetail from "@/pages/faq/FaqDetail.jsx";
import FaqExplorer from "@/pages/faq/FaqExplorer.jsx";

jest.mock("react-markdown", () => ({ children }) => <div>{children}</div>);
jest.mock("rehype-raw", () => jest.fn());
jest.mock("rehype-sanitize", () => jest.fn());

jest.mock("@/hooks/useCategories.js", () => ({
  useCategories: jest.fn()
}));

jest.mock("@/hooks/useTags.js", () => ({
  useTags: jest.fn()
}));

jest.mock("@/hooks/useFaqs.js", () => ({
  useCurrentUser: jest.fn(),
  useFaqSearch: jest.fn(),
  useFaq: jest.fn(),
  useFaqFeedback: jest.fn(() => ({ mutate: jest.fn(), isPending: false }))
}));

const { useCategories } = jest.requireMock("@/hooks/useCategories.js");
const { useTags } = jest.requireMock("@/hooks/useTags.js");
const { useCurrentUser, useFaqSearch, useFaq } = jest.requireMock("@/hooks/useFaqs.js");

const faq = {
  _id: "faq1",
  title: "Upload failed troubleshooting",
  summary: "How to recover from failed uploads.",
  answer: "Use a supported PDF and retry from the portal.",
  status: "published",
  categories: [{ _id: "cat1", name: "Technical Issues" }],
  tags: [{ _id: "tag1", name: "upload-failed" }],
  helpfulCount: 12,
  notHelpfulCount: 2,
  updatedAt: new Date().toISOString()
};

const renderExplorer = () =>
  render(
    <MemoryRouter initialEntries={["/faqs"]}>
      <Routes>
        <Route path="/faqs" element={<FaqExplorer />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  jest.useRealTimers();
  useCurrentUser.mockReturnValue({ data: { role: "student" } });
  useCategories.mockReturnValue({ data: [{ _id: "cat1", name: "Technical Issues" }] });
  useTags.mockReturnValue({ data: [{ _id: "tag1", name: "upload-failed" }] });
  useFaqSearch.mockReturnValue({
    data: { pages: [{ faqs: [faq], total: 1, searchMode: "hybrid" }] },
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn()
  });
  useFaq.mockReturnValue({ data: { faq, relatedFaqs: [] } });
});

it("renders loading skeleton while data is fetching", () => {
  useCurrentUser.mockImplementation(() => {
    throw new Promise(() => {});
  });

  renderExplorer();

  expect(document.querySelector(".h-14.rounded-xl")).toBeInTheDocument();
});

it("renders FAQ cards when data loads", () => {
  renderExplorer();

  expect(screen.getByText("Upload failed troubleshooting")).toBeInTheDocument();
});

it("search input triggers query change after debounce", async () => {
  jest.useFakeTimers();
  renderExplorer();

  fireEvent.change(screen.getByLabelText("Search FAQs"), { target: { value: "stipend" } });
  act(() => {
    jest.advanceTimersByTime(350);
  });

  await waitFor(() => {
    expect(useFaqSearch).toHaveBeenLastCalledWith(expect.objectContaining({ query: "stipend" }));
  });
});

it("renders empty state when results are empty", () => {
  useFaqSearch.mockReturnValue({
    data: { pages: [{ faqs: [], total: 0, searchMode: "hybrid" }] },
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn()
  });

  renderExplorer();

  expect(screen.getByText("No FAQs found in this category.")).toBeInTheDocument();
});

it("shows helpfulness controls on FAQ detail", () => {
  render(
    <MemoryRouter initialEntries={["/faqs/faq1"]}>
      <Routes>
        <Route path="/faqs/:id" element={<FaqDetail />} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByText("Was this helpful?")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Helpful\./i })).toBeInTheDocument();
});
