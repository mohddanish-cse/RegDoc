// frontend/src/pages/LibraryPage.jsx

import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { apiCall } from "../utils/api";
import DocumentTable from "../components/DocumentTable";
import UploadModal from "../components/UploadModal"; // <-- Import the modal

function LibraryPage() {
  const { user: currentUser } = useOutletContext();
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // --- NEW: State and logic for the Upload Modal ---
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await apiCall(
        `/documents/?page=${currentPage}&limit=10&search=${searchQuery}`
      );
      setDocuments(data.documents);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // --- NEW: The success handler for this page ---
  const handleUploadSuccess = () => {
    setIsUploadModalOpen(false); // Close the modal
    // Reset search and go to first page to ensure the new doc is visible
    setSearchQuery("");
    setCurrentPage(1);
    fetchDocuments(); // Refresh the data on this page
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!currentUser) return <p>Loading...</p>;

  return (
    <>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center gap-4 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-800">Document Library</h2>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by name or number..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm w-full sm:w-64"
            />
            {/* --- NEW: Add the Upload button here --- */}
            {(currentUser && currentUser.role === "Contributor") ||
              ("Admin" && (
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-4 py-2 bg-gray-800 text-white font-semibold rounded-md hover:bg-gray-900 shadow-sm whitespace-nowrap"
                >
                  + Upload New
                </button>
              ))}
          </div>
        </div>
        <DocumentTable documents={documents} currentUser={currentUser} />
        {/* Pagination Controls */}
        <div className="px-6 py-4 flex justify-between items-center border-t">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* --- NEW: The UploadModal is now rendered here and correctly connected --- */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </>
  );
}

export default LibraryPage;
