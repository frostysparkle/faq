# PRD: Samagama Smart Support Portal MVP

## 1. Product Name

**Samagama Smart Support Portal**

Alternative short name: **FAQFlow**

---

## 2. One-Line Summary

A RAG-powered FAQ and community Q&A portal that helps students find verified answers, prevents duplicate questions, and allows moderators to convert resolved community answers into updated FAQs.

---

## 3. Background

The current Samagama internship FAQ contains many questions in a long, unorganized format. Students often do not read the FAQ properly and directly escalate issues. This creates unnecessary load on the backend/support team.

The proposed MVP will organize FAQs into categories and tags, use semantic search and RAG to answer student queries, and provide a community Q&A section where unresolved questions can be answered and later approved by moderators.

---

## 4. Problem Statement

Students face difficulty finding relevant answers because:

1. FAQs are not properly categorized.
2. Many FAQs are similar or duplicated.
3. Students do not know which FAQ applies to their issue.
4. The chatbot may return wrong answers when multiple FAQs are semantically similar.
5. New student doubts are not captured in a structured way.
6. There is no proper workflow to convert repeated community questions into official FAQs.

---

## 5. Goals

The MVP should:

- Organize FAQs using categories and tags.
- Allow students to search FAQs easily.
- Provide RAG-based chatbot answers from approved FAQ data.
- Let students post questions only after checking existing answers.
- Show similar FAQs before allowing a new question.
- Allow community members to answer unresolved questions.
- Allow moderators to approve answers.
- Allow moderators to convert approved answers into FAQs.
- Automatically update the RAG knowledge base when FAQs are added or edited.
- Reduce repeated and unnecessary escalations.

---

## 6. Non-Goals for MVP

The following are not included in the MVP:

- Notification system.
- Email alerts.
- WhatsApp/Telegram bot.
- Voice input.
- Mobile app.
- Advanced reputation system.
- Fine-tuned custom LLM.
- Full-scale analytics dashboard.
- Multi-language support.
- GitHub auto-sync.
- Payment or internship application workflows.

---

## 7. Target Users

### 7.1 Student

Students use the portal to:

- Search FAQs.
- Ask questions.
- Use the chatbot.
- View similar answers.
- Answer community questions.
- Mark whether an FAQ was helpful.

### 7.2 Moderator

Moderators manage quality of answers and content.

Moderators can:

- Review community answers.
- Approve or reject answers.
- Mark questions as resolved.
- Close questions.
- Change category/tags.
- Convert accepted answers into FAQs.
- Edit FAQ content.

### 7.3 Admin

Admins have full control.

Admins can:

- Manage users.
- Manage categories.
- Manage FAQs.
- Manage moderators.
- View system-level stats.
- Manage RAG knowledge base if required.

---

## 8. MVP Pages

The MVP will have the following main pages:

1. **FAQ Explorer Page**
2. **Ask Question Page**
3. **Community Q&A Page**
4. **RAG Chatbot Page**
5. **Moderator/Admin Dashboard**

---

# 9. Feature Requirements

---

## 9.1 FAQ Explorer Page

### Purpose

Help students browse and search official FAQs easily.

### Features

- Display all published FAQs.
- Show FAQs grouped by category.
- Support category filters.
- Support tag filters.
- Support keyword search.
- Support semantic search.
- Show recently updated FAQs.
- Show FAQ status:
  - Published
  - Draft
  - Flagged
  - Archived
- Show FAQ metadata:
  - Category
  - Tags
  - Last updated date
  - Helpful count
  - Not helpful count

### FAQ Card Fields

Each FAQ card should show:

```txt
Question
Answer
Category
Tags
Last Updated
Helpful / Not Helpful buttons
