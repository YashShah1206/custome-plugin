import React, { useState, useRef, useCallback, createContext, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CanvasArea from './components/CanvasArea';
import Toolbar from './components/Toolbar';
import ViewSwitcher from './components/ViewSwitcher';
import BottomBar from './components/BottomBar';
import ProductCatalog from './components/ProductCatalog';
import ProductList from './components/ProductList';
import ProductDetail from './components/ProductDetail';

export const DesignContext = createContext();

const DEFAULT_PRODUCT_COLORS = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'Dark Heather', hex: '#4a4a4a' },
  { name: 'Charcoal', hex: '#3d3d3d' },
  { name: 'Navy', hex: '#1b2a4a' },
  { name: 'Royal Blue', hex: '#2d5dab' },
  { name: 'Safety Green', hex: '#c4e20f' },
  { name: 'Red', hex: '#cc2222' },
  { name: 'Forest Green', hex: '#2d6b3f' },
  { name: 'Orange', hex: '#ff6b1a' },
  { name: 'Purple', hex: '#6b3fa0' },
  { name: 'Maroon', hex: '#6b1a2a' },
  { name: 'Sport Grey', hex: '#9b9b9b' },
  { name: 'Light Blue', hex: '#7eb8e0' },
  { name: 'Pink', hex: '#e88baf' },
  { name: 'Gold', hex: '#d4a843' },
];

const SIZES = ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

// Print areas per view — used for clipping
// export const PRINT_AREAS = {
//   front: { left: 60, top: 40, width: 220, height: 350 },
//   back: { left: 60, top: 40, width: 220, height: 350 },
//   rightSleeve: { left: 110, top: 120, width: 120, height: 200 },
//   leftSleeve: { left: 110, top: 120, width: 120, height: 200 },
// };
// Canvas is 500×600 — update ratios accordingly
const BASE_CANVAS_WIDTH = 1200;
const BASE_CANVAS_HEIGHT = 1440;
const DISPLAY_WIDTH = 500;
const DISPLAY_HEIGHT = 600;

const DEFAULT_PRINT_AREAS = {
  // Front chest area — centered horizontally, just below collar
  front: [{
    left: 155 / 500,
    top: 175 / 600,
    width: 190 / 500,
    height: 295 / 600,
  }],
  // Back — same width/position, can start a little higher (no collar bump)
  back: [{
    left: 153 / 500,
    top: 138 / 600,
    width: 200 / 500,
    height: 325 / 600,
  }],
  // Right sleeve — upper arm printable zone in the side-view mockup
  rightSleeve: [{
    left: 215 / 500,
    top: 155 / 600,
    width: 75 / 500,
    height: 105 / 600,
  }],

  // ✅ Left sleeve (mirror of right)
  leftSleeve: [{
    left: 230 / 500,
    top: 155 / 600,
    width: 75 / 500,
    height: 105 / 600,
  }],
};

const DEFAULT_CAP_PRINT_AREAS = {
  front: [{
    left: 120 / 500,
    top: 195 / 600,
    width: 260 / 500,
    height: 150 / 600,
  }],
  back: [{
    left: 165 / 500,
    top: 160 / 600,
    width: 180 / 500,
    height: 100 / 600,
  }],
  rightSleeve: [{
    left: 125 / 500,
    top: 250 / 600,
    width: 120 / 500,
    height: 85 / 600,
  }],
  leftSleeve: [{
    left: 125 / 500,
    top: 250 / 600,
    width: 120 / 500,
    height: 85 / 600,
  }],
};





export function getCustomizedViews(canvasStates) {
  const views = [];
  if (!canvasStates) return views;
  Object.keys(canvasStates).forEach(view => {
    const stateStr = canvasStates[view];
    if (stateStr) {
      try {
        const state = typeof stateStr === 'string' ? JSON.parse(stateStr) : stateStr;
        if (state && state.objects) {
          const hasUserObj = state.objects.some(obj => {
             return obj.data?.type !== 'clip-path' && obj.data?.type !== 'print-area' && obj.className !== 'cpd-print-bounds';
          });
          if (hasUserObj) views.push(view);
        }
      } catch (e) {}
    }
  });
  return views;
}

