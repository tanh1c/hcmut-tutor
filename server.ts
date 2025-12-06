/**
 * Express API Server
 * Main server file for Tutor Support System APIs
 */

import 'dotenv/config'; // Load .env file
import express from 'express';
import cors from 'cors';
import { config } from './lib/config.js';
import { authenticate, authorize, validateBody, errorHandler } from './lib/middleware.js';
import { loginSchema, registerSchema, updateProfileSchema, createClassSchema, updateClassSchema, createEnrollmentSchema, updateEnrollmentSchema, createSessionRequestSchema, approveSessionRequestSchema, rejectSessionRequestSchema, createApprovalRequestSchema, approveApprovalRequestSchema, rejectApprovalRequestSchema, requestClarificationSchema, escalateApprovalRequestSchema, updateUserPermissionsSchema, revokeUserPermissionsSchema, grantTemporaryPermissionsSchema, optimizeResourceAllocationSchema, applyOptimizationSchema, manualOverrideSchema, createProgressReportSchema, updateProgressReportSchema, generatePerformanceAnalysisSchema, comparePerformanceSchema, awardCreditsSchema, revokeCreditsSchema, getEligibleStudentsSchema, uploadDocumentSchema, updateDocumentSchema, shareDocumentSchema, updateDocumentAccessSchema, createCommunityForumSchema, updateCommunityForumSchema, shareCommunityResourceSchema, restrictCommunityResourceSchema, createCommunityEventSchema } from './lib/schemas.js';
import { UserRole } from './lib/types.js';

// Import handlers - Auth
import { loginHandler } from './routes/auth/login.js';
import { registerHandler } from './routes/auth/register.js';
import { meHandler } from './routes/auth/me.js';
import { refreshTokenHandler } from './routes/auth/refresh.js';
import { logoutHandler } from './routes/auth/logout.js';

// Import handlers - Users
import { listUsersHandler } from './routes/users/index.js';
import { getUserHandler, updateUserHandler, deleteUserHandler } from './routes/users/[id].js';

// Import handlers - Tutors & Students
import { listTutorsHandler } from './routes/tutors/index.js';
import { getTutorHandler, getTutorReviewsHandler } from './routes/tutors/[id].js';
import { getStudentHandler, getStudentSessionsHandler } from './routes/students/[id].js';

// Import handlers - Sessions
import { listSessionsHandler, createSessionHandler } from './routes/sessions/index.js';
import { getSessionHandler, updateSessionHandler, cancelSessionHandler, rescheduleSessionHandler } from './routes/sessions/[id].js';

// Import handlers - Course Contents, Quizzes, Assignments
import { getCourseContentsHandler, createCourseContentHandler, updateCourseContentHandler, deleteCourseContentHandler } from './routes/sessions/[id]/course-contents.js';
import { getQuizzesHandler, createQuizHandler, updateQuizHandler, deleteQuizHandler, submitQuizHandler, getQuizSubmissionsHandler } from './routes/sessions/[id]/quizzes.js';
import { getAssignmentsHandler, createAssignmentHandler, updateAssignmentHandler, deleteAssignmentHandler, submitAssignmentHandler } from './routes/sessions/[id]/assignments.js';
import { getSubmissionsHandler, gradeSubmissionHandler } from './routes/sessions/[id]/submissions.js';
import { getGradesHandler, getGradesSummaryHandler } from './routes/sessions/[id]/grades.js';
import { getSessionStudentsHandler, addStudentToSessionHandler, removeStudentFromSessionHandler } from './routes/sessions/[id]/students.js';

// Import handlers - Calendar & Availability
import { getCalendarHandler } from './routes/calendar/[userId].js';
import { getAvailabilityHandler, setAvailabilityHandler, updateAvailabilityHandler } from './routes/availability/index.js';

// Import handlers - Rooms
import { listRoomsHandler, checkRoomAvailabilityHandler } from './routes/rooms/index.js';

// Import handlers - Classes & Enrollments
import { listClassesHandler, createClassHandler } from './routes/classes/index.js';
import { getClassHandler, updateClassHandler, deleteClassHandler } from './routes/classes/[id].js';
import { generateSessionsHandler } from './routes/classes/[id]/generate-sessions.js';
import { listEnrollmentsHandler, createEnrollmentHandler } from './routes/enrollments/index.js';
import { getEnrollmentHandler, updateEnrollmentHandler, deleteEnrollmentHandler } from './routes/enrollments/[id].js';

