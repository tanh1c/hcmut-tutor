import React, { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button as MuiButton,
  Typography,
  Avatar
} from '@mui/material'
import { 
  Search, 
  CheckCircle,
  Cancel,
  Schedule,
  Info,
  Menu as MenuIcon,
  ArrowBack as ArrowBackIcon,
  BarChart as BarChartIcon,
  Star as StarIcon
} from '@mui/icons-material'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import api from '../../lib/api'
import RoomSelector from '../../components/rooms/RoomSelector'

// Component to handle session loading and RoomSelector display
const RoomSelectorWrapper: React.FC<{
  selectedRequest: any
  location: string
  setLocation: (location: string) => void
  setError: (error: string | null) => void
  theme: string
}> = ({ selectedRequest, location, setLocation, setError, theme }) => {
  const [sessionData, setSessionData] = useState<any>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  
  useEffect(() => {
    const loadSession = async () => {
      // Try to get session info from targetEntity first
      const sessionInfo = selectedRequest?.targetEntity || null
      const sessionId = selectedRequest?.targetId || selectedRequest?.resourceAllocationData?.affectedSessionIds?.[0]
      
      if (sessionInfo && sessionInfo.startTime && sessionInfo.endTime) {
        setSessionData(sessionInfo)
        setLoadingSession(false)
        return
      }
      
      if (sessionId) {
        try {
          const response = await api.sessions.get(sessionId)
          if (response.success) {
            setSessionData(response.data)
          }
        } catch (err) {
          console.error('Error loading session:', err)
        } finally {
          setLoadingSession(false)
        }
      } else {
        setLoadingSession(false)
      }
    }
    
    loadSession()
  }, [selectedRequest])
  
  if (loadingSession) {
    return (
      <div className="mb-4 text-center py-4">
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
          Loading session information...
        </p>
      </div>
    )
  }
  
  if (sessionData && sessionData.startTime && sessionData.endTime) {
    const sessionId = selectedRequest?.targetId || selectedRequest?.resourceAllocationData?.affectedSessionIds?.[0]
    
    // Get equipment requirements from approval request
    const equipmentRequirements = selectedRequest?.resourceAllocationData?.changes?.find(
      (change: any) => change.type === 'reallocate_room'
    )?.equipmentRequirements || []
    
    return (
      <div className="mb-4">
        <RoomSelector
          startTime={sessionData.startTime}
          endTime={sessionData.endTime}
          excludeSessionId={sessionId}
          selectedRoom={location}
          onSelectRoom={(roomName) => {
            console.log('Room selected:', roomName)
            setLocation(roomName)
            setError(null)
            // Verify location was set
            setTimeout(() => {
              console.log('Location state after setting:', roomName)
            }, 0)
          }}
          required
          equipmentRequirements={equipmentRequirements}
        />
      </div>
    )
  }
  
  // Fallback to manual input
  return (
      <div className={`mb-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-yellow-900/20 text-yellow-300' : 'bg-yellow-50 text-yellow-800'}`}>
      <p className="mb-2">Unable to load session information to check available rooms. Please enter the room manually.</p>
      <TextField
        fullWidth
        label="Room *"
        placeholder="Example: Room A101, Room B203"
        value={location}
        onChange={(e) => {
          setLocation(e.target.value)
          setError(null)
        }}
        required
        error={!location.trim() && location.length > 0}
        helperText={!location.trim() && location.length > 0 ? 'Please enter a room' : 'Enter the room name that will be allocated for the offline session'}
        sx={{
          marginTop: 2,
          '& .MuiOutlinedInput-root': {
            color: theme === 'dark' ? '#ffffff' : '#111827',
            backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
            '& fieldset': {
              borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
            },
            '&:hover fieldset': {
              borderColor: theme === 'dark' ? '#6b7280' : '#9ca3af',
            },
            '&.Mui-focused fieldset': {
              borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6',
            },
          },
          '& .MuiInputLabel-root': {
            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: theme === 'dark' ? '#3b82f6' : '#3b82f6',
          },
        }}
      />
    </div>
  )
}