export function calcPrice(basePrice = 0, pricingRules = {}, sizesQuantities = {}, customizedViews = [], activeTemplateId = null) {
  let total = 0;
  let itemBase = parseFloat(basePrice) || 0;
  
  const breakdown = {
    basePrice: itemBase,
    views: {},
    template: 0,
    sizes: {},
    totalQty: 0,
    itemBase: 0
  };
  
  if (pricingRules && pricingRules.views) {
    customizedViews.forEach(view => {
      const upcharge = parseFloat(pricingRules.views[view]);
      if (!isNaN(upcharge) && upcharge > 0) {
        itemBase += upcharge;
        breakdown.views[view] = upcharge;
      }
    });
  }

  if (activeTemplateId && pricingRules && pricingRules.template_upcharge) {
    const templateUpcharge = parseFloat(pricingRules.template_upcharge);
    if (!isNaN(templateUpcharge) && templateUpcharge > 0) {
      itemBase += templateUpcharge;
      breakdown.template = templateUpcharge;
    }
  }

  breakdown.itemBase = itemBase;

  const sq = sizesQuantities || {};
  let totalQty = 0;
  
  Object.keys(sq).forEach(size => {
    const qty = parseInt(sq[size]) || 0;
    if (qty > 0) {
      totalQty += qty;
      let sizeUpcharge = 0;
      if (pricingRules && pricingRules.sizes) {
        const rule = pricingRules.sizes.find(r => r.size.trim().toLowerCase() === size.trim().toLowerCase());
        if (rule && !isNaN(parseFloat(rule.price))) {
          sizeUpcharge = parseFloat(rule.price);
        }
      }
      breakdown.sizes[size] = { qty, upcharge: sizeUpcharge, unitTotal: itemBase + sizeUpcharge, total: (itemBase + sizeUpcharge) * qty };
      total += (itemBase + sizeUpcharge) * qty;
    }
  });

  breakdown.totalQty = totalQty;

  if (totalQty === 0) {
    return { total: itemBase, breakdown };
  }

  return { total, breakdown };
}

