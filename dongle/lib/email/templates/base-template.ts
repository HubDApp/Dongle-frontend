/**
 * Base email template
 * 
 * Provides consistent styling and structure for all emails
 */

export interface BaseTemplateProps {
  title: string;
  previewText: string;
  content: string;
  footerText?: string;
}

export function baseEmailTemplate({
  title,
  previewText,
  content,
  footerText = "This is an automated message from Dongle. Please do not reply to this email.",
}: BaseTemplateProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #ffffff;
      text-decoration: none;
    }
    .content {
      padding: 32px 24px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #3b82f6;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 16px 0;
    }
    .button:hover {
      background-color: #2563eb;
    }
    .footer {
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #71717a;
      border-top: 1px solid #e4e4e7;
    }
    .divider {
      height: 1px;
      background-color: #e4e4e7;
      margin: 24px 0;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 24px 16px;
      }
      .header {
        padding: 24px 16px;
      }
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${previewText}
  </div>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="email-container">
          <!-- Header -->
          <tr>
            <td class="header">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://dongle.app"}" class="logo" style="color: #ffffff;">
                Dongle
              </a>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="content">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="footer">
              <p style="margin: 0 0 8px 0;">${footerText}</p>
              <p style="margin: 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://dongle.app"}/settings/notifications" style="color: #3b82f6; text-decoration: none;">
                  Manage notification preferences
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Convert HTML email to plain text (basic version)
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, "")
    .replace(/<script[^>]*>.*?<\/script>/gis, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
