import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

function PdfViewer({ fileUrl, token }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // --- This is the core of the new, robust logic ---
  // A single useEffect to control the entire load-measure-render pipeline.
  useEffect(() => {
    // We define all our functions inside the effect to create a clear scope.
    const loadAndRenderPdf = async () => {
      // --- Step 1: Load the PDF Document ---
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
        setCurrentPage(1); // Set the current page here

        // --- Step 2: Render the First Page ---
        // We call the render function directly after a successful load.
        // No more race condition between different useEffects.
        await renderPage(pdf, 1);
      } catch (err) {
        console.error("Error during PDF loading:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    const renderPage = async (pdf, pageNum) => {
      if (!pdf || !canvasRef.current || !containerRef.current) return;

      // --- Step 2a: Measure the container right before rendering ---
      const containerWidth = containerRef.current.clientWidth;
      if (containerWidth === 0) {
        // If the container isn't ready, wait a tiny moment and try again.
        // This is a safety net for fast-rendering environments.
        setTimeout(() => renderPage(pdf, pageNum), 50);
        return;
      }

      try {
        const page = await pdf.getPage(pageNum);
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale: scale * dpr });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        canvas.style.width = `${containerWidth}px`;
        canvas.style.height = `${scaledViewport.height / dpr}px`;

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };
        await page.render(renderContext).promise;
      } catch (err) {
        console.error("Failed to render page:", err);
        setError("Could not render PDF page.");
      }
    };

    loadAndRenderPdf();
  }, [fileUrl, token]); // The entire pipeline runs only when the file changes.

  // A separate, simple effect to handle subsequent page changes.
  useEffect(() => {
    if (pdfDoc) {
      // Only run if the PDF is already loaded
      const renderPage = async (pdf, pageNum) => {
        // ... (render logic is duplicated here for simplicity, can be refactored)
        if (!pdf || !canvasRef.current || !containerRef.current) return;
        const containerWidth = containerRef.current.clientWidth;
        if (containerWidth === 0) return;

        const page = await pdf.getPage(pageNum);
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale: scale * dpr });
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;
        canvas.style.width = `${containerWidth}px`;
        canvas.style.height = `${scaledViewport.height / dpr}px`;
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };
        await page.render(renderContext).promise;
      };
      renderPage(pdfDoc, currentPage);
    }
  }, [currentPage]); // This effect ONLY runs when the user clicks 'Next' or 'Previous'

  if (isLoading)
    return <div className="p-8 text-center">Loading PDF preview...</div>;
  if (error)
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="w-full h-full flex flex-col items-center bg-gray-100">
      <div
        ref={containerRef}
        className="flex-grow w-full overflow-y-auto flex justify-center"
      >
        <canvas ref={canvasRef} className="shadow-lg" />
      </div>
      {numPages > 0 && (
        <div className="flex-shrink-0 flex items-center justify-center gap-4 bg-white p-2 border-t w-full shadow-inner">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-gray-200 rounded-md font-semibold disabled:opacity-50"
          >
            &larr; Previous
          </button>
          <p className="text-sm font-medium text-gray-800">
            Page {currentPage} of {numPages}
          </p>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, numPages))
            }
            disabled={currentPage >= numPages}
            className="px-4 py-2 bg-gray-200 rounded-md font-semibold disabled:opacity-50"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

export default PdfViewer;
