import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { DesignContext } from '../App';
import { fabric } from 'fabric';
import * as htmlToImage from 'html-to-image';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1440;

function TemplateThumbnailCarousel({ thumbnails }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = Object.values(thumbnails);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 2000); // Swipe every 2 seconds
    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {images.map((src, idx) => (
        <img
          key={idx}
          src={src}
          alt={`View ${idx + 1}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: currentIndex === idx ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out'
          }}
        />
      ))}
    </div>
  );
}

export default function TemplatePanel() {
  const {
    canvasRef, saveToHistory, incrementCustomizationCount,
    activeView, setActiveView, fullConfig, selectedProduct,
    canvasStates, setCanvasStates, setCustomizationCount,
    activeTemplateId, setActiveTemplateId,
    isTemplateModalOpen, setIsTemplateModalOpen
  } = useContext(DesignContext);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [toast, setToast] = useState(null);
  const replaceInputRef = useRef(null);
  const replaceInProgress = useRef(false);

  const isAdmin = typeof window !== 'undefined' && (window.cpdData?.isAdmin === true || window.cpdData?.isAdmin === '1' || window.cpdData?.isAdmin === 1);
  const productId = selectedProduct?.id || window.cpdData?.productId || 0;
  const productLabel = `${selectedProduct?.name || ''} ${selectedProduct?.category?.id || ''} ${window.cpdData?.productName || ''}`.toLowerCase();
  const isBusinessCardProduct = /business\s*card|visiting\s*card|\bcard\b/.test(productLabel);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getViewsWithContent = useCallback((states) => {
    const views = [];
    if (!states) return views;

    Object.keys(states).forEach((view) => {
      const stateStr = states[view];
      if (!stateStr) return;

      try {
        const state = typeof stateStr === 'string' ? JSON.parse(stateStr) : stateStr;
        const hasUserObj = Array.isArray(state?.objects) && state.objects.some((obj) =>
          obj.data?.type !== 'clip-path' && obj.data?.type !== 'print-area' && obj.className !== 'cpd-print-bounds'
        );
        if (hasUserObj) views.push(view);
      } catch (e) {
        // Ignore malformed view state
      }
    });

    return views;
  }, []);

  const getAvailableTemplateViews = useCallback(() => {
    const allViews = ['front', 'back', 'rightSleeve', 'leftSleeve'];
    if (fullConfig?.productMockups && Object.keys(fullConfig.productMockups).length > 0) {
      return allViews.filter((view) => !!fullConfig.productMockups[view]);
    }
    return allViews;
  }, [fullConfig]);

  // Fetch templates from API
  const fetchTemplates = useCallback(async () => {
    if (!productId || !window.cpdData?.restUrl) {
      setLoading(false);
      return;
    }
    try {
      const resp = await fetch(
        `${window.cpdData.restUrl}templates?product_id=${productId}`,
        { headers: { 'X-WP-Nonce': window.cpdData.nonce } }
      );
      const data = await resp.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('CPD: Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  /* ═══════════════════════════════════════════════════════
     APPLY TEMPLATE LOCKS
     Locks position on ALL template objects
     Keeps objects exactly as they are — NO type conversion
  ═══════════════════════════════════════════════════════ */
  const applyTemplateLocks = useCallback((canvas) => {
    if (!canvas) return;

    // Convert i-text to textbox for proper wrapping WITHOUT shifting positions
    const toConvert = [];
    canvas.getObjects().forEach(obj => {
      if (obj.data?.editable === true && (obj.type === 'i-text' || obj.type === 'text')) {
        toConvert.push(obj);
      }
    });

    toConvert.forEach(obj => {
      const visualWidth = obj.width * obj.scaleX;
      const trueScale = obj.scaleY || 1;
      const newWidth = visualWidth / trueScale;

      const tb = new fabric.Textbox(obj.text, {
        ...obj.toObject(),
        type: 'textbox',
        width: newWidth,
        scaleX: trueScale,
        scaleY: trueScale,
        splitByGrapheme: false,
      });
      tb.data = obj.data;
      canvas.remove(obj);
      canvas.add(tb);
    });

    // Simply apply lock properties — do NOT change object types
    canvas.getObjects().forEach(obj => {
      if (obj.data?.editable === true) {
        const isText = (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox');
        const isImage = (obj.type === 'image');

        // Lock position/size/rotation but allow content editing
        obj.set({
          selectable: true,
          evented: true,
          hasControls: false,
          hasBorders: true,
          lockMovementX: true,
          lockMovementY: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          lockScalingFlip: true,
          lockSkewingX: true,
          lockSkewingY: true,
          moveCursor: 'not-allowed',
          borderColor: '#22c55e',
          cornerColor: '#22c55e',
          borderScaleFactor: 2,
        });

        if (isText) {
          obj.set({
            editable: true,      // double-click to type
            hoverCursor: 'text',
          });
        } else if (isImage) {
          obj.set({
            hoverCursor: 'pointer', // double-click to replace
          });
        }
      } else if (obj.data?.type === 'clip-path' || obj.data?.type === 'print-area') {
        // System — leave as-is
      } else {
        // FULLY LOCKED background/decoration
        obj.set({
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          hoverCursor: 'default',
        });
      }
    });

    canvas.renderAll();
  }, []);

  /* ═══════════════════════════════════════════════════════
     TEMPLATE EVENTS
     Double-click image → file picker → replace (ONE click only)
  ═══════════════════════════════════════════════════════ */
  const setupTemplateEvents = useCallback((canvas) => {
    if (!canvas) return;

    // Remove old template handlers
    if (canvas._templateDblClickHandler) {
      canvas.off('mouse:dblclick', canvas._templateDblClickHandler);
    }

    const handler = (e) => {
      const obj = e.target;
      if (!obj) return;
      if (obj.data?.editable === true && obj.type === 'image') {
        // Prevent double-fire
        if (replaceInProgress.current) return;
        replaceInProgress.current = true;

        // Store target on canvas for retrieval in file handler
        canvas._replacingImageObj = obj;

        // Store original dimensions
        if (!obj.data._origDisplayW) {
          obj.data._origDisplayW = obj.width * obj.scaleX;
          obj.data._origDisplayH = obj.height * obj.scaleY;
        }

        // Open file picker
        replaceInputRef.current?.click();

        // Reset flag after delay
        setTimeout(() => { replaceInProgress.current = false; }, 1500);
      }
    };

    canvas._templateDblClickHandler = handler;
    canvas.on('mouse:dblclick', handler);
  }, []);

  /* ═══════════════════════════════════════════════════════
     IMAGE REPLACEMENT HANDLER — single operation
  ═══════════════════════════════════════════════════════ */
  const handleReplaceImage = (e) => {
    const file = e.target.files?.[0];
    const canvas = canvasRef.current;

    // Reset input immediately
    if (e.target) e.target.value = '';

    if (!file || !file.type.startsWith('image/') || !canvas) return;

    const targetObj = canvas._replacingImageObj;
    if (!targetObj) return;
    canvas._replacingImageObj = null; // clear so it won't fire again

    // Save original transform
    const origLeft = targetObj.left;
    const origTop = targetObj.top;
    const origAngle = targetObj.angle;
    const origOriginX = targetObj.originX;
    const origOriginY = targetObj.originY;
    const origDisplayW = targetObj.data?._origDisplayW || (targetObj.width * targetObj.scaleX);
    const origDisplayH = targetObj.data?._origDisplayH || (targetObj.height * targetObj.scaleY);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;

      // Try WP upload for persistent URL
      let wpUrl = null;
      const wpData = typeof window !== 'undefined' && window.cpdData;
      if (wpData?.restUrl) {
        try {
          const fd = new FormData();
          fd.append('file', file);
          const resp = await fetch(wpData.restUrl + 'upload', {
            method: 'POST',
            headers: { 'X-WP-Nonce': wpData.nonce },
            body: fd,
          });
          const result = await resp.json();
          if (result.success && result.url) wpUrl = result.url;
        } catch (err) {
          console.warn('WP upload failed:', err);
        }
      }

      const imgUrl = wpUrl || dataUrl;

      // Replace image source, keep same bounding box
      targetObj.setSrc(imgUrl, () => {
        const scX = origDisplayW / targetObj.width;
        const scY = origDisplayH / targetObj.height;
        const scale = Math.min(scX, scY);

        targetObj.set({
          left: origLeft,
          top: origTop,
          scaleX: scale,
          scaleY: scale,
          angle: origAngle,
          originX: origOriginX,
          originY: origOriginY,
        });
        targetObj.setCoords();

        // Update position enforcement
        if (canvas._storeTemplateOriginals) {
          canvas._storeTemplateOriginals();
        }

        canvas.renderAll();
        saveToHistory();
        showToast('✅ Image replaced!');
      }, { crossOrigin: 'anonymous' });
    };
    reader.readAsDataURL(file);
  };

  /* ═══════════════════════════════════════════════════════
     LOAD TEMPLATE
  ═══════════════════════════════════════════════════════ */
  const loadTemplate = async (template) => {
    if (!canvasRef.current || !template.views) return;

    const views = Object.keys(template.views);
    if (views.length === 0) return;

    setActiveTemplateId(template.id);

    for (const viewKey of views) {
      const viewJson = template.views[viewKey];
      if (!viewJson) continue;

      await setActiveView(viewKey);
      await new Promise(r => setTimeout(r, 100));

      const canvas = canvasRef.current;
      if (!canvas) continue;

      let parsed;
      try {
        parsed = typeof viewJson === 'string' ? JSON.parse(viewJson) : viewJson;
      } catch (e) {
        console.warn(`CPD: Failed to parse template view ${viewKey}:`, e);
        continue;
      }

      await new Promise((resolve) => {
        canvas.loadFromJSON(parsed, () => {
          applyTemplateLocks(canvas);
          setupTemplateEvents(canvas);
          if (canvas._storeTemplateOriginals) {
            canvas._storeTemplateOriginals();
          }
          // Store original display dims for replaceable images
          canvas.getObjects().forEach(obj => {
            if (obj.data?.editable === true && obj.type === 'image' && !obj.data._origDisplayW) {
              obj.data._origDisplayW = obj.width * obj.scaleX;
              obj.data._origDisplayH = obj.height * obj.scaleY;
            }
          });
          resolve();
        });
      });

      saveToHistory();
    }

    // Switch back to first view
    if (views.length > 0) {
      await setActiveView(views[0]);
      await new Promise(r => setTimeout(r, 150));
      if (canvasRef.current) {
        applyTemplateLocks(canvasRef.current);
        setupTemplateEvents(canvasRef.current);
        if (canvasRef.current._storeTemplateOriginals) {
          canvasRef.current._storeTemplateOriginals();
        }
      }
    }

    setCustomizationCount(1);
    showToast(`Template "${template.name}" loaded!`);
  };

  /* ═══════════════════════════════════════════════════════
     CLEAR TEMPLATE
  ═══════════════════════════════════════════════════════ */
  const clearTemplate = async () => {
    if (!canvasRef.current) return;
    setActiveTemplateId(null);
    if (canvasRef.current._templateOriginals) {
      canvasRef.current._templateOriginals.clear();
    }
    canvasRef.current.clear();
    canvasRef.current.backgroundColor = 'transparent';
    canvasRef.current.renderAll();
    saveToHistory();
    setCustomizationCount(0);
    showToast('Template cleared — blank canvas ready');
  };

  const updateCanvasState = (view, jsonStr) => {
    setCanvasStates(prev => ({ ...prev, [view]: jsonStr }));
  };

  const handleEditTemplate = async (template) => {
    if (!canvasRef.current || !template.views) return;
    if (!window.confirm('This will load the template in Edit Mode. You can update it by saving again.')) return;

    setLoading(true);
    try {
      const views = Object.keys(template.views);
      if (views.length === 0) return;

      for (const viewKey of views) {
        const viewJson = template.views[viewKey];
        if (!viewJson) continue;

        await setActiveView(viewKey);
        await new Promise(r => setTimeout(r, 100));

        const canvas = canvasRef.current;
        if (!canvas) continue;

        let parsed;
        try {
          parsed = typeof viewJson === 'string' ? JSON.parse(viewJson) : viewJson;
        } catch (e) {
          console.warn(`CPD: Failed to parse template view ${viewKey} for edit:`, e);
          continue;
        }

        await new Promise((resolve) => {
          canvas.loadFromJSON(parsed, () => {
            // Unlock everything!
            canvas.getObjects().forEach(obj => {
              obj.set({
                selectable: true,
                evented: true,
                hasControls: true,
                hasBorders: true,
                lockMovementX: false,
                lockMovementY: false,
                lockScalingX: false,
                lockScalingY: false,
                lockRotation: false,
                lockScalingFlip: false,
                lockSkewingX: false,
                lockSkewingY: false,
                moveCursor: 'move',
                hoverCursor: 'move',
              });
            });
            canvas.renderAll();
            resolve();
          });
        });
      }

      // Switch back to first view
      if (views.length > 0) {
        await setActiveView(views[0]);
        await new Promise(r => setTimeout(r, 150));
      }

      setActiveTemplateId(null);
      setEditingTemplateId(template.id);
      setTemplateName(template.name);
      setShowSaveForm(true);

      showToast(`Editing template "${template.name}"`);
    } catch (err) {
      showToast('Error loading for edit', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ═══════════════════════════════════════════════════════
     SAVE TEMPLATE (Admin)
  ═══════════════════════════════════════════════════════ */
  const handleSaveTemplate = async () => {
    if (!canvasRef.current || !productId || !templateName.trim()) return;
    setSavingTemplate(true);

    try {
      const liveStates = {
        ...canvasStates,
        [activeView]: JSON.stringify(canvasRef.current.toJSON(['data'])),
      };
      const availableViews = getAvailableTemplateViews();
      const views = getViewsWithContent(liveStates).filter((view) => availableViews.includes(view));
      const templateViews = {};
      const templateThumbnails = {};
      const originalView = activeView;

      if (views.length === 0) {
        showToast('No design content to save as template', 'error');
        setSavingTemplate(false);
        return;
      }

      for (const view of views) {
        await setActiveView(view);
        await new Promise(r => setTimeout(r, 70));

        if (canvasRef.current) {
          const currentCanvas = canvasRef.current;
          const json = currentCanvas.toJSON(['data']);

          json.objects = json.objects.map(obj => {
            const data = obj.data || {};
            if (!data.hasOwnProperty('editable')) {
              if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
                data.editable = true;
                data.editType = 'text';
              } else if (obj.type === 'image' && data.type === 'uploaded-image') {
                data.editable = true;
                data.editType = 'replace-image';
              } else {
                data.editable = false;
              }
            }
            return { ...obj, data };
          });

          const hasContent = json.objects.some(o =>
            o.data?.type !== 'clip-path' && o.data?.type !== 'print-area'
          );
          
          if (hasContent) {
            templateViews[view] = JSON.stringify(json);

            // Capture Thumbnail for this view
            try {
              currentCanvas.discardActiveObject().renderAll();
              await new Promise(r => setTimeout(r, 160));
              
              const exportNode = document.querySelector('.cpd-scene-export') || document.querySelector('.cpd-canvas-area');
              if (exportNode) {
                templateThumbnails[view] = await htmlToImage.toPng(exportNode, {
                  quality: 0.9,
                  pixelRatio: 2, // Good quality for thumbnails
                  skipAutoScale: true,
                  cacheBust: true,
                  filter: (node) => {
                    if (node.className && typeof node.className === 'string') {
                      if (node.className.includes('cpd-print-bounds') || node.className.includes('cpd-dimension-label')) {
                        return false;
                      }
                    }
                    return true;
                  }
                });
              } else {
                templateThumbnails[view] = currentCanvas.toDataURL({ format: 'png', multiplier: 0.3 });
              }
            } catch (e) {
              console.warn('CPD: Failed to generate thumbnail for view', view, e);
            }
          }
        }
      }

      await setActiveView(originalView);

      const resp = await fetch(`${window.cpdData.restUrl}templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.cpdData.nonce,
        },
        body: JSON.stringify({
          product_id: productId,
          name: templateName.trim(),
          thumbnail: templateThumbnails,
          views: templateViews,
          template_id: editingTemplateId || null,
        }),
      });

      const result = await resp.json();
      if (result.success) {
        showToast(editingTemplateId ? `Template updated!` : `Template "${templateName}" saved!`);
        setTemplateName('');
        setEditingTemplateId(null);
        setShowSaveForm(false);
        fetchTemplates();
      } else {
        showToast(result.message || 'Failed to save template', 'error');
      }
    } catch (err) {
      console.error('CPD: Save template error:', err);
      showToast('Error saving template: ' + err.message, 'error');
    } finally {
      setSavingTemplate(false);
    }
  };

  /* ═══════════════════════════════════════════════════════
     DELETE TEMPLATE (Admin)
  ═══════════════════════════════════════════════════════ */
  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;

    try {
      const resp = await fetch(
        `${window.cpdData.restUrl}templates/${templateId}?product_id=${productId}`,
        {
          method: 'DELETE',
          headers: { 'X-WP-Nonce': window.cpdData.nonce },
        }
      );
      const result = await resp.json();
      if (result.success) {
        showToast('Template deleted');
        fetchTemplates();
        if (activeTemplateId === templateId) {
          setActiveTemplateId(null);
        }
      }
    } catch (err) {
      showToast('Error deleting template', 'error');
    }
  };

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <div className="cpd-template-panel">
      {/* Hidden file input for image replacement */}
      <input
        type="file"
        ref={replaceInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleReplaceImage}
      />

      {/* Active Template Badge */}
      {activeTemplateId && (
        <div className="cpd-template-active-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Template active</span>
          <button onClick={clearTemplate} title="Remove template">✕</button>
        </div>
      )}

      {/* Template Usage Hints */}
      {activeTemplateId && (
        <div className="cpd-template-hints">
          <div className="cpd-template-hint-item">
            <span className="cpd-hint-icon">✏️</span>
            <span>Double-click text to edit (wraps to next line)</span>
          </div>
          <div className="cpd-template-hint-item">
            <span className="cpd-hint-icon">🖼️</span>
            <span>Double-click logo/image to replace</span>
          </div>
          <div className="cpd-template-hint-item">
            <span className="cpd-hint-icon">🔒</span>
            <span>Background design is locked</span>
          </div>
        </div>
      )}

      {/* Template Gallery */}
      <div className="cpd-template-section">
        <h4 className="cpd-template-section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Ready-Made Templates
        </h4>

        {loading ? (
          <div className="cpd-template-loading">
            <div className="cpd-template-spinner" />
            <span>Loading templates...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="cpd-template-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <p>No templates available yet</p>
            <span>Templates will appear here when added by admin</span>
          </div>
        ) : (
          <button 
            className="cpd-template-save-btn" 
            style={{ width: '100%', padding: '12px', fontSize: '14px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
            onClick={() => setIsTemplateModalOpen(true)}
          >
            Choose Template
          </button>
        )}
      </div>

      {/* Admin: Save as Template */}
      {isAdmin && (
        <div className="cpd-template-admin-section">
          <h4 className="cpd-template-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Admin: Save Template
          </h4>

          {!showSaveForm ? (
            <button
              className="cpd-template-save-toggle"
              onClick={() => setShowSaveForm(true)}
            >
              + Save Current Design as Template
            </button>
          ) : (
            <div className="cpd-template-save-form">
              <input
                type="text"
                className="cpd-template-name-input"
                placeholder="Template name (e.g. Classic Business Card)"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
              />
              <div className="cpd-template-save-hint">
                <p>💡 Auto-classification when saved:</p>
                <ul>
                  <li><strong>Text</strong> → User can edit content & color</li>
                  <li><strong>Uploaded logos/images</strong> → User can replace (double-click)</li>
                  <li><strong>Background / Art / Shapes</strong> → Fully locked 🔒</li>
                </ul>
              </div>
              <div className="cpd-template-save-actions">
                <button
                  className="cpd-template-save-btn"
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate || !templateName.trim()}
                >
                  {savingTemplate ? 'Saving...' : '💾 Save Template'}
                </button>
                <button
                  className="cpd-template-cancel-btn"
                  onClick={() => { setShowSaveForm(false); setTemplateName(''); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`cpd-template-toast ${toast.type}`}>
          {toast.msg}
        </div>
      )}

      {/* Template Modal */}
      {isTemplateModalOpen && (
        <div className="cpd-template-modal-overlay" onClick={() => setIsTemplateModalOpen(false)}>
          <div className="cpd-template-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cpd-template-modal-header">
              <div>
                <h2>Choose a Template</h2>
                <p>Select a professionally designed layout to get started instantly.</p>
              </div>
              <button className="cpd-template-modal-close" onClick={() => setIsTemplateModalOpen(false)}>&times;</button>
            </div>
            <div className="cpd-template-modal-body">
              <div className="cpd-template-grid-large">
                {templates.map((tpl) => (
                  <div key={tpl.id} className={`cpd-template-card ${activeTemplateId === tpl.id ? 'active' : ''}`}>
                    <div
                      className={`cpd-template-card-img ${isBusinessCardProduct ? 'cpd-template-card-img-card' : ''}`}
                      onClick={() => { loadTemplate(tpl); setIsTemplateModalOpen(false); }}
                    >
                      {tpl.thumbnail ? (
                        (typeof tpl.thumbnail === 'object') ? (
                          <TemplateThumbnailCarousel thumbnails={tpl.thumbnail} />
                        ) : (
                          <img src={tpl.thumbnail} alt={tpl.name} />
                        )
                      ) : (
                        <div className="cpd-template-placeholder">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}
                      {activeTemplateId === tpl.id && (
                        <div className="cpd-template-active-overlay">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="cpd-template-card-info">
                      <span className="cpd-template-card-name">{tpl.name}</span>
                      <div className="cpd-template-card-actions">
                        <button className="cpd-template-use-btn" onClick={() => { loadTemplate(tpl); setIsTemplateModalOpen(false); }}>
                          {activeTemplateId === tpl.id ? 'Reload Template' : 'Use Template'}
                        </button>
                        {isAdmin && (
                          <button className="cpd-template-edit-btn" onClick={(e) => { e.stopPropagation(); handleEditTemplate(tpl); setIsTemplateModalOpen(false); }} title="Edit layout">✎</button>
                        )}
                        {isAdmin && (
                          <button className="cpd-template-del-btn" onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }} title="Delete template">🗑</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
