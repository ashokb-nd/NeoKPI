# Chrome Web Store Submission Guide

## 📦 Package Ready!
Your extension is packaged and ready: `dist/neokpi-chrome-extension.zip`

## 🚀 Step-by-Step Submission Process

### 1. Chrome Web Store Developer Account
- Go to [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole/)
- **One-time fee:** $5 USD registration fee
- Sign in with your Google account
- Complete developer verification

### 2. Upload Your Extension
1. Click **"Add new item"**
2. Upload `dist/neokpi-chrome-extension.zip`
3. Wait for automatic analysis (takes 1-2 minutes)

### 3. Fill Store Listing Details

#### **Store Listing Tab:**
- **Product icon:** Already included (128x128)
- **Promotional tile:** Optional (440x280 px) - create if desired
- **Screenshots:** Required (1280x800 px)
  - Take screenshots of your extension in action
  - Show the popup, notepad, bulk mode, etc.
  - Need at least 1, up to 5 screenshots

#### **Product Details:**
- **Name:** NeoKPI - Alert Debug Enhancer
- **Summary:** Lightning-fast keyboard shortcuts and productivity tools for Alert Debug
- **Description:** Use the content from `store-assets/store-description.md`
- **Category:** Productivity
- **Language:** English

#### **Privacy Practices:**
- **Single purpose:** Enhances productivity on analytics-kpis.netradyne.com
- **Permission justification:** 
  - `storage`: Save user notes and preferences locally
  - `activeTab`: Interact with Alert Debug page
  - `host_permissions`: Only works on analytics-kpis.netradyne.com
- **Privacy policy:** Host the content from `store-assets/privacy-policy.md` on a public URL

### 4. Distribution Settings
- **Pricing:** Free
- **Distribution:** Public (or Unlisted if only for internal use)
- **Regions:** All regions (or specific if needed)

### 5. Review Process
- **Initial review:** 1-3 business days for new extensions
- **Updates:** Usually faster (few hours to 1 day)
- **Possible rejections:** 
  - Missing privacy policy URL
  - Insufficient screenshots
  - Permission justification needed

## 🔧 Before Submission Checklist

- ✅ Extension works in local testing
- ✅ Package created (`npm run package:store`)
- ✅ Privacy policy hosted publicly
- ✅ Screenshots taken (1280x800 px)
- ✅ Store listing description ready
- ✅ $5 developer fee paid
- ✅ All permissions justified

## 📋 Submission Requirements

### Required Files (✅ Already included):
- `manifest.json` with all required fields
- Content script (`content-script.js`)
- Extension icons (16, 48, 128 px)
- Popup files (`popup.html`, `popup.js`)

### Required Info:
- **Privacy Policy URL** - You need to host this publicly
- **Screenshots** - Take 1-5 screenshots at 1280x800
- **Store description** - Use `store-assets/store-description.md`

## 🌐 Host Privacy Policy

You need to host your privacy policy publicly. Options:

1. **GitHub Pages** (Free):
   ```bash
   # Create a simple HTML page
   echo '<html><body><pre>' > privacy.html
   cat store-assets/privacy-policy.md >> privacy.html
   echo '</pre></body></html>' >> privacy.html
   # Upload to GitHub and enable Pages
   ```

2. **Google Sites** (Free): Copy/paste the privacy policy content

3. **Your company website**: Host it on your domain

## ⚠️ Important Notes

- **Target audience:** This extension is very specific to Netradyne's system
- **Consider internal distribution:** You might want "Unlisted" instead of "Public"
- **Domain restriction:** Extension only works on analytics-kpis.netradyne.com
- **No monetization:** Keep it free since it's a productivity tool

## 📱 Testing Before Submission

1. Install locally: Load `dist/chrome-extension` as unpacked
2. Test all features on the target website
3. Verify permissions work correctly
4. Check popup functionality
5. Test in incognito mode

## 🎯 Alternative: Internal Distribution

If this is primarily for Netradyne employees:

1. **Unlisted listing:** Not searchable, share direct link
2. **Enterprise deployment:** Deploy through Google Workspace
3. **Direct installation:** Share the `.zip` file for manual loading

## Next Steps

1. **Take screenshots** of your extension in action
2. **Host privacy policy** on a public URL  
3. **Pay $5 developer fee** on Chrome Web Store
4. **Upload and submit** your extension
5. **Wait for review** (1-3 business days)

Your extension is ready to go! 🚀
