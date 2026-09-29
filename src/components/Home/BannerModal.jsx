import React, { useState, useEffect } from 'react';
import { resolveAssetUrl } from '../../utils/assetUrl';

const POPULAR_AVATARS = [
  { label: 'None', path: '' },
  { label: 'Yara Happy', path: '/src/assets/characters/yara_avatar_happy.png' },
  { label: 'Yara Calm', path: '/src/assets/characters/yara_avatar_calm.png' },
  { label: 'Chef', path: '/src/assets/characters/avatar_chef.png' },
  { label: 'Pesto', path: '/src/assets/characters/avatar_pesto.png' },
  { label: 'Dilla', path: '/src/assets/characters/avatar_dilla.png' },
  { label: 'Wizard Cauldron', path: '/src/assets/characters/wizard stirs cauldron.png' },
  { label: 'Wizard Exponents', path: '/src/assets/characters/wizard_goblet_exponents.png' },
  { label: 'Wooden Scale', path: '/src/assets/characters/balanza_wooden_scale.png' },
  { label: 'Potion', path: '/assets/graphics/icon_potion.png' },
  { label: 'Textbook', path: '/assets/graphics/icon_textbook.png' }
];

const BG_COLOR_PALETTE = [
  { label: 'White', color: '#FFFFFF' },
  { label: 'Yellow', color: '#FEF08A' },
  { label: 'Peach', color: '#FED7AA' },
  { label: 'Pink', color: '#FECDD3' },
  { label: 'Lavender', color: '#E9D5FF' },
  { label: 'Sky', color: '#BAE6FD' },
  { label: 'Mint', color: '#A7F3D0' },
  { label: 'Dark Slate', color: '#1E293B' },
  { label: 'Black', color: '#000000' }
];

const TEXT_COLOR_PALETTE = [
  { label: 'Black', color: '#000000' },
  { label: 'Slate', color: '#1E293B' },
  { label: 'White', color: '#FFFFFF' },
  { label: 'Purple', color: '#7C3AED' },
  { label: 'Red', color: '#DC2626' },
  { label: 'Blue', color: '#2563EB' },
  { label: 'Emerald', color: '#059669' },
  { label: 'Amber', color: '#D97706' }
];

const BORDER_COLOR_PALETTE = [
  { label: 'Pure Black', color: '#000000' },
  { label: 'Dark Slate', color: '#1E293B' },
  { label: 'Charcoal', color: '#334155' },
  { label: 'Slate Gray', color: '#64748B' },
  { label: 'Pure White', color: '#FFFFFF' },
  { label: 'Royal Purple', color: '#7C3AED' },
  { label: 'Cyan', color: '#06B6D4' },
  { label: 'Blue', color: '#2563EB' },
  { label: 'Emerald', color: '#059669' },
  { label: 'Amber', color: '#D97706' },
  { label: 'Crimson', color: '#DC2626' },
  { label: 'Hot Pink', color: '#EC4899' }
];

