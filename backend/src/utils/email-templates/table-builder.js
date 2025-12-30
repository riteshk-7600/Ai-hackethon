/**
 * Email Table Builder Utility (Senior Production Engine)
 * Generates table-based HTML structures for email templates with maximum client compatibility.
 * Optimized for Responsiveness, Dark Mode, and Pixel-Perfect Borders.
 */

export class EmailTableBuilder {
  /**
   * Create email boilerplate with maximum compatibility DOCTYPE and meta tags
   */
  static createBoilerplate(title = 'Email Template', options = {}) {
    const { backgroundColor = '#f4f4f4', bodyColor = '#ffffff' } = options;
    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no"/>
  <meta name="color-scheme" content="light dark"/>
  <meta name="supported-color-schemes" content="light dark"/>
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <!--<![endif]-->
  <title>${this.escapeHtml(title)}</title>
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style type="text/css">
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    #outlook a { padding: 0; }
    .ExternalClass { width: 100%; }
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    
    @media only screen and (max-width: 600px) {
      .mobile-full-width { width: 100% !important; max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; direction: ltr !important; }
      .mobile-padding { padding: 20px !important; }
      .mobile-center { text-align: center !important; margin: 0 auto !important; width: 100% !important; }
      .mobile-hide { display: none !important; }
    }

    @media (prefers-color-scheme: dark) {
      body, .outer-wrapper { background-color: #1a1a1a !important; }
      .inner-container { background-color: #2d2d2d !important; }
      .dark-mode-bg { background-color: #2d2d2d !important; }
      .dark-mode-text { color: #f8f9fa !important; }
      .dark-mode-border { border-color: #454d55 !important; }
      .dark-mode-zebra { background-color: #343a40 !important; }
    }
    
    /* GMAIL DARK MODE OVERRIDES */
    u + .body .outer-wrapper { background-color: #1a1a1a !important; }
    u + .body .inner-container { background-color: #2d2d2d !important; }
  </style>
</head>
<body class="body" style="margin: 0; padding: 0; background-color: ${backgroundColor};">
  <table class="outer-wrapper" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${backgroundColor};">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="600"><tr><td align="center" valign="top" width="600"><![endif]-->
        <table class="inner-container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${bodyColor}; margin: 0 auto;">
          <tr>
            <td align="center" style="padding: 0;">
              <!-- EMAIL CONTENT GOES HERE -->
            </td>
          </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Create a standard <table> wrapper for sections
   */
  static wrapInTable(content, styles = {}, tableAttrs = {}) {
    const styleString = this.stylesToString(styles);
    const { width = '100%', align = 'center' } = tableAttrs;
    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${width}" align="${align}"${styleString ? ` style="${styleString}"` : ''}>
      <tr>
        <td style="padding: 0;">
          ${content}
        </td>
      </tr>
    </table>`;
  }

  /**
   * Create a row with precise TD-level styling
   */
  static createRow(content, styles = {}, tdStyles = {}) {
    const tableStyle = this.stylesToString(styles);
    const tdStyle = this.stylesToString(tdStyles);
    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"${tableStyle ? ` style="${tableStyle}"` : ''}>
      <tr>
        <td align="${tdStyles.textAlign || 'left'}" valign="top"${tdStyle ? ` style="${tdStyle}"` : ''}>
          ${content}
        </td>
      </tr>
    </table>`;
  }

  /**
   * Create a strict non-stacking data row (ideal for forms/specs) with full border support
   */
  static createDataRow(label, value, options = {}) {
    const {
      labelBg = '#f9f9f9',
      borderColor = '#eeeeee',
      labelWidth = '180',
      padding = '12px 15px'
    } = options;

    const labelStyles = {
      'padding': padding,
      'background-color': labelBg,
      'border': `1px solid ${borderColor}`,
      ...options.labelStyles
    };

    const valueStyles = {
      'padding': padding,
      'border': `1px solid ${borderColor}`,
      'border-left': 'none',
      ...options.valueStyles
    };

    return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td class="dark-mode-zebra dark-mode-border" align="left" valign="top" width="${labelWidth}" style="${this.stylesToString(labelStyles)}">
          ${this.createText(label, { 'font-weight': 'bold', 'font-size': '14px', 'color': '#111111' }, 'dark-mode-text')}
        </td>
        <td class="dark-mode-border" align="left" valign="top" style="${this.stylesToString(valueStyles)}">
          ${this.createText(value, { 'font-size': '14px', 'color': '#333333' }, 'dark-mode-text')}
        </td>
      </tr>
    </table>`;
  }

  /**
   * Create multi-column layouts using floating tables for Outlook stacking
   */
  static createColumns(columnData, options = {}) {
    const { padding = '10px' } = options;
    const columnCount = columnData.length;
    const widthPerColumn = Math.floor(100 / columnCount);

    let html = `<!--[if (gte mso 9)|(IE)]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><![endif]-->`;

    columnData.forEach((colContent) => {
      html += `
      <!--[if (gte mso 9)|(IE)]><td valign="top" width="${widthPerColumn}%" style="padding: 0;"><![endif]-->
      <div class="stack-column" style="display: inline-block; width: 100%; max-width: ${widthPerColumn}%; vertical-align: top;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding: ${padding};">
              ${colContent}
            </td>
          </tr>
        </table>
      </div>
      <!--[if (gte mso 9)|(IE)]></td><![endif]-->`;
    });

    html += `<!--[if (gte mso 9)|(IE)]></tr></table><![endif]-->`;

    return html;
  }

  /**
   * Create text block with mso-line-height-rule and dark mode support
   */
  static createText(content, styles = {}, className = '') {
    const textStyles = {
      'font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      'font-size': '16px',
      'line-height': '1.5',
      'color': '#333333',
      'mso-line-height-rule': 'exactly',
      ...styles
    };
    return `<div class="${className}" style="${this.stylesToString(textStyles)}">${content}</div>`;
  }

  /**
   * Create heading with dark mode support
   */
  static createHeading(content, level = 1, styles = {}) {
    const sizes = { 1: '32px', 2: '24px', 3: '20px' };
    const headingStyles = {
      'font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      'font-size': sizes[level] || '24px',
      'font-weight': 'bold',
      'line-height': '1.2',
      'color': '#111111',
      'margin': '0',
      'mso-line-height-rule': 'exactly',
      ...styles
    };
    return `<div class="dark-mode-text" style="${this.stylesToString(headingStyles)}">${content}</div>`;
  }

  /**
   * Centered or Aligned Logo/Image with standard width control
   */
  static createImage(src, alt, options = {}) {
    const { width = 'auto', height = 'auto', align = 'center', maxWidth = '100%' } = options;
    const styleString = this.stylesToString({
      display: 'block',
      width: width === 'auto' ? 'auto' : `${width}px`,
      height: height === 'auto' ? 'auto' : `${height}px`,
      'max-width': maxWidth,
      'margin': align === 'center' ? '0 auto' : '0',
      ...options.styles
    });

    return `<div align="${align}">
      <img src="${src}" alt="${this.escapeHtml(alt)}" width="${width}" height="${height}" style="${styleString}" />
    </div>`;
  }

  /**
   * Vertical spacer
   */
  static createSpacer(height = 20) {
    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td height="${height}" style="font-size: ${height}px; line-height: ${height}px; mso-line-height-rule: exactly;">&nbsp;</td>
      </tr>
    </table>`;
  }

  /**
   * Convert styles object to inline style string
   */
  static stylesToString(styles) {
    return Object.entries(styles)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }

  /**
   * Escape HTML special characters
   */
  static escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Assemble the final email
   */
  static buildEmail(sections, options = {}) {
    const { title = 'Email Campaign', outerBg = '#f4f4f4', innerBg = '#ffffff' } = options;
    const boilerplate = this.createBoilerplate(title, { backgroundColor: outerBg, bodyColor: innerBg });
    const content = sections.join('\n');
    return boilerplate.replace('<!-- EMAIL CONTENT GOES HERE -->', content);
  }
}

export default EmailTableBuilder;
