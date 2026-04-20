import React, { useContext, useState } from 'react';
import { DesignContext } from '../App';

function ProductDetails() {
  const { productColor, setProductColor, PRODUCT_COLORS, SIZES, sizesQuantities, setSizesQuantities } = useContext(DesignContext);
  const [showCustomColor, setShowCustomColor] = useState(false);

  const isLight = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  };

  const handleCustomColor = (e) => {
    const hex = e.target.value;
    setProductColor({ name: 'Custom', hex });
  };

  return (
    <div className="cpd-product-details-inner">
      <div className="cpd-detail-section">
        <label>Selected Product Color</label>
        <div className="cpd-color-name-badge">
          <span className="cpd-color-dot" style={{ backgroundColor: productColor.hex }} />
          <strong>{productColor.name}</strong>
        </div>
        
        <div className="cpd-product-colors">
          {PRODUCT_COLORS.map((color) => (
            <button
              key={color.hex}
              className={`cpd-product-color-btn ${productColor.hex === color.hex ? 'active' : ''}`}
              style={{ backgroundColor: color.hex }}
              onClick={() => setProductColor(color)}
              title={color.name}
            />
          ))}
          <button
            className={`cpd-product-color-btn cpd-btn-custom ${showCustomColor ? 'active' : ''}`}
            onClick={() => setShowCustomColor(!showCustomColor)}
            title="Custom Color"
          >
            +
          </button>
        </div>

        {showCustomColor && (
          <div className="cpd-custom-color-picker-wrap">
            <input
              type="color"
              className="cpd-custom-color-input"
              value={productColor.hex}
              onChange={handleCustomColor}
            />
            <span>Pick Custom Hex</span>
          </div>
        )}
      </div>

      <div className="cpd-detail-section">
        <label>Select Sizes & Quantities</label>
        <div className="cpd-sizes-matrix">
          {SIZES.map((size) => {
             const qty = sizesQuantities[size] || '';
             return (
               <div key={size} className="cpd-size-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '10px' }}>
                 <span className="cpd-size-pill" style={{ width: '40px', textAlign: 'center' }}>{size}</span>
                 <input 
                   type="number" 
                   min="0" 
                   placeholder="Qty" 
                   value={qty}
                   onChange={(e) => {
                     const val = parseInt(e.target.value) || 0;
                     const newSizes = { ...sizesQuantities };
                     if (val > 0) newSizes[size] = val;
                     else delete newSizes[size];
                     setSizesQuantities(newSizes);
                   }}
                   style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
                 />
               </div>
             );
          })}
        </div>
      </div>

      <div className="cpd-detail-section">
        <label>Decoration Method</label>
        <div className="cpd-decoration-method">
           <span>🖨️</span>
           <strong>Printed (DTG / Screen)</strong>
        </div>
      </div>
    </div>
  );
}

export default ProductDetails;
