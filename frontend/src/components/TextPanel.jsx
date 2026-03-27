import React, { useContext, useState, useEffect, useRef } from 'react';
import { DesignContext, PRINT_AREAS } from '../App';
import { fabric } from 'fabric';

const FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins', 'Oswald',
  'Raleway', 'Playfair Display', 'Lora', 'Merriweather',
  'Permanent Marker', 'Dancing Script', 'Pacifico', 'Bangers',
  'Anton', 'Bebas Neue', 'Lobster', 'Righteous', 'Archivo Black',
  'Fredoka One', 'Press Start 2P',
];

const TEXT_COLORS = [
  '#ffffff', '#000000', '#e63946', '#457b9d', '#2d6b3f',
  '#f4a261', '#e76f51', '#264653', '#6b3fa0', '#d4a843',
  '#c4e20f', '#ff6b1a', '#1b2a4a', '#e88baf', '#4361ee',
  '#6b1a2a',
];

// Curved text renderer
function addCurvedTextToCanvas(canvas, text, options) {
  const {
    fontFamily, fontSize, fill, fontWeight, fontStyle, underline,
    charSpacing, curveAmount, left, top,
  } = options;

  const r = Math.abs(curveAmount) * 1.5 + 80;
  const dir = curveAmount >= 0 ? 1 : -1;
  const chars = text.split('');
  const totalChars = chars.length;
  if (totalChars === 0) return;

  const charWidth = (fontSize * 0.6) + (charSpacing / 10);
  const totalArc = (totalChars * charWidth) / r;
  const startAngle = -Math.PI / 2 - (totalArc / 2);

  const group = [];
  chars.forEach((char, i) => {
    const angle = startAngle + (i + 0.5) * (totalArc / totalChars);
    const cx = left + r * Math.cos(angle);
    const cy = top + dir * r * Math.sin(angle);
    const rotation = (angle + Math.PI / 2) * (180 / Math.PI) * dir;

    const charText = new fabric.Text(char, {
      left: cx, top: cy,
      originX: 'center', originY: 'center',
      angle: rotation,
      fontFamily: fontFamily || 'Inter',
      fontSize: fontSize || 30,
      fill: fill || '#ffffff',
      fontWeight: fontWeight || 'normal',
      fontStyle: fontStyle || 'normal',
      underline: !!underline,
      charSpacing: 0,
      selectable: false,
      evented: false,
    });
    group.push(charText);
  });

  const fabricGroup = new fabric.Group(group, {
    left: left - r,
    top: top - (dir > 0 ? r : r * 0.5),
    cornerStyle: 'circle',
    cornerColor: '#4361ee',
    cornerSize: 10,
    transparentCorners: false,
    borderColor: '#4361ee',
    data: { type: 'curved-text', originalText: text },
  });
  canvas.add(fabricGroup);
  canvas.setActiveObject(fabricGroup);
  canvas.renderAll();
}

