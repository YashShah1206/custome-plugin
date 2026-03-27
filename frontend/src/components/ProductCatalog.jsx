import React from 'react';

const CATEGORIES = [
  {
    id: 'short-sleeve',
    name: 'Short Sleeve T-Shirts',
    emoji: '👕',
    desc: 'Classic crew neck, everyday comfort',
    colors: ['#e63946','#457b9d','#2d6b3f','#1a1a1a','#ffffff','#6b3fa0'],
  },
  {
    id: 'long-sleeve',
    name: 'Long Sleeve T-Shirts',
    emoji: '🧥',
    desc: 'Full arm coverage, all-season style',
    colors: ['#1b2a4a','#cc2222','#4a4a4a','#ffffff','#2d6b3f','#ff6b1a'],
  },
  {
    id: 'womens',
    name: "Women's T-Shirts",
    emoji: '💜',
    desc: 'Fitted cuts designed for women',
    colors: ['#e88baf','#6b3fa0','#ffffff','#1a1a1a','#e63946','#457b9d'],
  },
  {
    id: 'kids',
    name: "Kids T-Shirts",
    emoji: '🌈',
    desc: 'Soft, durable shirts for little ones',
    colors: ['#c4e20f','#ff6b1a','#e63946','#457b9d','#ffffff','#d4a843'],
  },
  {
    id: 'collar',
    name: 'Collar / Polo Shirts',
    emoji: '👔',
    desc: 'Polo collars, professional look',
    colors: ['#ffffff','#1a1a1a','#1b2a4a','#2d6b3f','#9b9b9b','#cc2222'],
  },
  {
    id: 'round-neck',
    name: 'Round Neck T-Shirts',
    emoji: '⭕',
    desc: 'Standard round neck, most popular cut',
    colors: ['#4a4a4a','#ffffff','#e63946','#2d5dab','#c4e20f','#6b3fa0'],
  },
  {
    id: 'v-neck',
    name: 'V-Neck T-Shirts',
    emoji: '🔻',
    desc: 'V-shaped neckline for a sleek look',
    colors: ['#ffffff','#1a1a1a','#e88baf','#457b9d','#2d6b3f','#d4a843'],
  },
  {
    id: 'mens-shirt',
    name: "Men's Shirts",
    emoji: '👔',
    desc: 'Button-down & dress shirts for men',
    colors: ['#ffffff','#1b2a4a','#6b9bd2','#4a4a4a','#2d6b3f','#cc2222'],
  },
  {
    id: 'womens-shirt',
    name: "Women's Shirts",
    emoji: '👒',
    desc: 'Elegant shirts styled for women',
    colors: ['#e88baf','#ffffff','#6b3fa0','#1a1a1a','#d4a843','#e63946'],
  },
  {
    id: 'hoodie',
    name: 'Hoodies & Sweatshirts',
    emoji: '🧥',
    desc: 'Cozy pullover and zip-up styles',
    colors: ['#4a4a4a','#1a1a1a','#cc2222','#1b2a4a','#ffffff','#6b3fa0'],
  },
  {
    id: 'jacket',
    name: 'Jackets',
    emoji: '🥋',
    desc: 'Full zip, bomber, and varsity jackets',
    colors: ['#1a1a1a','#1b2a4a','#cc2222','#4a4a4a','#2d6b3f','#ffffff'],
  },
  {
    id: 'cap',
    name: 'Caps & Hats',
    emoji: '🧢',
    desc: 'Structured + unstructured, all fits',
    colors: ['#1a1a1a','#1b2a4a','#cc2222','#ffffff','#4a4a4a','#c4e20f'],
  },
];

