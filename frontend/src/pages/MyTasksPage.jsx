import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { apiCall } from "../utils/api";
import DocumentTable from "../components/DocumentTable"; // <-- We reuse the table!

// Note: We need to import all the modals here now
import UploadModal from "../components/UploadModal";
import ReviewModal from "../components/ReviewModal";
import ApprovalModal from "../components/ApprovalModal";

function MyTasksPage() {
  const { user: currentUser } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // We need to manage the modals here, similar to the old Dashboard
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

  // Modal control functions
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
      {/* We pass the tasks list to the same table component */}
      <DocumentTable
        documents={tasks}
        currentUser={currentUser}
        onOpenReviewModal={openReviewModal}
        onOpenApprovalModal={openApprovalModal}
        // We will add the 'Amend' modal function here later
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
