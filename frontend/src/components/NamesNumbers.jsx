import React, { useContext, useState } from 'react';
import { DesignContext, PRINT_AREAS } from '../App';
import { fabric } from 'fabric';

const NAME_FONTS = ['Inter', 'Montserrat', 'Bebas Neue', 'Anton', 'Oswald', 'Bangers', 'Lobster', 'Righteous'];

export default function NamesNumbers() {
  const {
    namesConfig, setNamesConfig, namesNumbers, setNamesNumbers,
    SIZES, canvasRef, setActiveView, activeView, saveToHistory,
    incrementCustomizationCount, canvasStates, setCanvasStates,
  } = useContext(DesignContext);
  const [step, setStep] = useState(1);
  const [applied, setApplied] = useState(false);

  const updateConfig = (key, value) => setNamesConfig(prev => ({ ...prev, [key]: value }));

  const addRow = () => setNamesNumbers(prev => [...prev, { name: '', number: '', size: 'M' }]);
  const removeRow = (index) => setNamesNumbers(prev => prev.filter((_, i) => i !== index));
  const updateRow = (index, field, value) =>
    setNamesNumbers(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));

  const applyToDesign = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const heightMap = { '1 in': 24, '2 in': 32, '3 in': 42, '4 in': 52, '6 in': 68, '8 in': 88, '10 in': 108 };

    // First, remove any previously applied names/numbers
    const toRemove = canvas.getObjects().filter(o => o.data && (o.data.type === 'name' || o.data.type === 'number'));
    toRemove.forEach(o => canvas.remove(o));

    // Determine the target side for names
    const nameSide = namesConfig.nameSide.toLowerCase();
    const numberSide = namesConfig.numberSide.toLowerCase();

    // We'll directly add to the current view — user should switch to the correct side first
    // or we switch for them
    const targetSide = namesConfig.addNames ? nameSide : numberSide;

    // Switch to the target side
    if (activeView !== targetSide) {
      setActiveView(targetSide);
    }

    setTimeout(() => {
      if (!canvasRef.current) return;
      const cv = canvasRef.current;
      const area = PRINT_AREAS[targetSide] || PRINT_AREAS.front;
      const centerX = area.left + area.width / 2;

      namesNumbers.forEach((row, idx) => {
        let yOffset = area.top + 40 + idx * 60;

        if (namesConfig.addNames && row.name) {
          const nameObj = new fabric.IText(row.name, {
            left: centerX,
            top: yOffset,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Bebas Neue',
            fontSize: heightMap[namesConfig.nameHeight] || 32,
            fill: namesConfig.nameColor,
            fontWeight: 'bold',
            textAlign: 'center',
            cornerStyle: 'circle',
            cornerColor: '#4361ee',
            cornerSize: 10,
            transparentCorners: false,
            borderColor: '#4361ee',
            data: { type: 'name', rowIndex: idx },
          });
          cv.add(nameObj);
        }

        if (namesConfig.addNumbers && row.number) {
          const numObj = new fabric.IText(row.number, {
            left: centerX,
            top: yOffset + (namesConfig.addNames && row.name ? 30 : 0),
            originX: 'center',
            originY: 'center',
            fontFamily: 'Bebas Neue',
            fontSize: heightMap[namesConfig.numberHeight] || 88,
            fill: namesConfig.numberColor,
            fontWeight: 'bold',
            textAlign: 'center',
            cornerStyle: 'circle',
            cornerColor: '#4361ee',
            cornerSize: 10,
            transparentCorners: false,
            borderColor: '#4361ee',
            data: { type: 'number', rowIndex: idx },
          });
          cv.add(numObj);
        }
      });

      cv.renderAll();
      saveToHistory();
    }, 200);

    setApplied(true);
    incrementCustomizationCount?.();
  };

  const heights = ['1 in', '2 in', '3 in', '4 in', '6 in', '8 in', '10 in'];

  return (
    <div>
      {/* Step 1 */}
      <div className="cpd-nn-step">
        <h4 className="cpd-nn-step-title">Step 1: Configure</h4>

        <div className="cpd-nn-checkboxes">
          <label className="cpd-nn-checkbox">
            <input type="checkbox" checked={namesConfig.addNames}
              onChange={(e) => updateConfig('addNames', e.target.checked)} />
            <span>Add Names</span>
          </label>
          <label className="cpd-nn-checkbox">
            <input type="checkbox" checked={namesConfig.addNumbers}
              onChange={(e) => updateConfig('addNumbers', e.target.checked)} />
            <span>Add Numbers</span>
          </label>
        </div>

        {(namesConfig.addNames || namesConfig.addNumbers) && (
          <div className="cpd-nn-config-grid">
            {namesConfig.addNames && (
              <>
                <div className="cpd-nn-config-item">
                  <label>Side (Names)</label>
                  <select value={namesConfig.nameSide} onChange={(e) => updateConfig('nameSide', e.target.value)}>
                    <option>Front</option><option>Back</option><option>Sleeve</option>
                  </select>
                </div>
                <div className="cpd-nn-config-item">
                  <label>Height (Names)</label>
                  <select value={namesConfig.nameHeight} onChange={(e) => updateConfig('nameHeight', e.target.value)}>
                    {heights.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
                <div className="cpd-nn-config-item">
                  <label>Color (Names)</label>
                  <input type="color" value={namesConfig.nameColor}
                    onChange={(e) => updateConfig('nameColor', e.target.value)}
                    style={{ height: '34px', padding: '2px', cursor: 'pointer', width: '100%' }}
                  />
                </div>
                <div className="cpd-nn-config-item">
                  <label>Font Size</label>
                  <input type="range" min="16" max="80" value={namesConfig.nameFontSize || 28}
                    onChange={e => updateConfig('nameFontSize', Number(e.target.value))} />
                  <span style={{ fontSize: '11px', color: '#888' }}>{namesConfig.nameFontSize || 28}px</span>
                </div>
              </>
            )}

            {namesConfig.addNumbers && (
              <>
                <div className="cpd-nn-config-item">
                  <label>Side (Numbers)</label>
                  <select value={namesConfig.numberSide} onChange={(e) => updateConfig('numberSide', e.target.value)}>
                    <option>Front</option><option>Back</option><option>Sleeve</option>
                  </select>
                </div>
                <div className="cpd-nn-config-item">
                  <label>Height (Numbers)</label>
                  <select value={namesConfig.numberHeight} onChange={(e) => updateConfig('numberHeight', e.target.value)}>
                    {heights.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
                <div className="cpd-nn-config-item">
                  <label>Color (Numbers)</label>
                  <input type="color" value={namesConfig.numberColor}
                    onChange={(e) => updateConfig('numberColor', e.target.value)}
                    style={{ height: '34px', padding: '2px', cursor: 'pointer', width: '100%' }}
                  />
                </div>
                <div className="cpd-nn-config-item">
                  <label>Font Size</label>
                  <input type="range" min="24" max="120" value={namesConfig.numberFontSize || 72}
                    onChange={e => updateConfig('numberFontSize', Number(e.target.value))} />
                  <span style={{ fontSize: '11px', color: '#888' }}>{namesConfig.numberFontSize || 72}px</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Step 2 Button */}
      {(namesConfig.addNames || namesConfig.addNumbers) && step === 1 && (
        <button className="cpd-nn-step2-btn" onClick={() => { setStep(2); if (!namesNumbers.length) addRow(); }}>
          Step 2: Enter Names / Numbers →
        </button>
      )}

      {/* Pricing info */}
      {step === 1 && (
        <div className="cpd-nn-info">
          <p><strong>Full list required for accurate pricing</strong></p>
          {namesConfig.addNames && <p>Names: $5.50 each</p>}
          {namesConfig.addNumbers && <p>Numbers: $3.50 each</p>}
          <ul>
            <li>Our artists will place each name/number from your list</li>
            <li>Names/numbers may be printed or vinyl</li>
          </ul>
        </div>
      )}

      {/* Step 2: entry table */}
      {step === 2 && (
        <div className="cpd-nn-step">
          <h4 className="cpd-nn-step-title">Step 2: Enter Names &amp; Numbers</h4>
          <button className="cpd-nn-back-btn" onClick={() => setStep(1)}>← Back to Step 1</button>

          <div className="cpd-nn-table-wrap">
            <table className="cpd-nn-table">
              <thead>
                <tr>
                  <th>#</th>
                  {namesConfig.addNames && <th>Name</th>}
                  {namesConfig.addNumbers && <th>Number</th>}
                  <th>Size</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {namesNumbers.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ color: '#888', fontSize: '12px' }}>{idx + 1}</td>
                    {namesConfig.addNames && (
                      <td>
                        <input type="text" className="cpd-nn-input" placeholder="e.g. SMITH"
                          value={row.name} onChange={(e) => updateRow(idx, 'name', e.target.value)} />
                      </td>
                    )}
                    {namesConfig.addNumbers && (
                      <td>
                        <input type="text" className="cpd-nn-input" placeholder="e.g. 23"
                          value={row.number} onChange={(e) => updateRow(idx, 'number', e.target.value)} />
                      </td>
                    )}
                    <td>
                      <select className="cpd-nn-select" value={row.size}
                        onChange={(e) => updateRow(idx, 'size', e.target.value)}>
                        {SIZES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className="cpd-nn-remove-btn" onClick={() => removeRow(idx)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="cpd-nn-add-row" onClick={addRow}>+ Add Row</button>

          {namesNumbers.length > 0 && (
            <button className="cpd-nn-apply-btn" onClick={applyToDesign}>
              {applied ? '✓ Reapply to Design' : '✓ Apply Names/Numbers to Design'}
            </button>
          )}

          {applied && (
            <div className="cpd-nn-applied-notice">
              ✓ Names/Numbers added to your design! Switch to the correct view to see them.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
