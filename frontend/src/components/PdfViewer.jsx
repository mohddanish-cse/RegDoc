// frontend/src/components/PdfViewer.jsx

import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

function PdfViewer({ fileUrl, token }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(0.7); // ✅ CHANGED: Default 70% zoom

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const loadAndRenderPdf = async () => {
      try {
        if (!fileUrl || !token) {
          setIsLoading(false);
          return;
        }
        setIsLoading(true);
        setError(null);

        const response = await fetch(fileUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok)
          throw new Error(`Failed to fetch PDF: ${response.statusText}`);

        const arrayBuffer = await response.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);

        await renderPage(pdf, 1, scale);
      } catch (err) {
        console.error("Error during PDF loading:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    const renderPage = async (pdf, pageNum, currentScale) => {
      if (!pdf || !canvasRef.current || !containerRef.current) return;

      try {
        const page = await pdf.getPage(pageNum);
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: currentScale * dpr });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
      } catch (err) {
        console.error("Failed to render page:", err);
        setError("Could not render PDF page.");
      }
    };

    loadAndRenderPdf();
  }, [fileUrl, token, scale]);

  useEffect(() => {
    if (pdfDoc) {
      const renderPage = async (pdf, pageNum, currentScale) => {
        if (!pdf || !canvasRef.current || !containerRef.current) return;

        const page = await pdf.getPage(pageNum);
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: currentScale * dpr });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
      };
      renderPage(pdfDoc, currentPage, scale);
    }
  }, [currentPage, pdfDoc, scale]);

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="flex flex-col items-center space-y-3">
          <svg
            className="animate-spin h-8 w-8 text-primary-600"
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
          <span className="text-gray-600 font-medium text-sm">
            Loading PDF...
          </span>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="p-4 text-sm text-error-700 bg-error-50 border border-error-200 flex items-center space-x-2">
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
          <div>
            <p className="font-medium">Error loading PDF</p>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      </div>
    );

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* PDF Canvas Container */}
      <div
        ref={containerRef}
        className="flex-grow w-full overflow-auto flex justify-center items-start p-4"
      >
        <canvas ref={canvasRef} className="shadow-md" />
      </div>

      {/* Navigation Controls */}
      {numPages > 0 && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-2.5 shadow-sm">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage <= 1}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Previous
            </button>

            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {numPages}
              </span>
              <span className="text-gray-300">|</span>
              <select
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="text-sm border border-gray-300 py-1 px-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="0.5">50%</option>
                <option value="0.7">70%</option>
                <option value="0.85">85%</option>
                <option value="1">100%</option>
                <option value="1.25">125%</option>
                <option value="1.5">150%</option>
              </select>
            </div>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, numPages))
              }
              disabled={currentPage >= numPages}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PdfViewer;
