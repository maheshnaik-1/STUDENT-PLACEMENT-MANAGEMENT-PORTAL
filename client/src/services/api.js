/**
 * Centralized API Service for communicating with Express Backend
 */

const BASE_URL = '/api';

/**
 * Get JWT authentication token from localStorage
 */
const getToken = () => {
  return localStorage.getItem('placement_auth_token');
};

/**
 * Generic Fetch wrapper with automatic JWT header and JSON parsing
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const token = getToken();

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error.message);
    }
    throw error;
  }
}

/**
 * Helper to build safe query string from params object without undefined/null
 */
const buildQuery = (params = {}) => {
  const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      acc[key] = val;
    }
    return acc;
  }, {});
  const query = new URLSearchParams(cleanParams).toString();
  return query ? `?${query}` : '';
};

export const api = {
  // Authentication APIs
  auth: {
    login: (credentials) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (studentData) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(studentData),
      }),
    getMe: () => request('/auth/me'),
    updateProfile: (profileData) =>
      request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      }),
    uploadResume: (formData) =>
      request('/auth/resume-upload', {
        method: 'POST',
        body: formData,
      }),
    deleteResume: () =>
      request('/auth/resume', {
        method: 'DELETE',
      }),
    downloadResume: async (studentId) => {
      const token = getToken();
      const endpoint = studentId ? `/auth/resume-download/${studentId}` : '/auth/resume';
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to download resume file');
      }
      return await response.blob();
    },
  },

  // Company APIs
  companies: {
    getAll: (params = {}) => {
      return request(`/companies${buildQuery(params)}`);
    },
    getById: (id) => request(`/companies/${id}`),
    create: (companyData) =>
      request('/companies', {
        method: 'POST',
        body: JSON.stringify(companyData),
      }),
    update: (id, companyData) =>
      request(`/companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(companyData),
      }),
    delete: (id) =>
      request(`/companies/${id}`, {
        method: 'DELETE',
      }),
  },

  // Placement Drive APIs
  drives: {
    getAll: (params = {}) => {
      return request(`/drives${buildQuery(params)}`);
    },
    getById: (id) => request(`/drives/${id}`),
    getRecommendations: () => request('/drives/recommendations'),
    getMatchScore: (id) => request(`/drives/${id}/match-score`),
    create: (driveData) =>
      request('/drives', {
        method: 'POST',
        body: JSON.stringify(driveData),
      }),
    update: (id, driveData) =>
      request(`/drives/${id}`, {
        method: 'PUT',
        body: JSON.stringify(driveData),
      }),
    delete: (id) =>
      request(`/drives/${id}`, {
        method: 'DELETE',
      }),
  },

  // Application APIs
  applications: {
    apply: (driveId) =>
      request(`/applications/apply/${driveId}`, {
        method: 'POST',
      }),
    withdraw: (applicationId) =>
      request(`/applications/${applicationId}/withdraw`, {
        method: 'DELETE',
      }),
    getMyApplications: () => request('/applications/my-applications'),
    getDriveApplicants: (driveId, params = {}, options = {}) => {
      return request(`/applications/drive/${driveId}${buildQuery(params)}`, options);
    },
    getMatchScores: (driveId, options = {}) =>
      request(`/applications/drive/${driveId}/match-scores`, options),
    updateStatus: (applicationId, statusData) =>
      request(`/applications/${applicationId}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusData),
      }),
    bulkUpdateStatus: (bulkData) =>
      request('/applications/bulk-status', {
        method: 'PUT',
        body: JSON.stringify(bulkData),
      }),
    getStats: () => request('/applications/stats'),
    getAnalytics: (params = {}) => {
      return request(`/applications/analytics${buildQuery(params)}`);
    },
  },

  // Intelligence & AI APIs (V3.0)
  ai: {
    parseResume: () =>
      request('/ai/parse-resume', {
        method: 'POST',
      }),
  },

  // Student Directory APIs (Officer view)
  students: {
    getAll: (params = {}) => {
      return request(`/students${buildQuery(params)}`);
    },
    getById: (id) => request(`/students/${id}`),
  },

  // Notification APIs
  notifications: {
    getAll: (params = {}) => {
      return request(`/notifications${buildQuery(params)}`);
    },
    getUnreadCount: () => request('/notifications/unread-count'),
    markAsRead: (id) =>
      request(`/notifications/${id}/read`, {
        method: 'PUT',
      }),
    markAllAsRead: () =>
      request('/notifications/read-all', {
        method: 'PUT',
      }),
  },
};
