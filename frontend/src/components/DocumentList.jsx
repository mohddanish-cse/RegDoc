import React from "react";
import { useNavigate } from "react-router-dom";

// export default function DocumentList({ docs, selectedDoc, setSelectedDoc }) {
export default function DocumentList({ docs }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  return (
    <div className="border rounded p-2">
      {docs.length === 0 ? (
        <p className="text-gray-500">No documents found.</p>
      ) : (
        <ul className="space-y-1">
          {docs.map((doc) => (
            <li
              key={doc.id}
              // onClick={() => setSelectedDoc(doc)}
              onClick={() => navigate(`/dashboard/doc/${doc.id}`)}
              // className={`cursor-pointer px-2 py-1 rounded border hover:bg-gray-100 ${
              //   selectedDoc?.id === doc.id ? "bg-blue-100" : ""
              // }`}
              className="cursor-pointer px-2 py-1 rounded border hover:bg-gray-100"
            >
              <div className="font-medium">{doc.name}</div>
              <div className="text-sm text-gray-600">
                {doc.type} • {doc.status}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