const ApprovalRequests: React.FC = () => {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState('')
  const [reason, setReason] = useState('')
  const [location, setLocation] = useState('') // Location for room allocation
  const [mobileOpen, setMobileOpen] = useState(false)
  
  // State for API data
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ pending: 0, approved: 0, total: 0 })
  const [actionLoading, setActionLoading] = useState(false)
  
  // Detail view state
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<any>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [clarificationText, setClarificationText] = useState('')
  const [isClarificationDialogOpen, setIsClarificationDialogOpen] = useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  // Load approvals from API
  const loadApprovals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build query params
      const params: any = {
        page: 1,
        limit: 1000 // Load all for now, can add pagination later
      }
      
      // Add filters
      if (filterType !== 'all') {
        // Map filterType to API type
        const typeMap: Record<string, string> = {
          'tutor': 'tutor_verification',
          'credit': 'credit_request',
          'session': 'session_change',
          'verification': 'tutor_verification'
        }
        if (typeMap[filterType]) {
          params.type = typeMap[filterType]
        }
      }
      
      // Add status filter
      if (filterStatus !== 'all') {
        params.status = filterStatus
      }
      
      const result = await api.management.approvals.list(params)
      
      if (result.success && result.data) {
        let approvalsList: any[] = []
        
        // Parse response structure
        if (result.data.data && Array.isArray(result.data.data)) {
          approvalsList = result.data.data
        } else if (Array.isArray(result.data)) {
          approvalsList = result.data
        }
        
        // Apply client-side search filter
        if (searchTerm) {
          approvalsList = approvalsList.filter(request => {
            const requesterName = request.requester?.name || ''
            const requestType = request.type || ''
            const title = request.title || ''
            const description = request.description || ''
            
            const searchLower = searchTerm.toLowerCase()
            return requesterName.toLowerCase().includes(searchLower) ||
                   requestType.toLowerCase().includes(searchLower) ||
                   title.toLowerCase().includes(searchLower) ||
                   description.toLowerCase().includes(searchLower)
          })
        }
        
        setRequests(approvalsList)
        
        // Calculate stats
        const pending = approvalsList.filter(r => r.status === 'pending').length
        const approved = approvalsList.filter(r => r.status === 'approved').length
        setStats({ pending, approved, total: approvalsList.length })
      } else {
        setError(result.error || 'Unable to load request list')
      }
    } catch (err: any) {
      console.error('Error loading approvals:', err)
      setError('An error occurred while loading the request list')
    } finally {
      setLoading(false)
    }
  }, [filterType, filterStatus, searchTerm])

  // Load data on mount and when filters change
  useEffect(() => {
    loadApprovals()
  }, [loadApprovals])

  const handleAction = (request: any, type: string) => {
    console.log('🔄 Opening action dialog:', { requestId: request.id, type, requestType: request.type })
    setSelectedRequest(request)
    setActionType(type)
    setIsActionDialogOpen(true)
    setReason('')
    const isRoomAllocation = type === 'approve' && 
        request.type === 'resource_allocation' && 
        request.resourceAllocationData?.changes?.some((change: any) => change.type === 'reallocate_room')
    if (isRoomAllocation) {
      console.log('📋 This is a room allocation request, resetting location')
    }
    setLocation('') // Reset location
  }

  // Load approval request detail
  const loadRequestDetail = async (requestId: string) => {
    try {
      setDetailLoading(true)
      setError(null)
      const result = await api.management.approvals.get(requestId)
      if (result.success && result.data) {
        setSelectedRequestDetail(result.data)
        setIsDetailDialogOpen(true)
      } else {
        setError(result.error || 'Unable to load request details')
      }
    } catch (err: any) {
      console.error('Error loading request detail:', err)
      setError('An error occurred while loading request details')
    } finally {
      setDetailLoading(false)
    }
  }

  // Handle request clarification
  const handleRequestClarification = async () => {
    if (!selectedRequest || !clarificationText || clarificationText.length < 10) {
      setError('Clarification request must be at least 10 characters')
      return
    }

    try {
      setActionLoading(true)
      setError(null)
      const result = await api.management.approvals.requestClarification(selectedRequest.id, {
        clarificationRequest: clarificationText
      })
      
      if (result.success) {
        await loadApprovals()
        setIsClarificationDialogOpen(false)
        setClarificationText('')
        setSelectedRequest(null)
      } else {
        setError(result.error || 'Unable to send clarification request')
      }
    } catch (err: any) {
      console.error('Error requesting clarification:', err)
      setError('An error occurred while sending clarification request')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitAction = async () => {
    if (!selectedRequest) return
    
    // Validate reject reason
    if (actionType === 'reject' && (!reason || reason.length < 10)) {
      setError('Rejection reason must be at least 10 characters')
      return
    }
    
    // Validate location for resource_allocation with reallocate_room
    const isRoomAllocationRequest = actionType === 'approve' && 
        selectedRequest.type === 'resource_allocation' && 
        selectedRequest.resourceAllocationData?.changes?.some((change: any) => change.type === 'reallocate_room')
    
    console.log('🔍 Validating location before submit:', { 
      isRoomAllocationRequest, 
      location, 
      locationType: typeof location,
      locationLength: location?.length,
      locationTrimmed: location?.trim(),
      locationTrimmedLength: location?.trim()?.length,
      selectedRequestId: selectedRequest.id,
      selectedRequestType: selectedRequest.type
    })
    
    if (isRoomAllocationRequest && (!location || !location.trim())) {
      console.error('❌ Location validation failed - location is empty or invalid')
      setError('Please select a room to allocate for the offline session')
      return
    }
    
    try {
      setActionLoading(true)
      setError(null)
      
      let result
      if (actionType === 'approve') {
        const approveData: any = {
          reviewNotes: reason || 'Request has been approved'
        }
        
        // Add location if this is a room allocation request
        if (isRoomAllocationRequest) {
          const trimmedLocation = location?.trim()
          if (trimmedLocation && trimmedLocation.length > 0) {
            approveData.location = trimmedLocation
            console.log('✅ Sending approve request with location:', approveData.location)
          } else {
            console.error('❌ Room allocation request but location is invalid after trim:', { 
              location, 
              trimmedLocation,
              locationType: typeof location,
              locationLength: location?.length,
              isRoomAllocationRequest,
              selectedRequestId: selectedRequest.id,
              selectedRequestType: selectedRequest.type
            })
            setError('Please select a room to allocate for the offline session')
            setActionLoading(false)
            return
          }
        }
        
        console.log('📤 Approve data being sent to API:', JSON.stringify(approveData, null, 2))
        result = await api.management.approvals.approve(selectedRequest.id, approveData)
      } else if (actionType === 'reject') {
        result = await api.management.approvals.reject(selectedRequest.id, {
          reviewNotes: reason,
          reason: reason
        })
      } else {
        return
      }
      
      if (result.success) {
        // Reload approvals
        await loadApprovals()
        setIsActionDialogOpen(false)
        setReason('')
        setLocation('')
        setSelectedRequest(null)
      } else {
        setError(result.error || 'Unable to perform the action')
      }
    } catch (err: any) {
      console.error('Error submitting action:', err)
      setError(err.message || 'An error occurred while performing the action')
    } finally {
      setActionLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'clarification_requested': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'escalated': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  // Format date/time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const dateStr = date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    return { date: dateStr, time: timeStr }
  }

  // Get type display name
  const getTypeDisplayName = (type: string) => {
    const typeMap: Record<string, string> = {
      'tutor_verification': 'Tutor Verification',
      'session_change': 'Session Change',
      'resource_allocation': 'Resource Allocation',
      'content_moderation': 'Content Moderation'
    }
    return typeMap[type] || type
  }

  // Get change type display name
  const getChangeTypeDisplayName = (changeType: string) => {
    const typeMap: Record<string, string> = {
      'change_type': 'Change Session Type (Individual ↔ Group)',
      'change_location': 'Change Location/Mode (Offline ↔ Online)',
      'change_duration': 'Change Time (Reschedule)'
    }
    return typeMap[changeType] || changeType
  }

  // Format session change details
  const formatSessionChangeDetails = (request: any) => {
    if (request.type !== 'session_change' || !request.changeType || !request.changeData) {
      return null
    }

    const details: any = {
      changeType: request.changeType,
      changeTypeDisplay: getChangeTypeDisplayName(request.changeType)
    }

    // Format based on change type
    if (request.changeType === 'change_type') {
      if (request.changeData.mergeSessionIds) {
        details.action = `Merge ${request.changeData.mergeSessionIds.length} sessions into 1 group session`
        details.mergeSessionIds = request.changeData.mergeSessionIds
      } else if (request.changeData.splitInto) {
        details.action = `Split session into ${request.changeData.splitInto} individual sessions`
      }
    } else if (request.changeType === 'change_location') {
      if (request.changeData.newIsOnline) {
        details.action = `Switch from offline to online`
        details.meetingLink = request.changeData.newMeetingLink
      } else {
        details.action = `Switch from online to offline`
        details.location = request.changeData.newLocation
      }
    } else if (request.changeType === 'change_duration') {
      if (request.originalSessionData && request.changeData.newStartTime) {
        const oldTime = new Date(request.originalSessionData.startTime).toLocaleString('en-US')
        const newTime = new Date(request.changeData.newStartTime).toLocaleString('en-US')
        details.action = `Reschedule from ${oldTime} to ${newTime}`
        details.oldTime = request.originalSessionData.startTime
        details.newTime = request.changeData.newStartTime
        details.location = request.originalSessionData.location
        details.isOffline = !request.originalSessionData.isOnline
      }
    }

    return details
  }

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Helper function to generate avatar color based on name
  const getAvatarColor = (name: string) => {
    if (!name) return '#607d8b'
    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
      '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
      '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
      '#ff5722', '#795548', '#607d8b'
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  // Helper function to parse description into bullet points
  const parseDescription = (description: string): string[] => {
    if (!description) return []
    
    // First, split by newlines (preserve them)
    let items: string[] = []
    const lines = description.split('\n')
    
    lines.forEach(line => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return
      
      // If line contains multiple sentences (ends with period followed by space and capital letter)
      // Split by period followed by space and capital letter
      const sentences = trimmedLine.split(/(?<=\.)\s+(?=[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴĐÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸ])/g)
      
      if (sentences.length > 1) {
        // Multiple sentences found, add each as separate item
        sentences.forEach(sentence => {
          const trimmed = sentence.trim()
          if (trimmed) {
            items.push(trimmed)
          }
        })
      } else {
        // Single sentence or no clear sentence breaks
        // Try splitting by periods followed by space
        const periodSplit = trimmedLine.split(/\.\s+/)
        if (periodSplit.length > 1) {
          periodSplit.forEach((item, index) => {
            const trimmed = item.trim()
            if (trimmed) {
              // Add period back except for last item if it doesn't already have one
              if (index < periodSplit.length - 1 && !trimmed.endsWith('.')) {
                items.push(trimmed + '.')
              } else {
                items.push(trimmed)
              }
            }
          })
        } else {
          // No periods found, add as single item
          items.push(trimmedLine)
        }
      }
    })
    
    // Clean up: remove empty items and trim
    items = items.map(item => item.trim()).filter(item => item.length > 0)
    
    return items
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
              onClick={() => navigate('/management')}
            >
              <div className="w-10 h-10 flex items-center justify-center mr-3">
                <img src="/HCMCUT.png" alt="HCMUT Logo" className="w-10 h-10" />
              </div>
              <span className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                HCMUT
              </span>
            </div>

            {/* Request Stats */}
            <div className="mb-8">
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                REQUEST STATS
              </h3>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Pending:</span>
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {stats.pending}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Approved:</span>
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {stats.approved}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Total:</span>
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {stats.total}
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
                  onClick={() => navigate('/management')}
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
                  Approval Requests
                </h1>
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Review and approve user requests
                </p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={loadApprovals}
                  disabled={loading}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className={`mb-4 p-4 rounded-lg bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-200`}>
                {error}
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Search and Filters */}
            <div className="lg:col-span-2">
              <Card 
                className={`p-6 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
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
                  <div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search requests..."
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
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className={`w-full px-3 py-3 border rounded-lg ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="all">All Types</option>
                      <option value="tutor">Tutor Applications</option>
                      <option value="credit">Credit Requests</option>
                      <option value="session">Session Changes</option>
                      <option value="verification">Account Verification</option>
                    </select>
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
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="clarification_requested">Clarification Requested</option>
                      <option value="escalated">Escalated</option>
                    </select>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <div>
              <Card 
                className={`p-6 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                style={{
                  borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  boxShadow: 'none !important'
                }}
              >
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button className={`w-full flex items-center px-4 py-3 rounded-lg border ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  } transition-colors`}>
                    <CheckCircle className="mr-3 w-4 h-4" />
                    Approve All Pending
                  </button>
                  <button className={`w-full flex items-center px-4 py-3 rounded-lg border ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  } transition-colors`}>
                    <Cancel className="mr-3 w-4 h-4" />
                    Reject All Pending
                  </button>
                  <button className={`w-full flex items-center px-4 py-3 rounded-lg border ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  } transition-colors`}>
                    <Info className="mr-3 w-4 h-4" />
                    Export Reports
                  </button>
                </div>
              </Card>
            </div>
          </div>

          {/* Requests List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading request list...
              </p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                No requests found
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {requests.map((request) => {
              const requesterName = request.requester?.name || 'Unknown User'
              const dateTime = formatDateTime(request.createdAt)
              const typeDisplay = getTypeDisplayName(request.type)
              
              return (
              <Card 
                key={request.id} 
                className={`overflow-hidden border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                style={{
                  borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  boxShadow: 'none !important'
                }}
              >
                <div className="p-6">
                  {/* Request Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: getAvatarColor(requesterName),
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          mr: 3
                        }}
                        src={request.requester?.avatar}
                      >
                        {getInitials(requesterName)}
                      </Avatar>
                      <div>
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {requesterName}
                        </h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {typeDisplay}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {request.priority && (
                            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(request.priority)}`}>
                              {request.priority}
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(request.status)}`}>
                            {request.status === 'pending' ? 'Pending' :
                             request.status === 'approved' ? 'Approved' :
                             request.status === 'rejected' ? 'Rejected' :
                             request.status === 'clarification_requested' ? 'Clarification Requested' :
                             request.status === 'escalated' ? 'Escalated' :
                             request.status}
                          </span>
                        </div>
                        {request.reviewer && (
                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            Reviewer: {request.reviewer.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center">
                      <Schedule className="w-4 h-4 text-gray-400 mr-2" />
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {dateTime.date} lúc {dateTime.time}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <Info className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                      <div className="flex-1">
                        <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {request.title}
                        </p>
                        {request.description && (
                          <div className="space-y-1">
                            {parseDescription(request.description).map((item, index) => (
                              <div key={index} className="flex items-start">
                                <span className={`text-sm mr-2 mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                  •
                                </span>
                                <p className={`text-sm flex-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {item}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {request.deadline && (
                      <div className="flex items-center">
                        <Schedule className="w-4 h-4 text-gray-400 mr-2" />
                        <span className={`text-sm ${request.isDeadlinePassed ? 'text-red-600' : request.isDeadlineApproaching ? 'text-yellow-600' : theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          Deadline: {formatDateTime(request.deadline).date} {formatDateTime(request.deadline).time}
                          {request.isDeadlinePassed && ' (Overdue)'}
                          {request.isDeadlineApproaching && !request.isDeadlinePassed && ' (Approaching)'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Attachments */}
                  {request.attachments && request.attachments.length > 0 && (
                    <div className="mb-4">
                      <h4 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Attachments:
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {request.attachments.map((doc: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded-full"
                          >
                            {doc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Review Notes */}
                  {request.reviewNotes && (
                    <div className="mb-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                      <h4 className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Review Notes:
                      </h4>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {request.reviewNotes}
                      </p>
                    </div>
                  )}

                  {/* Session Change Details Preview */}
                  {request.type === 'session_change' && request.changeType && (
                    <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center mb-2">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>
                          {getChangeTypeDisplayName(request.changeType)}
                        </span>
                      </div>
                      {request.changeType === 'change_duration' && request.changeData?.newStartTime && (
                        <p className={`text-xs ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>
                          Time change: {formatDateTime(request.changeData.newStartTime).date} {formatDateTime(request.changeData.newStartTime).time}
                        </p>
                      )}
                      {request.changeType === 'change_location' && (
                        <p className={`text-xs ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>
                          {request.changeData?.newIsOnline ? 'Switch to online' : `Switch to offline: ${request.changeData?.newLocation || ''}`}
                        </p>
                      )}
                      {request.changeType === 'change_type' && (
                        <p className={`text-xs ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>
                          {request.changeData?.mergeSessionIds 
                            ? `Merge ${request.changeData.mergeSessionIds.length} sessions` 
                            : request.changeData?.splitInto 
                            ? `Split into ${request.changeData.splitInto} sessions`
                            : 'Change session type'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Resource Allocation Details Preview */}
                  {request.type === 'resource_allocation' && request.resourceAllocationData && (
                    <div className="mb-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center mb-2">
                        <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-purple-300' : 'text-purple-900'}`}>
                          Resource Allocation
                        </span>
                      </div>
                      {request.resourceAllocationData.changes && request.resourceAllocationData.changes.length > 0 && (
                        <p className={`text-xs ${theme === 'dark' ? 'text-purple-200' : 'text-purple-700'}`}>
                          {request.resourceAllocationData.changes.length} changes: {request.resourceAllocationData.changes.map((c: any) => {
                            const typeMap: Record<string, string> = {
                              'reassign_tutor': 'Change tutor',
                              'adjust_group_size': 'Adjust group size',
                              'reallocate_room': 'Reallocate room',
                              'adjust_schedule': 'Adjust schedule'
                            };
                            return typeMap[c.type] || c.type;
                          }).join(', ')}
                        </p>
                      )}
                      {request.resourceAllocationData.affectedTutorIds && request.resourceAllocationData.affectedTutorIds.length > 0 && (
                        <p className={`text-xs ${theme === 'dark' ? 'text-purple-200' : 'text-purple-700'}`}>
                          Affects {request.resourceAllocationData.affectedTutorIds.length} tutor(s)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Content Moderation Details Preview */}
                  {request.type === 'content_moderation' && request.contentModerationData && (
                    <div className="mb-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center mb-2">
                        <Info className="w-4 h-4 text-orange-600 dark:text-orange-400 mr-2" />
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-orange-300' : 'text-orange-900'}`}>
                          Content Moderation: {request.contentModerationData.contentType === 'post' ? 'Post' : 'Comment'}
                        </span>
                      </div>
                      {request.contentModerationData.violationType && (
                        <p className={`text-xs ${theme === 'dark' ? 'text-orange-200' : 'text-orange-700'}`}>
                          Violation Type: {request.contentModerationData.violationType === 'spam' ? 'Spam' :
                            request.contentModerationData.violationType === 'inappropriate' ? 'Inappropriate' :
                            request.contentModerationData.violationType === 'harassment' ? 'Harassment' :
                            request.contentModerationData.violationType === 'false_information' ? 'False Information' :
                            'Other'}
                        </p>
                      )}
                      {request.contentModerationData.severity && (
                        <p className={`text-xs ${theme === 'dark' ? 'text-orange-200' : 'text-orange-700'}`}>
                          Severity: {request.contentModerationData.severity}
                        </p>
                      )}
                      {request.contentModerationData.contentPreview && (
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-orange-200' : 'text-orange-700'}`}>
                          Preview: {request.contentModerationData.contentPreview.substring(0, 100)}...
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {request.status === 'pending' || request.status === 'clarification_requested' ? (
                      <>
                        <Button 
                          size="small" 
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleAction(request, 'approve')}
                          disabled={actionLoading}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined"
                          className="flex-1"
                          style={{
                            backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
                            color: theme === 'dark' ? '#ffffff' : '#dc2626',
                            borderColor: theme === 'dark' ? '#000000' : '#dc2626',
                            textTransform: 'none',
                            fontWeight: '500'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#fef2f2'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = theme === 'dark' ? '#000000' : '#ffffff'
                          }}
                          onClick={() => handleAction(request, 'reject')}
                          disabled={actionLoading}
                        >
                          <Cancel className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined"
                          className="flex-1"
                          style={{
                            backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
                            color: theme === 'dark' ? '#ffffff' : '#3b82f6',
                            borderColor: theme === 'dark' ? '#000000' : '#3b82f6',
                            textTransform: 'none',
                            fontWeight: '500'
                          }}
                          onClick={() => {
                            setSelectedRequest(request)
                            setIsClarificationDialogOpen(true)
                            setClarificationText('')
                          }}
                          disabled={actionLoading}
                        >
                          <Info className="w-4 h-4 mr-1" />
                          Request Clarification
                        </Button>
                      </>
                    ) : null}
                    <Button 
                      size="small" 
                      variant="outlined"
                      className="flex-1"
                      style={{
                        backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
                        color: theme === 'dark' ? '#ffffff' : '#000000',
                        borderColor: theme === 'dark' ? '#000000' : '#d1d5db',
                        textTransform: 'none',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#f3f4f6'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#000000' : '#ffffff'
                      }}
                      onClick={() => loadRequestDetail(request.id)}
                    >
                      <Info className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                  </div>
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

              {/* Mobile Request Stats */}
              <div className="mb-8">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  REQUEST STATS
                </h3>
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Pending:</span>
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {stats.pending}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Approved:</span>
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {stats.approved}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Quick Actions */}
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    navigate('/management/reports')
                    setMobileOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <BarChartIcon className="mr-3 w-4 h-4" />
                  Reports
                </button>
                <button 
                  onClick={() => {
                    navigate('/management/awards')
                    setMobileOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <StarIcon className="mr-3 w-4 h-4" />
                  Award Credits
                </button>
                <button 
                  onClick={() => {
                    navigate('/management')
                    setMobileOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <ArrowBackIcon className="mr-3 w-4 h-4" />
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Dialog */}
      <Dialog 
        open={isActionDialogOpen} 
        onClose={() => setIsActionDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            color: theme === 'dark' ? '#ffffff' : '#111827',
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'
          }}
        >
          {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
        </DialogTitle>
        <DialogContent 
          sx={{ 
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'
          }}
        >
          <div className="space-y-4 mt-4">
            <div>
              <Typography 
                variant="body1" 
                gutterBottom
                sx={{ 
                  color: theme === 'dark' ? '#ffffff' : '#111827',
                  fontWeight: '500'
                }}
              >
                Requester: {selectedRequest?.requester?.name || 'Unknown'}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                  fontWeight: '400'
                }}
              >
                Type: {selectedRequest ? getTypeDisplayName(selectedRequest.type) : ''}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                  fontWeight: '400',
                  mt: 1
                }}
              >
                Title: {selectedRequest?.title}
              </Typography>
            </div>

            {/* Equipment Requirements Display */}
            {actionType === 'approve' && 
             selectedRequest?.type === 'resource_allocation' && 
             selectedRequest?.resourceAllocationData?.changes?.some((change: any) => change.type === 'reallocate_room') && (() => {
              const roomAllocationChange = selectedRequest?.resourceAllocationData?.changes?.find(
                (change: any) => change.type === 'reallocate_room'
              )
              const equipmentRequirements = roomAllocationChange?.equipmentRequirements || []
              
              if (equipmentRequirements.length > 0) {
                const equipmentNameMap: { [key: string]: string } = {
                  'whiteboard': 'Whiteboard',
                  'projector': 'Projector',
                  'computer': 'Computer',
                  'sound_system': 'Sound System',
                  'microphone': 'Microphone',
                  'camera': 'Camera'
                }
                
                return (
                  <div className={`mb-4 p-3 rounded-lg border ${theme === 'dark' ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        color: theme === 'dark' ? '#93c5fd' : '#1e40af',
                        fontWeight: 600,
                        mb: 1.5
                      }}
                    >
                      Equipment requirements from tutor:
                    </Typography>
                    <div className="flex flex-wrap gap-2">
                      {equipmentRequirements.map((eqId: string, idx: number) => (
                        <span
                          key={idx}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            theme === 'dark' ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {equipmentNameMap[eqId] || eqId}
                        </span>
                      ))}
                    </div>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: theme === 'dark' ? '#93c5fd' : '#1e40af',
                        display: 'block',
                        mt: 1.5
                      }}
                    >
                      Only rooms with required equipment are shown. If no suitable room is found, all rooms will be displayed.
                    </Typography>
                  </div>
                )
              }
              return null
            })()}

            <div>
              {/* Room Selector for resource_allocation with reallocate_room */}
              {actionType === 'approve' && 
               selectedRequest?.type === 'resource_allocation' && 
               selectedRequest?.resourceAllocationData?.changes?.some((change: any) => change.type === 'reallocate_room') && (
                <RoomSelectorWrapper
                  selectedRequest={selectedRequest}
                  location={location}
                  setLocation={setLocation}
                  setError={setError}
                  theme={theme}
                />
              )}
              
              <TextField
                fullWidth
                label={actionType === 'approve' ? 'Approval Notes' : 'Rejection Reason (minimum 10 characters)'}
                multiline
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  setError(null)
                }}
                error={actionType === 'reject' && reason.length > 0 && reason.length < 10}
                helperText={actionType === 'reject' && reason.length > 0 && reason.length < 10 ? 'Rejection reason must be at least 10 characters' : ''}
                placeholder={
                  actionType === 'approve' 
                    ? 'Enter notes for the requester about the approval...'
                    : 'Enter rejection reason (required, minimum 10 characters)...'
                }
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: theme === 'dark' ? '#ffffff' : '#111827',
                    backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
                    '& fieldset': {
                      borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
                    },
                    '&:hover fieldset': {
                      borderColor: theme === 'dark' ? '#6b7280' : '#9ca3af',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: theme === 'dark' ? '#3b82f6' : '#3b82f6',
                  },
                }}
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions 
          sx={{ 
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            padding: '16px 24px'
          }}
        >
          <MuiButton 
            onClick={() => {
              setIsActionDialogOpen(false)
              setReason('')
              setLocation('')
              setError(null)
            }}
            disabled={actionLoading}
            sx={{
              color: theme === 'dark' ? '#ffffff' : '#111827',
              '&:hover': {
                backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6'
              }
            }}
          >
            Cancel
          </MuiButton>
          <MuiButton 
            onClick={handleSubmitAction} 
            variant="contained"
            color={actionType === 'approve' ? 'success' : 'error'}
            disabled={actionLoading || 
                     (actionType === 'reject' && (!reason || reason.length < 10)) ||
                     (actionType === 'approve' && 
                      selectedRequest?.type === 'resource_allocation' && 
                      selectedRequest?.resourceAllocationData?.changes?.some((change: any) => change.type === 'reallocate_room') &&
                      !location.trim())}
            sx={{
              backgroundColor: actionType === 'approve' ? '#10b981' : '#ef4444',
              '&:hover': {
                backgroundColor: actionType === 'approve' ? '#059669' : '#dc2626'
              },
              '&:disabled': {
                backgroundColor: theme === 'dark' ? '#374151' : '#d1d5db'
              }
            }}
          >
            {actionLoading ? 'Processing...' : (actionType === 'approve' ? 'Approve' : 'Reject')}
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* Clarification Dialog */}
      <Dialog 
        open={isClarificationDialogOpen} 
        onClose={() => setIsClarificationDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            color: theme === 'dark' ? '#ffffff' : '#111827',
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'
          }}
        >
          Request Clarification
        </DialogTitle>
        <DialogContent 
          sx={{ 
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'
          }}
        >
          <div className="space-y-4 mt-4">
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                mb: 2
              }}
            >
              Request the user to clarify information about this request.
            </Typography>
            <TextField
              fullWidth
              label="Clarification Request (minimum 10 characters)"
              multiline
              rows={4}
              value={clarificationText}
              onChange={(e) => {
                setClarificationText(e.target.value)
                setError(null)
              }}
              error={clarificationText.length > 0 && clarificationText.length < 10}
              helperText={clarificationText.length > 0 && clarificationText.length < 10 ? 'Clarification request must be at least 10 characters' : ''}
              placeholder="Enter detailed clarification request..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: theme === 'dark' ? '#ffffff' : '#111827',
                  backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
                  '& fieldset': {
                    borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
                  },
                  '&:hover fieldset': {
                    borderColor: theme === 'dark' ? '#6b7280' : '#9ca3af',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme === 'dark' ? '#3b82f6' : '#3b82f6',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: theme === 'dark' ? '#3b82f6' : '#3b82f6',
                },
              }}
            />
          </div>
        </DialogContent>
        <DialogActions 
          sx={{ 
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            padding: '16px 24px'
          }}
        >
          <MuiButton 
            onClick={() => {
              setIsClarificationDialogOpen(false)
              setClarificationText('')
              setError(null)
            }}
            disabled={actionLoading}
            sx={{
              color: theme === 'dark' ? '#ffffff' : '#111827',
              '&:hover': {
                backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6'
              }
            }}
          >
            Cancel
          </MuiButton>
          <MuiButton 
            onClick={handleRequestClarification} 
            variant="contained"
            color="primary"
            disabled={actionLoading || !clarificationText || clarificationText.length < 10}
            sx={{
              backgroundColor: '#3b82f6',
              '&:hover': {
                backgroundColor: '#2563eb'
              },
              '&:disabled': {
                backgroundColor: theme === 'dark' ? '#374151' : '#d1d5db'
              }
            }}
          >
            {actionLoading ? 'Sending...' : 'Send Request'}
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog 
        open={isDetailDialogOpen} 
        onClose={() => setIsDetailDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            color: theme === 'dark' ? '#ffffff' : '#111827',
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'
          }}
        >
          Approval Request Details
        </DialogTitle>
        <DialogContent 
          sx={{ 
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            maxHeight: '70vh',
            overflowY: 'auto'
          }}
        >
          {detailLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading details...
              </p>
            </div>
          ) : selectedRequestDetail ? (
            <div className="space-y-6 mt-4">
              {/* Basic Information */}
              <div>
                <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Basic Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Requester:</span>
                    <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {selectedRequestDetail.requester?.name || 'Unknown'}
                    </span>
                  </div>
                  {selectedRequestDetail.reviewer && (
                    <div className="flex justify-between">
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Reviewer:</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {selectedRequestDetail.reviewer.name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Type:</span>
                    <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {getTypeDisplayName(selectedRequestDetail.type)}
                    </span>
                  </div>
                  {selectedRequestDetail.changeType && (
                    <div className="flex justify-between">
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Change Type:</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {getChangeTypeDisplayName(selectedRequestDetail.changeType)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Status:</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedRequestDetail.status)}`}>
                      {selectedRequestDetail.status === 'pending' ? 'Pending' :
                       selectedRequestDetail.status === 'approved' ? 'Approved' :
                       selectedRequestDetail.status === 'rejected' ? 'Rejected' :
                       selectedRequestDetail.status === 'clarification_requested' ? 'Clarification Requested' :
                       selectedRequestDetail.status === 'escalated' ? 'Escalated' :
                       selectedRequestDetail.status}
                    </span>
                  </div>
                  {selectedRequestDetail.priority && (
                    <div className="flex justify-between">
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Priority:</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(selectedRequestDetail.priority)}`}>
                        {selectedRequestDetail.priority}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Created Date:</span>
                    <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {formatDateTime(selectedRequestDetail.createdAt).date} {formatDateTime(selectedRequestDetail.createdAt).time}
                    </span>
                  </div>
                  {selectedRequestDetail.deadline && (
                    <div className="flex justify-between">
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Deadline:</span>
                      <span className={`font-medium ${selectedRequestDetail.isDeadlinePassed ? 'text-red-600' : selectedRequestDetail.isDeadlineApproaching ? 'text-yellow-600' : theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {formatDateTime(selectedRequestDetail.deadline).date} {formatDateTime(selectedRequestDetail.deadline).time}
                        {selectedRequestDetail.isDeadlinePassed && ' (Overdue)'}
                        {selectedRequestDetail.isDeadlineApproaching && !selectedRequestDetail.isDeadlinePassed && ' (Approaching)'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Title and Description */}
              <div>
                <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Description
                </h3>
                <div className="space-y-2">
                  <div>
                    <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {selectedRequestDetail.title}
                    </span>
                  </div>
                  <div>
                    <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {selectedRequestDetail.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Target Entity Information */}
              {selectedRequestDetail.targetEntity && (
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedRequestDetail.type === 'session_change' ? 'Session Information' :
                     selectedRequestDetail.type === 'content_moderation' ? 'Content Information' :
                     selectedRequestDetail.type === 'resource_allocation' ? 'Allocation Information' :
                     'Entity Information'}
                  </h3>
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} space-y-2`}>
                    {/* Session Information */}
                    {selectedRequestDetail.type === 'session_change' && (
                      <>
                        <div className="flex justify-between">
                          <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Session ID:</span>
                          <span className={`font-mono text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {selectedRequestDetail.targetEntity.id}
                          </span>
                        </div>
                        {selectedRequestDetail.targetEntity.subject && (
                          <div className="flex justify-between">
                            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Subject:</span>
                            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {selectedRequestDetail.targetEntity.subject}
                            </span>
                          </div>
                        )}
                        {selectedRequestDetail.targetEntity.startTime && (
                          <div className="flex justify-between">
                            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Time:</span>
                            <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {formatDateTime(selectedRequestDetail.targetEntity.startTime).date} {formatDateTime(selectedRequestDetail.targetEntity.startTime).time}
                            </span>
                          </div>
                        )}
                        {selectedRequestDetail.targetEntity.status && (
                          <div className="flex justify-between">
                            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Status:</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedRequestDetail.targetEntity.status)}`}>
                              {selectedRequestDetail.targetEntity.status}
                            </span>
                          </div>
                        )}
                        {selectedRequestDetail.targetEntity.studentIds && selectedRequestDetail.targetEntity.studentIds.length > 0 && (
                          <div className="flex justify-between">
                            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Number of Students:</span>
                            <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {selectedRequestDetail.targetEntity.studentIds.length}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Content Information */}
                    {selectedRequestDetail.type === 'content_moderation' && (
                      <>
                        <div className="flex justify-between">
                          <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Type:</span>
                          <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {selectedRequestDetail.targetEntity.contentType === 'post' ? 'Post' : 'Comment'}
                          </span>
                        </div>
                        {selectedRequestDetail.targetEntity.title && (
                          <div className="flex justify-between">
                            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Title:</span>
                            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {selectedRequestDetail.targetEntity.title}
                            </span>
                          </div>
                        )}
                        {selectedRequestDetail.targetEntity.content && (
                          <div className="mt-2">
                            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Content:</span>
                            <div className={`mt-1 p-2 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                {selectedRequestDetail.targetEntity.content}
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedRequestDetail.targetEntity.status && (
                          <div className="flex justify-between">
                            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Status:</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedRequestDetail.targetEntity.status)}`}>
                              {selectedRequestDetail.targetEntity.status === 'pending' ? 'Pending' :
                               selectedRequestDetail.targetEntity.status === 'approved' ? 'Approved' :
                               selectedRequestDetail.targetEntity.status === 'rejected' ? 'Rejected' :
                               selectedRequestDetail.targetEntity.status === 'hidden' ? 'Hidden' :
                               selectedRequestDetail.targetEntity.status}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Resource Allocation Information */}
                    {selectedRequestDetail.type === 'resource_allocation' && (
                      <>
                        {selectedRequestDetail.targetEntity.optimizationPlanId && (
                          <div className="flex justify-between">
                            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Optimization Plan ID:</span>
                            <span className={`font-mono text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {selectedRequestDetail.targetEntity.optimizationPlanId}
                            </span>
                          </div>
                        )}
                        {selectedRequestDetail.targetEntity.affectedTutorIds && selectedRequestDetail.targetEntity.affectedTutorIds.length > 0 && (
                          <div className="flex justify-between">
                            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Affected Tutors:</span>
                            <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {selectedRequestDetail.targetEntity.affectedTutorIds.length}
                            </span>
                          </div>
                        )}
                        {selectedRequestDetail.targetEntity.affectedSessionIds && selectedRequestDetail.targetEntity.affectedSessionIds.length > 0 && (
                          <div className="flex justify-between">
                            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Affected Sessions:</span>
                            <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {selectedRequestDetail.targetEntity.affectedSessionIds.length}
                            </span>
                          </div>
                        )}
                        {selectedRequestDetail.targetEntity.affectedStudentIds && selectedRequestDetail.targetEntity.affectedStudentIds.length > 0 && (
                          <div className="flex justify-between">
                            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Affected Students:</span>
                            <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {selectedRequestDetail.targetEntity.affectedStudentIds.length}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Session Change Details */}
              {selectedRequestDetail.type === 'session_change' && selectedRequestDetail.changeType && (
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Session Change Details
                  </h3>
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} space-y-4`}>
                    <div>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Change Type:
                      </span>
                      <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {getChangeTypeDisplayName(selectedRequestDetail.changeType)}
                      </span>
                    </div>

                    {/* Change Type: change_duration */}
                    {selectedRequestDetail.changeType === 'change_duration' && (
                      <div className="space-y-3">
                        {selectedRequestDetail.originalSessionData && (
                          <div>
                            <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Current Session Information:
                            </h4>
                            <div className={`pl-4 space-y-1 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-3 rounded`}>
                              <div>
                                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Subject:</span>
                                <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {selectedRequestDetail.originalSessionData.subject}
                                </span>
                              </div>
                              <div>
                                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Current Time:</span>
                                <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {formatDateTime(selectedRequestDetail.originalSessionData.startTime).date} {formatDateTime(selectedRequestDetail.originalSessionData.startTime).time}
                                </span>
                              </div>
                              {selectedRequestDetail.originalSessionData.location && (
                                <div>
                                  <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Location:</span>
                                  <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {selectedRequestDetail.originalSessionData.location}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Mode:</span>
                                <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {selectedRequestDetail.originalSessionData.isOnline ? 'Online' : 'Offline'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        {selectedRequestDetail.changeData?.newStartTime && (
                          <div>
                            <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              New Time:
                            </h4>
                            <div className={`pl-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-3 rounded`}>
                              <div>
                                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>New Time:</span>
                                <span className={`ml-2 font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {formatDateTime(selectedRequestDetail.changeData.newStartTime).date} {formatDateTime(selectedRequestDetail.changeData.newStartTime).time}
                                </span>
                              </div>
                              {selectedRequestDetail.changeData.newDuration && (
                                <div>
                                  <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Duration:</span>
                                  <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {selectedRequestDetail.changeData.newDuration} minutes
                                  </span>
                                </div>
                              )}
                              {selectedRequestDetail.originalSessionData && !selectedRequestDetail.originalSessionData.isOnline && (
                                <div className="mt-2 p-2 rounded bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800">
                                  <p className={`text-xs ${theme === 'dark' ? 'text-yellow-200' : 'text-yellow-800'}`}>
                                    ⚠️ Offline session - Room needs to be reallocated
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Change Type: change_location */}
                    {selectedRequestDetail.changeType === 'change_location' && (
                      <div className="space-y-3">
                        {selectedRequestDetail.originalSessionData && (
                          <div>
                            <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Current Information:
                            </h4>
                            <div className={`pl-4 space-y-1 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-3 rounded`}>
                              <div>
                                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Mode:</span>
                                <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {selectedRequestDetail.originalSessionData.isOnline ? 'Online' : 'Offline'}
                                </span>
                              </div>
                              {selectedRequestDetail.originalSessionData.location && (
                                <div>
                                  <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Location:</span>
                                  <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {selectedRequestDetail.originalSessionData.location}
                                  </span>
                                </div>
                              )}
                              {selectedRequestDetail.originalSessionData.meetingLink && (
                                <div>
                                  <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Meeting Link:</span>
                                  <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {selectedRequestDetail.originalSessionData.meetingLink}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {selectedRequestDetail.changeData && (
                          <div>
                            <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Changes:
                            </h4>
                            <div className={`pl-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-3 rounded`}>
                              <div>
                                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>New Mode:</span>
                                <span className={`ml-2 font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {selectedRequestDetail.changeData.newIsOnline ? 'Online' : 'Offline'}
                                </span>
                              </div>
                              {selectedRequestDetail.changeData.newMeetingLink && (
                                <div>
                                  <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>New Meeting Link:</span>
                                  <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {selectedRequestDetail.changeData.newMeetingLink}
                                  </span>
                                </div>
                              )}
                              {selectedRequestDetail.changeData.newLocation && (
                                <div>
                                  <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>New Location:</span>
                                  <span className={`ml-2 font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {selectedRequestDetail.changeData.newLocation}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Change Type: change_type */}
                    {selectedRequestDetail.changeType === 'change_type' && (
                      <div className="space-y-3">
                        {selectedRequestDetail.changeData?.mergeSessionIds && (
                          <div>
                            <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Merge Sessions:
                            </h4>
                            <div className={`pl-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-3 rounded`}>
                              <p className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Merge {selectedRequestDetail.changeData.mergeSessionIds.length} individual sessions into 1 group session
                              </p>
                              <div className="mt-2">
                                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                  Session IDs: {selectedRequestDetail.changeData.mergeSessionIds.join(', ')}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        {selectedRequestDetail.changeData?.splitInto && (
                          <div>
                            <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Split Session:
                            </h4>
                            <div className={`pl-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-3 rounded`}>
                              <p className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Split session into {selectedRequestDetail.changeData.splitInto} individual sessions
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resource Allocation Details */}
              {selectedRequestDetail.type === 'resource_allocation' && selectedRequestDetail.resourceAllocationData && (
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Resource Allocation Details
                  </h3>
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} space-y-4`}>
                    {selectedRequestDetail.resourceAllocationData.optimizationPlanId && (
                      <div>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Optimization Plan ID:
                        </span>
                        <span className={`ml-2 font-mono text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {selectedRequestDetail.resourceAllocationData.optimizationPlanId}
                        </span>
                      </div>
                    )}
                    {selectedRequestDetail.resourceAllocationData.changes && selectedRequestDetail.resourceAllocationData.changes.length > 0 && (
                      <div>
                        <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Changes:
                        </h4>
                        <div className="space-y-2">
                          {selectedRequestDetail.resourceAllocationData.changes.map((change: any, index: number) => {
                            const typeMap: Record<string, string> = {
                              'reassign_tutor': 'Change Tutor',
                              'adjust_group_size': 'Adjust Group Size',
                              'reallocate_room': 'Reallocate Room',
                              'adjust_schedule': 'Adjust Schedule'
                            };
                            return (
                              <div key={index} className={`p-3 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                                <div className="flex justify-between items-start mb-1">
                                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {typeMap[change.type] || change.type}
                                  </span>
                                </div>
                                <div className="text-sm space-y-1">
                                  <div>
                                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Resource ID:</span>
                                    <span className={`ml-2 font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                      {change.resourceId}
                                    </span>
                                  </div>
                                  {change.fromValue && (
                                    <div>
                                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>From:</span>
                                      <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {typeof change.fromValue === 'object' ? JSON.stringify(change.fromValue) : change.fromValue}
                                      </span>
                                    </div>
                                  )}
                                  {change.toValue && (
                                    <div>
                                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>To:</span>
                                      <span className={`ml-2 font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {typeof change.toValue === 'object' ? JSON.stringify(change.toValue) : change.toValue}
                                      </span>
                                    </div>
                                  )}
                                  {change.reason && (
                                    <div>
                                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Reason:</span>
                                      <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {change.reason}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Content Moderation Details */}
              {selectedRequestDetail.type === 'content_moderation' && selectedRequestDetail.contentModerationData && (
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Content Moderation Details
                  </h3>
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} space-y-4`}>
                    <div>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Content Type:
                      </span>
                      <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {selectedRequestDetail.contentModerationData.contentType === 'post' ? 'Post' : 'Comment'}
                      </span>
                    </div>
                    {selectedRequestDetail.contentModerationData.violationType && (
                      <div>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Violation Type:
                        </span>
                        <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {selectedRequestDetail.contentModerationData.violationType === 'spam' ? 'Spam' :
                           selectedRequestDetail.contentModerationData.violationType === 'inappropriate' ? 'Inappropriate' :
                           selectedRequestDetail.contentModerationData.violationType === 'harassment' ? 'Harassment' :
                           selectedRequestDetail.contentModerationData.violationType === 'false_information' ? 'False Information' :
                           'Other'}
                        </span>
                      </div>
                    )}
                    {selectedRequestDetail.contentModerationData.severity && (
                      <div>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Severity:
                        </span>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                          selectedRequestDetail.contentModerationData.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          selectedRequestDetail.contentModerationData.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          selectedRequestDetail.contentModerationData.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {selectedRequestDetail.contentModerationData.severity}
                        </span>
                      </div>
                    )}
                    {selectedRequestDetail.contentModerationData.contentPreview && (
                      <div>
                        <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Content Preview:
                        </h4>
                        <div className={`p-3 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {selectedRequestDetail.contentModerationData.contentPreview}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedRequestDetail.contentModerationData.reportedBy && selectedRequestDetail.contentModerationData.reportedBy.length > 0 && (
                      <div>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Reported by:
                        </span>
                        <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {selectedRequestDetail.contentModerationData.reportedBy.length} users
                        </span>
                      </div>
                    )}
                    {selectedRequestDetail.contentModerationData.reportReasons && selectedRequestDetail.contentModerationData.reportReasons.length > 0 && (
                      <div>
                        <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Report Reasons:
                        </h4>
                        <ul className={`list-disc list-inside space-y-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {selectedRequestDetail.contentModerationData.reportReasons.map((reason: string, index: number) => (
                            <li key={index} className="text-sm">{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Review Notes */}
              {selectedRequestDetail.reviewNotes && (
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Review Notes
                  </h3>
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {selectedRequestDetail.reviewNotes}
                    </p>
                  </div>
                </div>
              )}

              {/* Clarification Request */}
              {selectedRequestDetail.clarificationRequest && (
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Clarification Request
                  </h3>
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'} border ${theme === 'dark' ? 'border-blue-800' : 'border-blue-200'}`}>
                    <p className={`${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                      {selectedRequestDetail.clarificationRequest}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
        <DialogActions 
          sx={{ 
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            padding: '16px 24px'
          }}
        >
          <MuiButton 
            onClick={() => setIsDetailDialogOpen(false)}
            sx={{
              color: theme === 'dark' ? '#ffffff' : '#111827',
              '&:hover': {
                backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6'
              }
            }}
          >
            Close
          </MuiButton>
          {selectedRequestDetail && (selectedRequestDetail.status === 'pending' || selectedRequestDetail.status === 'clarification_requested') && (
            <>
              <MuiButton 
                onClick={() => {
                  setIsDetailDialogOpen(false)
                  handleAction(selectedRequestDetail, 'approve')
                }}
                variant="contained"
                color="success"
                sx={{
                  backgroundColor: '#10b981',
                  '&:hover': {
                    backgroundColor: '#059669'
                  }
                }}
              >
                Approve
              </MuiButton>
              <MuiButton 
                onClick={() => {
                  setIsDetailDialogOpen(false)
                  handleAction(selectedRequestDetail, 'reject')
                }}
                variant="contained"
                color="error"
                sx={{
                  backgroundColor: '#ef4444',
                  '&:hover': {
                    backgroundColor: '#dc2626'
                  }
                }}
              >
                Reject
              </MuiButton>
            </>
          )}
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default ApprovalRequests
