# Siddheshwar Jewelers — Gold Mortgage Calculator

A lightweight, mobile-first web app designed specifically for **Siddheshwar Jewelers** to calculate monthly interest on gold-mortgage loans and securely persist calculation snapshots to MongoDB Atlas.

> **Note:** This is a focused, single-purpose calculator and calculation history log. It is **not** a heavy ERP system.

---

## 1. Features

- **Mobile-First UX**: Tailored for one-handed phone use, fast input, large touch-friendly buttons, and safe-area margins (iPhone notch and gesture bars).
- **Exact Calendar-Month Interest Engine**: Uses real calendar anniversary logic (preventing 30-day approximations and leap-year / 31st-of-month date bugs).
- **Paise Precision**: All monetary calculations operate in integer paise to avoid IEEE-754 floating-point drift.
- **Auto Asia/Kolkata As-Of Date**: Automatically pulls today's date in `Asia/Kolkata` time and refreshes on app load and tab focus.
- **PIN Access Protection**: Minimal owner authentication gate using `HttpOnly`, `Secure`, `SameSite=Lax` cryptographic HMAC session cookies.
- **History Snapshot Log**: Persists frozen calculations to MongoDB with server-side validation and recalculation.
- **Frozen Snapshot Viewer**: Inspects original records without silently recalculating, with a one-click *"Recalculate as of today"* option.
- **RFC-4180 CSV Export**: One-click export of calculation history for offline bookkeeping backup.
- **PWA Ready**: Add to home screen on iOS Safari and Android Chrome with standalone display and custom icon.

---

## 2. Exact Interest Calculation Rules

Interest is computed using **simple interest on the original principal only**:

$$\text{Interest} = \text{Principal} \times \left(\frac{\text{Monthly Rate}}{100}\right) \times \text{Chargeable Months}$$

$$\text{Total Due} = \text{Principal} + \text{Interest}$$

### Month and Day Rounding Rules

