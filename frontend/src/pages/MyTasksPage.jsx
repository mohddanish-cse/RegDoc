// frontend/src/pages/MyTasksPage.jsx

import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { apiCall } from "../utils/api";
import DocumentTable from "../components/DocumentTable";
import UploadModal from "../components/UploadModal"; // <-- Import the modal
import ReviewModal from "../components/ReviewModal";
import ApprovalModal from "../components/ApprovalModal";

function MyTasksPage() {
  const { user: currentUser } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // --- NEW: State and logic for the Upload Modal is now co-located here ---
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const data = await apiCall("/documents/my-tasks");
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // --- NEW: This is the success handler that will be called by the modal ---
  const handleUploadSuccess = () => {
    setIsUploadModalOpen(false); // Close the modal
    fetchTasks(); // Refresh the data on this page
  };

  const openReviewModal = (doc) => {
    setSelectedDoc(doc);
    setIsReviewModalOpen(true);
  };

  const openApprovalModal = (doc) => {
    setSelectedDoc(doc);
    setIsApprovalModalOpen(true);
  };

  const closeModal = () => {
    setIsReviewModalOpen(false);
    setIsApprovalModalOpen(false);
    setSelectedDoc(null);
  };

  const handleActionSuccess = () => {
    closeModal();
    fetchTasks(); // Refresh the tasks list
  };

  if (isLoading) return <p>Loading your tasks...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <>
      {/* --- NEW: Page header with the Upload button --- */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">My Tasks</h1>
        {(currentUser && currentUser.role === "Contributor") ||
          ("Admin" && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 bg-gray-800 text-white font-semibold rounded-md hover:bg-gray-900 shadow-sm"
            >
              + Upload New Document
            </button>
          ))}
      </div>

      <DocumentTable
        documents={tasks}
        currentUser={currentUser}
        onOpenReviewModal={openReviewModal}
        onOpenApprovalModal={openApprovalModal}
      />

      {/* --- NEW: The UploadModal is now rendered here and correctly connected --- */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={closeModal}
        document={selectedDoc}
        onReviewSuccess={handleActionSuccess}
      />

      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={closeModal}
        document={selectedDoc}
        onApprovalSuccess={handleActionSuccess}
      />
    </>
  );
}

export default MyTasksPage;
