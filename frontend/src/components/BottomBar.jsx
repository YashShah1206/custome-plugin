import React, { useContext, useState, useCallback } from 'react';
import { DesignContext, calcPrice } from '../App';
import * as htmlToImage from 'html-to-image';

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

/**
 * Extract design metadata from a specific canvas instance for a specific view.
 */
function extractViewMetadata(canvas, viewKey, results, fontsSet, imagesSet) {
  if (!canvas || !results.views[viewKey]) return;
  // Adjusted for 1200px base width (Original 0.145 * 500 / 1200)
  const cmRatio = 0.0604;

  const objects = canvas.getObjects();
  const handledObjects = new Set();

  objects.forEach(obj => {
    // 1. Artwork check (Priority - can be group, image, or path)
    if (obj.data?.type === 'artwork' && obj.data?.artName) {
      const iconName = obj.data.artName.includes('(') ? obj.data.artName : `${obj.data.artCategory || 'Artwork'} (${obj.data.artName})`;
      results.views[viewKey].art.push({
        name: iconName,
        category: obj.data.artCategory || '',
        dimensions: `${(obj.width * obj.scaleX * cmRatio).toFixed(1)}cm x ${(obj.height * obj.scaleY * cmRatio).toFixed(1)}cm`,
      });
      handledObjects.add(obj);
    }

    // 2. Text objects
    else if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
      if (obj.fontFamily) fontsSet.add(obj.fontFamily);
      const textContent = obj.text || '';
      if (textContent.trim()) {
        const itemType = obj.data?.type || 'text';
        results.views[viewKey].text.push({
          font: obj.fontFamily || 'Inter',
          text: textContent,
          fontSize: obj.fontSize || 30,
          color: obj.fill || '#ffffff',
          dimensions: `${(obj.width * obj.scaleX * cmRatio).toFixed(1)}cm x ${(obj.height * obj.scaleY * cmRatio).toFixed(1)}cm`,
          type: itemType,
        });
        handledObjects.add(obj);
      }
    }

    // 3. Groups (Curved Text, Icons)
    else if (obj.type === 'group') {
      if (obj.data?.type === 'curved-text' && obj.data?.originalText) {
        const firstChild = obj.objects?.[0] || obj._objects?.[0] || {};
        const fontName = firstChild.fontFamily || 'Inter';
        fontsSet.add(fontName);
        results.views[viewKey].text.push({
          font: fontName,
          text: obj.data.originalText,
          fontSize: firstChild.fontSize || 30,
          color: firstChild.fill || '#ffffff',
          dimensions: `${(obj.width * obj.scaleX * cmRatio).toFixed(1)}cm x ${(obj.height * obj.scaleY * cmRatio).toFixed(1)}cm`,
          type: 'curved-text',
        });
        handledObjects.add(obj);
      }

      if (obj.objects || obj._objects) {
        (obj.objects || obj._objects).forEach(child => {
          if (child.fontFamily) fontsSet.add(child.fontFamily);
        });
      }
    }

    // 4. Uploaded Images
    else if (obj.type === 'image') {
      const dimensions = `${(obj.width * obj.scaleX * cmRatio).toFixed(1)}cm x ${(obj.height * obj.scaleY * cmRatio).toFixed(1)}cm`;
      if (obj.data?.wpUrl) {
        imagesSet.add(JSON.stringify({ url: obj.data.wpUrl, dimensions }));
        handledObjects.add(obj);
      } else if (obj.src && !obj.src.startsWith('data:')) {
        imagesSet.add(JSON.stringify({ url: obj.src, dimensions }));
        handledObjects.add(obj);
      } else if (obj._element?.src && !obj._element.src.startsWith('data:')) {
        imagesSet.add(JSON.stringify({ url: obj._element.src, dimensions }));
        handledObjects.add(obj);
      }
    }

    // Catch-All: Only add if not already handled
    if (!handledObjects.has(obj) && obj.opacity !== 0 && obj.visible) {
      // Don't count the print boundary or clip path
      if (obj.className === 'cpd-print-bounds' || obj.data?.type === 'clip-path') return;

      results.views[viewKey].art.push({
        name: obj.data?.artName || `${obj.type.charAt(0).toUpperCase() + obj.type.slice(1)} Element`,
        category: obj.data?.artCategory || 'Shape',
        dimensions: `${(obj.width * obj.scaleX * cmRatio).toFixed(1)}cm x ${(obj.height * obj.scaleY * cmRatio).toFixed(1)}cm`,
      });
      handledObjects.add(obj);
    }
  });
}

