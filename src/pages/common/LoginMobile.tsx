import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
  Close as CloseIcon,
  LocationOn as LocationOnIcon,
  AccessTime as AccessTimeIcon,
  WbSunny as WbSunnyIcon,
  Cloud as CloudIcon,
  Thunderstorm as ThunderstormIcon,
  AcUnit as AcUnitIcon,
  Language as LanguageIcon
} from '@mui/icons-material'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import '../../styles/weather-animations.css'
import api from '../../lib/api'

const LoginMobile: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()
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
  
  // Time and weather states
  const [currentTime, setCurrentTime] = useState(new Date())
  const [weather, setWeather] = useState<any>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleThemeToggle = () => {
    toggleTheme()
  }

  // Weather API function
  const fetchWeather = async () => {
    try {
      setWeatherLoading(true)
      const API_KEY = 'd055198c2320f9b77049b5b9a1db7205'
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=Ho%20Chi%20Minh%20City&appid=${API_KEY}&units=metric`
      )
      const data = await response.json()
      setWeather(data)
    } catch (error) {
      console.error('Error fetching weather:', error)
      setWeather({
        main: { temp: 28, humidity: 75 },
        weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
        name: 'Ho Chi Minh City'
      })
    } finally {
      setWeatherLoading(false)
    }
  }

  // Get weather icon with time consideration
  const getWeatherIcon = (weatherMain: string) => {
    const hour = currentTime.getHours()
    const isNight = hour >= 18 || hour <= 6 // 6 PM to 6 AM is considered night
    
    switch (weatherMain.toLowerCase()) {
      case 'clear':
        if (isNight) {
          return <WbSunnyIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-400'}`} />
        } else {
          return <WbSunnyIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'}`} />
        }
      case 'clouds':
        return <CloudIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
      case 'rain':
      case 'drizzle':
        return <ThunderstormIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
      case 'snow':
        return <AcUnitIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-500'}`} />
      default:
        if (isNight) {
          return <WbSunnyIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-400'}`} />
        } else {
          return <WbSunnyIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'}`} />
        }
    }
  }

  // Get weather background class
  const getWeatherBackground = (weatherMain: string) => {
    switch (weatherMain.toLowerCase()) {
      case 'clear':
        return 'weather-sunny'
      case 'clouds':
        return 'weather-cloudy'
      case 'rain':
      case 'drizzle':
        return 'weather-rainy'
      case 'snow':
        return 'weather-snowy'
      default:
        return 'weather-sunny'
    }
  }

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  // useEffect for time and weather
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    fetchWeather()
    const weatherInterval = setInterval(fetchWeather, 10 * 60 * 1000)

    return () => {
      clearInterval(timeInterval)
      clearInterval(weatherInterval)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} pb-16`}>
      {/* Mobile Header */}
      <div className={`sticky top-0 z-40 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 flex items-center justify-center mr-3">
              <img src="/HCMCUT.png" alt="HCMUT Logo" className="w-8 h-8" />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {t('login.title')}
              </h1>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('login.subtitle').split('.')[0]}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
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
        {/* Time & Weather Widget - Mobile */}
        <div className={`rounded-xl p-4 shadow-lg relative overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} ${weather ? getWeatherBackground(weather.weather[0].main) : 'weather-sunny'}`}>
          {/* Weather Background Effects */}
          {weather && (
            <>
              {/* Sunny Effect */}
              {weather.weather[0].main.toLowerCase() === 'clear' && (
                <div className="absolute inset-0 opacity-20">
                  <div className="sun-animation absolute top-2 right-2 w-12 h-12 bg-yellow-400 rounded-full"></div>
                  <div className="sun-rays absolute top-0 right-0 w-16 h-16">
                    <div className="ray ray-1"></div>
                    <div className="ray ray-2"></div>
                    <div className="ray ray-3"></div>
                    <div className="ray ray-4"></div>
                    <div className="ray ray-5"></div>
                    <div className="ray ray-6"></div>
                    <div className="ray ray-7"></div>
                    <div className="ray ray-8"></div>
                  </div>
                </div>
              )}

              {/* Cloudy Effect */}
              {weather.weather[0].main.toLowerCase() === 'clouds' && (
                <div className="absolute inset-0 opacity-30">
                  <div className="cloud cloud-1"></div>
                  <div className="cloud cloud-2"></div>
                  <div className="cloud cloud-3"></div>
                </div>
              )}

              {/* Rainy Effect */}
              {(weather.weather[0].main.toLowerCase() === 'rain' || weather.weather[0].main.toLowerCase() === 'drizzle') && (
                <div className="absolute inset-0 opacity-40">
                  <div className="rain">
                    <div className="drop drop-1"></div>
                    <div className="drop drop-2"></div>
                    <div className="drop drop-3"></div>
                    <div className="drop drop-4"></div>
                    <div className="drop drop-5"></div>
                    <div className="drop drop-6"></div>
                    <div className="drop drop-7"></div>
                    <div className="drop drop-8"></div>
                    <div className="drop drop-9"></div>
                    <div className="drop drop-10"></div>
                  </div>
                </div>
              )}

              {/* Snowy Effect */}
              {weather.weather[0].main.toLowerCase() === 'snow' && (
                <div className="absolute inset-0 opacity-30">
                  <div className="snow">
                    <div className="flake flake-1"></div>
                    <div className="flake flake-2"></div>
                    <div className="flake flake-3"></div>
                    <div className="flake flake-4"></div>
                    <div className="flake flake-5"></div>
                    <div className="flake flake-6"></div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="relative z-10">
            {/* Time Section */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <AccessTimeIcon className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Current Time</span>
              </div>
              <div className={`text-2xl font-bold mb-1 font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {formatTime(currentTime)}
              </div>
              <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {formatDate(currentTime)}
              </div>
              <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {getGreeting()}, Welcome to HCMUT
              </div>
            </div>

            {/* Weather Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <LocationOnIcon className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Ho Chi Minh City</span>
              </div>

              {weatherLoading ? (
                <div className="flex items-center">
                  <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${theme === 'dark' ? 'border-blue-400' : 'border-blue-600'}`}></div>
                  <span className={`ml-2 text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Loading...</span>
                </div>
              ) : weather ? (
                <div className="flex items-center">
                  {getWeatherIcon(weather.weather[0].main)}
                  <div className="ml-2">
                    <div className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {Math.round(weather.main.temp)}°C
                    </div>
                    <div className={`text-xs capitalize ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {weather.weather[0].description}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Weather unavailable</div>
              )}
            </div>
          </div>
        </div>

        {/* Login Method Toggle - Mobile */}
        <div className="flex space-x-2">
          <button
            onClick={() => setLoginMethod('email')}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              loginMethod === 'email'
                ? 'bg-blue-600 text-white'
                : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Security className="w-4 h-4 mr-2 inline" />
            {t('login.ssoLogin')}
          </button>
        </div>

        {/* Login Form - Mobile */}
        <Card
          className={`p-6 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
          style={{
            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            boxShadow: 'none !important'
          }}
        >
          {loginMethod === 'email' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t('login.emailLabel')}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-3 pl-10 rounded-lg border ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder={t('login.emailPlaceholder')}
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Email className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t('login.passwordLabel')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-3 pl-10 pr-10 rounded-lg border ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
                className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-3 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  backgroundColor: theme === 'dark' ? '#2563eb' : '#3b82f6',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1e40af' : '#2563eb'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2563eb' : '#3b82f6'
                }}
              >
                {loading ? t('login.loggingIn') : t('login.loginButton')}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t('login.ssoLogin')}
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {currentLang === 'vi' ? 'Chọn nhà cung cấp SSO của bạn' : 'Choose your preferred SSO provider'}
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
                                     theme === 'dark' ? '#374151' : '#1f2937',
                      color: '#ffffff',
                      textTransform: 'none',
                      fontWeight: '500'
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

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleDrawerToggle}></div>
          <div className={`fixed left-0 top-0 h-full w-80 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
            <div className="p-6 h-full flex flex-col">
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
                  <CloseIcon className="w-6 h-6" />
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

              {/* Mobile Settings */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  SETTINGS
                </h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => changeLanguage(currentLang === 'vi' ? 'en' : 'vi')}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <LanguageIcon className="mr-3 w-4 h-4" />
                    {currentLang === 'vi' ? 'English' : 'Tiếng Việt'}
                  </button>
                  <button 
                    onClick={handleThemeToggle}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {theme === 'dark' ? <LightModeIcon className="mr-3 w-4 h-4" /> : <DarkModeIcon className="mr-3 w-4 h-4" />}
                    {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
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

export default LoginMobile
