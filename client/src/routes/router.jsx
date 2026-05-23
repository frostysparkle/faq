import { createBrowserRouter, Navigate } from "react-router-dom";
import DashboardPage from "@/features/dashboard/DashboardPage.jsx";
import FaqEditor from "@/pages/admin/FaqEditor.jsx";
import FaqManagement from "@/pages/admin/FaqManagement.jsx";
import FaqQualityConsole from "@/pages/admin/FaqQualityConsole.jsx";
import IntelligenceOverview from "@/pages/admin/IntelligenceOverview.jsx";
import IssueHeatmap from "@/pages/admin/IssueHeatmap.jsx";
import ModerationLoadDashboard from "@/pages/admin/ModerationLoadDashboard.jsx";
import UnansweredSearches from "@/pages/admin/UnansweredSearches.jsx";
import UserManagement from "@/pages/admin/UserManagement.jsx";
import GuidedAssistant from "@/pages/assistant/GuidedAssistant.jsx";
import AskQuestionFlow from "@/pages/community/AskQuestionFlow.jsx";
import CommunityFeed from "@/pages/community/CommunityFeed.jsx";
import QuestionDetail from "@/pages/community/QuestionDetail.jsx";
import FaqDetail from "@/pages/faq/FaqDetail.jsx";
import FaqExplorer from "@/pages/faq/FaqExplorer.jsx";
import FaqConversionCandidates from "@/pages/moderator/FaqConversionCandidates.jsx";
import ModerationAnalytics from "@/pages/moderator/ModerationAnalytics.jsx";
import ModerationConsole from "@/pages/moderator/ModerationConsole.jsx";
import ReviewQueue from "@/pages/moderator/ReviewQueue.jsx";
import MyQuestions from "@/pages/student/MyQuestions.jsx";
import { LoginRoute, RequireAuth } from "./AuthRoutes.jsx";
import NotFound from "./NotFound.jsx";
import WorkspacePage from "./WorkspacePage.jsx";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginRoute />
  },
  {
    path: "/",
    element: <RequireAuth />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <DashboardPage />
      },
      {
        path: "faqs",
        element: <FaqExplorer />
      },
      {
        path: "community",
        element: <CommunityFeed />
      },
      {
        path: "questions",
        element: <Navigate to="/community" replace />
      },
      {
        path: "questions/new",
        element: <Navigate to="/community/ask" replace />
      },
      {
        path: "community/ask",
        element: <AskQuestionFlow />
      },
      {
        path: "community/questions/:id",
        element: <QuestionDetail />
      },
      {
        path: "student/questions",
        element: <MyQuestions />
      },
      {
        path: "assistant",
        element: <GuidedAssistant />
      },
      {
        path: "moderator/console",
        element: <ModerationConsole />
      },
      {
        path: "moderator/queue",
        element: <ReviewQueue />
      },
      {
        path: "moderator/faq-candidates",
        element: <FaqConversionCandidates />
      },
      {
        path: "moderator/analytics",
        element: <ModerationAnalytics />
      },
      {
        path: "faqs/:id",
        element: <FaqDetail />
      },
      {
        path: "admin/faqs/new",
        element: <FaqEditor />
      },
      {
        path: "admin/intelligence",
        element: <IntelligenceOverview />
      },
      {
        path: "admin/issue-heatmap",
        element: <IssueHeatmap />
      },
      {
        path: "admin/unanswered-searches",
        element: <UnansweredSearches />
      },
      {
        path: "admin/faq-quality",
        element: <FaqQualityConsole />
      },
      {
        path: "admin/moderation-load",
        element: <ModerationLoadDashboard />
      },
      {
        path: "admin/faqs",
        element: <FaqManagement />
      },
      {
        path: "admin/users",
        element: <UserManagement />
      },
      {
        path: "admin/audit-logs",
        element: <WorkspacePage title="Audit Logs" description="Filtered institutional audit trail for compliance review." />
      },
      {
        path: "admin/faqs/:id/edit",
        element: <FaqEditor />
      },
      {
        path: "categories",
        element: <WorkspacePage title="Categories" description="Governance taxonomy for routing and reporting." />
      },
      {
        path: "tags",
        element: <WorkspacePage title="Tags" description="Reusable labels for segmentation, search, and analytics." />
      },
      {
        path: "insights",
        element: <WorkspacePage title="Insights" description="Decision performance and knowledge-flow analytics." />
      },
      {
        path: "contact-moderator",
        element: <WorkspacePage title="Contact Moderator" description="Escalate a question to the moderation team. For the demo, use the community flow or moderation console to continue the workflow." />
      },
      {
        path: "settings",
        element: <WorkspacePage title="Settings" description="Profile, notification, and workspace preferences for Samagama Navigator." />
      }
    ]
  }
]);
