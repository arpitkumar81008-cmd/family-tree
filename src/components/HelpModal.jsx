import React, { useEffect } from 'react';

export function HelpModal({ lang, close }) {
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  const isHi = lang === "hi";

  return (
    <div
      className="overlay"
      onClick={e => {
        if (e.target === e.currentTarget) close();
      }}
      onMouseDown={e => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="x"
          type="button"
          aria-label={isHi ? "बंद करें" : "Close"}
          onClick={close}
        >
          ×
        </button>
        <h2 id="help-title">
          {isHi ? "मार्गदर्शिका एवं कीबोर्ड शॉर्टकट" : "Navigation & Keyboard Shortcuts"}
        </h2>
        <table className="help-table">
          <thead>
            <tr>
              <th>{isHi ? "कार्य" : "Action"}</th>
              <th>{isHi ? "शॉर्टकट / नियंत्रण" : "Shortcut / Control"}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{isHi ? "परिवारजन खोजें" : "Quick Search"}</td>
              <td><kbd>/</kbd></td>
            </tr>
            <tr>
              <td>{isHi ? "कार्ड्स में घूमें" : "Navigate Between Cards"}</td>
              <td><kbd>↑ ↓ ← →</kbd></td>
            </tr>
            <tr>
              <td>{isHi ? "विवरण देखें" : "Open Person Details"}</td>
              <td><kbd>Enter / Click</kbd></td>
            </tr>
            <tr>
              <td>{isHi ? "दिशात्मक शाखा देखें" : "View Directional Flowchart"}</td>
              <td>{isHi ? "★ शाखा देखें बटन" : "★ View Tree"}</td>
            </tr>
            <tr>
              <td>{isHi ? "ज़ूम इन / आउट" : "Zoom In / Out"}</td>
              <td><kbd>+ / −</kbd></td>
            </tr>
            <tr>
              <td>{isHi ? "स्क्रीन में फ़िट करें" : "Fit Tree to View"}</td>
              <td>Fit</td>
            </tr>
            <tr>
              <td>{isHi ? "डायलॉग बंद करें" : "Close Window"}</td>
              <td><kbd>Esc</kbd></td>
            </tr>
            <tr>
              <td>{isHi ? "यह सहायता देखें" : "Toggle This Guide"}</td>
              <td><kbd>?</kbd></td>
            </tr>
          </tbody>
        </table>
        <button
          className="btn"
          type="button"
          onClick={close}
          style={{ marginTop: "14px", width: "100%" }}
        >
          {isHi ? "समझ गया" : "Got It"}
        </button>
      </div>
    </div>
  );
}

export default HelpModal;
