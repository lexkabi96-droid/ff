# Platform Roadmap: from LaunderSync to a multi-service platform

## Where we are

LaunderSync is a Next.js dashboard for a single laundry business: pickups,
orders, customers, M-Pesa/Pesapal payments and an AI pickup-message flow.
Data currently lives in LocalStorage on the device.

## Phase 1 - this change

- **Installable customer PWA**: web app manifest, service worker, mobile
  viewport and SVG app icons. Customers add the booking portal to their
  home screen and it keeps working offline.
- **Multi-tenant foundation**: a Business (tenant) model and per-business
  service categories, so any service business - not just laundry - can
  live on the platform.
- **QR pickup and drop-off verification**:
  - Every pickup and order now gets a QR token.
  - /qr prints a label sheet to attach to bags or job tickets.
  - /scan is a camera-based verifier for staff: scan FF://PICKUP/... to
    confirm collection (auto-creates the order), scan FF://ORDER/... to
    confirm drop-off, with manual code entry as fallback.
- **Service-agnostic booking portal**: the customer portal now offers a
  service selector (laundry, cleaning, repairs, grooming, other) instead
  of laundry-only wording.

## Phase 2 - real backend

- Move the LocalStorage store to Firestore (firebase is already a
  dependency), scoped by businessId for tenant isolation.
- Firebase Auth: business accounts (owner/staff roles) and customer
  accounts linked by phone number.
- Security rules per tenant; server-side order state machine.

## Phase 3 - customer mobile experience

- Customer PWA tab set: Book, My Orders (live status), QR pass, History.
- Push notifications (FCM) for pickup reminders and ready-for-drop-off.
- The QR pass doubles as the customer's identity at handover.

## Phase 4 - platform features

- Business onboarding flow (sign up, choose category, define services
  and pricing) at /business/new.
- Per-tenant branding on the booking portal via the business slug.
- Service catalogue management and dynamic price estimates.
- Reviews, ratings and repeat-booking nudges using the Genkit flows.

## Phase 5 - growth

- Platform-wide search: find a cleaner, tailor, salon near you.
- Subscriptions and commission billing for tenant businesses.
- Route optimisation for pickup couriers.
