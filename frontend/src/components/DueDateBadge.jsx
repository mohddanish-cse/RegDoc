// frontend/src/components/DueDateBadge.jsx
import React from "react";
import { formatDueDate, isOverdue, isDueSoon } from "../utils/dateUtils";

function DueDateBadge({ dueDate }) {
  // If no due date, don't show anything
  if (!dueDate) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-md">
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 12H4"
          />
        </svg>
        No due date
      </span>
    );
  }

  const overdue = isOverdue(dueDate);
  const dueSoon = isDueSoon(dueDate);

  let badgeClass = "";
  let badgeText = "";
  let icon = null;

  if (overdue) {
    // Overdue - Red
    badgeClass = "bg-red-100 text-red-800 border-red-300";
    badgeText = "Overdue";
    icon = (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    );
  } else if (dueSoon) {
    // Due soon - Yellow/Orange
    badgeClass = "bg-yellow-100 text-yellow-800 border-yellow-300";
    badgeText = "Due Soon";
    icon = (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    );
  } else {
    // On track - Blue/Green
    badgeClass = "bg-blue-100 text-blue-800 border-blue-300";
    badgeText = formatDueDate(dueDate);
    icon = (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded-md ${badgeClass}`}
    >
      {icon}
      {badgeText}
    </span>
  );
}

export default DueDateBadge;
