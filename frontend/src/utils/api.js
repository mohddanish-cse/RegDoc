const API_BASE_URL = 'http://127.0.0.1:5000/api';

// This is our central API helper function
export const apiCall = async (endpoint, method = 'GET', body = null) => {
  // Get the token from localStorage on every call
  const token = localStorage.getItem('token');
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // If a token exists, add it to the Authorization header
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  // If a body is provided (for POST/PUT requests), stringify it
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'An API error occurred');
  }

  return data;
};