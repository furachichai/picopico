import React, { useState } from 'react';
import { CrateWithLetter } from '../../utils/crateUtils.jsx';
import { SackWithNumber } from '../../utils/sackUtils.jsx';
import { WeightRingGlyph } from '../../cartridges/Balanza/game/WeightGlyph';

export function ShortcutsReminderModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('math');
  const [copiedKey, setCopiedKey] = useState(null);

  if (!isOpen) return null;

  const handleCopy = (text, key) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch (_) {}
  };

  const tabs = [
    { id: 'math', label: '🧮 Math & Exponents' },
    { id: 'crates', label: '📦 Wooden Crates' },
    { id: 'weights', label: '⚖️ Scale & Weights' },
    { id: 'emojis', label: '😀 Icons & Emojis' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(580px, 96vw)',
          maxHeight: 'min(640px, 90vh)',
          backgroundColor: '#1e1b3a',
          border: '1.5px solid rgba(167, 139, 250, 0.45)',
          borderRadius: '20px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>⌨️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                SHORTCUTS & CODES REMINDER
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                Writing math, crates, weights & emojis in Picopico
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.75)',
              borderRadius: '8px',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              transition: 'background 0.2s'
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            overflowX: 'auto'
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'rgba(255, 255, 255, 0.06)',
                border: activeTab === tab.id ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                color: activeTab === tab.id ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                padding: '6px 12px',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div
          style={{
            padding: '16px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* TAB 1: MATH */}
          {activeTab === 'math' && (
            <>
              <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', padding: '10px 12px', fontSize: '0.78rem', color: '#c7d2fe' }}>
                💡 <strong>Tip:</strong> In text elements, type the shortcut code and press <strong>Cmd + E</strong> (or <strong>Ctrl + E</strong> on Windows) to convert it immediately. In quiz fields, shortcuts format automatically!
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                <ShortcutItem
                  code="2!(4) or 2!4"
                  preview="2⁴"
                  desc="Positive exponent / power"
                  onCopy={() => handleCopy('2!(4)', 'exp1')}
                  copied={copiedKey === 'exp1'}
                />
                <ShortcutItem
                  code="2!(-4) or 2!(−4)"
                  preview="2⁻⁴"
                  desc="Negative exponent / power"
                  onCopy={() => handleCopy('2!(-4)', 'exp2')}
                  copied={copiedKey === 'exp2'}
                />
                <ShortcutItem
                  code="x^2 or 10^3"
                  preview="x², 10³"
                  desc="Standard caret power"
                  onCopy={() => handleCopy('x^2', 'exp3')}
                  copied={copiedKey === 'exp3'}
                />
                <ShortcutItem
                  code="!."
                  preview="·"
                  desc="Multiplication middle dot"
                  onCopy={() => handleCopy('!.', 'dot')}
                  copied={copiedKey === 'dot'}
                />
                <ShortcutItem
                  code="*"
                  preview="×"
                  desc="Multiplication cross"
                  onCopy={() => handleCopy('*', 'mult')}
                  copied={copiedKey === 'mult'}
                />
                <ShortcutItem
                  code="/"
                  preview="÷"
                  desc="Division symbol"
                  onCopy={() => handleCopy('/', 'div')}
                  copied={copiedKey === 'div'}
                />
                <ShortcutItem
                  code="!="
                  preview="≠"
                  desc="Not equal to sign"
                  onCopy={() => handleCopy('!=', 'neq')}
                  copied={copiedKey === 'neq'}
                />
                <ShortcutItem
                  code="1!/2 or 3!/4"
                  preview="½, ¾"
                  desc="Vulgar fractions"
                  onCopy={() => handleCopy('1!/2', 'frac1')}
                  copied={copiedKey === 'frac1'}
                />
                <ShortcutItem
                  code="!(x+1)/2"
                  preview="½(x+1)"
                  desc="Stacked fraction syntax"
                  onCopy={() => handleCopy('!(x+1)/2', 'frac2')}
                  copied={copiedKey === 'frac2'}
                />
              </div>
            </>
          )}

          {/* TAB 2: WOODEN CRATES */}
          {activeTab === 'crates' && (
            <>
              <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '10px', padding: '10px 12px', fontSize: '0.78rem', color: '#fef08a' }}>
                📦 <strong>Wooden Crates:</strong> Enter a variable in brackets (e.g. <code>[x]</code> or <code>[c]</code>) or with <code>📦</code>. A rustic wooden crate (<code>item_crate_side_1x1_001.png</code>) marked with a white letter will render on both scale games!
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                <ShortcutItem
                  code="[x]"
                  customVisual={<CrateWithLetter letter="x" size={32} />}
                  desc="Wooden crate marked with white letter 'x'"
                  onCopy={() => handleCopy('[x]', 'crate_x')}
                  copied={copiedKey === 'crate_x'}
                />
                <ShortcutItem
                  code="[c]"
                  customVisual={<CrateWithLetter letter="c" size={32} />}
                  desc="Wooden crate marked with white letter 'c'"
                  onCopy={() => handleCopy('[c]', 'crate_c')}
                  copied={copiedKey === 'crate_c'}
                />
                <ShortcutItem
                  code="[t]"
                  customVisual={<CrateWithLetter letter="t" size={32} />}
                  desc="Wooden crate marked with white letter 't'"
                  onCopy={() => handleCopy('[t]', 'crate_t')}
                  copied={copiedKey === 'crate_t'}
                />
                <ShortcutItem
                  code="2[c] or 3[x]"
                  customVisual={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#ffffff' }}>2</span>
                      <CrateWithLetter letter="c" size={26} />
                    </span>
                  }
                  desc="Multiple lettered crates with count"
                  onCopy={() => handleCopy('2[c]', 'crate_2c')}
                  copied={copiedKey === 'crate_2c'}
                />
                <ShortcutItem
                  code="📦x or 📦c"
                  customVisual={<CrateWithLetter letter="c" size={32} />}
                  desc="Alternative box emoji code for crates"
                  onCopy={() => handleCopy('📦c', 'crate_box_c')}
                  copied={copiedKey === 'crate_box_c'}
                />
                <ShortcutItem
                  code="[?]"
                  customVisual={<CrateWithLetter letter="?" size={32} />}
                  desc="Mystery question-mark crate"
                  onCopy={() => handleCopy('[?]', 'crate_q')}
                  copied={copiedKey === 'crate_q'}
                />
                <ShortcutItem
                  code="📦 or crate"
                  customVisual={<CrateWithLetter letter="" size={32} />}
                  desc="Plain wooden crate without letter"
                  onCopy={() => handleCopy('📦', 'crate_plain')}
                  copied={copiedKey === 'crate_plain'}
                />
                <ShortcutItem
                  code="[a] to [z]"
                  customVisual={<CrateWithLetter letter="A" size={32} />}
                  desc="Supports any letter or variable name!"
                  onCopy={() => handleCopy('[a]', 'crate_a')}
                  copied={copiedKey === 'crate_a'}
                />
              </div>
            </>
          )}

          {/* TAB 3: WEIGHTS & SCALE */}
          {activeTab === 'weights' && (
            <>
              <div style={{ backgroundColor: 'rgba(52, 211, 153, 0.12)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '10px', padding: '10px 12px', fontSize: '0.78rem', color: '#a7f3d0' }}>
                ⚖️ <strong>Scale Weights:</strong> The scale tilts realistically according to the total weight of both plates. You can define weights in multiple ways:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                <ShortcutItem
                  code="s5 or s10"
                  customVisual={<SackWithNumber value={5} size={30} />}
                  desc="White flour sack with number (s1, s5, s10, s12, s20, sack5, flour5)"
                  onCopy={() => handleCopy('s5', 's5')}
                  copied={copiedKey === 's5'}
                />
                <ShortcutItem
                  code="2s5 or 3s10"
                  customVisual={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontWeight: 900, color: '#ffffff' }}>2</span>
                      <SackWithNumber value={5} size={26} />
                    </span>
                  }
                  desc="Count + flour sack (2 sacks of 5 = 10, kitchen weight)"
                  onCopy={() => handleCopy('2s5', '2s5')}
                  copied={copiedKey === '2s5'}
                />
                <ShortcutItem
                  code="w5 or w10"
                  customVisual={<WeightRingGlyph value={5} size={28} />}
                  desc="Weight token shortcut (w1, w2, w3, w5, w10, w12, w20, w50)"
                  onCopy={() => handleCopy('w5', 'w5')}
                  copied={copiedKey === 'w5'}
                />
                <ShortcutItem
                  code="2w5 or 3w10"
                  customVisual={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontWeight: 900, color: '#ffffff' }}>2</span>
                      <WeightRingGlyph value={5} size={24} />
                    </span>
                  }
                  desc="Count + weight token (2 weights of 5 = 10)"
                  onCopy={() => handleCopy('2w5', '2w5')}
                  copied={copiedKey === '2w5'}
                />
                <ShortcutItem
                  code="☕=3, 🌮=5"
                  preview="☕(3) + 🌮(5)"
                  desc="Inline weights inside Left Plate without extra settings"
                  onCopy={() => handleCopy('☕=3, 🌮=5', 'inline_w')}
                  copied={copiedKey === 'inline_w'}
                />
                <ShortcutItem
                  code="c=3, t=5"
                  preview="c: 3, t: 5"
                  desc="Weights definition field (comma or semicolon separated)"
                  onCopy={() => handleCopy('c=3, t=5', 'weights_def')}
                  copied={copiedKey === 'weights_def'}
                />
                <ShortcutItem
                  code="*2c* + *t*"
                  preview="2 blanks"
                  desc="Target Expression: blanks wrapped in *stars*"
                  onCopy={() => handleCopy('*2c* + *t*', 'blanks')}
                  copied={copiedKey === 'blanks'}
                />
                <ShortcutItem
                  code="2c, t, 2t, 3t, c+c"
                  preview="Bottom Tray"
                  desc="Cards field: comma-separated choices for bottom tray"
                  onCopy={() => handleCopy('2c, t, 2t, 3t, c+c', 'choices')}
                  copied={copiedKey === 'choices'}
                />
                <ShortcutItem
                  code="# Fields: 3"
                  preview="_ + _ + _"
                  desc="Sets number of answer fields on plate (e.g. x + 2 + 4 = x + 6)"
                  onCopy={() => handleCopy('3', 'num_fields')}
                  copied={copiedKey === 'num_fields'}
                />
              </div>
            </>
          )}

          {/* TAB 4: EMOJIS */}
          {activeTab === 'emojis' && (
            <>
              <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.12)', border: '1px solid rgba(236, 72, 153, 0.3)', borderRadius: '10px', padding: '10px 12px', fontSize: '0.78rem', color: '#fbcfe8' }}>
                😀 <strong>Adding Emojis:</strong> Type <code>:shortcode:</code> directly into the text fields, or use the native Mac shortcut <strong>Cmd + Control + Space</strong>!
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                <ShortcutItem
                  code=":coffee: or :cafe:"
                  preview="☕"
                  desc="Coffee cup emoji"
                  onCopy={() => handleCopy(':coffee:', 'em_coffee')}
                  copied={copiedKey === 'em_coffee'}
                />
                <ShortcutItem
                  code=":taco:"
                  preview="🌮"
                  desc="Taco food emoji"
                  onCopy={() => handleCopy(':taco:', 'em_taco')}
                  copied={copiedKey === 'em_taco'}
                />
                <ShortcutItem
                  code=":apple: or :manzana:"
                  preview="🍎"
                  desc="Red apple emoji"
                  onCopy={() => handleCopy(':apple:', 'em_apple')}
                  copied={copiedKey === 'em_apple'}
                />
                <ShortcutItem
                  code=":banana: or :platano:"
                  preview="🍌"
                  desc="Banana fruit emoji"
                  onCopy={() => handleCopy(':banana:', 'em_banana')}
                  copied={copiedKey === 'em_banana'}
                />
                <ShortcutItem
                  code=":pizza:"
                  preview="🍕"
                  desc="Pizza slice emoji"
                  onCopy={() => handleCopy(':pizza:', 'em_pizza')}
                  copied={copiedKey === 'em_pizza'}
                />
                <ShortcutItem
                  code=":star: or :estrella:"
                  preview="⭐"
                  desc="Star symbol emoji"
                  onCopy={() => handleCopy(':star:', 'em_star')}
                  copied={copiedKey === 'em_star'}
                />
                <ShortcutItem
                  code=":fire: or :fuego:"
                  preview="🔥"
                  desc="Fire flame emoji"
                  onCopy={() => handleCopy(':fire:', 'em_fire')}
                  copied={copiedKey === 'em_fire'}
                />
                <ShortcutItem
                  code="Cmd + Ctrl + Space"
                  preview="🌐 Palette"
                  desc="Native macOS emoji search window in any input"
                  onCopy={() => handleCopy('Cmd + Ctrl + Space', 'mac_em')}
                  copied={copiedKey === 'mac_em'}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.72rem',
            color: 'rgba(255, 255, 255, 0.5)'
          }}
        >
          <span>Click any code card to copy it to clipboard</span>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              color: '#ffffff',
              padding: '5px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ShortcutItem({ code, preview, customVisual, desc, onCopy, copied }) {
  return (
    <div
      onClick={onCopy}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: copied ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '9px 12px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        position: 'relative'
      }}
      title="Click to copy code"
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.09)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0, paddingRight: '8px' }}>
        <code
          style={{
            fontFamily: 'monospace',
            fontWeight: 800,
            fontSize: '0.88rem',
            color: '#a5b4fc',
            wordBreak: 'break-all'
          }}
        >
          {code}
        </code>
        <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.65)' }}>{desc}</span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '38px',
          height: '38px',
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          borderRadius: '8px',
          padding: '2px 6px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '1.05rem',
          fontWeight: 900,
          color: '#ffffff'
        }}
      >
        {copied ? (
          <span style={{ color: '#34d399', fontSize: '0.8rem', fontWeight: 800 }}>✓ Copied</span>
        ) : (
          customVisual ?? preview
        )}
      </div>
    </div>
  );
}

export default ShortcutsReminderModal;
