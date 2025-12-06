import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { 
  Send, 
  SmartToy, 
  Person,
  School,
  Schedule,
  Quiz,
  Menu as MenuIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  BarChart as BarChartIcon,
  Support as SupportIcon,
  CalendarToday,
  Lightbulb,
  HelpOutline,
  ExpandMore,
  ExpandLess,
  History as HistoryIcon,
  Chat as ChatIcon,
  Language as LanguageIcon
} from '@mui/icons-material'
import Card from '../../components/ui/Card'
import { chatbotAPI } from '../../lib/api'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  type?: 'text' | 'suggestion'
}

const ChatbotSupport: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [currentLang, setCurrentLang] = useState(i18n.language)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: t('chatbotSupport.welcomeMessage'),
      sender: 'bot',
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const [conversations, setConversations] = useState<any[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<{ [key: number]: boolean }>({
    0: true, // First category expanded by default
    1: true, // Second category expanded by default
  })
  
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    setCurrentLang(lang)
  }
  
  useEffect(() => {
    setCurrentLang(i18n.language)
    // Update welcome message when language changes
    if (messages.length === 1 && messages[0].sender === 'bot' && messages[0].id === '1') {
      setMessages([{
        id: '1',
        text: t('chatbotSupport.welcomeMessage'),
        sender: 'bot',
        timestamp: new Date()
      }])
    }
  }, [i18n.language, t])
  
  // Ref for messages container to enable auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  
  // Track if this is initial load to prevent auto-scroll on mount
  const isInitialLoad = useRef(true)
  const previousMessagesLength = useRef(0)
  const hasUserInteracted = useRef(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  // Auto-scroll to bottom when new message is added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const quickActions = [
    { text: t('chatbotSupport.quickActions.bookSession'), icon: <Schedule />, action: 'schedule' },
    { text: t('chatbotSupport.quickActions.findTutor'), icon: <Person />, action: 'tutor' },
    { text: t('chatbotSupport.quickActions.viewSchedule'), icon: <Schedule />, action: 'schedule-view' },
    { text: t('chatbotSupport.quickActions.studyTips'), icon: <Quiz />, action: 'tips' }
  ]

  // Sample questions categorized by topic
  const questionCategories = [
    {
      title: t('chatbotSupport.questionCategories.bookingSchedule'),
      icon: <CalendarToday className="w-4 h-4" />,
      questions: [
        t('chatbotSupport.questions.bookSessionMath'),
        t('chatbotSupport.questions.scheduleThisWeek'),
        t('chatbotSupport.questions.rescheduleSession'),
        t('chatbotSupport.questions.subjectsAvailable'),
        t('chatbotSupport.questions.cancelSession')
      ]
    },
    {
      title: t('chatbotSupport.questionCategories.tutorsClasses'),
      icon: <School className="w-4 h-4" />,
      questions: [
        t('chatbotSupport.questions.whoIsMyTutor'),
        t('chatbotSupport.questions.classesEnrolled'),
        t('chatbotSupport.questions.findTutorPhysics'),
        t('chatbotSupport.questions.bestRatingTutor'),
        t('chatbotSupport.questions.viewTutorInfo')
      ]
    },
    {
      title: t('chatbotSupport.questionCategories.progressGrades'),
      icon: <BarChartIcon className="w-4 h-4" />,
      questions: [
        t('chatbotSupport.questions.howAreMyGrades'),
        t('chatbotSupport.questions.viewLearningProgress'),
        t('chatbotSupport.questions.subjectsToImprove'),
        t('chatbotSupport.questions.sessionsCompleted')
      ]
    },
    {
      title: t('chatbotSupport.questionCategories.learningSupport'),
      icon: <Lightbulb className="w-4 h-4" />,
      questions: [
        t('chatbotSupport.questions.studyTips'),
        t('chatbotSupport.questions.improveGrades'),
        t('chatbotSupport.questions.helpWithHomework'),
        t('chatbotSupport.questions.effectiveStudyWay')
      ]
    },
    {
      title: t('chatbotSupport.questionCategories.otherQuestions'),
      icon: <HelpOutline className="w-4 h-4" />,
      questions: [
        t('chatbotSupport.questions.systemFeatures'),
        t('chatbotSupport.questions.contactTutor'),
        t('chatbotSupport.questions.studyOnline'),
        t('chatbotSupport.questions.howToUseSystem')
      ]
    }
  ]

  // Flatten all questions for suggestions
  const suggestions = questionCategories.flatMap(category => category.questions)

  // Auto-scroll to bottom of messages container (not the whole page)
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      // Scroll to bottom of the messages container only
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  // Scroll to bottom when messages or typing state changes
  // But skip auto-scroll on initial page load
  useEffect(() => {
    // Skip scroll on initial load (when component first mounts with welcome message)
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      previousMessagesLength.current = messages.length
      return
    }
    
    // Only scroll if:
    // 1. User has interacted (sent a message)
    // 2. Messages length increased (new message added)
    if (hasUserInteracted.current && messages.length > previousMessagesLength.current) {
      previousMessagesLength.current = messages.length
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
    
    // Always scroll when typing indicator appears/disappears (only after user interaction)
    if (isTyping && hasUserInteracted.current) {
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [messages, isTyping])

  // Load conversations list on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoadingConversations(true)
        const response = await chatbotAPI.getHistory()
        if (response.success && response.data.conversations) {
          setConversations(response.data.conversations)
          
          // Auto-load the most recent conversation if available
          if (response.data.conversations.length > 0 && !conversationId) {
            const mostRecent = response.data.conversations[0]
            setConversationId(mostRecent.id)
          }
        }
      } catch (error) {
        console.error('Failed to load conversations:', error)
      } finally {
        setLoadingConversations(false)
      }
    }

    loadConversations()
  }, []) // Only run on mount

  // Load conversation history when conversationId changes
  useEffect(() => {
    const loadHistory = async () => {
      if (!conversationId) {
        // Reset to welcome message if no conversation selected
        setMessages([{
          id: '1',
          text: t('chatbotSupport.welcomeMessage'),
          sender: 'bot',
          timestamp: new Date()
        }])
        return
      }

      try {
        const response = await chatbotAPI.getHistory(conversationId, 50)
        if (response.success && response.data.conversation) {
          const historyMessages: Message[] = response.data.messages.map((msg: any) => ({
            id: msg.id,
            text: msg.content,
            sender: msg.role === 'user' ? 'user' : 'bot',
            timestamp: new Date(msg.createdAt)
          }))
          if (historyMessages.length > 0) {
            setMessages(historyMessages)
            // Update previous length to prevent auto-scroll when loading history
            previousMessagesLength.current = historyMessages.length
            // Don't scroll when loading history - let user see from top
            // User can manually scroll down if they want to see latest
          }
        }
      } catch (error) {
        console.error('Failed to load conversation history:', error)
      }
    }

    loadHistory()
  }, [conversationId])

  const handleSendMessage = async () => {
    if (!inputText.trim()) return

    // Mark that user has interacted
    hasUserInteracted.current = true

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = inputText
    setInputText('')
    setIsTyping(true)

    // Scroll to bottom when user sends message
    setTimeout(() => {
      scrollToBottom()
    }, 100)

    try {
      // Prepare conversation history for context
      const conversationHistory = messages.slice(-10).map(msg => ({
        sender: msg.sender,
        text: msg.text
      }))
      
      const response = await chatbotAPI.sendMessage(currentInput, conversationHistory)
      
      if (response.success) {
      const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: response.data.message,
          sender: 'bot',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, botResponse])
        
        // Update conversationId if we got a new one
        if (response.data.conversationId) {
          setConversationId(response.data.conversationId)
          
          // Refresh conversations list to show the new/updated conversation
          const refreshResponse = await chatbotAPI.getHistory()
          if (refreshResponse.success && refreshResponse.data.conversations) {
            setConversations(refreshResponse.data.conversations)
          }
        }
        
        // Scroll to bottom when AI responds
        setTimeout(() => {
          scrollToBottom()
        }, 100)
      } else {
        throw new Error(response.error || 'Failed to get response')
      }
    } catch (error: any) {
      console.error('Chatbot error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message || t('chatbotSupport.errorOccurred'),
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      
      // Scroll to bottom when error message is shown
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    } finally {
      setIsTyping(false)
    }
  }

  const handleQuickAction = (action: string) => {
    let message = ''
    switch (action) {
      case 'schedule':
        message = 'I want to book a session'
        break
      case 'tutor':
        message = 'I want to find a tutor'
        break
      case 'schedule-view':
        message = 'What is my schedule this week?'
        break
      case 'tips':
        message = 'Give me some effective study tips'
        break
    }
    setInputText(message)
  }

  const handleQuestionClick = async (question: string) => {
    // Mark that user has interacted
    hasUserInteracted.current = true
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: question,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsTyping(true)

    try {
      const response = await chatbotAPI.chat(question, conversationId)
      if (response.success && response.data) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.data.message,
          sender: 'bot',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, botMessage])
        
        // Update conversationId if we got a new one
        if (response.data.conversationId) {
          setConversationId(response.data.conversationId)
          
          // Refresh conversations list to show the new/updated conversation
          const refreshResponse = await chatbotAPI.getHistory()
          if (refreshResponse.success && refreshResponse.data.conversations) {
            setConversations(refreshResponse.data.conversations)
          }
        }
      } else {
        throw new Error(response.message || 'Failed to get response')
      }
    } catch (error: any) {
      console.error('Chatbot error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message || t('chatbotSupport.errorOccurred'),
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion)
  }

  const toggleCategory = (index: number) => {
    setExpandedCategories(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const handleSelectConversation = (convId: string) => {
    setConversationId(convId)
    hasUserInteracted.current = false // Reset interaction flag when switching conversations
  }

  const handleNewConversation = () => {
    setConversationId(undefined)
    setMessages([{
      id: '1',
      text: t('chatbotSupport.welcomeMessage'),
      sender: 'bot',
      timestamp: new Date()
    }])
    hasUserInteracted.current = false
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return t('chatbotSupport.today')
    } else if (diffDays === 1) {
      return t('chatbotSupport.yesterday')
    } else if (diffDays < 7) {
      return t('chatbotSupport.daysAgo', { days: diffDays })
    } else {
      return date.toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
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
              onClick={() => navigate('/student')}
            >
              <div className="w-10 h-10 flex items-center justify-center mr-3">
                <img src="/HCMCUT.png" alt="HCMUT Logo" className="w-10 h-10" />
              </div>
              <span className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                HCMUT
              </span>
            </div>

            {/* Chat Status */}
            <div className="mb-8">
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('chatbotSupport.chatStatus')}
              </h3>
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {t('chatbotSupport.aiAssistantOnline')}
                  </span>
                </div>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('chatbotSupport.readyToHelp')}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('chatbotSupport.quickActionsLabel')}
              </h3>
              <div className="space-y-2">
                <button 
                  onClick={() => navigate('/student')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors`}
                >
                  <ArrowBackIcon className="mr-3 w-4 h-4" />
                  {t('chatbotSupport.backToDashboard')}
                </button>
                <button 
                  onClick={() => changeLanguage(currentLang === 'vi' ? 'en' : 'vi')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <LanguageIcon className="mr-3 w-4 h-4" />
                  {currentLang === 'vi' ? 'English' : 'Tiếng Việt'}
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
                  {t('chatbotSupport.title')}
                </h1>
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('chatbotSupport.subtitle')}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t('chatbotSupport.online')}
                  </span>
                </div>
              </div>
            </div>
          </div>

        {/* Chat Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Messages */}
            <div className="lg:col-span-2">
              <Card 
                className={`border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6`}
                style={{
                  borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  boxShadow: 'none !important'
                }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {t('chatbotSupport.chatWithAI')}
                  </h3>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {t('chatbotSupport.online')}
                    </span>
                  </div>
                </div>

                {/* Messages Container */}
                <div 
                  ref={messagesContainerRef}
                  className={`h-[500px] overflow-y-auto p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} mb-4 scroll-smooth`}
                  style={{
                    scrollBehavior: 'smooth'
                  }}
                >
                {/* Show question suggestions when chat is new or has few messages */}
                {messages.length <= 1 && !isTyping && (
                  <div className="mb-6 animate-fade-in">
                    <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center mb-3">
                        <Lightbulb className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
                        <h4 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {t('chatbotSupport.youCanAskMe')}
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {questionCategories.slice(0, 3).map((category, catIdx) => (
                          <div key={catIdx}>
                            <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              {category.title}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {category.questions.slice(0, 2).map((question, qIdx) => (
                                <button
                                  key={qIdx}
                                  onClick={() => handleQuestionClick(question)}
                                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                    theme === 'dark'
                                      ? 'border-gray-500 text-gray-300 hover:bg-gray-500'
                                      : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  {question}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {messages.map((message) => (
                    <div
                    key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}
                    >
                      <div className={`flex items-start max-w-xs lg:max-w-md xl:max-w-lg ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                          message.sender === 'user' 
                            ? 'ml-3 mr-0 bg-blue-600' 
                            : 'mr-3 bg-gradient-to-br from-purple-500 to-blue-500'
                        }`}>
                          {message.sender === 'user' ? (
                            <Person className="w-5 h-5 text-white" />
                          ) : (
                            <SmartToy className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className={`p-4 rounded-2xl shadow-sm ${
                          message.sender === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : `${theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-white text-gray-900'} border ${theme === 'dark' ? 'border-gray-500' : 'border-gray-200'} rounded-tl-none`
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
                          <p className={`text-xs mt-2 ${message.sender === 'user' ? 'text-blue-100' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                ))}
                
                {isTyping && (
                    <div className="flex justify-start mb-4 animate-fade-in">
                      <div className="flex items-start">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mr-3 flex-shrink-0 shadow-md">
                          <SmartToy className="w-5 h-5 text-white" />
                        </div>
                        <div className={`p-4 rounded-2xl rounded-tl-none shadow-sm ${theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-white text-gray-900'} border ${theme === 'dark' ? 'border-gray-500' : 'border-gray-200'}`}>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                )}
                  
                  {/* Invisible element to scroll to */}
                  <div ref={messagesEndRef} />
                </div>

              {/* Input */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={t('chatbotSupport.typeYourMessage')}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      className={`w-full px-4 py-3 pr-12 border rounded-xl ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  />
                    {inputText.trim() && (
                  <button
                    onClick={handleSendMessage}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md`}
                        title={t('chatbotSupport.sendMessage')}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                    )}
                  </div>
                  {!inputText.trim() && (
                    <button
                      onClick={handleSendMessage}
                      disabled
                      className="px-4 py-3 rounded-xl bg-gray-300 text-gray-500 cursor-not-allowed transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  )}
                </div>
          </Card>
            </div>

        {/* Suggestions & Chat History - Optimized Layout */}
            <div className="lg:sticky lg:top-4">
              <div className="space-y-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2">
                {/* All Question Categories in One Card with Accordion */}
          <Card
                  className={`border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-4`}
                style={{
                  borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  boxShadow: 'none !important'
                }}
              >
                  <div className="flex items-center mb-3">
                    <Lightbulb className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
                    <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {t('chatbotSupport.sampleQuestions')}
                </h3>
                  </div>
                <div className="space-y-2">
                    {questionCategories.map((category, catIndex) => (
                      <div
                        key={catIndex}
                        className={`border rounded-lg ${
                          theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                        }`}
                      >
                        <button
                          onClick={() => toggleCategory(catIndex)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-t-lg ${
                            theme === 'dark'
                              ? 'bg-gray-700 hover:bg-gray-600 text-white'
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                          } transition-colors`}
                        >
                          <div className="flex items-center">
                            <span className="mr-2">{category.icon}</span>
                            <span className="text-xs font-medium">{category.title}</span>
                          </div>
                          {expandedCategories[catIndex] ? (
                            <ExpandLess className="w-4 h-4" />
                          ) : (
                            <ExpandMore className="w-4 h-4" />
                          )}
                        </button>
                        {expandedCategories[catIndex] && (
                          <div className="p-2 space-y-1.5">
                            {category.questions.map((question, qIndex) => (
                    <button
                                key={qIndex}
                                onClick={() => handleQuestionClick(question)}
                                className={`w-full text-left px-2.5 py-1.5 rounded border text-xs ${
                        theme === 'dark'
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      } transition-colors`}
                    >
                                {question}
                    </button>
                            ))}
                          </div>
                        )}
                      </div>
                  ))}
                </div>
              </Card>

                {/* Chat History */}
                <Card 
                  className={`border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-4`}
                  style={{
                    borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                    boxShadow: 'none !important'
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <HistoryIcon className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                      <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {t('chatbotSupport.chatHistory')}
                      </h3>
                    </div>
                    <button
                      onClick={handleNewConversation}
                      className={`text-xs px-2 py-1 rounded border ${
                        theme === 'dark'
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      } transition-colors`}
                      title={t('chatbotSupport.new')}
                    >
                      {t('chatbotSupport.new')}
                    </button>
                  </div>
                  
                  {loadingConversations ? (
                    <div className={`text-xs text-center py-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {t('chatbotSupport.loading')}
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className={`text-xs text-center py-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {t('chatbotSupport.noPreviousConversations')}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                      {conversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv.id)}
                          className={`w-full text-left px-2.5 py-2 rounded border text-xs transition-colors ${
                            conversationId === conv.id
                              ? theme === 'dark'
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-blue-50 border-blue-300 text-blue-900'
                              : theme === 'dark'
                                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center mb-1">
                                <ChatIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="font-medium truncate">
                                  {conv.lastMessage?.content?.substring(0, 30) || t('chatbotSupport.noPreviousConversations')}
                                  {conv.lastMessage?.content && conv.lastMessage.content.length > 30 ? '...' : ''}
                                </span>
                              </div>
                              <div className={`text-xs mt-1 ${conversationId === conv.id ? 'text-blue-200' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {formatDate(conv.updatedAt)} • {conv.messageCount} {t('chatbotSupport.messages')}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
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

              {/* Mobile Chat Status */}
              <div className="mb-8">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('chatbotSupport.chatStatus')}
                </h3>
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {t('chatbotSupport.aiAssistantOnline')}
                    </span>
                  </div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t('chatbotSupport.readyToHelp')}
                  </p>
                </div>
              </div>

              {/* Mobile Quick Actions */}
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    navigate('/student/book')
                    setMobileOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <CheckCircleIcon className="mr-3 w-4 h-4" />
                  {t('chatbotSupport.quickActions.bookSession')}
                </button>
                <button 
                  onClick={() => {
                    navigate('/student/search')
                    setMobileOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <BarChartIcon className="mr-3 w-4 h-4" />
                  {t('chatbotSupport.quickActions.findTutor')}
                </button>
                <button 
                  onClick={() => {
                    navigate('/student/progress')
                    setMobileOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <BarChartIcon className="mr-3 w-4 h-4" />
                  {t('dashboard.menu.viewProgress')}
                </button>
                <button 
                  onClick={() => {
                    navigate('/student')
                    setMobileOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <ArrowBackIcon className="mr-3 w-4 h-4" />
                  {t('chatbotSupport.backToDashboard')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatbotSupport
