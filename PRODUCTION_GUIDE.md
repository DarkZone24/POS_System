# FreshPOS Production & Deployment Guide 🚀

This guide provides the final steps to deploy your grocery POS system to the web and package it as a Windows Desktop application.

## 1. Web Deployment (Vercel / Netlify)
Ideal for multi-terminal access via browser.

### Steps:
1. **Push to GitHub**: Initialize a repo and push your code.
2. **Connect to Vercel**: Import the project.
3. **Environment Variables**: You MUST add these in the Vercel/Netlify dashboard:
   - `VITE_SUPABASE_URL`: Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
4. **Build Command**: Set to `npm run build`.
5. **Output Directory**: Set to `dist`.

---

## 2. Desktop Application (.exe)
Ideal for dedicated store hardware.

### Build Command:
Open your terminal in the project folder and run:
```powershell
npm run build:exe
```

### Outcome:
- A new folder named `dist-electron` will be created.
- Inside, you will find `FreshPOS Terminal Setup 1.0.1.exe`.
- This is your standalone installer! Give this to your client to install on their PC.

---

## 3. Production Check-list (Before Launch) 🛡️
- [ ] **EmailJS**: Ensure you have a valid Service ID and Template ID in `App.jsx` for the OTP flow.
- [ ] **Supabase RLS**: In your Supabase Dashboard, make sure your tables have correct RLS policies.
- [ ] **Data Scrub**: Perform one final "FACTORY RESET" in the app settings to clear test transactions before the official store opening.
- [ ] **Hardware**: Connect your barcode scanner and test it on the POS Terminal.

*Created for FreshPOS by Antigravity AI*