// Inline SVG product illustrations per category
function ProductIllustration({ category, color = '#e63946' }) {
  if (category === 'cap') {
    return (
      <svg viewBox="0 0 120 80" width="100" height="70">
        <ellipse cx="60" cy="55" rx="55" ry="18" fill={color} stroke="#00000015" strokeWidth="1"/>
        <path d="M 10 55 Q 60 10 110 55 Z" fill={color} stroke="#00000020" strokeWidth="1"/>
        <path d="M 5 57 Q 60 70 115 57" fill="none" stroke="#00000025" strokeWidth="2"/>
        <ellipse cx="60" cy="55" rx="55" ry="5" fill="#00000008"/>
        {/* Brim */}
        <path d="M 5 57 Q 60 75 115 57 L 110 55 Q 60 68 10 55 Z" fill={color} stroke="#00000020" strokeWidth="0.5"/>
        {/* Button on top */}
        <circle cx="60" cy="16" r="4" fill="#00000020"/>
        {/* Sweatband line */}
        <path d="M 10 55 Q 60 52 110 55" fill="none" stroke="#00000015" strokeWidth="1.5"/>
      </svg>
    );
  }
  if (category === 'jacket') {
    return (
      <svg viewBox="0 0 120 130" width="100" height="110">
        <path d="M 25 0 L 5 25 L 20 40 L 25 30 L 25 125 L 95 125 L 95 30 L 100 40 L 115 25 L 95 0 L 80 12 Q 60 22 40 12 Z" fill={color} stroke="#00000015" strokeWidth="1"/>
        {/* Zipper line */}
        <line x1="60" y1="20" x2="60" y2="125" stroke="#00000025" strokeWidth="1.5" strokeDasharray="4,3"/>
        {/* Collar left */}
        <path d="M 40 12 L 25 30 L 52 30 L 60 22 Z" fill="#00000010"/>
        {/* Collar right */}
        <path d="M 80 12 L 95 30 L 68 30 L 60 22 Z" fill="#00000010"/>
        {/* Pocket left */}
        <rect x="30" y="65" width="24" height="16" rx="2" fill="#00000008" stroke="#00000015" strokeWidth="0.8"/>
        {/* Pocket right */}
        <rect x="66" y="65" width="24" height="16" rx="2" fill="#00000008" stroke="#00000015" strokeWidth="0.8"/>
      </svg>
    );
  }
  return (
    // Generic T-shirt / shirt illustration
    <svg viewBox="0 0 120 130" width="100" height="110">
      <path
        d={
          category === 'long-sleeve'
            ? 'M 25 0 L 0 30 L 18 50 L 25 38 L 25 125 L 95 125 L 95 38 L 102 50 L 120 30 L 95 0 L 80 15 Q 60 25 40 15 Z'
            : 'M 30 0 L 5 22 L 20 38 L 30 28 L 30 125 L 90 125 L 90 28 L 100 38 L 115 22 L 90 0 L 78 13 Q 60 22 42 13 Z'
        }
        fill={color}
        stroke="#00000015"
        strokeWidth="1"
      />
      {/* Collar */}
      <path
        d="M 42 13 Q 60 28 78 13 Q 68 22 60 24 Q 52 22 42 13"
        fill="#00000012"
        stroke="none"
      />
      {/* V-neck variant */}
      {category === 'v-neck' && (
        <path d="M 46 15 L 60 40 L 74 15" fill="none" stroke={color} strokeWidth="3"/>
      )}
      {/* Collar/polo */}
      {category === 'collar' && (
        <rect x="46" y="5" width="28" height="12" rx="4" fill="#00000015" stroke="#00000020" strokeWidth="0.5"/>
      )}
      {/* Sleeve shadow */}
      <path
        d={
          category === 'long-sleeve'
            ? 'M 25 0 L 0 30 L 18 50 L 25 38'
            : 'M 30 0 L 5 22 L 20 38 L 30 28'
        }
        fill="#00000008"
      />
      <path
        d={
          category === 'long-sleeve'
            ? 'M 95 0 L 120 30 L 102 50 L 95 38'
            : 'M 90 0 L 115 22 L 100 38 L 90 28'
        }
        fill="#00000008"
      />
      {/* "YOUR DESIGN" placeholder */}
      <text x="60" y="78" textAnchor="middle" fontSize="7" fill="#ffffff40" fontFamily="Arial" fontWeight="bold">YOUR DESIGN</text>
      <text x="60" y="88" textAnchor="middle" fontSize="7" fill="#ffffff40" fontFamily="Arial" fontWeight="bold">HERE</text>
    </svg>
  );
}

export default function ProductCatalog({ onSelectCategory }) {
  return (
    <div className="cpd-catalog">
      {/* Hero */}
      <div className="cpd-catalog-hero">
        <div className="cpd-catalog-hero-content">
          <h1>Make Your Own Custom T-Shirts!</h1>
          <p>Premium custom printing with no minimums. Upload your design and start creating.</p>
          <div className="cpd-catalog-hero-badges">
            <span>✓ No Minimum Order</span>
            <span>✓ Fast Turnaround</span>
            <span>✓ Free Design Help</span>
          </div>
        </div>
        <div className="cpd-catalog-hero-art">
          <div className="cpd-hero-shirt-stack">
            <div className="cpd-hero-shirt" style={{background:'#e63946', transform:'rotate(-8deg) translateX(-20px)'}}>
              <span>YOUR<br/>DESIGN<br/>HERE</span>
            </div>
            <div className="cpd-hero-shirt" style={{background:'#457b9d', transform:'rotate(0deg)'}}>
              <span>YOUR<br/>DESIGN<br/>HERE</span>
            </div>
            <div className="cpd-hero-shirt" style={{background:'#6b3fa0', transform:'rotate(8deg) translateX(20px)'}}>
              <span>YOUR<br/>DESIGN<br/>HERE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <div className="cpd-catalog-section">
        <h2>Choose Your Product Type</h2>
        <p className="cpd-catalog-subtitle">Select a category to browse styles and start designing</p>
        <div className="cpd-catalog-grid">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="cpd-catalog-card"
              onClick={() => onSelectCategory(cat)}
            >
              <div className="cpd-catalog-card-img">
                <ProductIllustration category={cat.id} color={cat.colors[0]} />
                <div className="cpd-catalog-card-colors">
                  {cat.colors.slice(0, 5).map((c, i) => (
                    <span key={i} className="cpd-cat-color-dot" style={{ background: c }} />
                  ))}
                  <span className="cpd-cat-more">+50</span>
                </div>
              </div>
              <div className="cpd-catalog-card-info">
                <h3>{cat.name}</h3>
                <p>{cat.desc}</p>
                <span className="cpd-catalog-card-link">Shop All →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
