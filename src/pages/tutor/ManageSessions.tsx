import React, { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button as MuiButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Checkbox,
  FormControlLabel,
  Chip,
  Typography,
  Alert,
  Box,
  CircularProgress,
  Grid,
  Card as MuiCard,
  CardActionArea,
  CardContent,
  Snackbar
} from '@mui/material'
import { 
  Search, 
  VideoCall, 
  Chat, 
  Edit, 
  Schedule,
  Assignment,
  Menu as MenuIcon,
  ArrowBack as ArrowBackIcon,
  BarChart as BarChartIcon,
  SwapHoriz as SwapHorizIcon,
  LocationOn as LocationOnIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday,
  EventAvailable,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material'
import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { enUS } from 'date-fns/locale'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { sessionsAPI, usersAPI, managementAPI, availabilityAPI } from '../../lib/api'
import EquipmentSelector from '../../components/equipment/EquipmentSelector'

const ManageSessions: React.FC = () => {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [studentsMap, setStudentsMap] = useState<Record<string, any>>({})
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editSessionData, setEditSessionData] = useState<any>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [actionSession, setActionSession] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  // Equipment selection for offline sessions
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  
  // Change Session Type Dialog
  const [isChangeTypeDialogOpen, setIsChangeTypeDialogOpen] = useState(false)
  const [changeTypeSession, setChangeTypeSession] = useState<any>(null)
  const [newSessionType, setNewSessionType] = useState<'individual' | 'group'>('group')
  const [changeTypeDescription, setChangeTypeDescription] = useState('')
  const [changeTypeLoading, setChangeTypeLoading] = useState(false)
  
  // Merge Sessions Dialog
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false)
  const [mergeBaseSession, setMergeBaseSession] = useState<any>(null)
  const [selectedMergeSessions, setSelectedMergeSessions] = useState<string[]>([])
  const [mergeDescription, setMergeDescription] = useState('')
  const [mergeLoading, setMergeLoading] = useState(false)
  
  // Change Location/Mode Dialog
  const [isChangeLocationDialogOpen, setIsChangeLocationDialogOpen] = useState(false)
  const [changeLocationSession, setChangeLocationSession] = useState<any>(null)
  const [newIsOnline, setNewIsOnline] = useState(false)
  const [newLocation, setNewLocation] = useState('')
  const [newMeetingLink, setNewMeetingLink] = useState('')
  const [changeLocationDescription, setChangeLocationDescription] = useState('')
  const [changeLocationLoading, setChangeLocationLoading] = useState(false)
  
  // Reschedule (Change Duration) Dialog
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false)
  const [rescheduleSession, setRescheduleSession] = useState<any>(null)
  const [newStartDate, setNewStartDate] = useState('')
  const [newStartTime, setNewStartTime] = useState('')
  const [newDuration, setNewDuration] = useState('')
  const [rescheduleDescription, setRescheduleDescription] = useState('')
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  
  // Available slots for reschedule (similar to student RequestDialog)
  interface AvailableSlot {
    date: string // YYYY-MM-DD
    dateObj: Date
    startTime: string // ISO string
    endTime: string // ISO string
    displayDate: string // Formatted date
    displayTime: string // Formatted time
  }
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [selectedDateForSlot, setSelectedDateForSlot] = useState<string>('')
  const [calendarWeekStart, setCalendarWeekStart] = useState<Date>(new Date())
  const [preferredDateValue, setPreferredDateValue] = useState<Date | null>(null)
  const [preferredTimeValue, setPreferredTimeValue] = useState<Date | null>(null)
  const [rescheduleError, setRescheduleError] = useState('')
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false)

  // Load sessions and student data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get user from localStorage
        const userStr = localStorage.getItem('user')
        if (!userStr) {
          navigate('/login')
          return
        }
        const userData = JSON.parse(userStr)
        setUser(userData)

        // Load sessions for this tutor (increase limit to get all sessions)
        const sessionsResponse = await sessionsAPI.list({ tutorId: userData.id, limit: 1000 })
        
        console.log('Sessions response:', sessionsResponse) // Debug log
        
        // API returns { data: [...], pagination: {...} } structure
        if (sessionsResponse.data && Array.isArray(sessionsResponse.data)) {
          const sessionsData = sessionsResponse.data

          // Load all unique students (support both old studentId and new studentIds array)
          const sessionStudentIds = new Set<string>()
          sessionsData.forEach((s: any) => {
            if (s.studentIds && Array.isArray(s.studentIds)) {
              s.studentIds.forEach((id: string) => sessionStudentIds.add(id))
            } else if (s.studentId) {
              sessionStudentIds.add(s.studentId)
            }
          })
          
          const studentsData: Record<string, any> = {}
          await Promise.all(
            Array.from(sessionStudentIds).map(async (studentId) => {
              try {
                const userResponse = await usersAPI.get(studentId)
                // Check if response has success field or directly has data
                const userData = userResponse.success ? userResponse.data : userResponse
                if (userData) {
                  studentsData[studentId] = userData
                }
              } catch (err) {
                console.error(`Error loading student ${studentId}:`, err)
              }
            })
          )

          setStudentsMap(studentsData)
          setSessions(sessionsData)
        }
      } catch (err: any) {
        console.error('Error loading sessions:', err)
        setError(err.message || 'Failed to load sessions')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [navigate])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  // Confirm session handler
  const handleConfirmSession = async () => {
    if (!actionSession) return
    
    // Validate equipment selection for offline sessions
    if (!actionSession.isOnline && selectedEquipment.length === 0) {
      alert('Please select at least one required equipment for the offline session')
      return
    }
    
    try {
      setActionLoading(true)
      
      // For offline sessions, include equipment requirements in metadata
      const updateData: any = { status: 'confirmed' }
      if (!actionSession.isOnline && selectedEquipment.length > 0) {
        updateData.equipmentRequirements = selectedEquipment
      }
      
      const response = await sessionsAPI.update(actionSession.id, updateData)
      
      if (response.success) {
        // Update local state
        setSessions(prev => prev.map(s => 
          s.id === actionSession.id ? { ...s, status: 'confirmed' } : s
        ))
        setIsConfirmDialogOpen(false)
        setActionSession(null)
        setSelectedEquipment([]) // Reset equipment selection
        alert('Session confirmed successfully!')
      } else {
        alert('Failed to confirm session: ' + response.error)
      }
    } catch (error: any) {
      console.error('Error confirming session:', error)
      alert('Failed to confirm session')
    } finally {
      setActionLoading(false)
    }
  }

  // Reject session handler
  const handleRejectSession = async () => {
    if (!actionSession || !rejectReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }
    
    try {
      setActionLoading(true)
      const response = await sessionsAPI.cancel(actionSession.id, rejectReason)
      
      if (response.success) {
        // Update local state
        setSessions(prev => prev.map(s => 
          s.id === actionSession.id ? { ...s, status: 'cancelled' } : s
        ))
        setIsRejectDialogOpen(false)
        setActionSession(null)
        setRejectReason('')
        alert('Session rejected successfully!')
      } else {
        alert('Failed to reject session: ' + response.error)
      }
    } catch (error: any) {
      console.error('Error rejecting session:', error)
      alert('Failed to reject session')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Change Session Type (Split)
  const handleOpenChangeTypeDialog = (session: any) => {
    setChangeTypeSession(session)
    // Determine current type: individual (1 student) or group (>1 student)
    const isCurrentlyGroup = session.studentIds && session.studentIds.length > 1
    // Only allow split (group -> individual) for now
    setNewSessionType('individual')
    setChangeTypeDescription('')
    setIsChangeTypeDialogOpen(true)
  }

  // Handle Merge Sessions
  const handleOpenMergeDialog = (session: any) => {
    setMergeBaseSession(session)
    setSelectedMergeSessions([session.id]) // Include base session
    setMergeDescription('')
    setIsMergeDialogOpen(true)
  }

  // Get sessions that can be merged with base session
  const getMergeableSessions = () => {
    if (!mergeBaseSession) return []
    
    return sessions.filter(s => {
      // Must be individual session (1 student)
      if (!s.studentIds || s.studentIds.length !== 1) return false
      
      // Must be confirmed or pending
      if (s.status !== 'confirmed' && s.status !== 'pending') return false
      
      // Must have same tutor
      if (s.tutorId !== mergeBaseSession.tutorId) return false
      
      // Must have same subject
      if (s.subject !== mergeBaseSession.subject) return false
      
      // Must have same startTime and endTime
      if (s.startTime !== mergeBaseSession.startTime || s.endTime !== mergeBaseSession.endTime) return false
      
      // Must not be the same session
      if (s.id === mergeBaseSession.id) return false
      
      return true
    })
  }

  const handleToggleMergeSession = (sessionId: string) => {
    setSelectedMergeSessions(prev => {
      if (prev.includes(sessionId)) {
        // Don't allow deselecting base session if it's the only one
        if (prev.length === 1 && sessionId === mergeBaseSession?.id) {
          return prev
        }
        return prev.filter(id => id !== sessionId)
      } else {
        return [...prev, sessionId]
      }
    })
  }

  const handleSubmitMergeRequest = async () => {
    if (!mergeBaseSession || selectedMergeSessions.length < 2) {
      alert('Please select at least 2 sessions to merge')
      return
    }

    if (!mergeDescription.trim() || mergeDescription.length < 10) {
      alert('Please provide a description (at least 10 characters)')
      return
    }

    try {
      setMergeLoading(true)

      const response = await managementAPI.approvals.create({
        type: 'session_change',
        targetId: mergeBaseSession.id, // Use first session as target
        title: `Merge ${selectedMergeSessions.length} Individual Sessions → Group Session`,
        description: mergeDescription,
        priority: 'medium',
        changeType: 'change_type',
        changeData: {
          newType: 'group',
          mergeSessionIds: selectedMergeSessions
        }
      })

      if (response.success) {
        alert('Merge request submitted successfully! Waiting for management approval.')
        setIsMergeDialogOpen(false)
        setMergeBaseSession(null)
        setSelectedMergeSessions([])
        setMergeDescription('')
      } else {
        alert('Failed to submit request: ' + (response.error || 'Unknown error'))
      }
    } catch (error: any) {
      console.error('Error submitting merge request:', error)
      alert('Failed to submit request: ' + (error.message || 'Unknown error'))
    } finally {
      setMergeLoading(false)
    }
  }

  const handleSubmitChangeTypeRequest = async () => {
    if (!changeTypeSession || !changeTypeDescription.trim() || changeTypeDescription.length < 10) {
      alert('Please provide a description (at least 10 characters)')
      return
    }

    const isCurrentlyGroup = changeTypeSession.studentIds && changeTypeSession.studentIds.length > 1
    
    // Only allow split (group -> individual)
    if (!isCurrentlyGroup) {
      alert('Converting individual to group requires merging multiple sessions. Please contact management for assistance.')
      return
    }

    try {
      setChangeTypeLoading(true)
      
      // For split: group -> individual
      const changeData: any = {
        newType: 'individual',
        splitInto: changeTypeSession.studentIds.length
      }

      const response = await managementAPI.approvals.create({
        type: 'session_change',
        targetId: changeTypeSession.id,
        title: `Change Session Type: Group → Individual (Split)`,
        description: changeTypeDescription,
        priority: 'medium',
        changeType: 'change_type',
        changeData
      })

      if (response.success) {
        alert('Request submitted successfully! Waiting for management approval.')
        setIsChangeTypeDialogOpen(false)
        setChangeTypeSession(null)
        setChangeTypeDescription('')
      } else {
        alert('Failed to submit request: ' + (response.error || 'Unknown error'))
      }
    } catch (error: any) {
      console.error('Error submitting change type request:', error)
      alert('Failed to submit request: ' + (error.message || 'Unknown error'))
    } finally {
      setChangeTypeLoading(false)
    }
  }

  // Handle Change Location/Mode
  const handleOpenChangeLocationDialog = (session: any) => {
    setChangeLocationSession(session)
    setNewIsOnline(!session.isOnline)
    setNewLocation(session.location || '')
    setNewMeetingLink(session.meetingLink || '')
    setChangeLocationDescription('')
    setIsChangeLocationDialogOpen(true)
  }

  // Handle Reschedule (Change Duration)
  const handleOpenRescheduleDialog = (session: any) => {
    setRescheduleSession(session)
    
    // Parse current startTime to date and time
    const startDate = new Date(session.startTime)
    const year = startDate.getFullYear()
    const month = String(startDate.getMonth() + 1).padStart(2, '0')
    const day = String(startDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    const hours = String(startDate.getHours()).padStart(2, '0')
    const minutes = String(startDate.getMinutes()).padStart(2, '0')
    const timeStr = `${hours}:${minutes}`
    
    setNewStartDate(dateStr)
    setNewStartTime(timeStr)
    setNewDuration(session.duration.toString())
    setRescheduleDescription('')
    setAvailableSlots([])
    setSelectedSlot(null)
    setSelectedDateForSlot('')
    setCalendarWeekStart(new Date())
    setPreferredDateValue(null)
    setPreferredTimeValue(null)
    setRescheduleError('')
    setShowSuccessSnackbar(false)
    setIsRescheduleDialogOpen(true)
  }

  // Load available slots when reschedule dialog opens
  useEffect(() => {
    const loadAvailableSlots = async () => {
      if (!isRescheduleDialogOpen || !rescheduleSession || !user?.id) {
        setAvailableSlots([])
        return
      }

      try {
        setLoadingSlots(true)
        
        // Get availability excluding class schedules
        const availabilityResponse = await availabilityAPI.get(user.id, true)
        
        if (!availabilityResponse || !availabilityResponse.data || !availabilityResponse.data.timeSlots) {
          setAvailableSlots([])
          return
        }

        // Get tutor's existing sessions to exclude them
        const sessionsResponse = await sessionsAPI.list({
          tutorId: user.id,
          status: 'confirmed,pending',
          limit: 200
        })

        const existingSessions = sessionsResponse?.data?.data || sessionsResponse?.data || []
        
        // Calculate session duration
        const sessionDuration = new Date(rescheduleSession.endTime).getTime() - new Date(rescheduleSession.startTime).getTime()
        const durationMinutes = Math.floor(sessionDuration / 60000)

        // Generate available slots for next 60 days
        const slots: AvailableSlot[] = []
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        for (let i = 0; i < 60; i++) {
          const date = new Date(today)
          date.setDate(date.getDate() + i)
          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
          
          // Find availability for this day
          const dayAvailability = availabilityResponse.data.timeSlots.filter(
            (slot: any) => slot.day === dayName
          )

          if (dayAvailability.length === 0) continue

          dayAvailability.forEach((avail: any) => {
            const [startHour, startMin] = avail.startTime.split(':').map(Number)
            const [endHour, endMin] = avail.endTime.split(':').map(Number)
            
            const startMinutes = startHour * 60 + startMin
            const endMinutes = endHour * 60 + endMin

            // Buffer time between sessions (30 minutes)
            const SESSION_BUFFER_MINUTES = 30

            // Find the latest session end time (with buffer) on this date to optimize slot generation
            let latestSessionEndWithBuffer = startMinutes // Start from availability start
            
            existingSessions.forEach((existingSession: any) => {
              if (existingSession.id === rescheduleSession.id) return // Exclude current session
              if (existingSession.classId) return // Skip class sessions
              
              const existingStart = new Date(existingSession.startTime)
              const existingEnd = new Date(existingSession.endTime)
              
              // Compare dates in local timezone
              const slotYear = date.getFullYear()
              const slotMonth = date.getMonth()
              const slotDay = date.getDate()
              const existingYear = existingStart.getFullYear()
              const existingMonth = existingStart.getMonth()
              const existingDay = existingStart.getDate()
              
              // Check if same date (in local timezone)
              if (slotYear === existingYear && slotMonth === existingMonth && slotDay === existingDay) {
                const existingEndWithBuffer = new Date(existingEnd.getTime() + SESSION_BUFFER_MINUTES * 60 * 1000)
                const existingEndWithBufferMinutes = existingEndWithBuffer.getHours() * 60 + existingEndWithBuffer.getMinutes()
                // Update latest session end if this session ends later
                if (existingEndWithBufferMinutes > latestSessionEndWithBuffer) {
                  latestSessionEndWithBuffer = existingEndWithBufferMinutes
                }
              }
            })
            
            // Start generating slots from the later of: availability start or latest session end (with buffer)
            const effectiveStartMinutes = Math.max(startMinutes, latestSessionEndWithBuffer)

            // Generate slots based on session duration
            for (let minutes = effectiveStartMinutes; minutes + durationMinutes <= endMinutes; minutes += 30) {
              const slotHour = Math.floor(minutes / 60)
              const slotMin = minutes % 60
              
              const slotStart = new Date(date)
              slotStart.setHours(slotHour, slotMin, 0, 0)
              
              const slotEnd = new Date(slotStart)
              slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes)

              // Double-check for conflicts (in case of edge cases)
              const hasConflict = existingSessions.some((existingSession: any) => {
                if (existingSession.id === rescheduleSession.id) return false // Exclude current session
                if (existingSession.classId) return false // Don't check class sessions
                
                // Parse existing session times (UTC strings) - JavaScript Date automatically converts to local time
                const existingStart = new Date(existingSession.startTime)
                const existingEnd = new Date(existingSession.endTime)

                // Compare dates in local timezone (compare year, month, day)
                const slotYear = slotStart.getFullYear()
                const slotMonth = slotStart.getMonth()
                const slotDay = slotStart.getDate()
                const existingYear = existingStart.getFullYear()
                const existingMonth = existingStart.getMonth()
                const existingDay = existingStart.getDate()

                // Check if same date (in local timezone)
                if (slotYear !== existingYear || slotMonth !== existingMonth || slotDay !== existingDay) {
                  return false
                }

                // Apply buffer time: slot must start at least 30 minutes after existing session ends
                // and must end at least 30 minutes before existing session starts
                const existingEndWithBuffer = new Date(existingEnd.getTime() + SESSION_BUFFER_MINUTES * 60 * 1000)
                const existingStartWithBuffer = new Date(existingStart.getTime() - SESSION_BUFFER_MINUTES * 60 * 1000)

                // Check if slot overlaps with existing session (including buffer)
                // Slot overlaps if it starts before session ends (with buffer) AND ends after session starts (with buffer)
                // Note: if slot starts exactly when session ends (with buffer), it doesn't overlap (>= is allowed)
                const overlaps = slotStart.getTime() < existingEndWithBuffer.getTime() && slotEnd.getTime() > existingStartWithBuffer.getTime()

                return overlaps
              })

              if (!hasConflict && slotStart >= new Date()) {
                // Format for display
                const displayDate = slotStart.toLocaleDateString('en-US', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })
                
                const startTimeStr = slotStart.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })
                const endTimeStr = slotEnd.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })

                slots.push({
                  date: date.toISOString().split('T')[0],
                  dateObj: date,
                  startTime: slotStart.toISOString(),
                  endTime: slotEnd.toISOString(),
                  displayDate: displayDate.charAt(0).toUpperCase() + displayDate.slice(1),
                  displayTime: `${startTimeStr} - ${endTimeStr}`
                })
              }
            }
          })
        }

        // Sort by date and time
        slots.sort((a, b) => a.startTime.localeCompare(b.startTime))
        setAvailableSlots(slots)
      } catch (err) {
        console.error('Failed to load available slots:', err)
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    loadAvailableSlots()
  }, [isRescheduleDialogOpen, rescheduleSession, user?.id])

  // Calendar helper functions
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday is day 1
    return new Date(d.setDate(diff))
  }

  const getWeekDates = (startDate: Date) => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      return date.toISOString().split('T')[0]
    })
  }

  const handlePreviousWeek = () => {
    const newWeek = new Date(calendarWeekStart)
    newWeek.setDate(newWeek.getDate() - 7)
    setCalendarWeekStart(getWeekStart(newWeek))
  }

  const handleNextWeek = () => {
    const newWeek = new Date(calendarWeekStart)
    newWeek.setDate(newWeek.getDate() + 7)
    setCalendarWeekStart(getWeekStart(newWeek))
  }

  const handleTodayWeek = () => {
    setCalendarWeekStart(getWeekStart(new Date()))
  }

  const handleSelectDate = (date: string) => {
    setSelectedDateForSlot(date)
    setSelectedSlot(null)
    setRescheduleError('')
  }

  const handleSelectTimeSlot = (slot: AvailableSlot) => {
    setSelectedSlot(slot)
    setNewStartDate(slot.date)
    // Extract time from ISO string (HH:MM format)
    const slotDate = new Date(slot.startTime)
    const hours = slotDate.getHours().toString().padStart(2, '0')
    const minutes = slotDate.getMinutes().toString().padStart(2, '0')
    setNewStartTime(`${hours}:${minutes}`)
    // Also update picker values
    setPreferredDateValue(slotDate)
    setPreferredTimeValue(slotDate)
    setRescheduleError('')
  }

  const handleSubmitRescheduleRequest = async () => {
    setRescheduleError('')

    // Validate
    if (!rescheduleDescription.trim() || rescheduleDescription.length < 10) {
      setRescheduleError('Please enter a description (at least 10 characters)')
      return
    }

    if (!newDuration || parseInt(newDuration) <= 0) {
      setRescheduleError('Please enter a valid duration (in minutes)')
      return
    }

    // Determine new start time - use selected slot if available, otherwise use manual input
    let newStartTimeDate: Date
    if (selectedSlot) {
      newStartTimeDate = new Date(selectedSlot.startTime)
    } else if (preferredDateValue && preferredTimeValue) {
      // Use picker values (preferred)
      newStartTimeDate = new Date(preferredDateValue)
      newStartTimeDate.setHours(preferredTimeValue.getHours(), preferredTimeValue.getMinutes(), 0, 0)
    } else if (newStartDate && newStartTime) {
      // Fallback to manual input
      const [hours, minutes] = newStartTime.split(':').map(Number)
      newStartTimeDate = new Date(newStartDate)
      newStartTimeDate.setHours(hours, minutes, 0, 0)
    } else {
      setRescheduleError('Please select a new date and time for the session')
      return
    }

    const durationMinutes = parseInt(newDuration)
    let newEndTimeDate: Date
    if (selectedSlot) {
      newEndTimeDate = new Date(selectedSlot.endTime)
    } else {
      newEndTimeDate = new Date(newStartTimeDate.getTime() + durationMinutes * 60 * 1000)
    }

    // Compare with current time (add 1 minute buffer)
    const now = new Date()
    const oneMinuteFromNow = new Date(now.getTime() + 60000)
    
    if (newStartTimeDate < oneMinuteFromNow) {
      setRescheduleError('The new time must be in the future (at least 1 minute from now)')
      return
    }

    try {
      setRescheduleLoading(true)

      const changeData: any = {
        newStartTime: newStartTimeDate.toISOString(),
        newEndTime: newEndTimeDate.toISOString(),
        newDuration: durationMinutes
      }

      const response = await managementAPI.approvals.create({
        type: 'session_change',
        targetId: rescheduleSession.id,
        title: `Reschedule Session: ${formatDate(rescheduleSession.startTime)} → ${formatDate(newStartTimeDate.toISOString())}`,
        description: rescheduleDescription,
        priority: 'medium',
        changeType: 'change_duration',
        changeData
      })

      if (response.success) {
        setShowSuccessSnackbar(true)
        // Close dialog after snackbar
        setTimeout(() => {
          setIsRescheduleDialogOpen(false)
          setRescheduleSession(null)
          setNewStartDate('')
          setNewStartTime('')
          setNewDuration('')
          setRescheduleDescription('')
          setAvailableSlots([])
          setSelectedSlot(null)
          setSelectedDateForSlot('')
          setPreferredDateValue(null)
          setPreferredTimeValue(null)
          setRescheduleError('')
        }, 2000)
      } else {
        setRescheduleError(response.error || 'An error occurred while creating the request')
      }
    } catch (error: any) {
      console.error('Error submitting reschedule request:', error)
      setRescheduleError(error.message || 'An error occurred while creating the request')
    } finally {
      setRescheduleLoading(false)
    }
  }

  const handleSubmitChangeLocationRequest = async () => {
    if (!changeLocationSession || !changeLocationDescription.trim() || changeLocationDescription.length < 10) {
      alert('Please provide a description (at least 10 characters)')
      return
    }

    if (newIsOnline && !newMeetingLink.trim()) {
      alert('Please provide a meeting link for online sessions')
      return
    }

    if (!newIsOnline && !newLocation.trim()) {
      alert('Please provide a location for offline sessions')
      return
    }

    try {
      setChangeLocationLoading(true)

      const changeData: any = {
        newIsOnline: newIsOnline
      }

      if (newIsOnline) {
        changeData.newMeetingLink = newMeetingLink
      } else {
        changeData.newLocation = newLocation
      }

      const response = await managementAPI.approvals.create({
        type: 'session_change',
        targetId: changeLocationSession.id,
        title: `Change Session Mode: ${changeLocationSession.isOnline ? 'Online' : 'Offline'} → ${newIsOnline ? 'Online' : 'Offline'}`,
        description: changeLocationDescription,
        priority: 'medium',
        changeType: 'change_location',
        changeData
      })

      if (response.success) {
        alert('Request submitted successfully! Waiting for management approval.')
        setIsChangeLocationDialogOpen(false)
        setChangeLocationSession(null)
        setChangeLocationDescription('')
        setNewLocation('')
        setNewMeetingLink('')
      } else {
        alert('Failed to submit request: ' + (response.error || 'Unknown error'))
      }
    } catch (error: any) {
      console.error('Error submitting change location request:', error)
      alert('Failed to submit request: ' + (error.message || 'Unknown error'))
    } finally {
      setChangeLocationLoading(false)
    }
  }

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Helper function to generate avatar color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
      '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
      '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
      '#ff5722', '#795548', '#607d8b'
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  // Format date and time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus
    // Support both old studentId (string) and new studentIds (array)
    const studentId = session.studentIds && session.studentIds.length > 0 ? session.studentIds[0] : session.studentId
    const student = studentId ? studentsMap[studentId] : null
    const studentName = student?.name || 'Unknown Student'
    const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.subject.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })


  const handleEditSession = (session: any) => {
    setSelectedSession(session)
    
    // Only set status, topic, and notes (no date/time/duration)
    setEditSessionData({
      status: session.status,
      topic: session.topic || '',
      notes: session.notes || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedSession || !editSessionData) return

    try {
      setEditLoading(true)

      // Only update status, topic, and notes (no date/time/duration to avoid conflicts)
      const updateData: any = {
        status: editSessionData.status,
        topic: editSessionData.topic || undefined,
        notes: editSessionData.notes || undefined
      }

      const response = await sessionsAPI.update(selectedSession.id, updateData)

      if (response.success) {
        // Update local state
        setSessions(prev => prev.map(s => 
          s.id === selectedSession.id ? { ...s, ...updateData } : s
        ))
    setIsEditDialogOpen(false)
        setSelectedSession(null)
        setEditSessionData(null)
        alert('Session updated successfully!')
      } else {
        const errorMessage = response.error || response.message || 'Unknown error'
        alert('Failed to update session: ' + errorMessage)
      }
    } catch (error: any) {
      console.error('Error updating session:', error)
      alert('Failed to update session: ' + (error.message || 'Unknown error'))
    } finally {
      setEditLoading(false)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Loading sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar - Sticky */}
        <div className={`w-full lg:w-60 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-r ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} lg:block`}>
          <div className="p-6">
            {/* Logo */}
            <div 
              className="flex items-center mb-8 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/tutor')}
            >
              <div className="w-10 h-10 flex items-center justify-center mr-3">
                <img src="/HCMCUT.png" alt="HCMUT Logo" className="w-10 h-10" />
              </div>
              <span className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                HCMUT
              </span>
            </div>

            {/* Session Stats */}
            <div className="mb-8">
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                SESSION STATS
              </h3>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Total Sessions:</span>
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {sessions.length}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Confirmed:</span>
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {sessions.filter(s => s.status === 'confirmed').length}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Completed:</span>
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {sessions.filter(s => s.status === 'completed').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                QUICK ACTIONS
              </h3>
              <div className="space-y-2">
                <button 
                  onClick={() => navigate('/tutor')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors`}
                >
                  <ArrowBackIcon className="mr-3 w-4 h-4" />
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 lg:p-6">
          {/* Mobile Menu Button */}
          <div className="lg:hidden mb-4">
            <button
              onClick={handleDrawerToggle}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Manage Sessions
                </h1>
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  View and manage all your teaching sessions
                </p>
              </div>
              <div className="flex space-x-2">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Assignment className="w-4 h-4 mr-2" />
                  New Session
                </Button>
              </div>
            </div>
          </div>

      {/* Filters and Search */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Search and Filters */}
            <div className="lg:col-span-2">
              <Card 
                className={`border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6`}
                style={{
                  borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  boxShadow: 'none !important'
                }}
              >
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Search & Filters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full px-4 py-3 pl-10 rounded-lg border ${
                          theme === 'dark' 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <Search className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                      className={`w-full px-3 py-3 border rounded-lg ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="all">All Sessions</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quick Stats */}
            <div>
              <Card 
                className={`border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6`}
                style={{
                  borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  boxShadow: 'none !important'
                }}
              >
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>This Week:</span>
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {sessions.filter(s => s.status === 'confirmed').length} sessions
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Duration:</span>
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {sessions.length > 0 ? `${Math.round(sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60)}h` : '0h'}
                    </span>
                  </div>
                </div>
      </Card>
            </div>
          </div>

      {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Sessions List */}
          {filteredSessions.length === 0 ? (
            <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              <Assignment className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No sessions found</h3>
              <p>You don't have any sessions matching the current filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map((session) => {
          // Support both old studentId (string) and new studentIds (array)
          const studentId = session.studentIds && session.studentIds.length > 0 ? session.studentIds[0] : session.studentId
          const student = studentId ? studentsMap[studentId] : null
          const studentName = student?.name || 'Unknown Student'
          
          return (
            <Card
                key={session.id} 
                className={`border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-hidden`}
                style={{
                  borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  boxShadow: 'none !important'
                }}
              >
                <div className="p-6">
                  {/* Session Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: getAvatarColor(studentName),
                          fontSize: '1rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {getInitials(studentName)}
                      </Avatar>
                      <div className="ml-3">
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {studentName}
                        </h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {session.subject}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      session.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800' 
                        : session.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : session.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {session.status}
                    </span>
                  </div>

                  {/* Session Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center">
                      <Schedule className="w-4 h-4 text-gray-400 mr-2" />
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatDate(session.startTime)} at {formatTime(session.startTime)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Assignment className="w-4 h-4 text-gray-400 mr-2" />
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {session.topic || 'No topic'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        Duration: {formatDuration(session.duration)}
                      </span>
                    </div>
                    {session.isOnline ? (
                      <div className="flex items-center">
                        <VideoCall className="w-4 h-4 text-blue-400 mr-2" />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          Online session
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <LocationOnIcon className="w-4 h-4 text-green-400 mr-2" />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {session.location ? session.location : 'Offline session'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Session Notes */}
                  {session.notes && (
                    <div className="mb-4">
                      <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Notes:
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {session.notes}
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  {session.description && (
                    <div className="mb-4">
                      <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Description:
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {session.description}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {session.status === 'pending' ? (
                    // Pending session: Show Confirm/Reject buttons
                    <div className="flex space-x-2">
                      <Button 
                        size="small" 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          setActionSession(session)
                          setIsConfirmDialogOpen(true)
                        }}
                      >
                        ✓ Confirm
                      </Button>
                      <Button 
                        size="small" 
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                          setActionSession(session)
                          setIsRejectDialogOpen(true)
                        }}
                      >
                        ✗ Reject
                      </Button>
                    </div>
                  ) : (
                    // Confirmed/other status: Show Join/Chat buttons
                    <div className="space-y-2">
                      {/* Primary Actions Row */}
                      <div className="grid grid-cols-3 gap-2">
                      <Button 
                        size="small" 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          style={{
                            minHeight: '32px',
                            fontSize: '0.75rem',
                            textTransform: 'none',
                            fontWeight: '500'
                          }}
                      >
                          <VideoCall className="w-3.5 h-3.5 mr-1" />
                      Join
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      style={{
                        backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
                        color: theme === 'dark' ? '#ffffff' : '#000000',
                        borderColor: theme === 'dark' ? '#000000' : '#d1d5db',
                        textTransform: 'none',
                            fontWeight: '500',
                            fontSize: '0.75rem',
                            minHeight: '32px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#f3f4f6'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#000000' : '#ffffff'
                      }}
                    >
                          <Chat className="w-3.5 h-3.5 mr-1" />
                    Chat
                  </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => handleEditSession(session)}
                        style={{
                          backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
                          color: theme === 'dark' ? '#ffffff' : '#000000',
                          borderColor: theme === 'dark' ? '#000000' : '#d1d5db',
                          textTransform: 'none',
                            fontWeight: '500',
                            fontSize: '0.75rem',
                            minHeight: '32px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#f3f4f6'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = theme === 'dark' ? '#000000' : '#ffffff'
                        }}
                      >
                          <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                      
                      {/* Request Actions Row */}
                      {session.status === 'confirmed' && (
                        <div className="grid grid-cols-3 gap-2">
                          {/* Only show Change Type button for group sessions (to split) */}
                          {session.studentIds && session.studentIds.length > 1 ? (
                            <Button 
                              size="small" 
                              variant="outlined"
                              onClick={() => handleOpenChangeTypeDialog(session)}
                              style={{
                                backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
                                color: theme === 'dark' ? '#ffffff' : '#000000',
                                borderColor: theme === 'dark' ? '#000000' : '#d1d5db',
                                textTransform: 'none',
                                fontWeight: '500',
                                fontSize: '0.75rem',
                                minHeight: '32px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#f3f4f6'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = theme === 'dark' ? '#000000' : '#ffffff'
                              }}
                            >
                              <SwapHorizIcon className="w-3.5 h-3.5 mr-1" />
                              Split
                            </Button>
                          ) : (
                            <Button 
                              size="small" 
                              variant="outlined"
                              onClick={() => handleOpenMergeDialog(session)}
                              style={{
                                backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
                                color: theme === 'dark' ? '#ffffff' : '#000000',
                                borderColor: theme === 'dark' ? '#000000' : '#d1d5db',
                                textTransform: 'none',
                                fontWeight: '500',
                                fontSize: '0.75rem',
                                minHeight: '32px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#f3f4f6'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = theme === 'dark' ? '#000000' : '#ffffff'
                              }}
                            >
                              <SwapHorizIcon className="w-3.5 h-3.5 mr-1" />
                              Merge
                            </Button>
                          )}
                          <Button 
                            size="small" 
                            variant="outlined"
                            onClick={() => handleOpenChangeLocationDialog(session)}
                            style={{
                              backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
                              color: theme === 'dark' ? '#ffffff' : '#000000',
                              borderColor: theme === 'dark' ? '#000000' : '#d1d5db',
                              textTransform: 'none',
                              fontWeight: '500',
                              fontSize: '0.75rem',
                              minHeight: '32px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#f3f4f6'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#000000' : '#ffffff'
                            }}
                          >
                            <LocationOnIcon className="w-3.5 h-3.5 mr-1" />
                            Mode
                          </Button>
                          <Button 
                            size="small" 
                            variant="outlined"
                            onClick={() => handleOpenRescheduleDialog(session)}
                            style={{
                              backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
                              color: theme === 'dark' ? '#ffffff' : '#000000',
                              borderColor: theme === 'dark' ? '#000000' : '#d1d5db',
                              textTransform: 'none',
                              fontWeight: '500',
                              fontSize: '0.75rem',
                              minHeight: '32px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#f3f4f6'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#000000' : '#ffffff'
                            }}
                          >
                            <AccessTimeIcon className="w-3.5 h-3.5 mr-1" />
                            Schedule
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
          </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleDrawerToggle}></div>
          <div className={`fixed left-0 top-0 h-full w-80 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
            <div className="p-6">
              {/* Mobile Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center mr-3">
                    <img src="/HCMCUT.png" alt="HCMUT Logo" className="w-8 h-8" />
                  </div>
                  <span className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    HCMUT
                  </span>
                </div>
                <button
                  onClick={handleDrawerToggle}
                  className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <MenuIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Mobile Session Stats */}
              <div className="mb-8">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  SESSION STATS
                </h3>
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Total Sessions:</span>
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {sessions.length}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Confirmed:</span>
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {sessions.filter(s => s.status === 'confirmed').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Quick Actions */}
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    navigate('/tutor/availability')
                    setMobileOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Schedule className="mr-3 w-4 h-4" />
                  Set Availability
                </button>
                <button 
                  onClick={() => {
                    navigate('/tutor/track-progress')
                    setMobileOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <BarChartIcon className="mr-3 w-4 h-4" />
                  Track Progress
                </button>
                <button 
                  onClick={() => {
                    navigate('/tutor')
                    setMobileOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <ArrowBackIcon className="mr-3 w-4 h-4" />
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onClose={() => setIsEditDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            color: theme === 'dark' ? '#ffffff' : '#000000'
          }
        }}
      >
        <DialogTitle style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
          Edit Session
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-4">
            <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Note:</strong> To change the time or duration of the session, please use the "Schedule" (Reschedule) function to avoid schedule conflicts.
              </p>
              </div>
            
              <div>
              <FormControl fullWidth>
                <InputLabel sx={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>Status</InputLabel>
                <Select
                  value={editSessionData?.status || ''}
                  onChange={(e) => setEditSessionData({ ...editSessionData, status: e.target.value })}
                  label="Status"
                  sx={{
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme === 'dark' ? '#6b7280' : '#d1d5db'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme === 'dark' ? '#9ca3af' : '#9ca3af'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6'
                    }
                  }}
                >
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              </div>
            
            <div>
              <TextField
                fullWidth
                label="Topic"
                value={editSessionData?.topic || ''}
                onChange={(e) => setEditSessionData({ ...editSessionData, topic: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
                    '& fieldset': {
                      borderColor: theme === 'dark' ? '#6b7280' : '#d1d5db'
                    },
                    '&:hover fieldset': {
                      borderColor: theme === 'dark' ? '#9ca3af' : '#9ca3af'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                  }
                }}
              />
            </div>
            
            <div>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={editSessionData?.notes || ''}
                onChange={(e) => setEditSessionData({ ...editSessionData, notes: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
                    '& fieldset': {
                      borderColor: theme === 'dark' ? '#6b7280' : '#d1d5db'
                    },
                    '&:hover fieldset': {
                      borderColor: theme === 'dark' ? '#9ca3af' : '#9ca3af'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                  }
                }}
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <MuiButton 
            onClick={() => {
              setIsEditDialogOpen(false)
              setSelectedSession(null)
              setEditSessionData(null)
            }}
            disabled={editLoading}
            style={{
              backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
              color: theme === 'dark' ? '#ffffff' : '#000000',
              borderColor: theme === 'dark' ? '#6b7280' : '#d1d5db'
            }}
          >
            Cancel
          </MuiButton>
          <MuiButton 
            onClick={handleSaveEdit} 
            disabled={editLoading}
            variant="outlined"
            style={{
              backgroundColor: theme === 'dark' ? '#000000' : '#3b82f6',
              color: theme === 'dark' ? '#ffffff' : '#ffffff',
              borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6',
              textTransform: 'none',
              fontWeight: '500',
              opacity: editLoading ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!editLoading) {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1e40af' : '#2563eb'
              }
            }}
            onMouseLeave={(e) => {
              if (!editLoading) {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#000000' : '#3b82f6'
              }
            }}
          >
            {editLoading ? 'Saving...' : 'Save Changes'}
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* Confirm Session Dialog */}
      <Dialog 
        open={isConfirmDialogOpen} 
        onClose={() => !actionLoading && setIsConfirmDialogOpen(false)}
        PaperProps={{
          style: {
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            color: theme === 'dark' ? '#ffffff' : '#000000'
          }
        }}
      >
        <DialogTitle style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
          Confirm Session
        </DialogTitle>
        <DialogContent>
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
            Are you sure you want to confirm this session with <strong>{actionSession && (actionSession.studentIds && actionSession.studentIds.length > 0 ? studentsMap[actionSession.studentIds[0]]?.name : studentsMap[actionSession.studentId]?.name)}</strong>?
          </p>
          {actionSession && (
            <div className="mt-4 space-y-2">
              <p className="text-sm"><strong>Subject:</strong> {actionSession.subject}</p>
              <p className="text-sm"><strong>Date:</strong> {formatDate(actionSession.startTime)}</p>
              <p className="text-sm"><strong>Time:</strong> {formatTime(actionSession.startTime)}</p>
              <p className="text-sm"><strong>Duration:</strong> {formatDuration(actionSession.duration)}</p>
              <div className="flex items-center mt-2">
                {actionSession.isOnline ? (
                  <>
                    <VideoCall className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                    <p className="text-sm"><strong>Mode:</strong> Online Session</p>
                  </>
                ) : (
                  <>
                    <LocationOnIcon className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                    <p className="text-sm"><strong>Mode:</strong> Offline Session</p>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Equipment Selection for Offline Sessions */}
          {actionSession && !actionSession.isOnline && (
            <div className="mt-4">
              <EquipmentSelector
                selectedEquipment={selectedEquipment}
                onEquipmentChange={setSelectedEquipment}
                required={true}
              />
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <MuiButton 
            onClick={() => setIsConfirmDialogOpen(false)}
            disabled={actionLoading}
            style={{
              backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
              color: theme === 'dark' ? '#ffffff' : '#000000'
            }}
          >
            Cancel
          </MuiButton>
          <MuiButton 
            onClick={handleConfirmSession}
            disabled={actionLoading || (actionSession && !actionSession.isOnline && selectedEquipment.length === 0)}
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              opacity: (actionSession && !actionSession.isOnline && selectedEquipment.length === 0) ? 0.5 : 1
            }}
          >
            {actionLoading ? 'Confirming...' : 'Confirm Session'}
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* Reject Session Dialog */}
      <Dialog 
        open={isRejectDialogOpen} 
        onClose={() => !actionLoading && setIsRejectDialogOpen(false)}
        PaperProps={{
          style: {
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            color: theme === 'dark' ? '#ffffff' : '#000000'
          }
        }}
      >
        <DialogTitle style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
          Reject Session
        </DialogTitle>
        <DialogContent>
          <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Please provide a reason for rejecting this session:
          </p>
          {actionSession && (
            <div className="mb-4 space-y-2">
              <p className="text-sm"><strong>Student:</strong> {studentsMap[actionSession.studentId]?.name}</p>
              <p className="text-sm"><strong>Subject:</strong> {actionSession.subject}</p>
              <p className="text-sm"><strong>Date:</strong> {formatDate(actionSession.startTime)}</p>
            </div>
          )}
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection..."
            rows={4}
            className={`w-full p-3 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-red-500`}
          />
        </DialogContent>
        <DialogActions>
          <MuiButton 
            onClick={() => {
              setIsRejectDialogOpen(false)
              setRejectReason('')
            }}
            disabled={actionLoading}
            style={{
              backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
              color: theme === 'dark' ? '#ffffff' : '#000000'
            }}
          >
            Cancel
          </MuiButton>
          <MuiButton 
            onClick={handleRejectSession}
            disabled={actionLoading || !rejectReason.trim()}
            style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              opacity: (!rejectReason.trim() || actionLoading) ? 0.5 : 1
            }}
          >
            {actionLoading ? 'Rejecting...' : 'Reject Session'}
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* Change Session Type Dialog */}
      <Dialog 
        open={isChangeTypeDialogOpen} 
        onClose={() => !changeTypeLoading && setIsChangeTypeDialogOpen(false)}
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            color: theme === 'dark' ? '#ffffff' : '#000000'
          }
        }}
      >
        <DialogTitle style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
          Request Change Session Type
        </DialogTitle>
        <DialogContent>
          {changeTypeSession && (
            <div className="space-y-4 mt-4">
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>Current Session:</strong>
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong>Type:</strong> {changeTypeSession.studentIds && changeTypeSession.studentIds.length > 1 ? 'Group' : 'Individual'} ({changeTypeSession.studentIds?.length || 0} student{changeTypeSession.studentIds?.length !== 1 ? 's' : ''})
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong>Subject:</strong> {changeTypeSession.subject}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong>Date:</strong> {formatDate(changeTypeSession.startTime)} at {formatTime(changeTypeSession.startTime)}
                </p>
              </div>

              {changeTypeSession.studentIds && changeTypeSession.studentIds.length > 1 ? (
                <>
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-50'}`}>
                    <p className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-800'}`}>
                      <strong>Note:</strong> This will split the group session into {changeTypeSession.studentIds.length} individual sessions (one for each student).
                    </p>
                  </div>
                  <input type="hidden" value="individual" />
                </>
              ) : (
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <strong>Note:</strong> To convert an individual session to a group session, you need to merge multiple individual sessions. This feature is not available in this interface. Please contact management for assistance.
                  </p>
                </div>
              )}

              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={changeTypeDescription}
                onChange={(e) => setChangeTypeDescription(e.target.value)}
                placeholder="Please explain why you want to change the session type..."
                helperText={`${changeTypeDescription.length}/10 characters minimum`}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
                    '& fieldset': {
                      borderColor: theme === 'dark' ? '#6b7280' : '#d1d5db'
                    },
                    '&:hover fieldset': {
                      borderColor: theme === 'dark' ? '#9ca3af' : '#9ca3af'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                  },
                  '& .MuiFormHelperText-root': {
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                  }
                }}
              />
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <MuiButton 
            onClick={() => {
              setIsChangeTypeDialogOpen(false)
              setChangeTypeSession(null)
              setChangeTypeDescription('')
            }}
            disabled={changeTypeLoading}
            style={{
              backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
              color: theme === 'dark' ? '#ffffff' : '#000000'
            }}
          >
            Cancel
          </MuiButton>
          <MuiButton 
            onClick={handleSubmitChangeTypeRequest}
            disabled={changeTypeLoading || !changeTypeDescription.trim() || changeTypeDescription.length < 10}
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              opacity: (changeTypeLoading || !changeTypeDescription.trim() || changeTypeDescription.length < 10) ? 0.5 : 1
            }}
          >
            {changeTypeLoading ? 'Submitting...' : 'Submit Request'}
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* Change Location/Mode Dialog */}
      <Dialog 
        open={isChangeLocationDialogOpen} 
        onClose={() => !changeLocationLoading && setIsChangeLocationDialogOpen(false)}
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            color: theme === 'dark' ? '#ffffff' : '#000000'
          }
        }}
      >
        <DialogTitle style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
          Request Change Session Mode
        </DialogTitle>
        <DialogContent>
          {changeLocationSession && (
            <div className="space-y-4 mt-4">
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>Current Session:</strong>
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong>Mode:</strong> {changeLocationSession.isOnline ? 'Online' : 'Offline'}
                </p>
                {changeLocationSession.isOnline && changeLocationSession.meetingLink && (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <strong>Meeting Link:</strong> {changeLocationSession.meetingLink}
                  </p>
                )}
                {!changeLocationSession.isOnline && changeLocationSession.location && (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <strong>Location:</strong> {changeLocationSession.location}
                  </p>
                )}
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong>Subject:</strong> {changeLocationSession.subject}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong>Date:</strong> {formatDate(changeLocationSession.startTime)} at {formatTime(changeLocationSession.startTime)}
                </p>
              </div>

              <FormControl fullWidth>
                <InputLabel sx={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>New Mode</InputLabel>
                <Select
                  value={newIsOnline ? 'online' : 'offline'}
                  onChange={(e) => setNewIsOnline(e.target.value === 'online')}
                  label="New Mode"
                  sx={{
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme === 'dark' ? '#6b7280' : '#d1d5db'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme === 'dark' ? '#9ca3af' : '#9ca3af'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6'
                    }
                  }}
                >
                  <MenuItem value="online">Online</MenuItem>
                  <MenuItem value="offline">Offline</MenuItem>
                </Select>
              </FormControl>

              {newIsOnline ? (
                <TextField
                  fullWidth
                  label="Meeting Link"
                  value={newMeetingLink}
                  onChange={(e) => setNewMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: theme === 'dark' ? '#ffffff' : '#000000',
                      backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
                      '& fieldset': {
                        borderColor: theme === 'dark' ? '#6b7280' : '#d1d5db'
                      },
                      '&:hover fieldset': {
                        borderColor: theme === 'dark' ? '#9ca3af' : '#9ca3af'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6'
                      }
                    },
                    '& .MuiInputLabel-root': {
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                    }
                  }}
                />
              ) : (
                <TextField
                  fullWidth
                  label="Location"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Enter physical location address..."
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: theme === 'dark' ? '#ffffff' : '#000000',
                      backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
                      '& fieldset': {
                        borderColor: theme === 'dark' ? '#6b7280' : '#d1d5db'
                      },
                      '&:hover fieldset': {
                        borderColor: theme === 'dark' ? '#9ca3af' : '#9ca3af'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6'
                      }
                    },
                    '& .MuiInputLabel-root': {
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                    }
                  }}
                />
              )}

              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={changeLocationDescription}
                onChange={(e) => setChangeLocationDescription(e.target.value)}
                placeholder="Please explain why you want to change the session mode..."
                helperText={`${changeLocationDescription.length}/10 characters minimum`}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
                    '& fieldset': {
                      borderColor: theme === 'dark' ? '#6b7280' : '#d1d5db'
                    },
                    '&:hover fieldset': {
                      borderColor: theme === 'dark' ? '#9ca3af' : '#9ca3af'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                  },
                  '& .MuiFormHelperText-root': {
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                  }
                }}
              />
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <MuiButton 
            onClick={() => {
              setIsChangeLocationDialogOpen(false)
              setChangeLocationSession(null)
              setChangeLocationDescription('')
              setNewLocation('')
              setNewMeetingLink('')
            }}
            disabled={changeLocationLoading}
            style={{
              backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
              color: theme === 'dark' ? '#ffffff' : '#000000'
            }}
          >
            Cancel
          </MuiButton>
          <MuiButton 
            onClick={handleSubmitChangeLocationRequest}
            disabled={changeLocationLoading || !changeLocationDescription.trim() || changeLocationDescription.length < 10 || (newIsOnline && !newMeetingLink.trim()) || (!newIsOnline && !newLocation.trim())}
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              opacity: (changeLocationLoading || !changeLocationDescription.trim() || changeLocationDescription.length < 10 || (newIsOnline && !newMeetingLink.trim()) || (!newIsOnline && !newLocation.trim())) ? 0.5 : 1
            }}
          >
            {changeLocationLoading ? 'Submitting...' : 'Submit Request'}
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* Merge Sessions Dialog */}
      <Dialog 
        open={isMergeDialogOpen} 
        onClose={() => !mergeLoading && setIsMergeDialogOpen(false)}
        maxWidth="md" 
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            color: theme === 'dark' ? '#ffffff' : '#000000'
          }
        }}
      >
        <DialogTitle style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
          Merge Individual Sessions
        </DialogTitle>
        <DialogContent>
          {mergeBaseSession && (
            <div className="space-y-4 mt-4">
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>Base Session:</strong>
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong>Subject:</strong> {mergeBaseSession.subject}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong>Date:</strong> {formatDate(mergeBaseSession.startTime)} at {formatTime(mergeBaseSession.startTime)}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong>Duration:</strong> {formatDuration(mergeBaseSession.duration)}
                </p>
                <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Select other individual sessions with the same tutor, subject, and time to merge into a group session.
                </p>
              </div>

              <div>
                <p className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Select Sessions to Merge ({selectedMergeSessions.length} selected)
                </p>
                
                {getMergeableSessions().length === 0 ? (
                  <div className={`p-4 rounded-lg text-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      No other individual sessions found with the same tutor, subject, and time.
                    </p>
                  </div>
                ) : (
                  <div className={`max-h-64 overflow-y-auto space-y-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-lg`}>
                    {/* Base session (always selected) */}
                    <div className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={true}
                            disabled={true}
                            sx={{
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              '&.Mui-checked': {
                                color: theme === 'dark' ? '#3b82f6' : '#3b82f6'
                              }
                            }}
                          />
                        }
                        label={
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {studentsMap[mergeBaseSession.studentIds?.[0]]?.name || 'Unknown Student'}
                              </p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {mergeBaseSession.topic || 'No topic'}
                              </p>
                            </div>
                            <Chip 
                              label="Base" 
                              size="small"
                              sx={{
                                backgroundColor: theme === 'dark' ? '#3b82f6' : '#3b82f6',
                                color: '#ffffff',
                                fontSize: '0.7rem'
                              }}
                            />
                          </div>
                        }
                        sx={{ width: '100%', margin: 0 }}
                      />
                    </div>

                    {/* Other mergeable sessions */}
                    {getMergeableSessions().map((session) => {
                      const studentId = session.studentIds?.[0]
                      const student = studentId ? studentsMap[studentId] : null
                      const studentName = student?.name || 'Unknown Student'
                      const isSelected = selectedMergeSessions.includes(session.id)

                      return (
                        <div 
                          key={session.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected 
                              ? theme === 'dark' ? 'bg-blue-900 bg-opacity-30 border-blue-600' : 'bg-blue-50 border-blue-300'
                              : theme === 'dark' ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => handleToggleMergeSession(session.id)}
                        >
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleToggleMergeSession(session.id)}
                                sx={{
                                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                  '&.Mui-checked': {
                                    color: theme === 'dark' ? '#3b82f6' : '#3b82f6'
                                  }
                                }}
                              />
                            }
                            label={
                              <div className="flex items-center justify-between w-full">
                                <div>
                                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {studentName}
                                  </p>
                                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {session.topic || 'No topic'}
                                  </p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  session.status === 'confirmed' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {session.status}
                                </span>
                              </div>
                            }
                            sx={{ width: '100%', margin: 0 }}
                          />
    </div>
  )
                    })}
                  </div>
                )}
              </div>

              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={mergeDescription}
                onChange={(e) => setMergeDescription(e.target.value)}
                placeholder="Please explain why you want to merge these sessions..."
                helperText={`${mergeDescription.length}/10 characters minimum`}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
                    '& fieldset': {
                      borderColor: theme === 'dark' ? '#6b7280' : '#d1d5db'
                    },
                    '&:hover fieldset': {
                      borderColor: theme === 'dark' ? '#9ca3af' : '#9ca3af'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                  },
                  '& .MuiFormHelperText-root': {
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                  }
                }}
              />
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <MuiButton 
            onClick={() => {
              setIsMergeDialogOpen(false)
              setMergeBaseSession(null)
              setSelectedMergeSessions([])
              setMergeDescription('')
            }}
            disabled={mergeLoading}
            style={{
              backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
              color: theme === 'dark' ? '#ffffff' : '#000000'
            }}
          >
            Cancel
          </MuiButton>
          <MuiButton 
            onClick={handleSubmitMergeRequest}
            disabled={mergeLoading || selectedMergeSessions.length < 2 || !mergeDescription.trim() || mergeDescription.length < 10}
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              opacity: (mergeLoading || selectedMergeSessions.length < 2 || !mergeDescription.trim() || mergeDescription.length < 10) ? 0.5 : 1
            }}
          >
            {mergeLoading ? 'Submitting...' : `Submit Merge Request (${selectedMergeSessions.length} sessions)`}
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* Reschedule (Change Duration) Dialog */}
      <Dialog 
        open={isRescheduleDialogOpen} 
        onClose={() => !rescheduleLoading && setIsRescheduleDialogOpen(false)}
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            borderRadius: '16px'
          }
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
            pb: 2,
            color: theme === 'dark' ? '#ffffff' : '#111827',
            fontWeight: 600,
            fontSize: '1.25rem'
          }}
        >
          Reschedule Session
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {rescheduleSession && (
            <div className="space-y-4">
              {/* Session Info */}
              <div
                className={`p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
                }`}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                    mb: 1
                  }}
                >
                  Current Session
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: theme === 'dark' ? '#ffffff' : '#111827',
                    fontWeight: 600,
                    mb: 0.5
                  }}
                >
                  {rescheduleSession.subject}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme === 'dark' ? '#d1d5db' : '#374151'
                  }}
                >
                  {new Date(rescheduleSession.startTime).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} ({formatDuration(rescheduleSession.duration)})
                </Typography>
                {!rescheduleSession.isOnline && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Rescheduling an offline session requires management approval to reallocate the room.
                  </Alert>
                )}
              </div>

              {/* Error Message */}
              {rescheduleError && (
                <Alert severity="error" onClose={() => setRescheduleError('')}>
                  {rescheduleError}
                </Alert>
              )}

              {/* Available Slots Selection */}
              {loadingSlots ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress size={40} />
                </Box>
              ) : availableSlots.length > 0 ? (
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                      mb: 2,
                      fontWeight: 600
                    }}
                  >
                    Select your available time slots (or enter manually below)
                  </Typography>
                  
                  {/* Step 1: Select Date */}
                  {!selectedDateForSlot ? (
                    <Box>
                      <Box display="flex" alignItems="center" mb={3}>
                        <CalendarToday 
                          sx={{ 
                            mr: 1.5, 
                            color: theme === 'dark' ? '#3b82f6' : '#2563eb',
                            fontSize: '1.5rem'
                          }} 
                        />
                        <Typography
                          variant="h6"
                          sx={{
                            color: theme === 'dark' ? '#ffffff' : '#111827',
                            fontWeight: 600
                          }}
                        >
                          Step 1: Select Date
                        </Typography>
                      </Box>
                      
                      {/* Weekly Calendar View - Same as RequestDialog */}
                      <Box>
                        {/* Calendar Header */}
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <MuiButton
                            size="small"
                            onClick={handlePreviousWeek}
                            sx={{
                              minWidth: 'auto',
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                            }}
                          >
                            <ChevronLeft />
                          </MuiButton>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Typography
                              variant="h6"
                              sx={{
                                color: theme === 'dark' ? '#ffffff' : '#111827',
                                fontWeight: 600,
                                minWidth: '200px',
                                textAlign: 'center'
                              }}
                            >
                              {getWeekDates(calendarWeekStart)[0] && new Date(getWeekDates(calendarWeekStart)[0]).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })} - {getWeekDates(calendarWeekStart)[6] && new Date(getWeekDates(calendarWeekStart)[6]).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </Typography>
                            <MuiButton
                              size="small"
                              variant="outlined"
                              onClick={handleTodayWeek}
                              sx={{
                                minWidth: 'auto',
                                px: 1.5,
                                borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                              }}
                            >
                              Today
                            </MuiButton>
                          </Box>
                          <MuiButton
                            size="small"
                            onClick={handleNextWeek}
                            sx={{
                              minWidth: 'auto',
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                            }}
                          >
                            <ChevronRight />
                          </MuiButton>
                        </Box>

                        {/* Calendar Grid - Same styling as RequestDialog */}
                        <Grid container spacing={2}>
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                            const weekDates = getWeekDates(calendarWeekStart)
                            const dateStr = weekDates[index]
                            const dateObj = new Date(dateStr)
                            const dateSlots = availableSlots.filter(s => s.date === dateStr)
                            const count = dateSlots.length
                            
                            const today = new Date()
                            const isToday = dateObj.toDateString() === today.toDateString()
                            const hasSlots = count > 0
                            
                            const getTimeRange = () => {
                              if (dateSlots.length === 0) return null
                              const times = dateSlots.map(s => {
                                const slotDate = new Date(s.startTime)
                                return slotDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                              }).sort()
                              return { earliest: times[0], latest: times[times.length - 1] }
                            }
                            const timeRange = getTimeRange()
                            
                            const getColor = () => {
                              if (!hasSlots) return theme === 'dark' ? '#374151' : '#e5e7eb'
                              if (count >= 10) return theme === 'dark' ? '#10b981' : '#34d399'
                              if (count >= 5) return theme === 'dark' ? '#3b82f6' : '#60a5fa'
                              return theme === 'dark' ? '#f59e0b' : '#fbbf24'
                            }
                            
                            const color = getColor()

                            return (
                              <Grid size={{ xs: 12, sm: 6, md: 12/7 }} key={dateStr}>
                                <MuiCard
                                  sx={{
                                    border: isToday 
                                      ? `2px solid ${theme === 'dark' ? '#3b82f6' : '#2563eb'}`
                                      : hasSlots
                                      ? `2px solid ${color}`
                                      : `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                    backgroundColor: hasSlots 
                                      ? (theme === 'dark' ? '#1f2937' : '#ffffff')
                                      : (theme === 'dark' ? '#111827' : '#f9fafb'),
                                    cursor: hasSlots ? 'pointer' : 'not-allowed',
                                    opacity: hasSlots ? 1 : 0.6,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    minHeight: '160px',
                                    height: '100%',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    background: hasSlots 
                                      ? (theme === 'dark' 
                                        ? `linear-gradient(135deg, #1f2937 0%, #111827 100%)`
                                        : `linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)`)
                                      : 'none',
                                    '&::before': {
                                      content: '""',
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: '6px',
                                      backgroundColor: color,
                                      transition: 'height 0.3s'
                                    },
                                    '&:hover': hasSlots ? {
                                      backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
                                      borderColor: color,
                                      transform: 'translateY(-4px) scale(1.02)',
                                      boxShadow: theme === 'dark'
                                        ? `0 8px 24px rgba(59, 130, 246, 0.4)`
                                        : `0 8px 24px rgba(37, 99, 235, 0.2)`,
                                      '&::before': {
                                        height: '8px'
                                      }
                                    } : {}
                                  }}
                                  onClick={() => hasSlots && handleSelectDate(dateStr)}
                                >
                                  <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="space-between" height="100%">
                                      {/* Day Header */}
                                      <Box display="flex" flexDirection="column" alignItems="center" width="100%" mb={2}>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            mb: 1,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                          }}
                                        >
                                          {day}
                                        </Typography>
                                        <Box
                                          sx={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: '16px',
                                            backgroundColor: hasSlots ? color : (theme === 'dark' ? '#374151' : '#e5e7eb'),
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mb: 1,
                                            boxShadow: hasSlots ? `0 4px 12px ${color}40` : 'none'
                                          }}
                                        >
                                          <Typography
                                            variant="h4"
                                            sx={{
                                              color: '#ffffff',
                                              fontSize: '1.75rem',
                                              fontWeight: 700,
                                              lineHeight: 1
                                            }}
                                          >
                                            {dateObj.getDate()}
                                          </Typography>
                                        </Box>
                                        {isToday && (
                                          <Chip
                                            label="Today"
                                            size="small"
                                            sx={{
                                              mt: 0.5,
                                              height: '22px',
                                              fontSize: '0.7rem',
                                              backgroundColor: theme === 'dark' ? '#3b82f6' : '#dbeafe',
                                              color: theme === 'dark' ? '#ffffff' : '#1e40af',
                                              fontWeight: 600
                                            }}
                                          />
                                        )}
                                      </Box>
                                      
                                      {/* Availability Info */}
                                      {hasSlots ? (
                                        <Box display="flex" flexDirection="column" alignItems="center" gap={1.5} width="100%">
                                          <Box display="flex" alignItems="center" gap={1}>
                                            <EventAvailable 
                                              sx={{ 
                                                color: color,
                                                fontSize: '1.5rem'
                                              }} 
                                            />
                                            <Typography
                                              variant="h6"
                                              sx={{
                                                color: theme === 'dark' ? '#ffffff' : '#111827',
                                                fontSize: '1.25rem',
                                                fontWeight: 700
                                              }}
                                            >
                                              {count}
                                            </Typography>
                                          </Box>
                                          <Typography
                                            variant="body2"
                                            sx={{
                                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                              fontSize: '0.875rem',
                                              fontWeight: 500,
                                              textAlign: 'center'
                                            }}
                                          >
                                            available slots
                                          </Typography>
                                          {timeRange && (
                                            <Box 
                                              sx={{
                                                mt: 1,
                                                p: 1,
                                                borderRadius: '8px',
                                                backgroundColor: theme === 'dark' ? '#111827' : '#f3f4f6',
                                                width: '100%'
                                              }}
                                            >
                                              <Typography
                                                variant="caption"
                                                sx={{
                                                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                                  fontSize: '0.7rem',
                                                  display: 'block',
                                                  textAlign: 'center'
                                                }}
                                              >
                                                {timeRange.earliest === timeRange.latest 
                                                  ? `At ${timeRange.earliest}`
                                                  : `${timeRange.earliest} - ${timeRange.latest}`
                                                }
                                              </Typography>
                                            </Box>
                                          )}
                                        </Box>
                                      ) : (
                                        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                                          <Typography
                                            variant="body2"
                                            sx={{
                                              color: theme === 'dark' ? '#6b7280' : '#9ca3af',
                                              fontSize: '0.875rem',
                                              fontWeight: 500
                                            }}
                                          >
                                            No
                                          </Typography>
                                          <Typography
                                            variant="caption"
                                            sx={{
                                              color: theme === 'dark' ? '#4b5563' : '#d1d5db',
                                              fontSize: '0.75rem',
                                              textAlign: 'center'
                                            }}
                                          >
                                            available slots
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </CardContent>
                                </MuiCard>
                              </Grid>
                            )
                          })}
                        </Grid>
                      </Box>
                    </Box>
                  ) : (
                    /* Step 2: Select Time */
                    <Box>
                      <Box display="flex" alignItems="center" mb={2}>
                        <MuiButton
                          size="small"
                          onClick={() => {
                            setSelectedDateForSlot('')
                            setSelectedSlot(null)
                          }}
                          sx={{
                            minWidth: 'auto',
                            mr: 2,
                            color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                          }}
                        >
                          ← Back
                        </MuiButton>
                        <Typography
                          variant="body2"
                          sx={{
                            color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                          }}
                        >
                          Step 2: Select time for {new Date(selectedDateForSlot).toLocaleDateString('en-US', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                          })}
                        </Typography>
                      </Box>
                      <Grid container spacing={2} sx={{ maxHeight: '300px', overflowY: 'auto', pb: 2 }}>
                        {availableSlots
                          .filter(slot => slot.date === selectedDateForSlot)
                          .map((slot, index) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                              <MuiCard
                                sx={{
                                  border: selectedSlot?.startTime === slot.startTime
                                    ? `2px solid ${theme === 'dark' ? '#3b82f6' : '#2563eb'}`
                                    : `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                  backgroundColor: selectedSlot?.startTime === slot.startTime
                                    ? theme === 'dark' ? '#1e3a5f' : '#dbeafe'
                                    : theme === 'dark' ? '#1f2937' : '#ffffff',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  '&:hover': {
                                    backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
                                    borderColor: theme === 'dark' ? '#3b82f6' : '#2563eb'
                                  }
                                }}
                              >
                                <CardActionArea onClick={() => handleSelectTimeSlot(slot)}>
                                  <Box p={2}>
                                    <Typography
                                      variant="body1"
                                      sx={{
                                        color: theme === 'dark' ? '#ffffff' : '#111827',
                                        fontWeight: 600
                                      }}
                                    >
                                      {slot.displayTime}
                                    </Typography>
                                  </Box>
                                </CardActionArea>
                              </MuiCard>
                            </Grid>
                          ))}
                      </Grid>
                    </Box>
                  )}
                </Box>
              ) : (
                <Alert severity="info">
                  No available time slots in the next 60 days. Please enter your desired time manually below.
                </Alert>
              )}

              {/* Manual Date/Time Input */}
              <Box sx={{ mt: 3 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                    mb: 2,
                    fontWeight: 600
                  }}
                >
                  Or enter your desired time manually
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <DatePicker
                        label="Preferred Date"
                        value={preferredDateValue}
                        onChange={(newValue) => {
                          setPreferredDateValue(newValue)
                          if (newValue) {
                            setNewStartDate(newValue.toISOString().split('T')[0])
                          } else {
                            setNewStartDate('')
                          }
                          setSelectedSlot(null)
                        }}
                        minDate={new Date()}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            required: true,
                            sx: {
                              '& .MuiOutlinedInput-root': {
                                color: theme === 'dark' ? '#ffffff' : '#111827',
                                '& fieldset': {
                                  borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
                                },
                                '&:hover fieldset': {
                                  borderColor: theme === 'dark' ? '#6b7280' : '#9ca3af',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6',
                                },
                                '& input::placeholder': {
                                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                  opacity: 1
                                },
                                '& .MuiInputBase-input': {
                                  color: theme === 'dark' ? '#ffffff' : '#111827',
                                },
                                '& input': {
                                  color: theme === 'dark' ? '#ffffff' : '#111827',
                                }
                              },
                              '& .MuiInputLabel-root': {
                                color: theme === 'dark' ? '#d1d5db' : '#374151',
                                '&.Mui-focused': {
                                  color: theme === 'dark' ? '#ffffff' : '#111827'
                                }
                              },
                              '& .MuiSvgIcon-root': {
                                color: theme === 'dark' ? '#ffffff !important' : '#111827 !important',
                              }
                            }
                          },
                          popper: {
                            sx: {
                              '& .MuiPaper-root': {
                                backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                                border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                borderRadius: '12px'
                              }
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TimePicker
                        label="Preferred Time"
                        value={preferredTimeValue}
                        onChange={(newValue) => {
                          setPreferredTimeValue(newValue)
                          if (newValue) {
                            const hours = newValue.getHours().toString().padStart(2, '0')
                            const minutes = newValue.getMinutes().toString().padStart(2, '0')
                            setNewStartTime(`${hours}:${minutes}`)
                          } else {
                            setNewStartTime('')
                          }
                          setSelectedSlot(null)
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            required: true,
                            sx: {
                              '& .MuiOutlinedInput-root': {
                                color: theme === 'dark' ? '#ffffff' : '#111827',
                                '& fieldset': {
                                  borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
                                },
                                '&:hover fieldset': {
                                  borderColor: theme === 'dark' ? '#6b7280' : '#9ca3af',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6',
                                },
                                '& input::placeholder': {
                                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                  opacity: 1
                                },
                                '& .MuiInputBase-input': {
                                  color: theme === 'dark' ? '#ffffff' : '#111827',
                                },
                                '& input': {
                                  color: theme === 'dark' ? '#ffffff' : '#111827',
                                }
                              },
                              '& .MuiInputLabel-root': {
                                color: theme === 'dark' ? '#d1d5db' : '#374151',
                                '&.Mui-focused': {
                                  color: theme === 'dark' ? '#ffffff' : '#111827'
                                }
                              },
                              '& .MuiSvgIcon-root': {
                                color: theme === 'dark' ? '#ffffff !important' : '#111827 !important',
                              }
                            }
                          },
                          popper: {
                            sx: {
                              '& .MuiPaper-root': {
                                backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                                border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                borderRadius: '12px'
                              }
                            }
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </LocalizationProvider>
              </Box>

              {/* Duration */}
              <TextField
                fullWidth
                label="Duration (minutes)"
                type="number"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                inputProps={{ min: 1 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
                    '& fieldset': {
                      borderColor: theme === 'dark' ? '#6b7280' : '#d1d5db'
                    },
                    '&:hover fieldset': {
                      borderColor: theme === 'dark' ? '#9ca3af' : '#9ca3af'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                  }
                }}
              />

              {/* Description */}
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={rescheduleDescription}
                onChange={(e) => setRescheduleDescription(e.target.value)}
                placeholder="Please explain the reason for rescheduling the session..."
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                    color: theme === 'dark' ? '#ffffff' : '#111827'
                  },
                  '& .MuiInputLabel-root': {
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                  }
                }}
                helperText={`Minimum 10 characters (${rescheduleDescription.length}/10)`}
              />
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <MuiButton
            onClick={() => {
              setIsRescheduleDialogOpen(false)
              setRescheduleSession(null)
              setNewStartDate('')
              setNewStartTime('')
              setNewDuration('')
              setRescheduleDescription('')
              setAvailableSlots([])
              setSelectedSlot(null)
              setSelectedDateForSlot('')
              setPreferredDateValue(null)
              setPreferredTimeValue(null)
              setRescheduleError('')
              setShowSuccessSnackbar(false)
            }}
            disabled={rescheduleLoading}
            sx={{
              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
            }}
          >
            Cancel
          </MuiButton>
          <MuiButton
            onClick={handleSubmitRescheduleRequest}
            variant="contained"
            disabled={
              rescheduleLoading || 
              !rescheduleDescription.trim() || 
              rescheduleDescription.length < 10 ||
              (!selectedSlot && !preferredDateValue && !preferredTimeValue && (!newStartDate || !newStartTime)) ||
              !newDuration || 
              parseInt(newDuration) <= 0
            }
            sx={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#2563eb'
              },
              '&:disabled': {
                backgroundColor: theme === 'dark' ? '#374151' : '#9ca3af',
                color: theme === 'dark' ? '#6b7280' : '#ffffff'
              }
            }}
          >
            {rescheduleLoading ? 'Sending...' : 'Submit Request'}
          </MuiButton>
        </DialogActions>

        {/* Success Snackbar */}
        <Snackbar
          open={showSuccessSnackbar}
          autoHideDuration={4000}
          onClose={() => {
            setShowSuccessSnackbar(false)
            setTimeout(() => {
              setIsRescheduleDialogOpen(false)
              setRescheduleSession(null)
              setNewStartDate('')
              setNewStartTime('')
              setNewDuration('')
              setRescheduleDescription('')
              setAvailableSlots([])
              setSelectedSlot(null)
              setSelectedDateForSlot('')
              setPreferredDateValue(null)
              setPreferredTimeValue(null)
              setRescheduleError('')
            }, 300)
          }}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{
            zIndex: 9999,
            '& .MuiSnackbarContent-root': {
              backgroundColor: 'transparent',
              padding: 0,
              boxShadow: 'none'
            }
          }}
        >
          <Alert 
            onClose={() => {
              setShowSuccessSnackbar(false)
              setTimeout(() => {
                setIsRescheduleDialogOpen(false)
                setRescheduleSession(null)
                setNewStartDate('')
                setNewStartTime('')
                setNewDuration('')
                setRescheduleDescription('')
                setAvailableSlots([])
                setSelectedSlot(null)
                setSelectedDateForSlot('')
                setPreferredDateValue(null)
                setPreferredTimeValue(null)
                setRescheduleError('')
              }, 300)
            }} 
            severity="success" 
            icon={false}
            sx={{ 
              width: '100%',
              minWidth: '400px',
              maxWidth: '600px',
              backgroundColor: theme === 'dark' ? '#10b981' : '#059669',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '1rem',
              borderRadius: '12px',
              boxShadow: theme === 'dark' 
                ? '0 8px 24px rgba(16, 185, 129, 0.5)'
                : '0 8px 24px rgba(5, 150, 105, 0.4)',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              '& .MuiAlert-message': {
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                color: '#ffffff',
                fontWeight: 500
              },
              '& .MuiAlert-action': {
                color: '#ffffff',
                '& .MuiIconButton-root': {
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }
              }
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Typography
                sx={{
                  fontSize: '1.5rem',
                  color: '#ffffff'
                }}
              >
                ✓
              </Typography>
            </Box>
            <Typography
              sx={{
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '1rem',
                flex: 1
              }}
            >
              Reschedule request has been sent successfully! Waiting for management approval.
            </Typography>
          </Alert>
        </Snackbar>
      </Dialog>

    </div>
  )
}

export default ManageSessions