// Import handlers - Notifications
import { getNotificationsHandler, markAsReadHandler, deleteNotificationHandler } from './routes/notifications/index.js';
import { setupNotificationCron } from './lib/cron/notificationCron.js';

// Import handlers - Progress
import { listProgressHandler, createProgressHandler, getProgressHandler } from './routes/progress/index.js';

// Import handlers - Evaluations
import { listEvaluationsHandler, createEvaluationHandler, getEvaluationHandler, updateEvaluationHandler, deleteEvaluationHandler } from './routes/evaluations/index.js';

// Import handlers - Forum
import { listPostsHandler, createPostHandler, getPostHandler, updatePostHandler, deletePostHandler, likePostHandler, approvePostHandler, rejectPostHandler } from './routes/forum/posts.js';
import { getCommentsHandler, createCommentHandler, deleteCommentHandler, likeCommentHandler } from './routes/forum/comments.js';

import { searchMaterialsHandler, syncLibraryHandler, bookmarkMaterialHandler, getRecommendationsHandler, createMaterialHandler, updateMaterialHandler, deleteMaterialHandler, previewPDFHandler, fixPDFIdsHandler } from './routes/library/index.js';

// Import handlers - Conversations
import { listConversationsHandler, createConversationHandler, getConversationHandler, deleteConversationHandler } from './routes/conversations/index.js';
import { getMessagesHandler, sendMessageHandler } from './routes/conversations/[id]/messages.js';

// Import handlers - Chatbot
import { chatbotHandler, getHistoryHandler } from './routes/chatbot/index.js';

// Import handlers - Session Requests
import { listSessionRequestsHandler, createSessionRequestHandler } from './routes/session-requests/index.js';
import { getSessionRequestHandler, approveSessionRequestHandler, rejectSessionRequestHandler, withdrawSessionRequestHandler } from './routes/session-requests/[id].js';
import { getAlternativeSessionsHandler } from './routes/session-requests/alternatives.js';

// Import handlers - Management Approvals
import { listApprovalRequestsHandler, createApprovalRequestHandler } from './routes/management/approvals/index.js';
import { getApprovalRequestHandler, approveApprovalRequestHandler, rejectApprovalRequestHandler, requestClarificationHandler, escalateApprovalRequestHandler } from './routes/management/approvals/[id].js';

// Import handlers - Management Permissions
import { listUsersWithPermissionsHandler } from './routes/management/permissions/index.js';
import { getUserPermissionsHandler, updateUserPermissionsHandler, revokeUserPermissionsHandler, grantTemporaryPermissionsHandler } from './routes/management/permissions/[userId].js';

// Import handlers - Management Resources
import { getResourceOverviewHandler, getInefficienciesHandler, optimizeResourceAllocationHandler, applyOptimizationHandler, manualOverrideHandler } from './routes/management/resources/index.js';

// Import handlers - Management Reports
import { listProgressReportsHandler, createProgressReportHandler, getProgressReportHandler, exportProgressReportHandler, updateProgressReportHandler } from './routes/management/reports/progress.js';

// Import handlers - Management Analytics
import { getPerformanceAnalysisHandler, generatePerformanceAnalysisHandler, comparePerformanceHandler, getPerformanceKPIsHandler } from './routes/management/analytics/performance.js';

// Import handlers - Management Credits
import { getEligibleStudentsHandler, awardCreditsHandler, getCreditHistoryHandler, revokeCreditsHandler } from './routes/management/credits/index.js';

// Import handlers - Management Documents
import { listDocumentsHandler, uploadDocumentHandler, getDocumentHandler, updateDocumentHandler, deleteDocumentHandler, shareDocumentHandler, getDocumentAccessHandler, updateDocumentAccessHandler } from './routes/management/documents/index.js';

// Import handlers - Management Community
import { listForumsHandler, createForumHandler, updateForumHandler, deleteForumHandler, pinForumHandler, lockForumHandler } from './routes/management/community/forums.js';
import { listCommunityResourcesHandler, shareCommunityResourceHandler, restrictCommunityResourceHandler, createCommunityEventHandler, getCommunityActivitiesHandler } from './routes/management/community/index.js';

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? '*' : config.frontend.url,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ===== AUTHENTICATION ROUTES =====

app.post('/api/auth/login', validateBody(loginSchema), loginHandler);
app.post('/api/auth/register', validateBody(registerSchema), registerHandler);
app.post('/api/auth/logout', authenticate, logoutHandler);
app.get('/api/auth/me', authenticate, meHandler);
app.post('/api/auth/refresh-token', refreshTokenHandler);