export default function BottomBar() {
  const {
    productColor, canvasRef, canvasStates, namesNumbers, namesConfig,
    customizationCount, setCustomizationCount,
    incrementCustomizationCount,
    selectedProduct, selectedCategory,
    screen, setScreen,
    fullConfig,
    saved,
    setSaved,
    generateThumbnail,
    isSubmitting,
    setActiveView, activeView, canvasThumbnails, sizesQuantities, customerNotes,
    PRICING_RULES, getCustomizedViews, activeTemplateId
  } = useContext(DesignContext);

  const [showBreakdown, setShowBreakdown] = useState(false);

  // Persistence: ensure productId is remembered even if URL changes
  const baseWpData = typeof window !== 'undefined' ? window.cpdData : {};
  let currentProductId = baseWpData?.productId || 0;

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      if (currentProductId > 0) {
        window.sessionStorage.setItem('cpd_persistent_product_id', currentProductId.toString());
      } else {
        const persistedId = window.sessionStorage.getItem('cpd_persistent_product_id');
        if (persistedId) currentProductId = parseInt(persistedId);
      }
    } catch (e) {
      console.warn('CPD: Session storage not available', e);
    }
  }

  const [saving, setSaving] = useState(false);
  const [savedDesignId, setSavedDesignId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const goToCart = () => {
    const wpData = typeof window !== 'undefined' && window.cpdData;
    if (wpData && wpData.cartUrl) {
      window.location.href = wpData.cartUrl;
    }
  };

  const customizedViews = getCustomizedViews(canvasStates);
  const priceData = calcPrice(selectedProduct?.price || 25, PRICING_RULES, sizesQuantities, customizedViews, activeTemplateId);
  const price = priceData.total;
  const breakdown = priceData.breakdown;

  // Capture a single view as PNG data URL using html-to-image to include the background
  const captureView = useCallback(async () => {
    const exportNode = document.querySelector('.cpd-scene-export') || document.querySelector('.cpd-canvas-area');
    if (!exportNode) throw new Error('Could not find canvas area to export.');

    // Discard selection so no bounding boxes show
    if (canvasRef.current) {
      canvasRef.current.discardActiveObject().renderAll();
    }

    // Wait for any UI transitions or selection boxes to fade out
    // and for high-res assets to be fully painted
    await wait(800);

    return htmlToImage.toPng(exportNode, {
      quality: 1,
      pixelRatio: 4, // HD Quality (4x resolution)
      skipAutoScale: true,
      cacheBust: true,
      filter: (node) => {
        // Exclude UI elements like the print area dashed box
        if (node.className && typeof node.className === 'string' && node.className.includes('cpd-print-bounds')) return false;
        if (node.className && typeof node.className === 'string' && node.className.includes('cpd-dimension-label')) return false;
        return true;
      }
    });
  }, [canvasRef]);

  // Save all views and Add to Cart
  const handleSaveAndCart = async () => {
    if (!canvasRef.current) return;

    // Check for quantity
    const totalQty = Object.values(sizesQuantities || {}).reduce((sum, q) => sum + (parseInt(q) || 0), 0);
    if (totalQty <= 0) {
      showToast('Please add quantity for at least one size.', 'error');
      return;
    }

    setSaving(true);

    try {
      const allViews = ['front', 'back', 'rightSleeve', 'leftSleeve'];
      const hasCustomMockups = fullConfig?.productMockups && Object.keys(fullConfig.productMockups).length > 0;
      const views = hasCustomMockups
        ? allViews.filter(v => !!fullConfig.productMockups[v])
        : allViews;
      const images = {};
      const originalView = activeView;

      // Metadata collection structure
      const metadata = {
        views: {
          front: { text: [], art: [] },
          back: { text: [], art: [] },
          rightSleeve: { text: [], art: [] },
          leftSleeve: { text: [], art: [] },
        },
        fonts: new Set(),
        images: new Set()
      };

      for (const view of views) {
        // Switch view and wait for it to be ready
        await setActiveView(view);

        // Increased buffer to ensure images/fonts are fully painted
        await wait(500);

        // Capture Thumbnail
        images[view] = await captureView();

        // Capture Live Metadata from this view's canvas
        if (canvasRef.current) {
          extractViewMetadata(canvasRef.current, view, metadata, metadata.fonts, metadata.images);
        }
      }

      // Switch back to original view and wait for it to finish
      await setActiveView(originalView);

      const currentWpData = typeof window !== 'undefined' ? window.cpdData : {};

      if (currentWpData && currentWpData.restUrl) {
        // Send all images to WordPress
        const response = await fetch(currentWpData.restUrl + 'save-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': currentWpData.nonce,
          },
          body: JSON.stringify({
            images: images,
            product_id: selectedProduct?.id || 0,
            product_color: productColor.hex,
            product_name: selectedProduct?.name || 'Custom Product',
            product_type: selectedProduct?.category?.id || 'tshirt',
            names_numbers: { config: namesConfig, entries: namesNumbers },
            sizes_quantities: sizesQuantities,
            total_price: price,
            customer_notes: customerNotes,
            fonts_used: Array.from(metadata.fonts),
            images_used: Array.from(metadata.images).map(str => {
              try { return JSON.parse(str); } catch (e) { return { url: str, dimensions: '' }; }
            }),
            text_content: metadata.views, // Use the grouped views structure
            artworks_used: metadata.views, // Same grouped structure for artworks
          }),
        });

        const result = await response.json();
        if (result.success) {
          const imageUrls = result.file_urls || {};

          // 1. Bypass beforeunload warning
          if (isSubmitting) isSubmitting.current = true;

          // 2. Prepare full design data for the cart
          const designData = {
            cpd_design_urls: imageUrls,
            cpd_product_id: selectedProduct?.id || 0,
            cpd_product_color: productColor.hex,
            cpd_names_numbers: JSON.stringify({ config: namesConfig, entries: namesNumbers }),
            cpd_sizes_quantities: JSON.stringify(sizesQuantities),
            cpd_total_price: price,
            cpd_customer_notes: customerNotes,
            cpd_fonts_used: JSON.stringify(Array.from(metadata.fonts)),
            cpd_images_used: JSON.stringify(Array.from(metadata.images).map(str => {
              try { return JSON.parse(str); } catch (e) { return { url: str, dimensions: '' }; }
            })),
            cpd_text_content: JSON.stringify(metadata.views),
            cpd_artworks_used: JSON.stringify(metadata.views),
            cpd_template_id: activeTemplateId || '',
          };

          // 3. Create a hidden form to POST to WooCommerce handle_cpd_add_to_cart
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = currentWpData.homeUrl || window.location.origin;

          const fields = {
            cpd_add_to_cart_direct: selectedProduct?.id || 0,
            cpd_design_data: JSON.stringify(designData),
            cpd_nonce: currentWpData.nonce || '',
            quantity: 1
          };

          for (const key in fields) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = fields[key];
            form.appendChild(input);
          }

          document.body.appendChild(form);
          form.submit();

          return; // Form submission triggers redirect
        } else {
          showToast('Failed to save: ' + (result.message || 'Server error'), 'error');
        }
      } else {
        // Standalone mode / Dev Mode — simply simulate success
        setSaved(true);
        showToast(`✓ Dev Mode: Design saved!`, 'success');
      }
    } catch (error) {
      console.error('Save error:', error);
      showToast('Error: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditAgain = () => {
    setSaved(false);
  };

  return (
    <>
      <div className="cpd-bottom-bar">
        <div className="cpd-bottom-left">
          <button className="cpd-back-catalog-btn" onClick={() => {
            const wpData = typeof window !== 'undefined' && window.cpdData;
            if (wpData && wpData.productId) {
              window.location.href = `/?p=${wpData.productId}`;
            } else {
              setScreen('catalog');
            }
          }}>
            ← Back
          </button>

          <div className="cpd-product-info">
            <div className="cpd-product-thumb-small">
              <TshirtThumbSmall color={productColor.hex} />
            </div>
            <div className="cpd-product-meta">
              <h4>
                {selectedProduct?.name || 'Custom T-Shirt'}
              </h4>
              <p>
                <span className="cpd-color-dot" style={{ backgroundColor: productColor.hex }} />
                {productColor.name}
              </p>
            </div>
          </div>
        </div>

        <div className="cpd-bottom-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="cpd-item-count">
            {customizationCount} item{customizationCount !== 1 ? 's' : ''} added
          </span>
          {price > 0 && (
            <span 
              onClick={() => setShowBreakdown(true)} 
              style={{ fontSize: '11px', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline', marginTop: '2px', fontWeight: 'bold' }}
            >
              View Price Breakdown
            </span>
          )}
        </div>

        <div className="cpd-bottom-right">
          {!saved ? (
            <button
              className="cpd-price-btn cpd-save-cart-btn"
              onClick={handleSaveAndCart}
              disabled={saving}
            >
              {saving ? (
                <>
                  <svg className="cpd-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Adding to Cart...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61H19a2 2 0 001.96-1.61L23 6H6" />
                  </svg>
                  Add to Cart — {price ? Number(price).toFixed(2) : '0.00'}
                </>
              )}
            </button>
          ) : (
            <div className="cpd-saved-actions" style={{ display: 'flex', gap: '10px' }}>
              <button className="cpd-save-btn cpd-edit-design-btn" onClick={handleEditAgain}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Design
              </button>
              <button className="cpd-price-btn cpd-goto-cart-btn" onClick={goToCart}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61H19a2 2 0 001.96-1.61L23 6H6" />
                </svg>
                Go to Cart
              </button>
            </div>
          )}
        </div>
      </div>

      {showBreakdown && (
        <div className="cpd-modal-overlay" onClick={() => setShowBreakdown(false)} style={{ zIndex: 1000000, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="cpd-modal-box" onClick={e => e.stopPropagation()} style={{ background: '#1a1c29', borderRadius: '12px', padding: '24px', width: '350px', border: '1px solid #2a2d3e', color: '#fff' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', borderBottom: '1px solid #2a2d3e', paddingBottom: '12px' }}>Price Breakdown</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span style={{ color: '#aaa' }}>Base Price</span>
              <strong>${breakdown.basePrice.toFixed(2)}</strong>
            </div>

            {Object.entries(breakdown.views).map(([view, charge]) => (
              <div key={view} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: '#aaa' }}>{view.charAt(0).toUpperCase() + view.slice(1)} Design</span>
                <strong>+${charge.toFixed(2)}</strong>
              </div>
            ))}

            {breakdown.template > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: '#aaa' }}>Template Upcharge</span>
                <strong>+${breakdown.template.toFixed(2)}</strong>
              </div>
            )}

            <div style={{ borderTop: '1px solid #2a2d3e', margin: '12px 0' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span style={{ color: '#aaa' }}>Price Per Item</span>
              <strong>${breakdown.itemBase.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span style={{ color: '#aaa' }}>Total Quantity</span>
              <strong>x {breakdown.totalQty}</strong>
            </div>

            {Object.keys(breakdown.sizes).length > 0 && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#13151f', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>Size Breakdown</div>
                {Object.entries(breakdown.sizes).map(([sz, details]) => (
                  <div key={sz} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span>{sz} (x{details.qty}) {details.upcharge > 0 && <span style={{color: '#ef4444'}}>+${details.upcharge}</span>}</span>
                    <span>${details.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid #2a2d3e', marginTop: '16px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
              <span>Total</span>
              <span>${price.toFixed(2)}</span>
            </div>
            
            <button 
              onClick={() => setShowBreakdown(false)}
              style={{ width: '100%', padding: '10px', marginTop: '20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className={`cpd-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}
