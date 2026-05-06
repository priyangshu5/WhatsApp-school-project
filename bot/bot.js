/**
 * WhatsApp AI Bot – Baileys (pure JS) + QR image on Pages
 * Hardcoded OpenRouter key: change the value below
 */
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ==================== HARDCODED CONFIG ====================
const OPENROUTER_API_KEY = "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";   // <<< CHANGE THIS
const OPENROUTER_MODEL = "openai/gpt-oss-120b:free";

// ==================== PATHS (using docs folder) ====================
const PUBLIC_DIR = path.join(__dirname, '..', 'docs');
const QR_IMAGE_PATH = path.join(PUBLIC_DIR, 'qr.png');
const HTML_PATH = path.join(PUBLIC_DIR, 'index.html');

// Make sure docs folder exists
if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// ==================== QR CODE GENERATOR (saves image) ====================
async function saveQRImage(qrString) {
    try {
        await QRCode.toFile(QR_IMAGE_PATH, qrString, {
            type: 'png',
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        console.log(`✅ QR saved to ${QR_IMAGE_PATH}`);
    } catch (err) {
        console.error('Failed to save QR:', err);
    }
}

// ==================== UPDATE THE DISPLAY PAGE ====================
function updateDisplayPage() {
    const html = `<!DOCTYPE html>
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
    fs.writeFileSync(HTML_PATH, html);
    console.log('Display page updated.');
}

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
                    'HTTP-Referer': 'https://github.com/priyangshu5/WhatsApp-school-project',
                    'X-Title': 'WhatsApp AI Bot'
                }
            }
        );
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('AI error:', error.response?.data || error.message);
        return "Sorry, I'm having trouble thinking right now. Please try later.";
    }
}

// ==================== MAIN BOT START ====================
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session_data');
    const { version, isLatest } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,        // we'll handle QR ourselves
        logger: require('pino')({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '20.0.04']   // realistic browser info
    });

    // ---- Handle connection updates (QR + ready) ----
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // New QR code received
        if (qr) {
            console.log('QR Code received, generating image...');
            await saveQRImage(qr);
            updateDisplayPage();
            // The workflow will pick up these files and commit them
            // (We rely on the GitHub Actions step to git add & commit)
        }

        // Connection opened
        if (connection === 'open') {
            console.log('✅ WhatsApp AI Bot is online and listening!');
        }

        // Connection closed – try to restart automatically
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log('Connection closed, reason:', reason);
            if (reason !== DisconnectReason.loggedOut) {
                console.log('Reconnecting...');
                startBot();   // restart
            } else {
                console.log('Logged out. Please re-scan QR.');
                // Exit so the workflow ends; user can re-trigger
                process.exit(1);
            }
        }
    });

    // ---- Save credentials whenever they update ----
    sock.ev.on('creds.update', saveCreds);

    // ---- Incoming messages ----
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;           // ignore own messages
        if (msg.key.remoteJid === 'status@broadcast') return; // ignore status updates

        const sender = msg.key.remoteJid;
        const text = (msg.message.conversation ||
                      msg.message.extendedTextMessage?.text || '').trim();

        if (!text) return;   // ignore empty messages

        console.log(`📩 From: ${sender.split('@')[0]} => "${text}"`);

        // Show typing indicator (Baileys can't do typing indicator easily, so we skip)
        // Get AI reply
        const aiReply = await getAIResponse(text);

        // Send reply
        try {
            await sock.sendMessage(sender, { text: aiReply });
            console.log(`✅ Replied: "${aiReply}"`);
        } catch (err) {
            console.error('Failed to send reply:', err);
        }
    });
}

// Start the bot
startBot().catch(err => {
    console.error('Bot crashed:', err);
    process.exit(1);
});
