// frontend/src/utils/api.js

const API_BASE_URL = 'http://127.0.0.1:5000/api';

// This is our central API helper function, now upgraded to handle both JSON and FormData.
export const apiCall = async (endpoint, method = 'GET', body = null, isFormData = false) => {
  // Get the token from localStorage on every call
  const token = localStorage.getItem('token');
  
  const options = {
    method,
    headers: {
      // NOTE: We will set Content-Type conditionally below
    },
  };

  // If a token exists, add it to the Authorization header
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  // --- MODIFIED SECTION ---
  // This is the new logic to handle both data types.
  if (body) {
    if (isFormData) {
      // If it's FormData, we pass the body directly.
      // We DO NOT set the 'Content-Type' header. The browser will do it automatically.
      options.body = body;
    } else {
      // If it's regular data, we set the header and stringify the body, as before.
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  // The rest of the function remains the same.
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  
  // Handle cases where the response might not be JSON (e.g., empty response on success)
  const contentType = response.headers.get("content-type");
  let data;
  if (contentType && contentType.indexOf("application/json") !== -1) {
    data = await response.json();
  } else {
    // If not JSON, just use the status for success/failure check
    data = await response.text(); 
  }

  if (!response.ok) {
    // Try to parse error from JSON, otherwise use the text response
    try {
        const errorJson = JSON.parse(data);
        throw new Error(errorJson.error || errorJson.msg || 'An API error occurred');
    } catch(e) {
        throw new Error(data || 'An API error occurred');
    }
  }
  
  // If the original response was JSON, parse it again to return as an object
  try {
    return JSON.parse(data);
  } catch(e) {
    return data; // Or return a success message object
  }
};