// ===== USER MANAGEMENT ROUTES =====

app.get('/api/users', authenticate, listUsersHandler);
app.get('/api/users/:id', authenticate, getUserHandler);
app.put('/api/users/:id', authenticate, validateBody(updateProfileSchema), updateUserHandler);
app.delete('/api/users/:id', authenticate, authorize(UserRole.MANAGEMENT), deleteUserHandler);

// ===== TUTOR ROUTES =====

app.get('/api/tutors', listTutorsHandler);
app.get('/api/tutors/:id', getTutorHandler);
app.get('/api/tutors/:id/reviews', getTutorReviewsHandler);

// ===== STUDENT ROUTES =====

app.get('/api/students/:id', authenticate, getStudentHandler);
app.get('/api/students/:id/sessions', authenticate, getStudentSessionsHandler);

// ===== SESSION ROUTES =====

app.get('/api/sessions', authenticate, listSessionsHandler);
app.post('/api/sessions', authenticate, createSessionHandler);
app.get('/api/sessions/:id', authenticate, getSessionHandler);
app.put('/api/sessions/:id', authenticate, updateSessionHandler);
app.delete('/api/sessions/:id', authenticate, cancelSessionHandler);
app.post('/api/sessions/:id/reschedule', authenticate, rescheduleSessionHandler);

// Session-specific routes: Course Contents
app.get('/api/sessions/:id/course-contents', authenticate, getCourseContentsHandler);
app.post('/api/sessions/:id/course-contents', authenticate, createCourseContentHandler);
app.put('/api/sessions/:id/course-contents/:contentId', authenticate, updateCourseContentHandler);
app.delete('/api/sessions/:id/course-contents/:contentId', authenticate, deleteCourseContentHandler);

// Session-specific routes: Quizzes
app.get('/api/sessions/:id/quizzes', authenticate, getQuizzesHandler);
app.post('/api/sessions/:id/quizzes', authenticate, createQuizHandler);
app.put('/api/sessions/:id/quizzes/:quizId', authenticate, updateQuizHandler);
app.delete('/api/sessions/:id/quizzes/:quizId', authenticate, deleteQuizHandler);
app.get('/api/sessions/:id/quizzes/:quizId/submissions', authenticate, getQuizSubmissionsHandler);
app.post('/api/sessions/:id/quizzes/:quizId/submit', authenticate, submitQuizHandler);

// Session-specific routes: Assignments
app.get('/api/sessions/:id/assignments', authenticate, getAssignmentsHandler);
app.post('/api/sessions/:id/assignments', authenticate, createAssignmentHandler);
app.put('/api/sessions/:id/assignments/:assignmentId', authenticate, updateAssignmentHandler);
app.delete('/api/sessions/:id/assignments/:assignmentId', authenticate, deleteAssignmentHandler);
app.post('/api/sessions/:id/assignments/:assignmentId/submit', authenticate, submitAssignmentHandler);

// Session-specific routes: Submissions & Grading
app.get('/api/sessions/:id/submissions', authenticate, getSubmissionsHandler);
app.put('/api/sessions/:id/submissions/:submissionId/grade', authenticate, gradeSubmissionHandler);

// Session-specific routes: Grades
app.get('/api/sessions/:id/grades', authenticate, getGradesHandler);
app.get('/api/sessions/:id/grades/summary', authenticate, getGradesSummaryHandler);

// Session-specific routes: Students
app.get('/api/sessions/:id/students', authenticate, getSessionStudentsHandler);
app.post('/api/sessions/:id/students', authenticate, addStudentToSessionHandler);
app.delete('/api/sessions/:id/students/:studentId', authenticate, removeStudentFromSessionHandler);

// ===== CALENDAR & AVAILABILITY ROUTES =====

app.get('/api/calendar/:userId', authenticate, getCalendarHandler);
app.get('/api/availability/:tutorId', getAvailabilityHandler);
app.post('/api/availability', authenticate, setAvailabilityHandler);
app.put('/api/availability/:id', authenticate, updateAvailabilityHandler);

// ===== ROOMS ROUTES =====

app.get('/api/rooms', authenticate, listRoomsHandler);
app.get('/api/rooms/availability', authenticate, checkRoomAvailabilityHandler);

// ===== CLASSES ROUTES =====

