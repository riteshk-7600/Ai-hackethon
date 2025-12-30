/**
 * Dark Mode Support for Email Templates
 * Handles color schemes and client-specific dark mode implementations
 */

export class DarkModeSupport {
    /**
     * Generate dark mode CSS styles
     */
    static getDarkModeStyles(lightColors, darkColors) {
        const styles = [];

        // Background colors
        if (darkColors.background) {
            styles.push(`.dark-mode-bg { background-color: ${darkColors.background} !important; }`);
        }

        // Text colors
        if (darkColors.text) {
            styles.push(`.dark-mode-text { color: ${darkColors.text} !important; }`);
        }

        if (darkColors.secondaryText) {
            styles.push(`.dark-mode-secondary { color: ${darkColors.secondaryText} !important; }`);
        }

        // Link colors
        if (darkColors.link) {
            styles.push(`.dark-mode-link { color: ${darkColors.link} !important; }`);
        }

        // Border colors
        if (darkColors.border) {
            styles.push(`.dark-mode-border { border-color: ${darkColors.border} !important; }`);
        }

        return `
    @media (prefers-color-scheme: dark) {
      ${styles.join('\n      ')}
      
      /* Force Gmail to respect dark mode */
      .dark-mode-bg[data-ogsc] { background-color: ${darkColors.background} !important; }
      .dark-mode-text[data-ogsc] { color: ${darkColors.text} !important; }
      
      /* Image brightness adjustment */
      .dark-mode-img { opacity: 0.9 !important; }
    }`;
    }

    /**
     * Add dark mode meta tags
     */
    static getMetaTags() {
        return `
  <meta name="color-scheme" content="light dark"/>
  <meta name="supported-color-schemes" content="light dark"/>`;
    }

    /**
     * Wrap element with dark mode class
     */
    static wrapWithDarkModeClass(content, className = 'dark-mode-bg') {
        return `<div class="${className}">${content}</div>`;
    }

    /**
     * Get recommended dark mode color palette
     */
    static getDefaultDarkColors() {
        return {
            background: '#1a1a1a',
            secondaryBackground: '#2d2d2d',
            text: '#ffffff',
            secondaryText: '#cccccc',
            link: '#4da6ff',
            border: '#404040',
            success: '#4caf50',
            warning: '#ff9800',
            error: '#f44336'
        };
    }

    /**
     * Get recommended light mode color palette
     */
    static getDefaultLightColors() {
        return {
            background: '#ffffff',
            secondaryBackground: '#f5f5f5',
            text: '#333333',
            secondaryText: '#666666',
            link: '#007bff',
            border: '#e0e0e0',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545'
        };
    }

    /**
     * Apply dark mode classes to HTML
     */
    static applyDarkModeClasses(html) {
        // Add dark-mode-bg to main table backgrounds
        html = html.replace(
            /(<table[^>]*style="[^"]*background-color:\s*#[fF]{6}[^"]*"[^>]*>)/g,
            '$1<!-- dark-mode-bg -->'
        );

        // Add dark-mode-text to text elements
        html = html.replace(
            /(<(?:p|h[1-6]|span|div)[^>]*style="[^"]*color:\s*#(?:333|222|000)[^"]*"[^>]*>)/g,
            '$1<!-- dark-mode-text -->'
        );

        return html;
    }

    /**
     * Create inline dark mode styles for specific element
     */
    static createInlineDarkStyles(lightBg, darkBg, lightText, darkText) {
        return `background-color: ${lightBg}; color: ${lightText};`;
    }

    /**
     * Check if color is dark or light (for automatic contrast)
     */
    static isColorDark(hexColor) {
        // Remove # if present
        const color = hexColor.replace('#', '');

        // Convert to RGB
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);

        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        return luminance < 0.5;
    }

    /**
     * Get contrasting text color
     */
    static getContrastingColor(backgroundColor) {
        return this.isColorDark(backgroundColor) ? '#ffffff' : '#333333';
    }

    /**
     * Generate complete dark mode implementation
     */
    static generateDarkModeImplementation(lightColors = null, darkColors = null) {
        const light = lightColors || this.getDefaultLightColors();
        const dark = darkColors || this.getDefaultDarkColors();

        return {
            metaTags: this.getMetaTags(),
            styles: this.getDarkModeStyles(light, dark),
            lightColors: light,
            darkColors: dark
        };
    }

    /**
     * Add Gmail-specific dark mode support
     */
    static addGmailDarkModeSupport() {
        return `
    /* Gmail-specific dark mode */
    u + .body .dark-mode-bg { background-color: #1a1a1a !important; }
    u + .body .dark-mode-text { color: #ffffff !important; }`;
    }

    /**
     * Add Apple Mail dark mode support
     */
    static addAppleMailDarkModeSupport() {
        return `
    /* Apple Mail dark mode */
    @media (prefers-color-scheme: dark) {
      .dark-mode-bg { background-color: #1a1a1a !important; }
      .dark-mode-text { color: #ffffff !important; }
    }`;
    }
}

export default DarkModeSupport;
