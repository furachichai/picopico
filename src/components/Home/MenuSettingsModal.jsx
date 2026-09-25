import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { resolveAssetUrl } from '../../utils/assetUrl';

// Convert hex color and opacity percentage to rgba string
function hexToRgba(hex, opacityPercent) {
  if (!hex) return 'rgba(0, 0, 0, 0.68)';
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  const a = Math.round((opacityPercent / 100) * 100) / 100;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Parse rgba string to hex and opacity percentage
function parseRgba(rgbaStr) {
  if (!rgbaStr) return { hex: '#000000', opacity: 68 };
  if (rgbaStr.startsWith('#')) return { hex: rgbaStr, opacity: 100 };
  const match = rgbaStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return { hex: '#000000', opacity: 68 };
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  const a = match[4] !== undefined ? Math.round(parseFloat(match[4]) * 100) : 100;
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return { hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`, opacity: a };
}

// --- EXTENSIVE COLOR PALETTES ---
const MENU_BG_CATEGORIES = {
  All: [
    // Neutrals
    { label: 'Pure White', color: '#FFFFFF' },
    { label: 'Cloud White', color: '#F8FAFC' },
    { label: 'Slate White', color: '#F1F5F9' },
    { label: 'Soft Cream', color: '#FFFDF5' },
    { label: 'Warm Cream', color: '#FFFBEB' },
    { label: 'Parchment', color: '#FEF3C7' },
    { label: 'Almond', color: '#FDF2E9' },
    { label: 'Sandstone', color: '#F5F5F4' },
    { label: 'Zinc Gray', color: '#E4E4E7' },
    // Pastels
    { label: 'Pastel Sky', color: '#E0F2FE' },
    { label: 'Ice Blue', color: '#EBF8FF' },
    { label: 'Lavender', color: '#F3E8FF' },
    { label: 'Lilac Mist', color: '#EDE9FE' },
    { label: 'Rose Water', color: '#FCE7F3' },
    { label: 'Peach Cream', color: '#FFEDD5' },
    { label: 'Mint Breeze', color: '#ECFDF5' },
    { label: 'Pale Sage', color: '#E6F4EA' },
    { label: 'Soft Lemon', color: '#FEF9C3' },
    // Vibrant
    { label: 'Bubblegum Pink', color: '#F472B6' },
    { label: 'Sunny Coral', color: '#FB923C' },
    { label: 'Bright Gold', color: '#FACC15' },
    { label: 'Electric Lime', color: '#A3E635' },
    { label: 'Aqua Cyan', color: '#22D3EE' },
    { label: 'Vivid Sky', color: '#38BDF8' },
    { label: 'Bright Violet', color: '#A855F7' },
    { label: 'Royal Indigo', color: '#818CF8' },
    { label: 'Punch Red', color: '#FB7185' },
    // Dark
    { label: 'Pure Black', color: '#000000' },
    { label: 'Midnight Slate', color: '#0F172A' },
    { label: 'Jet Charcoal', color: '#18181B' },
    { label: 'Deep Navy', color: '#0B132B' },
    { label: 'Dark Violet', color: '#1E1035' },
    { label: 'Deep Emerald', color: '#022C22' },
    { label: 'Blood Wine', color: '#2D0B16' },
    { label: 'Dark Bronze', color: '#291507' }
  ],
  Neutrals: [
    { label: 'Pure White', color: '#FFFFFF' },
    { label: 'Cloud White', color: '#F8FAFC' },
    { label: 'Slate White', color: '#F1F5F9' },
    { label: 'Soft Cream', color: '#FFFDF5' },
    { label: 'Warm Cream', color: '#FFFBEB' },
    { label: 'Parchment', color: '#FEF3C7' },
    { label: 'Almond', color: '#FDF2E9' },
    { label: 'Sandstone', color: '#F5F5F4' },
    { label: 'Zinc Gray', color: '#E4E4E7' }
  ],
  Pastels: [
    { label: 'Pastel Sky', color: '#E0F2FE' },
    { label: 'Ice Blue', color: '#EBF8FF' },
    { label: 'Lavender', color: '#F3E8FF' },
    { label: 'Lilac Mist', color: '#EDE9FE' },
    { label: 'Rose Water', color: '#FCE7F3' },
    { label: 'Peach Cream', color: '#FFEDD5' },
    { label: 'Mint Breeze', color: '#ECFDF5' },
    { label: 'Pale Sage', color: '#E6F4EA' },
    { label: 'Soft Lemon', color: '#FEF9C3' }
  ],
  Vibrant: [
    { label: 'Bubblegum Pink', color: '#F472B6' },
    { label: 'Sunny Coral', color: '#FB923C' },
    { label: 'Bright Gold', color: '#FACC15' },
    { label: 'Electric Lime', color: '#A3E635' },
    { label: 'Aqua Cyan', color: '#22D3EE' },
    { label: 'Vivid Sky', color: '#38BDF8' },
    { label: 'Bright Violet', color: '#A855F7' },
    { label: 'Royal Indigo', color: '#818CF8' },
    { label: 'Punch Red', color: '#FB7185' }
  ],
  Dark: [
    { label: 'Pure Black', color: '#000000' },
    { label: 'Midnight Slate', color: '#0F172A' },
    { label: 'Jet Charcoal', color: '#18181B' },
    { label: 'Deep Navy', color: '#0B132B' },
    { label: 'Dark Violet', color: '#1E1035' },
    { label: 'Deep Emerald', color: '#022C22' },
    { label: 'Blood Wine', color: '#2D0B16' },
    { label: 'Dark Bronze', color: '#291507' }
  ]
};

const BUTTON_BORDER_CATEGORIES = {
  All: [
    { label: 'Pure Black', color: '#000000' },
    { label: 'Dark Slate', color: '#1E293B' },
    { label: 'Charcoal', color: '#334155' },
    { label: 'Slate Gray', color: '#64748B' },
    { label: 'Pure White', color: '#FFFFFF' },
    { label: 'Royal Purple', color: '#7C3AED' },
    { label: 'Deep Violet', color: '#5B21B6' },
    { label: 'Indigo Blue', color: '#2563EB' },
    { label: 'Ocean Blue', color: '#0284C7' },
    { label: 'Teal Green', color: '#0D9488' },
    { label: 'Emerald Green', color: '#059669' },
    { label: 'Amber Gold', color: '#D97706' },
    { label: 'Bright Orange', color: '#EA580C' },
    { label: 'Crimson Red', color: '#DC2626' },
    { label: 'Deep Rose', color: '#E11D48' },
    { label: 'Hot Pink', color: '#DB2777' },
    { label: 'Deep Magenta', color: '#C026D3' },
    { label: 'Soft Lavender', color: '#A78BFA' },
    { label: 'Soft Sky', color: '#60A5FA' },
    { label: 'Soft Cyan', color: '#22D3EE' },
    { label: 'Soft Mint', color: '#34D399' },
    { label: 'Soft Gold', color: '#FBBF24' },
    { label: 'Soft Coral', color: '#F87171' },
    { label: 'Soft Rose', color: '#F472B6' },
    { label: 'Warm Bronze', color: '#78350F' }
  ],
  Classic: [
    { label: 'Pure Black', color: '#000000' },
    { label: 'Dark Slate', color: '#1E293B' },
    { label: 'Charcoal', color: '#334155' },
    { label: 'Slate Gray', color: '#64748B' },
    { label: 'Pure White', color: '#FFFFFF' }
  ],
  Bold: [
    { label: 'Royal Purple', color: '#7C3AED' },
    { label: 'Deep Violet', color: '#5B21B6' },
    { label: 'Indigo Blue', color: '#2563EB' },
    { label: 'Ocean Blue', color: '#0284C7' },
    { label: 'Teal Green', color: '#0D9488' },
    { label: 'Emerald Green', color: '#059669' },
    { label: 'Amber Gold', color: '#D97706' },
    { label: 'Bright Orange', color: '#EA580C' },
    { label: 'Crimson Red', color: '#DC2626' },
    { label: 'Deep Rose', color: '#E11D48' },
    { label: 'Hot Pink', color: '#DB2777' },
    { label: 'Deep Magenta', color: '#C026D3' }
  ],
  Pastel: [
    { label: 'Soft Lavender', color: '#A78BFA' },
    { label: 'Soft Sky', color: '#60A5FA' },
    { label: 'Soft Cyan', color: '#22D3EE' },
    { label: 'Soft Mint', color: '#34D399' },
    { label: 'Soft Gold', color: '#FBBF24' },
    { label: 'Soft Coral', color: '#F87171' },
    { label: 'Soft Rose', color: '#F472B6' },
    { label: 'Warm Bronze', color: '#78350F' }
  ]
};

const TITLE_COLOR_CATEGORIES = {
  All: [
    { label: 'Pure White', color: '#FFFFFF' },
    { label: 'Cloud Snow', color: '#F8FAFC' },
    { label: 'Warm Cream', color: '#FEF3C7' },
    { label: 'Soft Lemon', color: '#FEF08A' },
    { label: 'Ice Blue', color: '#E0F2FE' },
    { label: 'Soft Lilac', color: '#DDD6FE' },
    { label: 'Pale Rose', color: '#FDA4AF' },
    { label: 'Bright Gold', color: '#FACC15' },
    { label: 'Amber Gold', color: '#F59E0B' },
    { label: 'Coral Orange', color: '#FB923C' },
    { label: 'Cyan Sky', color: '#38BDF8' },
    { label: 'Electric Blue', color: '#60A5FA' },
    { label: 'Neon Mint', color: '#4ADE80' },
    { label: 'Lime Glow', color: '#A3E635' },
    { label: 'Hot Pink', color: '#F472B6' },
    { label: 'Fuchsia Neon', color: '#E879F9' },
    { label: 'Bright Emerald', color: '#10B981' },
    { label: 'Pure Black', color: '#000000' },
    { label: 'Slate Charcoal', color: '#1E293B' },
    { label: 'Deep Navy', color: '#0F172A' },
    { label: 'Dark Violet', color: '#2E1065' }
  ],
  Light: [
    { label: 'Pure White', color: '#FFFFFF' },
    { label: 'Cloud Snow', color: '#F8FAFC' },
    { label: 'Warm Cream', color: '#FEF3C7' },
    { label: 'Soft Lemon', color: '#FEF08A' },
    { label: 'Ice Blue', color: '#E0F2FE' },
    { label: 'Soft Lilac', color: '#DDD6FE' },
    { label: 'Pale Rose', color: '#FDA4AF' }
  ],
  Vibrant: [
    { label: 'Bright Gold', color: '#FACC15' },
    { label: 'Amber Gold', color: '#F59E0B' },
    { label: 'Coral Orange', color: '#FB923C' },
    { label: 'Cyan Sky', color: '#38BDF8' },
    { label: 'Electric Blue', color: '#60A5FA' },
    { label: 'Neon Mint', color: '#4ADE80' },
    { label: 'Lime Glow', color: '#A3E635' },
    { label: 'Hot Pink', color: '#F472B6' },
    { label: 'Fuchsia Neon', color: '#E879F9' },
    { label: 'Bright Emerald', color: '#10B981' }
  ],
  Dark: [
    { label: 'Pure Black', color: '#000000' },
    { label: 'Slate Charcoal', color: '#1E293B' },
    { label: 'Deep Navy', color: '#0F172A' },
    { label: 'Dark Violet', color: '#2E1065' }
  ]
};

const OVERLAY_TINT_CATEGORIES = {
  All: [
    { label: 'Pure Black', color: '#000000' },
    { label: 'Midnight Slate', color: '#0F172A' },
    { label: 'Deep Navy', color: '#0A192F' },
    { label: 'Dark Violet', color: '#2E1065' },
    { label: 'Deep Plum', color: '#3B0764' },
    { label: 'Blood Wine', color: '#450A0A' },
    { label: 'Dark Chocolate', color: '#291507' },
    { label: 'Deep Pine', color: '#022C22' },
    { label: 'Charcoal Slate', color: '#334155' },
    { label: 'Frosted White', color: '#FFFFFF' },
    { label: 'Frosted Sky', color: '#E0F2FE' },
    { label: 'Frosted Lilac', color: '#F3E8FF' },
    { label: 'Frosted Mint', color: '#ECFDF5' },
    { label: 'Frosted Amber', color: '#FEF3C7' }
  ],
  Dark: [
    { label: 'Pure Black', color: '#000000' },
    { label: 'Midnight Slate', color: '#0F172A' },
    { label: 'Deep Navy', color: '#0A192F' },
    { label: 'Dark Violet', color: '#2E1065' },
    { label: 'Deep Plum', color: '#3B0764' },
    { label: 'Blood Wine', color: '#450A0A' },
    { label: 'Dark Chocolate', color: '#291507' },
    { label: 'Deep Pine', color: '#022C22' },
    { label: 'Charcoal Slate', color: '#334155' }
  ],
  Light: [
    { label: 'Frosted White', color: '#FFFFFF' },
    { label: 'Frosted Sky', color: '#E0F2FE' },
    { label: 'Frosted Lilac', color: '#F3E8FF' },
    { label: 'Frosted Mint', color: '#ECFDF5' },
    { label: 'Frosted Amber', color: '#FEF3C7' }
  ]
};

const TITLE_SHADOW_OPTIONS = [
  { label: 'None', color: 'none' },
  { label: 'Pure Black', color: '#000000' },
  { label: 'Deep Slate', color: '#1E293B' },
  { label: 'Deep Navy', color: '#0B132B' },
  { label: 'Deep Violet', color: '#2E1065' },
  { label: 'Pure White', color: '#FFFFFF' },
  { label: 'Cyan Glow', color: '#22D3EE' },
  { label: 'Gold Glow', color: '#F59E0B' }
];

const TITLE_SHADOW_CATEGORIES = {
  All: [
    { label: 'None', color: 'none' },
    { label: 'Pure Black', color: '#000000' },
    { label: 'Deep Slate', color: '#1E293B' },
    { label: 'Jet Charcoal', color: '#18181B' },
    { label: 'Deep Navy', color: '#0B132B' },
    { label: 'Dark Violet', color: '#2E1065' },
    { label: 'Blood Wine', color: '#2D0B16' },
    { label: 'Royal Purple', color: '#7C3AED' },
    { label: 'Indigo Blue', color: '#2563EB' },
    { label: 'Ocean Blue', color: '#0284C7' },
    { label: 'Deep Emerald', color: '#022C22' },
    { label: 'Pure White', color: '#FFFFFF' },
    { label: 'Cyan Glow', color: '#22D3EE' },
    { label: 'Lime Glow', color: '#A3E635' },
    { label: 'Gold Glow', color: '#FACC15' },
    { label: 'Amber Glow', color: '#F59E0B' },
    { label: 'Coral Glow', color: '#FB923C' },
    { label: 'Rose Glow', color: '#F472B6' },
    { label: 'Fuchsia Glow', color: '#E879F9' }
  ],
  Dark: [
    { label: 'Pure Black', color: '#000000' },
    { label: 'Deep Slate', color: '#1E293B' },
    { label: 'Jet Charcoal', color: '#18181B' },
    { label: 'Deep Navy', color: '#0B132B' },
    { label: 'Dark Violet', color: '#2E1065' },
    { label: 'Blood Wine', color: '#2D0B16' },
    { label: 'Deep Emerald', color: '#022C22' }
  ],
  Glow: [
    { label: 'Pure White', color: '#FFFFFF' },
    { label: 'Cyan Glow', color: '#22D3EE' },
    { label: 'Lime Glow', color: '#A3E635' },
    { label: 'Gold Glow', color: '#FACC15' },
    { label: 'Amber Glow', color: '#F59E0B' },
    { label: 'Coral Glow', color: '#FB923C' },
    { label: 'Rose Glow', color: '#F472B6' },
    { label: 'Fuchsia Glow', color: '#E879F9' }
  ]
};

// Top popular quick swatches for main view
const QUICK_MENU_BG = MENU_BG_CATEGORIES.All.slice(0, 8);
const QUICK_BUTTON_BORDER = BUTTON_BORDER_CATEGORIES.All.slice(0, 8);
const QUICK_TITLE_COLOR = TITLE_COLOR_CATEGORIES.All.slice(0, 8);
const QUICK_OVERLAY_TINT = OVERLAY_TINT_CATEGORIES.All.slice(0, 6);

const DEFAULT_SETTINGS = {
  menuBg: '#FFFFFF',
  showStars: true,
  buttonBorderColor: '#000000',
  buttonShadowColor: '#000000',
  bannerBorderColor: '#000000',
  buttonTitleColor: '#FFFFFF',
  titleShadowColor: '#000000',
  buttonOverlayBg: 'rgba(0, 0, 0, 0.68)'
};

const MenuSettingsModal = ({
  isOpen,
  settings,
  banners = [],
  onSaveSettings,
  onCreateBanner,
  onEditBanner,
  onDeleteBanner,
  onClose
}) => {
  const [menuBg, setMenuBg] = useState('#FFFFFF');
  const [showStars, setShowStars] = useState(true);
  const [buttonBorderColor, setButtonBorderColor] = useState('#000000');
  const [buttonShadowColor, setButtonShadowColor] = useState('#000000');
  const [bannerBorderColor, setBannerBorderColor] = useState('#000000');
  const [buttonTitleColor, setButtonTitleColor] = useState('#FFFFFF');
  const [titleShadowColor, setTitleShadowColor] = useState('#000000');
  const [overlayHex, setOverlayHex] = useState('#000000');
  const [overlayOpacity, setOverlayOpacity] = useState(68);
  const [saving, setSaving] = useState(false);

  // Popup palette state (when open, docked below the preview so the preview is NEVER covered)
  const [activePopupPicker, setActivePopupPicker] = useState(null);
  const [popupCategory, setPopupCategory] = useState('All');

  useEffect(() => {
    if (isOpen) {
      const active = { ...DEFAULT_SETTINGS, ...settings };
      setMenuBg(active.menuBg || '#FFFFFF');
      setShowStars(active.showStars !== undefined ? active.showStars : true);
      setButtonBorderColor(active.buttonBorderColor || '#000000');
      setButtonShadowColor(active.buttonShadowColor || active.buttonBorderColor || '#000000');
      setBannerBorderColor(active.bannerBorderColor || '#000000');
      setButtonTitleColor(active.buttonTitleColor || '#FFFFFF');
      setTitleShadowColor(active.titleShadowColor !== undefined ? active.titleShadowColor : '#000000');
      const parsed = parseRgba(active.buttonOverlayBg);
      setOverlayHex(parsed.hex);
      setOverlayOpacity(parsed.opacity);
      setActivePopupPicker(null);
      setPopupCategory('All');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const computedOverlayBg = hexToRgba(overlayHex, overlayOpacity);

  const handleResetDefaults = () => {
    setMenuBg(DEFAULT_SETTINGS.menuBg);
    setShowStars(DEFAULT_SETTINGS.showStars);
    setButtonBorderColor(DEFAULT_SETTINGS.buttonBorderColor);
    setButtonShadowColor(DEFAULT_SETTINGS.buttonShadowColor);
    setBannerBorderColor(DEFAULT_SETTINGS.bannerBorderColor);
    setButtonTitleColor(DEFAULT_SETTINGS.buttonTitleColor);
    setTitleShadowColor(DEFAULT_SETTINGS.titleShadowColor);
    const parsed = parseRgba(DEFAULT_SETTINGS.buttonOverlayBg);
    setOverlayHex(parsed.hex);
    setOverlayOpacity(parsed.opacity);
    setActivePopupPicker(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newSettings = {
        menuBg,
        showStars,
        buttonBorderColor,
        buttonShadowColor,
        bannerBorderColor,
        buttonTitleColor,
        titleShadowColor,
        buttonOverlayBg: computedOverlayBg
      };
      await onSaveSettings(newSettings);
      onClose();
    } catch (err) {
      console.error('Failed to save menu settings:', err);
      alert('Failed to save menu settings');
    } finally {
      setSaving(false);
    }
  };

  // Helper to open palette popup without covering preview
  const openPalettePopup = (type) => {
    setPopupCategory('All');
    if (type === 'menuBg') {
      setActivePopupPicker({
        type: 'menuBg',
        title: 'Menu Background Palette (35)',
        categories: MENU_BG_CATEGORIES
      });
    } else if (type === 'buttonBorder') {
      setActivePopupPicker({
        type: 'buttonBorder',
        title: 'Button Frame / Border Palette (25)',
        categories: BUTTON_BORDER_CATEGORIES
      });
    } else if (type === 'buttonShadow') {
      setActivePopupPicker({
        type: 'buttonShadow',
        title: 'Button Shadow Palette (25)',
        categories: BUTTON_BORDER_CATEGORIES
      });
    } else if (type === 'bannerBorder') {
      setActivePopupPicker({
        type: 'bannerBorder',
        title: 'Banner Border Palette (25)',
        categories: BUTTON_BORDER_CATEGORIES
      });
    } else if (type === 'buttonTitle') {
      setActivePopupPicker({
        type: 'buttonTitle',
        title: 'Title Text Palette (21)',
        categories: TITLE_COLOR_CATEGORIES
      });
    } else if (type === 'titleShadow') {
      setActivePopupPicker({
        type: 'titleShadow',
        title: 'Title Shadow Palette (19)',
        categories: TITLE_SHADOW_CATEGORIES
      });
    } else if (type === 'overlayTint') {
      setActivePopupPicker({
        type: 'overlayTint',
        title: 'Title bkg Palette (14)',
        categories: OVERLAY_TINT_CATEGORIES
      });
    }
  };

  // Determine current active color for the popup
  const currentPopupColor = activePopupPicker
    ? activePopupPicker.type === 'menuBg'
      ? menuBg
      : activePopupPicker.type === 'buttonBorder'
        ? buttonBorderColor
        : activePopupPicker.type === 'buttonShadow'
          ? buttonShadowColor
          : activePopupPicker.type === 'bannerBorder'
            ? bannerBorderColor
            : activePopupPicker.type === 'buttonTitle'
              ? buttonTitleColor
              : activePopupPicker.type === 'titleShadow'
                ? titleShadowColor
                : overlayHex
    : '#000000';

  const handlePopupColorSelect = (color) => {
    if (!activePopupPicker) return;
    if (activePopupPicker.type === 'menuBg') {
      setMenuBg(color);
    } else if (activePopupPicker.type === 'buttonBorder') {
      setButtonBorderColor(color);
    } else if (activePopupPicker.type === 'buttonShadow') {
      setButtonShadowColor(color);
    } else if (activePopupPicker.type === 'bannerBorder') {
      setBannerBorderColor(color);
    } else if (activePopupPicker.type === 'buttonTitle') {
      setButtonTitleColor(color);
    } else if (activePopupPicker.type === 'titleShadow') {
      setTitleShadowColor(color);
    } else if (activePopupPicker.type === 'overlayTint') {
      setOverlayHex(color);
    }
  };

  const previewTitleShadow = (titleShadowColor === 'none' || titleShadowColor === 'transparent')
    ? 'none'
    : (titleShadowColor
        ? `0 2px 4px ${titleShadowColor}`
        : ((buttonTitleColor === '#000000' || buttonTitleColor === '#1E293B')
            ? 'none'
            : '0 2px 4px rgba(0, 0, 0, 0.95)'));

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
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
          maxWidth: '480px',
          width: '100%',
          padding: '20px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          height: '90vh',
          maxHeight: '780px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* ================= FIXED TOP REGION: HEADER & LIVE PREVIEW ================= */}
        {/* This region is ALWAYS visible so the user sees live feedback in real time! */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '10px', borderBottom: '2px solid #E2E8F0' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.3rem' }}>⚙️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#1E293B' }}>
                  Menu Customization
                </h3>
                <p style={{ margin: '1px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Choose menu colors, button styling & banners
                </p>
              </div>
            </div>
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
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>

          {/* Live Preview Panel (NEVER COVERED) */}
          <div style={{
            background: '#F8FAFC',
            border: '2px dashed #CBD5E1',
            borderRadius: '16px',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px'
          }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Live Sample Preview:
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8B5CF6' }}>
                Updates Live
              </span>
            </div>

            <style>{`
              .preview-stars-drift-deep,
              .preview-stars-drift-mid {
                position: absolute;
                inset: 0;
                background-repeat: repeat;
                pointer-events: none;
              }

              .preview-stars-drift-deep {
                background-image:
                  radial-gradient(1px 1px at 15px 12px, rgba(255,255,255,0.7), rgba(255,255,255,0)),
                  radial-gradient(0.8px 0.8px at 45px 38px, rgba(255,255,255,0.5), rgba(255,255,255,0)),
                  radial-gradient(1.2px 1.2px at 75px 18px, rgba(255,255,255,0.65), rgba(255,255,255,0)),
                  radial-gradient(0.7px 0.7px at 105px 42px, rgba(255,255,255,0.45), rgba(255,255,255,0)),
                  radial-gradient(1px 1px at 135px 15px, rgba(255,255,255,0.6), rgba(255,255,255,0)),
                  radial-gradient(0.8px 0.8px at 165px 35px, rgba(255,255,255,0.5), rgba(255,255,255,0)),
                  radial-gradient(1.1px 1.1px at 190px 10px, rgba(255,255,255,0.7), rgba(255,255,255,0)),
                  radial-gradient(0.9px 0.9px at 25px 75px, rgba(255,255,255,0.55), rgba(255,255,255,0)),
                  radial-gradient(1.2px 1.2px at 60px 88px, rgba(255,255,255,0.65), rgba(255,255,255,0)),
                  radial-gradient(0.7px 0.7px at 90px 65px, rgba(255,255,255,0.45), rgba(255,255,255,0)),
                  radial-gradient(1px 1px at 120px 82px, rgba(255,255,255,0.6), rgba(255,255,255,0)),
                  radial-gradient(0.8px 0.8px at 155px 70px, rgba(255,255,255,0.5), rgba(255,255,255,0)),
                  radial-gradient(1.1px 1.1px at 180px 92px, rgba(255,255,255,0.7), rgba(255,255,255,0)),
                  radial-gradient(0.8px 0.8px at 35px 135px, rgba(255,255,255,0.5), rgba(255,255,255,0)),
                  radial-gradient(1.2px 1.2px at 70px 120px, rgba(255,255,255,0.65), rgba(255,255,255,0)),
                  radial-gradient(0.7px 0.7px at 105px 145px, rgba(255,255,255,0.45), rgba(255,255,255,0)),
                  radial-gradient(1px 1px at 145px 125px, rgba(255,255,255,0.6), rgba(255,255,255,0)),
                  radial-gradient(0.8px 0.8px at 175px 140px, rgba(255,255,255,0.5), rgba(255,255,255,0)),
                  radial-gradient(1px 1px at 20px 180px, rgba(255,255,255,0.6), rgba(255,255,255,0)),
                  radial-gradient(0.8px 0.8px at 85px 175px, rgba(255,255,255,0.5), rgba(255,255,255,0)),
                  radial-gradient(1.1px 1.1px at 130px 185px, rgba(255,255,255,0.65), rgba(255,255,255,0)),
                  radial-gradient(0.9px 0.9px at 170px 170px, rgba(255,255,255,0.55), rgba(255,255,255,0));
                background-size: 200px 200px;
                animation: previewStarDriftDeep 80s linear infinite;
              }

              .preview-stars-drift-mid {
                background-image:
                  radial-gradient(2px 2px at 30px 25px, #ffffff, rgba(255,255,255,0)),
                  radial-gradient(1.5px 1.5px at 85px 45px, rgba(255,255,255,0.9), rgba(255,255,255,0)),
                  radial-gradient(2.4px 2.4px at 150px 20px, #ffffff, rgba(255,255,255,0)),
                  radial-gradient(1.6px 1.6px at 210px 50px, rgba(255,255,255,0.85), rgba(255,255,255,0)),
                  radial-gradient(1.8px 1.8px at 50px 105px, rgba(255,255,255,0.95), rgba(255,255,255,0)),
                  radial-gradient(2.2px 2.2px at 120px 90px, #ffffff, rgba(255,255,255,0)),
                  radial-gradient(1.5px 1.5px at 185px 115px, rgba(255,255,255,0.9), rgba(255,255,255,0)),
                  radial-gradient(2.5px 2.5px at 240px 80px, #ffffff, rgba(255,255,255,0)),
                  radial-gradient(1.6px 1.6px at 25px 165px, rgba(255,255,255,0.85), rgba(255,255,255,0)),
                  radial-gradient(2px 2px at 95px 150px, #ffffff, rgba(255,255,255,0)),
                  radial-gradient(1.7px 1.7px at 160px 175px, rgba(255,255,255,0.9), rgba(255,255,255,0)),
                  radial-gradient(2.2px 2.2px at 225px 155px, #ffffff, rgba(255,255,255,0)),
                  radial-gradient(1.5px 1.5px at 60px 225px, rgba(255,255,255,0.85), rgba(255,255,255,0)),
                  radial-gradient(2.4px 2.4px at 135px 210px, #ffffff, rgba(255,255,255,0)),
                  radial-gradient(1.8px 1.8px at 195px 240px, rgba(255,255,255,0.95), rgba(255,255,255,0)),
                  radial-gradient(2px 2px at 245px 220px, #ffffff, rgba(255,255,255,0));
                background-size: 260px 260px;
                animation: previewStarDriftMid 45s linear infinite;
              }

              @keyframes previewStarDriftDeep {
                0% { transform: translate3d(0, 0, 0); }
                100% { transform: translate3d(0, -200px, 0); }
              }

              @keyframes previewStarDriftMid {
                0% { transform: translate3d(0, 0, 0); }
                100% { transform: translate3d(0, -260px, 0); }
              }

              @media (prefers-reduced-motion: reduce) {
                .preview-stars-drift-deep, .preview-stars-drift-mid {
                  animation: none !important;
                }
              }
            `}</style>

            {/* Sample Menu Canvas */}
            <div
              style={{
                width: '100%',
                backgroundColor: menuBg,
                position: 'relative',
                overflow: 'hidden',
                border: '2px solid #000000',
                borderRadius: '14px',
                padding: '8px 10px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'background-color 0.2s ease',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)'
              }}
            >
              {/* Dual-layer animated drifting stars preview */}
              {showStars && (
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }} aria-hidden="true">
                  <div className="preview-stars-drift-deep" />
                  <div className="preview-stars-drift-mid" />
                </div>
              )}

              {/* Sample Horizontal Banner */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: '100%',
                  maxWidth: '260px',
                  border: `2.5px solid ${bannerBorderColor}`,
                  borderRadius: '999px',
                  backgroundColor: '#FFFFFF',
                  padding: '3px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                  gap: '6px',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${bannerBorderColor}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/src/assets/characters/yara_avatar_calm.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <span style={{ fontWeight: 900, fontSize: '0.72rem', letterSpacing: '1px', textTransform: 'uppercase', color: '#1E293B', textAlign: 'center', flex: 1 }}>
                  ALGEBRA
                </span>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${bannerBorderColor}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/src/assets/characters/yara_avatar_happy.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>

              {/* Sample Lesson Button */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: '125px',
                  height: '125px',
                  borderRadius: '20px',
                  border: `3px solid ${buttonBorderColor}`,
                  boxShadow: `4px 4px 0px ${buttonShadowColor || buttonBorderColor || '#000000'}`,
                  backgroundColor: '#8B5CF6',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Sample Artwork */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, #A855F7 0%, #6366F1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingBottom: '38%'
                }}>
                  <span style={{ fontSize: '2.3rem' }}>🧪</span>
                </div>

                {/* Sample Frame Adjuster Badge (frameless & shadowless) */}
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  lineHeight: 1
                }}>
                  🎯
                </div>

                {/* Sample Bottom Third Semi-transparent Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '38%',
                    backgroundColor: computedOverlayBg,
                    backdropFilter: 'blur(4px)',
                    borderTop: `1.5px solid rgba(0, 0, 0, 0.25)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px 6px',
                    boxSizing: 'border-box',
                    pointerEvents: 'none',
                    zIndex: 5,
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Outfit', 'Inter', sans-serif",
                      fontWeight: 900,
                      fontSize: '0.9rem',
                      lineHeight: 1.1,
                      color: buttonTitleColor,
                      textAlign: 'center',
                      textShadow: previewTitleShadow,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      wordBreak: 'break-word',
                      letterSpacing: '-0.5px'
                    }}
                  >
                    Sample Title
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= BOTTOM REGION: CONTROLS OR PALETTE POPUP ================= */}
        {/* Renders in the lower portion so it NEVER covers the top preview! */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingTop: '10px', display: 'flex', flexDirection: 'column' }}>
          {activePopupPicker ? (
            /* --- EXPANDED COLOR PALETTE POPUP PANEL (BELOW PREVIEW) --- */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              height: '100%'
            }}>
              {/* Popup Top Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setActivePopupPicker(null)}
                    style={{
                      background: '#F1F5F9',
                      border: '1.5px solid #000000',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    ← Back
                  </button>
                  <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#1E293B' }}>
                    {activePopupPicker.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePopupPicker(null)}
                  style={{
                    background: '#8B5CF6',
                    color: '#FFFFFF',
                    border: '1.5px solid #000000',
                    borderRadius: '10px',
                    padding: '4px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '2px 2px 0px #000000'
                  }}
                >
                  Done ✓
                </button>
              </div>

              {/* Category Filter Tabs */}
              <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '2px' }}>
                {Object.keys(activePopupPicker.categories).map(catName => (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => setPopupCategory(catName)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      border: popupCategory === catName ? '2px solid #000000' : '1.5px solid #CBD5E1',
                      backgroundColor: popupCategory === catName ? '#1E293B' : '#FFFFFF',
                      color: popupCategory === catName ? '#FFFFFF' : '#64748B',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    {catName} ({activePopupPicker.categories[catName]?.length || 0})
                  </button>
                ))}
              </div>

              {/* Color Swatches Grid */}
              <div style={{
                flex: 1,
                minHeight: '140px',
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))',
                gap: '8px',
                padding: '4px 2px',
                boxSizing: 'border-box'
              }}>
                {(activePopupPicker.categories[popupCategory] || activePopupPicker.categories.All || []).map(item => {
                  const isNone = item.color === 'none';
                  const isSelected = isNone
                    ? currentPopupColor === 'none'
                    : (currentPopupColor || '').toLowerCase() === item.color.toLowerCase();
                  return (
                    <button
                      key={item.color + item.label}
                      type="button"
                      onClick={() => handlePopupColorSelect(item.color)}
                      style={{
                        aspectRatio: '1 / 1',
                        borderRadius: '12px',
                        backgroundColor: isNone ? '#FFFFFF' : item.color,
                        border: isSelected ? '3px solid #8B5CF6' : '1.5px solid #000000',
                        boxShadow: isSelected ? '0 0 0 2px #8B5CF6, 2px 2px 0px #000000' : '2px 2px 0px #CBD5E1',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        transition: 'transform 0.1s'
                      }}
                      title={`${item.label} (${item.color})`}
                    >
                      {isNone ? (
                        <span style={{ color: '#DC2626', fontWeight: 900, fontSize: '1.1rem' }}>
                          ⊘
                        </span>
                      ) : (
                        isSelected && (
                          <span style={{
                            color: (item.color === '#FFFFFF' || item.color === '#FEF3C7' || item.color === '#E0F2FE' || item.color === '#ECFDF5' || item.color === '#F8FAFC' || item.color === '#FEF9C3') ? '#000000' : '#FFFFFF',
                            fontWeight: 900,
                            fontSize: '0.85rem'
                          }}>
                            ✓
                          </span>
                        )
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom HEX + Native Color Picker */}
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                borderTop: '1.5px solid #E2E8F0',
                paddingTop: '8px',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B' }}>Custom:</span>
                <input
                  type="color"
                  value={currentPopupColor.startsWith('#') && currentPopupColor.length === 7 ? currentPopupColor : '#000000'}
                  onChange={e => handlePopupColorSelect(e.target.value)}
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
                  title="Native color picker"
                />
                <input
                  type="text"
                  value={currentPopupColor}
                  onChange={e => handlePopupColorSelect(e.target.value)}
                  placeholder="#000000"
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.82rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
            </div>
          ) : (
            /* --- DEFAULT CONTROLS LIST --- */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* SECTION: BANNERS QUICK SHORTCUT */}
              <div style={{
                background: '#F1F5F9',
                border: '2px solid #000000',
                borderRadius: '16px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1E293B' }}>
                    🏷️ Menu Banners ({banners.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCreateBanner();
                    }}
                    style={{
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: '2px solid #000000',
                      borderRadius: '10px',
                      padding: '5px 10px',
                      fontWeight: 900,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      boxShadow: '2px 2px 0px #000000',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={13} strokeWidth={3} /> CREATE BANNER
                  </button>
                </div>

                {banners.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                    {banners.map((b) => (
                      <div
                        key={b.id}
                        style={{
                          backgroundColor: b.backgroundColor || '#FFFFFF',
                          border: `2px solid ${b.borderColor || bannerBorderColor || '#000000'}`,
                          borderRadius: '10px',
                          padding: '5px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          {b.leftImage && (
                            <img src={resolveAssetUrl(b.leftImage)} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                          )}
                          <span style={{
                            fontWeight: 900,
                            fontSize: '0.78rem',
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            color: b.textColor || '#1E293B',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {b.title}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onEditBanner(b);
                            }}
                            title="Edit banner"
                            style={{
                              background: '#FFFFFF',
                              border: '1.5px solid #000000',
                              borderRadius: '6px',
                              padding: '2px 6px',
                              fontSize: '0.7rem',
                              cursor: 'pointer'
                            }}
                          >
                            ✏️
                          </button>
                          {onDeleteBanner && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete banner "${b.title}"?`)) {
                                  onDeleteBanner(b);
                                }
                              }}
                              title="Delete banner"
                              style={{
                                background: '#FEE2E2',
                                border: '1.5px solid #DC2626',
                                color: '#DC2626',
                                borderRadius: '6px',
                                padding: '2px 6px',
                                fontSize: '0.7rem',
                                cursor: 'pointer'
                              }}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Default Banner Border Color */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  marginTop: '4px',
                  paddingTop: '8px',
                  borderTop: '1.5px solid #E2E8F0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontWeight: 800, fontSize: '0.8rem', color: '#334155' }}>
                      Default Banner Border Color
                    </label>
                    <button
                      type="button"
                      onClick={() => openPalettePopup('bannerBorder')}
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1.5px solid #000000',
                        borderRadius: '999px',
                        padding: '2px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        color: '#7C3AED',
                        boxShadow: '1px 1px 0px #000000'
                      }}
                    >
                      🎨 +25 Colors
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {QUICK_BUTTON_BORDER.map(item => (
                      <button
                        key={item.color}
                        type="button"
                        onClick={() => setBannerBorderColor(item.color)}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: item.color,
                          border: bannerBorderColor === item.color ? '2.5px solid #8B5CF6' : '1.5px solid #000000',
                          boxShadow: bannerBorderColor === item.color ? '0 0 0 2px #8B5CF6' : 'none',
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
                      value={bannerBorderColor.startsWith('#') && bannerBorderColor.length === 7 ? bannerBorderColor : '#000000'}
                      onChange={e => setBannerBorderColor(e.target.value)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: '1.5px solid #000000',
                        cursor: 'pointer',
                        padding: '2px',
                        boxSizing: 'border-box',
                        flexShrink: 0
                      }}
                      title="Native color picker"
                    />
                    <input
                      type="text"
                      value={bannerBorderColor}
                      onChange={e => setBannerBorderColor(e.target.value)}
                      placeholder="#000000"
                      style={{
                        flex: 1,
                        padding: '5px 8px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: MENU BACKGROUND COLOR */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1E293B' }}>
                    Menu Background Color
                  </label>
                  <button
                    type="button"
                    onClick={() => openPalettePopup('menuBg')}
                    style={{
                      backgroundColor: '#F1F5F9',
                      border: '1.5px solid #000000',
                      borderRadius: '999px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      color: '#8B5CF6',
                      boxShadow: '1px 1px 0px #000000'
                    }}
                  >
                    🎨 +35 Colors
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                  {QUICK_MENU_BG.map(item => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => setMenuBg(item.color)}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        border: menuBg.toLowerCase() === item.color.toLowerCase() ? '2.5px solid #8B5CF6' : '1.5px solid #000000',
                        boxShadow: menuBg.toLowerCase() === item.color.toLowerCase() ? '0 0 0 2px #8B5CF6' : 'none',
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
                    value={menuBg.startsWith('#') && menuBg.length === 7 ? menuBg : '#FFFFFF'}
                    onChange={e => setMenuBg(e.target.value)}
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
                    value={menuBg}
                    onChange={e => setMenuBg(e.target.value)}
                    placeholder="#FFFFFF"
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                {/* Starry Sky Checkbox Toggle */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  marginTop: '8px',
                  padding: '7px 10px',
                  backgroundColor: showStars ? '#F5F3FF' : '#F8FAFC',
                  borderRadius: '10px',
                  border: showStars ? '1.5px solid #8B5CF6' : '1.5px solid #CBD5E1',
                  transition: 'all 0.15s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={showStars}
                    onChange={e => setShowStars(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#8B5CF6',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: showStars ? '#6D28D9' : '#475569' }}>
                    ✨ Starry sky (white dots simulating stars)
                  </span>
                </label>
              </div>

              {/* SECTION: BUTTON EXTERIOR (FRAME & SHADOW) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Button Frame / Border Color */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1E293B' }}>
                      Button Frame
                    </label>
                    <button
                      type="button"
                      onClick={() => openPalettePopup('buttonBorder')}
                      style={{
                        backgroundColor: '#F1F5F9',
                        border: '1.5px solid #000000',
                        borderRadius: '999px',
                        padding: '2px 6px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        color: '#8B5CF6'
                      }}
                    >
                      🎨 +25
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {QUICK_BUTTON_BORDER.map(item => (
                      <button
                        key={item.color}
                        type="button"
                        onClick={() => setButtonBorderColor(item.color)}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: item.color,
                          border: buttonBorderColor.toLowerCase() === item.color.toLowerCase() ? '2.5px solid #8B5CF6' : '1.5px solid #000000',
                          boxShadow: buttonBorderColor.toLowerCase() === item.color.toLowerCase() ? '0 0 0 2px #8B5CF6' : 'none',
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
                      value={buttonBorderColor.startsWith('#') && buttonBorderColor.length === 7 ? buttonBorderColor : '#000000'}
                      onChange={e => setButtonBorderColor(e.target.value)}
                      style={{
                        width: '30px',
                        height: '30px',
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
                      value={buttonBorderColor}
                      onChange={e => setButtonBorderColor(e.target.value)}
                      placeholder="#000000"
                      style={{
                        flex: 1,
                        padding: '5px 6px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.78rem',
                        boxSizing: 'border-box',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>

                {/* Button Shadow Color */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1E293B' }}>
                      Button Shadow
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setButtonShadowColor(buttonBorderColor)}
                        title="Match frame color"
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          borderRadius: '999px',
                          padding: '2px 5px',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          color: '#64748B'
                        }}
                      >
                        Match Frame
                      </button>
                      <button
                        type="button"
                        onClick={() => openPalettePopup('buttonShadow')}
                        style={{
                          backgroundColor: '#F1F5F9',
                          border: '1.5px solid #000000',
                          borderRadius: '999px',
                          padding: '2px 6px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          color: '#8B5CF6'
                        }}
                      >
                        🎨 +25
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {QUICK_BUTTON_BORDER.map(item => (
                      <button
                        key={item.color}
                        type="button"
                        onClick={() => setButtonShadowColor(item.color)}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: item.color,
                          border: (buttonShadowColor || '').toLowerCase() === item.color.toLowerCase() ? '2.5px solid #8B5CF6' : '1.5px solid #000000',
                          boxShadow: (buttonShadowColor || '').toLowerCase() === item.color.toLowerCase() ? '0 0 0 2px #8B5CF6' : 'none',
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
                      value={buttonShadowColor && buttonShadowColor.startsWith('#') && buttonShadowColor.length === 7 ? buttonShadowColor : '#000000'}
                      onChange={e => setButtonShadowColor(e.target.value)}
                      style={{
                        width: '30px',
                        height: '30px',
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
                      value={buttonShadowColor}
                      onChange={e => setButtonShadowColor(e.target.value)}
                      placeholder="#000000"
                      style={{
                        flex: 1,
                        padding: '5px 6px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.78rem',
                        boxSizing: 'border-box',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: TITLE TEXT & TITLE SHADOW */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Button Title Text Color */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1E293B' }}>
                      Title Color
                    </label>
                    <button
                      type="button"
                      onClick={() => openPalettePopup('buttonTitle')}
                      style={{
                        backgroundColor: '#F1F5F9',
                        border: '1.5px solid #000000',
                        borderRadius: '999px',
                        padding: '2px 6px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        color: '#8B5CF6'
                      }}
                    >
                      🎨 +21
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {QUICK_TITLE_COLOR.map(item => (
                      <button
                        key={item.color}
                        type="button"
                        onClick={() => setButtonTitleColor(item.color)}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: item.color,
                          border: buttonTitleColor.toLowerCase() === item.color.toLowerCase() ? '2.5px solid #8B5CF6' : '1.5px solid #000000',
                          boxShadow: buttonTitleColor.toLowerCase() === item.color.toLowerCase() ? '0 0 0 2px #8B5CF6' : 'none',
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
                      value={buttonTitleColor.startsWith('#') && buttonTitleColor.length === 7 ? buttonTitleColor : '#FFFFFF'}
                      onChange={e => setButtonTitleColor(e.target.value)}
                      style={{
                        width: '30px',
                        height: '30px',
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
                      value={buttonTitleColor}
                      onChange={e => setButtonTitleColor(e.target.value)}
                      placeholder="#FFFFFF"
                      style={{
                        flex: 1,
                        padding: '5px 6px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.78rem',
                        boxSizing: 'border-box',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>

                {/* Title Shadow Color */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1E293B' }}>
                      Title Shadow
                    </label>
                    <button
                      type="button"
                      onClick={() => openPalettePopup('titleShadow')}
                      style={{
                        backgroundColor: '#F1F5F9',
                        border: '1.5px solid #000000',
                        borderRadius: '999px',
                        padding: '2px 6px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        color: '#8B5CF6'
                      }}
                    >
                      🎨 +19
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {TITLE_SHADOW_OPTIONS.map(item => {
                      const isNone = item.color === 'none';
                      const isSelected = isNone
                        ? titleShadowColor === 'none'
                        : (titleShadowColor || '').toLowerCase() === item.color.toLowerCase();
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setTitleShadowColor(item.color)}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: isNone ? '#FFFFFF' : item.color,
                            border: isSelected ? '2.5px solid #8B5CF6' : '1.5px solid #000000',
                            boxShadow: isSelected ? '0 0 0 2px #8B5CF6' : 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            color: isNone ? '#DC2626' : (item.color === '#FFFFFF' ? '#000000' : '#FFFFFF')
                          }}
                          title={item.label}
                        >
                          {isNone ? '⊘' : (isSelected ? '✓' : '')}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={titleShadowColor && titleShadowColor.startsWith('#') && titleShadowColor.length === 7 ? titleShadowColor : '#000000'}
                      onChange={e => setTitleShadowColor(e.target.value)}
                      style={{
                        width: '30px',
                        height: '30px',
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
                      value={titleShadowColor}
                      onChange={e => setTitleShadowColor(e.target.value)}
                      placeholder="#000000 or none"
                      style={{
                        flex: 1,
                        padding: '5px 6px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.78rem',
                        boxSizing: 'border-box',
                        fontFamily: 'monospace'
                      }}
                    />
                    {titleShadowColor !== 'none' && (
                      <button
                        type="button"
                        onClick={() => setTitleShadowColor('none')}
                        title="Remove shadow"
                        style={{
                          backgroundColor: '#FEE2E2',
                          color: '#DC2626',
                          border: '1px solid #DC2626',
                          borderRadius: '6px',
                          padding: '4px 6px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        No Shadow
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION: SEMI-TRANSPARENT BOTTOM THIRD */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1E293B' }}>
                      Title bkg
                    </label>
                    <button
                      type="button"
                      onClick={() => openPalettePopup('overlayTint')}
                      style={{
                        backgroundColor: '#F1F5F9',
                        border: '1.5px solid #000000',
                        borderRadius: '999px',
                        padding: '2px 6px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        color: '#8B5CF6'
                      }}
                    >
                      🎨 +14
                    </button>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#8B5CF6' }}>
                    {overlayOpacity}% opacity
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                  {QUICK_OVERLAY_TINT.map(item => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => setOverlayHex(item.color)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        border: overlayHex.toLowerCase() === item.color.toLowerCase() ? '2.5px solid #8B5CF6' : '1.5px solid #000000',
                        boxShadow: overlayHex.toLowerCase() === item.color.toLowerCase() ? '0 0 0 2px #8B5CF6' : 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title={item.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={overlayHex.startsWith('#') && overlayHex.length === 7 ? overlayHex : '#000000'}
                    onChange={e => setOverlayHex(e.target.value)}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '8px',
                      border: '2px solid #000000',
                      cursor: 'pointer',
                      padding: '2px',
                      boxSizing: 'border-box'
                    }}
                    title="Custom color tint"
                  />
                  <input
                    type="text"
                    value={overlayHex}
                    onChange={e => setOverlayHex(e.target.value)}
                    placeholder="#000000"
                    style={{
                      width: '80px',
                      padding: '4px 6px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.78rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                {/* Opacity Slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B' }}>10%</span>
                  <input
                    type="range"
                    min="10"
                    max="95"
                    step="1"
                    value={overlayOpacity}
                    onChange={e => setOverlayOpacity(parseInt(e.target.value, 10))}
                    style={{ flex: 1, accentColor: '#8B5CF6' }}
                  />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B' }}>95%</span>
                </div>
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#64748B',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '12px',
                    border: '2px solid #000000',
                    background: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1.2,
                    padding: '10px',
                    borderRadius: '12px',
                    border: '2px solid #000000',
                    background: '#8B5CF6',
                    color: '#FFFFFF',
                    boxShadow: '3px 3px 0px #000000',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    cursor: saving ? 'wait' : 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuSettingsModal;
