# FoodShare Events (IDEA LAB-3)
> **Theme:** Data-Driven Smart Solutions for Sustainable and Inclusive Communities  
> **Author:** Suraj Gama Yadav (Roll No: 56)  
> **Aesthetic:** Victorian Steampunk Design System (`#B5A642` Brass, `#5C0000` Mahogany, `#D46A00` Clockwork Orange)

---

## 1. Executive Summary
**FoodShare Events** is a centralized, data-driven web application designed to manage surplus food generated at events (weddings, corporate functions, banquets, and festivals). It bridges the communication gap between:
1. **Event Organizers / Caterers (Donors):** Upload details about surplus food (quantity, cooked/raw type, expiry countdown, pickup location).
2. **NGOs & Food Banks (Receivers):** Receive notifications of available food consignments and claim them for their communities.
3. **Volunteers (Delivery Couriers):** Accept pickup routing tasks to transport food from the venue to the beneficiary NGO.
4. **Master Ledger Administrators:** System overseers who verify artisans, monitor active consignments, and resolve disputes.

---

## 2. Victorian Steampunk UI & Design System

The user interface strictly adheres to the **Victorian Steampunk** aesthetic specified in the PRD:
* **Color Palette:**
  * **Primary (Brass):** `#B5A642` — Dominant borders, headers, and metallic accents.
  * **Secondary (Rich Mahogany):** `#5C0000` — Deep parchment headers, navbars, and cards.
  * **Accent 1 (Deep Teal):** `#008080` — Active states, verified credentials, and badges.
  * **Accent 2 (Clockwork Orange):** `#D46A00` — Call-to-Action (CTA) buttons (e.g., *"Report Surplus Food"*).
  * **Backgrounds (Parchment & Ivory):** `#F5DEB3` / `#FFFFF0` — Readable text areas with subtle leather/parchment styling.
* **Typography:**
  * **Headings (H1–H6):** `IM Fell English` (Weight 700) — Letterpress vintage feel.
  * **Body Text:** `IM Fell English` (Weight 400) — Max 72 characters per line for optimal readability.
  * **Monospace / Technical Data:** `JetBrains Mono` — Tracking IDs, GPS coordinates, timestamps, and OTPs.
* **UI Behavior:**
  * **Buttons:** Rounded (`0.5rem`), Clockwork Orange fill. Hover state: darkens by 8% with a tactile `translateY(1px)` press effect.
  * **Cards:** Parchment background, 1px Brass stroke, subtle shadow, spring-weighted hover scale (`1.03` over 200ms).
  * **Loading States:** Rotating mechanical gears (dual gear animation), zero standard spinners. No emojis permitted — all iconography uses mechanical/vintage Font Awesome symbols.

---

## 3. Technology Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript SPA Router, Tailwind CSS, Font Awesome.
* **Backend:** Node.js with Express.js.
* **Database & Storage:**
  * Native **MongoDB with Mongoose**.
  * **Resilient Dual-Mode Engine:** If an external MongoDB server is not running on `localhost:27017`, the system automatically activates an In-Memory Data Engine with pre-seeded demo records for immediate, frictionless demonstration.
* **Security & Tokens:** JSON Web Tokens (JWT) and Bcrypt password hashing.

---

## 4. Core Features & User Flows (PRD Section 5)

### 4.1. Food Donation Flow (Donor)
1. Donor logs in and navigates to **"Report Surplus Food"**.
2. Fills out consignment form: Event Name, Food Type (`Cooked` / `Raw`), Quantity (Meals/Kg), Expected Expiry Time, Contact Phone, and Pickup Location.
3. Consignment status is registered as `PENDING`.

