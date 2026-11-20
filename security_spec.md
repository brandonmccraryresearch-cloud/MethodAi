# Firestore Security Specification — Google Co-Scientist UM-1 Workbench

## 1. Access Control Model & Roles
- **Authenticated Researcher (`isAuthenticated` & `isVerified`)**:
  - Requires `request.auth != null` and `request.auth.token.email_verified == true`.
  - Each researcher owns their own workspace snapshot document at `/workspaces/{workspaceId}` where `workspaceId == request.auth.uid` and `resource.data.ownerId == request.auth.uid`.
  - Each researcher owns their own multi-turn Co-Scientist conversation log at `/chatThreads/{threadId}` where `threadId == request.auth.uid` and `resource.data.ownerId == request.auth.uid`.
- **Default Deny**:
  - All other paths (`/{document=**}`) explicitly deny `read, write`.

## 2. Schema & Resource Validation (`WorkspaceSnapshot` at `/workspaces/{workspaceId}`)
- **Document ID (`workspaceId`)**: Validated via `isValidId(workspaceId)` (`size() >= 1 && size() <= 128 && matches('^[a-zA-Z0-9_\\-]+$')`) and must equal `request.auth.uid`.
- **Keys (`hasAll` & `hasOnly`)**: `['ownerId', 'ownerEmail', 'researchGoal', 'payloadJson', 'claimCount', 'updatedAt']`.
- **Field Constraints**:
  - `ownerId`: `string`, `size() >= 1 && size() <= 128`, must equal `request.auth.uid` (immutable on update: `request.resource.data.ownerId == resource.data.ownerId`).
  - `ownerEmail`: `string`, `size() >= 3 && size() <= 254`, valid email regex.
  - `researchGoal`: `string`, `size() >= 1 && size() <= 2000`.
  - `payloadJson`: `string`, `size() >= 2 && size() <= 900000`.
  - `claimCount`: `int`, `>= 0 && <= 500`.
  - `updatedAt`: `timestamp`, must equal `request.time`.

## 3. Schema & Resource Validation (`CoScientistChatLog` at `/chatThreads/{threadId}`)
- **Document ID (`threadId`)**: Validated via `isValidId(threadId)` and must equal `request.auth.uid`.
- **Keys (`hasAll` & `hasOnly`)**: `['ownerId', 'activeAgentRole', 'activeModel', 'messagesJson', 'messageCount', 'updatedAt']`.
- **Field Constraints**:
  - `ownerId`: `string`, `size() >= 1 && size() <= 128`, must equal `request.auth.uid` (immutable on update).
  - `activeAgentRole`: `string`, in `['Generation', 'Reflection', 'Ranking', 'Evolution', 'Meta-Review']`.
  - `activeModel`: `string`, in `['gemini-4-hydrogen', 'gemini-4-argon', 'gemini-4-carbon', 'gemini-3.1-flash-lite']`.
  - `messagesJson`: `string`, `size() >= 2 && size() <= 500000`.
  - `messageCount`: `int`, `>= 0 && <= 500`.
  - `updatedAt`: `timestamp`, must equal `request.time`.
