/**
 * Email Table Builder Utility (Senior Production Engine)
 * 8+ Years Experience Standard: High-Fidelity, Clean, Robust, Aligned.
 */

export class EmailTableBuilder {
  /**
   * Create email boilerplate with precise resets and dark mode protection
   */
  static createBoilerplate(title = 'Email Template', options = {}) {
    const { backgroundColor = '#f4f4f4', bodyColor = '#ffffff' } = options;
    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <meta name="color-scheme" content="light dark"/>
  <meta name="supported-color-schemes" content="light dark"/>
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
    /* RESETS */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: ${backgroundColor}; }

    /* RESPONSIVE */
    @media only screen and (max-width: 600px) {
      .content-table { width: 100% !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }

    /* DARK MODE PROTECTION */
    @media (prefers-color-scheme: dark) {
      .dark-mode-bg { background-color: #1a1a1a !important; }
      .dark-mode-text { color: #fdfdfd !important; }
      .dark-mode-secondary { color: #b1b1b1 !important; }
    }
    
    /* GMAIL DARK MODE FIXED */
    [data-ogsc] .dark-mode-bg { background-color: #1a1a1a !important; }
    [data-ogsc] .dark-mode-text { color: #fdfdfd !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${backgroundColor};">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${backgroundColor};">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="600"><tr><td align="center" valign="top" width="600"><![endif]-->
        <table class="content-table" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${bodyColor}; margin: 0 auto; border: 1px solid #e0e0e0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <tr>
            <td align="center">
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
   * Create a strict data row with visible borders and zebra-striping (8y polish)
   */
  static createDataRow(label, value, options = {}) {
    const {
      labelBg = '#f9f9f9',
      borderColor = '#dddddd',
      labelWidth = '180',
      padding = '14px 20px',
      isFirstRow = false
    } = options;

    const commonStyles = {
      'font-family': 'Helvetica, Arial, sans-serif',
      'font-size': '14px',
      'border-bottom': `1px solid ${borderColor}`,
      'border-left': `1px solid ${borderColor}`,
      'border-right': `1px solid ${borderColor}`,
      'mso-line-height-rule': 'exactly'
    };

    if (isFirstRow) {
      commonStyles['border-top'] = `1px solid ${borderColor}`;
    }

    const labelStyles = {
      ...commonStyles,
      'padding': padding,
      'background-color': labelBg,
      'font-weight': 'bold',
      'color': '#111111'
    };

    const valueStyles = {
      ...commonStyles,
      'padding': padding,
      'background-color': '#ffffff',
      'border-left': 'none', // Prevent double border between label and value
      'color': '#444444'
    };

    return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="left" valign="top" width="${labelWidth}" style="${this.stylesToString(labelStyles)}">
          ${label}
        </td>
        <td align="left" valign="top" style="${this.stylesToString(valueStyles)}">
          ${value}
        </td>
      </tr>
    </table>`;
  }

  /**
   * Polish text rendering with line-height and letter-spacing (8y polish)
   */
  static createText(content, styles = {}) {
    const defaultStyles = {
      'font-family': "Helvetica, Arial, sans-serif",
      'font-size': '16px',
      'line-height': '1.6',
      'color': '#333333',
      'margin': '0', // IMPT: Prevent Outlook default p margins
      'padding': '0',
      'mso-line-height-rule': 'exactly'
    };
    const combinedStyles = { ...defaultStyles, ...styles };
    // Use div for block-level text control inside td
    return `<div style="${this.stylesToString(combinedStyles)}">${content}</div>`;
  }

  /**
   * Polish heading rendering (8y polish)
   */
  static createHeading(content, level = 1, styles = {}) {
    const sizes = { 1: '32px', 2: '24px', 3: '20px' };
    const defaultStyles = {
      'font-family': "Helvetica, Arial, sans-serif",
      'font-size': sizes[level] || '24px',
      'font-weight': 'bold',
      'line-height': '1.3',
      'color': '#111111',
      'margin': '0',
      'mso-line-height-rule': 'exactly'
    };
    const combinedStyles = { ...defaultStyles, ...styles };
    return `<div style="${this.stylesToString(combinedStyles)}">${content}</div>`;
  }

  /**
   * Create a Bulletproof Button (Table-Based for Outlook + Web)
   */
  static createButton(label, href = '#', styles = {}) {
    const {
      backgroundColor = '#000000',
      color = '#ffffff',
      borderRadius = '4px',
      width = 'auto',
      align = 'center',
      padding = '12px 24px',
      fontSize = '16px',
      fontWeight = 'bold'
    } = styles;

    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${width === 'auto' ? 'auto' : '100%'}" style="margin: 0 auto;">
      <tr>
        <td align="${align}" bgcolor="${backgroundColor}" style="border-radius: ${borderRadius}; background-color: ${backgroundColor};">
          <a href="${href}" target="_blank" style="font-family: Helvetica, Arial, sans-serif; font-size: ${fontSize}; font-weight: ${fontWeight}; color: ${color}; text-decoration: none; padding: ${padding}; border: 1px solid ${backgroundColor}; display: inline-block; border-radius: ${borderRadius}; background-color: ${backgroundColor};">
            <!--[if mso]>&nbsp;&nbsp;&nbsp;&nbsp;<![endif]--> ${label} <!--[if mso]>&nbsp;&nbsp;&nbsp;&nbsp;<![endif]-->
          </a>
        </td>
      </tr>
    </table>`;
  }

  static createDivider(color = '#eeeeee', height = '1px', margin = '20px 0') {
    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding: ${margin};">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td height="1" style="background-color: ${color}; font-size: 1px; line-height: 1px;">&nbsp;</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
  }

  static createSpacer(height = 20) {
    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td height="${height}" style="font-size: ${height}px; line-height: ${height}px; mso-line-height-rule: exactly;">&nbsp;</td>
      </tr>
    </table>`;
  }

  static stylesToString(styles) {
    return Object.entries(styles)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }

  static escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
  }

  static buildEmail(sections, options = {}) {
    const { title = 'Notification', outerBg = '#f4f4f4', innerBg = '#ffffff' } = options;
    const boilerplate = this.createBoilerplate(title, { backgroundColor: outerBg, bodyColor: innerBg });
    return boilerplate.replace('<!-- EMAIL CONTENT GOES HERE -->', sections.join('\n'));
  }
}

export default EmailTableBuilder;
