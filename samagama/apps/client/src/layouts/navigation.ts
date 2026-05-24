import {
  BarChart3,
  Bot,
  Clock,
  Copy,
  FileText,
  Flag,
  HelpCircle,
  Home,
  LayoutDashboard,
  LayoutPanelLeft,
  ListChecks,
  MessageCircleQuestion,
  MessageSquarePlus,
  MessagesSquare,
  Settings,
  ShieldCheck,
  Tags,
  Users,
  type LucideIcon
} from "lucide-react";
import type { UserRole } from "@samagama/shared";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  section?: string;
}

export const navByRole: Record<UserRole, NavItem[]> = {
  student: [
    { section: "Main", label: "Home", path: "/", icon: Home },
    { label: "Browse FAQs", path: "/faqs", icon: HelpCircle },
    { label: "Community Q&A", path: "/community", icon: MessagesSquare, badge: "3" },
    { section: "My Activity", label: "Ask a Question", path: "/ask", icon: MessageSquarePlus },
    { label: "My Questions", path: "/my-questions", icon: ListChecks },
    { label: "Recently Viewed", path: "/recent", icon: Clock },
    { section: "Tools", label: "Yaksha Chatbot", path: "/chatbot", icon: Bot },
    { section: "Prototype", label: "New Prototype", path: "/prototype", icon: LayoutPanelLeft }
  ],
  moderator: [
    { section: "Moderation", label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Pending Answers", path: "/pending", icon: ShieldCheck, badge: "12" },
    { label: "Flagged FAQs", path: "/flagged", icon: Flag, badge: "5" },
    { label: "Unresolved Qs", path: "/unresolved", icon: MessageCircleQuestion, badge: "8" },
    { section: "Review", label: "Duplicate Candidates", path: "/duplicates", icon: Copy },
    { label: "FAQ Suggestions", path: "/suggestions", icon: FileText },
    { section: "Browse", label: "All FAQs", path: "/faqs", icon: HelpCircle },
    { label: "Community Q&A", path: "/community", icon: MessagesSquare },
    { section: "Prototype", label: "New Prototype", path: "/prototype", icon: LayoutPanelLeft }
  ],
  admin: [
    { section: "Overview", label: "Admin Overview", path: "/", icon: LayoutDashboard },
    { label: "Analytics", path: "/analytics", icon: BarChart3 },
    { section: "Content", label: "FAQ Management", path: "/faq-management", icon: FileText },
    { label: "Categories", path: "/categories", icon: Copy },
    { label: "Tags", path: "/tags", icon: Tags },
    { section: "Operations", label: "User Management", path: "/users", icon: Users },
    { label: "Moderation Queue", path: "/moderation", icon: ShieldCheck, badge: "17" },
    { label: "Chatbot Feedback", path: "/bot-feedback", icon: Bot },
    { section: "System", label: "Settings", path: "/settings", icon: Settings },
    { section: "Prototype", label: "New Prototype", path: "/prototype", icon: LayoutPanelLeft }
  ]
};
