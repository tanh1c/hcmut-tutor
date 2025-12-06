import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../../components/ui/Button'
import { Avatar } from '@mui/material'
import { useLongPolling } from '../../hooks/useLongPolling'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { conversationsAPI, usersAPI, authAPI, studentsAPI, uploadAPI } from '../../lib/api'
import { formatDistanceToNow } from 'date-fns'
import { EmojiPickerComponent } from '../../components/EmojiPicker.tsx'
import { getInitials, getAvatarColor } from '../../utils/avatarUtils'
import { ConversationListItem } from '../../components/messages/ConversationListItem'
import { MessageBubble } from '../../components/messages/MessageBubble'
import { ActiveUsersSection } from '../../components/messages/ActiveUsersSection'
import {
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  Autorenew as AutorenewIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  MoreVert as MoreVertIcon,
  Menu as MenuIcon,
  BarChart as BarChartIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  VideoCall as VideoCallIcon,
  Chat as ChatIcon,
  Palette as PaletteIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  MoreHoriz as MoreHorizIcon,
  OnlinePrediction as OnlinePredictionIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Language as LanguageIcon
} from '@mui/icons-material'

const Messages: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [currentLang, setCurrentLang] = useState(i18n.language)
  const [activeMenu, setActiveMenu] = useState('messages')
  
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    setCurrentLang(lang)
  }

  useEffect(() => {
    setCurrentLang(i18n.language)
  }, [i18n.language])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showThemeOptions, setShowThemeOptions] = useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [conversations, setConversations] = useState<any[]>([])
  const [users, setUsers] = useState<Record<string, any>>({})
  const [usersLoaded, setUsersLoaded] = useState(0) // Track when users are loaded to force re-render
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [searchUserQuery, setSearchUserQuery] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [activeUsers, setActiveUsers] = useState<any[]>([])
  const [loadingActiveUsers, setLoadingActiveUsers] = useState(false)
  const [showConversationMenu, setShowConversationMenu] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const previousConversationIdRef = useRef<string | null>(null)
  const isLoadingActiveUsersRef = useRef(false)
  const activeUsersIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const activeUsersTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastOnlineUsersRef = useRef<Set<string>>(new Set())
  const usersListCacheRef = useRef<any[]>([]) // Cache users list to avoid repeated fetches
  const usersListCacheTimeRef = useRef<number>(0) // Cache timestamp
  const USERS_CACHE_DURATION = 10 * 60 * 1000 // Cache users for 10 minutes (tăng từ 5 phút)

  // Online Status Hook - Track which users are online via WebSocket
  const { onlineUsers, isUserOnline, isConnected: isWebSocketConnected } = useOnlineStatus({ enabled: true })

  // Debounce reload conversations to avoid too many API calls
  // Optimized for 2-3 users testing - reduced frequency to prevent lag
  const reloadConversationsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastReloadTimeRef = useRef<number>(0)
  const reloadConversations = useCallback(async (force: boolean = false) => {
    // Prevent too frequent reloads - only reload at most once every 8 seconds (increased from 5)
    const now = Date.now()
    if (!force && now - lastReloadTimeRef.current < 8000) {
      return // Skip reload if less than 8 seconds since last reload
    }
    
    // Clear existing timeout
    if (reloadConversationsTimeoutRef.current) {
      clearTimeout(reloadConversationsTimeoutRef.current)
    }
    
    // Debounce: only reload after 5 seconds of no new messages (increased from 3 seconds)
    // Reduced frequency for better performance when testing with 2-3 users
    reloadConversationsTimeoutRef.current = setTimeout(async () => {
      try {
        lastReloadTimeRef.current = Date.now()
        const response = await conversationsAPI.list()
        if (response.success && response.data) {
          const conversationsData = Array.isArray(response.data) ? response.data : []
          // Update conversations without showing loading indicator
          setConversations(prev => {
            // Only update if data actually changed to prevent unnecessary re-renders
            if (JSON.stringify(prev) !== JSON.stringify(conversationsData)) {
              return conversationsData
            }
            return prev
          })
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to reload conversations:', error)
        }
      }
    }, force ? 0 : 5000) // Wait 5 seconds before reloading (increased from 3 seconds)
  }, [])

  // Long Polling Hook
  const { messages, isPolling, isConnected, sendMessage, loadHistory } = useLongPolling({
    conversationId: selectedConversationId,
    enabled: !!selectedConversationId,
    onMessage: (message) => {
      // Only reload conversations if message is from a different conversation
      // This prevents unnecessary reloads when viewing the active conversation
      if (message.conversationId !== selectedConversationId) {
        // Message from another conversation - reload list to update lastMessage
        reloadConversations()
      }
      // If message is from current conversation, no need to reload conversations list
      // The message is already displayed via polling
    },
    onError: (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Polling error:', error)
      }
    },
    onConversationNotFound: (conversationId) => {
      // Conversation không tồn tại hoặc đã bị xóa
      console.warn('[Tutor Messages] Conversation not found:', conversationId);
      // Clear selected conversation và reload conversations list
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
      }
      // Reload conversations list để sync lại
      reloadConversations(true);
    }
  })

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      setIsCheckingAuth(true)
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          console.log('No token found, redirecting to login')
          setIsCheckingAuth(false)
          setTimeout(() => navigate('/login'), 100)
          return
        }
        
        const response = await authAPI.getMe()
        if (response.success && response.data) {
          const user = response.data
          // Kiểm tra role - chỉ cho phép tutor truy cập
          if (user.role !== 'tutor') {
            console.log(`User role is ${user.role}, redirecting to appropriate dashboard`)
            setIsCheckingAuth(false)
            // Redirect về dashboard tương ứng với role
            if (user.role === 'student') {
              setTimeout(() => navigate('/student'), 100)
            } else if (user.role === 'management') {
              setTimeout(() => navigate('/management'), 100)
            } else {
              setTimeout(() => navigate('/login'), 100)
            }
            return
          }
          setCurrentUser(user)
          setIsCheckingAuth(false)
        } else {
          console.log('Invalid token, redirecting to login')
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setIsCheckingAuth(false)
          setTimeout(() => navigate('/login'), 100)
        }
      } catch (error) {
        console.error('Failed to load current user:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setIsCheckingAuth(false)
        setTimeout(() => navigate('/login'), 100)
      }
    }
    loadCurrentUser()
  }, [navigate])

  // Track if this is the first load
  const isFirstLoadRef = useRef(true)
  const usersRef = useRef<Record<string, any>>({})
  
  // Load conversations
  useEffect(() => {
    const loadConversations = async (showLoading: boolean = false) => {
      try {
        if (showLoading) {
          setLoading(true)
        }
        const response = await conversationsAPI.list()
        
        if (response.success && response.data) {
          const conversationsData = Array.isArray(response.data) ? response.data : []
          
          // Load user info for all participants FIRST (before setting conversations)
          // This ensures names are displayed immediately instead of "User xxx"
          const allUserIds = new Set<string>()
          conversationsData.forEach((conv: any) => {
            if (conv.participants && Array.isArray(conv.participants)) {
              conv.participants.forEach((id: string) => {
                if (!usersRef.current[id]) {
                  allUserIds.add(id)
                }
              })
            }
          })
          
          // Load all users FIRST using batch API (much faster than multiple individual calls)
          // This prevents showing "User xxx" placeholder
          let finalUsersMap: Record<string, any> = { ...usersRef.current }
          
          if (allUserIds.size > 0) {
            try {
              // Load all users from API (similar to dashboard)
              const usersResponse = await usersAPI.list({ limit: 1000 })
              
              // Parse response - handle different formats like dashboard does
              let usersList: any[] = []
              
              if (usersResponse && Array.isArray(usersResponse)) {
                usersList = usersResponse
              } else if (usersResponse.success && usersResponse.data) {
                if (Array.isArray(usersResponse.data)) {
                  usersList = usersResponse.data
                } else if (usersResponse.data.data && Array.isArray(usersResponse.data.data)) {
                  usersList = usersResponse.data.data
                }
              } else if (usersResponse.data && Array.isArray(usersResponse.data)) {
                // Paginated response: { data: [...], pagination: {...} }
                usersList = usersResponse.data
              } else if (usersResponse.data && usersResponse.data.data && Array.isArray(usersResponse.data.data)) {
                usersList = usersResponse.data.data
              }
              
              // Filter to only participants and convert to map
              const participantIds = Array.from(allUserIds)
              usersList.forEach((user: any) => {
                if (user && user.id && participantIds.includes(user.id)) {
                  finalUsersMap[user.id] = user
                }
                })
              
              // If some users are still missing, load them individually
              const missingIds = participantIds.filter(id => !finalUsersMap[id])
              if (missingIds.length > 0) {
                const userPromises = missingIds.map(async (userId) => {
                  try {
                    const userResponse = await usersAPI.get(userId)
                    if (userResponse.success && userResponse.data) {
                      return [userId, userResponse.data]
                    } else if (userResponse.data) {
                      // Handle case where data is directly in response
                      return [userId, userResponse.data]
              }
            } catch (error) {
              if (process.env.NODE_ENV === 'development') {
                      console.error(`[Messages] Failed to load user ${userId}:`, error)
                    }
                  }
                  return null
                })
                
                const userResults = await Promise.all(userPromises)
                userResults.forEach(result => {
                  if (result) {
                    finalUsersMap[result[0]] = result[1]
                  }
                })
              }
            } catch (error) {
              if (process.env.NODE_ENV === 'development') {
                console.error('[Messages] Failed to load users:', error)
              }
              // Fallback to individual loading if batch fails
            const userPromises = Array.from(allUserIds).map(async (userId) => {
              try {
                const userResponse = await usersAPI.get(userId)
                if (userResponse.success && userResponse.data) {
                    return [userId, userResponse.data]
                  } else if (userResponse.data) {
                  return [userId, userResponse.data]
                }
              } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                  console.error(`[Messages] Failed to load user ${userId}:`, error)
                }
              }
              return null
            })
            
            const userResults = await Promise.all(userPromises)
              userResults.forEach(result => {
                if (result) {
                  finalUsersMap[result[0]] = result[1]
                }
              })
            }
          }
          
          // Update usersRef FIRST for immediate access
          usersRef.current = finalUsersMap
          
          // Only update users state if data actually changed to prevent unnecessary re-renders
          let usersChanged = false
          setUsers(prevUsers => {
            // Check if users actually changed
            const prevUsersJson = JSON.stringify(prevUsers)
            const newUsersJson = JSON.stringify(finalUsersMap)
            if (prevUsersJson !== newUsersJson) {
              usersChanged = true
              return finalUsersMap
            }
            return prevUsers // Return same reference to prevent re-render
          })
          
          // Only update usersLoaded if users actually changed
          if (usersChanged) {
            setUsersLoaded(prev => prev + 1) // Force re-render when users are loaded
          }
          
          setConversations(conversationsData)
        } else {
          setConversations([])
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Messages] Failed to load conversations:', error)
        }
        setConversations([])
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
    }
    
    // Only load if currentUser is available
    if (currentUser) {
      // Show loading only on first load
      loadConversations(isFirstLoadRef.current)
      isFirstLoadRef.current = false
      
      // Refresh conversations every 90 seconds (increased from 60 to reduce reloads)
      // Don't show loading on refresh - optimized for 2-3 users testing
      const interval = setInterval(() => loadConversations(false), 90000)
      return () => clearInterval(interval)
    } else {
      // If no currentUser yet, set loading to false to show the page
      // (user will be redirected if not authenticated)
      setLoading(false)
    }
  }, [currentUser])

  // Load active users for "Active Now" section
  // Fixed: Prevent infinite loop by using refs and debouncing
  useEffect(() => {
    // Clear any existing timeouts/intervals
    if (activeUsersTimeoutRef.current) {
      clearTimeout(activeUsersTimeoutRef.current)
      activeUsersTimeoutRef.current = null
    }
    if (activeUsersIntervalRef.current) {
      clearInterval(activeUsersIntervalRef.current)
      activeUsersIntervalRef.current = null
    }

    const loadActiveUsers = async (useCache: boolean = true) => {
      // Prevent multiple simultaneous calls
      if (isLoadingActiveUsersRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Tutor Messages] Active users already loading, skipping...')
        }
        return
      }
      
      if (!currentUser) {
        setActiveUsers([])
        return
      }
      
      try {
        isLoadingActiveUsersRef.current = true
        setLoadingActiveUsers(true)
        
        // Check cache first to avoid unnecessary API calls
        let usersList: any[] = []
        const now = Date.now()
        const cacheValid = useCache && 
          usersListCacheRef.current.length > 0 && 
          (now - usersListCacheTimeRef.current) < USERS_CACHE_DURATION
        
        if (cacheValid) {
          // Use cached users list
          usersList = usersListCacheRef.current
          if (process.env.NODE_ENV === 'development') {
            console.log('[Tutor Messages] Using cached users list')
          }
        } else {
          // Load all users from API (only when cache is invalid)
        const response = await usersAPI.list({ limit: 100 })
        
        // Handle different response formats
        if (response && Array.isArray(response)) {
          usersList = response
        } else if (response.success && response.data) {
          if (Array.isArray(response.data)) {
            usersList = response.data
          } else if (response.data.data && Array.isArray(response.data.data)) {
            usersList = response.data.data
          }
        } else if (response.data && Array.isArray(response.data)) {
          usersList = response.data
          }
          
          // Update cache
          usersListCacheRef.current = usersList
          usersListCacheTimeRef.current = now
        }
        
        // Filter: only show tutors and students, exclude current user and admin/management
        const currentUserId = currentUser?.userId || currentUser?.id || ''
        const otherUsers = usersList.filter((user: any) => {
          if (!user || !user.id || user.id === currentUserId) return false
          // Only show tutors and students, exclude admin and management
          return user.role === 'tutor' || user.role === 'student'
        })
        
        // Determine active users - Chỉ hiển thị users đang online (connected via WebSocket)
        // Không dựa vào message, chỉ dựa vào online status thực sự
        const activeUsersList = otherUsers
          .filter(user => isUserOnline(user.id)) // Chỉ lấy users đang online
          .map(user => {
            return {
              ...user,
              isActive: true, // Tất cả users trong list này đều online
              lastActivity: new Date().toISOString(), // Current time since they're online
              lastActivityTime: Date.now()
            }
          })
          .sort((a, b) => {
            // Sort by last activity time (most recent first)
            if (a.lastActivityTime && b.lastActivityTime) {
              return b.lastActivityTime - a.lastActivityTime
            }
            if (a.lastActivityTime && !b.lastActivityTime) return -1
            if (!a.lastActivityTime && b.lastActivityTime) return 1
            // Sort alphabetically by name
            const nameA = (a.name || a.email || '').toLowerCase()
            const nameB = (b.name || b.email || '').toLowerCase()
            return nameA.localeCompare(nameB)
          })
          .slice(0, 12) // Show top 12 active users
        
        // Only update state if active users actually changed
        setActiveUsers(prevActiveUsers => {
          const prevIds = new Set(prevActiveUsers.map(u => u.id).sort())
          const newIds = new Set(activeUsersList.map(u => u.id).sort())
          if (prevIds.size !== newIds.size || 
              Array.from(prevIds).some(id => !newIds.has(id))) {
            return activeUsersList
          }
          return prevActiveUsers // Return same reference to prevent re-render
        })
        
        // Update last known online users
        lastOnlineUsersRef.current = new Set(activeUsersList.map(u => u.id))
      } catch (error) {
        console.error('[Tutor Messages] Failed to load active users:', error)
        // Don't clear on error to prevent UI flickering
        // Only clear if this is the first load
        if (activeUsers.length === 0) {
          setActiveUsers([])
        }
      } finally {
        setLoadingActiveUsers(false)
        isLoadingActiveUsersRef.current = false
      }
    }
    
    // Check if onlineUsers actually changed (chỉ update khi có thay đổi thực sự)
    const currentOnlineUsersSet = new Set<string>(onlineUsers || [])
    const onlineUsersChanged = 
      currentOnlineUsersSet.size !== lastOnlineUsersRef.current.size ||
      Array.from(currentOnlineUsersSet).some((id: string) => !lastOnlineUsersRef.current.has(id)) ||
      Array.from(lastOnlineUsersRef.current).some((id: string) => !currentOnlineUsersSet.has(id))
    
    // Update last known online users ngay lập tức (không cần đợi API)
    if (onlineUsersChanged) {
      lastOnlineUsersRef.current = currentOnlineUsersSet
      
      // Nếu đã có activeUsers, chỉ cần update online status (không cần gọi API)
      if (activeUsers.length > 0 && usersListCacheRef.current.length > 0) {
        // Update active users list dựa trên onlineUsers hiện tại (không cần gọi API)
        const updatedActiveUsers = activeUsers.map(user => ({
          ...user,
          isActive: isUserOnline(user.id),
          lastActivity: isUserOnline(user.id) ? new Date().toISOString() : user.lastActivity,
          lastActivityTime: isUserOnline(user.id) ? Date.now() : user.lastActivityTime
        })).filter(user => user.isActive) // Chỉ giữ users đang online
        
        // Chỉ update state nếu có thay đổi
        setActiveUsers(prev => {
          const prevIds = new Set(prev.map(u => u.id).sort())
          const newIds = new Set(updatedActiveUsers.map(u => u.id).sort())
          if (prevIds.size !== newIds.size || 
              Array.from(prevIds).some(id => !newIds.has(id))) {
            return updatedActiveUsers
          }
          return prev // Return same reference to prevent re-render
        })
      }
    }
    
    // Chỉ load từ API khi:
    // 1. Chưa có active users (lần đầu load)
    // 2. Cache đã hết hạn (sau 5 phút)
    // 3. Chưa có users list trong cache
    const now = Date.now()
    const cacheExpired = (now - usersListCacheTimeRef.current) > USERS_CACHE_DURATION
    const needsInitialLoad = activeUsers.length === 0 && usersListCacheRef.current.length === 0
    
    if (currentUser && (needsInitialLoad || cacheExpired)) {
      // Clear timeout trước nếu có
      if (activeUsersTimeoutRef.current) {
        clearTimeout(activeUsersTimeoutRef.current)
      }
      
      // Debounce: wait 2 seconds before loading to prevent rapid calls
      activeUsersTimeoutRef.current = setTimeout(() => {
        if (!isLoadingActiveUsersRef.current) {
          // Chỉ gọi API khi cache hết hạn hoặc chưa có data
          const useCache = !cacheExpired && usersListCacheRef.current.length > 0
          loadActiveUsers(useCache)
        }
      }, 2000) // 2 seconds debounce
    }
    
    // Set up interval for periodic refresh (only if we have currentUser)
    // Increased to 10 minutes to reduce load - users list doesn't change often
    // Online status được update real-time qua WebSocket, không cần poll API
    if (currentUser) {
      activeUsersIntervalRef.current = setInterval(() => {
        if (!isLoadingActiveUsersRef.current) {
          // Chỉ refresh khi cache đã hết hạn
          const now = Date.now()
          const cacheExpired = (now - usersListCacheTimeRef.current) > USERS_CACHE_DURATION
          if (cacheExpired) {
            // Use cache for periodic refresh (only refresh online status)
            loadActiveUsers(true) // Use cache - only filter by online status
          }
        }
      }, 600000) // Refresh every 10 minutes (chỉ khi cache hết hạn)
    }
    
    return () => {
      if (activeUsersTimeoutRef.current) {
        clearTimeout(activeUsersTimeoutRef.current)
        activeUsersTimeoutRef.current = null
      }
      if (activeUsersIntervalRef.current) {
        clearInterval(activeUsersIntervalRef.current)
        activeUsersIntervalRef.current = null
      }
    }
  }, [currentUser, onlineUsers, isUserOnline]) // Removed 'conversations' - it causes infinite loop

  // Note: loadHistory is automatically called by useLongPolling hook when conversationId changes
  // No need to call it manually here to avoid duplicate calls

  // Scroll to bottom ONLY ONCE when opening a conversation (first time)
  // After that, let user scroll manually
  useEffect(() => {
    // Check if conversation actually changed
    const conversationChanged = previousConversationIdRef.current !== selectedConversationId
    
    if (!conversationChanged || !selectedConversationId) {
      // Same conversation or no conversation - don't scroll, let user control
      return
    }
    
    // Conversation changed - update ref immediately
    previousConversationIdRef.current = selectedConversationId
    
    // Scroll to bottom ONCE when opening conversation
    let scrollTimeout: NodeJS.Timeout | null = null
    let checkInterval: NodeJS.Timeout | null = null
    let hasScrolled = false
    
    const performScroll = () => {
      if (hasScrolled || !messagesContainerRef.current) return
      
      const container = messagesContainerRef.current
      
      // Only scroll if there are messages or content to scroll to
      if (container.scrollHeight > container.clientHeight) {
        hasScrolled = true
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'auto'
        })
      }
    }
    
    // Try to scroll after a short delay to ensure DOM is ready
    scrollTimeout = setTimeout(() => {
      performScroll()
      
      // If no content yet, wait for it with interval (check less frequently)
      if (!hasScrolled) {
        checkInterval = setInterval(() => {
          if (messagesContainerRef.current) {
            const container = messagesContainerRef.current
            if (container.scrollHeight > container.clientHeight) {
              clearInterval(checkInterval!)
              checkInterval = null
              if (!hasScrolled) {
                performScroll()
              }
            }
          }
        }, 300) // Check every 300ms to reduce overhead
        
        // Clear interval after 2 seconds
        setTimeout(() => {
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
        }, 2000)
      }
    }, 400) // Delay to ensure messages are rendered
    
    // Cleanup
    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout)
      if (checkInterval) clearInterval(checkInterval)
    }
  }, [selectedConversationId]) // ONLY depend on conversationId to avoid re-renders

  // Close emoji picker when clicking outside - MUST be before useMemo hooks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])


  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, path: '/tutor' },
    { id: 'availability', label: 'Set Availability', icon: <ScheduleIcon />, path: '/tutor/availability' },
    { id: 'sessions', label: 'Manage Sessions', icon: <AssignmentIcon />, path: '/tutor/sessions' },
    { id: 'progress', label: 'Track Progress', icon: <BarChartIcon />, path: '/tutor/track-progress' },
    { id: 'cancel-reschedule', label: 'Cancel/Reschedule', icon: <AutorenewIcon />, path: '/tutor/cancel-reschedule' },
    { id: 'messages', label: 'Messages', icon: <ChatIcon />, path: '/tutor/messages' }
  ]

  // IMPORTANT: All hooks must be called BEFORE any conditional returns
  // Memoize formatted conversations to avoid re-computing on every render
  // Format conversation inline to avoid useCallback dependency issues
  // Use Object.keys(users).length as dependency instead of users object to avoid reference issues
  const usersKeysLength = Object.keys(users).length
    const currentUserId = currentUser?.userId || currentUser?.id || ''
  
  const formattedConversations = useMemo(() => {
    if (!currentUser) return []
    
    return conversations.map((conversation: any) => {
      const otherId = conversation.participants?.find((id: string) => id !== currentUserId)
      // Use users state directly instead of usersRef to ensure it updates immediately
      const otherUser = otherId ? users[otherId] : null
    const lastMessage = conversation.lastMessage
    const unreadCount = conversation.unreadCount?.[currentUserId] || 0
    
    // Get other participant ID even if user info not loaded yet
    // Get display name from user data - prioritize name, then email, fallback to loading state
    // Don't show "User xxx" - show loading or email instead
    const displayName = otherUser?.name || otherUser?.email || (otherId ? 'Loading...' : 'Unknown')
    
    return {
      id: conversation.id,
      name: displayName,
      type: otherUser?.role || 'user',
      lastMessage: lastMessage?.content || 'No messages yet',
      time: lastMessage?.createdAt 
        ? formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })
        : 'No messages',
      unread: unreadCount,
      online: false, // TODO: Implement online status
      avatar: getInitials(displayName),
      subject: otherUser?.subjects?.[0] || otherUser?.preferredSubjects?.[0] || 'General',
      otherUser,
      otherId
    }
    })
  }, [conversations, conversations.length, currentUserId, users, usersKeysLength, usersLoaded, currentUser])
  
  // Memoize filtered conversations to avoid re-filtering on every render
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return formattedConversations
    const query = searchQuery.toLowerCase()
    return formattedConversations.filter(conv =>
      conv.name.toLowerCase().includes(query) ||
      conv.subject.toLowerCase().includes(query)
    )
  }, [formattedConversations, searchQuery])
  
  // Memoize selected conversation
  const selectedConversation = useMemo(() => {
    return formattedConversations.find(c => c.id === selectedConversationId)
  }, [formattedConversations, selectedConversationId])

  // Show loading screen while checking authentication (AFTER all hooks)
  if (isCheckingAuth || !currentUser) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={`text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {isCheckingAuth ? t('messages.loading') : t('messages.loading')}
          </p>
        </div>
      </div>
    )
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleMenuClick = (item: any) => {
    setActiveMenu(item.id)
    if (item.path) {
      navigate(item.path)
    }
  }

  const handleThemeToggle = () => {
    toggleTheme()
    setShowThemeOptions(false)
  }

  // Load available users (all users: students, tutors, management)
  const loadAvailableUsers = async () => {
    try {
      setLoadingUsers(true)
      
      // Check cache first to avoid unnecessary API calls
      const now = Date.now()
      const cacheValid = usersListCacheRef.current.length > 0 && 
        (now - usersListCacheTimeRef.current) < USERS_CACHE_DURATION
      
      let usersList: any[] = []
      
      if (cacheValid) {
        // Use cached users list
        usersList = usersListCacheRef.current
        if (process.env.NODE_ENV === 'development') {
          console.log('[Tutor Messages] Using cached users list for available users')
        }
      } else {
      // Load all users (students, tutors, management) - không filter theo role
      const response = await usersAPI.list({ limit: 100 })
      
      // Handle different response formats
      // API returns: { data: [...], pagination: {...} } OR { success: true, data: [...] }
      if (response && Array.isArray(response)) {
        // Direct array response
        usersList = response
      } else if (response.success && response.data) {
        // Wrapped in success response
        if (Array.isArray(response.data)) {
          usersList = response.data
        } else if (response.data.data && Array.isArray(response.data.data)) {
          usersList = response.data.data
        }
      } else if (response.data && Array.isArray(response.data)) {
        // Paginated response: { data: [...], pagination: {...} }
        usersList = response.data
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        usersList = response.data.data
        }
        
        // Update cache
        usersListCacheRef.current = usersList
        usersListCacheTimeRef.current = now
      }
      
      if (usersList.length > 0) {
        const currentUserId = currentUser?.userId || currentUser?.id || ''
        // Filter: only show tutors and students, exclude current user and admin/management
        const filteredUsers = usersList.filter((user: any) => {
          if (!user || !user.id || user.id === currentUserId) return false
          // Only show tutors and students, exclude admin and management
          return user.role === 'tutor' || user.role === 'student'
        })
        setAvailableUsers(filteredUsers)
      } else {
        console.warn('[Tutor Messages] No users found in usersList')
        setAvailableUsers([])
      }
    } catch (error) {
      console.error('[Tutor Messages] Failed to load available users:', error)
      setAvailableUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  // Create new conversation or open existing one
  const handleCreateConversation = async (userId: string) => {
    try {
      setCreatingConversation(true)
      
      // Kiểm tra xem đã có conversation với user này chưa
      const existingConversation = conversations.find((conv: any) => 
        conv.participants && conv.participants.includes(userId)
      )
      
      if (existingConversation) {
        // Đã có conversation - mở conversation đó
        setSelectedConversationId(existingConversation.id)
        setShowNewConversationModal(false)
        setSearchUserQuery('')
        setCreatingConversation(false)
        return
      }
      
      // Chưa có conversation - tạo mới
      const response = await conversationsAPI.create({
        participantIds: [userId]
      })
      
      if (response.success && response.data) {
        // Reload conversations and all user info
        const loadConversations = async () => {
          try {
            const convResponse = await conversationsAPI.list()
            if (convResponse.success && convResponse.data) {
              const conversationsData = Array.isArray(convResponse.data) ? convResponse.data : []
              setConversations(conversationsData)
              
              // Load user info for ALL participants in ALL conversations
              const allUserIds = new Set<string>()
              conversationsData.forEach((conv: any) => {
                if (conv.participants && Array.isArray(conv.participants)) {
                  conv.participants.forEach((id: string) => allUserIds.add(id))
                }
              })
              
              // Load users in parallel
              const userPromises = Array.from(allUserIds).map(async (userId) => {
                try {
                  const userResponse = await usersAPI.get(userId)
                  if (userResponse.success && userResponse.data) {
                    return [userId, userResponse.data]
                  }
                } catch (error) {
                  console.error(`Failed to load user ${userId}:`, error)
                }
                return null
              })
              
              const userResults = await Promise.all(userPromises)
              const usersMap: Record<string, any> = {}
              userResults.forEach(result => {
                if (result) {
                  usersMap[result[0]] = result[1]
                }
              })
              
              // Only update users state if data actually changed
              setUsers(prevUsers => {
                const prevUsersJson = JSON.stringify(prevUsers)
                const newUsersJson = JSON.stringify(usersMap)
                if (prevUsersJson !== newUsersJson) {
                  return usersMap
                }
                return prevUsers // Return same reference to prevent re-render
              })
            }
          } catch (error) {
            console.error('Failed to reload conversations:', error)
          }
        }
        await loadConversations()
        
        // Select the new conversation
        setSelectedConversationId(response.data.id)
        setShowNewConversationModal(false)
        setSearchUserQuery('')
      } else {
        alert(t('messages.failedToCreate', { error: response.error || 'Unknown error' }))
      }
    } catch (error: any) {
      console.error('Failed to create conversation:', error)
      alert(t('messages.failedToCreate', { error: error.message || 'Unknown error' }))
    } finally {
      setCreatingConversation(false)
    }
  }

  // Open new conversation modal
  const handleOpenNewConversation = () => {
    setShowNewConversationModal(true)
    // Always reload users to ensure latest data
      loadAvailableUsers()
  }

  // Delete conversation (hide for current user only)
  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm(t('messages.deleteConversation'))) {
      return
    }

    try {
      const response = await conversationsAPI.delete(conversationId)
      if (response.success) {
        // Reload conversations
        const loadConversations = async () => {
          try {
            const response = await conversationsAPI.list()
            if (response.success && response.data) {
              const conversationsData = Array.isArray(response.data) ? response.data : []
              setConversations(conversationsData)
            }
          } catch (error) {
            console.error('Failed to reload conversations:', error)
          }
        }
        await loadConversations()
        
        // Clear selected conversation if it was deleted
        if (selectedConversationId === conversationId) {
          setSelectedConversationId(null)
        }
        setShowConversationMenu(null)
      }
    } catch (error: any) {
      console.error('Failed to delete conversation:', error)
      alert(t('messages.failedToDelete', { error: error.message || 'Unknown error' }))
    }
  }

  const handleSendMessage = async () => {
    console.log('[Tutor Messages] 📤 handleSendMessage called:', {
      newMessage: newMessage.substring(0, 50),
      selectedFile: !!selectedFile,
      sending,
      uploadingFile,
      selectedConversationId
    });
    
    if ((!newMessage.trim() && !selectedFile) || sending || uploadingFile) {
      console.log('[Tutor Messages] ⚠️ Cannot send message:', {
        emptyMessage: !newMessage.trim(),
        noFile: !selectedFile,
        sending,
        uploadingFile
      });
      return;
    }
    
    // If no conversation selected, we need to create one first
    if (!selectedConversationId) {
      alert(t('messages.selectConversation'))
      return
    }

    // If file is selected, upload it first
    if (selectedFile) {
      await handleFileUpload()
      return
    }
    
    const messageContent = newMessage.trim()
    if (!messageContent) {
      console.log('[Tutor Messages] ⚠️ Empty message content');
      return;
    }

    try {
      console.log('[Tutor Messages] ✅ Sending message:', messageContent.substring(0, 50));
      setSending(true)
      setNewMessage('') // Clear input immediately for better UX
      
      await sendMessage(messageContent)
      console.log('[Tutor Messages] ✅ Message sent successfully');
      
      // Optimistic message đã được thêm vào state ngay lập tức
      // Socket.io sẽ gửi event 'new-message' để thay thế optimistic message
      // KHÔNG cần gọi loadHistory() vì sẽ làm chậm và có thể override optimistic message
      // Chỉ reload history nếu message không xuất hiện sau 5 giây (fallback)
      setTimeout(async () => {
        // Kiểm tra lại sau 5 giây - nếu vẫn không có thì reload (trường hợp socket.io fail)
        const messageExists = messages.some(m => 
          m.content === messageContent && 
          (m.id.startsWith('temp_') || new Date(m.createdAt).getTime() > Date.now() - 6000)
        )
        if (!messageExists) {
          console.log('[Messages] ⚠️ Message not found after 5s, reloading history as fallback')
          await loadHistory()
        }
      }, 5000) // Tăng lên 5 giây để đợi Socket.io event
      
      // Reload conversations list to update lastMessage (debounced, won't reload if recent)
      reloadConversations()
    } catch (error: any) {
      console.error('Failed to send message:', error)
      alert(t('messages.failedToSend', { error: error.message || 'Unknown error' }))
      // Restore message if sending failed
      setNewMessage(messageContent)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    // Emoji is already inserted at cursor position by EmojiPickerComponent
    // Just close the picker
    setShowEmojiPicker(false)
    // Focus input after selecting emoji
    setTimeout(() => {
      messageInputRef.current?.focus()
    }, 0)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      alert(t('messages.fileTooLarge'))
      return
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      alert(t('messages.fileTypeNotSupported'))
      return
    }

    setSelectedFile(file)
  }

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedConversationId) return

    try {
      setUploadingFile(true)
      
      // Upload file
      const uploadResponse = await uploadAPI.uploadFile(selectedFile)
      
      if (!uploadResponse.success || !uploadResponse.data) {
        throw new Error(uploadResponse.error || 'Upload failed')
      }

      const { url, fileName, mimeType } = uploadResponse.data

      // Determine message type
      const messageType = mimeType.startsWith('image/') ? 'image' : 'file'
      const messageContent = fileName

      // Send message with file
      await sendMessage(messageContent, messageType, url)

      // Clear file
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Reload conversations
      reloadConversations()
    } catch (error: any) {
      console.error('Failed to upload file:', error)
      alert(t('messages.uploadFailed', { error: error.message || 'Unknown error' }))
    } finally {
      setUploadingFile(false)
    }
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

            {/* Navigation Menu */}
            <div className="mb-8">
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                      activeMenu === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('messages.settings')}
              </h3>
              <div className="space-y-2">
                <button className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <PersonIcon className="mr-3 w-4 h-4" />
                  {t('messages.profile')}
                </button>
                <button className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <NotificationsIcon className="mr-3 w-4 h-4" />
                  {t('messages.notifications')}
                </button>
                <button 
                  onClick={() => setShowThemeOptions(!showThemeOptions)}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <PaletteIcon className="mr-3 w-4 h-4" />
                  {t('messages.theme')}
                </button>
                {showThemeOptions && (
                  <div className={`mt-2 ml-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="space-y-2">
                      <button 
                        onClick={handleThemeToggle}
                        className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                          theme === 'light' 
                            ? 'bg-blue-100 text-blue-700' 
                            : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-200'}`
                        }`}
                      >
                        {theme === 'dark' ? <LightModeIcon className="mr-3 w-4 h-4" /> : <DarkModeIcon className="mr-3 w-4 h-4" />}
                        {theme === 'dark' ? t('messages.switchToLight') : t('messages.switchToDark')}
                      </button>
                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} px-3 py-1`}>
                        {t('messages.currentTheme', { theme: theme === 'dark' ? t('messages.darkMode') : t('messages.lightMode') })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Language Toggle */}
            <div className="mb-8">
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('messages.language')}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => changeLanguage('en')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentLang === 'en'
                      ? 'bg-blue-600 text-white'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-gray-700'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => changeLanguage('vi')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentLang === 'vi'
                      ? 'bg-blue-600 text-white'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-gray-700'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Tiếng Việt
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 lg:p-6">
          {/* Mobile Menu Button & Theme Toggle */}
          <div className="lg:hidden mb-4 flex items-center justify-between">
            <button
              onClick={handleDrawerToggle}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
            >
              <MenuIcon className="w-6 h-6" />
            </button>
            
            {/* Mobile Theme Toggle */}
            <button
              onClick={handleThemeToggle}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} transition-colors`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <LightModeIcon className="w-6 h-6 text-yellow-400" /> : <DarkModeIcon className="w-6 h-6" />}
            </button>
          </div>

          {/* Search Bar & Desktop Theme Toggle */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={t('messages.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full px-4 py-3 pl-10 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <SearchIcon className="w-5 h-5 text-gray-400" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3">
                  {t('messages.search')}
                </Button>
                
                {/* Desktop Theme Toggle */}
                <button
                  onClick={handleThemeToggle}
                  className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} transition-colors`}
                  title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                >
                  {theme === 'dark' ? <LightModeIcon className="w-5 h-5 text-yellow-400" /> : <DarkModeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>


          {/* Active Status Section - Always show */}
          <div className="mb-6">
            <div className={`rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-4`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {t('messages.activeNow')}
              </h3>
              <ActiveUsersSection
                activeUsers={activeUsers}
                loading={loadingActiveUsers}
                theme={theme}
                onUserClick={(userId) => {
                  const userConversation = conversations.find((conv: any) => 
                    conv.participants && conv.participants.includes(userId)
                  )
                  if (userConversation) {
                    setSelectedConversationId(userConversation.id)
                  } else {
                    handleCreateConversation(userId)
                  }
                }}
                t={t}
              />
            </div>
          </div>

          {/* Messages Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[620px]">
            {/* Conversations List */}
            <div className={`lg:col-span-1 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-hidden`}
                 style={{
                   borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                   backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                   boxShadow: 'none !important'
                 }}>
              <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t('messages.conversations')}
                </h2>
                <button
                  onClick={handleOpenNewConversation}
                  className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'} text-white transition-colors`}
                  title={t('messages.newConversationTitle')}
                >
                  <ChatIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-y-auto h-[540px]">
                {loading ? (
                  <div className="p-4 text-center">
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{t('messages.loading')}</p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-4 text-center">
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {conversations.length === 0 
                         ? t('messages.noConversations')
                         : t('messages.noConversationsFound')}
                      </p>
                    <button
                      onClick={handleOpenNewConversation}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      + {t('messages.newConversation')}
                    </button>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <ConversationListItem
                      key={conversation.id}
                      conversation={conversation}
                      isSelected={selectedConversationId === conversation.id}
                      theme={theme}
                      onClick={() => setSelectedConversationId(conversation.id)}
                      t={t}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`lg:col-span-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} flex flex-col overflow-hidden`}
                 style={{
                   borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                   backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                   boxShadow: 'none !important'
                 }}>
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: getAvatarColor(selectedConversation.name),
                            fontSize: '0.875rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {selectedConversation.avatar}
                        </Avatar>
                        {selectedConversation.online && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div>
                        <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {selectedConversation.name}
                        </h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {selectedConversation.subject}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 relative">
                      <div className="relative">
                      <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowConversationMenu(showConversationMenu === selectedConversationId ? null : selectedConversationId || null)
                          }}
                        className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        style={{
                          color: theme === 'dark' ? '#ffffff' : '#374151'
                        }}
                          title={t('messages.moreOptions')}
                      >
                          <MoreHorizIcon className="w-5 h-5" />
                      </button>
                        {showConversationMenu === selectedConversationId && (
                          <>
                            <div 
                              className="fixed inset-0 z-40"
                              onClick={() => setShowConversationMenu(null)}
                            />
                            <div 
                              className={`absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg border z-50 ${
                                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                      <button 
                                onClick={() => {
                                  if (selectedConversationId) {
                                    handleDeleteConversation(selectedConversationId)
                                  }
                                }}
                                className={`w-full px-4 py-3 text-left flex items-center space-x-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${
                                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                                }`}
                      >
                                <DeleteIcon className="w-4 h-4" />
                                <span>{t('messages.delete')}</span>
                      </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div 
                    ref={messagesContainerRef}
                    className="flex-1 p-4 overflow-y-auto space-y-4" 
                    style={{ 
                      maxHeight: 'calc(100vh - 300px)',
                      scrollBehavior: 'smooth'
                    }}
                  >
                    {!selectedConversationId ? (
                      <div className="text-center py-8">
                        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                          {t('messages.selectToView')}
                        </p>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">
                        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                          {t('messages.noMessages')}
                        </p>
                      </div>
                    ) : (
                      <>
                        {messages.map((message) => {
                          const currentUserIdForComparison = currentUser?.userId || currentUser?.id || ''
                          const isOwnMessage = message.senderId === currentUserIdForComparison
                          return (
                            <MessageBubble
                              key={message.id}
                              message={message}
                              isOwnMessage={isOwnMessage}
                              theme={theme}
                            />
                          )
                        })}
                        <div ref={messagesEndRef} style={{ height: '1px' }} />
                      </>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    {/* Selected File Preview */}
                    {selectedFile && (
                      <div className={`mb-2 p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-between`}>
                    <div className="flex items-center space-x-2">
                          <AttachFileIcon className="w-4 h-4" />
                          <span className="text-sm truncate max-w-xs">{selectedFile.name}</span>
                          <span className="text-xs text-gray-500">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      <button 
                          onClick={() => {
                            setSelectedFile(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <CloseIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        style={{
                          color: theme === 'dark' ? '#ffffff' : '#374151'
                        }}
                        disabled={uploadingFile}
                      >
                        <AttachFileIcon className="w-5 h-5" />
                      </button>
                      
                      <div className="flex-1 relative">
                        <input
                          ref={messageInputRef}
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={t('messages.typeMessage')}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            theme === 'dark' 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                      </div>
                      
                      <div className="relative" ref={emojiPickerRef}>
                      <button 
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${showEmojiPicker ? (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
                        style={{
                          color: theme === 'dark' ? '#ffffff' : '#374151'
                        }}
                      >
                        <EmojiEmotionsIcon className="w-5 h-5" />
                      </button>
                        {showEmojiPicker && (
                          <EmojiPickerComponent
                            onEmojiSelect={handleEmojiSelect}
                            theme={theme === 'dark' ? 'dark' : 'light'}
                            inputRef={messageInputRef}
                            inputValue={newMessage}
                            onInputChange={setNewMessage}
                          />
                        )}
                      </div>
                      
                      <Button
                        onClick={handleSendMessage}
                        disabled={(!newMessage.trim() && !selectedFile) || sending || uploadingFile}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 disabled:opacity-50"
                        style={{
                          color: '#ffffff'
                        }}
                      >
                        {sending || uploadingFile ? (
                          <span className="text-sm">{uploadingFile ? t('messages.uploading') : t('messages.sending')}</span>
                        ) : (
                          <SendIcon className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <ChatIcon className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                    <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {t('messages.selectConversation')}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {t('messages.selectConversationDesc')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Panel - Sticky */}
        <div className={`w-full lg:w-80 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-l ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} mt-6 lg:mt-0`}>
          <div className="p-6">
            {/* Profile Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {t('messages.yourProfile')}
              </h3>
              <button className="p-1">
                <MoreVertIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* User Profile */}
            <div className="text-center mb-8">
              <Avatar
                src={currentUser?.avatar}
                sx={{
                  width: 96,
                  height: 96,
                  bgcolor: getAvatarColor(currentUser?.name || currentUser?.email || 'User'),
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  mx: 'auto',
                  mb: 2
                }}
              >
                {getInitials(currentUser?.name || currentUser?.email || 'User')}
              </Avatar>
              <h4 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {currentUser?.name || currentUser?.email || 'User'}
              </h4>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {currentUser?.role === 'student' 
                  ? 'Continue your learning journey and achieve your goals'
                  : currentUser?.role === 'tutor'
                  ? 'Share your knowledge and help students succeed'
                  : 'Manage the system and support users'}
              </p>
              {currentUser?.email && (
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {currentUser.email}
              </p>
              )}
            </div>

            {/* Social Links */}
            <div className="flex justify-center space-x-4 mb-8">
              <button className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors">
                <FacebookIcon className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center text-white hover:bg-blue-500 transition-colors">
                <TwitterIcon className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white hover:bg-pink-600 transition-colors">
                <InstagramIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Online Status */}
            <div className="mb-8">
              <h4 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {t('messages.onlineStatus')}
              </h4>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t('messages.availableForMessages')}
                </span>
                <div className="flex items-center">
                  <OnlinePredictionIcon className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm text-green-500">{t('messages.online')}</span>
                </div>
              </div>
            </div>

            {/* Recent Contacts */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t('messages.recentContacts')}
                </h4>
                <button className="text-sm text-blue-600">
                  <MoreVertIcon className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-3">
                {formattedConversations
                  .filter(conv => conv.lastMessage && conv.lastMessage !== 'No messages yet') // Only show conversations with messages
                  .sort((a, b) => {
                    // Sort by last message time (most recent first)
                    const timeA = conversations.find(c => c.id === a.id)?.lastMessage?.createdAt || conversations.find(c => c.id === a.id)?.updatedAt || ''
                    const timeB = conversations.find(c => c.id === b.id)?.lastMessage?.createdAt || conversations.find(c => c.id === b.id)?.updatedAt || ''
                    if (timeA && timeB) {
                      return new Date(timeB).getTime() - new Date(timeA).getTime()
                    }
                    if (timeA && !timeB) return -1
                    if (!timeA && timeB) return 1
                    return 0
                  })
                  .slice(0, 3) // Only show top 3 most recent
                  .map((contact, index) => (
                    <div key={contact.id || index} className="flex items-center">
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: getAvatarColor(contact.name),
                        fontSize: '0.875rem',
                        fontWeight: 'bold'
                      }}
                    >
                        {contact.avatar || getInitials(contact.name)}
                    </Avatar>
                    <div className="flex-1 ml-3">
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {contact.name || 'Unknown'}
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {contact.subject || 'General'}
                      </p>
                    </div>
                    {contact.online && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
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

              {/* Mobile Navigation */}
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleMenuClick(item)
                      setMobileOpen(false)
                    }}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                      activeMenu === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Mobile Settings */}
              <div className="mt-8">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('messages.settings')}
                </h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      navigate('/tutor/profile')
                      setMobileOpen(false)
                    }}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <PersonIcon className="mr-3 w-4 h-4" />
                    {t('messages.profile')}
                  </button>
                  <button 
                    onClick={() => {
                      navigate('/tutor/notifications')
                      setMobileOpen(false)
                    }}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <NotificationsIcon className="mr-3 w-4 h-4" />
                    {t('messages.notifications')}
                  </button>
                  <button 
                    onClick={() => setShowThemeOptions(!showThemeOptions)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <PaletteIcon className="mr-3 w-4 h-4" />
                    {t('messages.theme')}
                  </button>
                  {showThemeOptions && (
                    <div className={`mt-2 ml-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <div className="space-y-2">
                        <button 
                          onClick={() => {
                            handleThemeToggle()
                            setMobileOpen(false)
                          }}
                          className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                            theme === 'light' 
                              ? 'bg-blue-100 text-blue-700' 
                              : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-200'}`
                          }`}
                        >
                          {theme === 'dark' ? <LightModeIcon className="mr-3 w-4 h-4" /> : <DarkModeIcon className="mr-3 w-4 h-4" />}
                          {theme === 'dark' ? t('messages.switchToLight') : t('messages.switchToDark')}
                        </button>
                        <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} px-3 py-1`}>
                          {t('messages.currentTheme', { theme: theme === 'dark' ? t('messages.darkMode') : t('messages.lightMode') })}
                        </div>
                      </div>
                    </div>
                  )}
                  <button 
                    onClick={() => changeLanguage(currentLang === 'en' ? 'vi' : 'en')}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <LanguageIcon className="mr-3 w-4 h-4" />
                    {currentLang === 'vi' ? 'English' : 'Tiếng Việt'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Conversation Modal */}
      {showNewConversationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowNewConversationModal(false)}>
          <div 
            className={`w-full max-w-md mx-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t('messages.newConversationTitle')}
                </h3>
                <button
                  onClick={() => {
                    setShowNewConversationModal(false)
                    setSearchUserQuery('')
                  }}
                  className={`p-1 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Search Users */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder={t('messages.searchUsers')}
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              {/* Users List */}
              <div className="max-h-96 overflow-y-auto">
                {loadingUsers ? (
                  <div className="text-center py-8">
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{t('messages.loadingUsers')}</p>
                  </div>
                ) : (
                  <>
                    {availableUsers
                      .filter((user: any) => 
                        user.name?.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                        user.email?.toLowerCase().includes(searchUserQuery.toLowerCase())
                      )
                      .map((user: any) => {
                        // Kiểm tra xem đã có conversation với user này chưa
                        const hasConversation = conversations.some((conv: any) => 
                          conv.participants && conv.participants.includes(user.id)
                        )
                        
                        return (
                        <div
                          key={user.id}
                          onClick={() => !creatingConversation && handleCreateConversation(user.id)}
                          className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                            theme === 'dark' 
                              ? 'hover:bg-gray-700' 
                              : 'hover:bg-gray-100'
                          } ${creatingConversation ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar
                              sx={{
                                width: 40,
                                height: 40,
                                bgcolor: getAvatarColor(user.name || user.email),
                                fontSize: '1rem',
                                fontWeight: 'bold'
                              }}
                            >
                              {getInitials(user.name || user.email)}
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                              <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {user.name || user.email}
                              </h4>
                                  {user.role && (
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                                      user.role === 'tutor' 
                                        ? theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'
                                        : user.role === 'student'
                                        ? theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'
                                        : theme === 'dark' ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-700'
                                    }`}>
                                      {user.role === 'tutor' ? t('messages.tutor') : user.role === 'student' ? t('messages.student') : t('messages.management')}
                                    </span>
                                  )}
                                  {hasConversation && (
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                                      theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                                    }`}>
                                      {t('messages.alreadyHasConversation')}
                                    </span>
                                  )}
                                </div>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {user.email}
                              </p>
                            </div>
                            {creatingConversation && (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            )}
                          </div>
                        </div>
                        )
                      })}
                    {availableUsers.filter((user: any) => 
                      user.name?.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                      user.email?.toLowerCase().includes(searchUserQuery.toLowerCase())
                    ).length === 0 && (
                        <div className="text-center py-8">
                          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                           {searchUserQuery ? t('messages.noUsersFound') : t('messages.noUsersAvailable')}
                          </p>
                        </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Messages
