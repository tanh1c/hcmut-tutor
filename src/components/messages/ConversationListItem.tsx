import React from 'react'
import { Avatar } from '@mui/material'
import { getAvatarColor } from '../../utils/avatarUtils'

type Theme = 'light' | 'dark' | 'neo-brutalism'

interface ConversationListItemProps {
  conversation: {
    id: string
    name: string
    lastMessage: string
    time: string
    unread: number
    online: boolean
    avatar: string
    subject: string
    type: string
  }
  isSelected: boolean
  theme: Theme
  onClick: () => void
  t: (key: string) => string
}

export const ConversationListItem: React.FC<ConversationListItemProps> = ({
  conversation,
  isSelected,
  theme,
  onClick,
  t
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 border-b cursor-pointer transition-colors ${
        isSelected
          ? (theme === 'dark' || theme === 'neo-brutalism') ? 'bg-gray-700' : 'bg-blue-50'
          : (theme === 'dark' || theme === 'neo-brutalism') ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
      } ${(theme === 'dark' || theme === 'neo-brutalism') ? 'border-gray-700' : 'border-gray-200'}`}
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
            <h3 className={`font-medium truncate ${(theme === 'dark' || theme === 'neo-brutalism') ? 'text-white' : 'text-gray-900'}`}>
              {conversation.name}
            </h3>
            <span className={`text-xs ${(theme === 'dark' || theme === 'neo-brutalism') ? 'text-gray-400' : 'text-gray-500'}`}>
              {conversation.time}
            </span>
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <p className={`text-sm truncate ${(theme === 'dark' || theme === 'neo-brutalism') ? 'text-gray-300' : 'text-gray-600'}`}>
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
            <span className={`text-xs ml-2 ${(theme === 'dark' || theme === 'neo-brutalism') ? 'text-gray-400' : 'text-gray-500'}`}>
              {conversation.subject}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}


