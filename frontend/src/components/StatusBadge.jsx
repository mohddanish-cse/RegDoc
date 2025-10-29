// frontend/src/components/StatusBadge.jsx

import React from "react";

const STATUS_CONFIG = {
  Draft: {
    color: "bg-gray-100 text-gray-800 border-gray-300",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  "In QC": {
    color: "bg-blue-100 text-blue-800 border-blue-300",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  },
  "QC Rejected": {
    color: "bg-red-100 text-red-800 border-red-300",
    icon: "M6 18L18 6M6 6l12 12",
  },
  "QC Complete": {
    color: "bg-green-100 text-green-800 border-green-300",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  "In Review": {
    color: "bg-purple-100 text-purple-800 border-purple-300",
    icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  },
  "Under Revision": {
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  },
  "Review Complete": {
    color: "bg-green-100 text-green-800 border-green-300",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  "Pending Approval": {
    color: "bg-orange-100 text-orange-800 border-orange-300",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  "Approval Rejected": {
    color: "bg-red-100 text-red-800 border-red-300",
    icon: "M6 18L18 6M6 6l12 12",
  },
  Approved: {
    color: "bg-green-100 text-green-800 border-green-300",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  Withdrawn: {
    color: "bg-gray-100 text-gray-800 border-gray-300",
    icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  },
  Superseded: {
    color: "bg-gray-100 text-gray-800 border-gray-300",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  },
  Archived: {
    color: "bg-gray-100 text-gray-800 border-gray-300",
    icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
  },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    color: "bg-gray-100 text-gray-800 border-gray-300",
    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={config.icon}
        />
      </svg>
      {status}
    </span>
  );
}

export default StatusBadge;
