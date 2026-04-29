import React, { useContext, useState } from 'react';
import { DesignContext } from '../App';
import { fabric } from 'fabric';
import { artCategories } from '../data/artworks';

const CANVAS_WIDTH  = 1200;
const CANVAS_HEIGHT = 1440;

function ArtPanel() {
  const { canvasRef, activeView, saveToHistory, incrementCustomizationCount, artLibrary, showDefaultArt, PRINT_AREAS } = useContext(DesignContext);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredArt, setHoveredArt] = useState(null);

  const addArtToCanvas = (artItem, categoryName) => {
    if (!canvasRef.current) return;
    const areaRaw = PRINT_AREAS[activeView] || PRINT_AREAS.front;
    const area = Array.isArray(areaRaw) ? areaRaw[0] : areaRaw;
    if (!area) return;

    // Convert ratio-based PRINT_AREAS to pixel coordinates
    const areaLeftPx   = area.left   * CANVAS_WIDTH;
    const areaTopPx    = area.top    * CANVAS_HEIGHT;
    const areaWidthPx  = area.width  * CANVAS_WIDTH;
    const areaHeightPx = area.height * CANVAS_HEIGHT;

    const centerX = areaLeftPx + areaWidthPx  / 2;
    const centerY = areaTopPx  + areaHeightPx / 2;

    const onComplete = (obj) => {
      const maxSize = Math.min(areaWidthPx * 0.5, areaHeightPx * 0.4);
      const scale = Math.min(maxSize / obj.width, maxSize / obj.height, 1);

      obj.set({
        scaleX: scale,
        scaleY: scale,
        left: centerX,
        top: centerY,
        originX: 'center',
        originY: 'center',
        cornerStyle: 'circle',
        cornerColor: '#4361ee',
        cornerSize: 12,
        transparentCorners: false,
        borderColor: '#4361ee',
        hasControls: true,
        hasBorders: true,
        data: { type: 'artwork', artName: artItem.name, artCategory: categoryName || '' },
      });
      canvasRef.current.add(obj);
      canvasRef.current.setActiveObject(obj);
      canvasRef.current.renderAll();
      incrementCustomizationCount?.();
      saveToHistory();
    };

    if (artItem.svg) {
      fabric.loadSVGFromString(artItem.svg, (objects, options) => {
        const svgObj = fabric.util.groupSVGElements(objects, options);
        onComplete(svgObj);
      });
    } else if (artItem.url) {
      fabric.Image.fromURL(artItem.url, (img) => {
        onComplete(img);
      }, { crossOrigin: 'anonymous' });
    }
  };

  const combinedCategories = [
    ...(showDefaultArt ? artCategories : []),
    ...artLibrary
  ];

  const filteredCategories = searchQuery
    ? combinedCategories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : combinedCategories;

  const allFilteredItems = searchQuery
    ? combinedCategories.flatMap(cat =>
        cat.items.filter(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(item => ({ ...item, _categoryName: cat.name }))
      )
    : [];

  return (
    <div style={{ position: 'relative' }}>
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
          {filteredCategories.map((cat) => (
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
              onMouseEnter={() => setHoveredArt(item.name)}
              onMouseLeave={() => setHoveredArt(null)}
              onClick={() => addArtToCanvas(item, item._categoryName || '')}
              title={item.name}
            >
              {item.svg ? (
                <span dangerouslySetInnerHTML={{ __html: item.svg }} />
              ) : (
                <img src={item.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              )}
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
                onMouseEnter={() => setHoveredArt(item.name)}
                onMouseLeave={() => setHoveredArt(null)}
                onClick={() => addArtToCanvas(item, selectedCategory.name)}
                title={item.name}
              >
                {item.svg ? (
                  <span dangerouslySetInnerHTML={{ __html: item.svg }} />
                ) : (
                  <img src={item.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {hoveredArt && (
        <div className="cpd-art-hover-label">
          {hoveredArt}
        </div>
      )}
    </div>
  );
}

export default ArtPanel;