app.get('/api/classes', listClassesHandler);
app.post('/api/classes', authenticate, validateBody(createClassSchema), createClassHandler);
app.get('/api/classes/:id', getClassHandler);
app.put('/api/classes/:id', authenticate, validateBody(updateClassSchema), updateClassHandler);
app.delete('/api/classes/:id', authenticate, deleteClassHandler);
app.post('/api/classes/:id/generate-sessions', authenticate, generateSessionsHandler);

// ===== ENROLLMENTS ROUTES =====

app.get('/api/enrollments', authenticate, listEnrollmentsHandler);
app.post('/api/enrollments', authenticate, validateBody(createEnrollmentSchema), createEnrollmentHandler);
app.get('/api/enrollments/:id', authenticate, getEnrollmentHandler);
app.put('/api/enrollments/:id', authenticate, validateBody(updateEnrollmentSchema), updateEnrollmentHandler);
app.delete('/api/enrollments/:id', authenticate, deleteEnrollmentHandler);

// ===== NOTIFICATIONS ROUTES =====

app.get('/api/notifications', authenticate, getNotificationsHandler);
app.put('/api/notifications/:id/read', authenticate, markAsReadHandler);
app.delete('/api/notifications/:id', authenticate, deleteNotificationHandler);

// ===== CONVERSATIONS ROUTES =====

app.get('/api/conversations', authenticate, listConversationsHandler);
app.post('/api/conversations', authenticate, createConversationHandler);
app.get('/api/conversations/:id', authenticate, getConversationHandler);
app.delete('/api/conversations/:id', authenticate, deleteConversationHandler);
app.get('/api/conversations/:id/messages', authenticate, getMessagesHandler);
app.post('/api/conversations/:id/messages', authenticate, sendMessageHandler);

// ===== CHATBOT ROUTES =====

app.post('/api/chatbot', authenticate, chatbotHandler);
app.post('/api/chatbot/chat', authenticate, chatbotHandler); // Alias for compatibility
app.get('/api/chatbot/history', authenticate, getHistoryHandler);

// ===== PROGRESS ROUTES =====

app.get('/api/progress', authenticate, listProgressHandler);
app.post('/api/progress', authenticate, createProgressHandler);
app.get('/api/progress/:id', authenticate, getProgressHandler);

// ===== EVALUATIONS ROUTES =====

app.get('/api/evaluations', authenticate, listEvaluationsHandler);
app.post('/api/evaluations', authenticate, createEvaluationHandler);
app.get('/api/evaluations/:id', authenticate, getEvaluationHandler);
app.put('/api/evaluations/:id', authenticate, updateEvaluationHandler);
app.delete('/api/evaluations/:id', authenticate, deleteEvaluationHandler);

// ===== FORUM ROUTES =====

app.get('/api/forum/posts', listPostsHandler);
app.post('/api/forum/posts', authenticate, createPostHandler);
app.get('/api/forum/posts/:id', getPostHandler);
app.put('/api/forum/posts/:id', authenticate, updatePostHandler);
app.delete('/api/forum/posts/:id', authenticate, deletePostHandler);
app.post('/api/forum/posts/:id/like', authenticate, likePostHandler);
app.post('/api/forum/posts/:id/approve', authenticate, approvePostHandler);
app.post('/api/forum/posts/:id/reject', authenticate, rejectPostHandler);
app.get('/api/forum/posts/:id/comments', getCommentsHandler);
app.post('/api/forum/posts/:id/comments', authenticate, createCommentHandler);
app.post('/api/forum/comments/:id/like', authenticate, likeCommentHandler);
app.delete('/api/forum/comments/:id', authenticate, deleteCommentHandler);

// ===== DIGITAL LIBRARY ROUTES =====
app.get('/api/library/search', authenticate, searchMaterialsHandler);
app.get('/api/library/sync', authenticate, syncLibraryHandler);
app.post('/api/library/bookmarks', authenticate, bookmarkMaterialHandler);
app.get('/api/library/recommendations', authenticate, getRecommendationsHandler);
app.post('/api/library/materials', authenticate, authorize(UserRole.MANAGEMENT), ...createMaterialHandler);
app.put('/api/library/materials/:id', authenticate, authorize(UserRole.MANAGEMENT), ...updateMaterialHandler);
app.delete('/api/library/materials/:id', authenticate, authorize(UserRole.MANAGEMENT), deleteMaterialHandler);
// Preview PDF handler has its own authentication (supports query param token)
app.get('/api/library/preview/:id', previewPDFHandler);
// Fix PDF IDs endpoint (temporary, for data migration)
app.get('/api/library/fix-pdf-ids', authenticate, authorize(UserRole.MANAGEMENT), fixPDFIdsHandler);

