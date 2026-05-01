import React, { useContext } from 'react';
import { DesignContext } from '../App';

const views = [
  { id: 'front',        label: 'Front' },
  { id: 'back',         label: 'Back' },
  { id: 'rightSleeve', label: 'Right' },
  { id: 'leftSleeve',  label: 'Left' },
];

function getViewLabel(view, isCap, fullConfig) {
  if (fullConfig?.viewLabels && fullConfig.viewLabels[view.id]) {
    let label = fullConfig.viewLabels[view.id];
    return label.replace(/\s*\/?\s*Sleeve/gi, '');
  }
  if (view.id === 'front') return 'Front';
  if (view.id === 'back') return 'Back';
  return view.id === 'rightSleeve' ? 'Right' : 'Left';
}

export default function ViewSwitcher() {
  const { activeView, setActiveView, productColor, zoom, setZoom, selectedProduct, fullConfig } = useContext(DesignContext);
  const categoryId = selectedProduct?.category?.id || 'short-sleeve';

  // Get the actual mockup images, same logic as CanvasArea
  const getMockupImages = () => {
    if (fullConfig?.productMockups && Object.keys(fullConfig.productMockups).length > 0) {
      return fullConfig.productMockups;
    }

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

    return {
      front: `${base}front tshirt.png`,
      back: `${base}back tshirt.png`,
      leftSleeve: `${base}left sliv.png`,
      rightSleeve: `${base}right sliv.png`,
    };
  };

  const mockupImages = getMockupImages();

  // Filter views based on available mockups if they exist
  const availableViews = views.filter(v => {
    if (fullConfig?.productMockups) {
      return !!fullConfig.productMockups[v.id];
    }
    return true; // Show all by default in global mode
  });

  return (
    <div className="cpd-view-switcher">
      {availableViews.map((view) => (
        <button
          key={view.id}
          className={`cpd-view-btn ${activeView === view.id ? 'active' : ''}`}
          onClick={() => setActiveView(view.id)}
        >
          <div className="cpd-view-thumb">
            <div style={{
               width: '38px', height: '44px',
               backgroundColor: productColor.hex,
               maskImage: mockupImages[view.id] ? `url("${mockupImages[view.id]}")` : 'none',
               WebkitMaskImage: mockupImages[view.id] ? `url("${mockupImages[view.id]}")` : 'none',
               maskSize: 'contain',
               maskRepeat: 'no-repeat',
               maskPosition: 'center',
               position: 'relative'
            }}>
              {mockupImages[view.id] && (
                <img 
                  src={mockupImages[view.id]} 
                  alt={view.id} 
                  style={{
                    width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply'
                  }} 
                />
              )}
            </div>
          </div>
          <span>{getViewLabel(view, categoryId === 'cap', fullConfig)}</span>
        </button>
      ))}

      <div className="cpd-view-divider" />

      <button
        className="cpd-view-btn cpd-zoom-btn"
        onClick={() => setZoom(prev => {
          if (prev === 1.2) return 1.5;
          if (prev === 1.5) return 0.8;
          return 1.2;
        })}
        title={`Zoom: ${zoom === 1.2 ? 'Large' : zoom === 1.5 ? 'Super Zoom' : 'Full View'}`}
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
