import React, { useContext } from 'react';
import { DesignContext } from '../App';
import UploadPanel from './UploadPanel';
import TextPanel from './TextPanel';
import ArtPanel from './ArtPanel';
import ProductDetails from './ProductDetails';
import NamesNumbers from './NamesNumbers';
import NotesPanel from './NotesPanel';

const navItems = [
  {
    id: 'upload',
    label: 'Upload',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Add Text',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
  },
  {
    id: 'art',
    label: 'Add Art',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    id: 'details',
    label: 'Product Details',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    id: 'names',
    label: 'Add Names',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="8" height="14" rx="1" />
        <rect x="14" y="5" width="8" height="14" rx="1" />
        <path d="M6 9v6M6 12h0" />
        <path d="M18 9v6M18 12h0" />
      </svg>
    ),
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
      </svg>
    ),
  },
];

const panelTitles = {
  upload: 'Choose File To Upload',
  text: 'Add Text',
  art: 'Artwork Categories',
  details: 'Product and Decoration Details',
  names: 'Names and Numbers Tools',
  notes: 'Design Instructions',
};

const panelComponents = {
  upload: UploadPanel,
  text: TextPanel,
  art: ArtPanel,
  details: ProductDetails,
  names: NamesNumbers,
  notes: NotesPanel,
};

function Sidebar() {
  const { activePanel, setActivePanel, setScreen } = useContext(DesignContext);
  const PanelComponent = panelComponents[activePanel];

  return (
    <div className="cpd-sidebar">
      <nav className="cpd-sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`cpd-sidebar-nav-item ${activePanel === item.id ? 'active' : ''}`}
            onClick={() => setActivePanel(item.id)}
            title={item.label}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="cpd-sidebar-panel">
        <div className="cpd-panel-header">
          <div className="cpd-panel-header-left">
            <button className="cpd-back-btn" onClick={() => setActivePanel(null)} title="Back">‹</button>
            <h3>{panelTitles[activePanel]}</h3>
          </div>
          <button className="cpd-close-btn" onClick={() => setScreen('detail')} title="Return to Product Detail">✕</button>
        </div>
        <div className="cpd-panel-body">
          {PanelComponent && <PanelComponent />}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
