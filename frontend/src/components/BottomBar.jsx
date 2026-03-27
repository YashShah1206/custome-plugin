import React, { useContext, useState, useCallback } from 'react';
import { DesignContext, calcPrice } from '../App';
import * as htmlToImage from 'html-to-image';

function PriceModal({ onClose, onAddToCart, price, itemCount }) {
  return (
    <div className="cpd-modal-overlay" onClick={onClose}>
      <div className="cpd-price-modal" onClick={e => e.stopPropagation()}>
        <button className="cpd-modal-close" onClick={onClose}>✕</button>
        <h2>Your Price Breakdown</h2>

        <div className="cpd-price-breakdown">
          <div className="cpd-price-row-item">
            <span>Base Price (1 item)</span>
            <span>$25.00</span>
          </div>
          {itemCount > 5 && itemCount <= 10 && (
            <div className="cpd-price-row-item cpd-price-surcharge">
              <span>Customization surcharge (6–10 items)</span>
              <span>+$5.00</span>
            </div>
          )}
          {itemCount > 10 && (
            <div className="cpd-price-row-item cpd-price-surcharge">
              <span>Customization surcharge (&gt;10 items)</span>
              <span>+$10.00</span>
            </div>
          )}
          <div className="cpd-price-row-item cpd-price-total">
            <span>Total</span>
            <span>${price.toFixed(2)}</span>
          </div>
        </div>

        <div className="cpd-price-items-note">
          {itemCount} customization item{itemCount !== 1 ? 's' : ''} added
          {itemCount <= 5 && <span> — Add more for premium options</span>}
        </div>

        <div className="cpd-price-modal-actions">
          <button className="cpd-add-to-cart-btn" onClick={onAddToCart}>
            🛒 Add to Cart — ${price.toFixed(2)}
          </button>
          <button className="cpd-continue-btn" onClick={onClose}>
            Continue Designing
          </button>
        </div>
      </div>
    </div>
  );
}

function TshirtThumbSmall({ color }) {
  return (
    <svg viewBox="0 0 40 48" width="36" height="36">
      <path
        d="M 8 0 L 0 8 L 5 13 L 8 10 L 8 46 L 32 46 L 32 10 L 35 13 L 40 8 L 32 0 L 26 4 Q 20 7 14 4 Z"
        fill={color}
        stroke="#00000020"
        strokeWidth="0.5"
      />
    </svg>
  );
}

// Helper: wait ms
const wait = (ms) => new Promise(r => setTimeout(r, ms));