### 4.2. Claiming & Delivery Flow (NGO & Courier)
1. Nearby NGOs receive an automated alert and browse the active depot manifest.
2. NGO logs in and clicks **"Claim This Food"**. Status changes to `CLAIMED` and a secure **6-digit delivery OTP** is minted.
3. Volunteer couriers browse claimed deliveries and click **"Accept Pickup"**. Status changes to `IN_TRANSIT`.
4. Volunteer arrives at the destination; the NGO confirms genuine handover by entering the OTP. Status transitions to `COMPLETED`.

### 4.3. Edge Case Handling (PRD Section 6)
* **30-Minute Courier Escalation:** If no volunteer courier accepts a claimed consignment within 30 minutes, an alert is surfaced requesting NGO self-pickup.
* **1-Hour Expiry Lock:** If surplus food is not collected 60 minutes before its stated expiry threshold, the system automatically flags it as `EXPIRED` to prevent food safety risks.
* **Anti-Spoofing & Ban Controls:** Master Ledger administrators possess one-click credential revocation to ban bad actors posting fraudulent or spoiled consignments.

---

## 5. Quick Start & Setup Instructions

### 5.1. Prerequisites
* [Node.js](https://nodejs.org/) (v16.x or newer recommended)
* (Optional) Local MongoDB or MongoDB Atlas URI in `.env` (the server runs standalone with the built-in demo engine if MongoDB is not present).

### 5.2. Installation & Launch
1. Open terminal in the project directory:
   ```bash
   cd "c:\Users\Others login\Music\FoodShare_Events"
   ```
2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```
4. Access the web application in your browser at:
   ```
   http://localhost:3000
   ```

---

## 6. Pre-Seeded Demo Credentials

For examiner review and quick demonstration, four pre-configured roles are ready to test immediately:

| Role | Email | Password | Responsibilities |
|---|---|---|---|
| **Donor (Event Host)** | `donor@foodshare.org` | `password123` | Report surplus banquets, monitor listings, cancel pending items |
| **NGO (Beneficiary)** | `ngo@foodshare.org` | `password123` | Claim surplus food consignments, view OTP, verify receipt |
| **Volunteer (Courier)** | `volunteer@foodshare.org` | `password123` | Accept claimed pickups, transit routing, submit OTP completion |
| **Master Ledger Admin** | `admin@foodshare.org` | `password123` | Oversee users registry, verify accounts, ban bad actors, audit ledger |

*(You can also register brand new accounts on the registration page at any time).*

---

## 7. Project Structure

```text
FoodShare_Events/
├── public/
│   ├── index.html              # Main Steampunk Single Page Application
│   ├── css/
│   │   └── styles.css          # Victorian Steampunk design system stylesheet
│   └── js/
│       ├── app.js              # SPA hash router, AppState, notifications & landing
│       ├── auth.js             # Authentication, login, registration, and user dossier
│       ├── donations.js        # Surplus reporting, Depot grid, detail view & OTP flow
│       └── admin.js            # Admin Master Ledger, stats dashboard & moderation
├── server/
│   ├── server.js               # Express application entry point
│   ├── config/
│   │   ├── db.js               # Dual-mode MongoDB connector & fallback coordinator
│   │   └── mockStore.js        # Resilient in-memory storage & pre-seeded demo records
│   ├── middleware/
│   │   └── auth.js             # JWT authentication, optionalAuth & role guards
│   ├── models/
│   │   ├── User.js             # User Mongoose schema & dual-mode proxy
│   │   └── Donation.js         # Donation consignment schema & dual-mode proxy
│   └── routes/
│       ├── auth.js             # Registration, login, profile endpoints
│       ├── donations.js        # CRUD, claim, accept, OTP completion & auto-expiry
│       └── admin.js            # User management, verification, banning & stats
├── test_integration.js         # End-to-end integration test suite
├── package.json
└── README.md
```

---

## 8. Academic Project Metadata
* **Student:** Suraj Gama Yadav
* **Roll Number:** 56
* **Lab:** IDEA LAB-3
* **Project:** FoodShare Events — Data-Driven Smart Solutions for Sustainable and Inclusive Communities
