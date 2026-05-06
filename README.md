# 📱 WhatsApp AI Bot (Cloud‑Native, No PC)

A WhatsApp chatbot that runs **entirely on GitHub** using GitHub Actions + GitHub Pages.  
It reads your incoming messages and replies intelligently using OpenRouter's free AI model.

---

## 🧠 How It Works

1. You start the bot via a GitHub Actions workflow.
2. A headless browser launches inside GitHub's cloud runner and connects to WhatsApp Web.
3. A QR code appears on your GitHub Pages site – you scan it with your phone.
4. The bot stays alive (up to 6 hours) and automatically replies to every message using AI.

---

## 🚀 Step‑by‑Step Setup (No Coding Needed)

### 1. Fork or Clone this Repo
- Click the **"Use this template"** button or **fork** the repository.

### 2. Get Your OpenRouter API Key
- Visit [openrouter.ai](https://openrouter.ai) and sign up.
- Go to **Keys** and create a key.
- **Copy** the key (starts with `sk-or-v1-...`).

### 3. Paste the API Key Inside the Code
- Open the file `bot/whatsapp.js`.
- Find the line:  
  `const OPENROUTER_API_KEY = "YOUR_OPENROUTER_API_KEY";`
- Replace `YOUR_OPENROUTER_API_KEY` with your real key.  
  ⚠️ **Do not add any extra spaces or quotes.**  
  Example: `const OPENROUTER_API_KEY = "sk-or-v1-abc123...";`

### 4. (Optional) Prepare a QR Placeholder
- The bot will generate the real QR automatically, but to avoid a 404 error on the first GitHub Pages visit, you can create a tiny transparent PNG.
- Create a file `public/qr.png`. You can use the following **base64** image:
  - Decode this string using an online base64-to-png converter and save it as `qr.png`:
    ```
    iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==
    ```
  - Or simply upload any tiny PNG file.

### 5. Enable GitHub Pages
- Go to your repository on GitHub → **Settings** → **Pages**.
- Under **"Source"**, select **"Deploy from a branch"**.
- Choose branch: `main`, folder: `/public`, then click **Save**.
- After a minute, your site will be live at:  
  `https://<your-username>.github.io/<repo-name>/`

### 6. Start the Bot
- Go to the **Actions** tab of your repo.
- Click on **"WhatsApp AI Bot"** workflow on the left.
- Click the **"Run workflow"** button → **"Run workflow"** green button.
- The workflow will start. Wait about 30‑60 seconds.

### 7. Scan the QR Code
- Open your GitHub Pages URL: `https://<your-username>.github.io/<repo-name>/`
- You should see a QR code (the page auto‑refreshes every 10 seconds).
- On your phone, open **WhatsApp** → **Settings** → **Linked Devices** → **Link a Device**.
- Scan the QR code on your screen.

### 8. Enjoy!
- Once scanned, the terminal log will show "Client is ready!".
- Send a message to the WhatsApp account that is linked. The bot will reply using AI!  
  The bot will keep running until the GitHub Actions job times out (6 hours).

---

## ⏳ Limitations & Important Notes

- **Runtime limit**: GitHub Actions free tier has a 6‑hour job limit. The bot will stop after that.
- **No persistent session**: Because the runner is ephemeral, you may need to re‑scan the QR each time you start the bot.  
  (Using `LocalAuth` tries to reuse the session, but a fresh runner does not retain data.)
- **Unofficial API**: This project uses an unofficial WhatsApp Web automation library.  
  ⚠️ **Your WhatsApp account could be temporarily or permanently banned.** Use at your own risk.
- **Do not spam**: This bot is for personal, non‑abusive use only.
- **Free AI limits**: The OpenRouter free model may have rate limits. If replies stop, check your OpenRouter dashboard.

---

## 🔧 How to Re‑run the Bot After Timeout

1. Go to **Actions** → **WhatsApp AI Bot** → **Run workflow**.
2. Wait for the QR to appear on your Pages site (refresh the page after ~30 sec).
3. Scan the new QR (without unlinking previous – it should work, but sometimes you need to unlink first).

---

## 🛡️ Security

- Your OpenRouter API key is stored **directly** in `bot/whatsapp.js`.  
  Never share that file publicly if your repository is public. Consider using a private repo.
- This code is for educational purposes. Use responsibly.

---

## 📦 File Structure

```
project-root/
├── bot/
│   └── whatsapp.js          # Main bot code
├── public/
│   ├── index.html           # QR display page (auto‑updated)
│   └── qr.png               # QR image (auto‑generated)
├── .github/
│   └── workflows/
│       └── bot.yml          # GitHub Actions workflow
├── package.json
└── README.md
```

---

## ❓ Need Help?
If the QR doesn't appear, make sure:
- The workflow ran successfully (check Actions tab).
- GitHub Pages is enabled and the path is set to `/public`.
- You refreshed the page with a cache‑buster (Ctrl+F5).

Enjoy your cloud‑powered WhatsApp AI assistant! 🚀
