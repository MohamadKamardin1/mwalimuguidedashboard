PROJECT: Dashboard frontend for the school AI diagnosis backend. Based on the vue-notus template, folder /dashboard.
RULES:
- Reuse existing Notus layouts, sidebar, navbars, cards, tables, dropdowns. Do not design new components unless none fits; if new, follow Notus Tailwind styling.
- No registration UI anywhere. Roles: SCHOOL_ADMIN, TEACHER (PLATFORM_ADMIN uses Django admin only).
- API: single GraphQL endpoint via src/api/client.js (fetch wrapper). No Apollo. Pinia for state.
- Config via env var for API URL. Never hardcode URLs.
- Keep code small, no premature abstraction, no tests until told.
- After each prompt run the build/lint once and do a manual sanity check, then print a 5-line summary (files changed, routes added, API operations used, env vars, undone items).
- The source of truth for the API is dashboard/schema.graphql. Use only operations that exist there. If something needed is missing, do NOT invent it: list it under "Missing backend operations" in the summary and stub the UI around it.
- All list pages use the shared DataTable, FormModal, ConfirmDialog and usePagedList from F5. Do not re-implement them.
- Every mutation shows a success/error toast. Every list has loading, empty, and error states. Forms validate before submit and show field-level server errors.



TEACHER UI RULES:
- Exam workspace at /teacher/exams/:id is the hub. All exam steps are child routes/tabs of it, driven by exam.status. A sticky NextStepBar shows the single recommended action for the current status. Do not create standalone pages for exam steps outside the workspace.
- Shared pieces (build once in T1/T3, reuse everywhere): useJob(jobId) composable (polls job query every 1.5s, survives refresh via localStorage of active job ids, stops on done/failed/unmount), JobProgress card, ConfidenceBadge (>=0.8 green, 0.5-0.8 orange, <0.5 red), AiNote (small labelled block for AI reasoning with an "AI" chip), MathText (renders LaTeX via KaTeX, falls back to plain text), StatusBadge, EmptyState with a primary action.
- Any AI content is labelled with the AI chip and is editable or dismissible by the teacher.
- Teachers only see their own classes/exams. Show friendly empty states when nothing is assigned yet.
- Mobile first at 375px. Touch targets >= 44px. Camera capture inputs use accept="image/*" capture="environment" where relevant.
- Language toggle (English/Kiswahili) applies to AI-generated report content only, not the UI chrome.
- Source of truth for the API is schema.graphql. Missing operations go in the summary under "Missing backend operations"; stub UI around them.

REPORTS RULES:
- All reports use the shared kit in src/components/reports/: ReportPage (A4-aware container with header/footer), ReportSection, VerdictCard (AI summary + evidence), KpiRow, ChartCard, Heatmap, SkillBar, TrendSparkline, ReportToolbar (print, export CSV, language, share).
- One chart library only (use what Notus already ships, else chart.js). Shared color scale in src/utils/scale.js. Numbers formatted by one helper (percent, marks, delta with arrow).
- Print: @media print hides sidebar, navbar, toolbars; A4, 15mm margins, no page-breaks inside cards, charts rendered as static.
- Reports are routed under /teacher/reports/*, and all filters live in the query string so links are shareable and back/forward works.