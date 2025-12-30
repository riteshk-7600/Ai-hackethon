/**
 * Email Table Builder Utility (Production-Grade Engine)
 * Generates table-based HTML structures for email templates with maximum client compatibility.
 */

export class EmailTableBuilder {
  /**
   * Create email boilerplate with maximum compatibility DOCTYPE and meta tags
   */
  static createBoilerplate(title = 'Email Template', options = {}) {
    const { backgroundColor = '#f4f4f4' } = options;
    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting"/>
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
    
    @media (prefers-color-scheme: dark) {
      .dark-mode-bg { background-color: #1a1a1a !important; }
      .dark-mode-text { color: #ffffff !important; }
      .dark-mode-secondary { color: #aaaaaa !important; }
    }
    
    @media only screen and (max-width: 600px) {
      .mobile-full-width { width: 100% !important; max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; direction: ltr !important; }
      .mobile-padding { padding: 20px !important; }
      .mobile-center { text-align: center !important; margin: 0 auto !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${backgroundColor};">
  <div role="article" aria-roledescription="email" lang="en" style="background-color: ${backgroundColor};">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${backgroundColor};">
      <tr>
        <td align="center" style="padding: 0;">
          <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="600"><tr><td align="center" valign="top" width="600"><![endif]-->
          <div style="max-width: 600px; margin: 0 auto;">
            <!-- EMAIL CONTENT GOES HERE -->
          </div>
          <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  }

  /**
   * Create a standard <table> wrapper for components
   */
  static wrapInTable(content, styles = {}) {
    const styleString = this.stylesToString(styles);
    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"${styleString ? ` style="${styleString}"` : ''}>
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
        <td align="left" valign="top"${tdStyle ? ` style="${tdStyle}"` : ''}>
          ${content}
        </td>
      </tr>
    </table>`;
  }

  /**
   * Create multi-column layouts using floating tables for Outlook stacking
   */
  static createColumns(columnData, containerStyles = {}) {
    const columnCount = columnData.length;
    const widthPerColumn = Math.floor(100 / columnCount);

    let html = `<!--[if (gte mso 9)|(IE)]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><![endif]-->`;

    columnData.forEach((colContent) => {
      html += `
      <!--[if (gte mso 9)|(IE)]><td valign="top" width="${widthPerColumn}%" style="padding: 0;"><![endif]-->
      <div class="stack-column" style="display: inline-block; width: 100%; max-width: ${widthPerColumn}%; vertical-align: top;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding: 5px 10px;">
              ${colContent}
            </td>
          </tr>
        </table>
      </div>
      <!--[if (gte mso 9)|(IE)]></td><![endif]-->`;
    });

    html += `<!--[if (gte mso 9)|(IE)]></tr></table><![endif]-->`;

    return this.wrapInTable(html, containerStyles);
  }

  /**
   * Create a strict non-stacking data row (ideal for forms/specs)
   */
  static createDataRow(label, value, styles = {}) {
    const labelStyles = {
      'padding': '12px 15px',
      'background-color': '#f9f9f9',
      'border-bottom': '1px solid #eeeeee',
      'font-weight': 'bold',
      ...styles.label
    };
    const valueStyles = {
      'padding': '12px 15px',
      'border-bottom': '1px solid #eeeeee',
      ...styles.value
    };

    const labelWidth = styles.label?.width || '180';

    return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="left" valign="top" width="${labelWidth}" style="${this.stylesToString(labelStyles)}">
          ${this.createText(label, { 'font-weight': 'bold', 'font-size': '14px', 'color': labelStyles.color || '#111111' })}
        </td>
        <td align="left" valign="top" style="${this.stylesToString(valueStyles)}">
          ${this.createText(value, { 'font-size': '14px', 'color': valueStyles.color || '#333333' })}
        </td>
      </tr>
    </table>`;
  }

  /**
   * Create pixel-perfect image with Outlook width maintenance
   */
  static createImage(src, alt, width, height, styles = {}) {
    const imageStyles = {
      display: 'block',
      width: width ? `${width}px` : '100%',
      height: height ? `${height}px` : 'auto',
      'max-width': '100%',
      border: '0',
      'outline': 'none',
      'text-decoration': 'none',
      ...styles
    };

    return `<img src="${src}" alt="${this.escapeHtml(alt)}" width="${width || '100%'}" height="${height || 'auto'}" style="${this.stylesToString(imageStyles)}" />`;
  }

  /**
   * Create production-grade VML button for Outlook + standard button
   */
  static createButton(text, href, styles = {}, dimensions = {}) {
    const { width = 200, height = 40 } = dimensions;
    const bgColor = styles['background-color'] || '#007bff';
    const textColor = styles['color'] || '#ffffff';
    const fontSize = styles['font-size'] || '16px';
    const borderRadius = parseInt(styles['border-radius'] || '4');
    const arcsize = Math.round((borderRadius / height) * 100);

    const buttonStyles = {
      'background-color': bgColor,
      'border-radius': `${borderRadius}px`,
      'color': textColor,
      'display': 'inline-block',
      'font-family': 'sans-serif',
      'font-size': fontSize,
      'font-weight': 'bold',
      'line-height': `${height}px`,
      'text-align': 'center',
      'text-decoration': 'none',
      'width': `${width}px`,
      '-webkit-text-size-adjust': 'none',
      'mso-hide': 'all',
      ...styles
    };

    return `
    <div>
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:${height}px;v-text-anchor:middle;width:${width}px;" arcsize="${arcsize}%" stroke="f" fillcolor="${bgColor}">
        <w:anchorlock/>
        <center style="color:${textColor};font-family:sans-serif;font-size:${fontSize};font-weight:bold;">${this.escapeHtml(text)}</center>
      </v:roundrect>
      <![endif]-->
      <a href="${href}" target="_blank" style="${this.stylesToString(buttonStyles)}">${this.escapeHtml(text)}</a>
    </div>`;
  }

  /**
   * Create text block with mso-line-height-rule
   */
  static createText(content, styles = {}) {
    const textStyles = {
      'font-family': 'sans-serif',
      'font-size': '16px',
      'line-height': '24px',
      'color': '#333333',
      'mso-line-height-rule': 'exactly',
      ...styles
    };
    return `<div style="${this.stylesToString(textStyles)}">${content}</div>`;
  }

  /**
   * Create heading
   */
  static createHeading(content, level = 1, styles = {}) {
    const sizes = { 1: '32px', 2: '24px', 3: '20px' };
    const headingStyles = {
      'font-family': 'sans-serif',
      'font-size': sizes[level] || '24px',
      'font-weight': 'bold',
      'line-height': '1.2',
      'color': '#111111',
      'margin': '0',
      'mso-line-height-rule': 'exactly',
      ...styles
    };
    return `<div style="${this.stylesToString(headingStyles)}">${content}</div>`;
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
  static buildEmail(sections, bgColor = '#ffffff', outerBgColor = '#f4f4f4', width = 600) {
    const boilerplate = this.createBoilerplate('Email Campaign', { backgroundColor: outerBgColor });
    const content = sections.join('\n');
    return boilerplate.replace('<!-- EMAIL CONTENT GOES HERE -->', content);
  }
}

export default EmailTableBuilder;
