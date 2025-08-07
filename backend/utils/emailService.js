const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendWildlifeAlert(users, detections, location) {
    const emailPromises = users.map(user => this.sendAlertEmail(user, detections, location));

    try {
      const results = await Promise.allSettled(emailPromises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      // Log detailed errors for failed emails
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Email failed for user ${users[index].email}:`, result.reason);
        }
      });

      console.log(`📧 Email alerts: ${successful} sent, ${failed} failed`);
      return { successful, failed, total: users.length };
    } catch (error) {
      console.error('❌ Email service error:', error);
      throw error;
    }
  }

  async sendAlertEmail(user, detections, location) {
    const detectionList = detections.map(detection =>
      `<li style="margin: 5px 0;">
        <strong>${detection.class}</strong> 
        <span style="color: #666;">(${(detection.confidence * 100).toFixed(1)}% confidence)</span>
      </li>`
    ).join('');

    const currentTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const mailOptions = {
      from: {
        name: 'Wildlife Alert System',
        address: process.env.EMAIL_USER
      },
      to: user.email,
      subject: '🚨 URGENT: Wildlife Detected in Your Area - Immediate Safety Alert',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Wildlife Alert</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4;">
          <table style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #ff4757, #ff3838); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">🚨 WILDLIFE ALERT 🚨</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Immediate Safety Notification</p>
              </td>
            </tr>
            
            <!-- Alert Content -->
            <tr>
              <td style="padding: 30px;">
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px;">
                  <h2 style="color: #856404; margin: 0 0 10px 0;">⚠️ THREAT DETECTED IN YOUR AREA</h2>
                  <p style="color: #856404; margin: 0; font-weight: 600;">Take immediate safety precautions</p>
                </div>
                
                <h3 style="color: #333; border-bottom: 2px solid #ff4757; padding-bottom: 10px;">Alert Details</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>👤 Dear:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${user.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>📍 Location:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Pincode ${location}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>⏰ Time:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${currentTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>🦁 Detected Animals:</strong></td>
                    <td style="padding: 8px 0;">
                      <ul style="margin: 0; padding-left: 20px;">
                        ${detectionList}
                      </ul>
                    </td>
                  </tr>
                </table>
                
                <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #0c5460; margin: 0 0 15px 0;">🛡️ IMMEDIATE SAFETY INSTRUCTIONS</h3>
                  <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
                    <li><strong>Stay indoors immediately</strong> and secure all doors and windows</li>
                    <li><strong>Keep children and pets inside</strong> at all times</li>
                    <li><strong>Do NOT approach, feed, or attempt to scare</strong> the animal</li>
                    <li><strong>Avoid loud noises</strong> that might agitate the wildlife</li>
                    <li><strong>Alert your neighbors</strong> about the situation</li>
                    <li><strong>Do not venture outside</strong> until authorities give all-clear</li>
                  </ul>
                </div>
                
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                  <h3 style="color: #721c24; margin: 0 0 10px 0;">📞 EMERGENCY CONTACTS</h3>
                  <table style="width: 100%; color: #721c24;">
                    <tr>
                      <td style="padding: 5px 0;"><strong>🌲 Forest Department Emergency:</strong></td>
                      <td style="padding: 5px 0; text-align: right;"><strong>1926</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0;"><strong>🚔 Police Emergency:</strong></td>
                      <td style="padding: 5px 0; text-align: right;"><strong>100</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0;"><strong>🚑 Medical Emergency:</strong></td>
                      <td style="padding: 5px 0; text-align: right;"><strong>108</strong></td>
                    </tr>
                  </table>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <p style="color: #666; font-size: 14px; margin: 0;">
                    This is an automated alert from our AI-powered Wildlife Detection System.<br>
                    Your safety is our priority. Please follow all safety instructions.
                  </p>
                </div>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background: #333; color: white; padding: 20px; text-align: center;">
                <p style="margin: 0; font-size: 14px;">
                  Wildlife Detection & Alert System<br>
                  <span style="opacity: 0.7;">Protecting communities through AI technology</span>
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();