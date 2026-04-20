import React, { useContext, useState, useEffect, useRef } from 'react';
import { DesignContext, PRINT_AREAS } from '../App';
import { fabric } from 'fabric';

const CANVAS_WIDTH  = 500;
const CANVAS_HEIGHT = 600;

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

  const r = Math.abs(20000 / (curveAmount || 1)); // Larger radius for smaller curve
  const dir = curveAmount >= 0 ? 1 : -1;
  const chars = text.split('');
  const totalChars = chars.length;
  if (totalChars === 0) return;

  const charWidth = (fontSize * 0.5) + (charSpacing / 10);
  const totalArc = (totalChars * charWidth) / r;
  const startAngle = -Math.PI / 2 - (totalArc / 2);

  const groupItems = [];
  chars.forEach((char, i) => {
    const angle = startAngle + (i + 0.5) * (totalArc / totalChars);
    const cx = r * Math.cos(angle);
    const cy = dir * r * Math.sin(angle);
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
      selectable: false,
      evented: false,
    });
    groupItems.push(charText);
  });

  const fabricGroup = new fabric.Group(groupItems, {
    left: left,
    top: top,
    originX: 'center',
    originY: 'center',
    cornerStyle: 'circle',
    cornerColor: '#4361ee',
    cornerSize: 10,
    transparentCorners: false,
    borderColor: '#4361ee',
    data: { 
      type: 'curved-text', 
      originalText: text,
      curveAmount: curveAmount
    },
  });
  
  canvas.add(fabricGroup);
  canvas.setActiveObject(fabricGroup);
  canvas.renderAll();
}

