// frontend/src/pages/MyTasksPage.jsx

import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { apiCall } from "../utils/api";
import DocumentTable from "../components/DocumentTable";
import UploadModal from "../components/UploadModal";
import ReviewModal from "../components/ReviewModal";
import ApprovalModal from "../components/ApprovalModal";

function MyTasksPage() {
  const { user: currentUser } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
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

  const handleUploadSuccess = () => {
    setIsUploadModalOpen(false);
    fetchTasks();
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
    fetchTasks();
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3">
          <svg
            className="animate-spin h-6 w-6 text-primary-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-gray-600">Loading your tasks...</span>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="p-4 text-sm text-error-700 bg-error-50 rounded-lg border border-error-200 flex items-center space-x-2">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );

  return (
    <>
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
        {/* Header Section */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary-50 rounded-lg">
                <svg
                  className="w-6 h-6 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {tasks.length} {tasks.length === 1 ? "task" : "tasks"} pending
                </p>
              </div>
            </div>

            {/* Upload Button */}
            {currentUser &&
              (currentUser.role === "Contributor" ||
                currentUser.role === "Admin") && (
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="inline-flex items-center px-4 py-2.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap text-sm"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Upload New Document
                </button>
              )}
          </div>
        </div>

        {/* Document Table */}
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tasks pending
            </h3>
            <p className="text-sm text-gray-500 text-center max-w-sm">
              You're all caught up! There are no documents requiring your
              attention at the moment.
            </p>
          </div>
        ) : (
          <DocumentTable
            documents={tasks}
            currentUser={currentUser}
            onOpenReviewModal={openReviewModal}
            onOpenApprovalModal={openApprovalModal}
          />
        )}
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </>
  );
}

export default MyTasksPage;
