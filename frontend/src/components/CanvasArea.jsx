import React, {
  useContext,
  useEffect,
  useRef,
} from 'react';
import { DesignContext, PRINT_AREAS } from '../App';
import { fabric } from 'fabric';

/* ─────────────────────────────────────────────────────────────
    CANVAS AREA — 2D Mockup with Fabric.js
───────────────────────────────────────────────────────────── */

// const mockupImages = {
//   front: '/mockups/front tshirt.png',
//   back: '/mockups/back tshirt.png',
//   leftSleeve: '/mockups/left sliv.png',
//   rightSleeve: '/mockups/right sliv.png'
// };
const isWordPress = typeof window.cpdData !== 'undefined';
const pluginUrl = window.cpdData?.pluginUrl || '';

const mockupImages = isWordPress
  ? {
    front: `${pluginUrl}build/mockups/front tshirt.png`,
    back: `${pluginUrl}build/mockups/back tshirt.png`,
    leftSleeve: `${pluginUrl}build/mockups/left sliv.png`,
    rightSleeve: `${pluginUrl}build/mockups/right sliv.png`,
  }
  : {
    front: '/mockups/front tshirt.png',
    back: '/mockups/back tshirt.png',
    leftSleeve: '/mockups/left sliv.png',
    rightSleeve: '/mockups/right sliv.png',
  };

// Canvas matches the t-shirt container (500×600) so the user
// can always drag objects without the mouse leaving the canvas.
export const CANVAS_WIDTH = 500;
export const CANVAS_HEIGHT = 600;