export default function TextPanel() {
  const { canvasRef, activeView, saveToHistory, incrementCustomizationCount } = useContext(DesignContext);
  const [text, setText] = useState('');
  const [font, setFont] = useState('Inter');
  const [fontSize, setFontSize] = useState(30);
  const [textColor, setTextColor] = useState('#ffffff');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState('center');
  const [curved, setCurved] = useState(false);
  const [curveAmount, setCurveAmount] = useState(100);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [selectedText, setSelectedText] = useState(null);

  // 1. Listen for canvas selection
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const onSelect = () => {
      const obj = canvas.getActiveObject();
      if (!obj) {
        setSelectedText(null);
        return;
      }

      if (obj.type === 'i-text' || obj.type === 'text') {
        setSelectedText(obj);
        setText(obj.text || '');
        setFont(obj.fontFamily || 'Inter');
        setFontSize(obj.fontSize || 30);
        setTextColor(obj.fill || '#ffffff');
        setBold(obj.fontWeight === 'bold');
        setItalic(obj.fontStyle === 'italic');
        setUnderline(!!obj.underline);
        setTextAlign(obj.textAlign || 'center');
        setLetterSpacing(obj.charSpacing || 0);
        setCurved(false);
      } else if (obj.type === 'group' && obj.data?.type === 'curved-text') {
        setSelectedText(obj);
        setText(obj.data.originalText || '');
        // Read options from the first character
        const firstChar = obj._objects[0];
        if (firstChar) {
          setFont(firstChar.fontFamily || 'Inter');
          setFontSize(firstChar.fontSize || 30);
          setTextColor(firstChar.fill || '#ffffff');
          setBold(firstChar.fontWeight === 'bold');
          setItalic(firstChar.fontStyle === 'italic');
          setUnderline(!!firstChar.underline);
        }
        setCurved(true);
        setCurveAmount(obj.data.curveAmount || 100);
      } else {
        setSelectedText(null);
      }
    };

    canvas.on('selection:created', onSelect);
    canvas.on('selection:updated', onSelect);
    canvas.on('selection:cleared', () => setSelectedText(null));

    return () => {
      canvas.off('selection:created', onSelect);
      canvas.off('selection:updated', onSelect);
      canvas.off('selection:cleared');
    };
  }, [canvasRef]);

  // 2. Apply live changes to selected text (Debounced History)
  useEffect(() => {
    if (!selectedText || !canvasRef.current || !text) return;
    const canvas = canvasRef.current;

    // Prevent recursive updates if standard selection
    let madeChanges = false;

    if (curved) {
      // Recreate curved text live
      if (selectedText.data?.type === 'curved-text') {
        // Only recreate if properties actually differ to avoid flickering
        if (
          selectedText.data.originalText !== text ||
          selectedText.data.curveAmount !== curveAmount ||
          selectedText._objects[0]?.fontFamily !== font ||
          selectedText._objects[0]?.fontSize !== fontSize ||
          selectedText._objects[0]?.fill !== textColor ||
          (selectedText._objects[0]?.fontWeight === 'bold') !== bold ||
          (selectedText._objects[0]?.fontStyle === 'italic') !== italic ||
          !!selectedText._objects[0]?.underline !== underline
        ) {
          const top = selectedText.top + (curveAmount > 0 ? 50 : 0);
          const left = selectedText.left + selectedText.width / 2;
          canvas.remove(selectedText);
          addCurvedTextToCanvas(canvas, text, {
            fontFamily: font, fontSize, fill: textColor,
            fontWeight: bold ? 'bold' : 'normal',
            fontStyle: italic ? 'italic' : 'normal',
            underline, charSpacing: letterSpacing, curveAmount,
            left, top
          });
          madeChanges = true;
        }
      } else if (selectedText.type === 'i-text') {
        // Converting normal text to curved text
        const top = selectedText.top;
        const left = selectedText.left;
        canvas.remove(selectedText);
        addCurvedTextToCanvas(canvas, text, {
          fontFamily: font, fontSize, fill: textColor,
          fontWeight: bold ? 'bold' : 'normal',
          fontStyle: italic ? 'italic' : 'normal',
          underline, charSpacing: letterSpacing, curveAmount,
          left, top
        });
        madeChanges = true;
      }
    } else {
      // Normal Text Edit
      if (selectedText.type === 'group' && selectedText.data?.type === 'curved-text') {
        // Converting curved text back to normal text
        const top = selectedText.top;
        const left = selectedText.left + selectedText.width / 2;
        canvas.remove(selectedText);
        const textObj = new fabric.IText(text, {
          left, top, originX: 'center', originY: 'center',
          fontFamily: font, fontSize, fill: textColor,
          fontWeight: bold ? 'bold' : 'normal',
          fontStyle: italic ? 'italic' : 'normal',
          underline, textAlign, charSpacing: letterSpacing,
          cornerStyle: 'circle', cornerColor: '#4361ee', cornerSize: 10,
          transparentCorners: false, borderColor: '#4361ee',
        });
        canvas.add(textObj);
        canvas.setActiveObject(textObj);
        madeChanges = true;
      } else {
        selectedText.set({
          text: text,
          fontFamily: font,
          fontSize: fontSize,
          fill: textColor,
          fontWeight: bold ? 'bold' : 'normal',
          fontStyle: italic ? 'italic' : 'normal',
          underline: underline,
          textAlign: textAlign,
          charSpacing: letterSpacing,
        });
        madeChanges = true;
      }
    }

    if (madeChanges) {
      canvas.renderAll();
      // Debounce history save
      const timer = setTimeout(() => saveToHistory(), 500);
      return () => clearTimeout(timer);
    }
  }, [text, font, fontSize, textColor, bold, italic, underline, textAlign, letterSpacing, curved, curveAmount]);

  const handleAddText = () => {
    if (!text.trim() || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const area = PRINT_AREAS[activeView] || PRINT_AREAS.front;

    // Center text in the print area
    const centerX = area.left + area.width / 2;
    const centerY = area.top + area.height / 2;

    if (curved) {
      addCurvedTextToCanvas(canvas, text, {
        fontFamily: font,
        fontSize,
        fill: textColor,
        fontWeight: bold ? 'bold' : 'normal',
        fontStyle: italic ? 'italic' : 'normal',
        underline,
        charSpacing: letterSpacing,
        curveAmount,
        left: centerX,
        top: centerY,
      });
    } else {
      const textObj = new fabric.IText(text, {
        left: centerX,
        top: centerY,
        originX: 'center',
        originY: 'center',
        fontFamily: font,
        fontSize: fontSize,
        fill: textColor,
        fontWeight: bold ? 'bold' : 'normal',
        fontStyle: italic ? 'italic' : 'normal',
        underline: underline,
        textAlign: textAlign,
        charSpacing: letterSpacing,
        cornerStyle: 'circle',
        cornerColor: '#4361ee',
        cornerSize: 10,
        transparentCorners: false,
        borderColor: '#4361ee',
      });
      canvas.add(textObj);
      canvas.setActiveObject(textObj);
      canvas.renderAll();
    }

    incrementCustomizationCount?.();
    saveToHistory();
  };

  const deleteSelected = () => {
    if (!canvasRef.current) return;
    const obj = canvasRef.current.getActiveObject();
    if (obj) {
      canvasRef.current.remove(obj);
      canvasRef.current.renderAll();
      setSelectedText(null);
      setText('');
      saveToHistory();
    }
  };

  return (
    <div>
      <div className="cpd-text-input-wrap">
        <input
          type="text"
          className="cpd-text-input"
          placeholder="Enter text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
        />
      </div>

      <button className="cpd-add-text-btn" onClick={handleAddText}>
        Add To Design
      </button>

      {selectedText && (
        <button className="cpd-delete-btn" onClick={deleteSelected} style={{ marginBottom: '8px' }}>
          🗑 Delete Selected
        </button>
      )}

      <div className="cpd-text-tools">
        {/* Font Family */}
        <div className="cpd-text-tool-group">
          <label>Font Family</label>
          <select
            className="cpd-font-select"
            value={font}
            onChange={(e) => setFont(e.target.value)}
            style={{ fontFamily: font }}
          >
            {FONTS.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
            ))}
          </select>
        </div>

        {/* Font Size */}
        <div className="cpd-text-tool-group">
          <label>Font Size: {fontSize}px</label>
          <input
            type="range" className="cpd-size-slider"
            min="8" max="120" value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
          />
        </div>

        {/* Format */}
        <div className="cpd-text-tool-group">
          <label>Format</label>
          <div className="cpd-text-format-row">
            <button className={`cpd-format-btn ${bold ? 'active' : ''}`} onClick={() => setBold(!bold)} title="Bold" style={{ fontWeight: 'bold' }}>B</button>
            <button className={`cpd-format-btn ${italic ? 'active' : ''}`} onClick={() => setItalic(!italic)} title="Italic" style={{ fontStyle: 'italic' }}>I</button>
            <button className={`cpd-format-btn ${underline ? 'active' : ''}`} onClick={() => setUnderline(!underline)} title="Underline" style={{ textDecoration: 'underline' }}>U</button>
          </div>
        </div>

        {/* Alignment */}
        <div className="cpd-text-tool-group">
          <label>Alignment</label>
          <div className="cpd-text-align-row">
            {['left', 'center', 'right'].map((align) => (
              <button
                key={align}
                className={`cpd-format-btn ${textAlign === align ? 'active' : ''}`}
                onClick={() => setTextAlign(align)}
                title={align}
              >
                {align === 'left' && '⫷'}
                {align === 'center' && '⫿'}
                {align === 'right' && '⫸'}
              </button>
            ))}
          </div>
        </div>

        {/* Text Color */}
        <div className="cpd-text-tool-group">
          <label>Text Color</label>
          <div className="cpd-color-picker-row">
            {TEXT_COLORS.map((color) => (
              <div
                key={color}
                className={`cpd-color-swatch ${textColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color, border: color === '#ffffff' ? '1px solid #ddd' : 'none' }}
                onClick={() => setTextColor(color)}
              />
            ))}
            <input
              type="color"
              value={textColor}
              onChange={e => setTextColor(e.target.value)}
              title="Custom color"
              className="cpd-color-custom-input"
            />
          </div>
        </div>

        {/* Letter Spacing */}
        <div className="cpd-text-tool-group">
          <label>Letter Spacing: {letterSpacing}</label>
          <input
            type="range" className="cpd-size-slider"
            min="-100" max="800" value={letterSpacing}
            onChange={(e) => setLetterSpacing(Number(e.target.value))}
          />
        </div>

        {/* Curved Text */}
        <div className="cpd-text-tool-group">
          <div className="cpd-curved-toggle">
            <label className="cpd-toggle-switch">
              <input
                type="checkbox"
                checked={curved}
                onChange={(e) => setCurved(e.target.checked)}
              />
              <span className="cpd-toggle-slider"></span>
            </label>
            <span>Curved Text</span>
          </div>
          {curved && (
            <>
              <label style={{ fontSize: '12px', color: '#888', marginTop: '6px', display: 'block' }}>
                Curve Amount: {curveAmount > 0 ? `↑ ${curveAmount}` : `↓ ${Math.abs(curveAmount)}`}
              </label>
              <input
                type="range" className="cpd-curved-slider"
                min="-200" max="200" value={curveAmount}
                onChange={(e) => setCurveAmount(Number(e.target.value))}
              />
              <p className="cpd-curved-hint">💡 Add text with curved enabled to see the arc effect</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
