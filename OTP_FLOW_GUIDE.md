# OTP Authentication Flow - Visual Guide

## Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    LOGIN PAGE                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Username: [admin                                   ] │  │
│  │ Password: [••••••••••••••••••••••••••••••••••••••] │  │
│  │                                                      │  │
│  │              [LOGIN TO SYSTEM]                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
                    (Credentials Valid)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              FORCE PASSWORD CHANGE MODAL                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🔐 Change Your Password                            │  │
│  │  You must set a new password before continuing.     │  │
│  │  An OTP will be sent to verify.                     │  │
│  │                                                      │  │
│  │  New Password:                                       │  │
│  │  [••••••••••••••••••••••••••••••••••••••••••••••] │  │
│  │  ████░░░░░ Strong                                   │  │
│  │                                                      │  │
│  │  Confirm Password:                                  │  │
│  │  [••••••••••••••••••••••••••••••••••••••••••••••] │  │
│  │                                                      │  │
│  │  Mobile Number (OTP will be sent here):             │  │
│  │  [09171234567                                     ] │  │
│  │                                                      │  │
│  │           [SEND OTP & CONTINUE]                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
                  (Alert shows OTP)
                  [DEMO] OTP sent to 09171234567: 123456
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  OTP VERIFICATION MODAL                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  OTP sent to 09171234567                            │  │
│  │                                                      │  │
│  │  Enter 6-digit OTP:                                 │  │
│  │  [1  2  3  4  5  6]                                 │  │
│  │                                                      │  │
│  │  [← BACK]  [VERIFY & SET PASSWORD]                 │  │
│  │                                                      │  │
│  │  [Resend OTP]                                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
                  (OTP Verified)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    DASHBOARD                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ FreshPOS - Store Performance                        │  │
│  │                                                      │  │
│  │ Today's Sales: ₱0.00                                │  │
│  │ Total Revenue: ₱0.00                                │  │
│  │ Inventory Items: 0                                  │  │
│  │ Paid Orders: 0                                      │  │
│  │                                                      │  │
│  │ [START NEW SALE]                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Password Strength Meter
```
Very Weak: ████░░░░░ (Red)
Weak:      ████████░░ (Orange)
Fair:      ████████░░ (Yellow)
Good:      ████████░░ (Light Green)
Strong:    ██████████ (Green)
```

### 2. Password Requirements
✅ 8+ characters  
✅ Uppercase letter (A-Z)  
✅ Lowercase letter (a-z)  
✅ Number (0-9)  
✅ Special character (!@#$%^&*)  

### 3. Mobile Number Validation
✅ Minimum 10 digits  
✅ Accepts any format (09171234567, +639171234567, etc.)  
✅ Strips non-numeric characters  

### 4. OTP Generation
✅ 6-digit random code  
✅ Demo mode: Shows in alert  
✅ Production: Send via SMS API  
✅ Resend button available  

## Default Credentials

| User | Username | Password | First Login | Role |
|------|----------|----------|-------------|------|
| Admin | admin | Admin@12345 | Force Change | Admin |
| New User | (custom) | Welcome@1 | Force Change | Cashier/Supervisor |

## After First Login

Once password is changed and OTP verified:
- User is logged in
- `mustChangePassword` flag is cleared
- Next login uses new password (no OTP needed)
- User can access all features based on role

## Security Features

🔒 **Brute Force Protection:** 5 failed attempts = 15 min lockout  
🔒 **Password Strength:** Enforced requirements  
🔒 **OTP Verification:** Phone number required  
🔒 **Audit Logging:** All actions logged  
🔒 **Input Validation:** All inputs sanitized  
🔒 **XSS Protection:** HTML entity escaping  

---

**Ready to test!** Open http://localhost:5173 in your browser.
