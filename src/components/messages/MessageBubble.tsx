import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { AttachFile as AttachFileIcon } from '@mui/icons-material'

type Theme = 'light' | 'dark' | 'neo-brutalism'

interface Message {
  id: string
  content: string
  type: 'text' | 'file' | 'image'
  fileUrl?: string
  createdAt: string
  senderId: string
}

interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
  theme: Theme
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  theme
}) => {
  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}
    >
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isOwnMessage
          ? (theme === 'dark' || theme === 'neo-brutalism') ? 'bg-blue-600' : 'bg-blue-500'
          : (theme === 'dark' || theme === 'neo-brutalism') ? 'bg-gray-700' : 'bg-gray-200'
      } ${isOwnMessage ? 'text-white' : (theme === 'dark' || theme === 'neo-brutalism') ? 'text-white' : 'text-gray-900'}`}>
        {/* File Message */}
        {message.type === 'file' && message.fileUrl && (
          <div className="mb-2">
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 hover:underline"
            >
              <AttachFileIcon className="w-4 h-4" />
              <span className="break-words">{message.content}</span>
            </a>
          </div>
        )}
        {/* Image Message */}
        {message.type === 'image' && message.fileUrl && (
          <div className="mb-2">
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={message.fileUrl}
                alt={message.content}
                className="max-w-full h-auto rounded-lg cursor-pointer"
                style={{ maxHeight: '300px' }}
              />
            </a>
            <p className="text-xs mt-1 break-words">{message.content}</p>
          </div>
        )}
        {/* Text Message */}
        {message.type === 'text' && (
          <p className="break-words">{message.content || '(No content)'}</p>
        )}
        <span className={`text-xs block mt-1 ${
          isOwnMessage
            ? (theme === 'dark' || theme === 'neo-brutalism') ? 'text-blue-200' : 'text-blue-100'
            : (theme === 'dark' || theme === 'neo-brutalism') ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  )
}


