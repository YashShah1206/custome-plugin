import React, { useState } from 'react';

// Generate product variants for each category
function generateProducts(category) {
  const baseProducts = {
    'short-sleeve': [
      { id: 'ss-1', name: 'Gildan Softstyle Jersey T-Shirt', brand: 'Gildan', price: 8.60, rating: 4.5, reviews: 10000, badge: 'Best Seller', colors: ['#e63946','#1a1a1a','#ffffff','#1b2a4a','#2d5dab','#2d6b3f','#cc2222','#4a4a4a','#9b9b9b','#d4a843','#e88baf','#6b3fa0','#ff6b1a','#c4e20f'] },
      { id: 'ss-2', name: 'Bella + Canvas Jersey T-Shirt', brand: 'Bella Canvas', price: 11.95, rating: 4.5, reviews: 10000, badge: 'Top Rated', colors: ['#457b9d','#e63946','#1a1a1a','#ffffff','#c4e20f','#6b3fa0','#2d6b3f','#ff6b1a','#cc2222','#d4a843'] },
      { id: 'ss-3', name: 'Comfort Colors 100% Cotton Tee', brand: 'Comfort Colors', price: 13.90, rating: 4.7, reviews: 10000, badge: 'Staff Pick', colors: ['#9b9b9b','#4a4a4a','#1a1a1a','#e88baf','#cc2222','#ffffff','#d4a843','#2d6b3f'] },
      { id: 'ss-4', name: 'Next Level Premium Jersey Tee', brand: 'Next Level', price: 10.25, rating: 4.4, reviews: 5000, colors: ['#ffffff','#1a1a1a','#1b2a4a','#e63946','#6b3fa0','#2d6b3f','#ff6b1a'] },
      { id: 'ss-5', name: 'Port & Company Essential Tee', brand: 'Port & Company', price: 7.40, rating: 4.2, reviews: 3000, badge: 'Budget Pick', colors: ['#4a4a4a','#1a1a1a','#cc2222','#1b2a4a','#2d6b3f','#ffffff'] },
      { id: 'ss-6', name: 'Hanes Tagless ComfortSoft Tee', brand: 'Hanes', price: 6.80, rating: 4.1, reviews: 8000, colors: ['#ffffff','#9b9b9b','#1a1a1a','#1b2a4a','#cc2222'] },
    ],
    'long-sleeve': [
      { id: 'ls-1', name: 'Gildan Long Sleeve T-Shirt', brand: 'Gildan', price: 10.50, rating: 4.5, reviews: 6000, badge: 'Best Seller', colors: ['#1b2a4a','#1a1a1a','#cc2222','#4a4a4a','#ffffff','#2d6b3f'] },
      { id: 'ls-2', name: 'Bella Long Sleeve Jersey Tee', brand: 'Bella Canvas', price: 14.20, rating: 4.6, reviews: 4000, badge: 'Top Rated', colors: ['#e63946','#1a1a1a','#ffffff','#2d6b3f','#6b3fa0'] },
      { id: 'ls-3', name: 'Next Level Cotton Long Sleeve', brand: 'Next Level', price: 12.80, rating: 4.3, reviews: 2000, colors: ['#ffffff','#1a1a1a','#457b9d','#cc2222'] },
      { id: 'ls-4', name: 'Port & Company LS Essential', brand: 'Port & Company', price: 9.20, rating: 4.1, reviews: 1500, colors: ['#4a4a4a','#1b2a4a','#cc2222','#ffffff'] },
    ],
    'womens': [
      { id: 'w-1', name: "Women's Fitted Crew Neck Tee", brand: 'Bella Canvas', price: 11.50, rating: 4.6, reviews: 7000, badge: 'Best Seller', colors: ['#e88baf','#6b3fa0','#ffffff','#1a1a1a','#e63946','#457b9d'] },
      { id: 'w-2', name: "Women's Relaxed Jersey Tee", brand: 'Next Level', price: 13.20, rating: 4.5, reviews: 4000, badge: 'Top Rated', colors: ['#ffffff','#1a1a1a','#e88baf','#d4a843','#2d6b3f'] },
      { id: 'w-3', name: "Women's Tri-Blend V-Neck", brand: 'Next Level', price: 15.60, rating: 4.7, reviews: 3000, badge: 'Staff Pick', colors: ['#6b3fa0','#e88baf','#1a1a1a','#ffffff','#457b9d'] },
      { id: 'w-4', name: "Women's Flowy Dolman Tee", brand: 'Bella Canvas', price: 17.40, rating: 4.4, reviews: 2000, colors: ['#e88baf','#ffffff','#6b3fa0','#1a1a1a'] },
    ],
    'kids': [
      { id: 'k-1', name: "Gildan Youth Cotton Tee", brand: 'Gildan', price: 6.50, rating: 4.4, reviews: 5000, badge: 'Best Seller', colors: ['#c4e20f','#ff6b1a','#e63946','#457b9d','#ffffff','#1a1a1a'] },
      { id: 'k-2', name: "Bella Youth Jersey Tee", brand: 'Bella Canvas', price: 8.90, rating: 4.5, reviews: 3000, badge: 'Top Rated', colors: ['#e63946','#457b9d','#c4e20f','#ffffff','#6b3fa0'] },
      { id: 'k-3', name: "Hanes Kids EcoSmart Tee", brand: 'Hanes', price: 5.80, rating: 4.2, reviews: 4000, colors: ['#ffffff','#1a1a1a','#cc2222','#1b2a4a','#c4e20f'] },
    ],
    'collar': [
      { id: 'p-1', name: "Sport-Tek Micropique Performance Polo", brand: 'Sport-Tek', price: 18.50, rating: 4.6, reviews: 4000, badge: 'Best Seller', colors: ['#ffffff','#1a1a1a','#1b2a4a','#2d6b3f','#cc2222'] },
      { id: 'p-2', name: "Port Authority Classic Polo", brand: 'Port Authority', price: 15.20, rating: 4.4, reviews: 3000, colors: ['#1b2a4a','#ffffff','#cc2222','#4a4a4a','#2d6b3f'] },
      { id: 'p-3', name: "Gildan Premium Cotton Polo", brand: 'Gildan', price: 12.80, rating: 4.3, reviews: 2500, colors: ['#ffffff','#1a1a1a','#2d5dab','#cc2222'] },
    ],
    'round-neck': [
      { id: 'rn-1', name: "Unisex Round Neck Heavy Cotton", brand: 'Gildan', price: 9.20, rating: 4.5, reviews: 8000, badge: 'Best Seller', colors: ['#4a4a4a','#ffffff','#e63946','#2d5dab','#c4e20f','#6b3fa0'] },
      { id: 'rn-2', name: "Bella Unisex Jersey Crew Neck", brand: 'Bella Canvas', price: 12.40, rating: 4.6, reviews: 5000, badge: 'Top Rated', colors: ['#1a1a1a','#ffffff','#457b9d','#e88baf','#d4a843'] },
    ],
    'v-neck': [
      { id: 'vn-1', name: "Bella V-Neck Jersey Tee", brand: 'Bella Canvas', price: 12.80, rating: 4.5, reviews: 5000, badge: 'Best Seller', colors: ['#ffffff','#1a1a1a','#e88baf','#457b9d','#2d6b3f','#d4a843'] },
      { id: 'vn-2', name: "Next Level V-Neck Premium", brand: 'Next Level', price: 11.50, rating: 4.4, reviews: 3000, badge: 'Top Rated', colors: ['#1a1a1a','#ffffff','#e63946','#6b3fa0','#457b9d'] },
    ],
    'mens-shirt': [
      { id: 'ms-1', name: "Men's Oxford Dress Shirt", brand: 'Port Authority', price: 24.50, rating: 4.4, reviews: 2000, badge: 'Best Seller', colors: ['#ffffff','#1b2a4a','#6b9bd2','#4a4a4a'] },
      { id: 'ms-2', name: "Men's Poplin Easy-Care Shirt", brand: 'Devon & Jones', price: 28.90, rating: 4.5, reviews: 1500, badge: 'Top Rated', colors: ['#ffffff','#1b2a4a','#2d6b3f','#cc2222'] },
    ],
    'womens-shirt': [
      { id: 'ws-1', name: "Women's Stretch Oxford Shirt", brand: 'Port Authority', price: 26.50, rating: 4.5, reviews: 2000, badge: 'Best Seller', colors: ['#e88baf','#ffffff','#6b3fa0','#1a1a1a','#d4a843'] },
      { id: 'ws-2', name: "Women's Easy-Care Tunic", brand: 'Devon & Jones', price: 29.80, rating: 4.4, reviews: 1200, colors: ['#ffffff','#1a1a1a','#e88baf','#457b9d'] },
    ],
    'hoodie': [
      { id: 'h-1', name: "Gildan Heavy Blend Hoodie", brand: 'Gildan', price: 16.80, rating: 4.5, reviews: 8000, badge: 'Best Seller', colors: ['#4a4a4a','#1a1a1a','#cc2222','#1b2a4a','#ffffff','#6b3fa0'] },
      { id: 'h-2', name: "Independent Trading Zip Hoodie", brand: 'Independent Trading', price: 22.50, rating: 4.6, reviews: 3000, badge: 'Top Rated', colors: ['#1a1a1a','#4a4a4a','#cc2222','#1b2a4a'] },
    ],
    'jacket': [
      { id: 'j-1', name: "Port Authority Essential Jacket", brand: 'Port Authority', price: 32.80, rating: 4.4, reviews: 2000, badge: 'Best Seller', colors: ['#1a1a1a','#1b2a4a','#cc2222','#4a4a4a'] },
      { id: 'j-2', name: "Sport-Tek Water-Resistant Jacket", brand: 'Sport-Tek', price: 28.50, rating: 4.5, reviews: 1500, badge: 'Top Rated', colors: ['#1b2a4a','#1a1a1a','#cc2222','#2d6b3f'] },
    ],
    'cap': [
      { id: 'c-1', name: "Yupoong Classic Snapback Cap", brand: 'Yupoong', price: 12.80, rating: 4.5, reviews: 5000, badge: 'Best Seller', colors: ['#1a1a1a','#1b2a4a','#cc2222','#ffffff','#4a4a4a','#c4e20f'] },
      { id: 'c-2', name: "Otto Wooly Comfy Low-Profile Cap", brand: 'Otto', price: 9.50, rating: 4.4, reviews: 3000, badge: 'Top Rated', colors: ['#1a1a1a','#cc2222','#1b2a4a','#2d6b3f','#ffffff'] },
      { id: 'c-3', name: "Port Authority Sandwich Bill Cap", brand: 'Port Authority', price: 10.80, rating: 4.3, reviews: 2000, colors: ['#1b2a4a','#1a1a1a','#cc2222','#ffffff'] },
    ],
  };
  return baseProducts[category.id] || baseProducts['short-sleeve'];
}

