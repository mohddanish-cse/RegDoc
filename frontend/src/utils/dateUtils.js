// frontend/src/utils/dateUtils.js

/**
 * Get default due date (today + specified days)
 */
export const getDefaultDueDate = (daysFromNow = 3) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

/**
 * Format date for display
 */
export const formatDueDate = (dateString) => {
  if (!dateString) return "No due date";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

/**
 * Check if date is overdue
 */
export const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset to midnight
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < now;
};

/**
 * Check if date is due soon (within 24 hours)
 */
export const isDueSoon = (dueDate) => {
  if (!dueDate) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return due.getTime() === now.getTime() || due.getTime() === tomorrow.getTime();
};

/**
 * Get due date from document based on status
 */
export const getDueDateFromDocument = (document) => {
  if (!document) return null;
  
  const status = document.status;
  
  // Map status to due date field
  if (status === 'In QC') {
    return document.qc_due_date || null;
  } else if (status === 'In Review') {
    return document.review_due_date || null;
  } else if (status === 'Pending Approval') {
    return document.approval_due_date || null;
  }
  
  return null;
};
