// frontend/src/utils/api.js

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

export const apiCall = async (endpoint, method = 'GET', body = null, isFormData = false) => {
  const token = localStorage.getItem('token');
  const options = { method, headers: {} };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    if (isFormData) {
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const text = await response.text(); // Always get text first

    if (!response.ok) {
        // Try to parse as JSON to get a specific error message, otherwise use the raw text
        try {
            const jsonError = JSON.parse(text);
            // --- THIS IS THE FIX ---
            // We now throw the actual error message string, not the whole object
            throw new Error(jsonError.error || jsonError.message || 'An API error occurred.');
        } catch (e) {
            throw new Error(text || 'An unknown API error occurred.');
        }
    }
    
    // If the response was successful, try to parse it as JSON
    try {
        return JSON.parse(text);
    } catch (e) {
        return text; // If not JSON (e.g., simple success message), return the text
    }

  } catch (error) {
    console.error('API Call failed:', error);
    // Re-throw the error so component-level catch blocks can handle it
    throw error;
  }
};

export { API_BASE_URL };