function App() {
  // Screen routing
  const [screen, setScreen] = useState(() => {
    const data = window.cpdData;
    if (!data) return 'catalog';

    // If explicit start requested (from "Start Designing" button click)
    if (data.startRequested) return 'designer';

    // If on a product page but NO explicit start was requested, stay hidden
    // to prevent the tool from showing up automatically on scroll.
    if (data.isProductPage) return 'hidden';

    // Default: if productId provided by shortcode attribute, show designer
    return data.productId ? 'designer' : 'catalog';
  });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(() => {
    const data = window.cpdData;
    if (data && data.productId) {
      return {
        id: data.productId,
        name: data.productName || 'Custom Product',
        price: data.productPrice ? Number(data.productPrice) : 25,
        category: { id: data.productCategory || 'short-sleeve' },
        brand: '',
        rating: 5,
        reviews: 0,
        colors: [DEFAULT_PRODUCT_COLORS[0].hex] // default
      };
    }
    return null;
  });

  // Designer state
  const [activePanel, setActivePanel] = useState('upload');
  const [activeView, setActiveView] = useState('front');
  const [availableColors, setAvailableColors] = useState(DEFAULT_PRODUCT_COLORS);
  const [productColor, setProductColor] = useState(DEFAULT_PRODUCT_COLORS[0]);
  const isWordPress = typeof window.cpdData !== 'undefined';
  const isCapMode = isWordPress ? (window.cpdData?.productCategory === 'cap') : true;

  const [availableSizes, setAvailableSizes] = useState(SIZES);
  const [printAreas, setPrintAreas] = useState(isCapMode ? DEFAULT_CAP_PRINT_AREAS : DEFAULT_PRINT_AREAS);
  const [artLibrary, setArtLibrary] = useState([]);
  const [showDefaultArt, setShowDefaultArt] = useState(true);
  const [allowCustomColor, setAllowCustomColor] = useState(true);
  const [fullConfig, setFullConfig] = useState(null);
  const [pricingRules, setPricingRules] = useState({ views: {}, sizes: [] });
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const checkedTemplatesForSession = useRef(false);

  useEffect(() => {
    if (screen === 'designer' && selectedProduct?.id && !checkedTemplatesForSession.current) {
      checkedTemplatesForSession.current = true;
      const checkTpl = async () => {
        try {
          const response = await fetch(`${window.cpdData.restUrl}templates?product_id=${selectedProduct.id}`, {
            headers: { 'X-WP-Nonce': window.cpdData.nonce }
          });
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setActivePanel('templates');
            setIsTemplateModalOpen(true);
          }
        } catch (err) {}
      };
      checkTpl();
    }
  }, [screen, selectedProduct]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const productId = window.cpdData.productId || 0;
        const response = await fetch(`${window.cpdData.restUrl}config?product_id=${productId}&cb=${Date.now()}`, {
          headers: { 'X-WP-Nonce': window.cpdData.nonce }
        });
        const data = await response.json();
        setFullConfig(data);

        if (data.showDefaultArt !== undefined) {
          setShowDefaultArt(data.showDefaultArt);
        }
        const customAreas = data.printAreas;
        const defaultAreas = isCapMode ? DEFAULT_CAP_PRINT_AREAS : DEFAULT_PRINT_AREAS;

        if (customAreas && Object.keys(customAreas).length > 0) {
          setPrintAreas({ ...defaultAreas, ...customAreas });
        } else {
          setPrintAreas(defaultAreas);
        }

        if (data.pricing) {
          setPricingRules(data.pricing);
        }

        if (data.productMockups) {
          const availableViews = Object.keys(data.productMockups);
          if (availableViews.length > 0 && !availableViews.includes('front')) {
            setActiveView(availableViews[0]);
          }
        }
      } catch (err) {
      }
    };

    const fetchArtLibrary = async () => {
      try {
        const response = await fetch(`${window.cpdData.restUrl}art-library`, {
          headers: { 'X-WP-Nonce': window.cpdData.nonce }
        });
        const data = await response.json();
        setArtLibrary(data || []);
      } catch (err) {
      }
    };

    if (window.cpdData) {
      fetchConfig();
      fetchArtLibrary();
    }
  }, []);

  useEffect(() => {
    if (!fullConfig) return;
    setAvailableColors(fullConfig.colors && fullConfig.colors.length > 0 ? fullConfig.colors : DEFAULT_PRODUCT_COLORS);
    setAvailableSizes(fullConfig.sizes && fullConfig.sizes.length > 0 ? fullConfig.sizes : SIZES);
    if (fullConfig.colors && fullConfig.colors.length > 0) {
      setProductColor(fullConfig.colors[0]);
    } else {
      setProductColor(DEFAULT_PRODUCT_COLORS[0]);
    }
    setAllowCustomColor(fullConfig.allowCustomColor);
  }, [fullConfig]);

  const [canvasStates, setCanvasStates] = useState({
    front: null, back: null, rightSleeve: null, leftSleeve: null,
  });
  const canvasStatesRef = useRef({
    front: null, back: null, rightSleeve: null, leftSleeve: null,
  });
  const [canvasThumbnails, setCanvasThumbnails] = useState({
    front: null, back: null, rightSleeve: null, leftSleeve: null,
  });

  const [namesNumbers, setNamesNumbers] = useState([]);
  const [namesConfig, setNamesConfig] = useState({
    addNames: false, addNumbers: false,
    nameSide: 'Back', numberSide: 'Back',
    nameHeight: '2 in', numberHeight: '8 in',
    nameColor: '#ffffff', numberColor: '#ffffff',
    nameFontSize: 28, numberFontSize: 72,
  });

  const [sizesQuantities, setSizesQuantities] = useState({});
  const [customerNotes, setCustomerNotes] = useState('');

  const [activeTemplateId, setActiveTemplateId] = useState(null);

  const [customizationCount, setCustomizationCount] = useState(0);
  const canvasRef = useRef(null);

  const [histories, setHistories] = useState({
    front: [], back: [], rightSleeve: [], leftSleeve: [],
  });
  const [historyIndexes, setHistoryIndexes] = useState({
    front: -1, back: -1, rightSleeve: -1, leftSleeve: -1,
  });

  const [zoom, setZoom] = useState(1.2);

  // Effective zoom = user zoom state * mockup boost (if applicable)
  const mockupBoost = fullConfig?.productMockups ? 1.4 : 1.0;
  // Account for the fact that base logical resolution (1200) is already 2.4x the display size (500)
  const baseScale = DISPLAY_WIDTH / BASE_CANVAS_WIDTH; // 0.4166...
  const effectiveZoom = zoom * mockupBoost * baseScale;

  const activeViewRef = useRef('front');
  activeViewRef.current = activeView;

  const isSubmitting = useRef(false);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isSubmitting.current || screen !== 'designer') return;
      if (customizationCount > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [screen, customizationCount]);

  const generateThumbnail = useCallback(() => {
    if (!canvasRef.current) return;
    const thumb = canvasRef.current.toDataURL({ format: 'png', multiplier: 2 });
    setCanvasThumbnails(prev => ({ ...prev, [activeViewRef.current]: thumb }));
  }, []);

  const saveToHistory = useCallback(() => {
    if (!canvasRef.current) return;
    const json = JSON.stringify(canvasRef.current.toJSON(['data']));
    const view = activeViewRef.current;

    setHistories(prev => {
      const viewHistory = prev[view].slice(0, (historyIndexes[view] ?? -1) + 1);
      viewHistory.push(json);
      return { ...prev, [view]: viewHistory };
    });
    setHistoryIndexes(prev => ({
      ...prev,
      [view]: (prev[view] ?? -1) + 1,
    }));

    canvasStatesRef.current[view] = json;
    setCanvasStates(prev => ({ ...prev, [view]: json }));

    generateThumbnail();
  }, [generateThumbnail]);

  const incrementCustomizationCount = useCallback(() => {
    setCustomizationCount(prev => prev + 1);
  }, []);

  const switchView = useCallback((newView) => {
    return new Promise((resolve) => {
      if (!canvasRef.current) {
        setActiveView(newView);
        resolve();
        return;
      }
      const canvas = canvasRef.current;
      const currentView = activeViewRef.current;

      const currentJson = JSON.stringify(canvas.toJSON(['data']));
      canvasStatesRef.current[currentView] = currentJson;
      setCanvasStates(prev => ({ ...prev, [currentView]: currentJson }));

      const thumb = canvas.toDataURL({ format: 'png', multiplier: 1 });
      setCanvasThumbnails(prev => ({ ...prev, [currentView]: thumb }));

      activeViewRef.current = newView;
      setActiveView(newView);

      setTimeout(() => {
        if (!canvasRef.current) {
          resolve();
          return;
        }
        const targetState = canvasStatesRef.current[newView];
        if (targetState) {
          canvasRef.current.loadFromJSON(JSON.parse(targetState), () => {
            // Re-apply template locks after loading from JSON
            if (activeTemplateId) {
              const toConvert = [];
              canvasRef.current.getObjects().forEach(obj => {
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
                canvasRef.current.remove(obj);
                canvasRef.current.add(tb);
              });

              canvasRef.current.getObjects().forEach(obj => {
                if (obj.data?.editable === true) {
                  const isText = (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox');
                  const isImage = (obj.type === 'image');
                  obj.set({
                    selectable: true, evented: true,
                    hasControls: false, hasBorders: true,
                    lockMovementX: true, lockMovementY: true,
                    lockScalingX: true, lockScalingY: true,
                    lockRotation: true, lockScalingFlip: true,
                    lockSkewingX: true, lockSkewingY: true,
                    moveCursor: 'not-allowed',
                    borderColor: '#22c55e', cornerColor: '#22c55e',
                    borderScaleFactor: 2,
                    hoverCursor: isText ? 'text' : (isImage ? 'pointer' : 'not-allowed'),
                  });
                  if (isText) obj.set({ editable: true });
                  if (isImage && !obj.data._origDisplayW) {
                    obj.data._origDisplayW = obj.width * obj.scaleX;
                    obj.data._origDisplayH = obj.height * obj.scaleY;
                  }
                } else if (obj.data?.type !== 'clip-path' && obj.data?.type !== 'print-area') {
                  obj.set({
                    selectable: false, evented: false,
                    hasControls: false, hasBorders: false,
                    lockMovementX: true, lockMovementY: true,
                    hoverCursor: 'default',
                  });
                }
              });
            }
            canvasRef.current.renderAll();
            // Store originals for hard position enforcement
            if (canvasRef.current._storeTemplateOriginals) {
              canvasRef.current._storeTemplateOriginals();
            }
            const t = canvasRef.current.toDataURL({ format: 'png', multiplier: 1 });
            setCanvasThumbnails(prev => ({ ...prev, [newView]: t }));
            resolve();
          });
        } else {
          canvasRef.current.clear();
          canvasRef.current.backgroundColor = 'transparent';
          canvasRef.current.renderAll();
          resolve();
        }
      }, 50);
    });
  }, [activeTemplateId]);

  const undo = useCallback(() => {
    const view = activeViewRef.current;
    const idx = historyIndexes[view];
    if (idx > 0 && canvasRef.current) {
      const newIndex = idx - 1;
      canvasRef.current.loadFromJSON(JSON.parse(histories[view][newIndex]), () => {
        canvasRef.current.renderAll();
        generateThumbnail();
      });
      setHistoryIndexes(prev => ({ ...prev, [view]: newIndex }));
    }
  }, [histories, historyIndexes, generateThumbnail]);

  const redo = useCallback(() => {
    const view = activeViewRef.current;
    const idx = historyIndexes[view];
    if (idx < histories[view].length - 1 && canvasRef.current) {
      const newIndex = idx + 1;
      canvasRef.current.loadFromJSON(JSON.parse(histories[view][newIndex]), () => {
        canvasRef.current.renderAll();
        generateThumbnail();
      });
      setHistoryIndexes(prev => ({ ...prev, [view]: newIndex }));
    }
  }, [histories, historyIndexes, generateThumbnail]);

  const clearAll = useCallback(() => {
    if (!canvasRef.current) return;
    // Clear template position enforcement
    if (canvasRef.current._templateOriginals) {
      canvasRef.current._templateOriginals.clear();
    }
    canvasRef.current.clear();
    canvasRef.current.backgroundColor = 'transparent';
    canvasRef.current.renderAll();
    setActiveTemplateId(null);
    saveToHistory();
  }, [saveToHistory]);

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setScreen('list');
  };

  const handleSelectProduct = (product, cat) => {
    setSelectedProduct({ ...product, category: cat });
    setScreen('detail');
  };

  const handleStartDesigning = (product, cat, color) => {
    setSelectedProduct({ ...product, category: cat });
    const matching = availableColors.find(c => c.hex.toLowerCase() === color.toLowerCase());
    setProductColor(matching || { name: 'Selected', hex: color });
    setCustomizationCount(0);
    setActivePanel('upload');
    setActiveView('front');
    setCanvasStates({ front: null, back: null, rightSleeve: null, leftSleeve: null });
    canvasStatesRef.current = { front: null, back: null, rightSleeve: null, leftSleeve: null };
    setCanvasThumbnails({ front: null, back: null, rightSleeve: null, leftSleeve: null });
    setHistories({ front: [], back: [], rightSleeve: [], leftSleeve: [] });
    setHistoryIndexes({ front: -1, back: -1, rightSleeve: -1, leftSleeve: -1 });
    setNamesNumbers([]);
    setScreen('designer');
  };

  const contextValue = {
    activePanel, setActivePanel,
    activeView, setActiveView: switchView,
    productColor, setProductColor,
    canvasStates, setCanvasStates,
    canvasThumbnails, setCanvasThumbnails,
    canvasRef,
    namesNumbers, setNamesNumbers,
    namesConfig, setNamesConfig,
    saveToHistory,
    undo, redo, clearAll,
    historyIndex: historyIndexes[activeView] ?? -1,
    historyLength: histories[activeView]?.length ?? 0,
    zoom, setZoom,
    PRODUCT_COLORS: availableColors, SIZES: availableSizes, PRINT_AREAS: printAreas, PRICING_RULES: pricingRules,
    artLibrary, showDefaultArt, allowCustomColor,
    sizesQuantities, setSizesQuantities,
    customerNotes, setCustomerNotes,
    customizationCount, setCustomizationCount,
    incrementCustomizationCount,
    getCustomizedViews,
    calcPrice,
    selectedProduct, selectedCategory,
    screen, setScreen,
    generateThumbnail,
    isSubmitting,
    fullConfig, effectiveZoom,
    activeTemplateId, setActiveTemplateId,
    isTemplateModalOpen, setIsTemplateModalOpen,
  };

  return (
    <DesignContext.Provider value={contextValue}>
      {screen === 'catalog' && (
        <div className="cpd-full-page">
          <ProductCatalog onSelectCategory={handleSelectCategory} />
        </div>
      )}

      {screen === 'list' && selectedCategory && (
        <div className="cpd-full-page">
          <ProductList
            category={selectedCategory}
            onSelectProduct={handleSelectProduct}
            onBack={() => setScreen('catalog')}
          />
        </div>
      )}

      {screen === 'detail' && selectedProduct && (
        <div className="cpd-full-page">
          <ProductDetail
            product={selectedProduct}
            category={selectedProduct.category}
            availableColors={availableColors}
            availableSizes={availableSizes}
            onStartDesigning={handleStartDesigning}
            onBack={(to) => setScreen(to === 'list' ? 'list' : 'catalog')}
          />
        </div>
      )}

      {screen === 'designer' && (
        <div className="cpd-app cpd-fullscreen-mode">
          <div className="cpd-main-layout">
            <Sidebar />
            <div className="cpd-center">
              <Toolbar />
              <CanvasArea />
            </div>
            <ViewSwitcher />
          </div>
          <BottomBar />
        </div>
      )}
    </DesignContext.Provider>
  );
}

export default App;
