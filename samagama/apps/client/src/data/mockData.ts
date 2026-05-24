import type { UserRole } from "@samagama/shared";

export const demoStats = {
  totalFaqs: 158,
  openQuestions: 24,
  chatbotQueries: 89,
  avgResolution: "2.4h",
  pendingAnswers: 12,
  flaggedFaqs: 5,
  duplicateAlerts: 3,
  botHelpfulness: "84%"
};

export const faqs = [
  {
    id: "42",
    title: "How do I submit my NOC?",
    category: "NOC",
    tags: ["noc", "deadlines"],
    status: "Published",
    updated: "2 days ago",
    answer:
      "Submit NOC through Documents > NOC Submission. Upload the signed NOC and proof of internship completion before the deadline.",
    views: 342,
    helpful: 91
  },
  {
    id: "15",
    title: "What if my login credentials are not working?",
    category: "Login and Access",
    tags: ["login", "sso", "technical"],
    status: "Published",
    updated: "5 hours ago",
    answer:
      "Clear browser cache, try incognito mode, and reset your password from the portal reset link. Contact support if SSO still fails.",
    views: 201,
    helpful: 87
  },
  {
    id: "81",
    title: "How to download my internship certificate?",
    category: "Certificates",
    tags: ["certificate", "download"],
    status: "Published",
    updated: "1 day ago",
    answer:
      "Certificates are available after attendance completion and mentor approval. Go to Profile > Documents to download.",
    views: 289,
    helpful: 84
  },
  {
    id: "37",
    title: "How is attendance tracked?",
    category: "Attendance",
    tags: ["attendance", "app"],
    status: "Outdated",
    updated: "5 days ago",
    answer:
      "Attendance is tracked in the Samagama app. This FAQ is marked outdated while the new app flow is reviewed.",
    views: 178,
    helpful: 62
  }
];

export const communityQuestions = [
  {
    title: "Can we submit our NOC after the deadline if our mentor approves late?",
    category: "NOC",
    status: "Open",
    answers: 2,
    author: "Arjun K.",
    updated: "10 min ago"
  },
  {
    title: "Is final week attendance mandatory if project is submitted?",
    category: "Attendance",
    status: "Open",
    answers: 0,
    author: "Priya T.",
    updated: "1h ago"
  },
  {
    title: "How long does certificate generation take after internship ends?",
    category: "Certificates",
    status: "Resolved",
    answers: 4,
    author: "Meera S.",
    updated: "3h ago"
  }
];

export const moderationItems = [
  {
    question: "Can NOC be submitted after the deadline if mentor delays approval?",
    category: "NOC",
    answer:
      "A short grace period may be allowed only with written mentor approval sent before the original deadline.",
    author: "Meera S.",
    age: "2h ago"
  },
  {
    question: "What happens if I miss attendance for the last week?",
    category: "Attendance",
    answer:
      "Missing final week attendance may affect certificate generation. Contact your mentor and admin immediately.",
    author: "Rahul P.",
    age: "4h ago"
  }
];

export const roleLabels: Record<UserRole, string> = {
  student: "Student",
  moderator: "Moderator",
  admin: "Admin"
};
