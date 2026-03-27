import React, { useContext } from 'react';
import { DesignContext } from '../App';

function Toolbar() {
  const { undo, redo, historyIndex, historyLength, canvasRef, clearAll, saveToHistory } = useContext(DesignContext);

  const deleteSelected = () => {
    if (!canvasRef.current) return;
    const active = canvasRef.current.getActiveObject();
    if (active) {
      if (active.type === 'activeSelection') {
        active.forEachObject(obj => canvasRef.current.remove(obj));
        canvasRef.current.discardActiveObject();
      } else {
        canvasRef.current.remove(active);
      }
      canvasRef.current.renderAll();
      saveToHistory();
    }
  };

  return (
    <div className="cpd-toolbar">
      <button
        className="cpd-toolbar-btn"
        onClick={undo}
        disabled={historyIndex <= 0}
        title="Undo"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 101.92-5.44L1 10" />
        </svg>
        Undo
      </button>
      <button
        className="cpd-toolbar-btn"
        onClick={redo}
        disabled={historyIndex >= historyLength - 1}
        title="Redo"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 11-1.92-5.44L23 10" />
        </svg>
        Redo
      </button>
      <button
        className="cpd-toolbar-btn"
        onClick={deleteSelected}
        title="Delete Selected"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
        Delete
      </button>
      <button
        className="cpd-toolbar-btn cpd-toolbar-clear"
        onClick={clearAll}
        title="Clear All"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        Clear All
      </button>
    </div>
  );
}

export default Toolbar;
