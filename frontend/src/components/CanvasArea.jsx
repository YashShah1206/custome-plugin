import React, {
  useContext,
  useEffect,
  useRef,
} from 'react';
import { DesignContext } from '../App';
import { fabric } from 'fabric';

/* ─────────────────────────────────────────────────────────────
    CANVAS AREA — 2D Mockup with Fabric.js
───────────────────────────────────────────────────────────── */

// Mockup width/height constant

// Canvas matches the t-shirt container (500×600) so the user
// can always drag objects without the mouse leaving the canvas.
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 1440;

export default function CanvasArea() {
  const {
    canvasRef,
    productColor,
    activeView,
    saveToHistory,
    zoom,
    PRINT_AREAS,
    selectedProduct,
    fullConfig,
    effectiveZoom,
  } = useContext(DesignContext);

  const getMockupImages = () => {
    // 1. Priority: Product-specific mockups from fullConfig
    // If ANY product-specific mockups are uploaded, we use that set EXCLUSIVELY.
    // This allows the user to hide views by leaving them empty.
    if (fullConfig?.productMockups && Object.keys(fullConfig.productMockups).length > 0) {
      return fullConfig.productMockups;
    }

    // 2. Fallback: Default category mockups
    const category = selectedProduct?.category?.id || 'short-sleeve';
    const isWordPress = typeof window.cpdData !== 'undefined';
    const pluginUrl = window.cpdData?.pluginUrl || '';
    const base = isWordPress ? `${pluginUrl}build/mockups/` : '/mockups/';

    if (category === 'cap') {
      return {
        front: `${base}front cap.png`,
        back: `${base}back cap.png`,
        leftSleeve: `${base}left cap.png`,
        rightSleeve: `${base}right cap.png`,
      };
    }

    // Default T-shirt mockups
    return {
      front: `${base}front tshirt.png`,
      back: `${base}back tshirt.png`,
      leftSleeve: `${base}left sliv.png`,
      rightSleeve: `${base}right sliv.png`,
    };
  };

  const mockupImages = getMockupImages();

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
      enableRetinaScaling: false, // We control it manually
      pixelRatio: 2, // Double the internal resolution
      imageSmoothingEnabled: true,
    });

    // ── Constrain objects to the current print-area (blue box) ──
    // We store the active print‑area on the canvas object so that
    // the handlers below always have the latest bounds without needing
    // a re-bind every time activeView changes.
    canvas._printArea = PRINT_AREAS['front'];

    const clampObject = (obj) => {
      let paArray = canvas._printArea;
      if (!paArray) return;
      if (!Array.isArray(paArray)) paArray = [paArray];
      if (paArray.length === 0) return;

      const br = obj.getBoundingRect(true, true);
      const center = { x: br.left + br.width/2, y: br.top + br.height/2 };

      let bestBox = paArray[0];
      let minDistance = Infinity;

      for (const pa of paArray) {
        const boxLeft = pa.left * CANVAS_WIDTH;
        const boxTop = pa.top * CANVAS_HEIGHT;
        const boxRight = boxLeft + pa.width * CANVAS_WIDTH;
        const boxBottom = boxTop + pa.height * CANVAS_HEIGHT;
        const boxCenter = { x: (boxLeft + boxRight)/2, y: (boxTop + boxBottom)/2 };
        
        if (center.x >= boxLeft && center.x <= boxRight && center.y >= boxTop && center.y <= boxBottom) {
           bestBox = pa;
           break;
        }

        const dist = Math.hypot(center.x - boxCenter.x, center.y - boxCenter.y);
        if (dist < minDistance) {
           minDistance = dist;
           bestBox = pa;
        }
      }

      const boxLeft = bestBox.left * CANVAS_WIDTH;
      const boxTop = bestBox.top * CANVAS_HEIGHT;
      const boxRight = boxLeft + bestBox.width * CANVAS_WIDTH;
      const boxBottom = boxTop + bestBox.height * CANVAS_HEIGHT;

      let dx = 0, dy = 0;

      // Check if it's already outside or just moved outside
      if (br.left < boxLeft) dx = boxLeft - br.left;
      if (br.top < boxTop) dy = boxTop - br.top;
      if (br.left + br.width > boxRight) dx = boxRight - (br.left + br.width);
      if (br.top + br.height > boxBottom) dy = boxBottom - (br.top + br.height);

      if (dx !== 0 || dy !== 0) {
        obj.set('left', obj.left + dx);
        obj.set('top', obj.top + dy);
        obj.setCoords();
      }
    };

    const updateClipPath = (paArrayRaw) => {
      if (!paArrayRaw) return;
      const paArray = Array.isArray(paArrayRaw) ? paArrayRaw : [paArrayRaw];
      if (paArray.length === 0) return;

      if (paArray.length === 1) {
        const pa = paArray[0];
        canvas.clipPath = new fabric.Rect({
          left: pa.left * CANVAS_WIDTH,
          top: pa.top * CANVAS_HEIGHT,
          width: pa.width * CANVAS_WIDTH,
          height: pa.height * CANVAS_HEIGHT,
          absolutePositioned: true
        });
      } else {
        const pathString = paArray.map(pa => {
          const l = pa.left * CANVAS_WIDTH;
          const t = pa.top * CANVAS_HEIGHT;
          const w = pa.width * CANVAS_WIDTH;
          const h = pa.height * CANVAS_HEIGHT;
          return `M ${l} ${t} h ${w} v ${h} h ${-w} Z`;
        }).join(' ');
        canvas.clipPath = new fabric.Path(pathString, { absolutePositioned: true });
      }
      canvas.renderAll();
    };
    canvas._updateClipPath = updateClipPath;

    const updateSelectionInfo = () => {
      const activeObject = canvas.getActiveObject();
      if (!activeObject) {
        setSelectionInfo(null);
        return;
      }
      const br = activeObject.getBoundingRect(true, true);
      // Adjusted for 1200px base width (Original 0.145 * 500 / 1200 = 0.0604)
      // Adjusted for 1200px base width (Original 0.057 * 500 / 1200 = 0.0238)
      setSelectionInfo({
        widthCm: (br.width * 0.0604).toFixed(1),
        heightCm: (br.height * 0.0604).toFixed(1),
        widthIn: (br.width * 0.0238).toFixed(1),
        heightIn: (br.height * 0.0238).toFixed(1),
        left: br.left,
        top: br.top,
        width: br.width, // Still keep raw pixels for other uses if needed
        height: br.height,
      });
    };

    // ── Template Lock: Store original positions for template objects ──
    // When a template is loaded, objects get data.editable flags.
    // We enforce position lock by snapping back to the original coords.
    canvas._templateOriginals = new Map();

    canvas._storeTemplateOriginals = () => {
      canvas._templateOriginals.clear();
      canvas.getObjects().forEach(obj => {
        if (obj.data?.editable !== undefined) {
          // Store the original position/scale/rotation for ALL template objects
          canvas._templateOriginals.set(obj, {
            left: obj.left,
            top: obj.top,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            angle: obj.angle,
            width: obj.width,
            height: obj.height,
          });
        }
      });
    };

    canvas._enforceTemplateLock = (obj) => {
      if (!obj || obj.data?.editable === undefined) return false;
      const orig = canvas._templateOriginals.get(obj);
      if (!orig) return false;

      // Snap back to original position/scale/rotation
      obj.set({
        left: orig.left,
        top: orig.top,
        scaleX: orig.scaleX,
        scaleY: orig.scaleY,
        angle: orig.angle,
      });
      obj.setCoords();
      return true; // Indicates this was a template object
    };

    canvas.on('object:moving', (e) => {
      // Template lock: block movement of template objects
      if (canvas._enforceTemplateLock(e.target)) {
        canvas.renderAll();
        return;
      }
      clampObject(e.target);
      updateSelectionInfo();
    });

    canvas.on('object:scaling', (e) => {
      // Template lock: block scaling of template objects
      if (canvas._enforceTemplateLock(e.target)) {
        canvas.renderAll();
        return;
      }

      const obj = e.target;
      let paArray = canvas._printArea;
      if (!paArray) return;
      if (!Array.isArray(paArray)) paArray = [paArray];
      if (paArray.length === 0) return;

      const brCenter = obj.getBoundingRect(true, true);
      const center = { x: brCenter.left + brCenter.width/2, y: brCenter.top + brCenter.height/2 };
      let bestBox = paArray[0];
      let minDistance = Infinity;

      for (const pa of paArray) {
        const boxLeft = pa.left * CANVAS_WIDTH;
        const boxTop = pa.top * CANVAS_HEIGHT;
        const boxRight = boxLeft + pa.width * CANVAS_WIDTH;
        const boxBottom = boxTop + pa.height * CANVAS_HEIGHT;
        const boxCenter = { x: (boxLeft + boxRight)/2, y: (boxTop + boxBottom)/2 };
        if (center.x >= boxLeft && center.x <= boxRight && center.y >= boxTop && center.y <= boxBottom) {
           bestBox = pa;
           break;
        }
        const dist = Math.hypot(center.x - boxCenter.x, center.y - boxCenter.y);
        if (dist < minDistance) {
           minDistance = dist;
           bestBox = pa;
        }
      }

      const boxLeft = bestBox.left * CANVAS_WIDTH;
      const boxTop = bestBox.top * CANVAS_HEIGHT;
      const boxRight = boxLeft + bestBox.width * CANVAS_WIDTH;
      const boxBottom = boxTop + bestBox.height * CANVAS_HEIGHT;

      const br = obj.getBoundingRect(true, true);

      // If the scaled object goes outside the print area, cap the scale
      let needsClamp = false;

      if (br.left < boxLeft) { obj.set('left', obj.left + (boxLeft - br.left)); needsClamp = true; }
      if (br.top < boxTop) { obj.set('top', obj.top + (boxTop - br.top)); needsClamp = true; }

      // Re-check after position adjustment
      const br2 = obj.getBoundingRect(true, true);

      if (br2.left + br2.width > boxRight) {
        const maxScaleX = (boxRight - br2.left) / (br2.width / obj.scaleX);
        obj.set('scaleX', maxScaleX);
        needsClamp = true;
      }
      if (br2.top + br2.height > boxBottom) {
        const maxScaleY = (boxBottom - br2.top) / (br2.height / obj.scaleY);
        obj.set('scaleY', maxScaleY);
        needsClamp = true;
      }

      // Also prevent scaling from pushing left/top outside
      const br3 = obj.getBoundingRect(true, true);
      if (br3.left < boxLeft) obj.set('left', obj.left + (boxLeft - br3.left));
      if (br3.top < boxTop) obj.set('top', obj.top + (boxTop - br3.top));

      obj.setCoords();
      updateSelectionInfo();
    });

    canvas.on('object:rotating', (e) => {
      // Template lock: block rotation of template objects
      if (canvas._enforceTemplateLock(e.target)) {
        canvas.renderAll();
        return;
      }
      clampObject(e.target);
      updateSelectionInfo();
    });
    canvas.on('selection:created', updateSelectionInfo);
    canvas.on('selection:updated', updateSelectionInfo);
    canvas.on('selection:cleared', () => setSelectionInfo(null));
    canvas.on('object:removed', () => {
      if (!canvas.getActiveObject()) setSelectionInfo(null);
    });

    // Only save after the user finishes a move/scale/rotate
    canvas.on('object:modified', (e) => {
      // If a template object was "modified" (user tried to drag), enforce lock
      if (canvas._enforceTemplateLock(e.target)) {
        canvas.renderAll();
        return;
      }
      saveToHistory();
    });

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
      const pa = PRINT_AREAS[activeView] || PRINT_AREAS.front;
      canvasRef.current._printArea = pa;
      if (canvasRef.current._updateClipPath) {
        canvasRef.current._updateClipPath(pa);
      }
    }
  }, [activeView, canvasRef, PRINT_AREAS]);

  /* ── Print-area pixel helpers ── */
  const activeBoxArray = Array.isArray(activeBox) ? activeBox : [activeBox];

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
      {/* ── Mockup / Background Layer (Zoomed) ── */}
      <div style={{
        position: 'absolute',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transform: `scale(${effectiveZoom}) translateZ(0)`,
        transformOrigin: 'center center',
        pointerEvents: 'none',
        imageRendering: 'auto',
        WebkitFontSmoothing: 'antialiased',
        backfaceVisibility: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          maskImage: mockupImages[activeView] ? `url("${mockupImages[activeView]}")` : 'none',
          WebkitMaskImage: mockupImages[activeView] ? `url("${mockupImages[activeView]}")` : 'none',
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
        }}>
          {/* Always show the background color so we can tint the mockup */}
          <div style={{ position: 'absolute', inset: 0, backgroundColor: productColor.hex }} />
          
          {mockupImages[activeView] && (
            <>
              <img
                src={mockupImages[activeView]}
                alt="mockup"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  // Use multiply to allow the background color to show through the highlights/shadows
                  mixBlendMode: 'multiply' 
                }}
              />
              {/* Add a screen layer for highlights to make it look more realistic */}
              <img
                src={mockupImages[activeView]}
                alt="highlight"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain', 
                  mixBlendMode: 'screen', 
                  opacity: 0.15, 
                  position: 'absolute', 
                  inset: 0 
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Fabric canvas (Zoomed) ── */}
      <div style={{
        position: 'absolute',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        transform: `scale(${effectiveZoom}) translateZ(0)`,
        transformOrigin: 'center center',
        zIndex: 10,
        imageRendering: 'optimizeQuality',
        shapeRendering: 'geometricPrecision',
        WebkitFontSmoothing: 'antialiased',
        backfaceVisibility: 'hidden',
      }}>
        <canvas ref={canvasElRef} />
      </div>

      {/* ── Sharp Print-area Borders (Un-zoomed but positioned to match) ── */}
      {activeBoxArray.map((box, idx) => {
        if (!box) return null;
        const pxLeft = box.left * CANVAS_WIDTH;
        const pxTop = box.top * CANVAS_HEIGHT;
        const pxWidth = box.width * CANVAS_WIDTH;
        const pxHeight = box.height * CANVAS_HEIGHT;
        return (
          <div 
            key={`bounds-${idx}`}
            className="cpd-print-bounds"
            style={{
              position: 'absolute',
              left: `calc(50% + ${(pxLeft - CANVAS_WIDTH/2) * effectiveZoom}px)`,
              top: `calc(50% + ${(pxTop - CANVAS_HEIGHT/2) * effectiveZoom}px)`,
              width: pxWidth * effectiveZoom,
              height: pxHeight * effectiveZoom,
              border: '2px dashed rgba(67,97,238,0.7)',
              borderRadius: 4,
              pointerEvents: 'none',
              boxSizing: 'border-box',
              zIndex: 11,
            }}
          />
        );
      })}

      {/* Floating Dimension Label */}
      {selectionInfo && (
        <div
          className="cpd-dimension-label"
          style={{
            position: 'absolute',
            left: `calc(50% + ${(selectionInfo.left - CANVAS_WIDTH/2) * effectiveZoom}px)`,
            top: `calc(50% + ${(selectionInfo.top - 64 - CANVAS_HEIGHT/2) * effectiveZoom}px)`,
            backgroundColor: 'rgba(28, 31, 46, 0.9)',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            zIndex: 15,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            border: '1px solid var(--blue)',
          }}
        >
          {`${selectionInfo.widthCm} x ${selectionInfo.heightCm} cm`}
        </div>
      )}
    </div>
  );
}