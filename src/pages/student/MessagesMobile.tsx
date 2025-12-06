import React, { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../../components/ui/Button'
import { Avatar } from '@mui/material'
import { getAvatarColor } from '../../utils/avatarUtils'
import {
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  Menu as MenuIcon,
  BarChart as BarChartIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  VideoCall as VideoCallIcon,
  Chat as ChatIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  MoreHoriz as MoreHorizIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  ArrowForward as ArrowForwardIcon,
  Language as LanguageIcon
} from '@mui/icons-material'

const MessagesMobile: React.FC = () => {
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
  const [selectedChat, setSelectedChat] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  

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
  }

  // Mock data for conversations
  const conversations = [
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      type: 'tutor',
      lastMessage: 'Great work on today\'s session! Keep practicing those equations.',
      time: '2 min ago',
      unread: 1,
      online: true,
      avatar: 'SJ',
      subject: 'Mathematics'
    },
    {
      id: 2,
      name: 'Prof. Michael Chen',
      type: 'tutor',
      lastMessage: 'I\'ve prepared some additional materials for our next class.',
      time: '1 hour ago',
      unread: 0,
      online: false,
      avatar: 'MC',
      subject: 'Physics'
    },
    {
      id: 3,
      name: 'Dr. Emily Brown',
      type: 'tutor',
      lastMessage: 'Your homework submission was excellent!',
      time: '3 hours ago',
      unread: 2,
      online: true,
      avatar: 'EB',
      subject: 'Chemistry'
    },
    {
      id: 4,
      name: 'Prof. David Wilson',
      type: 'tutor',
      lastMessage: 'Let\'s schedule a review session for the upcoming exam.',
      time: '1 day ago',
      unread: 0,
      online: false,
      avatar: 'DW',
      subject: 'Biology'
    },
    {
      id: 5,
      name: 'Dr. Lisa Anderson',
      type: 'tutor',
      lastMessage: 'The project proposal looks promising!',
      time: '2 days ago',
      unread: 0,
      online: false,
      avatar: 'LA',
      subject: 'Computer Science'
    }
  ]

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, path: '/student' },
    { id: 'search', label: 'Search Tutors', icon: <SearchIcon />, path: '/student/search' },
    { id: 'book', label: 'Book Session', icon: <ScheduleIcon />, path: '/student/book' },
    { id: 'sessions', label: 'My Sessions', icon: <AssignmentIcon />, path: '/student/session' },
    { id: 'evaluate', label: 'Evaluate Session', icon: <BarChartIcon />, path: '/student/evaluate' },
    { id: 'progress', label: 'View Progress', icon: <BarChartIcon />, path: '/student/progress' },
    { id: 'chatbot', label: 'Chatbot Support', icon: <ChatIcon />, path: '/student/chatbot' },
    { id: 'messages', label: 'Messages', icon: <ChatIcon />, path: '/student/messages' }
  ]

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Here you would typically send the message to your backend
      console.log('Sending message:', newMessage)
      setNewMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} pb-16`}>
      {/* Mobile Header */}
      <div className={`sticky top-0 z-40 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/student')}
              className={`p-2 rounded-lg mr-3 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <ArrowBackIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {t('messages.title')}
              </h1>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('messages.subtitleStudent')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => changeLanguage(currentLang === 'en' ? 'vi' : 'en')}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              title={t('messages.switchLanguage')}
            >
              <LanguageIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleThemeToggle}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <LightModeIcon className="w-5 h-5 text-yellow-400" /> : <DarkModeIcon className="w-5 h-5" />}
            </button>
            <button
              onClick={handleDrawerToggle}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="p-4 space-y-4">
        {/* Active Status Section - Mobile */}
        <div className={`rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-4`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t('messages.activeNow')}
          </h3>
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {/* Your Status */}
            <div className="flex flex-col items-center min-w-[70px]">
              <div className="relative">
                <div className={`w-14 h-14 rounded-full border-2 border-dashed ${theme === 'dark' ? 'border-gray-500' : 'border-gray-400'} flex items-center justify-center mb-2`}>
                  <div className={`w-7 h-7 rounded-full ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} flex items-center justify-center`}>
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`}>+</span>
                  </div>
                </div>
              </div>
              <span className={`text-xs text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {t('messages.yourStory')}
              </span>
            </div>

            {/* Active Users */}
            {conversations.filter(conv => conv.online).slice(0, 8).map((conversation) => (
              <div key={conversation.id} className="flex flex-col items-center min-w-[70px]">
                <div className="relative">
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: getAvatarColor(conversation.name),
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      border: '3px solid #10b981'
                    }}
                  >
                    {conversation.avatar}
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <span className={`text-xs text-center mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {conversation.name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Search Bar - Mobile */}
        <div className="relative">
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

        {/* Conversations List - Mobile */}
        <div className="space-y-3">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedChat(conversation)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedChat?.id === conversation.id
                  ? theme === 'dark' ? 'bg-gray-700 border-blue-500' : 'bg-blue-50 border-blue-500'
                  : theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: getAvatarColor(conversation.name),
                      fontSize: '1rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {conversation.avatar}
                  </Avatar>
                  {conversation.online && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {conversation.name}
                    </h3>
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {conversation.time}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-sm truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {conversation.lastMessage}
                    </p>
                    {conversation.unread > 0 && (
                      <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {conversation.unread}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      conversation.type === 'tutor' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {conversation.type === 'tutor' ? t('messages.tutor') : t('messages.student')}
                    </span>
                    <span className={`text-xs ml-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {conversation.subject}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Help Section - Mobile with Toggle */}
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className={`w-full flex items-center justify-between p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}
          >
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {t('messages.needHelp')}
            </h3>
            <div className={`transform transition-transform ${showHelp ? 'rotate-180' : ''}`}>
              <ArrowForwardIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
          </button>
          
          {showHelp && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => navigate('/student/progress')}
                  className={`flex flex-col items-center p-3 rounded-lg border ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'} transition-colors`}
                >
                  <BarChartIcon className="w-6 h-6 text-blue-600 mb-2" />
                  <span className={`text-xs font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {t('messages.trackProgress')}
                  </span>
                </button>
                <button 
                  onClick={() => navigate('/student/chatbot')}
                  className={`flex flex-col items-center p-3 rounded-lg border ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'} transition-colors`}
                >
                  <ChatIcon className="w-6 h-6 text-green-600 mb-2" />
                  <span className={`text-xs font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {t('messages.aiSupport')}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Interface - Mobile */}
      {selectedChat && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
          {/* Chat Header */}
          <div className={`sticky top-0 z-40 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setSelectedChat(null)}
                  className={`p-2 rounded-lg mr-3 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  <ArrowBackIcon className="w-5 h-5" />
                </button>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: getAvatarColor(selectedChat.name),
                        fontSize: '0.875rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {selectedChat.avatar}
                    </Avatar>
                    {selectedChat.online && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div>
                    <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {selectedChat.name}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {selectedChat.online ? t('messages.online') : t('messages.offline')} • {selectedChat.subject}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button 
                  className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  style={{
                    color: theme === 'dark' ? '#ffffff' : '#374151'
                  }}
                >
                  <VideoCallIcon className="w-5 h-5" />
                </button>
                <button 
                  className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  style={{
                    color: theme === 'dark' ? '#ffffff' : '#374151'
                  }}
                >
                  <MoreHorizIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 h-[calc(100vh-140px)]">
            {/* Sample messages */}
            <div className="flex justify-start">
              <div className={`max-w-xs px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <p>{selectedChat.lastMessage}</p>
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>10:30 AM</span>
              </div>
            </div>
            
            <div className="flex justify-end">
              <div className={`max-w-xs px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>
                <p>Thank you for the feedback! I'll work on those areas.</p>
                <span className={`text-xs ${theme === 'dark' ? 'text-blue-200' : 'text-blue-100'}`}>10:32 AM</span>
              </div>
            </div>
          </div>

          {/* Message Input */}
          <div className={`sticky bottom-0 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-4`}>
            <div className="flex items-center space-x-2">
              <button 
                className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                style={{
                  color: theme === 'dark' ? '#ffffff' : '#374151'
                }}
              >
                <AttachFileIcon className="w-5 h-5" />
              </button>
              
              <div className="flex-1 relative">
                <input
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
              
              <button 
                className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                style={{
                  color: theme === 'dark' ? '#ffffff' : '#374151'
                }}
              >
                <EmojiEmotionsIcon className="w-5 h-5" />
              </button>
              
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                style={{
                  color: '#ffffff'
                }}
              >
                <SendIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleDrawerToggle}></div>
          <div className={`fixed left-0 top-0 h-full w-80 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
            <div className="p-6 h-full flex flex-col">
              {/* Mobile Header */}
              <div className="flex items-center justify-between mb-8">
                <div 
                  className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate('/student')}
                >
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
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Quick Actions - Moved to top */}
              <div className="mb-8">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('messages.language')}
                </h3>
                <div className="space-y-2 mb-8">
                  <button
                    onClick={() => changeLanguage('en')}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                      currentLang === 'en'
                        ? 'bg-blue-600 text-white'
                        : theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <LanguageIcon className="mr-3 w-4 h-4" />
                    English
                  </button>
                  <button
                    onClick={() => changeLanguage('vi')}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                      currentLang === 'vi'
                        ? 'bg-blue-600 text-white'
                        : theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <LanguageIcon className="mr-3 w-4 h-4" />
                    Tiếng Việt
                  </button>
                </div>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  QUICK ACTIONS
                </h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      navigate('/student')
                      setMobileOpen(false)
                    }}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors`}
                  >
                    <ArrowBackIcon className="mr-3 w-4 h-4" />
                    {t('messages.backToDashboard')}
                  </button>
                </div>
              </div>

              {/* Mobile Navigation */}
              <div className="flex-1 space-y-2">
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessagesMobile
