const categories = [
  "Stipend & Payments",
  "NOC & Certificates",
  "Technical Issues",
  "Submission & Deadlines",
  "Portal Access",
  "General Queries"
];

const topics = [
  ["Stipend & Payments", "Why has my stipend not been credited yet?", ["payment-delay", "stipend", "bank-details"]],
  ["Stipend & Payments", "How do I correct bank details for stipend payment?", ["bank-details", "payment-delay"]],
  ["Stipend & Payments", "What documents are required for stipend release?", ["stipend", "documents"]],
  ["Stipend & Payments", "How are partial stipend payments handled?", ["stipend", "finance-review"]],
  ["Stipend & Payments", "When are monthly payment batches processed?", ["payment-delay", "finance-review"]],
  ["Stipend & Payments", "How do I escalate a failed stipend transaction?", ["payment-delay", "portal-error"]],
  ["Stipend & Payments", "Why does my payment show approved but not credited?", ["payment-delay", "bank-details"]],
  ["NOC & Certificates", "How do I request an NOC for internship approval?", ["noc-approval", "internship", "documents"]],
  ["NOC & Certificates", "What causes NOC approval delays?", ["noc-approval", "deadline-extension"]],
  ["NOC & Certificates", "How do I download a Bonafide Certificate?", ["certificate", "portal-access"]],
  ["NOC & Certificates", "Can I request multiple certificates together?", ["certificate", "documents"]],
  ["NOC & Certificates", "What should I do if my certificate has wrong details?", ["certificate", "profile-correction"]],
  ["NOC & Certificates", "How long does certificate verification take?", ["certificate", "finance-review"]],
  ["Technical Issues", "What should I do when document upload fails?", ["upload-failed", "portal-error"]],
  ["Technical Issues", "How do I fix unsupported file format errors?", ["upload-failed", "documents"]],
  ["Technical Issues", "Why does the portal show a server error?", ["portal-error", "login-issue"]],
  ["Technical Issues", "How do I clear browser issues before retrying?", ["portal-error", "login-issue"]],
  ["Technical Issues", "What if my submitted form is stuck on processing?", ["portal-error", "submission"]],
  ["Technical Issues", "How do I report a repeated technical failure?", ["portal-error", "support-ticket"]],
  ["Submission & Deadlines", "How do I request a deadline extension?", ["deadline-extension", "submission"]],
  ["Submission & Deadlines", "What happens after the final submission deadline?", ["deadline-extension", "submission"]],
  ["Submission & Deadlines", "Can I edit a submitted application?", ["submission", "profile-correction"]],
  ["Submission & Deadlines", "How do I confirm that my submission was received?", ["submission", "portal-access"]],
  ["Submission & Deadlines", "What should I do if I missed a deadline due to portal outage?", ["deadline-extension", "portal-error"]],
  ["Submission & Deadlines", "How are late documents reviewed?", ["deadline-extension", "documents"]],
  ["Portal Access", "How do I reset my portal password?", ["login-issue", "portal-access"]],
  ["Portal Access", "Why am I unable to log in after password reset?", ["login-issue", "portal-error"]],
  ["Portal Access", "How do I update my registered email or phone?", ["profile-correction", "portal-access"]],
  ["Portal Access", "What should I do if my account is locked?", ["login-issue", "support-ticket"]],
  ["Portal Access", "How do I check role-based access permissions?", ["portal-access", "support-ticket"]],
  ["Portal Access", "Why can I see old data after logging in?", ["portal-error", "profile-correction"]],
  ["General Queries", "Where can I see official announcements?", ["announcement", "portal-access"]],
  ["General Queries", "How do I contact the correct department?", ["support-ticket", "department-routing"]],
  ["General Queries", "What is the difference between FAQ and Community answers?", ["community-answer", "official-policy"]],
  ["General Queries", "How are community answers approved?", ["community-answer", "moderation"]],
  ["General Queries", "When should I contact a moderator?", ["moderation", "support-ticket"]],
  ["General Queries", "How do I track an unresolved question?", ["community-answer", "portal-access"]],
  ["General Queries", "What information should I include in a support request?", ["support-ticket", "documents"]],
  ["Technical Issues", "How do I recover from a timed-out payment page?", ["payment-delay", "portal-error"]],
  ["NOC & Certificates", "How do I verify that an issued certificate is official?", ["certificate", "official-policy"]]
];

const answerFor = (title, category) => {
  const department =
    category === "Stipend & Payments"
      ? "Finance Office"
      : category === "NOC & Certificates"
        ? "Student Services Desk"
        : category === "Technical Issues"
          ? "Technical Support Cell"
          : category === "Submission & Deadlines"
            ? "Academic Operations Office"
            : category === "Portal Access"
              ? "Portal Administration Team"
              : "Student Support Office";

  return [
    `${title} is handled through the official Samagama Navigator workflow so that requests can be traced, reviewed, and resolved without relying on informal messages. Start by checking whether your profile details are current, because most delays come from mismatched identifiers, missing documents, or a request being routed to the wrong department. If the portal shows a reference number, keep it available before contacting support.`,
    `The recommended process is to open the relevant service page, review the listed eligibility conditions, upload only the requested documents, and submit once. After submission, wait for the status to change before creating another request. Duplicate submissions slow down review because staff must reconcile multiple records for the same student. If you discover a mistake, use the correction or clarification option instead of opening a fresh request.`,
    `The ${department} reviews requests in batches. A request may move through received, under review, clarification needed, approved, and closed states. If clarification is requested, respond with the exact document or explanation asked for. Avoid sending screenshots unless the form specifically asks for proof of a portal error. Clear, complete responses are usually resolved faster than long explanations with unrelated attachments.`,
    `Escalate only when the published service window has passed, the status has not changed for more than three working days, or a deadline is within forty-eight hours. Your escalation should include your student ID, request reference number, category, date submitted, and the specific impact of the delay. This gives the moderator enough context to route the issue without asking for the same details again.`,
    `Do not share passwords, banking credentials, or private identity documents in open community threads. Use the secure upload field or the official support route for sensitive documents. Community answers can help with process questions, but only official FAQ entries and moderator-approved replies should be treated as institutional guidance.`
  ].join("\n\n");
};

export const faqContent = topics.map(([category, title, tags], index) => ({
  title,
  category,
  tags,
  summary: `${title} Clear institutional steps, escalation rules, and evidence requirements for students.`,
  answer: answerFor(title, category),
  qualityScore: index % 9 === 0 ? 0.18 : index % 7 === 0 ? 0.32 : index % 5 === 0 ? 0.55 : 0.82,
  helpfulCount: index % 7 === 0 ? 6 : 28 + index,
  notHelpfulCount: index % 7 === 0 ? 18 : index % 9 === 0 ? 20 : 3,
  viewCount: index % 7 === 0 ? 160 : 30 + index * 8,
  stale: index % 6 === 0
}));

export const seedCategories = categories;

export const seedTags = [
  "payment-delay",
  "noc-approval",
  "upload-failed",
  "deadline-extension",
  "login-issue",
  "portal-error",
  "bank-details",
  "stipend",
  "documents",
  "finance-review",
  "certificate",
  "portal-access",
  "internship",
  "submission",
  "support-ticket",
  "profile-correction",
  "announcement",
  "department-routing",
  "community-answer",
  "official-policy",
  "moderation"
];