// Alignment Icons
const AlignLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
  </svg>
);
const AlignCenter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="10" x2="6" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="18" y1="18" x2="6" y2="18" />
  </svg>
);
const AlignRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="7" y2="18" />
  </svg>
);

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
    canvas.on('selection:cleared', () => {
      setSelectedText(null);
      // setText(''); // don't clear text input on deselect so user can edit last text
    });

    return () => {
      canvas.off('selection:created', onSelect);
      canvas.off('selection:updated', onSelect);
      canvas.off('selection:cleared');
    };
  }, [canvasRef]);

  // Handle alignment with positioning logic
  const handleAlignmentChange = (newAlign) => {
    setTextAlign(newAlign);
    if (!selectedText || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const area = PRINT_AREAS[activeView] || PRINT_AREAS.front;
    const areaLeftPx = area.left * CANVAS_WIDTH;
    const areaWidthPx = area.width * CANVAS_WIDTH;

    let newLeft = areaLeftPx + areaWidthPx / 2;
    if (newAlign === 'left') {
      newLeft = areaLeftPx + (selectedText.width * selectedText.scaleX) / 2;
    } else if (newAlign === 'right') {
      newLeft = (areaLeftPx + areaWidthPx) - (selectedText.width * selectedText.scaleX) / 2;
    }

    selectedText.set({ textAlign: newAlign, left: newLeft });
    selectedText.setCoords();
    canvas.renderAll();
    saveToHistory();
  };

  // 2. Apply live changes to selected text
  useEffect(() => {
    if (!selectedText || !canvasRef.current || !text) return;
    const canvas = canvasRef.current;
    let madeChanges = false;

    if (curved) {
      if (selectedText.data?.type === 'curved-text') {
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
      } else if (selectedText.type === 'i-text') {
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
      if (selectedText.type === 'group' && selectedText.data?.type === 'curved-text') {
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
      const timer = setTimeout(() => saveToHistory(), 500);
      return () => clearTimeout(timer);
    }
  }, [text, font, fontSize, textColor, bold, italic, underline, textAlign, letterSpacing, curved, curveAmount]);

  const handleAddText = () => {
    if (!text.trim() || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const area = PRINT_AREAS[activeView] || PRINT_AREAS.front;

    const areaLeftPx   = area.left   * CANVAS_WIDTH;
    const areaTopPx    = area.top    * CANVAS_HEIGHT;
    const areaWidthPx  = area.width  * CANVAS_WIDTH;
    const areaHeightPx = area.height * CANVAS_HEIGHT;

    let posX = areaLeftPx + areaWidthPx / 2;
    if (textAlign === 'left') posX = areaLeftPx + 40;
    if (textAlign === 'right') posX = areaLeftPx + areaWidthPx - 40;
    
    const centerY = areaTopPx  + areaHeightPx / 2;

    if (curved) {
      addCurvedTextToCanvas(canvas, text, {
        fontFamily: font, fontSize, fill: textColor,
        fontWeight: bold ? 'bold' : 'normal',
        fontStyle: italic ? 'italic' : 'normal',
        underline, charSpacing: letterSpacing, curveAmount,
        left: posX, top: centerY,
      });
    } else {
      const textObj = new fabric.IText(text, {
        left: posX, top: centerY,
        originX: 'center', originY: 'center',
        fontFamily: font, fontSize: fontSize, fill: textColor,
        fontWeight: bold ? 'bold' : 'normal',
        fontStyle: italic ? 'italic' : 'normal',
        underline: underline, textAlign: textAlign,
        charSpacing: letterSpacing,
        cornerStyle: 'circle', cornerColor: '#4361ee', cornerSize: 10,
        transparentCorners: false, borderColor: '#4361ee',
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
    <div className="cpd-panel-inner">
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
        <button className="cpd-delete-btn" onClick={deleteSelected}>
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

        {/* Format & Alignment */}
        <div className="cpd-text-row-group">
          <div className="cpd-text-tool-group" style={{ flex: 1 }}>
            <label>Format</label>
            <div className="cpd-text-format-row">
              <button className={`cpd-format-btn ${bold ? 'active' : ''}`} onClick={() => setBold(!bold)} title="Bold" style={{ fontWeight: 'bold' }}>B</button>
              <button className={`cpd-format-btn ${italic ? 'active' : ''}`} onClick={() => setItalic(!italic)} title="Italic" style={{ fontStyle: 'italic' }}>I</button>
              <button className={`cpd-format-btn ${underline ? 'active' : ''}`} onClick={() => setUnderline(!underline)} title="Underline" style={{ textDecoration: 'underline' }}>U</button>
            </div>
          </div>

          <div className="cpd-text-tool-group" style={{ flex: 1 }}>
            <label>Alignment</label>
            <div className="cpd-text-align-row">
              <button className={`cpd-format-btn ${textAlign === 'left' ? 'active' : ''}`} onClick={() => handleAlignmentChange('left')} title="Align Left"><AlignLeft /></button>
              <button className={`cpd-format-btn ${textAlign === 'center' ? 'active' : ''}`} onClick={() => handleAlignmentChange('center')} title="Align Center"><AlignCenter /></button>
              <button className={`cpd-format-btn ${textAlign === 'right' ? 'active' : ''}`} onClick={() => handleAlignmentChange('right')} title="Align Right"><AlignRight /></button>
            </div>
          </div>
        </div>

        {/* Text Color */}
        <div className="cpd-text-tool-group">
          <label>Text Color</label>
          <div className="cpd-color-picker-row">
            <div className="cpd-swatch-grid">
              {TEXT_COLORS.map((color) => (
                <div
                  key={color}
                  className={`cpd-color-swatch ${textColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color, border: color === '#ffffff' ? '1px solid #ddd' : 'none' }}
                  onClick={() => setTextColor(color)}
                />
              ))}
            </div>
            <div className="cpd-custom-color-wrap">
              <input
                type="color"
                value={textColor}
                onChange={e => setTextColor(e.target.value)}
                title="Custom color"
                className="cpd-color-custom-input"
              />
              <span>Custom</span>
            </div>
          </div>
        </div>

        {/* Letter Spacing */}
        <div className="cpd-text-tool-group">
          <label>Letter Spacing: {letterSpacing}</label>
          <input
            type="range" className="cpd-size-slider"
            min="-100" max="500" value={letterSpacing}
            onChange={(e) => setLetterSpacing(Number(e.target.value))}
          />
        </div>

        {/* Curved Text */}
        <div className="cpd-curved-section">
          <div className="cpd-curved-toggle">
            <span>Curved Text</span>
            <label className="cpd-toggle-switch">
              <input type="checkbox" checked={curved} onChange={(e) => setCurved(e.target.checked)} />
              <span className="cpd-toggle-slider"></span>
            </label>
          </div>
          {curved && (
            <div className="cpd-curved-controls">
              <label>Amount: {curveAmount > 0 ? `↑ ${curveAmount}` : `↓ ${Math.abs(curveAmount)}`}</label>
              <input
                type="range" className="cpd-curved-slider"
                min="-200" max="200" value={curveAmount}
                onChange={(e) => setCurveAmount(Number(e.target.value))}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
