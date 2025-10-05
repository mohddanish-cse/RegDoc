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

  // ✨ FIX: State to hold the container's width. This is the key to the solution.
  const [containerWidth, setContainerWidth] = useState(0);

  // Effect to load the PDF document
  useEffect(() => {
    const loadPdf = async () => {
      if (!fileUrl || !token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      setContainerWidth(0); // Reset width on new file load
      try {
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
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadPdf();
  }, [fileUrl, token]);

  // ✨ FIX: A dedicated effect to MEASURE the container.
  // This runs after the PDF is loaded and also if the window is resized.
  useEffect(() => {
    const measureContainer = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    // Measure after the initial loading is complete
    if (!isLoading) {
      measureContainer();
    }

    window.addEventListener("resize", measureContainer);
    return () => window.removeEventListener("resize", measureContainer);
  }, [isLoading]); // Re-measure if loading state changes

  // ✨ FIX: The RENDER effect now waits for a valid containerWidth.
  // This prevents the race condition.
  useEffect(() => {
    const renderPage = async () => {
      // The "Gate": Don't render if we don't have a PDF, a canvas, or a width.
      if (!pdfDoc || !canvasRef.current || containerWidth === 0) return;

      try {
        const page = await pdfDoc.getPage(currentPage);
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
    renderPage();
  }, [pdfDoc, currentPage, containerWidth]); // Now depends on the stable width state

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
        {/* We only show the canvas if we have a width to draw on */}
        {containerWidth > 0 && <canvas ref={canvasRef} className="shadow-lg" />}
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
