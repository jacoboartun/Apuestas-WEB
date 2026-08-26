/**
 * AETHERIS CASINO - Frontend: ThemeManager
 * Dynamically loads, applies, and previews visual themes.
 * Injects <link> tags and overrides CSS custom properties.
 */

const THEME_FILES = {
    default:  'frontend/assets/css/themes/theme-default.css',
    neon:     'frontend/assets/css/themes/theme-neon.css',
    gold:     'frontend/assets/css/themes/theme-gold.css',
    midnight: 'frontend/assets/css/themes/theme-midnight.css',
    crimson:  'frontend/assets/css/themes/theme-crimson.css',
};

let _dynamicStyleEl = null;
let _currentThemeId = 'default';

/**
 * Initializes the theme manager. Call after StateCore is loaded.
 * Applies the saved theme immediately.
 */
async function init() {
    await window.StateCore.ensureLoaded();

    // Create a persistent <style> element for dynamic overrides
    _dynamicStyleEl = document.getElementById('dynamic-theme-style');
    if (!_dynamicStyleEl) {
        _dynamicStyleEl = document.createElement('style');
        _dynamicStyleEl.id = 'dynamic-theme-style';
        document.head.appendChild(_dynamicStyleEl);
    }

    // Load saved theme
    const activeTheme = window.AdminService.getActiveTheme();
    applyTheme(activeTheme);
}

/**
 * Swaps the theme CSS link and applies CSS variable overrides.
 * @param {Object} theme - ThemeConfig object
 */
function applyTheme(theme) {
    if (!theme) return;
    _currentThemeId = theme.id;

    // Swap <link> tag if it's a preset (for bulk property changes)
    if (THEME_FILES[theme.id]) {
        _updateThemeLink(THEME_FILES[theme.id]);
    }

    // Apply fine-grained CSS variable overrides (for custom themes and live editing)
    _applyCssVariables(theme);

    // Update body's data attribute for CSS hooks
    document.documentElement.setAttribute('data-theme', theme.id);

    // Notify any listeners
    document.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }));
}

/**
 * Applies a live preview of theme colors without saving.
 * @param {Object} partialTheme - Partial ThemeConfig properties
 */
function previewTheme(partialTheme) {
    _applyCssVariables(partialTheme);
}

/**
 * Restores the last saved theme (cancels preview).
 */
function cancelPreview() {
    const saved = window.AdminService.getActiveTheme();
    applyTheme(saved);
}

/**
 * Returns the current active theme ID.
 */
function getCurrentThemeId() {
    return _currentThemeId;
}

// ─── Private helpers ───────────────────────────────────────

function _updateThemeLink(href) {
    let existingLink = document.getElementById('theme-link');
    if (!existingLink) {
        existingLink = document.createElement('link');
        existingLink.id = 'theme-link';
        existingLink.rel = 'stylesheet';
        document.head.appendChild(existingLink);
    }
    if (existingLink.getAttribute('href') !== href) {
        existingLink.href = href;
    }
}

function _applyCssVariables(theme) {
    if (!_dynamicStyleEl) return;
    const root = document.documentElement;
    const vars = {
        '--primary':       theme.primaryColor,
        '--primary-hover': _lighten(theme.primaryColor),
        '--primary-dark':  _darken(theme.primaryColor),
        '--secondary':     theme.secondaryColor,
        '--accent':        theme.accentColor,
        '--success':       theme.successColor,
        '--danger':        theme.dangerColor,
        '--bg-dark':       theme.bgDark,
        '--bg-card':       theme.bgCard,
        '--bg-card-hover': theme.bgCardHover,
        '--border-color':  theme.borderColor,
        '--text-main':     theme.textMain,
        '--text-muted':    theme.textMuted,
        '--font-sans':     theme.fontFamily,
        '--font-heading':  theme.fontFamilyHeading,
        '--radius-card':   theme.borderRadiusCard,
        '--radius-btn':    theme.borderRadiusBtn,
        '--glass-opacity': theme.glassOpacity,
        '--glass-blur':    theme.glassBlur,
    };

    let css = ':root {\n';
    for (const [k, v] of Object.entries(vars)) {
        if (v !== undefined && v !== null) {
            css += `  ${k}: ${v};\n`;
        }
    }
    css += '}';
    _dynamicStyleEl.textContent = css;

    // Also load Google Font if needed
    if (theme.googleFont) {
        _ensureGoogleFont(theme.googleFont);
    }
}

function _ensureGoogleFont(fontName) {
    const id = `gfont-${fontName.toLowerCase().replace(/\s+/g, '-')}`;
    if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
        document.head.appendChild(link);
    }
}

/** Simple color lightening — bumps hex lightness by ~20% */
function _lighten(hex) {
    if (!hex || !hex.startsWith('#')) return hex;
    try {
        const n = parseInt(hex.slice(1), 16);
        const r = Math.min(255, ((n >> 16) & 0xff) + 50);
        const g = Math.min(255, ((n >> 8)  & 0xff) + 50);
        const b = Math.min(255, ((n)       & 0xff) + 50);
        return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
    } catch { return hex; }
}

/** Simple color darkening */
function _darken(hex) {
    if (!hex || !hex.startsWith('#')) return hex;
    try {
        const n = parseInt(hex.slice(1), 16);
        const r = Math.max(0, ((n >> 16) & 0xff) - 35);
        const g = Math.max(0, ((n >> 8)  & 0xff) - 35);
        const b = Math.max(0, ((n)       & 0xff) - 35);
        return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
    } catch { return hex; }
}

// Export to global scope
window.ThemeManager = { init, applyTheme, previewTheme, cancelPreview, getCurrentThemeId };
