/**
 * WhatsApp AI Bot – Improved with stealth puppeteer settings
 * Replace YOUR_OPENROUTER_API_KEY below
 */
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ==================== CONFIG ====================
const OPENROUTER_API_KEY = "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";   // <-- change this!
const OPENROUTER_MODEL = "openai/gpt-oss-120b:free";

// ==================== PATHS (using docs folder) ====================
const PUBLIC_DIR = path.join(__dirname, '..', 'docs');
const QR_IMAGE_PATH = path.join(PUBLIC_DIR, 'qr.png');
const HTML_PATH = path.join(PUBLIC_DIR, 'index.html');

if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// ==================== STEALTH PUPPETEER OPTIONS ====================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: "new",                         // New headless mode (less detectable)
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920,1080',
            // Realistic User-Agent so WhatsApp doesn't block us
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            // Disable automation flags
            '--disable-blink-features=AutomationControlled',
            // Additional flags to avoid detection
            '--disable-features=ChromeWhatsAppService',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-web-security',
            '--disable-features=AudioServiceOutOfProcess',
        ]
    }
});

// ==================== QR CODE GENERATION ====================
client.on('qr', async (qr) => {
    console.log('QR Code received, generating image...');
    try {
        await QRCode.toFile(QR_IMAGE_PATH, qr, {
            type: 'png',
            width: 300,
            margin: 2
        });
        console.log(`QR saved to ${QR_IMAGE_PATH}`);
    } catch (err) {
        console.error('Failed to save QR:', err);
        return;
    }

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="10">
    <title>WhatsApp Bot - Scan QR</title>
    <style>
        body { font-family: Arial; text-align: center; padding-top: 50px; background: #f0f0f0; }
        img { border: 10px solid white; border-radius: 10px; box-shadow: 0 0 15px rgba(0,0,0,0.2); }
        h2 { color: #333; }
        .footer { margin-top: 30px; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <h2>🤖 WhatsApp AI Bot - Scan QR Code</h2>
    <img id="qr" src="qr.png?t=__TIMESTAMP__" alt="QR Code" style="width:300px; height:300px;">
    <p>Open WhatsApp on your phone, go to <strong>Settings > Linked Devices</strong> and scan this code.</p>
    <div class="footer">Page auto-refreshes every 10 seconds. Keep waiting until you see the QR.</div>
    <script>
        (function() {
            var img = document.getElementById('qr');
            var src = img.src;
            img.src = src.replace('__TIMESTAMP__', Date.now());
        })();
    </script>
</body>
</html>`;

    try {
        fs.writeFileSync(HTML_PATH, htmlContent);
        console.log(`Display page updated at ${HTML_PATH}`);
    } catch (err) {
        console.error('Failed to write HTML:', err);
    }
});

// ==================== AUTHENTICATION EVENTS ====================
client.on('ready', () => {
    console.log('\n✅ WhatsApp client is ready! Bot is now listening.\n');
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
    // Optionally restart? We won't do automatic restart here.
});

// ==================== AI RESPONSE ====================
async function getAIResponse(prompt) {
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: OPENROUTER_MODEL,
                messages: [{ role: 'user', content: prompt }]
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com/yourusername/your-repo',
                    'X-Title': 'WhatsApp AI Bot'
                }
            }
        );
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('AI error:', error.response ? error.response.data : error.message);
        return "Sorry, I'm having trouble thinking right now. Please try later.";
    }
}

// ==================== MESSAGE HANDLER ====================
client.on('message', async (msg) => {
    if (msg.fromMe) return;

    const contact = await msg.getContact();
    const senderName = contact.pushname || contact.number;
    console.log(`📩 New message from ${senderName}: "${msg.body}"`);

    await msg.getChat().then(chat => chat.sendStateTyping());

    const aiResponse = await getAIResponse(msg.body);

    try {
        await msg.reply(aiResponse);
        console.log(`✅ Replied to ${senderName}`);
    } catch (err) {
        console.error('Failed to send reply:', err);
    }
});

// ==================== START ====================
console.log('Starting WhatsApp bot...');
client.initialize();
