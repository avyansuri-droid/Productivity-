# Security Specification

## Data Invariants
1. A user document must exist before subcollections are created.
2. A task, event, transcription, or template cannot exist without a valid user ID that belongs to the authenticated user.
3. Users can only read, write, and see their own data.
4. Timestamps (`createdAt`, `updatedAt`) must mirror the server request time.

## The "Dirty Dozen" Payloads
1. Attempt to create a task in another user's subcollection.
2. Attempt to read a transcription from another user's subcollection.
3. Attempt to update a task to change its `userId` field to someone else.
4. Attempt to create a task with an unverified email.
5. Attempt to create a task with an invalid ID length (e.g. 500 characters).
6. Attempt to inject an unknown field (e.g. `isAdmin: true`) into a task or template payload.
7. Attempt to set `createdAt` to a fake timestamp in the past.
8. Attempt to modify `createdAt` during an update.
9. Attempt to create an event with `title` exceeding 255 characters.
10. Attempt to list tasks across all users (where clause omitted or bypassing security).
11. Attempt to delete a template owned by another user.
12. Attempt to bypass `hasOnly()` checks by providing missing required fields during creation.
