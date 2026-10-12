# MYTIX Payment & Financial Ledger System

## 1. System Architecture Overview

MYTIX operates on a **Merchant of Record (Escrow)** financial architecture, similar to platforms like Eventbrite and Ticketek.

```
[ Customer ]
     │ (Pays Ticket + Fee via Card / Apple Pay)
     ▼
[ Stripe Gateway ]
     │ (Deducts ~1.7% + 30¢ processing cost)
     ▼
[ Admin / Platform Bank Account ]  <─── Holds 100% of funds until event completion
     │
     │ (After event finishes, Admin dispatches payout)
     ▼
[ Organiser Bank Account ]
```

### Key Principles:
1. **Admin Holds the Money:** All customer card payments are deposited directly into the **Platform Admin's Stripe Account**. Funds never go directly to the event organiser at checkout.
2. **Escrow Protection:** The platform holds ticket revenue safely in escrow. If an event is cancelled or fraudulent, funds remain available to issue automatic refunds to buyers.
3. **Multi-Tenant Ledger Isolation:** The backend tracks all earnings using an internal double-entry financial ledger (`ledger_entries` table). Organiser A can never see or access Organiser B's funds or statistics.

---

## 2. Pricing Calculation & Gross-Up Surcharge Math

Implemented in [`src/modules/checkout/pricing.service.js`](./src/modules/checkout/pricing.service.js).

### The Problem
If a ticket costs **$100.00 AUD**, and Stripe charges **1.7% + 30¢**:
- A naive 1.7% surcharge on $100 gives $102.00.
- But Stripe charges 1.7% on the **new total ($102.00)**, which equals $2.03.
- If not calculated correctly, the organiser or the platform would lose money on every transaction.

### The Solution: The Exact Gross-Up Surcharge Formula

To guarantee that the organiser nets **100% of the ticket face value**, the checkout engine applies an exact gross-up formula:

$$\text{totalCents} = \left\lceil \frac{\text{ticketTotalCents} + \text{fixedCents}}{1 - \text{percent}} \right\rceil$$

$$\text{buyerFeeCents} = \text{totalCents} - \text{ticketTotalCents}$$

#### Configuration Parameters:
- **`percent`**: `0.017` (1.7% Australian domestic card rate)
- **`fixedCents`**: `30` ($0.30 AUD fixed charge)
- **Currency**: Whole cents integer arithmetic (no floating point rounding errors)

### Step-by-Step Mathematical Example:

Let's calculate a **$100.00 AUD** ticket purchase (`ticketTotalCents = 10000`):

1. **Calculate Gross Total:**
   $$\text{totalCents} = \left\lceil \frac{10000 + 30}{1 - 0.017} \right\rceil = \left\lceil \frac{10030}{0.983} \right\rceil = \lceil 10203.458 \rceil = \mathbf{10204 \text{ cents (A\$102.04)}}$$

2. **Calculate Buyer Fee:**
   $$\text{buyerFeeCents} = 10204 - 10000 = \mathbf{204 \text{ cents (A\$2.04)}}$$

3. **Customer Checkout Total:**
   - Ticket Price: **$100.00 AUD**
   - Booking / Gateway Surcharge: **$2.04 AUD**
   - **Customer Pays: $102.04 AUD**

4. **Stripe Deduction:**
   - Stripe charges $102.04 \times 1.7\% + \$0.30 = \$1.734 + \$0.30 = \mathbf{\$2.03 AUD}$
   - Net deposited to Admin Stripe Account: $\$102.04 - \$2.03 = \mathbf{\$100.01 AUD}$
   - Organiser receives their full **$100.00** ticket revenue.

---

## 3. End-to-End Payment Flow

```
1. Reserve Tickets   ───> POST /api/v1/checkout/reserve (10-min CAS lock, HoldStatus: ACTIVE)
2. Checkout Init     ───> POST /api/v1/checkout (Order: PENDING, creates Stripe PaymentIntent)
3. Card Processing   ───> Customer enters card in Stripe Elements / Apple Pay on frontend
4. Webhook Trigger   ───> POST /api/v1/webhooks receives payment_intent.succeeded
5. Fulfillment Saga  ───> Order -> PAID, Hold -> CONVERTED, Issue Tickets, Write Ledger
```

### Step 1: Inventory Hold (Anti-Oversell Lock)
- Handled in `src/modules/holds/hold.service.js`.
- Locks the requested quantity for **10 minutes** (`HoldStatus: ACTIVE`).
- Decrements available stock atomically. Other customers cannot buy these seats.

### Step 2: Checkout Initiation
- Handled in `src/modules/checkout/checkout.service.js`.
- Verifies hold is active and not expired.
- Computes gross-up pricing via `calculateOrderPricing`.
- Creates an `Order` with `status: "PENDING"`.
- Creates a Stripe `PaymentIntent` attaching metadata: `orderId`, `holdId`, and attendee details.
- Returns `clientSecret` to the frontend.

### Step 3: Secure Card Capture
- The frontend renders the Stripe Payment Form or Apple/Google Pay.
- Sensitive credit card numbers are transmitted directly from the buyer's browser to Stripe's PCI-DSS compliant vault. Your backend never touches raw credit card numbers.

