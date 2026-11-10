/**
 * FitTrack — Frontend API Helper Module
 * Universal client for interacting with the Express REST API.
 * Automatically handles credentials (secure HTTP-only JWT cookies).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FitTrackAPI = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const API_BASE = '/api';

  async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    const headers = {
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers,
      credentials: 'include' // Sends secure HTTP-only auth cookies
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage = data.message || `Request failed with status ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`[FitTrack API Error] ${endpoint}:`, error.message);
      throw error;
    }
  }

  const FitTrackAPI = {
    // Authentication & Session
    auth: {
      login: (email, password) => 
        request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
      register: (userData) => 
        request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
      logout: () => 
        request('/auth/logout', { method: 'POST' }),
      getMe: () => 
        request('/auth/me')
    },

    // Dashboard Telemetry & Stats
    dashboard: {
      getStats: () => 
        request('/dashboard/stats'),
      getRecentActivity: () => 
        request('/dashboard/recent-activity')
    },

    // Member Management
    members: {
      list: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/members${query ? `?${query}` : ''}`);
      },
      getById: (id) => 
        request(`/members/${id}`),
      create: (memberData) => 
        request('/members', { method: 'POST', body: JSON.stringify(memberData) }),
      update: (id, memberData) => 
        request(`/members/${id}`, { method: 'PUT', body: JSON.stringify(memberData) }),
      toggleStatus: (id, status) => 
        request(`/members/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
    },

    // Trainer Management
    trainers: {
      list: () => 
        request('/trainers'),
      getById: (id) => 
        request(`/trainers/${id}`),
      update: (id, data) => 
        request(`/trainers/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },

    // Membership & Contracts
    memberships: {
      getPlans: () => 
        request('/memberships/plans'),
      getSubscriptions: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/memberships/subscriptions${query ? `?${query}` : ''}`);
      },
      subscribe: (subData) => 
        request('/memberships/subscribe', { method: 'POST', body: JSON.stringify(subData) }),
      toggleAutoRenew: (subId, autoRenew) => 
        request(`/memberships/subscriptions/${subId}/auto-renew`, { method: 'PATCH', body: JSON.stringify({ auto_renew: autoRenew }) }),
      getExpiring: (days = 14) => 
        request(`/memberships/expiring?days=${days}`)
    },

    // Attendance & Turnstile Simulation
    attendance: {
      checkIn: ({ rfid_tag, member_id, turnstile_id = 'Gate-Bay-01', access_method = 'rfid' }) => 
        request('/attendance/check-in', {
          method: 'POST',
          body: JSON.stringify({ rfid_tag, member_id, turnstile_id, access_method })
        }),
      checkOut: ({ rfid_tag, member_id, turnstile_id = 'Gate-Bay-01' }) => 
        request('/attendance/check-out', {
          method: 'POST',
          body: JSON.stringify({ rfid_tag, member_id, turnstile_id })
        }),
      getHistory: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/attendance/history${query ? `?${query}` : ''}`);
      },
      getTelemetry: () => 
        request('/attendance/telemetry')
    },

    // Workouts & Telemetry
    workouts: {
      getPlans: () => 
        request('/workouts/plans'),
      createPlan: (data) => 
        request('/workouts/plans', { method: 'POST', body: JSON.stringify(data) }),
      getLogs: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/workouts/logs${query ? `?${query}` : ''}`);
      },
      recordLog: (data) => 
        request('/workouts/logs', { method: 'POST', body: JSON.stringify(data) })
    },

    // Trainer Schedules
    schedules: {
      list: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/schedules${query ? `?${query}` : ''}`);
      },
      createSlot: (data) => 
        request('/schedules/slots', { method: 'POST', body: JSON.stringify(data) }),
      bookSession: (data) => 
        request('/schedules/book', { method: 'POST', body: JSON.stringify(data) })
    },

    // Payments (Simulated Ledger)
    payments: {
      list: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/payments${query ? `?${query}` : ''}`);
      },
      recordPayment: (data) => 
        request('/payments', { method: 'POST', body: JSON.stringify(data) })
    },

    // Notifications
    notifications: {
      list: () => 
        request('/notifications'),
      markAsRead: (id) => 
        request(`/notifications/${id}/read`, { method: 'PATCH' }),
      markAllRead: () => 
        request('/notifications/read-all', { method: 'POST' })
    },

    // Admin & Facility Overrides
    admin: {
      getSettings: () => 
        request('/admin/settings'),
      updateSettings: (settings) => 
        request('/admin/settings', { method: 'POST', body: JSON.stringify(settings) }),
      overrideTurnstile: (unlock) => 
        request('/admin/turnstile/override', { method: 'POST', body: JSON.stringify({ unlock }) })
    }
  };

  return FitTrackAPI;
}));
