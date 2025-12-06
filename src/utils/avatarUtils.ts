/**
 * Shared utility functions for avatar-related operations
 */

/**
 * Get initials from a name string
 */
export const getInitials = (name: string | undefined | null): string => {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return '?'
  }
  const words = name.trim().split(' ').filter(w => w.length > 0)
  if (words.length === 0) {
    return '?'
  }
  return words
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Generate avatar color based on name
 */
export const getAvatarColor = (name: string | undefined | null): string => {
  // Default to 'Unknown' if name is invalid
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    name = 'Unknown'
  }
  const colors = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
    '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
    '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
    '#ff5722', '#795548', '#607d8b'
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}


