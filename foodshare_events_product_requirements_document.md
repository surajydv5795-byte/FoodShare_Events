# Product Requirements Document (PRD)
## Project: FoodShare Events (IDEA LAB-3)
**Author:** Suraj Gama Yadav (Roll No: 56)
**Theme:** Data-Driven Smart Solutions for Sustainable and Inclusive Communities

---

## 1. Executive Summary
FoodShare Events is a centralized web application designed to manage surplus food generated at events (weddings, corporate functions, festivals). It bridges the communication gap between event organizers (donors), NGOs (beneficiaries), and volunteers (logistics) using real-time location tracking and notifications to ensure safe, timely redistribution of edible food.

---

## 2. Target Audience & User Roles
1. **Event Organizers / Caterers (Donors):** Users who upload details about surplus food (quantity, type, expiry time, pickup location).
2. **NGOs (Receivers):** Organizations that receive notifications of available food and claim it for their communities.
3. **Volunteers (Delivery):** Individuals who accept tasks to pick up food from the event and deliver it to the NGO.
4. **Admin:** System overseers who verify users, monitor active donations, and resolve disputes.

---

## 3. Technology Stack (Finalized)
*Note: This resolves the conflict in the original documentation. The team must choose ONE stack. Below is the recommended stack based on modern web standards.*
* **Frontend:** HTML5, CSS3, JavaScript, Tailwind CSS (for rapid Steampunk UI implementation).
* **Backend:** Node.js with Express.js
* **Database:** MongoDB (NoSQL is highly flexible for varied food/event data) OR MySQL (if strictly following the ER diagram). 
* **External APIs:** Google Maps API (Routing and Location), Twilio/Nodemailer (SMS/Email Notifications).

---

## 4. User Interface & Design System (Steampunk Vitoriano)
The website will strictly follow a "Victorian Steampunk" aesthetic to make the UI engaging, mechanical, and ornate.

### 4.1. Color Palette
* **Primary (Brass):** `#B5A642` - Used for dominant surfaces, primary borders.
* **Secondary (Rich Mahogany):** `#5C0000` - Used for secondary surfaces, deep backgrounds.
* **Accent 1 (Deep Teal):** `#008080` - Used for active states, important callouts.
* **Accent 2 (Clockwork Orange):** `#D46A00` - Used for Call-to-Action (CTA) buttons (e.g., "Donate Now").
* **Backgrounds (Parchment/Ivory):** `#F5DEB3` / `#FFFFF0` - Used for readable text areas.

### 4.2. Typography
* **Headings (H1-H6):** `IM Fell English` (Weight 700) - Gives a vintage, letterpress feel.
* **Body Text:** `IM Fell English` (Weight 400) - Maximum 72 characters per line for readability.
* **Monospace/Data Labels:** `JetBrains Mono` - Used for technical data like Tracking IDs, coordinates, and timestamps.

### 4.3. UI Components & Behavior
* **Buttons:** Rounded (0.5rem), Clockwork Orange fill. Hover state: Darken by 8% with a tactile "press" translation down by 1px. No glowing effects.
* **Cards (Food Listings):** Parchment background, 1px Brass border stroke, subtle shadow.
* **Animations:** Mechanical and weighted (Spring physics). Hovering over a donation card should trigger a slight scale (1.03) over 200ms.
* **Visual Motifs:** Incorporate brass borders, subtle leather textures in the background, and gear icons for loading states (instead of standard spinners). No emojis permitted; use mechanical/vintage iconography.

---

## 5. Core Features & User Flows

### 5.1. Food Donation Flow (Donor)
1. Donor logs in and clicks "Report Surplus Food".
2. Fills out a form: Food Type (Cooked/Raw), Quantity (Meals/Kg), Expected Expiry Time, and exact Map Pin location.
3. Submits donation. System changes status to `PENDING`.

### 5.2. Claiming & Delivery Flow (NGO & Volunteer)
1. Nearby NGOs receive an automated alert (Email/SMS).
2. NGO logs in and clicks "Claim Food". Status changes to `CLAIMED`.
3. Nearby Volunteers receive a push notification.
4. Volunteer accepts the pickup. Status changes to `IN TRANSIT`.
5. Google Maps integration provides the volunteer with a route from Event -> NGO.
6. Volunteer drops off food, NGO confirms receipt via OTP. Status changes to `COMPLETED`.

---

## 6. Edge Cases to Handle (For External Examiner)
* **No Volunteer Found:** If no volunteer accepts within 30 minutes of an NGO claiming the food, the NGO is notified to arrange self-pickup.
* **Food Expiry Alert:** If the food is not picked up 1 hour before the stated expiry time, the system automatically cancels the donation and flags it as `EXPIRED` to prevent health risks.
* **Fake Donations:** Admins have the ability to ban Event Organizers who repeatedly post fake or spoiled food donations based on NGO feedback ratings.