/**
 * Outlook-Specific Fixes and Compatibility Utilities
 * Handles VML, conditional comments, and MSO-specific CSS
 */

export class OutlookFixes {
    /**
     * Add VML background image for Outlook
     */
    static addVmlBackground(width, height, imageSrc, content, fallbackColor = '#ffffff') {
        return `
    <!--[if mso]>
    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" fill="true" stroke="false" style="width:${width}px;height:${height}px;">
      <v:fill type="tile" src="${imageSrc}" color="${fallbackColor}" />
      <v:textbox inset="0,0,0,0">
    <![endif]-->
    <div>
      ${content}
    </div>
    <!--[if mso]>
      </v:textbox>
    </v:rect>
    <![endif]-->`;
    }

    /**
     * Create Outlook-safe button with VML
     */
    static createVmlButton(text, href, bgColor = '#007bff', textColor = '#ffffff', width = 200, height = 44) {
        const borderRadius = Math.round((height * 10) / 100); // 10% border radius

        return `
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:${height}px;v-text-anchor:middle;width:${width}px;" arcsize="${borderRadius}%" stroke="f" fillcolor="${bgColor}">
      <w:anchorlock/>
      <center style="color:${textColor};font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">
        ${this.escapeHtml(text)}
      </center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="${href}" style="background-color:${bgColor};border-radius:4px;color:${textColor};display:inline-block;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;line-height:${height}px;text-align:center;text-decoration:none;width:${width}px;-webkit-text-size-adjust:none;mso-hide:all;">
      ${this.escapeHtml(text)}
    </a>
    <!--<![endif]-->`;
    }

    /**
     * Fix line-height for Outlook
     */
    static fixLineHeight(content, lineHeight = '1.5') {
        return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="line-height: ${lineHeight}; mso-line-height-rule: exactly;">
          ${content}
        </td>
      </tr>
    </table>`;
    }

    /**
     * Add MSO-specific styles to prevent issues
     */
    static getMsoStyles() {
        return {
            'mso-table-lspace': '0pt',
            'mso-table-rspace': '0pt',
            'mso-line-height-rule': 'exactly'
        };
    }

    /**
     * Wrap content for Outlook DPI fix
     */
    static wrapForDpiFix(content) {
        return `
    <!--[if mso]>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600">
      <tr>
        <td>
    <![endif]-->
    ${content}
    <!--[if mso]>
        </td>
      </tr>
    </table>
    <![endif]-->`;
    }

    /**
     * Create spacer that works in Outlook
     */
    static createOutlookSpacer(height) {
        return `
    <tr>
      <td height="${height}" style="font-size: 1px; line-height: ${height}px; mso-line-height-rule: exactly;">
        &nbsp;
      </td>
    </tr>`;
    }

    /**
     * Fix Outlook image rendering
     */
    static fixImageRendering(imgTag) {
        // Add border:0 and display:block to prevent spacing issues
        return imgTag.replace('<img', '<img border="0" style="display:block;border:0;outline:none;text-decoration:none;"');
    }

    /**
     * Add conditional Outlook-only content
     */
    static addOutlookOnly(content) {
        return `
    <!--[if mso]>
    ${content}
    <![endif]-->`;
    }

    /**
     * Add conditional non-Outlook content
     */
    static addNonOutlookOnly(content) {
        return `
    <!--[if !mso]><!-->
    ${content}
    <!--<![endif]-->`;
    }

    /**
     * Escape HTML
     */
    static escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Get Outlook-safe font stack
     */
    static getOutlookFontStack() {
        return 'Arial, Helvetica, sans-serif';
    }

    /**
     * Fix table spacing in Outlook
     */
    static fixTableSpacing(tableTag) {
        if (!tableTag.includes('cellspacing')) {
            tableTag = tableTag.replace('<table', '<table cellspacing="0"');
        }
        if (!tableTag.includes('cellpadding')) {
            tableTag = tableTag.replace('<table', '<table cellpadding="0"');
        }
        if (!tableTag.includes('border')) {
            tableTag = tableTag.replace('<table', '<table border="0"');
        }
        return tableTag;
    }

    /**
     * Wrap text for proper Outlook rendering
     */
    static wrapTextForOutlook(text, fontSize = '16px', lineHeight = '24px', color = '#333333') {
        return `
    <span style="font-family:Arial,sans-serif;font-size:${fontSize};line-height:${lineHeight};color:${color};mso-line-height-rule:exactly;">
      ${text}
    </span>`;
    }
}

export default OutlookFixes;