const FILTER_COLORS = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'Navy', hex: '#1b2a4a' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Grey', hex: '#9b9b9b' },
  { name: 'Green', hex: '#2d6b3f' },
  { name: 'Red', hex: '#cc2222' },
  { name: 'Pink', hex: '#e88baf' },
  { name: 'Purple', hex: '#6b3fa0' },
  { name: 'Yellow', hex: '#c4e20f' },
  { name: 'Orange', hex: '#ff6b1a' },
  { name: 'Blue', hex: '#457b9d' },
  { name: 'Gold', hex: '#d4a843' },
];

function TshirtMini({ color, category }) {
  return (
    <svg viewBox="0 0 120 130" width="100%" height="100%">
      <path
        d="M 30 0 L 5 22 L 20 38 L 30 28 L 30 125 L 90 125 L 90 28 L 100 38 L 115 22 L 90 0 L 78 13 Q 60 22 42 13 Z"
        fill={color}
        stroke="#00000018"
        strokeWidth="1"
      />
      <path d="M 42 13 Q 60 28 78 13 Q 68 22 60 24 Q 52 22 42 13" fill="#00000012"/>
      <text x="60" y="72" textAnchor="middle" fontSize="9" fill="#ffffff50" fontWeight="bold" fontFamily="Arial">YOUR</text>
      <text x="60" y="83" textAnchor="middle" fontSize="9" fill="#ffffff50" fontWeight="bold" fontFamily="Arial">DESIGN</text>
      <text x="60" y="94" textAnchor="middle" fontSize="9" fill="#ffffff50" fontWeight="bold" fontFamily="Arial">HERE</text>
    </svg>
  );
}

