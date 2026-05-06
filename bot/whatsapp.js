/**
 * WhatsApp AI Bot - Using whatsapp-web.js + OpenRouter
 * IMPORTANT: Replace YOUR_OPENROUTER_API_KEY below with your real key.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ==================== HARDCODED CONFIG ====================
// Insert your OpenRouter API key here (no .env needed)
const OPENROUTER_API_KEY = "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";
const OPENROUTER_MODEL = "openai/gpt-oss-120b:free";

// ==================== PATHS ====================
const PUBLIC_DIR = path.join(__dirname, '..', 'docs');
const QR_IMAGE_PATH = path.join(PUBLIC_DIR, 'qr.png');
const HTML_PATH = path.join(PUBLIC_DIR, 'index.html');

// Ensure public folder exists
if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// ==================== WHATSAPP CLIENT ====================
// Using LocalAuth to try to keep session across runs (may work if persistent)
// In GitHub Actions the runner is fresh, so session won't survive,
// but this doesn't hurt.
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // Needed for GitHub Actions (no sandbox environment)
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// ==================== QR CODE GENERATION ====================
client.on('qr', async (qr) => {
    console.log('QR Code received, generating image...');

    // 1. Save QR as PNG file
    try {
        await QRCode.toFile(QR_IMAGE_PATH, qr, {
            type: 'png',
            width: 300,
            margin: 2
        });
        console.log(`QR image saved to ${QR_IMAGE_PATH}`);
    } catch (err) {
        console.error('Failed to save QR image:', err);
        return;
    }

    // 2. Create/GH-Pages display page (auto-refresh every 10 sec)
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="10"> <!-- auto-refresh to get latest QR -->
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
        // Cache buster to avoid showing old QR after image update
        (function() {
            var img = document.getElementById('qr');
            var src = img.src;
            // Replace placeholder with current time once
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

// ==================== AUTHENTICATION READY ====================
client.on('ready', () => {
    console.log('\n✅ WhatsApp client is ready! Bot is now listening for messages.\n');
});

// ==================== AI RESPONSE FUNCTION ====================
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
                    'HTTP-Referer': 'https://github.com/yourusername/your-repo',  // optional, can be changed
                    'X-Title': 'WhatsApp AI Bot'
                }
            }
        );

        // Extract the assistant's reply
        const reply = response.data.choices[0].message.content;
        return reply;
    } catch (error) {
        console.error('AI error:', error.response ? error.response.data : error.message);
        return "Sorry, I'm having trouble thinking right now. Please try later.";
    }
}

// ==================== MESSAGE HANDLER ====================
client.on('message', async (msg) => {
    // Ignore messages sent by the bot itself
    if (msg.fromMe) return;

    const contact = await msg.getContact();
    const senderName = contact.pushname || contact.number;
    console.log(`📩 New message from ${senderName}: "${msg.body}"`);

    // Show typing indicator (makes it feel more natural)
    await msg.getChat().then(chat => chat.sendStateTyping());

    // Get AI reply
    const aiResponse = await getAIResponse(msg.body);

    // Send the reply
    try {
        const sent = await msg.reply(aiResponse);
        console.log(`✅ Replied to ${senderName}: "${aiResponse}"`);
    } catch (err) {
        console.error('Failed to send reply:', err);
    }
});

// ==================== START THE BOT ====================
console.log('Starting WhatsApp bot...');
client.initialize();

// Graceful shutdown (helps session saving)
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await client.destroy();
    process.exit(0);
});
