# FreshPOS Terminal - Hybrid Cloud Desktop System 🛒🚀

FreshPOS is a professional, enterprise-grade Point of Sale (POS) system designed specifically for grocery stores and retail retail. It features an **Offline-First Hybrid Architecture** that combines local speed with cloud reliability.

---

## 🔑 OWNER'S GUIDE: License Management
To monetize your software, use the built-in **Hardware-Locked Activation System**.

### 🛠️ How to Generate an Activation Key:
1.  Ask the client to send you the **Machine ID** shown on their lock screen (e.g., `ABCD-1234`).
2.  **The Secret Formula**: `FPOS-PR1-` + `{Machine ID}`.
3.  **Example**:
    *   **Client ID**: `89AB-CDEF`
    *   **Your Key**: `FPOS-PR1-89AB-CDEF`

---

## 🖥️ Hardware Requirements (Mid-Level Business)
For smooth operation in a standard grocery environment:

*   **Processor**: Intel Core i5 (12th Gen+) or AMD Ryzen 5.
*   **RAM**: 8 GB Minimum (16 GB for 50k+ items).
*   **Storage**: 256GB SSD (NVMe preferred for instant scanning).
*   **Operating System**: Windows 10/11 (64-bit).
*   **Peripherals**: USB Barcode Scanner, 80mm Thermal Receipt Printer.

---

## 📦 Client Setup Checklist (Step-by-Step)
When installing for a new store, follow these steps in order:

1.  **Installation**: Run `FreshPOS Terminal Setup.exe`. It will create a desktop shortcut.
2.  **Activation**:
    *   Open the app.
    *   If the 7-day trial is over, enter the **Unique Activation Key** generated using the formula above.
3.  **Store Profile**:
    *   Login as `admin`.
    *   Go to **Settings → Store Profile**. 
    *   Enter Store Name, Address, and upload GCash/Maya QR codes.
4.  **Security Setup**:
    *   Go to **Settings → Manage Users**.
    *   Create accounts for Cashiers. 
    *   **Mandatory**: Change the default Admin password.
5.  **Inventory**:
    *   Import products via Excel or add manually in the **Inventory** tab.

---

## 🏗️ Technical Architecture
*   **Frontend**: React + Vite (Fast UI)
*   **Desktop Wrapper**: Electron (Standalone .exe)
*   **Database**: IndexedDB (Unlimited local storage, works 100% offline)
*   **Cloud Sync**: Supabase (Real-time remote backup & multi-branch reporting)
*   **Lock Engine**: Deterministic Hardware-Hashing Algorithmic system.

---

## 🛡️ Security Features
*   **7-Day Auto-Lock**: Automatically restricts access if a license is not provided.
*   **OTP Verification**: Multi-step identity verification for password changes.
*   **Role-Based Access**: Strict separation between Admin and Cashier functions.
*   **Audit Logging**: Every sale, void, and setting change is tracked.

---

## 🚀 Commands for the Developer
```bash
# Start Web Dev Server
npm run dev

# Start Desktop App (Dev Mode)
npm run dev:desktop

# Build Production Web Bundle
npm run build

# Build Windows Installer (.exe)
npm run build:exe
```

---

## 📞 Support & Maintenance
Developer Email: `itdeveloper081124@gmail.com`
Support Hours: Mon-Fri 9 AM - 6 PM

© 2026 FreshPOS Terminal. All Rights Reserved.
