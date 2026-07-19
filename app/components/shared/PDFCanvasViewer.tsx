"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";

// Set worker source to CDN matching the local package version
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFCanvasViewerProps {
  url: string;
  heightClass?: string;
}

export default function PDFCanvasViewer({
  url,
  heightClass = "max-h-[80vh]",
}: PDFCanvasViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Load the PDF document when URL changes
  useEffect(() => {
    let active = true;
    let currentLoadingTask: pdfjs.PDFDocumentLoadingTask | null = null;
    Promise.resolve().then(() => {
      if (active) {
        setLoading(true);
        setError(null);
        setPdfDoc(null);
        setScale(1.0);
        setRotation(0);
      }
    });

    const loadPDF = async () => {
      try {
        currentLoadingTask = pdfjs.getDocument({ url });
        const pdf = await currentLoadingTask.promise;
        if (active) {
          setPdfDoc(pdf);
          setLoading(false);
        } else {
          if (currentLoadingTask) currentLoadingTask.destroy();
        }
      } catch (err) {
        // "Loading aborted" is thrown by pdfjs when destroy() is called during
        // an in-flight load (e.g. unmount or URL change). This is intentional
        // and should not be surfaced to the user as an error.
        const errorMsg = err instanceof Error ? err.message : "";
        const errorName =
          err && typeof err === "object" && "name" in err
            ? (err as { name: string }).name
            : "";
        if (errorMsg === "Loading aborted" || errorName === "AbortException") {
          return;
        }
        console.error("Error loading PDF preview:", err);
        if (active) {
          setError("Failed to load PDF preview.");
          setLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      active = false;
      if (currentLoadingTask) {
        try {
          currentLoadingTask.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [url]);

  // 2. Render pages when pdfDoc, scale, or rotation changes
  useEffect(() => {
    if (!pdfDoc) return;

    let active = true;
    const renderTasks: pdfjs.RenderTask[] = [];

    const container = containerRef.current;

    const clearContainer = (el: HTMLDivElement) => {
      const canvases = el.querySelectorAll("canvas");
      canvases.forEach((canvas) => {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
      el.innerHTML = "";
    };

    if (container) {
      clearContainer(container);
    }

    const renderPages = async () => {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (!active) break;
        await renderPage(pdfDoc, i);
      }
    };

    const renderPage = async (
      pdf: pdfjs.PDFDocumentProxy,
      pageNumber: number,
    ) => {
      let page: pdfjs.PDFPageProxy | null = null;
      try {
        page = await pdf.getPage(pageNumber);
        if (!active) return;

        const viewport = page.getViewport({ scale, rotation });

        const wrapper = document.createElement("div");
        wrapper.className =
          "relative mb-6 select-none shadow-md border border-neutral-200 rounded-lg overflow-hidden bg-white max-w-full transition-shadow duration-200 hover:shadow-lg";
        wrapper.oncontextmenu = (e) => e.preventDefault();

        const canvas = document.createElement("canvas");
        const canvasId = `pdf-canvas-page-${pageNumber}`;
        canvas.id = canvasId;
        canvas.className =
          "max-w-full h-auto block select-none pointer-events-none";

        const context = canvas.getContext("2d");
        if (context) {
          const pixelRatio = window.devicePixelRatio || 1;

          canvas.width = viewport.width * pixelRatio;
          canvas.height = viewport.height * pixelRatio;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          context.scale(pixelRatio, pixelRatio);

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
            canvas: canvas,
          };

          const renderTask = page.render(renderContext);
          renderTasks.push(renderTask);

          try {
            await renderTask.promise;
          } catch (err) {
            const errorName =
              err && typeof err === "object" && "name" in err
                ? (err as { name: string }).name
                : "";
            if (errorName !== "RenderingCancelledException") {
              throw err;
            }
          }
        }

        wrapper.appendChild(canvas);
        if (container && active) {
          container.appendChild(wrapper);
        }
      } catch (err) {
        console.error(`Error rendering page ${pageNumber}:`, err);
      } finally {
        if (page) {
          page.cleanup();
        }
      }
    };

    renderPages();

    return () => {
      active = false;
      renderTasks.forEach((task) => {
        try {
          task.cancel();
        } catch {
          // ignore
        }
      });
      if (container) {
        clearContainer(container);
      }
    };
  }, [pdfDoc, scale, rotation]);

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const rotateClockwise = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const rotateCounterClockwise = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const resetControls = () => {
    setScale(1.0);
    setRotation(0);
  };

  return (
    <div
      className={`w-full flex flex-col bg-neutral-50/50 rounded-b-2xl border-t border-neutral-100 overflow-hidden relative ${heightClass}`}
    >
      {/* Sticky Glassmorphic Controls Bar */}
      {!loading && !error && pdfDoc && (
        <div className="w-full sticky top-0 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 bg-white/80 backdrop-blur-md border-b border-neutral-200/60 shadow-sm transition-all duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-md">
              Pages: {pdfDoc.numPages}
            </span>
          </div>

          {/* Zoom and Rotate controls */}
          <div className="flex items-center gap-4">
            {/* Zoom Controls */}
            <div className="flex items-center bg-neutral-100/80 rounded-lg p-0.5 border border-neutral-200/50">
              <button
                onClick={zoomOut}
                disabled={scale <= 0.5}
                className="p-1.5 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-all duration-150 cursor-pointer"
                title="Zoom Out"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 12h-15"
                  />
                </svg>
              </button>
              <span className="text-xs font-mono font-bold text-neutral-700 min-w-[50px] text-center select-none">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                disabled={scale >= 3.0}
                className="p-1.5 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-all duration-150 cursor-pointer"
                title="Zoom In"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              </button>
            </div>

            {/* Divider */}
            <div className="w-[1px] h-5 bg-neutral-200" />

            {/* Rotation Controls */}
            <div className="flex items-center bg-neutral-100/80 rounded-lg p-0.5 border border-neutral-200/50">
              <button
                onClick={rotateCounterClockwise}
                className="p-1.5 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-white transition-all duration-150 cursor-pointer"
                title="Rotate Counter-Clockwise"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                  />
                </svg>
              </button>
              <button
                onClick={rotateClockwise}
                className="p-1.5 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-white transition-all duration-150 cursor-pointer"
                title="Rotate Clockwise"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetControls}
              disabled={Math.abs(scale - 1.0) < 0.01 && rotation === 0}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 disabled:opacity-40 disabled:hover:text-neutral-500 hover:bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200/40 bg-white transition-all duration-150 cursor-pointer"
              title="Reset Zoom & Rotation"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Pages Container */}
      <div className="flex-1 w-full overflow-y-auto p-6 flex flex-col items-center">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-24 text-neutral-500 font-medium">
            <div className="w-10 h-10 border-4 border-[#3b6fe8] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm">Preparing PDF preview...</p>
          </div>
        )}

        {error && (
          <div className="py-24 text-red-500 font-medium text-sm flex flex-col items-center gap-2">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p>{error}</p>
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full flex flex-col items-center max-w-2xl"
        />
      </div>
    </div>
  );
}