export default function BottomBar() {
  const {
    productColor, canvasRef, canvasStates, namesNumbers, namesConfig,
    customizationCount, selectedProduct, screen, setScreen,
    setActiveView, activeView, canvasThumbnails,
  } = useContext(DesignContext);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPriceModal, setShowPriceModal] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const price = calcPrice(customizationCount);

  // Capture a single view as PNG data URL
  const captureView = useCallback(async () => {
    const exportNode = document.querySelector('.cpd-scene-export') || document.querySelector('.cpd-canvas-area');
    if (!exportNode) throw new Error('Could not find canvas area to export.');

    // Discard selection so no bounding boxes show
    if (canvasRef.current) {
      canvasRef.current.discardActiveObject().renderAll();
    }

    // Small delay for 3D render to settle
    await wait(300);

    return htmlToImage.toPng(exportNode, {
      quality: 1,
      pixelRatio: 2,
      filter: (node) => {
        if (node.className && typeof node.className === 'string' && node.className.includes('cpd-print-bounds')) return false;
        return true;
      }
    });
  }, [canvasRef]);

  // Save all 3 views
  const handleSave = async () => {
    if (!canvasRef.current) return;
    setSaving(true);

    try {
      const views = ['front', 'back', 'sleeve'];
      const images = {};
      const originalView = activeView;

      // Save current canvas state
      if (canvasRef.current) {
        canvasRef.current.discardActiveObject().renderAll();
      }

      for (const view of views) {
        // Switch view
        setActiveView(view);
        await wait(600); // Wait for view switch + 3D camera animation

        // Capture
        const dataUrl = await captureView();
        images[view] = dataUrl;
      }

      // Switch back to original view
      setActiveView(originalView);

      const wpData = typeof window !== 'undefined' && window.cpdData;

      if (wpData && wpData.restUrl) {
        // Send all images to WordPress
        const response = await fetch(wpData.restUrl + 'save-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': wpData.nonce,
          },
          body: JSON.stringify({
            images: images,
            product_color: productColor.hex,
            product_name: selectedProduct?.name || 'Custom Product',
            product_type: selectedProduct?.category?.id || 'tshirt',
            names_numbers: { config: namesConfig, entries: namesNumbers },
            total_price: price,
          }),
        });

        const result = await response.json();
        if (result.success) {
          showToast(`✓ Design saved! ${Object.keys(images).length} views captured.`, 'success');
        } else {
          showToast('Failed to save design on server', 'error');
        }
      } else {
        // Standalone mode — download all PNGs
        for (const [view, dataUrl] of Object.entries(images)) {
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `design-${view}-${Date.now()}.png`;
          link.click();
          await wait(200); // Slight delay between downloads
        }
        showToast(`✓ ${Object.keys(images).length} design views downloaded!`, 'success');
      }
    } catch (error) {
      console.error('Save error:', error);
      showToast('Error: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddToCart = async () => {
    setShowPriceModal(false);
    const wpData = typeof window !== 'undefined' && window.cpdData;

    if (wpData && wpData.wcAddToCartUrl) {
      try {
        const canvas = canvasRef.current;
        const dataUrl = canvas ? canvas.toDataURL({ format: 'jpeg', quality: 0.8 }) : '';

        const response = await fetch(wpData.wcAddToCartUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': wpData.nonce,
          },
          body: JSON.stringify({
            product_id: wpData.productId || 0,
            quantity: 1,
            price: price,
            design_thumbnail: dataUrl,
            product_color: productColor.hex,
            product_name: selectedProduct?.name || 'Custom Product',
          }),
        });

        const result = await response.json();
        if (result.success || result.cart_item_key) {
          showToast('✓ Added to cart!', 'success');
          if (wpData.cartUrl) {
            setTimeout(() => { window.location.href = wpData.cartUrl; }, 1500);
          }
        } else {
          showToast('Could not add to cart. Please try again.', 'error');
        }
      } catch (e) {
        showToast('Cart error: ' + e.message, 'error');
      }
    } else {
      handleSave();
      showToast(`✓ Order placed! Total: $${price.toFixed(2)}. We'll contact you shortly.`, 'success');
    }
  };

  return (
    <>
      {showPriceModal && (
        <PriceModal
          price={price}
          itemCount={customizationCount}
          onClose={() => setShowPriceModal(false)}
          onAddToCart={handleAddToCart}
        />
      )}

      <div className="cpd-bottom-bar">
        <div className="cpd-bottom-left">
          <button className="cpd-back-catalog-btn" onClick={() => setScreen('catalog')}>
            ← Products
          </button>

          <div className="cpd-product-info">
            <div className="cpd-product-thumb-small">
              <TshirtThumbSmall color={productColor.hex} />
            </div>
            <div className="cpd-product-meta">
              <h4>
                {selectedProduct?.name || 'Custom T-Shirt'}
                <button
                  className="cpd-change-link"
                  onClick={() => setScreen(selectedProduct ? 'detail' : 'catalog')}
                >
                  Change Product
                </button>
              </h4>
              <p>
                <span className="cpd-color-dot" style={{ backgroundColor: productColor.hex }} />
                {productColor.name}
              </p>
            </div>
          </div>
        </div>

        <div className="cpd-bottom-center">
          <span className="cpd-item-count">
            {customizationCount} item{customizationCount !== 1 ? 's' : ''} added
          </span>
        </div>

        <div className="cpd-bottom-right">
          <button className="cpd-save-btn" onClick={handleSave} disabled={saving}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {saving ? 'Saving All Views...' : 'Save All Views'}
          </button>

          <button className="cpd-price-btn" onClick={() => setShowPriceModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            Get Price — ${price.toFixed(2)}
          </button>
        </div>
      </div>

      {toast && (
        <div className={`cpd-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}
