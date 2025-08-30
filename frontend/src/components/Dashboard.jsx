import React, { useState, useEffect } from "react";

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");

  // useEffect will run once when the component is first rendered
  useEffect(() => {
    const fetchDocuments = async () => {
      // Get the token from localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No token found. Please log in.");
        return;
      }

      try {
        const response = await fetch("http://127.0.0.1:5000/api/documents/", {
          method: "GET",
          headers: {
            // Include the token in the Authorization header
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch documents.");
        }

        const data = await response.json();
        setDocuments(data); // Store the fetched documents in state
      } catch (err) {
        setError(err.message);
      }
    };

    fetchDocuments();
  }, []); // The empty dependency array means this runs only once

  if (error) {
    return <p style={{ color: "red" }}>{error}</p>;
  }

  return (
    <div>
      <h2>Document Dashboard</h2>
      <table>
        <thead>
          <tr>
            <th>Filename</th>
            <th>Status</th>
            <th>Version</th>
            <th>Author</th>
            <th>Upload Date</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id}>
              <td>{doc.filename}</td>
              <td>{doc.status}</td>
              <td>{doc.version}</td>
              <td>{doc.author}</td>
              <td>{new Date(doc.uploadDate).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Dashboard;
