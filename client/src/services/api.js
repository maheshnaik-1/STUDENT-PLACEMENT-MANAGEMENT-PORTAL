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
    console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error.message);
    throw error;
  }
}

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
      const query = new URLSearchParams(params).toString();
      return request(`/companies${query ? `?${query}` : ''}`);
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
      const query = new URLSearchParams(params).toString();
      return request(`/drives${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/drives/${id}`),
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
    getMyApplications: () => request('/applications/my-applications'),
    getDriveApplicants: (driveId, params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/applications/drive/${driveId}${query ? `?${query}` : ''}`);
    },
    updateStatus: (applicationId, statusData) =>
      request(`/applications/${applicationId}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusData),
      }),
    getStats: () => request('/applications/stats'),
  },

  // Student Directory APIs (Officer view)
  students: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/students${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/students/${id}`),
  },
};