const BannerModal = ({
  isOpen,
  banner,
  lessons = [],
  defaultBorderColor = '#000000',
  onSave,
  onDelete,
  onClose
}) => {
  const [title, setTitle] = useState('');
  const [beforeLesson, setBeforeLesson] = useState('START');
  const [leftImage, setLeftImage] = useState('');
  const [rightImage, setRightImage] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [textColor, setTextColor] = useState('#000000');
  const [borderColor, setBorderColor] = useState('#000000');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (banner) {
        setTitle(banner.title || '');
        setBeforeLesson(banner.beforeLesson || (lessons[0]?.path || 'START'));
        setLeftImage(banner.leftImage || '');
        setRightImage(banner.rightImage || '');
        setBackgroundColor(banner.backgroundColor || '#FFFFFF');
        setTextColor(banner.textColor || '#000000');
        setBorderColor(banner.borderColor || defaultBorderColor || '#000000');
      } else {
        setTitle('');
        setBeforeLesson(lessons[0]?.path || 'START');
        setLeftImage(POPULAR_AVATARS[1].path);
        setRightImage('');
        setBackgroundColor('#FFFFFF');
        setTextColor('#000000');
        setBorderColor(defaultBorderColor || '#000000');
      }
    }
  }, [isOpen, banner, lessons, defaultBorderColor]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a banner title');
      return;
    }
    setSaving(true);
    try {
      const bannerData = {
        id: banner?.id || `banner-${Date.now()}`,
        title: title.trim().toUpperCase(),
        beforeLesson,
        leftImage: leftImage.trim(),
        rightImage: rightImage.trim(),
        backgroundColor: backgroundColor || '#FFFFFF',
        textColor: textColor || '#000000',
        borderColor: borderColor || '#000000'
      };
      await onSave(bannerData);
      onClose();
    } catch (err) {
      console.error('Error saving banner:', err);
      alert('Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        fontFamily: "'Outfit', 'Inter', sans-serif",
        padding: '16px'
      }}
    >
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          border: '3.5px solid #000000',
          boxShadow: '8px 8px 0px #000000',
          maxWidth: '460px',
          width: '100%',
          padding: '24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1E293B' }}>
            {banner ? 'Edit Horizontal Banner' : 'New Horizontal Banner'}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: '2px solid #000000',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontWeight: 900,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Live Preview */}
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>
            Live Preview (Non-clickable, No Shadow)
          </div>
          <div
            style={{
              width: '100%',
              border: `3.5px solid ${borderColor || '#000000'}`,
              borderRadius: '999px',
              backgroundColor: backgroundColor || '#FFFFFF',
              boxShadow: 'none',
              padding: '8px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              minHeight: '76px'
            }}
          >
            {leftImage ? (
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: `3px solid ${borderColor || '#000000'}`,
                  overflow: 'hidden',
                  backgroundColor: '#FFFFFF',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img
                  src={resolveAssetUrl(leftImage)}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ) : (
              <div style={{ width: '56px', height: '56px', visibility: 'hidden', flexShrink: 0 }} />
            )}

            <span
              style={{
                fontFamily: "'Fredoka', 'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: '1.25rem',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: textColor || '#000000',
                textAlign: 'center',
                flex: 1,
                padding: '0 8px'
              }}
            >
              {title || 'BANNER TITLE'}
            </span>

            {rightImage ? (
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: `3px solid ${borderColor || '#000000'}`,
                  overflow: 'hidden',
                  backgroundColor: '#FFFFFF',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img
                  src={resolveAssetUrl(rightImage)}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ) : (
              <div style={{ width: '56px', height: '56px', visibility: 'hidden', flexShrink: 0 }} />
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Banner Title */}
          <div>
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', marginBottom: '6px', color: '#334155' }}>
              Banner Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. ALGEBRA, ORDER OF OPERATIONS"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '2px solid #000000',
                fontSize: '1rem',
                fontWeight: 700,
                boxSizing: 'border-box'
              }}
              autoFocus
            />
          </div>

          {/* Banner Colors: Background, Border & Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Background Color */}
              <div>
                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', marginBottom: '6px', color: '#334155' }}>
                  Banner Background
                </label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                  {BG_COLOR_PALETTE.map(item => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => setBackgroundColor(item.color)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        border: backgroundColor === item.color ? '2.5px solid #8B5CF6' : '1.5px solid #000000',
                        boxShadow: backgroundColor === item.color ? '0 0 0 2px #8B5CF6' : 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title={item.label}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={backgroundColor.startsWith('#') && backgroundColor.length === 7 ? backgroundColor : '#FFFFFF'}
                    onChange={e => setBackgroundColor(e.target.value)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: '2px solid #000000',
                      cursor: 'pointer',
                      padding: '2px',
                      boxSizing: 'border-box',
                      flexShrink: 0
                    }}
                    title="Color picker"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={e => setBackgroundColor(e.target.value)}
                    placeholder="#FFFFFF"
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>

              {/* Border Color */}
              <div>
                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', marginBottom: '6px', color: '#334155' }}>
                  Border Color
                </label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                  {BORDER_COLOR_PALETTE.map(item => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => setBorderColor(item.color)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        border: borderColor === item.color ? '2.5px solid #8B5CF6' : '1.5px solid #000000',
                        boxShadow: borderColor === item.color ? '0 0 0 2px #8B5CF6' : 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title={item.label}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={borderColor.startsWith('#') && borderColor.length === 7 ? borderColor : '#000000'}
                    onChange={e => setBorderColor(e.target.value)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: '2px solid #000000',
                      cursor: 'pointer',
                      padding: '2px',
                      boxSizing: 'border-box',
                      flexShrink: 0
                    }}
                    title="Color picker"
                  />
                  <input
                    type="text"
                    value={borderColor}
                    onChange={e => setBorderColor(e.target.value)}
                    placeholder="#000000"
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', marginBottom: '6px', color: '#334155' }}>
                Text Color
              </label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                {TEXT_COLOR_PALETTE.map(item => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => setTextColor(item.color)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: item.color,
                      border: textColor === item.color ? '2.5px solid #8B5CF6' : '1.5px solid #000000',
                      boxShadow: textColor === item.color ? '0 0 0 2px #8B5CF6' : 'none',
                      cursor: 'pointer',
                      padding: 0
                    }}
                    title={item.label}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', maxWidth: '280px' }}>
                <input
                  type="color"
                  value={textColor.startsWith('#') && textColor.length === 7 ? textColor : '#1E293B'}
                  onChange={e => setTextColor(e.target.value)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '2px solid #000000',
                    cursor: 'pointer',
                    padding: '2px',
                    boxSizing: 'border-box',
                    flexShrink: 0
                  }}
                  title="Color picker"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={e => setTextColor(e.target.value)}
                  placeholder="#1E293B"
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Placement */}
          <div>
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', marginBottom: '6px', color: '#334155' }}>
              Placement (Between Lessons)
            </label>
            <select
              value={beforeLesson}
              onChange={e => setBeforeLesson(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '2px solid #000000',
                fontSize: '0.9rem',
                fontWeight: 600,
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF'
              }}
            >
              <option value="START">⭐️ At the very beginning (before 1st lesson)</option>
              {lessons.map((l, idx) => (
                <option key={l.path} value={l.path}>
                  Before #{idx + 1}: {l.title}
                </option>
              ))}
              <option value="END">🏁 At the very end (after last lesson)</option>
            </select>
          </div>

          {/* Left Round Image */}
          <div>
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', marginBottom: '6px', color: '#334155' }}>
              Left Round Image
            </label>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0 8px 0' }}>
              {POPULAR_AVATARS.map(avatar => {
                const isSelected = leftImage === avatar.path;
                return (
                  <button
                    key={avatar.label}
                    type="button"
                    onClick={() => setLeftImage(avatar.path)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      border: isSelected ? '3px solid #8B5CF6' : '2px solid #CBD5E1',
                      boxShadow: isSelected ? '0 0 0 2px #8B5CF6' : 'none',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      overflow: 'hidden',
                      padding: 0
                    }}
                    title={avatar.label}
                  >
                    {avatar.path ? (
                      <img src={resolveAssetUrl(avatar.path)} alt={avatar.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8' }}>None</span>
                    )}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={leftImage}
              onChange={e => setLeftImage(e.target.value)}
              placeholder="Or custom path / URL..."
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1.5px solid #CBD5E1',
                fontSize: '0.8rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Right Round Image */}
          <div>
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', marginBottom: '6px', color: '#334155' }}>
              Right Round Image (Optional)
            </label>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0 8px 0' }}>
              {POPULAR_AVATARS.map(avatar => {
                const isSelected = rightImage === avatar.path;
                return (
                  <button
                    key={avatar.label}
                    type="button"
                    onClick={() => setRightImage(avatar.path)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      border: isSelected ? '3px solid #8B5CF6' : '2px solid #CBD5E1',
                      boxShadow: isSelected ? '0 0 0 2px #8B5CF6' : 'none',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      overflow: 'hidden',
                      padding: 0
                    }}
                    title={avatar.label}
                  >
                    {avatar.path ? (
                      <img src={resolveAssetUrl(avatar.path)} alt={avatar.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8' }}>None</span>
                    )}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={rightImage}
              onChange={e => setRightImage(e.target.value)}
              placeholder="Or custom path / URL..."
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1.5px solid #CBD5E1',
                fontSize: '0.8rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            {banner && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete banner "${banner.title}"?`)) {
                    onDelete(banner);
                    onClose();
                  }
                }}
                style={{
                  padding: '12px',
                  borderRadius: '14px',
                  border: '2px solid #EF4444',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                🗑️ Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '14px',
                border: '2px solid #000000',
                background: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '14px',
                border: '2px solid #000000',
                background: '#8B5CF6',
                color: '#FFFFFF',
                boxShadow: '3px 3px 0px #000000',
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: saving ? 'wait' : 'pointer'
              }}
            >
              {saving ? 'Saving...' : 'Save Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BannerModal;