// ===== SESSION REQUESTS ROUTES =====

app.get('/api/session-requests', authenticate, listSessionRequestsHandler);
app.get('/api/session-requests/alternatives', authenticate, getAlternativeSessionsHandler);
app.post('/api/session-requests', authenticate, validateBody(createSessionRequestSchema), createSessionRequestHandler);
app.get('/api/session-requests/:id', authenticate, getSessionRequestHandler);
app.put('/api/session-requests/:id/approve', authenticate, validateBody(approveSessionRequestSchema), approveSessionRequestHandler);
app.put('/api/session-requests/:id/reject', authenticate, validateBody(rejectSessionRequestSchema), rejectSessionRequestHandler);
app.delete('/api/session-requests/:id', authenticate, withdrawSessionRequestHandler);


setupNotificationCron(1);
// ===== MANAGEMENT APPROVAL REQUESTS ROUTES =====

app.get('/api/management/approvals', authenticate, authorize(UserRole.MANAGEMENT), listApprovalRequestsHandler);
app.post('/api/management/approvals', authenticate, validateBody(createApprovalRequestSchema), createApprovalRequestHandler);
app.get('/api/management/approvals/:id', authenticate, authorize(UserRole.MANAGEMENT), getApprovalRequestHandler);
app.put('/api/management/approvals/:id/approve', authenticate, authorize(UserRole.MANAGEMENT), validateBody(approveApprovalRequestSchema), approveApprovalRequestHandler);
app.put('/api/management/approvals/:id/reject', authenticate, authorize(UserRole.MANAGEMENT), validateBody(rejectApprovalRequestSchema), rejectApprovalRequestHandler);
app.put('/api/management/approvals/:id/clarify', authenticate, authorize(UserRole.MANAGEMENT), validateBody(requestClarificationSchema), requestClarificationHandler);
app.post('/api/management/approvals/:id/escalate', authenticate, authorize(UserRole.MANAGEMENT), validateBody(escalateApprovalRequestSchema), escalateApprovalRequestHandler);

// ===== MANAGEMENT PERMISSIONS ROUTES =====

app.get('/api/management/permissions/users', authenticate, authorize(UserRole.MANAGEMENT), listUsersWithPermissionsHandler);
app.get('/api/management/permissions/users/:id', authenticate, authorize(UserRole.MANAGEMENT), getUserPermissionsHandler);
app.put('/api/management/permissions/users/:id', authenticate, authorize(UserRole.MANAGEMENT), validateBody(updateUserPermissionsSchema), updateUserPermissionsHandler);
app.post('/api/management/permissions/users/:id/revoke', authenticate, authorize(UserRole.MANAGEMENT), validateBody(revokeUserPermissionsSchema), revokeUserPermissionsHandler);
app.post('/api/management/permissions/users/:id/temporary', authenticate, authorize(UserRole.MANAGEMENT), validateBody(grantTemporaryPermissionsSchema), grantTemporaryPermissionsHandler);

// ===== MANAGEMENT RESOURCE ALLOCATION ROUTES =====

app.get('/api/management/resources/overview', authenticate, authorize(UserRole.MANAGEMENT), getResourceOverviewHandler);
app.get('/api/management/resources/inefficiencies', authenticate, authorize(UserRole.MANAGEMENT), getInefficienciesHandler);
app.post('/api/management/resources/optimize', authenticate, authorize(UserRole.MANAGEMENT), validateBody(optimizeResourceAllocationSchema), optimizeResourceAllocationHandler);
app.post('/api/management/resources/apply', authenticate, authorize(UserRole.MANAGEMENT), validateBody(applyOptimizationSchema), applyOptimizationHandler);
app.post('/api/management/resources/manual-override', authenticate, authorize(UserRole.MANAGEMENT), validateBody(manualOverrideSchema), manualOverrideHandler);

// ===== MANAGEMENT PROGRESS REPORTS ROUTES =====

app.get('/api/management/reports/progress', authenticate, authorize(UserRole.MANAGEMENT), listProgressReportsHandler);
app.post('/api/management/reports/progress', authenticate, authorize(UserRole.MANAGEMENT), validateBody(createProgressReportSchema), createProgressReportHandler);
app.get('/api/management/reports/progress/:id', authenticate, authorize(UserRole.MANAGEMENT), getProgressReportHandler);
app.get('/api/management/reports/progress/:id/export', authenticate, authorize(UserRole.MANAGEMENT), exportProgressReportHandler);
app.put('/api/management/reports/progress/:id', authenticate, authorize(UserRole.MANAGEMENT), validateBody(updateProgressReportSchema), updateProgressReportHandler);

