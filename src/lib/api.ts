/**
 * API Client for Frontend
 * Base URL: http://localhost:3000/api or /api in production
 */

import { API_BASE_URL } from '../env';

// Helper to get token from localStorage
const getToken = () => localStorage.getItem('token');

// Helper to make authenticated requests
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log('🌐 [API] Request:', {
    method: options.method || 'GET',
    url,
    body: options.body ? JSON.parse(options.body as string) : undefined
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON, get text and try to parse
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('⚠️ [API] Response is not JSON:', text.substring(0, 200));
        return {
          success: false,
          error: `Server returned invalid response: ${response.status} ${response.statusText}`
        };
      }
    }
    
    console.log('📡 [API] Response:', {
      status: response.status,
      url,
      data
    });

    return data;
  } catch (error: any) {
    // Handle network errors (Failed to fetch, CORS, etc.)
    console.error('❌ [API] Network error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch. Please check your connection and ensure the server is running.'
    };
  }
}

// ===== AUTHENTICATION =====

export const authAPI = {
  async login(email: string, password: string) {
    return fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async register(data: {
    email: string;
    password: string;
    name: string;
    role: 'student' | 'tutor' | 'management';
    [key: string]: any;
  }) {
    return fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async logout() {
    return fetchAPI('/auth/logout', { method: 'POST' });
  },

  async getMe() {
    return fetchAPI('/auth/me');
  },

  async refreshToken(refreshToken: string) {
    return fetchAPI('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
  }
};

// ===== SESSIONS =====

export const sessionsAPI = {
  async list(params?: {
    studentId?: string;
    tutorId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    classId?: string;
    page?: number;
    limit?: number;
  }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return fetchAPI(`/sessions${query}`);
  },

  async create(data: {
    tutorId: string;
    subject: string;
    startTime: string;
    endTime: string;
    duration: number;
    isOnline?: boolean;
    meetingLink?: string;
    description?: string;
    notes?: string;
  }) {
    return fetchAPI('/sessions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async get(id: string) {
    return fetchAPI(`/sessions/${id}`);
  },

  async update(id: string, data: any) {
    return fetchAPI(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async cancel(id: string, reason: string) {
    return fetchAPI(`/sessions/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason })
    });
  },

  async reschedule(id: string, data: {
    startTime: string;
    endTime: string;
    reason?: string;
  }) {
    return fetchAPI(`/sessions/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// ===== TUTORS =====

export const tutorsAPI = {
  async list(params?: {
    subject?: string;
    minRating?: number;
    verified?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return fetchAPI(`/tutors${query}`);
  },

  async get(id: string) {
    return fetchAPI(`/tutors/${id}`);
  },

  async getReviews(id: string, params?: { page?: number; limit?: number }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return fetchAPI(`/tutors/${id}/reviews${query}`);
  }
};

// ===== STUDENTS =====

export const studentsAPI = {
  async get(id: string) {
    return fetchAPI(`/students/${id}`);
  },

  async getSessions(id: string, params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return fetchAPI(`/students/${id}/sessions${query}`);
  }
};

// ===== CALENDAR =====

export const calendarAPI = {
  async get(userId: string, params?: {
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return fetchAPI(`/calendar/${userId}${query}`);
  }
};

// ===== AVAILABILITY =====

export const availabilityAPI = {
  async get(tutorId: string, excludeClasses?: boolean) {
    const query = excludeClasses ? '?excludeClasses=true' : '';
    return fetchAPI(`/availability/${tutorId}${query}`);
  },

  async set(data: {
    timeSlots: Array<{
      day: string;
      startTime: string;
      endTime: string;
    }>;
    exceptions?: Array<{
      date: string;
      reason: string;
    }>;
  }) {
    return fetchAPI('/availability', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async update(id: string, data: any) {
    return fetchAPI(`/availability/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};

// ===== NOTIFICATIONS =====

export const notificationsAPI = {
  async list(params?: {
    unreadOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return fetchAPI(`/notifications${query}`);
  },

  async markAsRead(id: string) {
    return fetchAPI(`/notifications/${id}/read`, { method: 'PUT' });
  },

  async delete(id: string) {
    return fetchAPI(`/notifications/${id}`, { method: 'DELETE' });
  }
};

// ===== PROGRESS =====

export const progressAPI = {
  async list(params?: {
    studentId?: string;
    tutorId?: string;
    subject?: string;
    sessionId?: string;
    page?: number;
    limit?: number;
  }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return fetchAPI(`/progress${query}`);
  },

  async create(data: {
    studentId: string;
    sessionId: string;
    subject: string;
    topic: string;
    notes?: string;
    score: number;
    improvements?: string[];
    challenges?: string[];
    nextSteps?: string[];
  }) {
    return fetchAPI('/progress', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async get(id: string) {
    return fetchAPI(`/progress/${id}`);
  }
};

// ===== FORUM =====

export const forumAPI = {
  posts: {
    async list(params?: {
      category?: string;
      search?: string;
      page?: number;
      limit?: number;
      status?: string;
    }) {
      const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return fetchAPI(`/forum/posts${query}`);
    },

    async create(data: {
      title: string;
      content: string;
      category: string;
      tags?: string[];
    }) {
      return fetchAPI('/forum/posts', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async get(id: string) {
      return fetchAPI(`/forum/posts/${id}`);
    },

    async update(id: string, data: any) {
      return fetchAPI(`/forum/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async delete(id: string) {
      return fetchAPI(`/forum/posts/${id}`, { method: 'DELETE' });
    },

    async like(id: string) {
      return fetchAPI(`/forum/posts/${id}/like`, { method: 'POST' });
    },

    async approve(id: string, notes?: string) {
      return fetchAPI(`/forum/posts/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes })
      });
    },

    async reject(id: string, notes?: string) {
      return fetchAPI(`/forum/posts/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ notes })
      });
    }
  },

  comments: {
    async list(postId: string, params?: { page?: number; limit?: number }) {
      const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return fetchAPI(`/forum/posts/${postId}/comments${query}`);
    },

    async create(postId: string, data: {
      content: string;
      parentCommentId?: string;
    }) {
      return fetchAPI(`/forum/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async like(id: string) {
      return fetchAPI(`/forum/comments/${id}/like`, {
        method: 'POST'
      });
    },

    async delete(id: string) {
      return fetchAPI(`/forum/comments/${id}`, { method: 'DELETE' });
    }
  }
};

// ===== USERS =====

export const usersAPI = {
  async list(params?: {
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return fetchAPI(`/users${query}`);
  },

  async get(id: string) {
    return fetchAPI(`/users/${id}`);
  },

  async getByIds(ids: string[]) {
    // Batch get users by IDs
    const query = ids.length > 0 ? '?ids=' + ids.join(',') : '';
    return fetchAPI(`/users${query}`);
  },

  async update(id: string, data: any) {
    return fetchAPI(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(id: string) {
    return fetchAPI(`/users/${id}`, { method: 'DELETE' });
  }
};

// ===== EVALUATIONS =====

export const evaluationsAPI = {
  async list(params?: {
    studentId?: string;
    tutorId?: string;
    sessionId?: string;
    page?: number;
    limit?: number;
  }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return fetchAPI(`/evaluations${query}`);
  },

  async create(data: {
    sessionId: string;
    rating: number;
    comment?: string;
    aspects?: {
      communication?: number;
      knowledge?: number;
      helpfulness?: number;
      punctuality?: number;
    };
    improvements?: string[];
    recommend?: boolean;
  }) {
    return fetchAPI('/evaluations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async get(id: string) {
    return fetchAPI(`/evaluations/${id}`);
  },

  async update(id: string, data: any) {
    return fetchAPI(`/evaluations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(id: string) {
    return fetchAPI(`/evaluations/${id}`, { method: 'DELETE' });
  }
};

// ===== COURSE CONTENTS =====

export const courseContentsAPI = {
  async list(sessionId: string) {
    return fetchAPI(`/sessions/${sessionId}/course-contents`);
  },

  async create(sessionId: string, data: {
    type: string;
    title: string;
    description?: string;
    content?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    url?: string;
  }) {
    return fetchAPI(`/sessions/${sessionId}/course-contents`, {
      method: 'POST',
      body: JSON.stringify({ ...data, sessionId })
    });
  },

  async update(sessionId: string, contentId: string, data: any) {
    return fetchAPI(`/sessions/${sessionId}/course-contents/${contentId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(sessionId: string, contentId: string) {
    return fetchAPI(`/sessions/${sessionId}/course-contents/${contentId}`, {
      method: 'DELETE'
    });
  }
};

// ===== QUIZZES =====

export const quizzesAPI = {
  async list(sessionId: string) {
    return fetchAPI(`/sessions/${sessionId}/quizzes`);
  },

  async create(sessionId: string, data: {
    title: string;
    description?: string;
    questions: any[];
    duration?: number;
    dueDate?: string;
  }) {
    return fetchAPI(`/sessions/${sessionId}/quizzes`, {
      method: 'POST',
      body: JSON.stringify({ ...data, sessionId })
    });
  },

  async update(sessionId: string, quizId: string, data: any) {
    return fetchAPI(`/sessions/${sessionId}/quizzes/${quizId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(sessionId: string, quizId: string) {
    return fetchAPI(`/sessions/${sessionId}/quizzes/${quizId}`, {
      method: 'DELETE'
    });
  },

  async getSubmissions(sessionId: string, quizId: string) {
    return fetchAPI(`/sessions/${sessionId}/quizzes/${quizId}/submissions`);
  },

  async submit(sessionId: string, quizId: string, answers: {[key: string]: string}) {
    return fetchAPI(`/sessions/${sessionId}/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ quizId, answers })
    });
  }
};

// ===== ASSIGNMENTS =====

export const assignmentsAPI = {
  async list(sessionId: string) {
    return fetchAPI(`/sessions/${sessionId}/assignments`);
  },

  async create(sessionId: string, data: {
    title: string;
    description: string;
    instructions?: string;
    attachments?: any[];
    totalPoints: number;
    dueDate: string;
  }) {
    return fetchAPI(`/sessions/${sessionId}/assignments`, {
      method: 'POST',
      body: JSON.stringify({ ...data, sessionId })
    });
  },

  async update(sessionId: string, assignmentId: string, data: any) {
    return fetchAPI(`/sessions/${sessionId}/assignments/${assignmentId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(sessionId: string, assignmentId: string) {
    return fetchAPI(`/sessions/${sessionId}/assignments/${assignmentId}`, {
      method: 'DELETE'
    });
  },

  async submit(sessionId: string, assignmentId: string, data: {
    content?: string;
    attachments?: any[];
  }) {
    return fetchAPI(`/sessions/${sessionId}/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ assignmentId, ...data })
    });
  }
};

// ===== SUBMISSIONS =====

export const submissionsAPI = {
  async list(sessionId: string) {
    return fetchAPI(`/sessions/${sessionId}/submissions`);
  },

  async grade(sessionId: string, submissionId: string, data: {
    score: number;
    feedback?: string;
  }) {
    return fetchAPI(`/sessions/${sessionId}/submissions/${submissionId}/grade`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};

// ===== GRADES =====

export const gradesAPI = {
  async list(sessionId: string) {
    return fetchAPI(`/sessions/${sessionId}/grades`);
  },

  async getSummary(sessionId: string, studentId?: string) {
    const query = studentId ? `?studentId=${studentId}` : '';
    return fetchAPI(`/sessions/${sessionId}/grades/summary${query}`);
  }
};

// ===== SESSION STUDENTS =====

export const sessionStudentsAPI = {
  async list(sessionId: string) {
    return fetchAPI(`/sessions/${sessionId}/students`);
  },

  async add(sessionId: string, studentId: string) {
    return fetchAPI(`/sessions/${sessionId}/students`, {
      method: 'POST',
      body: JSON.stringify({ studentId })
    });
  },

  async remove(sessionId: string, studentId: string) {
    return fetchAPI(`/sessions/${sessionId}/students/${studentId}`, {
      method: 'DELETE'
    });
  }
};

// ===== CLASSES =====

export const classesAPI = {
  async list(params?: {
    tutorId?: string;
    subject?: string;
    day?: string;
    status?: string;
    availableOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return fetchAPI(`/classes${query}`);
  },

  async create(data: {
    code: string;
    subject: string;
    description?: string;
    day: string;
    startTime: string;
    endTime: string;
    duration: number;
    maxStudents: number;
    semesterStart: string;
    semesterEnd: string;
    isOnline?: boolean;
    location?: string;
  }) {
    return fetchAPI('/classes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async get(id: string) {
    return fetchAPI(`/classes/${id}`);
  },

  async update(id: string, data: any) {
    return fetchAPI(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(id: string) {
    return fetchAPI(`/classes/${id}`, {
      method: 'DELETE'
    });
  },

  async generateSessions(id: string) {
    return fetchAPI(`/classes/${id}/generate-sessions`, {
      method: 'POST'
    });
  }
};

// ===== ENROLLMENTS =====

export const enrollmentsAPI = {
  async list(params?: {
    studentId?: string;
    classId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return fetchAPI(`/enrollments${query}`);
  },

  async create(data: {
    classId: string;
  }) {
    return fetchAPI('/enrollments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async get(id: string) {
    return fetchAPI(`/enrollments/${id}`);
  },

  async update(id: string, data: {
    status?: string;
    notes?: string;
  }) {
    return fetchAPI(`/enrollments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(id: string) {
    return fetchAPI(`/enrollments/${id}`, {
      method: 'DELETE'
    });
  }
};

// ===== SESSION REQUESTS =====

export const sessionRequestsAPI = {
  async list(params?: {
    status?: string;
    type?: 'cancel' | 'reschedule';
    tutorId?: string;
    studentId?: string;
    classId?: string;
    page?: number;
    limit?: number;
  }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return fetchAPI(`/session-requests${query}`);
  },

  async create(data: {
    sessionId: string;
    type: 'cancel' | 'reschedule';
    reason: string;
    preferredStartTime?: string;
    preferredEndTime?: string;
    alternativeSessionId?: string;
  }) {
    return fetchAPI('/session-requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async get(id: string) {
    return fetchAPI(`/session-requests/${id}`);
  },

  async getAlternatives(params: {
    sessionId?: string;
    classId?: string;
  }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return fetchAPI(`/session-requests/alternatives${query}`);
  },

  async approve(id: string, data: {
    responseMessage?: string;
    newStartTime?: string;
    newEndTime?: string;
    alternativeSessionId?: string;
  }) {
    return fetchAPI(`/session-requests/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async reject(id: string, data: {
    responseMessage?: string;
  }) {
    return fetchAPI(`/session-requests/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async withdraw(id: string) {
    return fetchAPI(`/session-requests/${id}`, {
      method: 'DELETE'
    });
  },

  async delete(id: string) {
    return fetchAPI(`/session-requests/${id}`, {
      method: 'DELETE'
    });
  }
};

// ===== CONVERSATIONS =====

export const conversationsAPI = {
  async list() {
    return fetchAPI('/conversations');
  },

  async create(data: {
    participantIds: string[];
  }) {
    return fetchAPI('/conversations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async get(id: string) {
    return fetchAPI(`/conversations/${id}`);
  },

  async getMessages(conversationId: string, params?: { page?: number; limit?: number }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return fetchAPI(`/conversations/${conversationId}/messages${query}`);
  },

  async delete(id: string) {
    return fetchAPI(`/conversations/${id}`, { method: 'DELETE' });
  }
};

// ===== UPLOAD =====

export const uploadAPI = {
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const token = getToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}/upload`;
    console.log('🌐 [API] Upload file:', file.name);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('⚠️ [API] Response is not JSON:', text.substring(0, 200));
        return {
          success: false,
          error: `Server returned invalid response: ${response.status} ${response.statusText}`
        };
      }
    }
    
    console.log('📡 [API] Upload response:', {
      status: response.status,
      data
    });

    return data;
  }
};

// ===== ROOMS =====

export const roomsAPI = {
  async list() {
    return fetchAPI('/rooms');
  },

  async checkAvailability(params: {
    startTime: string;
    endTime: string;
    excludeSessionId?: string;
    equipmentRequirements?: string;
  }) {
    const query = new URLSearchParams({
      startTime: params.startTime,
      endTime: params.endTime,
      ...(params.excludeSessionId && { excludeSessionId: params.excludeSessionId }),
      ...(params.equipmentRequirements && { equipmentRequirements: params.equipmentRequirements })
    });
    return fetchAPI(`/rooms/availability?${query.toString()}`);
  }
};

// ===== MANAGEMENT =====

// ===== CHATBOT =====

export const chatbotAPI = {
  async sendMessage(message: string, conversationHistory: Array<{ sender: 'user' | 'bot', text: string }> = []) {
    return fetchAPI('/chatbot', {
      method: 'POST',
      body: JSON.stringify({ message, conversationHistory })
    });
  },

  async chat(message: string, conversationId?: string) {
    // Convert to sendMessage format for compatibility
    return fetchAPI('/chatbot', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId })
    });
  },

  async getHistory(conversationId?: string, limit?: number) {
    const params: any = {};
    if (conversationId) params.conversationId = conversationId;
    if (limit) params.limit = limit;
    const query = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    return fetchAPI(`/chatbot/history${query}`);
  }
};

export const managementAPI = {
  // Approvals
  approvals: {
    async list(params?: {
      status?: string;
      type?: string;
      priority?: string;
      page?: number;
      limit?: number;
    }) {
      const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return fetchAPI(`/management/approvals${query}`);
    },

    async create(data: {
      type: string;
      targetId?: string;
      title: string;
      description: string;
      priority?: string;
      changeType?: 'change_type' | 'change_location' | 'change_duration';
      changeData?: {
        newType?: 'individual' | 'group';
        newStudentIds?: string[];
        mergeSessionIds?: string[];
        splitInto?: number;
        newIsOnline?: boolean;
        newLocation?: string;
        newMeetingLink?: string;
        newStartTime?: string;
        newEndTime?: string;
        newDuration?: number;
      };
    }) {
      return fetchAPI('/management/approvals', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async get(id: string) {
      return fetchAPI(`/management/approvals/${id}`);
    },

    async approve(id: string, data: { reviewNotes?: string; location?: string }) {
      return fetchAPI(`/management/approvals/${id}/approve`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async reject(id: string, data: { reviewNotes?: string; reason: string }) {
      return fetchAPI(`/management/approvals/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async requestClarification(id: string, data: { clarificationRequest: string }) {
      return fetchAPI(`/management/approvals/${id}/clarify`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    }
  },

  // Permissions
  permissions: {
    async listUsers(params?: {
      role?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) {
      const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return fetchAPI(`/management/permissions/users${query}`);
    },

    async getUserPermissions(userId: string) {
      return fetchAPI(`/management/permissions/users/${userId}`);
    },

    async updateUserPermissions(userId: string, data: {
      permissions: string[];
      reason: string;
    }) {
      return fetchAPI(`/management/permissions/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async grantTemporaryPermissions(userId: string, data: {
      permissions: string[];
      expiresAt: string;
      reason: string;
    }) {
      return fetchAPI(`/management/permissions/users/${userId}/temporary`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async revokePermissions(userId: string, data: {
      permissions: string[];
      reason: string;
    }) {
      return fetchAPI(`/management/permissions/users/${userId}/revoke`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  },

  // Resources
  resources: {
    async getOverview() {
      return fetchAPI('/management/resources/overview');
    },

    async getInefficiencies(params?: {
      severity?: string;
      type?: string;
    }) {
      const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return fetchAPI(`/management/resources/inefficiencies${query}`);
    },

    async optimize(data: {
      focusAreas?: string[];
      constraints?: {
        maxWorkloadPerTutor?: number;
        minGroupSize?: number;
        maxGroupSize?: number;
      };
    }) {
      return fetchAPI('/management/resources/optimize', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async applyOptimization(data: {
      planId: string;
      selectedChanges: string[];
      description?: string;
    }) {
      return fetchAPI('/management/resources/apply', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async manualOverride(data: {
      type: 'reallocate_session' | 'reallocate_student' | 'adjust_group_size' | 'modify_schedule';
      from: string;
      to: string;
      resourceId: string;
      reason: string;
    }) {
      return fetchAPI('/management/resources/manual-override', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  },

  // Reports
  reports: {
    async list(params?: {
      type?: string;
      page?: number;
      limit?: number;
    }) {
      const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return fetchAPI(`/management/reports/progress${query}`);
    },

    async create(data: {
      title: string;
      type: string;
      scope: {
        studentIds?: string[];
        tutorIds?: string[];
        department?: string;
        subject?: string;
        timeRange: {
          startDate: string;
          endDate: string;
        };
      };
      filters?: {
        minScore?: number;
        minAttendance?: number;
        subjects?: string[];
      };
    }) {
      return fetchAPI('/management/reports/progress', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async get(id: string) {
      return fetchAPI(`/management/reports/progress/${id}`);
    },

    async export(id: string, format: 'json' | 'csv' = 'json') {
      return fetchAPI(`/management/reports/progress/${id}/export?format=${format}`);
    },

    async update(id: string, data: {
      title?: string;
      filters?: {
        minScore?: number;
        minAttendance?: number;
        subjects?: string[];
      };
    }) {
      return fetchAPI(`/management/reports/progress/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    }
  },

  // Analytics
  analytics: {
    async getPerformance(params?: {
      type?: string;
      startDate?: string;
      endDate?: string;
    }) {
      const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return fetchAPI(`/management/analytics/performance${query}`);
    },

    async generatePerformanceAnalysis(data: {
      type: string;
      scope: {
        studentIds?: string[];
        tutorIds?: string[];
        subjects?: string[];
        timeRange: {
          startDate: string;
          endDate: string;
        };
      };
      includeComparisons?: boolean;
      includeTrends?: boolean;
    }) {
      return fetchAPI('/management/analytics/performance', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async comparePerformance(params: {
      entityIds: string;
      entityType: string;
      startDate?: string;
      endDate?: string;
    }) {
      const query = '?' + new URLSearchParams(params as any).toString();
      return fetchAPI(`/management/analytics/performance/compare${query}`);
    },

    async getKPIs() {
      return fetchAPI('/management/analytics/performance/kpis');
    }
  },

  // Credits
  credits: {
    async getEligible(params?: {
      sessionId?: string;
      classId?: string;
      semester?: string;
      minAttendance?: number;
      minSessions?: number;
      minPerformance?: number;
    }) {
      const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return fetchAPI(`/management/credits/eligible${query}`);
    },

    async award(data: {
      studentIds: string[];
      sessionId?: string;
      classId?: string;
      semester?: string;
      credits: number;
      reason: string;
    }) {
      return fetchAPI('/management/credits/award', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async getHistory(params?: {
      studentId?: string;
      semester?: string;
      page?: number;
      limit?: number;
    }) {
      const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return fetchAPI(`/management/credits/history${query}`);
    },

    async revoke(id: string, data: { reason: string }) {
      return fetchAPI(`/management/credits/${id}/revoke`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    }
  },

  // Documents
  documents: {
    async list(params?: {
      category?: string;
      subject?: string;
      accessLevel?: string;
      page?: number;
      limit?: number;
    }) {
      const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return fetchAPI(`/management/documents${query}`);
    },

    async upload(data: {
      title: string;
      description?: string;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      fileType: string;
      category: string;
      subject?: string;
      tags?: string[];
      isPublic?: boolean;
      accessLevel: string;
    }) {
      return fetchAPI('/management/documents', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async get(id: string) {
      return fetchAPI(`/management/documents/${id}`);
    },

    async update(id: string, data: {
      title?: string;
      description?: string;
      isPublic?: boolean;
      accessLevel?: string;
      tags?: string[];
    }) {
      return fetchAPI(`/management/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async delete(id: string) {
      return fetchAPI(`/management/documents/${id}`, {
        method: 'DELETE'
      });
    },

    async share(id: string, data: {
      userIds: string[];
      permission: string;
      message?: string;
    }) {
      return fetchAPI(`/management/documents/${id}/share`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async getAccess(id: string) {
      return fetchAPI(`/management/documents/${id}/access`);
    },

    async updateAccess(id: string, data: {
      userId: string;
      permission: string;
      expiresAt?: string;
    }) {
      return fetchAPI(`/management/documents/${id}/access`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    }
  },

  // Community
  community: {
    forums: {
      async list(params?: {
        category?: string;
        pinned?: boolean;
        locked?: boolean;
        page?: number;
        limit?: number;
      }) {
        const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
        return fetchAPI(`/management/community/forums${query}`);
      },

      async update(id: string, data: {
        title?: string;
        category?: string;
        content?: string;
      }) {
        return fetchAPI(`/management/community/forums/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      },

      async delete(id: string) {
        return fetchAPI(`/management/community/forums/${id}`, {
          method: 'DELETE'
        });
      },

      async pin(id: string, action: 'pin' | 'unpin') {
        return fetchAPI(`/management/community/forums/${id}/pin`, {
          method: 'POST',
          body: JSON.stringify({ action })
        });
      },

      async lock(id: string, action: 'lock' | 'unlock') {
        return fetchAPI(`/management/community/forums/${id}/lock`, {
          method: 'POST',
          body: JSON.stringify({ action })
        });
      }
    },

    resources: {
      async list(params?: {
        type?: string;
        category?: string;
        accessLevel?: string;
        page?: number;
        limit?: number;
      }) {
        const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
        return fetchAPI(`/management/community/resources${query}`);
      },

      async share(data: {
        title: string;
        description?: string;
        type: string;
        fileUrl?: string;
        linkUrl?: string;
        category: string;
        subject?: string;
        tags?: string[];
        isPublic?: boolean;
        accessLevel: string;
        restrictedTo?: string[];
      }) {
        return fetchAPI('/management/community/resources', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      },

      async restrict(id: string, data: {
        restrictedTo?: string[];
        accessLevel: string;
      }) {
        return fetchAPI(`/management/community/resources/${id}/restrict`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      }
    },

    events: {
      async create(data: {
        title: string;
        description?: string;
        type: string;
        startTime: string;
        endTime: string;
        isOnline: boolean;
        meetingLink?: string;
        location?: string;
        category?: string;
        tags?: string[];
        registrationRequired?: boolean;
        registrationDeadline?: string;
        resourceIds?: string[];
      }) {
        return fetchAPI('/management/community/events', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }
    },

    async getActivities(params?: {
      entityType?: string;
      entityId?: string;
      action?: string;
      page?: number;
      limit?: number;
    }) {
      const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return fetchAPI(`/management/community/activities${query}`);
    }
  }
};

// ===== LIBRARY =====

export const libraryAPI = {
  async search(params?: {
    q?: string;
    subject?: string;
    type?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }) {
    const queryParams: any = {};
    if (params?.q) queryParams.q = params.q;
    if (params?.subject) queryParams.subject = params.subject;
    if (params?.type) queryParams.type = params.type;
    if (params?.tags && params.tags.length > 0) queryParams.tags = params.tags.join(',');
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.limit) queryParams.limit = params.limit.toString();
    
    const query = Object.keys(queryParams).length > 0 ? '?' + new URLSearchParams(queryParams).toString() : '';
    return fetchAPI(`/library/search${query}`);
  },

  async bookmark(materialId: string) {
    return fetchAPI('/library/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ materialId })
    });
  },

  async getRecommendations(params?: {
    userId?: string;
    subject?: string;
    limit?: number;
  }) {
    const queryParams: any = {};
    if (params?.userId) queryParams.userId = params.userId;
    if (params?.subject) queryParams.subject = params.subject;
    if (params?.limit) queryParams.limit = params.limit.toString();
    
    const query = Object.keys(queryParams).length > 0 ? '?' + new URLSearchParams(queryParams).toString() : '';
    return fetchAPI(`/library/recommendations${query}`);
  },

  async sync() {
    return fetchAPI('/library/sync');
  },

  async createMaterial(material: {
    title: string;
    author: string;
    subject: string;
    type: 'book' | 'article' | 'thesis' | 'video' | 'other';
    description?: string;
    tags?: string[];
    url?: string;
    thumbnail?: string;
    pdfFile?: File;
  }) {
    const formData = new FormData();
    formData.append('title', material.title);
    formData.append('author', material.author);
    formData.append('subject', material.subject);
    formData.append('type', material.type);
    if (material.description) formData.append('description', material.description);
    if (material.tags) formData.append('tags', Array.isArray(material.tags) ? material.tags.join(',') : material.tags);
    if (material.url) formData.append('url', material.url);
    if (material.thumbnail) formData.append('thumbnail', material.thumbnail);
    if (material.pdfFile) formData.append('pdfFile', material.pdfFile);

    const token = getToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}/library/materials`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json();
    return data;
  },

  async updateMaterial(materialId: string, updates: {
    title?: string;
    author?: string;
    subject?: string;
    type?: 'book' | 'article' | 'thesis' | 'video' | 'other';
    description?: string;
    tags?: string[];
    url?: string;
    thumbnail?: string;
    pdfFile?: File;
  }) {
    const formData = new FormData();
    if (updates.title) formData.append('title', updates.title);
    if (updates.author) formData.append('author', updates.author);
    if (updates.subject) formData.append('subject', updates.subject);
    if (updates.type) formData.append('type', updates.type);
    if (updates.description) formData.append('description', updates.description);
    if (updates.tags) formData.append('tags', Array.isArray(updates.tags) ? updates.tags.join(',') : updates.tags);
    if (updates.url) formData.append('url', updates.url);
    if (updates.thumbnail) formData.append('thumbnail', updates.thumbnail);
    if (updates.pdfFile) formData.append('pdfFile', updates.pdfFile);

    const token = getToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}/library/materials/${materialId}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData
    });

    const data = await response.json();
    return data;
  },

  async deleteMaterial(materialId: string) {
    return fetchAPI(`/library/materials/${materialId}`, {
      method: 'DELETE'
    });
  },

  getPreviewUrl(materialId: string, filename?: string): string {
    const token = getToken();
    const params = new URLSearchParams();
    if (token) params.append('token', token);
    if (filename) params.append('filename', filename);
    const queryString = params.toString();
    return `${API_BASE_URL}/library/preview/${materialId}${queryString ? `?${queryString}` : ''}`;
  },

  getDownloadUrl(materialId: string): string {
    const token = getToken();
    const params = new URLSearchParams();
    if (token) params.append('token', token);
    params.append('download', 'true');
    const queryString = params.toString();
    return `${API_BASE_URL}/library/preview/${materialId}?${queryString}`;
  }
};

// ===== EXPORT ALL =====

export const api = {
  auth: authAPI,
  sessions: sessionsAPI,
  tutors: tutorsAPI,
  students: studentsAPI,
  calendar: calendarAPI,
  availability: availabilityAPI,
  rooms: roomsAPI,
  notifications: notificationsAPI,
  progress: progressAPI,
  evaluations: evaluationsAPI,
  forum: forumAPI,
  users: usersAPI,
  courseContents: courseContentsAPI,
  quizzes: quizzesAPI,
  assignments: assignmentsAPI,
  submissions: submissionsAPI,
  grades: gradesAPI,
  sessionStudents: sessionStudentsAPI,
  classes: classesAPI,
  enrollments: enrollmentsAPI,
  sessionRequests: sessionRequestsAPI,
  conversations: conversationsAPI,
  upload: uploadAPI,
  management: managementAPI,
  chatbot: chatbotAPI,
  library: libraryAPI
};

export default api;

