import React from "react";
import { useNavigate } from "react-router-dom";

export default function DocumentList({ docs }) {
  const navigate = useNavigate();

  if (docs.length === 0) {
    return <p className="text-gray-500">No documents found.</p>;
  }

  return (
    <ul className="space-y-2">
      {docs.map((doc) => (
        <li
          key={doc.id}
          onClick={() => navigate(`/dashboard/doc/${doc.id}`)}
          className="cursor-pointer px-3 py-2 rounded-lg border hover:bg-gray-100 transition"
        >
          <div className="font-medium">{doc.name}</div>
          <div className="text-sm text-gray-600">
            {doc.type} • {doc.status}
          </div>
        </li>
      ))}
    </ul>
  );
}
