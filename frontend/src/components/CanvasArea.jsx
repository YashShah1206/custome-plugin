import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  Suspense
} from 'react';
import { DesignContext, PRINT_AREAS } from '../App';
import { fabric } from 'fabric';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  useGLTF,
  Decal,
  Environment,
  Center,
  OrbitControls,
  ContactShadows,
  Html
} from '@react-three/drei';
import * as THREE from 'three';

/* ─────────────────────────────────────────────────────────────
   ✅ FIXED SHIRT COMPONENT (MULTI-MESH SUPPORT)
───────────────────────────────────────────────────────────── */
function Shirt({ color, canvasDataUrl, activeView }) {
  const { nodes } = useGLTF('/models/tshirt.glb');
  const meshRef = useRef();

  // ✅ Get ALL meshes (IMPORTANT FIX)
  const meshes = useMemo(() => {
    return Object.values(nodes).filter(n => n.isMesh);
  }, [nodes]);

  // ✅ Texture from Fabric canvas
  const texture = useMemo(() => {
    if (!canvasDataUrl) return null;
    const tex = new THREE.TextureLoader().load(canvasDataUrl);
    tex.anisotropy = 16;
    return tex;
  }, [canvasDataUrl]);

  // ✅ Calculate bounds
  const { scale, decalZ, decalY } = useMemo(() => {
    if (!meshes.length) return { scale: 1, decalZ: 0.2, decalY: 0 };

    const geo = meshes[0].geometry;
    geo.computeBoundingBox();
    const bb = geo.boundingBox;

    const h = bb.max.y - bb.min.y;
    const w = bb.max.x - bb.min.x;
    const d = bb.max.z - bb.min.z;

    const maxDim = Math.max(h, w, d);

    return {
      scale: 1.6 / maxDim,
      decalZ: (d / 2) + 0.02,
      decalY: (bb.max.y + bb.min.y) / 2 + h * 0.12,
    };
  }, [meshes]);

  // ✅ Decal position per view
  const decalConfig = useMemo(() => {
    switch (activeView) {
      case 'back':
        return {
          pos: [0, decalY, -decalZ],
          rot: [0, Math.PI, 0],
          scale: 0.25,
        };

      case 'rightSleeve':
        return {
          pos: [decalZ * 0.7, decalY + 0.1, 0],
          rot: [0, Math.PI / 2, 0],
          scale: 0.12,
        };

      case 'leftSleeve':
        return {
          pos: [-decalZ * 0.7, decalY + 0.1, 0],
          rot: [0, -Math.PI / 2, 0],
          scale: 0.12,
        };

      default: // front
        return {
          pos: [0, decalY, decalZ],
          rot: [0, 0, 0],
          scale: 0.25,
        };
    }
  }, [activeView, decalZ, decalY]);

  return (
    <group ref={meshRef} scale={[scale, scale, scale]}>
      {/* ✅ Render ALL meshes and securely place the Decal inside each mesh */}
      {meshes.map((m, i) => (
        <mesh
          key={i}
          geometry={m.geometry}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={color}
            roughness={0.82}
            metalness={0.05}
            side={THREE.DoubleSide} // ✅ FIX CUT ISSUE
          />
          {/* ✅ Decal must be a direct child of a Mesh */}
          {texture && (
            <Decal
              position={decalConfig.pos}
              rotation={decalConfig.rot}
              scale={decalConfig.scale}
              map={texture}
              depthTest
              polygonOffset
              polygonOffsetFactor={-4}
            />
          )}
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────
   ✅ VIEW ROTATOR (SMOOTH & HIDES 2D LAYER ON ROTATE)
───────────────────────────────────────────────────────────── */
function ViewRotator({ view, controlsRef, overlayRef, isDraggingRef, mouseRef }) {
  const targetAngle = useRef(0);

  useEffect(() => {
    // Model's front face points toward -X axis, so:
    //   front  = +π/2  (camera looks from -X side)
    //   back   = -π/2  (camera looks from +X side)
    //   sleeve = 0     (camera looks from +Z side)
    //   neck   = +π/2  (same as front)
    const angles = {
      front:        Math.PI / 2.25,
      back:         -Math.PI / 1.75,
      rightSleeve:  0,           // camera from +Z → looks at right sleeve
      leftSleeve:   Math.PI,     // camera from -Z → looks at left sleeve
    };
    targetAngle.current = angles[view] ?? Math.PI / 2.25;
  }, [view]);

  useFrame(() => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;
    const current = controls.getAzimuthalAngle();
    const target = targetAngle.current;

    let diff = target - current;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    const isDragging = isDraggingRef?.current;

    // Mouse parallax nudge (only when snapped close to target and not dragging)
    const mx = mouseRef?.current?.x ?? 0; // -1 to +1
    const my = mouseRef?.current?.y ?? 0; // -1 to +1
    const MAX_AZ = 0.21;  // ~12° horizontal parallax
    const MAX_PO = 0.10;  // ~6° vertical parallax

    if (!isDragging && Math.abs(diff) < 0.25) {
      // Near the target — apply smooth parallax on top
      const azTarget = target + mx * MAX_AZ;
      let azDiff = azTarget - current;
      while (azDiff > Math.PI) azDiff -= 2 * Math.PI;
      while (azDiff < -Math.PI) azDiff += 2 * Math.PI;
      const newAz = current + azDiff * 0.06;
      controls.setAzimuthalAngle(newAz);

      // Polar (vertical tilt) — default polar is π/2 (horizontal)
      const curPolar = controls.getPolarAngle();
      const polTarget = Math.PI / 2 - my * MAX_PO;
      const newPolar = curPolar + (polTarget - curPolar) * 0.06;
      controls.setPolarAngle(newPolar);

      controls.update();
    } else if (!isDragging && Math.abs(diff) > 0.01) {
      // Still transitioning to target view — snap without parallax
      const newAngle = current + diff * 0.08;
      controls.setAzimuthalAngle(newAngle);
      controls.update();
    }

    // Seamlessly hide the 2D floating canvas when the camera rotates away
    if (overlayRef && overlayRef.current) {
      if (Math.abs(diff) > 0.05 || isDragging) {
        overlayRef.current.style.opacity = '0';
        overlayRef.current.style.pointerEvents = 'none';
      } else {
        overlayRef.current.style.opacity = '1';
        overlayRef.current.style.pointerEvents = '';
      }
    }
  });

  return null;
}

/* ─────────────────────────────────────────────────────────────
   ✅ MAIN CANVAS AREA
───────────────────────────────────────────────────────────── */
export default function CanvasArea() {
  const {
    canvasRef,
    productColor,
    activeView,
    canvasThumbnails,
    saveToHistory,
    zoom,
    generateThumbnail,
  } = useContext(DesignContext);

  const canvasElRef = useRef(null);
  const overlayRef = useRef(null);
  const isDraggingRef = useRef(false);
  const [initialized, setInitialized] = useState(false);
  const controlsRef = useRef(null);
  // Normalized mouse position (-1 to +1) relative to the canvas wrapper
  const mouseRef = useRef({ x: 0, y: 0 });

  const activeBox = PRINT_AREAS[activeView] || PRINT_AREAS.front;

  // Track mouse over the 3D wrapper to drive parallax rotation
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;  // -1 left → +1 right
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1; // -1 bottom → +1 top
    mouseRef.current = { x, y };
  };

  const handleMouseLeave = () => {
    mouseRef.current = { x: 0, y: 0 };
  };

  /* ✅ Fabric Canvas */
  useEffect(() => {
    if (canvasElRef.current && !initialized) {
      const canvas = new fabric.Canvas(canvasElRef.current, {
        width: 340,
        height: 440,
        backgroundColor: 'transparent',
      });

      const area = PRINT_AREAS.front;

      const clip = new fabric.Rect({
        left: area.left,
        top: area.top,
        width: area.width,
        height: area.height,
        absolutePositioned: true,
      });

      canvas.clipPath = clip;

      canvas.on('object:modified', saveToHistory);
      canvas.on('object:added', saveToHistory);

      canvasRef.current = canvas;
      setInitialized(true);
    }
  }, []);

  /* ✅ Update print area */
  useEffect(() => {
    if (!canvasRef.current) return;

    const area = PRINT_AREAS[activeView] || PRINT_AREAS.front;

    canvasRef.current.clipPath.set({
      left: area.left,
      top: area.top,
      width: area.width,
      height: area.height,
    });

    canvasRef.current.renderAll();
  }, [activeView]);

  // Calculate CSS clip-path inset dynamically to allow 3D rotation outside the print area
  const padding = 20; // Allow 20px extra for Fabric selection handles
  const insetTop = Math.max(0, activeBox.top - padding);
  const insetRight = Math.max(0, 340 - (activeBox.left + activeBox.width) - padding);
  const insetBottom = Math.max(0, 440 - (activeBox.top + activeBox.height) - padding);
  const insetLeft = Math.max(0, activeBox.left - padding);
  const cssClipPath = `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`;

  return (
    <div
      className="cpd-canvas-area"
      style={{ position: 'relative' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── 3D Scene: fills entire cpd-canvas-area, never clipped ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <Canvas
          shadows
          camera={{ position: [-2.5, 0.1, 0], fov: 40 }}
        >
          <ambientLight intensity={0.6} />

          <directionalLight
            position={[3, 8, 6]}
            intensity={1.8}
            castShadow
          />

          <Suspense fallback={<Html center>Loading...</Html>}>
            <Center>
              <Shirt
                color={productColor.hex}
                canvasDataUrl={canvasThumbnails[activeView]}
                activeView={activeView}
              />
            </Center>

            <Environment preset="studio" />

            <ContactShadows
              position={[0, -0.6, 0]}
              opacity={0.5}
              scale={10}
              blur={2}
            />
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            target={[0.15, 0.3, 0]}
            enablePan={false}
            enableZoom
            enableDamping
            onStart={() => { isDraggingRef.current = true; }}
            onEnd={() => { isDraggingRef.current = false; }}
          />

          <ViewRotator view={activeView} controlsRef={controlsRef} overlayRef={overlayRef} isDraggingRef={isDraggingRef} mouseRef={mouseRef} />
        </Canvas>
      </div>

      {/* ── 2D Design layer: centered 340×440, sits above 3D ── */}
      <div
        style={{
          position: 'relative',
          width: 340,
          height: 440,
          transform: `scale(${zoom})`,
          zIndex: 10,
          pointerEvents: 'none', // let 3D orbit capture mouse by default
        }}
      >
        {/* Fabric canvas – pointer events only inside the print area */}
        <div
          ref={overlayRef}
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: cssClipPath,
            pointerEvents: 'auto',
          }}
        >
          <canvas ref={canvasElRef} style={{ background: 'transparent' }} />
        </div>

        {/* Print Area dashed border */}
        <div
          style={{
            position: 'absolute',
            left: activeBox.left,
            top: activeBox.top,
            width: activeBox.width,
            height: activeBox.height,
            border: '2px dashed rgba(67,97,238,0.7)',
            borderRadius: 4,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}

useGLTF.preload('/models/tshirt.glb');