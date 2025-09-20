import React from "react";

function StatusBadge({ status }) {
  const statusStyles = {
    Draft: "bg-gray-100 text-gray-800",
    "In Review": "bg-yellow-100 text-yellow-800",
    "Review Complete": "bg-blue-100 text-blue-800",
    Published: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
    Archived: "bg-gray-100 text-gray-800",
  };

  const style = statusStyles[status] || "bg-gray-100 text-gray-800";

  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${style}`}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
