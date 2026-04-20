import React, { useState } from 'react';

const VIEWS = ['front', 'back', 'rightSleeve', 'leftSleeve'];

function ViewLabel(v) {
  return { front: 'Front', back: 'Back', rightSleeve: 'R. Sleeve', leftSleeve: 'L. Sleeve' }[v] || v;
}

// Realistic product SVG for detail view
function ProductView({ product, category, color, view }) {
  if (category && category.id === 'cap') {
    return (
      <svg viewBox="0 0 300 200" width="100%" height="100%">
        <ellipse cx="150" cy="140" rx="140" ry="40" fill={color} stroke="#00000015" strokeWidth="2"/>
        <path d="M 15 140 Q 150 50 285 140 Z" fill={color} stroke="#00000020" strokeWidth="2"/>
        {/* Panel seams */}
        <path d="M 150 55 Q 150 140 150 140" stroke="#00000020" strokeWidth="1.5"/>
        <path d="M 90 65 Q 120 140 150 140" stroke="#00000010" strokeWidth="1"/>
        <path d="M 210 65 Q 180 140 150 140" stroke="#00000010" strokeWidth="1"/>
        {/* Brim */}
        <path d="M 10 142 Q 150 180 290 142 L 285 140 Q 150 172 15 140 Z" fill={color} stroke="#00000020" strokeWidth="0.8"/>
        <ellipse cx="150" cy="57" rx="8" ry="8" fill="#00000018"/>
        {/* Design area */}
        {view === 'front' && <rect x="108" y="80" width="84" height="48" rx="4" fill="transparent" stroke="#4361ee" strokeWidth="2" strokeDasharray="5,3" opacity="0.7"/>}
      </svg>
    );
  }

  const isLong = category && category.id === 'long-sleeve';
  const isVneck = category && category.id === 'v-neck';
  const isCollar = category && category.id === 'collar';

  const bodyPath = isLong
    ? 'M 60 5 L 5 65 L 45 105 L 60 80 L 60 295 L 240 295 L 240 80 L 255 105 L 295 65 L 240 5 L 195 30 Q 150 55 105 30 Z'
    : 'M 65 5 L 10 55 L 48 95 L 65 72 L 65 295 L 235 295 L 235 72 L 252 95 L 290 55 L 235 5 L 195 32 Q 150 55 105 32 Z';

  const sleeveL = isLong
    ? 'M 60 5 L 5 65 L 45 105 L 60 80'
    : 'M 65 5 L 10 55 L 48 95 L 65 72';

  const sleeveR = isLong
    ? 'M 240 5 L 295 65 L 255 105 L 240 80'
    : 'M 235 5 L 290 55 L 252 95 L 235 72';

  // Print area per view
  const printAreas = {
    front:       { x: 95,  y: 110, w: 110, h: 120 },
    back:        { x: 95,  y: 110, w: 110, h: 120 },
    rightSleeve: { x: 22,  y: 28,  w: 38,  h: 60  },
    leftSleeve:  { x: 240, y: 28,  w: 38,  h: 60  },
  };
  const pa = printAreas[view] || printAreas.front;

  return (
    <svg viewBox="0 0 300 310" width="100%" height="100%">
      <defs>
        <filter id="product-shadow">
          <feDropShadow dx="2" dy="4" stdDeviation="6" floodOpacity="0.15"/>
        </filter>
        <linearGradient id={`body-grad-${view}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.82"/>
        </linearGradient>
      </defs>

      {/* Main body */}
      <path d={bodyPath} fill={`url(#body-grad-${view})`} stroke="#00000018" strokeWidth="1.5" filter="url(#product-shadow)"/>

      {/* Sleeve highlights */}
      <path d={sleeveL} fill="#00000007" stroke="none"/>
      <path d={sleeveR} fill="#00000007" stroke="none"/>

      {/* Collar */}
      {isVneck ? (
        <path
          d="M 105 32 L 150 85 L 195 32 Q 172 48 150 52 Q 128 48 105 32"
          fill="#00000012" stroke="none"
        />
      ) : isCollar ? (
        <>
          <path d="M 113 32 L 105 32 Q 150 75 195 32 L 187 32 Q 150 62 113 32" fill="#00000015"/>
          <rect x="118" y="8" width="64" height="26" rx="8" fill="#00000012" stroke="#00000020" strokeWidth="0.8"/>
        </>
      ) : (
        <path
          d="M 105 32 Q 150 62 195 32 Q 172 48 150 54 Q 128 48 105 32"
          fill="#00000012" stroke="none"
        />
      )}

      {/* Back seam indicator */}
      {view === 'back' && (
        <line x1="150" y1="38" x2="150" y2="290" stroke="#00000012" strokeWidth="1.5"/>
      )}

      {/* Print area border */}
      <rect
        x={pa.x} y={pa.y} width={pa.w} height={pa.h}
        rx="4"
        fill="transparent"
        stroke="#4361ee"
        strokeWidth="2"
        strokeDasharray="8,4"
        opacity="0.8"
      />
      <text x={pa.x + pa.w / 2} y={pa.y + pa.h / 2 - 4} textAnchor="middle" fontSize="9" fill="#4361ee" opacity="0.7" fontFamily="Inter,sans-serif">PRINT AREA</text>
    </svg>
  );
}

export default function ProductDetail({ product, category, onStartDesigning, onBack }) {
  const [activeView, setActiveView] = useState('front');
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [qty, setQty] = useState(1);

  return (
    <div className="cpd-product-detail">
      {/* Breadcrumb */}
      <div className="cpd-breadcrumb">
        <button onClick={() => onBack('catalog')}>All Products</button>
        <span> › </span>
        <button onClick={() => onBack('list')}>{category.name}</button>
        <span> › </span>
        <span>{product.name}</span>
      </div>

      <div className="cpd-detail-layout">
        {/* Left: Image gallery */}
        <div className="cpd-detail-gallery">
          {/* Thumbnails */}
          <div className="cpd-detail-thumbs">
            {VIEWS.map(v => (
              <button
                key={v}
                className={`cpd-detail-thumb ${activeView === v ? 'active' : ''}`}
                onClick={() => setActiveView(v)}
              >
                <div className="cpd-detail-thumb-img">
                  <ProductView product={product} category={category} color={selectedColor} view={v} />
                </div>
                <span>{ViewLabel(v)}</span>
              </button>
            ))}
          </div>

          {/* Main image */}
          <div className="cpd-detail-main-img">
            <ProductView product={product} category={category} color={selectedColor} view={activeView} />
            <div className="cpd-detail-view-label">{ViewLabel(activeView)} View</div>
          </div>
        </div>

        {/* Right: Product info */}
        <div className="cpd-detail-info">
          <h1 className="cpd-detail-title">{product.name}</h1>

          <div className="cpd-detail-meta">
            <div className="cpd-stars-row">
              {[1,2,3,4,5].map(i => (
                <span key={i} style={{color: i <= Math.round(product.rating) ? '#f4a261':'#ddd', fontSize:'18px'}}>★</span>
              ))}
              <span className="cpd-detail-rating">{product.rating}</span>
              <span className="cpd-detail-reviews">({(product.reviews||5000).toLocaleString()}+ ratings)</span>
            </div>
          </div>

          {/* Removed delivery badges as per request */}

          <div className="cpd-detail-section">
            <h3>Decoration:</h3>
            <button className="cpd-detail-decoration-btn">🖨 Printing</button>
          </div>

          <div className="cpd-detail-section">
            <h3>Colors: <span className="cpd-detail-color-name">{selectedColor}</span></h3>
            <div className="cpd-detail-colors">
              {product.colors.map((c, i) => (
                <button
                  key={i}
                  className={`cpd-detail-color-btn ${selectedColor === c ? 'active' : ''}`}
                  style={{ background: c, border: c === '#ffffff' ? '2px solid #ddd' : '2px solid transparent' }}
                  onClick={() => setSelectedColor(c)}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="cpd-detail-section">
            <h3>Sizes: YS – 5XL</h3>
            <p className="cpd-detail-min">Minimum Quantity: 1</p>
          </div>

          <div className="cpd-detail-section">
            <h3>Quantity:</h3>
            <div className="cpd-qty-row">
              <button onClick={() => setQty(q => Math.max(1, q-1))}>−</button>
              <span>{qty}</span>
              <button onClick={() => setQty(q => q+1)}>+</button>
            </div>
          </div>

          <div className="cpd-detail-price-row">
            <span className="cpd-detail-price">${Number(product.price).toFixed(2)}</span>
            <span className="cpd-detail-price-label">/ea for {qty} item{qty>1?'s':''}</span>
          </div>

          <button
            className="cpd-start-designing-btn"
            onClick={() => onStartDesigning(product, category, selectedColor)}
          >
            Start Designing ›
          </button>

          <div className="cpd-detail-desc">
            <h3>About this product</h3>
            <p>
              The <strong>{product.name}</strong> is a premium quality garment from <strong>{product.brand}</strong>.
              Perfect for custom printing with vibrant, long-lasting colors. Available in {product.colors.length} colors
              and multiple sizes. No minimum order required — order as few as 1 or as many as you need.
            </p>
            <ul>
              <li>✓ High-quality fabric, soft to touch</li>
              <li>✓ Pre-shrunk for accurate sizing</li>
              <li>✓ Double-needle stitching throughout</li>
              <li>✓ Tear-away label for comfort</li>
              <li>✓ Compatible with screen print, DTG, embroidery</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
