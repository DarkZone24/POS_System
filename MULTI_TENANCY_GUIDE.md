# Supabase Multi-Tenancy & Data Compliance Guide 🛡️

This guide addresses the concern of storing multiple clients' data in a single database. For production environments, data isolation is critical for compliance (e.g., GDPR, local privacy laws).

## Strategy 1: Isolated Supabase Projects (Recommended for POS)
The most robust way to ensure data isolation is to create a **separate Supabase Project for each client**. This ensures that data, users, and even database backups are completely physically separated.

### How to Implement:
Since FreshPOS is packaged as a standalone `.exe`, you can build a custom installer for each client.

1.  **Create a New Supabase Project** for the specific client.
2.  **Run the SQL Schema**: Export your current table structure and run it on the new project's SQL editor.
3.  **Configure `.env`**: Update the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your project's `.env` file with the client's credentials.
4.  **Build the App**: Run `npm run build:exe`.
5.  **Deliver**: The resulting `.exe` will be hard-linked to that specific client's isolated database.

### Deployment to Vercel (Multi-Client)
If you are deploying to the web via Vercel, follow this pattern:

1.  **Generic GitHub Repo**: You only need **one** GitHub repository containing your code.
2.  **Multiple Vercel Projects**: Create a new project in Vercel for **each client** (e.g., `client-a-pos`, `client-b-pos`).
3.  **Link to the same Repo**: Point all Vercel projects to that same single GitHub repository.
4.  **Client-Specific Env Vars**: In each Vercel project's settings (**Settings > Environment Variables**), add that specific client's Supabase credentials:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
5.  **Result**: Vercel will build the same code for every client, but because the environment variables are different, each URL (e.g., `client-a.vercel.app`) will only ever talk to that client's specific database.

---

## Strategy 2: Dynamic Instance Switching (Pro Version)
If you want **one single app** that can connect to different databases based on a login or license key, you can modify the `supabaseClient.js` to be dynamic.

### Implementation Pattern:
```javascript
// Dynamic Client Factory
import { createClient } from '@supabase/supabase-js';

export const getSupabaseClient = (targetUrl, targetKey) => {
  return createClient(targetUrl, targetKey);
};
```
In this model, your app starts by asking for a "Store Code", fetches the correct credentials from a secure "Master Config" DB, and then initializes the POS logic using that client's specific cloud instance.

---

## Strategy 3: Schema-Level Isolation
You can keep one project but use **PostgreSQL Schemas** (e.g., `client_a.products`, `client_b.products`).
- **Pros**: Lower cost (one project).
- **Cons**: More complex management; Supabase JS client doesn't support easy schema switching out-of-the-box (it defaults to `public`).

---

## Strategy 4: Row Level Security (RLS)
The standard Supabase approach is to use a `tenant_id` field on every table and enforce it via RLS.
- **SQL Policy Example**:
  ```sql
  CREATE POLICY "Client Isolation" ON products
  FOR ALL TO authenticated
  USING (client_id = auth.uid());
  ```
- **Compliance Verdict**: This is usually acceptable for standard web apps, but for strict enterprise compliance, **Strategy 1** (Physical Isolation) is preferred.

---

## Summary Recommendation
For a **Production POS System** with multiple independent stores:
1.  Use **Separate Supabase Projects** per client. 
2.  It simplifies backup restores (you won't accidentally restore Client A's data over Client B's).
3.  It provides the highest level of security and compliance.

---

## Supabase SQL Editor - Project Schema 📝
When creating a **new project** for a new client, copy and paste the following script into the Supabase **SQL Editor** to initialize the database structure.

```sql
-- 1. Create Products table
CREATE TABLE products (
  barcode TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  category TEXT,
  stock INT DEFAULT 0,
  unit TEXT DEFAULT 'ea',
  is_vat_exempt BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Transactions table
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  vatable_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_exempt_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  cashier TEXT,
  status TEXT DEFAULT 'paid',
  senior_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Users table
CREATE TABLE users (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier',
  must_change_password BOOLEAN DEFAULT FALSE,
  email TEXT,
  swipe_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Customers table
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  points INT DEFAULT 0,
  join_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Store Profile table
CREATE TABLE store_profile (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT,
  address TEXT,
  tel TEXT,
  tax_mode TEXT DEFAULT 'inclusive',
  enable_crm BOOLEAN DEFAULT FALSE,
  gcash_number TEXT,
  maya_number TEXT,
  gcash_qr TEXT,
  maya_qr TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Time Logs table
CREATE TABLE time_logs (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  clock_out TIMESTAMP WITH TIME ZONE,
  total_hours DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Insert default admin user (Password: admin123)
-- IMPORTANT: Encourage client to change this immediately
INSERT INTO users (username, password, role, must_change_password)
VALUES ('admin', 'admin123', 'admin', true);
```

### Note on Row Level Security (RLS)
By default, the application is designed to sync local data to the cloud. If you enable RLS on these tables, ensure you add policies that allow `anon` or `authenticated` roles to perform `SELECT`, `INSERT`, and `UPDATE` operations based on your security requirements.

*Created for FreshPOS by Antigravity AI*

