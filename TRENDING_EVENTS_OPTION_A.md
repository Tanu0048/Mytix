# Specification: Trending Events Feature (Option A — Recent Sales Velocity)

## 1. Executive Summary & Scope

This specification details the end-to-end production implementation of the **Trending Events** feature for the MYTIX platform using **Option A: Recent Sales Velocity**.

### Scope Boundaries
- **In Scope**:
  - `backend/`: Aggregation, deterministic ranking, 3-tier fallback logic, stampede-protected caching, Zod validation, public APIs (`GET /api/v1/home` and `GET /api/v1/events/trending`), admin observability endpoint (`GET /api/v1/admin/events/trending`), and comprehensive automated tests (`node:test`).
  - `apps/user-web/`: Customer-facing web app. Home page trending cards, dynamic rank badges (`#1 Trending`, `#2 Trending`, etc.), `Selling Fast` urgency tags, dynamic city filtering integration (`All Cities`, `Sydney`, `Melbourne`, `Brisbane`), loading skeletons, and empty/error states.
  - `apps/super-admin/`: Super Admin dashboard. Events management table with read-only `Trending (48h)` column displaying genuine 48-hour sales counts, top trending position (#1 to #8), ranking source (`RECENT_SALES`, `ALL_TIME_SALES`, `UPCOMING`), and calculation snapshot timestamp.
- **Explicitly Out of Scope**:
  - `apps/user-app/`: Mobile application is explicitly out of scope and will remain completely untouched.

### Architecture Invariants
- Runtime: Node.js 22.18, Express 4.21 (ESM), PostgreSQL, Prisma ORM 5.21.
- Caching: Process-local LRU Cache (`lru-cache` via `backend/src/lib/cache.js`). No external Redis dependency.
- Language: Native JavaScript ESM on backend; Next.js 15 / React / TypeScript on frontends. No backend TypeScript or raw SQL migrations.

---

## 2. Repository Ground Truth & Schema Analysis

Following a comprehensive audit of `backend/prisma/schema.prisma`, `fulfillment.service.js`, and `admin.service.js`, the implementation is governed by the following verified database realities:

| Entity / Concept | Database Reality | Implementation Rule |
|---|---|---|
| **Timestamp** | `model Order` contains `createdAt` and `updatedAt`. **There is no `paidAt` column** in `Order` or `Payment`. | Documented limitation: Use `order.createdAt` for paid orders. Do not invent a `paidAt` field. |
| **Order Status** | `OrderStatus` enum: `PENDING`, `PAID`, `FAILED`, `EXPIRED`, `CANCELLED`, `REFUNDED`. | Count only orders where `order.status === 'PAID'`. Orders in `PENDING`, `FAILED`, `EXPIRED`, `CANCELLED`, or `REFUNDED` states contribute exactly 0. |
| **Ticket Model** | `model Ticket` contains `status: TicketStatus` (`VALID`, `USED`, `CANCELLED`, `REFUNDED`). | Count only tickets in `VALID` or `USED` states. `USED` tickets represent verified sales scanned at gate turnstiles and must not be excluded. |
| **Refund Semantics** | In `fulfillment.service.js:246` and `admin.service.js:840`, order refund transitions `order.status` to `REFUNDED` and executes `ticket.updateMany({ where: { orderId }, data: { status: 'CANCELLED' } })`. | Refunded and cancelled orders/tickets are automatically excluded by filtering `order.status === 'PAID'` and `ticket.status IN ('VALID', 'USED')`. |
| **TicketTypes.sold Limitation** | `ticketTypes.sold` increments on purchase (`fulfillment.service.js:79`), but is **never decremented during refunds or cancellations**. | `ticketTypes.sold` is NOT authoritative for historical sales. Authoritative historical volume must be derived from verified paid orders/tickets. |
| **Event Eligibility** | `model Event` contains `status: EventStatus` (`DRAFT`, `SUBMITTED`, `PUBLISHED`, `POSTPONED`, `CANCELLED`, `COMPLETED`). | Only events where `status === 'PUBLISHED'` and `startsAt >= NOW()` are eligible. Completed, draft, cancelled, or past events are strictly excluded. |
| **City Filtering** | `Event` references `Venue` via `venueId`. `model Venue` contains `city: String (VarChar(100))`. | City filtering is performed through the relational path `event.venue.city`, using case-insensitive normalized matching. |

---

## 3. Business Logic: Recent Sales Velocity

### 3.1 Primary Metric Formula
For any eligible event $E$:

$$\text{recentSalesCount}(E) = \sum \text{tickets where } \text{ticket.status} \in \{\text{'VALID'}, \text{'USED'}\} \text{ and } \text{order.status} = \text{'PAID'} \text{ and } \text{order.createdAt} \ge (\text{NOW}() - 48\text{ hours})$$

### 3.2 Double-Counting Prevention Rule
In the MYTIX checkout saga:
1. `order.items` (`OrderItem[]`) is created with ticket quantities when checkout initiates.
2. Upon Stripe webhook confirmation, `order.status` transitions atomically to `PAID`.
3. An asynchronous worker job (`ticket.generate` via `pg-boss`) generates the individual `Ticket` rows with QR codes.

**Authoritative Counting Rule**:
To prevent double counting while ensuring zero drop-off during background worker queueing:
```javascript
let orderTicketCount = 0;
if (order._count && order._count.tickets > 0) {
  // Worker has generated tickets: use exact valid/used ticket count
  orderTicketCount = order._count.tickets;
} else if (order.items && order.items.length > 0) {
  // Worker has not yet processed: use sum of order items quantity
  orderTicketCount = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
}
// NEVER add both together.
```

### 3.3 Ranking & Deterministic Tie-Breaking
1. Rank all events with 48h sales in descending order of `recentSalesCount`.
2. Break ties deterministically:
   - Primary tie-breaker: `startsAt ASC` (earlier show date takes precedence).
   - Secondary tie-breaker: `id ASC` (stable UUID comparison).
3. Deduplication: An event appears at most once in the output.
4. Purely organic: No artificial weighting, paid sponsorship, capacity scaling, or manual score modifications.

---

## 4. Three-Tier Fallback Strategy

The service returns up to `limit` events (default: 8, maximum: 50).

```text
[ ALL ELIGIBLE UPCOMING EVENTS (status: PUBLISHED, startsAt >= NOW, city match) ]
                                      |
                                      v
                +-------------------------------------------+
                | Tier 1: Recent Sales Velocity (last 48h)  |
                | Sorted by recentSalesCount DESC           |
                | Tie-break: startsAt ASC, id ASC           |
                +-------------------------------------------+
                                      |
                          (Slots remaining < limit?)
                                      |
                                      v
                +-------------------------------------------+
                | Tier 2: All-Time Paid Sales Volume        |
                | Sorted by verified allTimePaidSales DESC  |
                | Tie-break: startsAt ASC, id ASC           |
                | (Excludes all selected Tier 1 event IDs)  |
                +-------------------------------------------+
                                      |
                          (Slots remaining < limit?)
                                      |
                                      v
                +-------------------------------------------+
                | Tier 3: Chronological Upcoming Shows      |
                | Sorted by startsAt ASC, id ASC            |
                | (Excludes Tier 1 & Tier 2 event IDs)      |
                +-------------------------------------------+
                                      |
                                      v
                [ COMBINED & DEDUPLICATED RESULT (Max: limit) ]
```

### Ranking Source Tags:
- `RECENT_SALES`: Event qualified organically via sales within the preceding 48 hours.
- `ALL_TIME_SALES`: Fallback entry qualified via verified lifetime paid ticket sales.
- `UPCOMING`: Fallback entry qualified via nearest chronological show time.

### Guaranteed Boundary Conditions:
- If fewer than `limit` total eligible events exist across all tiers, return only the eligible events (no padding).
- If zero eligible events exist, return an empty array `[]` (never fabricate placeholder events).
- An event without 48h sales will never outrank an event with 48h sales, regardless of lifetime sales volume.

---

## 5. Aggregation Strategy & Database Performance

### 5.1 Efficient Prisma Querying (Bounded & Event-Aggregated)
To satisfy the constraint of preserving Prisma while preventing high memory overhead:
- We query only orders where `status === 'PAID'` and `createdAt >= windowStart` associated with eligible published upcoming events.
- We select only `eventId`, `_count.tickets` (with status in `['VALID', 'USED']`), and `items.quantity`.
- The database returns lightweight projection records; Node.js aggregates counts into a `Map<eventId, number>` in $O(N)$ time with minimal memory allocation (< 2ms for typical production batches).

### 5.2 Single Hydration Query (Zero N+1)
Once the final ordered list of event IDs across all three tiers is determined (`targetIds`), event details are hydrated in a single roundtrip:
```javascript
const hydratedEvents = await prisma.event.findMany({
  where: { id: { in: targetIds } },
  include: {
    venue: { select: { id: true, name: true, city: true, state: true } },
    artists: {
      include: {
        artist: { select: { id: true, name: true, slug: true, imagePath: true } }
      }
    },
    ticketTypes: {
      select: { priceCents: true, available: true, quantity: true, sold: true }
    }
  }
});
```
This guarantees that regardless of whether the limit is 4, 8, or 20, the backend performs at most 3 bounded queries total, completely eliminating N+1 database roundtrips.

---

## 6. Process-Local Cache Implementation

Reusing `backend/src/lib/cache.js` (`LRUCache`):

- **Cache Key Format**: `catalog:trending:<normalizedCity>:<limit>`
  - `normalizedCity = city ? city.trim().toLowerCase() : "all"`
- **Time-To-Live (TTL)**: 300 seconds (5 minutes).
- **Empty Result Caching**: `[]` is cached with the same TTL to prevent continuous database re-querying for inactive cities.
- **Stampede Protection (Promise-Deduplication Mutex)**:
  - If multiple concurrent requests arrive during a cache miss for the same key, a pending Promise map ensures only **one** database aggregation executes, and all concurrent callers await the same result.
- **Clustered / Multi-Instance Reality**:
  - The cache is process-local. In clustered deployments, separate worker instances may expire at slightly different intervals (within the 5-minute window). This eventual consistency is documented and standard for trending feeds.

---

## 7. Public & Admin API Specifications

### 7.1 Home Feed (`GET /api/v1/home`)
- Integrated into `backend/src/modules/catalog/home.service.js`.
- Replaces placeholder `createdAt: desc` query with `getTrendingEvents({ limit: 8 })`.
- Retains exact response shape for full backward compatibility:
  `{ featuredEvents, trendingEvents, upcomingArtists, cities, cityImages }`.

### 7.2 Dedicated Trending Endpoint (`GET /api/v1/events/trending`)
- **Query Validation (Zod)**:
  - `city`: `z.string().trim().max(100).optional()`
  - `limit`: `z.coerce.number().int().min(1).max(50).default(8)`
- **Response Shape**:
```json
{
  "data": [
    {
      "id": "c1f7b2a0-1234-4a5b-9c8d-123456789abc",
      "title": "Coldplay: Music of the Spheres",
      "slug": "coldplay-sydney",
      "posterPath": "/uploads/posters/coldplay.jpg",
      "startsAt": "2026-11-15T09:00:00.000Z",
      "category": "Concert",
      "venue": {
        "id": "v-123",
        "name": "Accor Stadium",
        "city": "Sydney",
        "state": "NSW"
      },
      "minPriceCents": 9900,
      "trendingMetrics": {
        "rank": 1,
        "recentSalesCount": 142,
        "rankingSource": "RECENT_SALES"
      }
    }
  ]
}
```

### 7.3 Admin Observability Endpoint (`GET /api/v1/admin/events/trending`)
- Protected by `authenticate` and `authorize("ADMIN")`.
- Rejects non-admin or unauthenticated callers with HTTP 401/403.
- **Response Shape**:
```json
{
  "snapshotAt": "2026-10-27T16:00:00.000Z",
  "windowHours": 48,
  "totalTicketsSold48h": 412,
  "trendingCount": 8,
  "events": [
    {
      "id": "c1f7b2a0-...",
      "title": "Coldplay: Music of the Spheres",
      "slug": "coldplay-sydney",
      "status": "PUBLISHED",
      "startsAt": "2026-11-15T09:00:00.000Z",
      "venue": { "name": "Accor Stadium", "city": "Sydney" },
      "rank": 1,
      "recentSalesCount": 142,
      "rankingSource": "RECENT_SALES"
    }
  ]
}
```

---

## 8. Frontend Integration

### 8.1 Customer Web Application (`apps/user-web`)
Located in [`apps/user-web/src/app/page.tsx`](file:///c:/Users/aN/Desktop/MYTIX/Mytix/apps/user-web/src/app/page.tsx):
- **Dynamic Trending Badges**:
  - Replaces generic static "Featured" tag with dynamic rank badge:
    - `#1 Trending` (Gold badge with flame styling)
    - `#2 Trending`, `#3 Trending`, etc.
- **Selling Fast Tag**:
  - Displays high-urgency `Selling Fast` pill on poster overlay when `recentSalesCount >= 10`.
- **Dynamic City Filtering**:
  - Integrates with the existing city pills (`All Cities`, `Sydney`, `Melbourne`, `Brisbane`).
  - When a city is selected, filters trending shows for that city.
  - Correct empty state: "No trending events currently listed in [City]" with an "Explore All Cities" action button.
- **Loading & Skeleton Hygiene**:
  - Preserves existing `EventCardSkeleton` loading states during initial load and city transitions.

### 8.2 Super-Admin Dashboard (`apps/super-admin`)
Located in [`apps/super-admin/src/app/(dashboard)/events/page.tsx`](file:///c:/Users/aN/Desktop/MYTIX/Mytix/apps/super-admin/src/app/%28dashboard%29/events/page.tsx):
- Adds a **Trending (48h)** column to the Events data table.
- Displays for each event:
  - If in Top Trending: Amber badge showing `#1`, `#2`, etc.
  - Sales momentum: `X sold (48h)`.
  - Ranking Source tag: `48h Sales`, `All-Time`, or `Upcoming`.
- Strictly read-only: No manual scoring, pinning, or override controls.

---

## 9. Automated Testing Plan (20 Backend Test Cases)

Using Node.js 22 built-in test runner (`node:test` and `node:assert`):

1. **Multiple tickets in paid order**: A paid order with 3 tickets contributes 3 to `recentSalesCount`.
2. **Multiple orders for single event**: 2 orders of 2 tickets each contribute 4 to the event.
3. **Pending and failed orders**: Orders with status `PENDING` or `FAILED` contribute 0.
4. **Refunded orders**: Orders with status `REFUNDED` contribute 0.
5. **Valid and used tickets**: Both `VALID` and `USED` tickets are counted; `CANCELLED` tickets contribute 0.
6. **Time window filtering**: Orders older than 48 hours contribute 0 to `recentSalesCount`.
7. **Double counting protection**: Orders with generated tickets use ticket count; orders without generated tickets use item quantity. Never both.
8. **Published future events only**: Completed or past events (`startsAt < NOW()`) are excluded.
9. **Unpublished event exclusion**: Events in `DRAFT` or `CANCELLED` status are excluded.
10. **Deterministic tie-breaking**: Events with equal 48h sales are ordered by `startsAt ASC`, then `id ASC`.
11. **City filtering**: Passing `city=Sydney` returns only Sydney events case-insensitively; passing `All Cities` or `null` returns all.
12. **Tier 2 fallback activation**: When fewer than `limit` events have 48h sales, remaining slots are populated by all-time verified sales volume.
13. **Tier 3 fallback activation**: When fewer events have any sales, remaining slots are populated chronologically by `startsAt ASC`.
14. **Cross-tier deduplication**: An event present in Tier 1 never appears in Tier 2 or Tier 3.
15. **Short result list handling**: If only 3 eligible events exist platform-wide, exactly 3 are returned when `limit=8`.
16. **Zero eligible events**: Returns empty array `[]` cleanly without errors.
17. **Input validation**: Non-numeric or negative limit is rejected with 400; string length > 100 for city is rejected.
18. **Cache key isolation & TTL**: Results for `Sydney:8` do not collide with `Melbourne:8` or `all:8`.
19. **Home feed backward compatibility**: `GET /api/v1/home` preserves existing response structure while including trending events.
20. **Admin authorization**: Non-admin requests to `/api/v1/admin/events/trending` return 401/403; admin requests succeed and match public ranking.

---

## 10. Implementation Sequence (Checklist)

1. **Service Module**: Implement `backend/src/modules/catalog/trending.service.js` with sales aggregation, stampede-protected caching, and 3-tier fallback.
2. **Zod Validation Schema**: Update `backend/src/modules/catalog/catalog.schema.js` with `getTrendingEventsQuerySchema`.
3. **Catalog Controller & Routes**: Update `catalog.controller.js` and `catalog.routes.js` with `GET /events/trending`.
4. **Home Feed Update**: Update `home.service.js` to consume `getTrendingEvents({ limit: 8 })`.
5. **Admin Endpoint**: Add `GET /admin/events/trending` to `admin.routes.js`, `admin.controller.js`, and `admin.service.js`.
6. **Automated Test Suite**: Implement `backend/test/trending.test.js` and execute via `node --test`.
7. **User-Web Frontend**: Update `apps/user-web/src/app/page.tsx` with dynamic rank badges and Selling Fast tags.
8. **Super-Admin Frontend**: Update `apps/super-admin/src/app/(dashboard)/events/page.tsx` with the Trending (48h) column.
9. **Verification**: Run tests, verify git status (confirm `apps/user-app` is completely untouched), and present final report.