export default function CanvasArea() {
  const {
    canvasRef,
    productColor,
    activeView,
    saveToHistory,
    zoom,
  } = useContext(DesignContext);

  const [selectionInfo, setSelectionInfo] = React.useState(null);
  const canvasElRef = useRef(null);
  // useRef-based flag survives React Strict Mode's double-invoke
  const fabricInited = useRef(false);

  const activeBox = PRINT_AREAS[activeView] || PRINT_AREAS.front;

  /* ── Fabric initialisation ── */
  useEffect(() => {
    if (!canvasElRef.current || fabricInited.current) return;
    fabricInited.current = true;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: 'transparent',
      selection: true,
      preserveObjectStacking: true,
    });

    // ── Constrain objects to the current print-area (blue box) ──
    // We store the active print‑area on the canvas object so that
    // the handlers below always have the latest bounds without needing
    // a re-bind every time activeView changes.
    canvas._printArea = PRINT_AREAS['front'];

    const clampObject = (obj) => {
      const pa = canvas._printArea;
      if (!pa) return;

      const boxLeft = pa.left * CANVAS_WIDTH;
      const boxTop = pa.top * CANVAS_HEIGHT;
      const boxRight = boxLeft + pa.width * CANVAS_WIDTH;
      const boxBottom = boxTop + pa.height * CANVAS_HEIGHT;

      // Get the object's axis-aligned bounding rect (accounts for rotation/scale)
      const br = obj.getBoundingRect(true, true);

      let dx = 0, dy = 0;

      // Prevent going left / top
      if (br.left < boxLeft) dx = boxLeft - br.left;
      if (br.top < boxTop) dy = boxTop - br.top;
      // Prevent going right / bottom
      if (br.left + br.width > boxRight) dx = boxRight - (br.left + br.width);
      if (br.top + br.height > boxBottom) dy = boxBottom - (br.top + br.height);

      if (dx !== 0) obj.set('left', obj.left + dx);
      if (dy !== 0) obj.set('top', obj.top + dy);
      obj.setCoords();
    };

    const updateSelectionInfo = () => {
      const activeObject = canvas.getActiveObject();
      if (!activeObject) {
        setSelectionInfo(null);
        return;
      }
      const br = activeObject.getBoundingRect(true, true);
      // Using 0.145 ratio for cm and 0.057 for inches
      setSelectionInfo({
        widthCm: (br.width * 0.145).toFixed(1),
        heightCm: (br.height * 0.145).toFixed(1),
        widthIn: (br.width * 0.057).toFixed(1),
        heightIn: (br.height * 0.057).toFixed(1),
        left: br.left,
        top: br.top,
      });
    };

    canvas.on('object:moving', (e) => {
      clampObject(e.target);
      updateSelectionInfo();
    });
    canvas.on('object:scaling', (e) => {
      clampObject(e.target);
      updateSelectionInfo();
    });
    canvas.on('object:rotating', (e) => {
      clampObject(e.target);
      updateSelectionInfo();
    });
    canvas.on('selection:created', updateSelectionInfo);
    canvas.on('selection:updated', updateSelectionInfo);
    canvas.on('selection:cleared', () => setSelectionInfo(null));

    // Only save after the user finishes a move/scale/rotate
    canvas.on('object:modified', saveToHistory);

    canvasRef.current = canvas;

    // Cleanup on unmount — prevents double-init ghost listeners
    return () => {
      fabricInited.current = false;
      canvas.dispose();
      canvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Update the print-area bounds when the view changes ── */
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current._printArea = PRINT_AREAS[activeView] || PRINT_AREAS.front;
    }
  }, [activeView, canvasRef]);

  /* ── Print-area pixel helpers ── */
  const pxLeft = activeBox.left * CANVAS_WIDTH;
  const pxTop = activeBox.top * CANVAS_HEIGHT;
  const pxWidth = activeBox.width * CANVAS_WIDTH;
  const pxHeight = activeBox.height * CANVAS_HEIGHT;

  return (
    <div
      className="cpd-canvas-area"
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'visible',   /* allow drag handles to be reachable */
        backgroundColor: '#eceff8',
        height: '100%',
        width: '100%',
      }}
    >
      {/* ── T-Shirt background ── */}
      <div style={{
        position: 'absolute',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transform: `scale(${zoom})`,
        transformOrigin: 'center center',
        pointerEvents: 'none',   /* let all clicks reach the Fabric canvas */
      }}>
        {/* Colour fill masked to shirt shape */}
        <div style={{
          position: 'absolute',
          inset: 0,
          maskImage: `url("${mockupImages[activeView]}")`,
          WebkitMaskImage: `url("${mockupImages[activeView]}")`,
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
        }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: productColor.hex }} />
          <img
            src={mockupImages[activeView]}
            alt="shadow"
            style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }}
          />
          <img
            src={mockupImages[activeView]}
            alt="highlight"
            style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'screen', opacity: 0.15, position: 'absolute', inset: 0 }}
          />
        </div>
      </div>

      {/* ── Fabric canvas (same 500×600, on top, captures all events) ── */}
      <div style={{
        position: 'absolute',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        transform: `scale(${zoom})`,
        transformOrigin: 'center center',
        zIndex: 10,
      }}>
        <canvas ref={canvasElRef} />

        {/* Blue dashed print-area border */}
        <div style={{
          position: 'absolute',
          left: pxLeft,
          top: pxTop,
          width: pxWidth,
          height: pxHeight,
          border: '2px dashed rgba(67,97,238,0.75)',
          borderRadius: 4,
          pointerEvents: 'none',
          boxSizing: 'border-box',
        }} />

        {/* Floating Dimension Label */}
        {selectionInfo && (
          <div
            className="cpd-dimension-label"
            style={{
              position: 'absolute',
              left: selectionInfo.left,
              top: selectionInfo.top - 32,
              backgroundColor: 'rgba(28, 31, 46, 0.9)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              transform: 'translateY(-100%)',
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              border: '1px solid var(--blue)',
            }}
          >
            📏 {selectionInfo.widthCm}cm x {selectionInfo.heightCm}cm ({selectionInfo.widthIn}" x {selectionInfo.heightIn}")
          </div>
        )}
      </div>
    </div>
  );
}