// ===== MANAGEMENT ANALYTICS ROUTES =====

app.get('/api/management/analytics/performance', authenticate, authorize(UserRole.MANAGEMENT), getPerformanceAnalysisHandler);
app.post('/api/management/analytics/performance', authenticate, authorize(UserRole.MANAGEMENT), validateBody(generatePerformanceAnalysisSchema), generatePerformanceAnalysisHandler);
app.get('/api/management/analytics/performance/compare', authenticate, authorize(UserRole.MANAGEMENT), comparePerformanceHandler);
app.get('/api/management/analytics/performance/kpis', authenticate, authorize(UserRole.MANAGEMENT), getPerformanceKPIsHandler);

// ===== MANAGEMENT TRAINING CREDITS ROUTES =====

app.get('/api/management/credits/eligible', authenticate, authorize(UserRole.MANAGEMENT), getEligibleStudentsHandler);
app.post('/api/management/credits/award', authenticate, authorize(UserRole.MANAGEMENT), validateBody(awardCreditsSchema), awardCreditsHandler);
app.get('/api/management/credits/history', authenticate, authorize(UserRole.MANAGEMENT), getCreditHistoryHandler);
app.put('/api/management/credits/:id/revoke', authenticate, authorize(UserRole.MANAGEMENT), validateBody(revokeCreditsSchema), revokeCreditsHandler);

// ===== MANAGEMENT DOCUMENTS ROUTES =====

app.get('/api/management/documents', authenticate, listDocumentsHandler);
app.post('/api/management/documents', authenticate, validateBody(uploadDocumentSchema), uploadDocumentHandler);
app.get('/api/management/documents/:id', authenticate, getDocumentHandler);
app.put('/api/management/documents/:id', authenticate, validateBody(updateDocumentSchema), updateDocumentHandler);
app.delete('/api/management/documents/:id', authenticate, deleteDocumentHandler);
app.post('/api/management/documents/:id/share', authenticate, validateBody(shareDocumentSchema), shareDocumentHandler);
app.get('/api/management/documents/:id/access', authenticate, getDocumentAccessHandler);
app.put('/api/management/documents/:id/access', authenticate, validateBody(updateDocumentAccessSchema), updateDocumentAccessHandler);

// ===== MANAGEMENT COMMUNITY ROUTES =====

app.get('/api/management/community/forums', authenticate, authorize(UserRole.MANAGEMENT), listForumsHandler);
app.post('/api/management/community/forums', authenticate, authorize(UserRole.MANAGEMENT), validateBody(createCommunityForumSchema), createForumHandler);
app.put('/api/management/community/forums/:id', authenticate, authorize(UserRole.MANAGEMENT), validateBody(updateCommunityForumSchema), updateForumHandler);
app.delete('/api/management/community/forums/:id', authenticate, authorize(UserRole.MANAGEMENT), deleteForumHandler);
app.post('/api/management/community/forums/:id/pin', authenticate, authorize(UserRole.MANAGEMENT), pinForumHandler);
app.post('/api/management/community/forums/:id/lock', authenticate, authorize(UserRole.MANAGEMENT), lockForumHandler);

app.get('/api/management/community/resources', authenticate, listCommunityResourcesHandler);
app.post('/api/management/community/resources', authenticate, validateBody(shareCommunityResourceSchema), shareCommunityResourceHandler);
app.put('/api/management/community/resources/:id/restrict', authenticate, authorize(UserRole.MANAGEMENT), validateBody(restrictCommunityResourceSchema), restrictCommunityResourceHandler);

app.post('/api/management/community/events', authenticate, authorize(UserRole.MANAGEMENT), validateBody(createCommunityEventSchema), createCommunityEventHandler);
app.get('/api/management/community/activities', authenticate, authorize(UserRole.MANAGEMENT), getCommunityActivitiesHandler);

// ===== ERROR HANDLING =====

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use(errorHandler);

// Start server (only in development, Vercel handles this in production)
if (process.env.NODE_ENV !== 'production') {
const PORT = config.api.port;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           🎓 Tutor Support System API Server                ║
║                                                              ║
║  Status: ✅ Running                                          ║
║  Port: ${PORT}                                                  ║
║  Environment: ${config.env}                               ║
║                                                              ║
║  API Base: http://localhost:${PORT}/api                       ║
║  Health Check: http://localhost:${PORT}/health                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
}

export default app;

