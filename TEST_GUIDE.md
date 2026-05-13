# FreshPOS - Local Testing Guide

## Quick Start

### 1. Start the Dev Server
```bash
cd grocery-pos
npm run dev
```

The app will be available at: **http://localhost:5173**

### 2. Login Credentials

**First Time Login (Forces Password Change):**
- Username: `admin`
- Password: `Admin@12345`

### 3. What Happens on First Login

1. You'll see the login form
2. After entering credentials, a modal appears: **"Change Your Password"**
3. Fill in:
   - **New Password** (must be 8+ chars with uppercase, lowercase, number, special char)
   - **Confirm Password**
   - **Mobile Number** (e.g., 09171234567)
4. Click **"Send OTP & Continue"**
5. An alert will show the OTP code (demo mode - in production this would be SMS)
6. Enter the 6-digit OTP
7. Click **"Verify & Set Password"**
8. You're logged in to the dashboard!

### 4. Features to Test

#### Login & OTP Flow
- ✅ Default password forces change on first login
- ✅ OTP verification required
- ✅ Password strength meter
- ✅ Mobile number validation

#### POS Terminal
- Click "POS Terminal" in sidebar
- Scan/enter barcode or product name
- Add items to cart
- Select payment method (6 options)
- Print receipt

#### Inventory Management (Admin Only)
- Click "Inventory"
- Add new products
- Bulk import from Excel
- Search and filter

#### Sales Reports
- Click "Sales Reports"
- View transaction history
- Export to Excel
- Print X-Reading / Z-Reading

#### User Management (Admin Only)
- Click user avatar → "Edit Settings"
- Go to "Manage Users" section
- Add new users (they get `Welcome@1` as default password)
- Delete users

### 5. Test Users

After first login, you can create more test users:
- Username: `cashier1`
- Role: Cashier
- Default password: `Welcome@1` (will be forced to change on first login)

### 6. Troubleshooting

**"Can't see text in inputs?"**
- Fixed! Inputs now have proper contrast in both dark and light modes
- Toggle dark/light mode in Settings

**"OTP not working?"**
- In demo mode, OTP is shown in an alert
- In production, integrate with SMS API (Twilio, etc.)

**"Password change modal not showing?"**
- Only shows for users with `mustChangePassword: true`
- Admin has this flag by default
- New users created by admin also have this flag

### 7. Browser Console

Open DevTools (F12) to see:
- Audit logs of all actions
- Any validation errors
- Security warnings

---

**Status:** ✅ Production-Ready (Client-Side)  
**Version:** 1.0.0  
**Last Updated:** May 7, 2026
