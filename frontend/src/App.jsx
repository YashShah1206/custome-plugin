import React, { useState, useRef, useCallback, createContext } from 'react';
import Sidebar from './components/Sidebar';
import CanvasArea from './components/CanvasArea';
import Toolbar from './components/Toolbar';
import ViewSwitcher from './components/ViewSwitcher';
import BottomBar from './components/BottomBar';
import ProductCatalog from './components/ProductCatalog';
import ProductList from './components/ProductList';
import ProductDetail from './components/ProductDetail';

export const DesignContext = createContext();

const PRODUCT_COLORS = [
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
const BASE_CANVAS_WIDTH = 500;
const BASE_CANVAS_HEIGHT = 600;

export const PRINT_AREAS = {
  // Front chest area — centered horizontally, just below collar
  front: {
    left: 146 / BASE_CANVAS_WIDTH,   // 0.28
    top: 133 / BASE_CANVAS_HEIGHT,  // 0.242
    width: 210 / BASE_CANVAS_WIDTH,   // 0.44
    height: 335 / BASE_CANVAS_HEIGHT,  // 0.425
  },
  // Back — same width/position, can start a little higher (no collar bump)
  back: {
    left: 146 / BASE_CANVAS_WIDTH,   // 0.28
    top: 133 / BASE_CANVAS_HEIGHT,  // 0.242
    width: 210 / BASE_CANVAS_WIDTH,   // 0.44
    height: 335 / BASE_CANVAS_HEIGHT,  // 0.425
  },
  // Right sleeve — upper arm printable zone in the side-view mockup
  rightSleeve: {
    left: 215 / BASE_CANVAS_WIDTH,    // move to left side
    top: 155 / BASE_CANVAS_HEIGHT,
    width: 75 / BASE_CANVAS_WIDTH,
    height: 105 / BASE_CANVAS_HEIGHT,
  },

  // ✅ Left sleeve (mirror of right)
  leftSleeve: {
    left: 230 / BASE_CANVAS_WIDTH,    // move to left side
    top: 155 / BASE_CANVAS_HEIGHT,
    width: 75 / BASE_CANVAS_WIDTH,
    height: 105 / BASE_CANVAS_HEIGHT,
  },
};





export function calcPrice(itemCount, basePrice = 25) {
  // Return basePrice without any increments for artwork/images
  return basePrice;
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
        brand: '',
        rating: 5,
        reviews: 0,
        colors: [PRODUCT_COLORS[6].hex] // default
      };
    }
    return null;
  });

  // Designer state
  const [activePanel, setActivePanel] = useState('upload');
  const [activeView, setActiveView] = useState('front');
  const [productColor, setProductColor] = useState(PRODUCT_COLORS[6]);

  // Per-view canvas states (JSON strings)
  const [canvasStates, setCanvasStates] = useState({
    front: null, back: null, rightSleeve: null, leftSleeve: null,
  });
  const canvasStatesRef = useRef({
    front: null, back: null, rightSleeve: null, leftSleeve: null,
  });
  // Per-view thumbnails for 3D decal
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

  const [customizationCount, setCustomizationCount] = useState(0);
  const canvasRef = useRef(null);

  // Per-view history
  const [histories, setHistories] = useState({
    front: [], back: [], rightSleeve: [], leftSleeve: [],
  });
  const [historyIndexes, setHistoryIndexes] = useState({
    front: -1, back: -1, rightSleeve: -1, leftSleeve: -1,
  });

  const [zoom, setZoom] = useState(1);
  const activeViewRef = useRef('front');
  activeViewRef.current = activeView;

  // Generate a thumbnail (for 3D decal) from the current canvas
  const generateThumbnail = useCallback(() => {
    if (!canvasRef.current) return;
    const thumb = canvasRef.current.toDataURL({ format: 'png', multiplier: 1 });
    setCanvasThumbnails(prev => ({ ...prev, [activeViewRef.current]: thumb }));
  }, []);

  // Save current canvas state to history
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

    // Save canvas state for this view
    canvasStatesRef.current[view] = json;
    setCanvasStates(prev => ({ ...prev, [view]: json }));

    // Generate the thumbnail for 3D
    generateThumbnail();
  }, [generateThumbnail]);

  const incrementCustomizationCount = useCallback(() => {
    setCustomizationCount(prev => prev + 1);
  }, []);

  // Switch view with state save/restore
  const switchView = useCallback((newView) => {
    return new Promise((resolve) => {
      if (!canvasRef.current) {
        setActiveView(newView);
        resolve();
        return;
      }
      const canvas = canvasRef.current;
      const currentView = activeViewRef.current;

      // Save current canvas state
      const currentJson = JSON.stringify(canvas.toJSON(['data']));
      canvasStatesRef.current[currentView] = currentJson;
      setCanvasStates(prev => ({ ...prev, [currentView]: currentJson }));

      // Generate thumbnail for current view before switching
      const thumb = canvas.toDataURL({ format: 'png', multiplier: 1 });
      setCanvasThumbnails(prev => ({ ...prev, [currentView]: thumb }));

      // Activate new view (Instantly update Ref to prevent race conditions)
      activeViewRef.current = newView;
      setActiveView(newView);

      // Restore the new view's state (on next tick so React updates activeView)
      setTimeout(() => {
        if (!canvasRef.current) {
          resolve();
          return;
        }
        const targetState = canvasStatesRef.current[newView];
        if (targetState) {
          canvasRef.current.loadFromJSON(JSON.parse(targetState), () => {
            canvasRef.current.renderAll();
            // Generate thumbnail for restored view
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
  }, []);

  // Undo for current view
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

  // Redo for current view
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

  // Clear all objects on current view
  const clearAll = useCallback(() => {
    if (!canvasRef.current) return;
    canvasRef.current.clear();
    canvasRef.current.backgroundColor = 'transparent';
    canvasRef.current.renderAll();
    saveToHistory();
  }, [saveToHistory]);

  // Navigation handlers
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
    const matching = PRODUCT_COLORS.find(c => c.hex.toLowerCase() === color.toLowerCase());
    setProductColor(matching || { name: 'Custom', hex: color });
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
    PRODUCT_COLORS, SIZES, PRINT_AREAS,
    sizesQuantities, setSizesQuantities,
    customerNotes, setCustomerNotes,
    customizationCount, setCustomizationCount,
    incrementCustomizationCount,
    selectedProduct, selectedCategory,
    screen, setScreen,
    generateThumbnail,
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
