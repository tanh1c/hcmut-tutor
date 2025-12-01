import React from 'react'
import { Avatar } from '@mui/material'
import { getInitials, getAvatarColor } from '../../utils/avatarUtils'

type Theme = 'light' | 'dark' | 'neo-brutalism'

interface User {
  id: string
  name?: string
  email?: string
  isActive?: boolean
}

interface ActiveUsersSectionProps {
  activeUsers: User[]
  loading: boolean
  theme: Theme
  onUserClick: (userId: string) => void
  t: (key: string) => string
}

export const ActiveUsersSection: React.FC<ActiveUsersSectionProps> = ({
  activeUsers,
  loading,
  theme,
  onUserClick,
  t
}) => {
  const isDark = theme === 'dark' || theme === 'neo-brutalism'
  
  if (loading) {
    return (
      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} py-4`}>
        {t('messages.loading')}
      </div>
    )
  }

  if (activeUsers.length === 0) {
    return (
      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} py-4`}>
        {t('messages.noOnlineUsers')}
      </div>
    )
  }

  return (
    <div 
      className="flex space-x-4 overflow-x-auto pb-2"
      style={{
        width: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'thin',
        scrollbarColor: isDark ? '#4b5563 #1f2937' : '#9ca3af #e5e7eb',
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x proximity',
        msOverflowStyle: '-ms-autohiding-scrollbar',
        display: 'flex',
        flexWrap: 'nowrap',
        whiteSpace: 'nowrap'
      }}
    >
      {activeUsers.map((user) => (
        <div 
          key={user.id} 
          className="flex flex-col items-center min-w-[80px] flex-shrink-0 cursor-pointer"
          style={{ scrollSnapAlign: 'start' }}
          onClick={() => onUserClick(user.id)}
        >
          <div className="relative">
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: getAvatarColor(user.name || user.email || ''),
                fontSize: '1.5rem',
                fontWeight: 'bold',
                border: user.isActive ? '3px solid #10b981' : '3px solid transparent'
              }}
            >
              {getInitials(user.name || user.email || '')}
            </Avatar>
            {user.isActive && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <span className={`text-xs text-center mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {(user.name || user.email || '').split(' ')[0]}
          </span>
        </div>
      ))}
    </div>
  )
}


