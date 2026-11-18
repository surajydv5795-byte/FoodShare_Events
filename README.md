# FoodShare Events (IDEA LAB-3)
> **Theme:** Data-Driven Smart Solutions for Sustainable and Inclusive Communities  
> **Author:** Khushbu Solanki (Roll No: 12)  
> **Aesthetic:** Flip7 Design System (`#2BA8A2` Teal, `#FFD23F` Gold, `#EF6C4A` Coral)

---

## 1. Executive Summary
**FoodShare Events** is a centralized, data-driven web application designed to manage surplus food generated at events (weddings, corporate functions, banquets, and festivals). It bridges the communication gap between:
1. **Event Organizers / Caterers (Donors):** Upload details about surplus food (quantity, cooked/raw type, expiry countdown, pickup location).
2. **NGOs & Food Banks (Receivers):** Receive notifications of available food consignments and claim them for their communities.
3. **Volunteers (Delivery Couriers):** Accept pickup routing tasks to transport food from the venue to the beneficiary NGO.
4. **Master Ledger Administrators:** System overseers who verify members, monitor active consignments, and resolve disputes.

---

## 2. Flip7 Design System & Accessibility

The user interface strictly adheres to the modern **Flip7** retro-playful palette:
* **Color Palette:**
  * **Primary Teal:** `#2BA8A2` (Main UI, headers, and accents), Dark: `#1E8C86`, Light: `#3CC4BD`, BG: `#E8F6F5`.
  * **Accent Gold:** `#FFD23F` (Primary CTAs, badges, highlights), Dark: `#E6B800`.
  * **Coral:** `#EF6C4A` (Urgent actions, expiry warnings, energy), Dark: `#D45233`.
  * **Cream:** `#FFF8E7` (Card backgrounds, input surfaces).
  * **Surface Base:** `#EFF8F7` (Light, accessible page background).
  * **Surface Card:** `#FFFFFF` (High-contrast white cards with 6px colored left-accent bar).
* **Typography & Accessibility:**
  * **Headings:** Extra-bold (`800`) system font stack with high contrast ratio (WCAG AA/AAA compliant).
  * **Body Text:** `Inter` (system-ui) for clear readability across all screen sizes.
  * **Monospace / Technical Data:** `JetBrains Mono` — Tracking IDs, GPS coordinates, timestamps, and OTPs.
  * **Accessibility Features:** Skip-to-main-content link, 44px+ touch targets, visible focus outlines, high-contrast dark text on light surfaces.
* **UI Behavior:**
  * **Buttons:** Pill-shaped (`999px`), gold gradient with colored glow shadows.
  * **Cards:** White surface, 16px radius, colored left-accent border, spring-weighted hover lift.
  * **Loading States:** Modern circular notch spinners with teal glow.

---

## 3. Technology Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript SPA Router, Tailwind CSS, Font Awesome.
* **Backend:** Node.js with Express.js.
* **Database & Storage:**
  * Native **MongoDB Atlas with Mongoose**.
  * **Resilient Dual-Mode Engine:** If an external MongoDB server is not running on `localhost:27017`, the system automatically activates an In-Memory Data Engine with pre-seeded demo records for immediate, frictionless demonstration.
* **Security & Tokens:** JSON Web Tokens (JWT) and Bcrypt password hashing.

---

## 4. Core Features & User Flows (PRD Section 5)

### 4.1. Food Donation Flow (Donor)
1. Donor logs in and navigates to **"Donate Surplus Food"**.
2. 3-Step Wizard:
   * **Step 1:** Consignment Specifications (Event Name, Food Type `Cooked`/`Raw`, Quantity, Description).
   * **Step 2:** Pickup Window & Dispatch Location (Expiry Threshold, Venue Address, On-Site Phone).
   * **Step 3:** Review & Confirm.
3. Consignment status is registered as `PENDING` (Available).

### 4.2. Claiming & Delivery Flow (NGO & Courier)
1. Nearby NGOs receive an automated alert and browse the active depot manifest.
2. NGO logs in and clicks **"Claim This Consignment"**. Status changes to `CLAIMED` and a secure **6-digit delivery OTP** is minted.
3. Volunteer couriers browse claimed deliveries and click **"Accept Pickup Assignment"**. Status changes to `IN_TRANSIT`.
4. Volunteer arrives at the destination; the NGO confirms genuine handover by providing the OTP. Status transitions to `COMPLETED`.

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
   npm install
   ```
2. Start the application:
   ```bash
   npm start
   ```
3. Access the web application in your browser at:
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

---

## 7. Academic Project Metadata
* **Student:** Khushbu Solanki
* **Roll Number:** 12
* **Lab:** IDEA LAB-3
* **Project:** FoodShare Events — Data-Driven Smart Solutions for Sustainable and Inclusive Communities