1. **Monthly Rate**: Configured to **2.0% per month** by default (`DEFAULT_MONTHLY_RATE` in [`src/lib/calculator.ts`](file:///src/lib/calculator.ts)).
2. **Same-Day Loans**: If the mortgage date equals today's date, elapsed time is 0 days and interest is **₹0** (Total Due = Principal).
3. **Future Dates**: Disallowed with clear validation error.
4. **First Elapsed Period (< 1 full calendar month)**:
   - For any elapsed time between 1 day and the first monthly anniversary, a **minimum charge of 1.0 month** is applied (`MINIMUM_CHARGE_FIRST_PERIOD_MONTHS = 1.0`).
5. **Subsequent Periods ($\ge$ 1 completed month)**:
   - After completing at least one calendar-month anniversary, the calendar days remaining after the most recent completed monthly anniversary determine the additional charge:
     - **0 to 5 extra days**: Add **0.0 month** (keep completed months count).
     - **6 to 15 extra days**: Add **0.5 month**.
     - **16 or more extra days**: Add **1.0 month**.
6. **Month-End Anniversaries**:
   - A mortgage disbursed on the 31st uses the final day of shorter months (e.g. Feb 28/29, Apr 30), preventing JS date overflow.

### Specification Examples (at 2% Rate on ₹10,000 Principal)

| Mortgage Date | As-Of Date | Elapsed Time | Chargeable Months | Interest | Total Due |
|---|---|---|---|---|---|
| 10 Jan 2026 | 10 Feb 2026 | Exactly 1 month | **1.0 month** | ₹200 | ₹10,200 |
| 10 Jan 2026 | 15 Feb 2026 | 1 month, 5 days | **1.0 month** | ₹200 | ₹10,200 |
| 10 Jan 2026 | 16 Feb 2026 | 1 month, 6 days | **1.5 months** | ₹300 | ₹10,300 |
| 10 Jan 2026 | 25 Feb 2026 | 1 month, 15 days | **1.5 months** | ₹300 | ₹10,300 |
| 10 Jan 2026 | 26 Feb 2026 | 1 month, 16 days | **2.0 months** | ₹400 | ₹10,400 |
| 10 Jan 2026 | 10 Mar 2026 | Exactly 2 months | **2.0 months** | ₹400 | ₹10,400 |
| 10 Jan 2026 | 16 Mar 2026 | 2 months, 6 days | **2.5 months** | ₹500 | ₹10,500 |

---

## 3. Local Setup & Running Locally

### Prerequisites
- Node.js 18.18+ or 20+ (tested on Node v24)
- npm 9+

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```dotenv
MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB="siddheshwar_jewelers"
OWNER_PIN="YOUR_SECRET_PIN"
SESSION_SECRET="GENERATE_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS"
NEXT_PUBLIC_APP_NAME="Siddheshwar Jewelers"
```

> **Tip:** You can generate a strong session secret with:
> ```bash
> openssl rand -base64 32
> ```

### Step 3: Run Unit Tests
```bash
npm test
```
All 23 unit tests covering calendar anniversary edge cases, leap years, 31st-of-month clamp, paise rounding, and session cryptography will run and verify.

### Step 4: Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. MongoDB Atlas Database Setup

1. Create a free or dedicated cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**:
   - Add a new database user (e.g. `sj_admin`) with **Read and Write to any database** privilege.
3. Under **Network Access**:
   - Add IP Access List entry: `0.0.0.0/0` (Allow access from anywhere). This is required for Vercel's serverless environment since serverless function IPs change dynamically.
4. Click **Connect** → **Drivers** (Node.js) and copy the connection string. Replace `<password>` with the user's password.
5. Set this connection string as `MONGODB_URI`. The app automatically creates the collection `mortgage_calculation_history` and sets an index on `{ createdAt: -1 }`.

---

## 5. Vercel Deployment

1. Push your repository to GitHub, GitLab, or Bitbucket (make sure `.env.local` is never committed; `.gitignore` already excludes it).
2. Go to [Vercel Dashboard](https://vercel.com) and click **Add New...** → **Project**.
3. Import this repository.
4. In the **Environment Variables** section, add the 5 variables from `.env.example`:
   - `MONGODB_URI`
   - `MONGODB_DB` (e.g., `siddheshwar_jewelers`)
   - `OWNER_PIN` (your private owner passcode)
   - `SESSION_SECRET` (at least 32 characters long)
   - `NEXT_PUBLIC_APP_NAME` (`Siddheshwar Jewelers`)
5. Click **Deploy**. Vercel will build the Next.js application and deploy it with an SSL certificate.

---

## 6. Mobile Installation (Add to Home Screen)

The web app includes PWA metadata, touch icons, and standalone display support:

### On Android (Chrome)
1. Open your deployed Vercel URL in Google Chrome.
2. Tap the three dots menu (**⋮**) in the top right corner.
3. Tap **Add to Home screen** or **Install app**.
4. Confirm by tapping **Install**.
5. The Siddheshwar Jewelers app will appear on your phone home screen like a native app.

### On iPhone / iPad (Safari)
1. Open your deployed Vercel URL in Apple Safari.
2. Tap the **Share** button (box with an upward arrow) in the bottom toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** in the top right corner.
5. The app launches in full-screen standalone mode with safe-area spacing.

---

## 7. Security and Architecture Notes

- **Secrets Never Sent to Client**: `MONGODB_URI`, `OWNER_PIN`, and `SESSION_SECRET` are read exclusively in server-side route handlers.
- **Serverless Database Caching**: [`src/lib/db.ts`](file:///src/lib/db.ts) caches the MongoDB client connection across warm invocations of Vercel serverless functions, preventing connection leaks.
- **Independent Historical Snapshots**: Saved calculations preserve the exact interest and principal as of their original date.
- **Server-Side Recalculation**: The server never trusts client-supplied calculation totals. When saving to history, the server re-validates the principal and recalculates interest using integer paise math before inserting into the database.
- **Timing-Safe Auth & Throttling**: Constant-time comparison protects the owner PIN and session token HMACs, and repeated failed attempts are automatically throttled.
