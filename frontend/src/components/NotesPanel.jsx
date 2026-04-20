import React, { useContext } from 'react';
import { DesignContext } from '../App';

function NotesPanel() {
  const { customerNotes, setCustomerNotes } = useContext(DesignContext);

  return (
    <div className="cpd-panel-inner">
      <div className="cpd-text-tool-group">
        <label>Extra Design Instructions</label>
        <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '12px', lineHeight: '1.4' }}>
          Tell us about any specific placement, scaling, or color requirements that weren't possible in the tool.
        </p>
        <textarea
          className="cpd-text-input"
          style={{ minHeight: '180px', resize: 'vertical' }}
          placeholder="Type your notes here... (e.g. Please center the artwork 2 inches below the collar)"
          value={customerNotes}
          onChange={(e) => setCustomerNotes(e.target.value)}
        />
      </div>
      
      <div className="cpd-upload-note" style={{ marginTop: '10px' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>Your notes will be saved with the design and shared with our fulfillment team.</span>
      </div>
    </div>
  );
}

export default NotesPanel;
