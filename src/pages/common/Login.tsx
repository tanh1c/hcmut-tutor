import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { gsap } from 'gsap'
import { useTheme } from '../../contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { 
  Visibility,
  VisibilityOff,
  Google,
  Facebook,
  Apple,
  Security,
  Lock,
  Email,
  Menu as MenuIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Settings as SettingsIcon,
  Palette as PaletteIcon,
  Close as CloseIcon,
  Language as LanguageIcon
} from '@mui/icons-material'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import MovingGif from '../../components/MovingGif'
import BallControls from '../../components/BallControls'
import api from '../../lib/api'

const Login: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme, setTheme } = useTheme()
  const navigate = useNavigate()
  
  const [currentLang, setCurrentLang] = useState(i18n.language)
  
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    setCurrentLang(lang)
  }
  const [showPassword, setShowPassword] = useState(false)
  const [loginMethod, setLoginMethod] = useState('email') // 'email' or 'sso'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [ballSize, setBallSize] = useState(100)
  const [ballSpeed, setBallSpeed] = useState(1.8)
  const [showBallControls, setShowBallControls] = useState(false)
  const [showBall, setShowBall] = useState(false)
  const [showThemeSettings, setShowThemeSettings] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const mainContentRef = useRef<HTMLDivElement>(null)
  const themeSettingsRef = useRef<HTMLDivElement>(null)
  const loginFormRef = useRef<HTMLDivElement>(null)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  // GSAP animations for theme settings
  useEffect(() => {
    if (showThemeSettings && themeSettingsRef.current) {
      gsap.fromTo(themeSettingsRef.current, 
        { 
          opacity: 0, 
          x: 100, 
          scale: 0.95 
        },
        { 
          opacity: 1, 
          x: 0, 
          scale: 1, 
          duration: 0.4, 
          ease: "back.out(1.7)" 
        }
      )
    }
  }, [showThemeSettings])

  // GSAP animation for theme switching
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'neo-brutalism') => {
    if (loginFormRef.current) {
      gsap.to(loginFormRef.current, {
        scale: 0.98,
        opacity: 0.8,
        duration: 0.2,
        ease: "power2.out",
        onComplete: () => {
          setTheme(newTheme)
          gsap.to(loginFormRef.current, {
            scale: 1,
            opacity: 1,
            duration: 0.3,
            ease: "back.out(1.7)"
          })
        }
      })
    } else {
      setTheme(newTheme)
    }
  }

  // Neo-brutalism styling helpers
  const getNeoBrutalismStyles = () => {
    if (theme !== 'neo-brutalism') return {}
    
    return {
      container: {
        background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #45b7d1 100%)',
        minHeight: '100vh'
      },
      card: {
        backgroundColor: '#ffffff',
        border: '4px solid #000000',
        borderRadius: '0px',
        boxShadow: '8px 8px 0px #000000'
      },
      button: {
        backgroundColor: '#ff6b6b',
        color: '#ffffff',
        border: '3px solid #000000',
        borderRadius: '0px',
        boxShadow: '4px 4px 0px #000000',
        fontWeight: 'bold',
        textTransform: 'uppercase'
      },
      input: {
        backgroundColor: '#ffffff',
        border: '3px solid #000000',
        borderRadius: '0px',
        boxShadow: 'inset 2px 2px 0px #000000'
      },
      sidebar: {
        backgroundColor: '#4ecdc4',
        border: '4px solid #000000',
        boxShadow: '4px 4px 0px #000000'
      }
    }
  }

  // Update container size when window resizes
  useEffect(() => {
    const updateSize = () => {
      if (mainContentRef.current) {
        const rect = mainContentRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const result = await api.auth.login(formData.email, formData.password)
      
      if (result.success) {
        const { user, token } = result.data
        
        // Save token and user info
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        
        // Navigate based on role
        if (user.role === 'student') {
          navigate('/student')
        } else if (user.role === 'tutor') {
          navigate('/tutor')
        } else if (user.role === 'management') {
          navigate('/management')
        }
      } else {
        setError(result.error || 'Đăng nhập thất bại')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Có lỗi xảy ra khi đăng nhập')
    } finally {
      setLoading(false)
    }
  }

  const handleSSOLogin = (provider: string) => {
    console.log(`SSO Login with ${provider}`)
    // Navigate to appropriate dashboard based on user role
    navigate('/student')
  }

  const ssoProviders = [
    { name: 'Google', icon: <Google />, color: 'bg-red-500 hover:bg-red-600' },
    { name: 'Facebook', icon: <Facebook />, color: 'bg-blue-600 hover:bg-blue-700' },
    { name: 'Apple', icon: <Apple />, color: 'bg-gray-800 hover:bg-gray-900' }
  ]

  const neoStyles = getNeoBrutalismStyles()

  return (
    <div 
      className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : theme === 'neo-brutalism' ? '' : 'bg-gray-50'}`}
      style={theme === 'neo-brutalism' ? neoStyles.container : {}}
    >
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Sidebar */}
        <div 
          className={`w-full lg:w-60 lg:min-w-[240px] h-auto lg:h-screen lg:sticky lg:top-0 lg:overflow-y-auto ${theme === 'dark' ? 'bg-gray-800' : theme === 'neo-brutalism' ? '' : 'bg-white'} border-r ${theme === 'dark' ? 'border-gray-700' : theme === 'neo-brutalism' ? '' : 'border-gray-200'} lg:block`}
          style={theme === 'neo-brutalism' ? neoStyles.sidebar : {}}
        >
          <div className="p-6">
            {/* Logo */}
            <div className="flex items-center mb-8">
              <div className="w-10 h-10 flex items-center justify-center mr-3">
                <img src="/HCMCUT.png" alt="HCMUT Logo" className="w-10 h-10" />
              </div>
              <span className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                HCMUT
              </span>
            </div>

            {/* Login Methods */}
            <div className="mb-8">
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                LOGIN METHODS
              </h3>
              <div className="space-y-2">
                <button 
                  onClick={() => setLoginMethod('email')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${
                    loginMethod === 'email' 
                      ? 'bg-blue-100 text-blue-700' 
                      : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                  }`}
                >
                  <Security className="mr-3 w-4 h-4" />
                  {t('login.ssoLogin')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div ref={mainContentRef} className="flex-1 p-4 lg:p-6 xl:p-8 relative overflow-y-auto overflow-x-hidden max-h-screen">
          {/* Moving GIF */}
          {showBall && containerSize.width > 0 && containerSize.height > 0 && (
            <MovingGif
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
              ballSize={ballSize}
              speed={ballSpeed}
              gifUrl="/tenor.gif"
            />
          )}

          {/* Ball Controls */}
          {showBall && showBallControls && (
            <BallControls
              ballSize={ballSize}
              speed={ballSpeed}
              onSizeChange={setBallSize}
              onSpeedChange={setBallSpeed}
              theme={theme === 'neo-brutalism' ? 'light' : theme}
            />
          )}
          {/* Mobile Menu Button & Theme Toggle */}
          <div className="lg:hidden mb-4 flex items-center justify-between">
            <button
              onClick={handleDrawerToggle}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
            >
              <MenuIcon className="w-6 h-6" />
            </button>
            
            <div className="flex items-center space-x-2">
              {/* Mobile Ball Toggle */}
              <button
                onClick={() => setShowBall(!showBall)}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : theme === 'neo-brutalism' ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-white hover:bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700' : theme === 'neo-brutalism' ? 'border-4 border-black' : 'border-gray-200'} transition-colors`}
                style={theme === 'neo-brutalism' ? { boxShadow: '4px 4px 0px #000000' } : {}}
                title={`${showBall ? 'Hide' : 'Show'} Moving Ball`}
              >
                <div className={`w-4 h-4 rounded-full ${showBall ? (theme === 'dark' ? 'bg-blue-400' : theme === 'neo-brutalism' ? 'bg-black' : 'bg-blue-600') : (theme === 'dark' ? 'bg-gray-400' : theme === 'neo-brutalism' ? 'bg-white' : 'bg-gray-600')}`} />
              </button>

              {/* Mobile Theme Settings Toggle */}
              <button
                onClick={() => setShowThemeSettings(!showThemeSettings)}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : theme === 'neo-brutalism' ? 'bg-purple-400 hover:bg-purple-500' : 'bg-white hover:bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700' : theme === 'neo-brutalism' ? 'border-4 border-black' : 'border-gray-200'} transition-colors`}
                style={theme === 'neo-brutalism' ? { boxShadow: '4px 4px 0px #000000' } : {}}
                title="Theme Settings"
              >
                <PaletteIcon className={`w-6 h-6 ${theme === 'dark' ? 'text-gray-400' : theme === 'neo-brutalism' ? 'text-black' : 'text-gray-600'}`} />
              </button>
              
              {/* Mobile Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : theme === 'neo-brutalism' ? 'bg-pink-400 hover:bg-pink-500' : 'bg-white hover:bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700' : theme === 'neo-brutalism' ? 'border-4 border-black' : 'border-gray-200'} transition-colors`}
                style={theme === 'neo-brutalism' ? { boxShadow: '4px 4px 0px #000000' } : {}}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? <LightModeIcon className="w-6 h-6 text-yellow-400" /> : theme === 'neo-brutalism' ? <DarkModeIcon className="w-6 h-6 text-black" /> : <DarkModeIcon className="w-6 h-6" />}
              </button>

              {/* Mobile Language Toggle */}
              <button
                onClick={() => changeLanguage(currentLang === 'vi' ? 'en' : 'vi')}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : theme === 'neo-brutalism' ? 'bg-orange-400 hover:bg-orange-500' : 'bg-white hover:bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700' : theme === 'neo-brutalism' ? 'border-4 border-black' : 'border-gray-200'} transition-colors`}
                style={theme === 'neo-brutalism' ? { boxShadow: '4px 4px 0px #000000' } : {}}
                title="Switch Language"
              >
                <LanguageIcon className={`w-6 h-6 ${theme === 'dark' ? 'text-gray-400' : theme === 'neo-brutalism' ? 'text-black' : 'text-gray-600'}`} />
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div className="flex-shrink-0">
                <h1 className={`text-2xl lg:text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t('login.title')}
                </h1>
                <p className={`text-base lg:text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('login.subtitle')}
                </p>
              </div>
              
              {/* Control Buttons */}
              <div className="hidden lg:flex items-center space-x-2 flex-shrink-0">
                {/* Language Toggle */}
                <button
                  onClick={() => changeLanguage(currentLang === 'vi' ? 'en' : 'vi')}
                  className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : theme === 'neo-brutalism' ? 'bg-orange-400 hover:bg-orange-500' : 'bg-white hover:bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700' : theme === 'neo-brutalism' ? 'border-4 border-black' : 'border-gray-200'} transition-colors`}
                  style={theme === 'neo-brutalism' ? { boxShadow: '4px 4px 0px #000000' } : {}}
                  title="Switch Language"
                >
                  <LanguageIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : theme === 'neo-brutalism' ? 'text-black' : 'text-gray-600'}`} />
                </button>
                {/* Ball Toggle */}
                <button
                  onClick={() => setShowBall(!showBall)}
                  className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : theme === 'neo-brutalism' ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-white hover:bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700' : theme === 'neo-brutalism' ? 'border-4 border-black' : 'border-gray-200'} transition-colors`}
                  style={theme === 'neo-brutalism' ? { boxShadow: '4px 4px 0px #000000' } : {}}
                  title={`${showBall ? 'Hide' : 'Show'} Moving Ball`}
                >
                  <div className={`w-5 h-5 rounded-full ${showBall ? (theme === 'dark' ? 'bg-blue-400' : theme === 'neo-brutalism' ? 'bg-black' : 'bg-blue-600') : (theme === 'dark' ? 'bg-gray-400' : theme === 'neo-brutalism' ? 'bg-white' : 'bg-gray-600')}`} />
                </button>
                
                {/* Ball Controls Toggle */}
                <button
                  onClick={() => setShowBallControls(!showBallControls)}
                  className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : theme === 'neo-brutalism' ? 'bg-green-400 hover:bg-green-500' : 'bg-white hover:bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700' : theme === 'neo-brutalism' ? 'border-4 border-black' : 'border-gray-200'} transition-colors`}
                  style={theme === 'neo-brutalism' ? { boxShadow: '4px 4px 0px #000000' } : {}}
                  title={`${showBallControls ? 'Hide' : 'Show'} Ball Controls`}
                >
                  <SettingsIcon className={`w-5 h-5 ${showBallControls ? (theme === 'dark' ? 'text-blue-400' : theme === 'neo-brutalism' ? 'text-black' : 'text-blue-600') : (theme === 'dark' ? 'text-gray-400' : theme === 'neo-brutalism' ? 'text-black' : 'text-gray-600')}`} />
                </button>

                {/* Theme Settings Toggle */}
                <button
                  onClick={() => setShowThemeSettings(!showThemeSettings)}
                  className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : theme === 'neo-brutalism' ? 'bg-purple-400 hover:bg-purple-500' : 'bg-white hover:bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700' : theme === 'neo-brutalism' ? 'border-4 border-black' : 'border-gray-200'} transition-colors`}
                  style={theme === 'neo-brutalism' ? { boxShadow: '4px 4px 0px #000000' } : {}}
                  title="Theme Settings"
                >
                  <PaletteIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : theme === 'neo-brutalism' ? 'text-black' : 'text-gray-600'}`} />
                </button>
              
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : theme === 'neo-brutalism' ? 'bg-pink-400 hover:bg-pink-500' : 'bg-white hover:bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700' : theme === 'neo-brutalism' ? 'border-4 border-black' : 'border-gray-200'} transition-colors`}
                style={theme === 'neo-brutalism' ? { boxShadow: '4px 4px 0px #000000' } : {}}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? <LightModeIcon className="w-5 h-5 text-yellow-400" /> : theme === 'neo-brutalism' ? <DarkModeIcon className="w-5 h-5 text-black" /> : <DarkModeIcon className="w-5 h-5" />}
              </button>
              </div>
            </div>
          </div>

          {/* Theme Settings Panel - Vertical Layout */}
          {showThemeSettings && (
            <>
              {/* Overlay */}
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setShowThemeSettings(false)}
              />
              <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] z-50" ref={themeSettingsRef}>
              <div 
                className={`h-full p-6 border-l overflow-y-auto ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : theme === 'neo-brutalism' ? 'bg-white' : 'bg-white border-gray-200'}`}
                style={theme === 'neo-brutalism' ? neoStyles.card : {}}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : theme === 'neo-brutalism' ? 'text-black' : 'text-gray-900'}`}>
                    Theme Settings
                  </h3>
                  <button
                    onClick={() => setShowThemeSettings(false)}
                    className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-700' : theme === 'neo-brutalism' ? 'hover:bg-gray-100' : 'hover:bg-gray-100'}`}
                  >
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`w-full p-4 rounded-lg text-left transition-all duration-200 ${
                      theme === 'light' 
                        ? 'bg-blue-100 border-2 border-blue-300 text-blue-700' 
                        : theme === 'dark' 
                          ? 'bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600' 
                          : theme === 'neo-brutalism'
                            ? 'bg-blue-400 border-2 border-black text-white hover:bg-blue-500'
                            : 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={theme === 'neo-brutalism' ? { boxShadow: '4px 4px 0px #000000' } : {}}
                  >
                    <div className="flex items-center">
                      <LightModeIcon className="w-6 h-6 mr-3" />
                      <div>
                        <div className="font-semibold">Light Mode</div>
                        <div className="text-sm opacity-75">Clean & minimal</div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`w-full p-4 rounded-lg text-left transition-all duration-200 ${
                      theme === 'dark' 
                        ? 'bg-blue-100 border-2 border-blue-300 text-blue-700' 
                        : theme === 'light' 
                          ? 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200' 
                          : theme === 'neo-brutalism'
                            ? 'bg-gray-800 border-2 border-black text-white hover:bg-gray-700'
                            : 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={theme === 'neo-brutalism' ? { boxShadow: '4px 4px 0px #000000' } : {}}
                  >
                    <div className="flex items-center">
                      <DarkModeIcon className="w-6 h-6 mr-3" />
                      <div>
                        <div className="font-semibold">Dark Mode</div>
                        <div className="text-sm opacity-75">Easy on the eyes</div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleThemeChange('neo-brutalism')}
                    className={`w-full p-4 rounded-lg text-left transition-all duration-200 ${
                      theme === 'neo-brutalism' 
                        ? 'bg-yellow-400 border-2 border-black text-black' 
                        : theme === 'dark' 
                          ? 'bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600' 
                          : theme === 'light'
                            ? 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200'
                            : 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={theme === 'neo-brutalism' ? { boxShadow: '4px 4px 0px #000000' } : {}}
                  >
                    <div className="flex items-center">
                      <PaletteIcon className="w-6 h-6 mr-3" />
                      <div>
                        <div className="font-semibold">Neo-Brutalism</div>
                        <div className="text-sm opacity-75">Bold & vibrant</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
              </div>
            </>
          )}

          {/* Login Form */}
          <div className="w-full max-w-md mx-auto px-4 sm:px-0" ref={loginFormRef}>
            <Card 
              className={`p-6 sm:p-8 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : theme === 'neo-brutalism' ? 'bg-white' : 'bg-white border-gray-200'}`}
              style={{
                borderColor: theme === 'dark' ? '#374151' : theme === 'neo-brutalism' ? '#000000' : '#e5e7eb',
                backgroundColor: theme === 'dark' ? '#1f2937' : theme === 'neo-brutalism' ? '#ffffff' : '#ffffff',
                boxShadow: theme === 'neo-brutalism' ? '8px 8px 0px #000000' : 'none',
                borderWidth: theme === 'neo-brutalism' ? '4px' : '1px',
                borderRadius: theme === 'neo-brutalism' ? '0px' : '8px',
                // Reset all neo-brutalism styles when not active
                ...(theme !== 'neo-brutalism' && {
                  boxShadow: 'none',
                  borderWidth: '1px',
                  borderRadius: '8px',
                  borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
                })
              }}
            >
              {loginMethod === 'email' ? (
                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : theme === 'neo-brutalism' ? 'text-black' : 'text-gray-900'}`}>
                      {t('login.emailLabel')}
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-4 py-3 pl-10 border ${
                          theme === 'dark' 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 rounded-lg' 
                            : theme === 'neo-brutalism'
                              ? 'bg-white border-black text-black placeholder-gray-500'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 rounded-lg'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        style={theme === 'neo-brutalism' ? { 
                          borderWidth: '3px', 
                          borderRadius: '0px',
                          boxShadow: 'inset 2px 2px 0px #000000'
                        } : {
                          borderWidth: '1px',
                          borderRadius: '8px',
                          boxShadow: 'none'
                        }}
                        placeholder={t('login.emailPlaceholder')}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <Email className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : theme === 'neo-brutalism' ? 'text-black' : 'text-gray-900'}`}>
                      {t('login.passwordLabel')}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-4 py-3 pl-10 pr-10 border ${
                          theme === 'dark' 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 rounded-lg' 
                            : theme === 'neo-brutalism'
                              ? 'bg-white border-black text-black placeholder-gray-500'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 rounded-lg'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        style={theme === 'neo-brutalism' ? { 
                          borderWidth: '3px', 
                          borderRadius: '0px',
                          boxShadow: 'inset 2px 2px 0px #000000'
                        } : {
                          borderWidth: '1px',
                          borderRadius: '8px',
                          boxShadow: 'none'
                        }}
                        placeholder={t('login.passwordPlaceholder')}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showPassword ? <VisibilityOff className="w-5 h-5 text-gray-400" /> : <Visibility className="w-5 h-5 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="rememberMe"
                        checked={formData.rememberMe}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {t('login.rememberMe')}
                      </span>
                    </label>
                    <button
                      type="button"
                      className={`text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
                    >
                      {t('login.forgotPassword')}
                    </button>
                  </div>

                  {/* Error message */}
                  {error && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                      {error}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className={`w-full ${theme === 'neo-brutalism' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'} text-white ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={theme === 'neo-brutalism' ? { 
                      border: '3px solid #000000',
                      borderRadius: '0px',
                      boxShadow: '4px 4px 0px #000000',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    } : {
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: 'none',
                      fontWeight: 'normal',
                      textTransform: 'none'
                    }}
                  >
                    {loading ? t('login.loggingIn') : t('login.loginButton')}
                  </Button>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : theme === 'neo-brutalism' ? 'text-black' : 'text-gray-900'}`}>
                      Single Sign-On
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : theme === 'neo-brutalism' ? 'text-black' : 'text-gray-600'}`}>
                      Choose your preferred SSO provider
                    </p>
                  </div>

                  <div className="space-y-3">
                    {ssoProviders.map((provider, index) => (
                      <Button
                        key={index}
                        onClick={() => handleSSOLogin(provider.name)}
                        className={`w-full ${provider.color} text-white flex items-center justify-center py-3`}
                        style={{
                          backgroundColor: provider.color.includes('red') ? '#ef4444' : 
                                         provider.color.includes('blue') ? '#2563eb' : 
                                         theme === 'dark' ? '#374151' : theme === 'neo-brutalism' ? '#1f2937' : '#1f2937',
                          color: '#ffffff',
                          textTransform: theme === 'neo-brutalism' ? 'uppercase' : 'none',
                          fontWeight: theme === 'neo-brutalism' ? 'bold' : '500',
                          border: theme === 'neo-brutalism' ? '3px solid #000000' : 'none',
                          borderRadius: theme === 'neo-brutalism' ? '0px' : '8px',
                          boxShadow: theme === 'neo-brutalism' ? '4px 4px 0px #000000' : 'none',
                          // Reset to default when not neo-brutalism
                          ...(theme !== 'neo-brutalism' && {
                            textTransform: 'none',
                            fontWeight: '500',
                            border: 'none',
                            borderRadius: '8px',
                            boxShadow: 'none'
                          })
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = provider.color.includes('red') ? '#dc2626' : 
                                                             provider.color.includes('blue') ? '#1e40af' : 
                                                             theme === 'dark' ? '#4b5563' : '#111827'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = provider.color.includes('red') ? '#ef4444' : 
                                                             provider.color.includes('blue') ? '#2563eb' : 
                                                             theme === 'dark' ? '#374151' : '#1f2937'
                        }}
                      >
                        <span className="mr-3">{provider.icon}</span>
                        Continue with {provider.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 text-center">
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('login.noAccount')}{' '}
                  <button 
                    onClick={() => navigate('/common/register')}
                    className={`${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
                  >
                    {t('login.signUp')}
                  </button>
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleDrawerToggle}></div>
          <div className={`fixed left-0 top-0 h-full w-80 max-w-[85vw] ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-xl overflow-y-auto`}>
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

              {/* Mobile Login Methods */}
              <div className="mb-8">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  LOGIN METHODS
                </h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setLoginMethod('email')
                      setMobileOpen(false)
                    }}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${
                      loginMethod === 'email' 
                        ? 'bg-blue-100 text-blue-700' 
                        : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                    }`}
                  >
                    <Security className="mr-3 w-4 h-4" />
                    {t('login.ssoLogin')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
