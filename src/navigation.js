/**
 * The one place the sidebar's links are described.
 *
 * Keyed by role, so a role can only ever be offered the routes it is allowed
 * to open -- the router enforces the same list via `meta.roles`, and this file
 * is what the sidebar reads. Add a page here and in `main.js`, nowhere else.
 *
 * `route` must exist in the router: pointing at a path with no route would
 * show a link that leads nowhere.
 */

import { SCHOOL_ADMIN, TEACHER } from "@/stores/auth";

export const NAVIGATION = {
  [SCHOOL_ADMIN]: [
    {
      route: "/admin/dashboard",
      label: "Dashboard",
      icon: "fas fa-tv",
      component: () => import("@/views/admin/Dashboard.vue"),
    },
    {
      route: "/admin/teachers",
      label: "Teachers",
      icon: "fas fa-chalkboard-teacher",
      // Built pages name their component here; the rest fall back to the
      // placeholder, so this file stays the single list of admin pages.
      component: () => import("@/views/admin/Teachers.vue"),
    },
    {
      route: "/admin/classes",
      label: "Classes",
      icon: "fas fa-door-open",
      component: () => import("@/views/admin/Classes.vue"),
    },
    {
      route: "/admin/students",
      label: "Students",
      icon: "fas fa-user-graduate",
      component: () => import("@/views/admin/Students.vue"),
    },
    {
      route: "/admin/setup",
      label: "Subjects & Terms",
      icon: "fas fa-book",
      // Terms and subjects are one screen with two tabs, so they share a route.
      component: () => import("@/views/admin/Setup.vue"),
    },
    {
      route: "/admin/assignments",
      label: "Assignments",
      icon: "fas fa-clipboard-list",
      component: () => import("@/views/admin/Assignments.vue"),
    },
    {
      route: "/admin/exams",
      label: "Exams",
      icon: "fas fa-file-alt",
      component: () => import("@/views/admin/Exams.vue"),
    },
  ],

  [TEACHER]: [
    {
      route: "/teacher/dashboard",
      label: "Dashboard",
      icon: "fas fa-tv",
      component: () => import("@/views/teacher/Dashboard.vue"),
    },
    {
      route: "/teacher/classes",
      label: "My Classes",
      icon: "fas fa-door-open",
      component: () => import("@/views/teacher/Classes.vue"),
    },
    {
      route: "/teacher/exams",
      label: "Exams",
      icon: "fas fa-file-alt",
      component: () => import("@/views/teacher/Exams.vue"),
    },
    {
      route: "/teacher/reports",
      label: "Reports",
      icon: "fas fa-chart-bar",
      component: () => import("@/views/teacher/Reports.vue"),
    },
  ],
};

/**
 * Routes a role needs that are not sidebar links -- a detail page reached from
 * a list, for instance. Kept here so this file stays the one route table.
 */
export const EXTRA_ROUTES = {
  [SCHOOL_ADMIN]: [
    {
      path: "classes/:id",
      name: "class-detail",
      component: () => import("@/views/admin/ClassDetail.vue"),
      meta: { roles: [SCHOOL_ADMIN] },
    },
    {
      // A step flow reached from Students or from a class, not a sidebar link.
      path: "students/import",
      name: "student-import",
      component: () => import("@/views/admin/StudentImport.vue"),
      meta: { roles: [SCHOOL_ADMIN] },
    },
    {
      // Read-only: an admin sees aggregates here, never student marks.
      path: "exams/:id",
      name: "exam-detail",
      component: () => import("@/views/admin/ExamDetail.vue"),
      meta: { roles: [SCHOOL_ADMIN] },
    },
  ],

  [TEACHER]: [
    {
      // The exam workspace is the hub for every exam step. The seven steps are
      // children of it, so the header, stepper and next-step bar stay put while
      // only the panel below them changes. A bare /teacher/exams/:id redirects
      // to whichever step the exam is actually sitting on.
      path: "exams/:id",
      name: "teacher-exam",
      component: () => import("@/views/teacher/ExamWorkspace.vue"),
      meta: { roles: [TEACHER], navLabel: "Exam", navIcon: "fas fa-file-alt" },
      children: [
        {
          path: "files",
          name: "teacher-exam-files",
          component: () => import("@/views/teacher/steps/FilesStep.vue"),
          meta: {
            roles: [TEACHER],
            stepKey: "files",
            step: {
              label: "Files",
              description: "The question paper and the marking scheme.",
            },
          },
        },
        {
          path: "confirm",
          name: "teacher-exam-confirm",
          component: () => import("@/views/teacher/steps/ConfirmStep.vue"),
          meta: {
            roles: [TEACHER],
            stepKey: "confirm",
            step: {
              label: "Confirm",
              description: "Check the questions, marks and rubric that were read from the paper.",
            },
          },
        },
        {
          path: "scripts",
          name: "teacher-exam-scripts",
          component: () => import("@/views/teacher/steps/Scripts.vue"),
          meta: {
            roles: [TEACHER],
            stepKey: "scripts",
            step: {
              label: "Scripts",
              description: "Upload the students' scripts and match each one to a student.",
            },
          },
        },
        {
          path: "marking",
          name: "teacher-exam-marking",
          component: () => import("@/views/teacher/steps/MarkingStep.vue"),
          meta: {
            roles: [TEACHER],
            stepKey: "marking",
            step: {
              label: "Marking",
              description: "The model marks each answer against the rubric.",
            },
          },
        },
        {
          path: "review",
          name: "teacher-exam-review",
          component: () => import("@/views/teacher/steps/ReviewStep.vue"),
          meta: {
            roles: [TEACHER],
            stepKey: "review",
            step: {
              label: "Review",
              description: "Answers the model was unsure about, waiting for your decision.",
            },
          },
        },
        {
          path: "results",
          name: "teacher-exam-results",
          component: () => import("@/views/teacher/steps/ResultsStep.vue"),
          meta: {
            roles: [TEACHER],
            stepKey: "results",
            step: {
              label: "Results",
              description: "One script at a time, with the marks and the working behind them.",
            },
          },
        },
        {
          path: "insights",
          name: "teacher-exam-insights",
          component: () => import("@/views/teacher/steps/InsightsStep.vue"),
          meta: {
            roles: [TEACHER],
            stepKey: "insights",
            step: {
              label: "Insights",
              description: "What the class found hard, and what to reteach.",
            },
          },
        },
      ],
    },
    {
      // Static, so it outranks `exams/:id` in the matcher.
      path: "exams/new",
      name: "teacher-exam-new",
      component: () => import("@/views/teacher/ExamNew.vue"),
      meta: { roles: [TEACHER], navLabel: "New exam", navIcon: "fas fa-plus" },
    },
    {
      // Reached from a class card, not a sidebar link. `subjectId` and
      // `termId` ride in the query so the page opens on the right subject.
      path: "classes/:id",
      name: "teacher-class",
      component: () => import("@/views/teacher/Class.vue"),
      meta: { roles: [TEACHER], navLabel: "Class", navIcon: "fas fa-door-open" },
    },
    {
      // The four report pickers. One screen answers them all -- what differs
      // is the question it asks, which the route's `meta.picker` carries.
      path: "reports/assessment",
      name: "report-assessment-picker",
      component: () => import("@/views/teacher/ReportPicker.vue"),
      meta: { roles: [TEACHER], picker: "assessment", navLabel: "Assessment report" },
    },
    {
      path: "reports/class",
      name: "report-class-picker",
      component: () => import("@/views/teacher/ReportPicker.vue"),
      meta: { roles: [TEACHER], picker: "class", navLabel: "Class report" },
    },
    {
      path: "reports/student",
      name: "report-student-picker",
      component: () => import("@/views/teacher/ReportPicker.vue"),
      meta: { roles: [TEACHER], picker: "student", navLabel: "Student report" },
    },
    {
      path: "reports/progress",
      name: "report-progress-picker",
      component: () => import("@/views/teacher/ReportPicker.vue"),
      meta: { roles: [TEACHER], picker: "progress", navLabel: "Progress report" },
    },
    {
      // `/progress/class/:classId` is declared first: it is the more specific
      // of the two, and the matcher has to see it before `:studentId`.
      path: "reports/progress/class/:classId",
      name: "report-progress-class",
      component: () => import("@/views/teacher/reports/ClassProgress.vue"),
      meta: { roles: [TEACHER], navLabel: "Class progress" },
    },
    {
      path: "reports/progress/:studentId",
      name: "report-progress-student",
      component: () => import("@/views/teacher/reports/StudentProgress.vue"),
      meta: { roles: [TEACHER], navLabel: "Student progress" },
    },
    {
      path: "reports/assessment/:examId",
      name: "report-assessment",
      component: () => import("@/views/teacher/reports/AssessmentReport.vue"),
      meta: { roles: [TEACHER], navLabel: "Assessment report" },
    },
    {
      // Declared before `reports/student/:studentId`: "batch" would otherwise
      // be read as a student id.
      path: "reports/student/batch/:examId",
      name: "report-batch",
      component: () => import("@/views/teacher/reports/BatchStudentReports.vue"),
      meta: { roles: [TEACHER], navLabel: "All student reports" },
    },
    {
      path: "reports/class/:classId",
      name: "report-class",
      component: () => import("@/views/teacher/reports/ClassReport.vue"),
      meta: { roles: [TEACHER], navLabel: "Class report" },
    },
    {
      path: "reports/student/:studentId",
      name: "report-student",
      component: () => import("@/views/teacher/reports/StudentReport.vue"),
      meta: { roles: [TEACHER], navLabel: "Student report" },
    },
    {
      // Reached from the students table. Declared after `classes/:id` because
      // the two are only distinguished by their first segment.
      path: "students/:id",
      name: "teacher-student",
      component: () => import("@/views/teacher/Student.vue"),
      meta: { roles: [TEACHER], navLabel: "Student", navIcon: "fas fa-user-graduate" },
    },
  ],
};

/** The links for a role, or none if the role has no map. */
export function linksForRole(role) {
  return NAVIGATION[role] || [];
}

/**
 * The router's child routes for a role, built from the same entries the
 * sidebar renders, so a link can never drift from its route. `path` is made
 * relative to the layout by dropping the leading segment.
 *
 * Every one is lazy: the placeholder screens cost nothing until opened.
 *
 * @param {string} role
 * @param {string} prefix the layout's own path segment, e.g. "admin"
 */
export function routesForRole(role, prefix) {
  const links = linksForRole(role).map((link) => {
    // "/admin/teachers" -> "teachers" once the layout owns "/admin".
    const path = link.route.replace(new RegExp(`^/${prefix}/?`), "");

    return {
      path,
      name: link.route,
      // The default export of a lazy route is resolved by the bundler.
      component: link.component || (() => import("@/views/PlaceholderRoute.vue")),
      meta: {
        roles: [role],
        navLabel: link.label,
        navIcon: link.icon,
      },
    };
  });

  return [...links, ...(EXTRA_ROUTES[role] || [])];
}