### Step 4: Webhook & Atomic Order Fulfillment Saga
- Handled in `src/modules/webhooks/stripeWebhook.service.js` and `src/modules/payments/fulfillment.service.js`.
- Verifies HMAC signature with `STRIPE_WEBHOOK_SECRET`.
- Deduplicates the Stripe event ID in `webhook_events` to prevent double-processing.
- Runs an atomic database transaction:
  1. `Order.status` updated from `PENDING` to `PAID`.
  2. `InventoryHold.status` updated from `ACTIVE` to `CONVERTED`.
  3. `TicketType.sold` counter incremented.
  4. Creates a `Payment` record (`status: "SUCCEEDED"`).
  5. Writes double-entry ledger rows in `ledger_entries`.
  6. Enqueues background job to generate cryptographically signed Ed25519 QR e-tickets and sends confirmation email.

---

## 4. Double-Entry Accounting Ledger

All financial movements are recorded in the `ledger_entries` table:

```prisma
model LedgerEntry {
  id          String          @id @default(uuid())
  organiserId String          @map("organiser_id")
  eventId     String          @map("event_id")
  orderId     String?         @map("order_id")
  type        LedgerEntryType
  amountCents Int             @map("amount_cents")
  description String?
  createdAt   DateTime        @default(now())
}
```

### Ledger Entry Types:

| Entry Type | Sign | Description | Who Owns It |
| :--- | :---: | :--- | :--- |
| **`SALE`** | `+` | Ticket face value | Credited to the Event Organiser |
| **`BUYER_FEE`** | `+` | Surcharge / booking fee collected | Platform Revenue |
| **`STRIPE_FEE`** | `-` | Stripe gateway processing deduction | Payment Cost |
| **`REFUND`** | `-` | Reversal of ticket face value on cancellation | Deducted from Organiser balance |
| **`PAYOUT`** | `-` | Bank disbursement sent to organiser | Cash Transfer |

### Calculating Organiser Payout Balance:

$$\text{Net Organiser Balance} = \sum (\text{SALE}) - \sum (\text{REFUND}) - \sum (\text{PAYOUT})$$

---

## 5. Event Cancellation & Automated Bulk Refund Pipeline

Implemented in [`src/modules/admin/admin.service.js`](./src/modules/admin/admin.service.js) via `POST /api/v1/admin/events/:id/cancel`.

### Policy Rules:
1. **Admin-Only Authority:** Only the platform Admin can cancel an event. Organisers cannot cancel an event unilaterally.
2. **Non-Refundable Processing Fees:** 
   - Customers receive a refund for the **ticket face value** (`order.ticketTotalCents`).
   - The platform / Stripe processing fee (`order.buyerFeeCents`) is **retained** to cover card network costs already incurred.

### Automated Refund Execution:

```
[ Admin calls POST /api/v1/admin/events/:id/cancel ]
                 │
                 ▼
1. Event.status = "CANCELLED", releases active holds
                 │
                 ▼
2. Find all PAID orders for this event
                 │
                 ▼
3. For each order:
   ├── Call Stripe API: stripe.refunds.create({
   │     payment_intent: order.payment.stripePaymentIntentId,
   │     amount: order.ticketTotalCents
   │   })
   ├── Order.status = "REFUNDED"
   ├── All Ticket.status = "CANCELLED" (deactivates QR codes)
   ├── Create Refund record (status: "SUCCEEDED")
   ├── LedgerEntry: type "REFUND", amount: -order.ticketTotalCents
   └── Send automated cancellation & refund email to customer
```

### Customer Email Contents:
When an event is cancelled, each customer receives an automated email detailing:
1. **Event Name & Cancellation Reason** (e.g. *"Summer Festival cancelled due to artist medical emergency"*).
2. **Refunded Amount** (e.g. `A$100.00`).
3. **Timeline Notice** (*"Refund will appear on your card statement within 5–10 business days"*).
4. **Ticket Deactivation Notice** (*"QR barcodes for this order are now deactivated and will not grant entry"*).

---

## 6. Stripe Webhook Event Mapping

Implemented in [`src/modules/webhooks/stripeWebhook.service.js`](./src/modules/webhooks/stripeWebhook.service.js).

| Stripe Event | Backend Action | Result |
| :--- | :--- | :--- |
| **`payment_intent.succeeded`** | `fulfillOrderAfterPayment` | Order marked `PAID`, tickets issued, confirmation email sent. |
| **`payment_intent.payment_failed`** | `handleFailedPayment` | Order marked `FAILED`, reserved tickets released back to stock. |
| **`charge.refunded`** | `handleExternalRefund` | Syncs refunds initiated directly from the Stripe Dashboard into the database, voids tickets, reverses organiser ledger. |
| **`charge.dispute.created`** | `handleDisputeCreated` | Marks payment `DISPUTED`, immediately voids tickets to block turnstile gate fraud. |

---

## 7. Multi-Tenant Organiser Data Isolation

Every organiser is strictly isolated from other organisers:

1. **Ownership Middleware (`checkEventOwnership`):**
   - Intercepts requests to `/organiser/events/:id/*`.
   - Validates `event.organiserId === loggedInUser.organiser.id`.
   - Rejects unauthorised access attempts with `403 Forbidden`.
2. **Automatic Query Scoping:**
   - Event queries are scoped to `where: { organiserId: currentOrganiser.id }`.
   - Order queries are scoped to `where: { event: { organiserId: currentOrganiser.id } }`.
3. **Turnstile Gate Scanning Guard:**
   - Gate scanning endpoints verify event ownership before granting access to manifests or entry telemetry.
4. **Attendee Privacy:**
   - Attendee CSV exports only contain buyers for the requesting organiser's own events.
