import React, { useContext, useState } from 'react';
import { DesignContext, PRINT_AREAS } from '../App';
import { fabric } from 'fabric';
import { artCategories } from '../data/artworks';

function ArtPanel() {
  const { canvasRef, activeView, saveToHistory, incrementCustomizationCount } = useContext(DesignContext);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const addArtToCanvas = (svgString, name) => {
    if (!canvasRef.current) return;
    const area = PRINT_AREAS[activeView] || PRINT_AREAS.front;
    const centerX = area.left + area.width / 2;
    const centerY = area.top + area.height / 2;

    fabric.loadSVGFromString(svgString, (objects, options) => {
      const svgObj = fabric.util.groupSVGElements(objects, options);
      const maxSize = Math.min(area.width * 0.5, area.height * 0.4);
      const scale = Math.min(maxSize / svgObj.width, maxSize / svgObj.height, 1);

      svgObj.set({
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
      canvasRef.current.add(svgObj);
      canvasRef.current.setActiveObject(svgObj);
      canvasRef.current.renderAll();
      incrementCustomizationCount?.();
    });
  };

  const filteredCategories = searchQuery
    ? artCategories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : artCategories;

  const allFilteredItems = searchQuery
    ? artCategories.flatMap(cat =>
        cat.items.filter(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : [];

  return (
    <div>
      <input
        type="text"
        className="cpd-art-search"
        placeholder="Search For Artwork"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          if (e.target.value) setSelectedCategory(null);
        }}
      />

      {!selectedCategory && !searchQuery && (
        <div className="cpd-art-categories">
          {artCategories.map((cat) => (
            <div
              key={cat.id}
              className="cpd-art-category"
              onClick={() => setSelectedCategory(cat)}
            >
              <span dangerouslySetInnerHTML={{ __html: cat.icon }} />
              <span>{cat.name}</span>
            </div>
          ))}
        </div>
      )}

      {searchQuery && allFilteredItems.length > 0 && (
        <div className="cpd-art-items">
          {allFilteredItems.map((item, idx) => (
            <div
              key={idx}
              className="cpd-art-item"
              onClick={() => addArtToCanvas(item.svg, item.name)}
              title={item.name}
            >
              <span dangerouslySetInnerHTML={{ __html: item.svg }} />
            </div>
          ))}
        </div>
      )}

      {selectedCategory && (
        <div>
          <button
            style={{
              background: 'none', border: 'none', color: '#4361ee',
              cursor: 'pointer', marginBottom: '12px', fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
            }}
            onClick={() => setSelectedCategory(null)}
          >
            ← Back to Categories
          </button>
          <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#333' }}>
            {selectedCategory.name}
          </h4>
          <div className="cpd-art-items">
            {selectedCategory.items.map((item, idx) => (
              <div
                key={idx}
                className="cpd-art-item"
                onClick={() => addArtToCanvas(item.svg, item.name)}
                title={item.name}
              >
                <span dangerouslySetInnerHTML={{ __html: item.svg }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ArtPanel;
