// This file centralizes all our API calls.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:3001';

// A helper function for making fetch requests
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get token from localStorage and add to headers if available
  const token = localStorage.getItem('token');
  
  // Don't set Content-Type for FormData - let the browser set it with boundary
  // Don't set Content-Type to application/json if there's no body
  const headers: HeadersInit = {
    ...(!(options.body instanceof FormData) && options.body && { 'Content-Type': 'application/json' }),
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  // Only log for authentication endpoints to reduce noise
  const isAuthEndpoint = endpoint.includes('/auth/');
  const isCurrentUserEndpoint = endpoint.includes('/users/current');
  
  if (isAuthEndpoint || isCurrentUserEndpoint) {
    console.log('apiFetch called:', {
      url,
      method: options.method || 'GET',
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 30) + '...' : 'NONE',
      headers: { ...headers, Authorization: token ? `Bearer ${token.substring(0, 20)}...` : 'MISSING' }
    });
  }

  const response = await fetch(url, { 
    ...options, 
    headers,
    credentials: 'include' // Include credentials for CORS requests
  });

  if (isAuthEndpoint || isCurrentUserEndpoint) {
    console.log('apiFetch response:', {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get('content-type')
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    if (isAuthEndpoint || isCurrentUserEndpoint) {
      console.error('apiFetch error:', errorData);
    }
    throw new Error(errorData.message || 'API request failed');
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const jsonResponse = await response.json();
    if (isAuthEndpoint || isCurrentUserEndpoint) {
      console.log('apiFetch JSON response:', jsonResponse);
    }
    return jsonResponse;
  }
  if (isAuthEndpoint || isCurrentUserEndpoint) {
    console.log('apiFetch non-JSON response');
  }
  return null;
}

// --- Auth Service ---
export const authService = {
  login: (email: string, password: string) => apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  // ADD THIS FUNCTION
  verify2FA: (userId: string, code: string) => apiFetch('/api/auth/verify-2fa', {
    method: 'POST',
    body: JSON.stringify({ userId, code }),
  }),
  register: (email: string, username: string, password: string) => apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password }),
  }),
  handleGoogleLogin: (data: { credential: string }) => apiFetch('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  // This is a duplicate, let's remove it for clarity, handleGoogleLogin is enough
  // loginWithGoogle: (googleUserData: any) => apiFetch('/api/auth/google', {
  //   method: 'POST',
  //   body: JSON.stringify(googleUserData),
  // }),
};

// --- User Service ---
export const userService = {
  getProfile: (userId: string) => apiFetch(`/api/users/${userId}`),
  // FIXED: This function now correctly parses error messages from the backend
  updateProfile: async (userId: string, formData: FormData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData, // Note: Don't set Content-Type for FormData, let browser set it
        credentials: 'include' // Include credentials for CORS requests
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Profile update failed' }));
        throw new Error(errorData.message);
    }
    return response.json();
  },
};

// --- Friends Service ---
export const friendService = {
    getFriends: (userId: string) => apiFetch(`/api/users/${userId}/friends`),
    addFriend: (userId: string, friendId: string) => apiFetch(`/api/users/${userId}/friends`, {
        method: 'POST',
        body: JSON.stringify({ friendId }),
    }),
    removeFriend: (userId: string, friendId: string) => apiFetch(`/api/users/${userId}/friends/${friendId}`, {
        method: 'DELETE',
    }),
};

// --- Match History Service ---
export const matchHistoryService = {
    getMatches: (userId: string) => apiFetch(`/api/users/${userId}/matches`),
    addMatch: (matchData: any) => apiFetch(`/api/users/${matchData.player1Id}/matches`, {
        method: 'POST',
        body: JSON.stringify(matchData),
    }),
};

export const statisticsService = {
  getUserStats: (userId: string) => {
    return apiFetch(`/api/stats/${userId}`);
  },
  
  getPublicUserStats: (userId: string) => {
    return apiFetch(`/api/stats/public/${userId}`);
  },
}
