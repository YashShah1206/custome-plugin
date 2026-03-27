import React, { useContext, useState } from 'react';
import { DesignContext } from '../App';

function ProductDetails() {
  const { productColor, setProductColor, PRODUCT_COLORS, SIZES } = useContext(DesignContext);
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
    <div>
      <div className="cpd-detail-section">
        <div className="cpd-detail-row">
          <span className="cpd-detail-label">Decoration Method:</span>
          <span className="cpd-detail-value">
            <span style={{ color: '#e63946' }}>🎨</span> Printed
          </span>
        </div>
      </div>

      <div className="cpd-detail-section">
        <h4>Product Colors:</h4>
        <div className="cpd-product-colors">
          {PRODUCT_COLORS.map((color) => (
            <button
              key={color.hex}
              className={`cpd-product-color-btn ${productColor.hex === color.hex ? 'active' : ''} ${isLight(color.hex) ? 'light' : 'dark'}`}
              style={{ backgroundColor: color.hex }}
              onClick={() => setProductColor(color)}
              title={color.name}
            />
          ))}
        </div>

        <button
          className="cpd-pick-color-link"
          onClick={() => setShowCustomColor(!showCustomColor)}
        >
          🎨 Pick another color
        </button>

        {showCustomColor && (
          <div className="cpd-custom-color-picker">
            <input
              type="color"
              className="cpd-custom-color-input"
              value={productColor.hex}
              onChange={handleCustomColor}
            />
          </div>
        )}
      </div>

      <div className="cpd-detail-section">
        <div className="cpd-sizes-wrap">
          <h4>
            Sizes Available in:
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: '8px',
              fontWeight: 400,
              fontSize: '13px'
            }}>
              <span style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: productColor.hex,
                border: '1px solid #ccc',
                display: 'inline-block',
              }} />
              {productColor.name}
            </span>
          </h4>
          <div className="cpd-sizes-list" style={{ marginTop: '8px' }}>
            {SIZES.map((size) => (
              <span key={size} className="cpd-size-badge">{size}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetails;
