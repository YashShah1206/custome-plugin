import React, { useContext } from 'react';
import { DesignContext } from '../App';

const views = [
  { id: 'front',        label: 'Front' },
  { id: 'back',         label: 'Back' },
  { id: 'rightSleeve', label: 'R. Sleeve' },
  { id: 'leftSleeve',  label: 'L. Sleeve' },
];

function ProductThumb({ color, view }) {
  const isBack = view === 'back';
  return (
    <svg viewBox="0 0 50 58" width="38" height="44">
      <defs>
        <linearGradient id={`vs-grad-${view}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.75"/>
        </linearGradient>
      </defs>
      <path
        d="M 12 1 L 1 12 L 8 19 L 12 15 L 12 56 L 38 56 L 38 15 L 42 19 L 49 12 L 38 1 L 32 6 Q 25 10 18 6 Z"
        fill={`url(#vs-grad-${view})`}
        stroke="#00000020"
        strokeWidth="0.8"
      />
      <path d="M 18 6 Q 25 12 32 6 Q 28 10 25 11 Q 22 10 18 6" fill="#00000012"/>
      {isBack && <line x1="25" y1="8" x2="25" y2="54" stroke="#00000010" strokeWidth="0.8"/>}
      {/* Right sleeve highlight (left side of SVG) */}
      {view === 'rightSleeve' && <path d="M 12 1 L 1 12 L 8 19 L 12 15" fill="none" stroke="#4361ee" strokeWidth="1.2" strokeDasharray="2,1"/>}
      {/* Left sleeve highlight (right side of SVG) */}
      {view === 'leftSleeve'  && <path d="M 38 1 L 49 12 L 42 19 L 38 15" fill="none" stroke="#4361ee" strokeWidth="1.2" strokeDasharray="2,1"/>}
    </svg>
  );
}

export default function ViewSwitcher() {
  const { activeView, setActiveView, productColor, zoom, setZoom } = useContext(DesignContext);

  return (
    <div className="cpd-view-switcher">
      {views.map((view) => (
        <button
          key={view.id}
          className={`cpd-view-btn ${activeView === view.id ? 'active' : ''}`}
          onClick={() => setActiveView(view.id)}
        >
          <div className="cpd-view-thumb">
            <ProductThumb color={productColor.hex} view={view.id} />
          </div>
          <span>{view.label}</span>
        </button>
      ))}

      <div className="cpd-view-divider" />

      <button
        className="cpd-view-btn cpd-zoom-btn"
        onClick={() => setZoom(prev => prev === 1 ? 1.3 : prev === 1.3 ? 0.8 : 1)}
        title={`Zoom: ${zoom === 1 ? 'Normal' : zoom > 1 ? 'Zoomed In' : 'Zoomed Out'}`}
      >
        <div className="cpd-view-thumb">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#555" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            {zoom < 1
              ? <line x1="8" y1="11" x2="14" y2="11"/>
              : <><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></>
            }
          </svg>
        </div>
        <span>Zoom</span>
      </button>
    </div>
  );
}
