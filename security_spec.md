# Firebase Security Specification

## Data Invariants
1. A user can only modify their own profile (`/users/{userId}`).
2. A user can create a high score entry, but only if the `userId` in the payload matches their authenticated UID.
3. High score entries are immutable once created (or at least cannot be modified by the user to prevent cheating).
4. Users cannot modify their `highScore` field in the profile unless the update logic is tied to a verified game state (though in client-side Firestore, we usually rely on schema validation and owner checks, but we should harden it).

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a profile for another UID.
   - `PUT /users/attacker-uid { uid: 'victim-uid', highScore: 999999 }`
   - Expected: `PERMISSION_DENIED`

2. **Admin Escalation**: Attempt to set an `isAdmin` field that doesn't exist in schema.
   - `PATCH /users/my-uid { isAdmin: true }`
   - Expected: `PERMISSION_DENIED` (due to `affectedKeys().hasOnly`)

3. **Leaderboard Injection**: Attempt to post a score for someone else.
   - `POST /highScores { userId: 'victim-uid', score: 1000 }`
   - Expected: `PERMISSION_DENIED`

4. **Score Tampering**: Attempt to update an existing high score entry.
   - `PATCH /highScores/some-score-id { score: 999999 }`
   - Expected: `PERMISSION_DENIED` (entries should be immutable)

5. **Resource Exhaustion**: Send a 1MB string as a display name.
   - `PATCH /users/my-uid { displayName: 'A'.repeat(1024 * 1024) }`
   - Expected: `PERMISSION_DENIED` (due to `.size()` check)

6. **Invalid ID**: Use a malicious ID for a document.
   - `PUT /users/../../etc/passwd { ... }`
   - Expected: `PERMISSION_DENIED` (due to `isValidId` regex)

7. **Negative Score**: Attempt to save a negative score.
   - `POST /highScores { score: -100, ... }`
   - Expected: `PERMISSION_DENIED` (due to `score >= 0` check)

8. **Future Timestamp**: Send a timestamp in the future.
   - `POST /highScores { timestamp: '2099-01-01...', ... }`
   - Expected: `PERMISSION_DENIED` (must match `request.time`)

9. **Field Omission**: Create a user profile without required `highScore`.
   - `PUT /users/my-uid { displayName: 'John' }`
   - Expected: `PERMISSION_DENIED`

10. **Type Mismatch**: Send a string for `highScore`.
    - `PATCH /users/my-uid { highScore: 'lots' }`
    - Expected: `PERMISSION_DENIED`

11. **Shadow Update**: Add a hidden field to a high score entry.
    - `POST /highScores { ..., phantomField: true }`
    - Expected: `PERMISSION_DENIED`

12. **Unverified Write**: Attempt to write as an unverified user (if we enforce email verification).
    - Expected: `PERMISSION_DENIED`
