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
  const cmRatio = 0.145; 

  const objects = canvas.getObjects();
  objects.forEach(obj => {
    // Text objects
    if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
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
      }
    }

    // Groups (Curved Text, Icons)
    if (obj.type === 'group') {
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
      } else if (obj.data?.type === 'artwork' && obj.data?.artName) {
        const iconName = obj.data.artName.includes('(') ? obj.data.artName : `${obj.data.artCategory || 'Artwork'} (${obj.data.artName})`;
        results.views[viewKey].art.push({
          name: iconName,
          category: obj.data.artCategory || '',
          dimensions: `${(obj.width * obj.scaleX * cmRatio).toFixed(1)}cm x ${(obj.height * obj.scaleY * cmRatio).toFixed(1)}cm`,
        });
      }
      if (obj.objects || obj._objects) {
        (obj.objects || obj._objects).forEach(child => {
          if (child.fontFamily) fontsSet.add(child.fontFamily);
        });
      }
    }

    // Images (Already broad, but ensure it's checked)
    if (obj.type === 'image') {
      const dimensions = `${(obj.width * obj.scaleX * cmRatio).toFixed(1)}cm x ${(obj.height * obj.scaleY * cmRatio).toFixed(1)}cm`;
      if (obj.data?.wpUrl) {
        imagesSet.add(JSON.stringify({ url: obj.data.wpUrl, dimensions }));
      } else if (obj.src && !obj.src.startsWith('data:')) {
        imagesSet.add(JSON.stringify({ url: obj.src, dimensions }));
      } else if (obj._element?.src && !obj._element.src.startsWith('data:')) {
        imagesSet.add(JSON.stringify({ url: obj._element.src, dimensions }));
      }
    }

    // Catch-All: If an object was not caught by text/art/image but is visible
    const alreadyCaught = results.views[viewKey].text.some(t => t._ref === obj) || 
                          results.views[viewKey].art.some(a => a._ref === obj);
    
    if (!alreadyCaught && obj.type !== 'image' && obj.opacity !== 0 && obj.visible) {
      // Don't count the print boundary or clip path
      if (obj.className === 'cpd-print-bounds' || obj.data?.type === 'clip-path') return;

      results.views[viewKey].art.push({
        name: obj.data?.artName || `${obj.type.charAt(0).toUpperCase() + obj.type.slice(1)} Element`,
        category: obj.data?.artCategory || 'Shape',
        dimensions: `${(obj.width * obj.scaleX * cmRatio).toFixed(1)}cm x ${(obj.height * obj.scaleY * cmRatio).toFixed(1)}cm`,
      });
    }
  });
}

export default function BottomBar() {
  const {
    productColor, canvasRef, canvasStates, namesNumbers, namesConfig,
    customizationCount, selectedProduct, screen, setScreen,
    setActiveView, activeView, canvasThumbnails, sizesQuantities, customerNotes,
  } = useContext(DesignContext);

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
  const [saved, setSaved] = useState(false);
  const [savedDesignId, setSavedDesignId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const price = calcPrice(customizationCount, selectedProduct?.price || 25);

  // Capture a single view as PNG data URL using html-to-image to include the background
  const captureView = useCallback(async () => {
    const exportNode = document.querySelector('.cpd-scene-export') || document.querySelector('.cpd-canvas-area');
    if (!exportNode) throw new Error('Could not find canvas area to export.');

    // Discard selection so no bounding boxes show
    if (canvasRef.current) {
      canvasRef.current.discardActiveObject().renderAll();
    }

    // Small delay for render to settle
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

  // Save all views and Add to Cart
  const handleSaveAndCart = async () => {
    if (!canvasRef.current) return;
    setSaving(true);

    try {
      const views = ['front', 'back', 'rightSleeve', 'leftSleeve'];
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

      let designId = null;
      let imageUrls = {};

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
              try { return JSON.parse(str); } catch(e) { return { url: str, dimensions: '' }; }
            }),
            text_content: metadata.views, // Use the grouped views structure
            artworks_used: metadata.views, // Same grouped structure for artworks
          }),
        });

        const result = await response.json();
        if (result.success) {
          designId = result.id;
          imageUrls = result.file_urls || {};
          
          // Store the designId for redirection later
          setSavedDesignId(designId);
          setSaved(true);
          showToast(`✓ Design saved! Now you can go to cart.`, 'success');
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

  // Classic WooCommerce AJAX add-to-cart (fallback)
  const classicAddToCart = async (productId, designId, quantity) => {
    const formData = new FormData();
    formData.append('product_id', productId); // standard AJAX param
    formData.append('quantity', quantity);
    formData.append('cpd_design_id', designId);

    // Using the standard WooCommerce AJAX endpoint which is more reliable across themes
    const ajaxUrl = wpData?.homeUrl 
      ? (wpData.homeUrl.endsWith('/') ? wpData.homeUrl : wpData.homeUrl + '/') + '?wc-ajax=add_to_cart'
      : window.location.origin + '/?wc-ajax=add_to_cart';

    await fetch(ajaxUrl, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
    });
  };

  const goToCart = () => {
    const finalWpData = typeof window !== 'undefined' ? window.cpdData : {};

    // Get the product ID (from localized data or session persistence)
    const finalProductId = currentProductId > 0 ? currentProductId : (finalWpData?.productId || 0);

    if (finalProductId > 0 && savedDesignId) {
      const totalQty = Object.values(sizesQuantities).reduce((a, b) => a + (parseInt(b) || 0), 0) || 1;

      // Build the trampoline URL — our PHP handler intercepts this,
      // calls WC()->cart->add_to_cart() directly, then redirects to the clean cart page.
      const homeUrl = finalWpData?.homeUrl || window.location.origin + '/';
      const trampolineUrl = `${homeUrl}?cpd_add_to_cart=${finalProductId}&cpd_design_id=${savedDesignId}&quantity=${Math.max(1, totalQty)}`;

      window.location.href = trampolineUrl;
    } else {
      // Fallback: just go to cart page
      const cartUrl = finalWpData?.cartUrl || (finalWpData?.homeUrl || window.location.origin + '/') + 'cart/';
      window.location.href = cartUrl;
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

        <div className="cpd-bottom-center">
          <span className="cpd-item-count">
            {customizationCount} item{customizationCount !== 1 ? 's' : ''} added
          </span>
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
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                     <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                   </svg>
                   Saving & Adding to Cart...
                 </>
               ) : (
                 <>
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                     <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                     <path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61H19a2 2 0 001.96-1.61L23 6H6"/>
                   </svg>
                   Save & Add to Cart — ${Number(price).toFixed(2)}
                 </>
               )}
             </button>
          ) : (
             <div className="cpd-saved-actions" style={{ display: 'flex', gap: '10px' }}>
               <button className="cpd-save-btn cpd-edit-design-btn" onClick={handleEditAgain}>
                 <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                   <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                   <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                 </svg>
                 Edit Design
               </button>
               <button className="cpd-price-btn cpd-goto-cart-btn" onClick={goToCart}>
                 <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                   <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                   <path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61H19a2 2 0 001.96-1.61L23 6H6"/>
                 </svg>
                 Go to Cart
               </button>
             </div>
          )}
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
