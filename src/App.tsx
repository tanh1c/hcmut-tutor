import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import DeviceDetector from './components/DeviceDetector'
import TutorDeviceDetector from './components/TutorDeviceDetector'
import CommonDeviceDetector from './components/CommonDeviceDetector'
import ManagementDeviceDetector from './components/ManagementDeviceDetector'
import StudentCalendarDetector from './components/StudentCalendarDetector'
import TutorCalendarDetector from './components/TutorCalendarDetector'
import StudentSessionsListDetector from './components/StudentSessionsListDetector'
import StudentSessionDetailDetector from './components/StudentSessionDetailDetector'
import StudentEvaluateListDetector from './components/StudentEvaluateListDetector'
import WeatherEffectsDemo from './components/WeatherEffectsDemo'
import TakeQuiz from './pages/student/TakeQuiz'
import TakeAssignment from './pages/student/TakeAssignment'
import PreviewQuiz from './pages/tutor/PreviewQuiz'
import QuizResultsView from './pages/tutor/QuizResultsView'
import AssignmentSubmissionsView from './pages/tutor/AssignmentSubmissionsView'
import AgentRoadmapLab from './pages/common/AgentRoadmapLab'
import AgentToolChatLab from './pages/common/AgentToolChatLab'

function App() {
  return (
    <ThemeProvider>
      <Routes>
        {/* Student Routes */}
        <Route path="/student" element={<DeviceDetector />} />
        <Route path="/student/search" element={<DeviceDetector />} />
        <Route path="/student/book" element={<DeviceDetector />} />
        <Route path="/student/session/:sessionId/quiz/:quizId" element={<TakeQuiz />} />
        <Route path="/student/session/:sessionId/assignment/:assignmentId" element={<TakeAssignment />} />
        <Route path="/student/session/:id" element={<StudentSessionDetailDetector />} />
        <Route path="/student/session" element={<StudentSessionsListDetector />} />
        <Route path="/student/class/:classId/quiz/:quizId" element={<TakeQuiz />} />
        <Route path="/student/class/:classId/assignment/:assignmentId" element={<TakeAssignment />} />
        <Route path="/student/class/:id" element={<StudentSessionDetailDetector />} />
        <Route path="/student/evaluate/:id" element={<DeviceDetector />} />
        <Route path="/student/evaluate" element={<StudentEvaluateListDetector />} />
        <Route path="/student/progress" element={<DeviceDetector />} />
        <Route path="/student/chatbot" element={<DeviceDetector />} />
        <Route path="/student/messages" element={<DeviceDetector />} />
        <Route path="/student/calendar" element={<StudentCalendarDetector />} />
        
        {/* Tutor Routes */}
        <Route path="/tutor" element={<TutorDeviceDetector />} />
        <Route path="/tutor/availability" element={<TutorDeviceDetector />} />
        <Route path="/tutor/sessions" element={<TutorDeviceDetector />} />
        <Route path="/tutor/lms" element={<TutorDeviceDetector />} />
        {/* More specific routes first */}
        <Route path="/tutor/session/:sessionId/quiz/:quizId/results" element={<QuizResultsView />} />
        <Route path="/tutor/class/:classId/quiz/:quizId/results" element={<QuizResultsView />} />
        <Route path="/tutor/session/:sessionId/quiz/:quizId" element={<PreviewQuiz />} />
        <Route path="/tutor/class/:classId/quiz/:quizId" element={<PreviewQuiz />} />
        <Route path="/tutor/session/:sessionId/assignment/:assignmentId/submissions" element={<AssignmentSubmissionsView />} />
        <Route path="/tutor/class/:classId/assignment/:assignmentId/submissions" element={<AssignmentSubmissionsView />} />
        <Route path="/tutor/session/:id" element={<TutorDeviceDetector />} />
        <Route path="/tutor/class/:id" element={<TutorDeviceDetector />} />
        <Route path="/tutor/cancel-reschedule" element={<TutorDeviceDetector />} />
        <Route path="/tutor/track-progress" element={<TutorDeviceDetector />} />
        <Route path="/tutor/messages" element={<TutorDeviceDetector />} />
        <Route path="/tutor/calendar" element={<TutorCalendarDetector />} />
        
        {/* Management Routes */}
        <Route path="/management" element={<ManagementDeviceDetector />} />
        <Route path="/management/approval" element={<ManagementDeviceDetector />} />
        <Route path="/management/reports" element={<ManagementDeviceDetector />} />
        <Route path="/management/awards" element={<ManagementDeviceDetector />} />
        <Route path="/management/resources" element={<ManagementDeviceDetector />} />
        <Route path="/management/users" element={<ManagementDeviceDetector />} />
        
        {/* Common Screens Routes */}
        <Route path="/common" element={<CommonDeviceDetector />} />
        <Route path="/common/login" element={<CommonDeviceDetector />} />
        <Route path="/common/register" element={<CommonDeviceDetector />} />
        <Route path="/common/profile" element={<CommonDeviceDetector />} />
        <Route path="/common/library" element={<CommonDeviceDetector />} />
        <Route path="/common/forum" element={<CommonDeviceDetector />} />
        <Route path="/common/notifications" element={<CommonDeviceDetector />} />
        <Route path="/agent-lab" element={<AgentRoadmapLab />} />
        <Route path="/agent-chat-lab" element={<AgentToolChatLab />} />
        
        {/* Weather Effects Demo */}
        <Route path="/weather-demo" element={<WeatherEffectsDemo />} />

        {/* Default redirect to login */}
        <Route path="/" element={<CommonDeviceDetector />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App
