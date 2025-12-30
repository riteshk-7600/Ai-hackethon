/**
 * Email Table Builder Utility
 * Generates table-based HTML structures for email templates
 */

export class EmailTableBuilder {
  /**
   * Create email boilerplate with proper DOCTYPE and meta tags
   */
  static createBoilerplate(title = 'Email Template') {
    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="format-detection" content="telephone=no"/>
  <meta name="format-detection" content="date=no"/>
  <meta name="format-detection" content="address=no"/>
  <meta name="format-detection" content="email=no"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <meta name="color-scheme" content="light dark"/>
  <meta name="supported-color-schemes" content="light dark"/>
  <title>${this.escapeHtml(title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td { border-collapse: collapse; }
    a { text-decoration: none; }
    
    /* Dark mode styles */
    @media (prefers-color-scheme: dark) {
      .dark-mode-bg { background-color: #1a1a1a !important; }
      .dark-mode-text { color: #ffffff !important; }
      .dark-mode-secondary { color: #cccccc !important; }
    }
    
    /* Mobile responsive styles */
    @media only screen and (max-width: 600px) {
      .mobile-full-width { width: 100% !important; max-width: 100% !important; }
      .mobile-padding { padding: 15px !important; }
      .mobile-hide { display: none !important; }
      .mobile-center { text-align: center !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f4f4f4;">
  <center>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
      <tr>
        <td style="padding: 20px 0;">
          <!-- EMAIL CONTENT GOES HERE -->
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
  }

  /**
   * Create main container table (600px wide for desktop)
   */
  static createContainer(content, bgColor = '#ffffff', width = 600) {
    return `
    <!--[if (gte mso 9)|(IE)]>
    <table align="center" border="0" cellspacing="0" cellpadding="0" width="${width}" style="width:${width}px;">
    <tr>
    <td align="center" valign="top" width="${width}" style="width:${width}px;">
    <![endif]-->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="mobile-full-width" style="margin: 0 auto; max-width: ${width}px; background-color: ${bgColor};">
      <tr>
        <td align="center" valign="top">
          ${content}
        </td>
      </tr>
    </table>
    <!--[if (gte mso 9)|(IE)]>
    </td>
    </tr>
    </table>
    <![endif]-->`;
  }

  /**
   * Create a row with specified content and styling
   */
  static createRow(content, styles = {}) {
    const styleString = this.stylesToString(styles);
    return `
    <tr>
      <td align="center" valign="top"${styleString ? ` style="${styleString}"` : ''}>
        ${content}
      </td>
    </tr>`;
  }

  /**
   * Create a multi-column row (for 2-column layouts)
   */
  static createColumns(columns, styles = {}) {
    const styleString = this.stylesToString(styles);
    const columnWidth = Math.floor(100 / columns.length);

    let columnsHtml = columns.map(column => `
      <td width="${columnWidth}%" valign="top" class="mobile-stack" style="padding: 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td>
              ${column}
            </td>
          </tr>
        </table>
      </td>
    `).join('');

    return `
    <tr>
      <td${styleString ? ` style="${styleString}"` : ''}>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            ${columnsHtml}
          </tr>
        </table>
      </td>
    </tr>`;
  }

  /**
   * Create spacer for vertical spacing
   */
  static createSpacer(height = 20) {
    return `
    <tr>
      <td height="${height}" style="font-size: ${height}px; line-height: ${height}px; mso-line-height-rule: exactly;">&nbsp;</td>
    </tr>`;
  }

  /**
   * Create an image element
   */
  static createImage(src, alt, width, height, styles = {}) {
    const defaultStyles = {
      border: '0',
      display: 'block',
      width: width ? `${width}px` : '100%',
      height: height ? `${height}px` : 'auto',
      'max-width': width ? `${width}px` : '100%',
      ...styles
    };
    const styleString = this.stylesToString(defaultStyles);

    return `<img src="${src}" alt="${this.escapeHtml(alt)}" ${width ? `width="${width}"` : ''} ${height ? `height="${height}"` : ''} style="${styleString}" />`;
  }

  /**
   * Create a button (email-safe with dynamic VML)
   */
  static createButton(text, href, styles = {}, dimensions = {}) {
    const { width = 200, height = 40 } = dimensions;
    const defaultStyles = {
      'background-color': '#007bff',
      'color': '#ffffff',
      'padding': '12px 24px',
      'font-family': 'Arial, sans-serif',
      'font-size': '16px',
      'font-weight': 'bold',
      'text-decoration': 'none',
      'border-radius': '4px',
      'display': 'inline-block',
      'mso-padding-alt': '0',
      ...styles
    };

    const bgColor = defaultStyles['background-color'];
    const color = defaultStyles['color'];
    const fontSize = defaultStyles['font-size'];
    const borderRadius = parseInt(defaultStyles['border-radius']) || 4;
    const arcSize = Math.round((borderRadius / height) * 100);

    return `
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:${height}px;v-text-anchor:middle;width:${width}px;" arcsize="${arcSize}%" stroke="f" fillcolor="${bgColor}">
      <w:anchorlock/>
      <center style="color:${color};font-family:Arial,sans-serif;font-size:${fontSize};font-weight:bold;">${this.escapeHtml(text)}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="${href}" target="_blank" style="${this.stylesToString(defaultStyles)}">${this.escapeHtml(text)}</a>
    <!--<![endif]-->`;
  }

  /**
   * Create text block
   */
  static createText(content, styles = {}) {
    const defaultStyles = {
      'font-family': 'Arial, Helvetica, sans-serif',
      'font-size': '16px',
      'line-height': '1.5',
      'color': '#333333',
      'margin': '0',
      'padding': '0',
      ...styles
    };
    const styleString = this.stylesToString(defaultStyles);

    return `<div style="${styleString}">${content}</div>`;
  }

  /**
   * Create heading
   */
  static createHeading(content, level = 1, styles = {}) {
    const defaultStyles = {
      'font-family': 'Arial, Helvetica, sans-serif',
      'font-size': level === 1 ? '32px' : level === 2 ? '24px' : '20px',
      'font-weight': 'bold',
      'line-height': '1.2',
      'color': '#333333',
      'margin': '0 0 10px 0',
      'padding': '0',
      ...styles
    };
    const styleString = this.stylesToString(defaultStyles);

    // Use div for headings to avoid Outlook default margins
    return `<div style="${styleString}">${content}</div>`;
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
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Build complete email from sections
   */
  static buildEmail(sections, containerBgColor = '#ffffff', outerBgColor = '#f4f4f4', width = 600) {
    const content = this.createContainer(sections.join('\n'), containerBgColor, width);
    const boilerplate = this.createBoilerplate();

    return boilerplate
      .replace('<!-- EMAIL CONTENT GOES HERE -->', content)
      .replace('background-color: #f4f4f4', `background-color: ${outerBgColor}`)
      .replace('class="dark-mode-bg" style="background-color: #f4f4f4;"', `class="dark-mode-bg" style="background-color: ${outerBgColor};"`);
  }
}

export default EmailTableBuilder;
