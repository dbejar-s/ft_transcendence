// This file centralizes all our API calls.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// A helper function for making fetch requests
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.message || 'API request failed');
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return null;
}

// --- Auth Service ---
export const authService = {
  login: (email: string, password: string) => apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  register: (email: string, username: string, password: string) => apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password }),
  }),
  handleGoogleLogin: (googleUserData: any) => apiFetch('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify(googleUserData),
  }),
};

// --- User Service ---
export const userService = {
  getProfile: (userId: string) => apiFetch(`/api/users/${userId}`),
  // FIXED: This function now correctly parses error messages from the backend
  updateProfile: async (userId: string, formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'PUT',
        body: formData,
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