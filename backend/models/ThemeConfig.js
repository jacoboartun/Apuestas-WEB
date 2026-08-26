/**
 * AETHERIS CASINO - Backend Model: ThemeConfig
 * Defines the visual theme schema and default theme presets.
 */

/**
 * Creates a new ThemeConfig object.
 * @param {Object} overrides - Partial theme properties to override defaults
 * @returns {Object} Theme config
 */
function createTheme(id, name, overrides = {}) {
    return {
        id,
        name,
        primaryColor: overrides.primaryColor || '#8b5cf6',
        secondaryColor: overrides.secondaryColor || '#06b6d4',
        accentColor: overrides.accentColor || '#f59e0b',
        successColor: overrides.successColor || '#10b981',
        dangerColor: overrides.dangerColor || '#ef4444',
        bgDark: overrides.bgDark || '#0a0b0e',
        bgCard: overrides.bgCard || 'rgba(21,24,33,0.7)',
        bgCardHover: overrides.bgCardHover || 'rgba(30,35,48,0.85)',
        borderColor: overrides.borderColor || 'rgba(255,255,255,0.08)',
        fontFamily: overrides.fontFamily || "'Outfit', sans-serif",
        fontFamilyHeading: overrides.fontFamilyHeading || "'Cinzel', serif",
        borderRadiusCard: overrides.borderRadiusCard || '16px',
        borderRadiusBtn: overrides.borderRadiusBtn || '12px',
        glassOpacity: overrides.glassOpacity || '0.7',
        glassBlur: overrides.glassBlur || '12px',
        googleFont: overrides.googleFont || 'Outfit',
        textMain: overrides.textMain || '#f3f4f6',
        textMuted: overrides.textMuted || '#9ca3af',
    };
}

/**
 * Built-in preset themes.
 */
const THEME_PRESETS = {
    default: createTheme('default', 'Obsidian Purple', {
        primaryColor: '#8b5cf6',
        secondaryColor: '#06b6d4',
        accentColor: '#f59e0b',
        bgDark: '#0a0b0e',
        bgCard: 'rgba(21,24,33,0.7)',
    }),

    neon: createTheme('neon', 'Cyber Neon', {
        primaryColor: '#39ff14',
        secondaryColor: '#00d4ff',
        accentColor: '#ff00aa',
        bgDark: '#040d05',
        bgCard: 'rgba(4,20,6,0.8)',
        borderColor: 'rgba(57,255,20,0.15)',
        googleFont: 'Space Grotesk',
        fontFamily: "'Space Grotesk', sans-serif",
        fontFamilyHeading: "'Cinzel', serif",
    }),

    gold: createTheme('gold', 'Royal Gold', {
        primaryColor: '#b8860b',
        secondaryColor: '#d4af37',
        accentColor: '#ffd700',
        successColor: '#2e8b57',
        bgDark: '#0d0a00',
        bgCard: 'rgba(25,18,0,0.75)',
        borderColor: 'rgba(212,175,55,0.2)',
        googleFont: 'Cormorant Garamond',
        fontFamily: "'Cormorant Garamond', serif",
        fontFamilyHeading: "'Cinzel', serif",
        textMain: '#fef9e7',
        textMuted: '#c9b37e',
    }),

    midnight: createTheme('midnight', 'Midnight Blue', {
        primaryColor: '#3b82f6',
        secondaryColor: '#818cf8',
        accentColor: '#38bdf8',
        bgDark: '#020617',
        bgCard: 'rgba(8,15,35,0.75)',
        borderColor: 'rgba(59,130,246,0.15)',
        googleFont: 'Inter',
        fontFamily: "'Inter', sans-serif",
    }),

    crimson: createTheme('crimson', 'Crimson Casino', {
        primaryColor: '#dc143c',
        secondaryColor: '#ff6b6b',
        accentColor: '#ffd700',
        bgDark: '#0d0004',
        bgCard: 'rgba(30,0,8,0.8)',
        borderColor: 'rgba(220,20,60,0.2)',
        googleFont: 'Playfair Display',
        fontFamily: "'Playfair Display', serif",
        fontFamilyHeading: "'Cinzel', serif",
        textMain: '#fff0f3',
        textMuted: '#ffb3b3',
    }),
};

// Export to global scope
window.ThemeConfigModel = { createTheme, THEME_PRESETS };
