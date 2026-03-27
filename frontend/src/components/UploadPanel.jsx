import React, { useContext, useRef, useState } from 'react';
import { DesignContext, PRINT_AREAS } from '../App';
import { fabric } from 'fabric';

function UploadPanel() {
  const { canvasRef, activeView, saveToHistory, incrementCustomizationCount } = useContext(DesignContext);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [recentUploads, setRecentUploads] = useState([]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert('File size must be under 20MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setRecentUploads(prev => [dataUrl, ...prev].slice(0, 6));
      addImageToCanvas(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const addImageToCanvas = (dataUrl) => {
    if (!canvasRef.current) return;
    const area = PRINT_AREAS[activeView] || PRINT_AREAS.front;

    fabric.Image.fromURL(dataUrl, (img) => {
      // Scale to fit within the print area
      const maxW = area.width * 0.8;
      const maxH = area.height * 0.6;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);

      // Center in the print area
      const centerX = area.left + area.width / 2;
      const centerY = area.top + area.height / 2;

      img.set({
        scaleX: scale,
        scaleY: scale,
        left: centerX,
        top: centerY,
        originX: 'center',
        originY: 'center',
        cornerStyle: 'circle',
        cornerColor: '#4361ee',
        cornerSize: 10,
        transparentCorners: false,
        borderColor: '#4361ee',
      });

      canvasRef.current.add(img);
      canvasRef.current.setActiveObject(img);
      canvasRef.current.renderAll();
      incrementCustomizationCount?.();
    });
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        className="cpd-hidden-input"
        accept="image/*"
        onChange={handleInputChange}
      />

      <button className="cpd-upload-btn" onClick={handleBrowse}>
        Browse Your Computer
      </button>

      <div className="cpd-upload-divider">or</div>

      <div
        className={`cpd-drop-zone ${dragOver ? 'dragover' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowse}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Drag & Drop Anywhere
      </div>

      <div className="cpd-upload-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>Vector or high resolution artwork of 300 DPI or more will look the best. Max size of 20 MB.</span>
      </div>

      {recentUploads.length > 0 && (
        <div className="cpd-recent-uploads">
          <h4>Recent Uploads</h4>
          <p>Click to add to design</p>
          <div className="cpd-recent-grid">
            {recentUploads.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Upload ${i + 1}`}
                onClick={() => addImageToCanvas(url)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadPanel;
