import { useEffect, useRef, useState } from "react";
import { getNext, type NextResponse, type PhotoItem, toApiUrl } from "./api";
import "./App.css";

const ROTATE_MS = 10000; // 10s

// ---------- Image cell (per-image measurement for precise pan) ----------
function ImageCell({
  photo,
  layout,            // "single" | "two-up"
  isVisible,         // which section is on top right now
}: {
  photo: PhotoItem;
  layout: "single" | "two-up";
  isVisible: boolean;
}) {
  const cellRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [shiftPx, setShiftPx] = useState(0); // exact travel in px (no gaps)

  useEffect(() => {
    function computeShift() {
      const cell = cellRef.current;
      const img = imgRef.current;
      if (!cell || !img) return;

      const containerW = cell.clientWidth;   // viewport width (single) or column width (two-up)
      const containerH = cell.clientHeight;  // viewport height

      const natW = img.naturalWidth || 0;
      const natH = img.naturalHeight || 0;

      if (!natW || !natH) {
        setShiftPx(0);
        return;
      }

      if (layout === "single") {
        // Singles fill width; compute rendered height at width=containerW
        const renderedH = (natH / natW) * containerW;
        const delta = renderedH - containerH;
        setShiftPx(Math.max(0, Math.ceil(delta))); // ceil to avoid 1px undershoot gaps
      } else {
        // Two-up fills height; no vertical pan
        setShiftPx(0);
      }
    }

    const img = imgRef.current;
    if (img && img.complete) computeShift();
    img?.addEventListener("load", computeShift);
    window.addEventListener("resize", computeShift);

    return () => {
      img?.removeEventListener("load", computeShift);
      window.removeEventListener("resize", computeShift);
    };
  }, [layout]);

  const shouldAnimate = layout === "single" && shiftPx > 0;

  return (
    <div className={`cell ${layout}`} ref={cellRef}>
      <img
        ref={imgRef}
        src={toApiUrl(photo.url)}
        alt={photo.rel}
        className={shouldAnimate ? "kenburnsY" : ""}
        style={
          layout === "single"
            ? ({ ["--kb-shift-px" as any]: `${shiftPx}px` } as React.CSSProperties)
            : undefined
        }
        decoding="async"
        fetchPriority={isVisible ? "high" : "auto"}
        loading={isVisible ? "eager" : "lazy"}
      />
    </div>
  );
}

// ---------- Component ----------
export default function App() {
  const [batchA, setBatchA] = useState<NextResponse | null>(null);
  const [batchB, setBatchB] = useState<NextResponse | null>(null);
  const [shouldShowA, setShouldShowA] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Keep interval id stable and unique
  const intervalRef = useRef<number | ReturnType<typeof setInterval> | null>(null);

  async function initLoad() {
    try {
      const first = await getNext();
      setBatchA(first);
      const second = await getNext();
      setBatchB(second);
      setShouldShowA(true);
    } catch (e) {
      setErrorMessage((e as Error).message);
    }
  }

  async function loadNext() {
    try {
      const incoming = await getNext();
      setShouldShowA(prev => {
        if (prev) {
          setBatchA(incoming);
          return false;
        } else {
          setBatchB(incoming);
          return true;
        }
      });
    } catch (e) {
      setErrorMessage((e as Error).message);
    }
  }

  useEffect(() => {
    initLoad();
  }, []);

  useEffect(() => {
    // Clear any existing interval first (guards HMR / StrictMode double-invoke)
    if (intervalRef.current) {
      clearInterval(intervalRef.current as any);
      intervalRef.current = null;
    }

    // Create a single 10s interval
    const id = setInterval(() => {
      // console.log(`[slideshow] tick @ ${new Date().toLocaleTimeString()}`);
      loadNext();
    }, ROTATE_MS);
    intervalRef.current = id;

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current as any);
        intervalRef.current = null;
      }
    };
  }, []); // empty deps: we manage the ref ourselves

  const photosA: PhotoItem[] = batchA?.items ?? [];
  const photosB: PhotoItem[] = batchB?.items ?? [];

  const layoutClassA: "single" | "two-up" = photosA.length === 2 ? "two-up" : "single";
  const layoutClassB: "single" | "two-up" = photosB.length === 2 ? "two-up" : "single";

  return (
    <main>
      {errorMessage && <p className="err">{errorMessage}</p>}

      <section className={`${shouldShowA ? "visible" : "hidden"} ${layoutClassA}`}>
        {photosA.map(photo => (
          <ImageCell
            key={photo.rel}
            photo={photo}
            layout={layoutClassA}
            isVisible={shouldShowA}
          />
        ))}
      </section>

      <section className={`${shouldShowA ? "hidden" : "visible"} ${layoutClassB}`}>
        {photosB.map(photo => (
          <ImageCell
            key={photo.rel}
            photo={photo}
            layout={layoutClassB}
            isVisible={!shouldShowA}
          />
        ))}
      </section>
    </main>
  );
}
