# FreshPOS User Security Guide

## Getting Started Safely

### Initial Setup
1. **Change Default Password** (CRITICAL)
   - Default admin: username `admin`, password `password123`
   - IMMEDIATELY change this password after first login
   - Use Settings > User Management

2. **Create Strong Password**
   - Password must meet these requirements:
     - At least 8 characters long
     - Include uppercase letters (A-Z)
     - Include lowercase letters (a-z)
     - Include numbers (0-9)
     - Include special characters (!@#$%^&*)

### Example Strong Passwords
✅ `SecurePos@2024!`  
✅ `Fresh$Grocery123`  
✅ `MyPOS#Admin456!`  

### Example Weak Passwords
❌ `password123` (no uppercase/special)  
❌ `Admin2024` (no special character)  
❌ `Pass@1` (too short)  

## Login Security

### Brute Force Protection
- System blocks account after 5 failed login attempts
- Locked for 15 minutes to prevent hacking
- Try again with correct password after timeout

**What to do if locked out:**
1. Wait 15 minutes
2. Try login again with correct credentials
3. Contact admin if password forgotten

### Login Best Practices
1. Only share your username/password with IT admin when setting up
2. Never write down your password
3. Don't use same password as other systems
4. Change password if you suspect compromise
5. Log out when finished (click LogOut button)

## Input Security

### Barcode Scanning
- Scan barcodes directly into barcode field
- Quantity field accepts numbers 1-9999 only
- Invalid barcodes show error message
- Can't accidentally add invalid items

### Product Addition
- Product names limited to 255 characters
- Prices automatically rounded to 2 decimals
- Invalid prices rejected (max ₱999,999.99)
- Duplicate barcodes prevent confusion

### Search
- Search limited to 100 characters
- Prevents system slowdown
- All results filtered securely

## Transaction Security

### Receipt Details
Receipt now includes:
- Transaction reference number
- Date and time
- Cashier name
- **Payment method used** ← NEW
- VAT amount
- Total amount

### Payment Methods
When completing a sale, select payment method:
- 💵 Cash
- 💳 Credit Card
- 💳 Debit Card
- 📱 GCash
- 📱 Maya
- 📲 QR PH

### Void Transaction Safety
- Only supervisors can approve voids
- Requires swipe ID authentication
- Reason must be documented
- All voids logged in audit trail
- Original transaction kept (marked voided)

## User Management (Admin Only)

### Adding New Cashiers
1. Go to Settings > User Management
2. Enter username (3-20 characters, alphanumeric)
3. Set strong password (show strength indicator)
4. Assign role (admin/cashier)
5. Save

### Password Rules for All Users
| Requirement | Example |
|---|---|
| Length | 8+ characters |
| Uppercase | A, B, C, ... Z |
| Lowercase | a, b, c, ... z |
| Numbers | 0, 1, 2, ... 9 |
| Special | !@#$%^&* |

### Role-Based Access
**Admin Role:**
- Access all views (Dashboard, POS, Inventory, Reports)
- Manage users
- View audit logs
- Configure store settings

**Cashier Role:**
- Access only POS terminal
- Cannot view reports or inventory
- Cannot manage users

## Data Protection

### Local Storage
- Product database stored securely
- Transaction history protected
- User credentials encrypted
- Audit logs maintained

### Clearing Data
To protect privacy:
1. Don't share your device with others
2. Clear browser cache regularly
3. Log out when finished
4. Use private/incognito mode if shared device

## Common Security Issues

### Issue: "Account Temporarily Locked"
**Cause:** Too many wrong password attempts  
**Solution:** Wait 15 minutes, try again with correct password

### Issue: "Invalid username or password"
**Cause:** Wrong username or password  
**Solution:** Check caps lock, try again carefully

### Issue: "Invalid barcode format"
**Cause:** Barcode contains invalid characters  
**Solution:** Scan again or check barcode number

### Issue: "Product name is required"
**Cause:** Name field empty or too long  
**Solution:** Enter 1-255 character product name

### Issue: "Weak password"
**Cause:** Password doesn't meet requirements  
**Solution:** Add uppercase, lowercase, number, and special character

## Audit Trail

### What Gets Logged
- Login attempts (success and failure)
- Product additions
- Transaction creation
- Transaction voids (with reason)
- User management changes
- Item scans

### Who Can View
- Admin can access audit logs
- Used for security investigation
- Helps identify suspicious activity
- Kept for 10,000+ entries

## Tips for Safe Usage

### Daily Checklist
- [ ] Change default password (first time only)
- [ ] Log out when leaving workstation
- [ ] Don't leave computer unattended
- [ ] Close browser when finished
- [ ] Report suspicious activity

### Weekly Tasks
- [ ] Review audit logs for unusual activity
- [ ] Check user management for unauthorized accounts
- [ ] Verify transaction totals make sense

### Monthly Tasks
- [ ] Change password if suspected compromise
- [ ] Review sales reports for anomalies
- [ ] Backup important data
- [ ] Update any exposed passwords

## Reporting Security Issues

### If You Suspect A Breach:
1. **Stop using the system**
2. **Inform administrator immediately**
3. **Change your password**
4. **Review recent transactions**
5. **Check audit logs for suspicious activity**

### What To Report:
- Unauthorized access
- Missing transactions
- Unusual user activity
- Failed security features
- Suspected malware
- Phishing attempts

## FAQ

**Q: Can I share my password with my manager?**  
A: No. Manager can reset your password instead through admin panel.

**Q: What if I forget my password?**  
A: Click "Forgot Password?" on login screen. Enter username, then set new password.

**Q: Is my data backed up?**  
A: Yes, browser stores data locally. Back it up regularly through Reports > Export.

**Q: Can I use the same password as my email?**  
A: Not recommended. Each system should have unique strong passwords.

**Q: What happens to my transactions if I change password?**  
A: Transactions are not affected. Only your login credentials change.

**Q: How secure is the system?**  
A: Very secure. It includes encryption, validation, rate limiting, and audit logging. For production, use HTTPS and server-side security.

**Q: What if payment method shows "N/A"?**  
A: Old transactions before payment method feature. All new transactions will show payment method.

## Support Contact

For security questions:
- Contact your system administrator
- Email: security@freshpos.local
- Include description of issue
- Provide transaction reference if applicable

---

**Remember:** Security is everyone's responsibility. Follow these guidelines to keep the system safe!

**Last Updated**: May 7, 2026  
**Version**: 1.0
