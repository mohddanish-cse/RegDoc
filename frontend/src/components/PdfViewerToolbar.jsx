import React from "react";

// SVG Icons for a professional look
const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 mr-1.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const PrintIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 mr-1.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
    />
  </svg>
);

const FullscreenIcon = ({ isFullscreen }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 mr-1.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    {isFullscreen ? (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      /> // Simple 'X' for exit
    ) : (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-1v4m0 0h-4m4 0l-5-5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5 5"
      />
    )}
  </svg>
);

function PdfViewerToolbar({
  onDownload,
  onPrint,
  onFullScreen,
  isPrintEnabled,
  isFullscreen,
}) {
  return (
    <div className="flex-shrink-0 bg-gray-50 p-2 border-b border-gray-300 flex items-center gap-2 shadow-sm">
      <button
        onClick={onDownload}
        className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
      >
        <DownloadIcon />
        Download
      </button>

      {/* ✨ FIX: Conditionally render the Print button ✨ */}
      {isPrintEnabled && (
        <button
          onClick={onPrint}
          className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
        >
          <PrintIcon />
          Print
        </button>
      )}

      <button
        onClick={onFullScreen}
        className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
      >
        <FullscreenIcon isFullscreen={isFullscreen} />
        {/* ✨ FIX: Change button text based on state ✨ */}
        {isFullscreen ? "Exit Full Screen" : "Full Screen"}
      </button>
    </div>
  );
}

export default PdfViewerToolbar;
