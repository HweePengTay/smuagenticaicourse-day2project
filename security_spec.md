# Firebase Security Specification (TDD)

## 1. Data Invariants
- A watchlist item cannot exist without a valid `userId` matching the authenticated user (`request.auth.uid`).
- A watchlist item must contain valid `anchorStock` and `comparisonStock` fields representing the selected tickers.
- A watchlist item must have a `createdAt` timestamp stored as an integer epoch millisecond timestamp.
- No anonymous or custom claims are used. Write-access is strictly limited to authenticated users whose `uid` matches the document's `userId`.
- Modification is disabled completely; once created, items are immutable (read/delete operations only).

## 2. The "Dirty Dozen" Attack Payloads

### Payload 1: Hijacked Creator ID (Identity Spoofing)
An authenticated user `attacker_123` attempts to create a watchlist entry inside another user's space by setting the `userId` field to `victim_456`.
- **Target Path**: `/watchlists/item_abc`
- **Payload**:
  ```json
  {
    "userId": "victim_456",
    "anchorStock": "NVDA",
    "comparisonStock": "GS",
    "createdAt": 1716300000000,
    "correlationScore": 0.85,
    "signal": "Watch"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (UID mismatch with authenticated session).

### Payload 2: Ghost Field Injection (Shadow Update)
An attacker attempts to write a watchlist item containing an unvetted custom field `isAdmin` or `bypassAll`.
- **Target Path**: `/watchlists/item_abc`
- **Payload**:
  ```json
  {
    "userId": "attacker_123",
    "anchorStock": "NVDA",
    "comparisonStock": "GS",
    "createdAt": 1716300000000,
    "correlationScore": 0.85,
    "signal": "Watch",
    "isAdmin": true
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Strict key count fails).

### Payload 3: Spoofed Type on Timestamp (Temporal Bypassing)
An attacker tries to save an item with a client-side date-time string instead of an integer.
- **Target Path**: `/watchlists/item_abc`
- **Payload**:
  ```json
  {
    "userId": "attacker_123",
    "anchorStock": "NVDA",
    "comparisonStock": "GS",
    "createdAt": "2020-01-01T00:00:00Z",
    "correlationScore": 0.85,
    "signal": "Watch"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (`createdAt` is not an integer).

### Payload 4: Invalid Characters ID Poisoning (Resource Poisoning)
An attacker tries to inject standard SQL injection or giant garbage character strings as document ID values.
- **Target Path**: `/watchlists/DROP_TABLE_OR_INJECT`
- **Payload**:
  ```json
  {
    "userId": "attacker_123",
    "anchorStock": "NVDA",
    "comparisonStock": "GS",
    "createdAt": 1716300000000,
    "correlationScore": 0.85,
    "signal": "Watch"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Path variable ID regex check `isValidId` fails).

### Payload 5: Errant Value Range (Value Poisoning)
An attacker saves an impossible correlation score of 999.00 (valid range is -1.0 to 1.0).
- **Target Path**: `/watchlists/item_abc`
- **Payload**:
  ```json
  {
    "userId": "attacker_123",
    "anchorStock": "NVDA",
    "comparisonStock": "GS",
    "createdAt": 1716300000000,
    "correlationScore": 999.0,
    "signal": "Watch"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED`.

### Payload 6: Errant Ticker Type Poisoning
An attacker inputs a list or object instead of a string for `anchorStock`.
- **Target Path**: `/watchlists/item_abc`
- **Payload**:
  ```json
  {
    "userId": "attacker_123",
    "anchorStock": ["NVDA", "INVALID"],
    "comparisonStock": "GS",
    "createdAt": 1716300000000,
    "correlationScore": 0.85,
    "signal": "Watch"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED`.

### Payload 7: Missing Required Field (Incomplete Post)
An attacker submits a document missing the `signal` key.
- **Target Path**: `/watchlists/item_abc`
- **Payload**:
  ```json
  {
    "userId": "attacker_123",
    "anchorStock": "NVDA",
    "comparisonStock": "GS",
    "createdAt": 1716300000000,
    "correlationScore": 0.85
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED`.

### Payload 8: Mutating Existing Entries (Write-Only Bypass)
An attacker tries to update an existing watchlist item to re-assign it or modify values.
- **Target Path**: `/watchlists/item_abc`
- **Expected Outcome**: `PERMISSION_DENIED` (all updates are forbidden, only create and delete are allowed).

### Payload 9: Hijacked Deletion (Malicious Cleansing)
An attacker tries to delete a watchlist item belonging to a different user.
- **Target Path**: `/watchlists/victim_item_123` (owned by `victim_456`)
- **Expected Outcome**: `PERMISSION_DENIED` (`resource.data.userId` mismatch with `request.auth.uid`).

### Payload 10: Blanket Listing Without Owner Filter (Query Scraping)
An attacker authenticated as `attacker_123` requests a list query on `/watchlists` without filtering by their own `userId`.
- **Expected Outcome**: `PERMISSION_DENIED` (read rule restricts results to only those where `resource.data.userId == request.auth.uid`).

### Payload 11: Unauthenticated Creation (Anonymity Bypassing)
An unauthenticated request attempts to write a watchlist item.
- **Expected Outcome**: `PERMISSION_DENIED` (`request.auth == null`).

### Payload 12: Super-sized Identifier Injection
An attacker tries to create an entry where `anchorStock` is a massive text payload.
- **Payload**:
  ```json
  {
    "userId": "attacker_123",
    "anchorStock": "NVDA_REALLY_LONG_GARBAGE_PAYLOAD_TO_CHOKE_RESOURCES",
    "comparisonStock": "GS",
    "createdAt": 1716300000000,
    "correlationScore": 0.85,
    "signal": "Watch"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Ticker size strictly bound to string <= 10 characters).

---

## 3. Test Verification Blueprint
The Security Rules will be implemented inside `firestore.rules` containing helper validations mapping to each of the above scenarios.