function StarRating({ rating }) {
  return (
    <div className="cpd-stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{color: i <= Math.round(rating) ? '#f4a261' : '#ddd', fontSize:'14px'}}>★</span>
      ))}
      <span style={{fontSize:'12px',color:'#666',marginLeft:'4px'}}>{rating}</span>
    </div>
  );
}

export default function ProductList({ category, onSelectProduct, onBack }) {
  const [sortBy, setSortBy] = useState('recommended');
  const products = generateProducts(category);

  // Implement Sorting Logic
  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0; // Default: Recommended (array order)
  });

  return (
    <div className="cpd-product-list">
      {/* Breadcrumb */}
      <div className="cpd-breadcrumb">
        <button onClick={onBack}>All Products</button>
        <span> › </span>
        <span>{category.name}</span>
      </div>

      <div className="cpd-list-layout">
        {/* Product grid — now taking full width */}
        <main className="cpd-list-main">
          <div className="cpd-list-header">
            <h1>Custom {category.name}</h1>
            <p>{sortedProducts.length} items</p>
            <div className="cpd-sort-row">
              <label>Sort By:</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="recommended">Recommended</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

          <div className="cpd-product-grid">
            {sortedProducts.map(product => (
              <div
                key={product.id}
                className="cpd-product-card"
                onClick={() => onSelectProduct(product, category)}
              >
                {product.badge && (
                  <span className={`cpd-product-badge cpd-badge-${product.badge.replace(' ','-').toLowerCase()}`}>
                    {product.badge}
                  </span>
                )}
                <div className="cpd-product-card-img">
                  <TshirtMini color={product.colors[0]} category={category.id} />
                </div>
                <div className="cpd-product-card-swatches">
                  {product.colors.slice(0, 8).map((c, i) => (
                    <span key={i} className="cpd-swatch-dot" style={{ background: c, border: c === '#ffffff' ? '1px solid #ddd' : 'none' }} />
                  ))}
                  {product.colors.length > 8 && (
                    <span className="cpd-swatch-more">+{product.colors.length - 8}</span>
                  )}
                </div>
                <div className="cpd-product-card-info">
                  <h4>{product.name}</h4>
                  <StarRating rating={product.rating} />
                  <p className="cpd-product-card-reviews">({product.reviews.toLocaleString()}+ ratings)</p>
                  <p className="cpd-product-card-price">
                    <strong>${Number(product.price).toFixed(2)}/ea</strong>
                    <span> for 500 items</span>
                  </p>
                  <p className="cpd-product-no-min">No Minimum</p>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
