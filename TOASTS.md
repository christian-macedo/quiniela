# Toast Notifications

Comprehensive guide to using toast notifications in the Quiniela application.

## Overview

The application uses **Sonner** for toast notifications with feature-scoped localization and rich colors. The `useFeatureToast` hook provides automatic localization with feature-specific messages and fallback to common messages.

## Quick Start

```typescript
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";

const toast = useFeatureToast('teams');

// Basic usage
toast.success('success.created');           // Feature-specific message
toast.error('common:error.generic');        // Common message
toast.warning('warning.duplicateEntry');    // Warning
toast.info('info.processing');              // Info

// With parameters (for messages with placeholders)
toast.success('success.adminGranted', { name: userName });

// Promise pattern for async operations
await toast.promise(asyncOperation(), {
  loading: 'status:creating',
  success: 'success.created',
  error: 'error.failedToCreate'
});
```

## API Reference

### `useFeatureToast(namespace: string)`

**Location**: `lib/hooks/use-feature-toast.ts`

Creates a toast instance scoped to a specific feature area.

**Parameters**:
- `namespace` (string): The feature area namespace (e.g., 'teams', 'matches', 'tournaments', 'predictions', 'admin', 'profile')

**Returns**: Toast object with methods:
- `success(key: string, params?: Record<string, any>)` - Show success toast (green)
- `error(key: string, params?: Record<string, any>)` - Show error toast (red)
- `warning(key: string, params?: Record<string, any>)` - Show warning toast (yellow/orange)
- `info(key: string, params?: Record<string, any>)` - Show info toast (blue)
- `promise(promise: Promise, messages: { loading, success, error })` - Show loading → success/error transition

**Example**:
```typescript
const toast = useFeatureToast('teams');
toast.success('success.created'); // Uses teams.messages.success.created
```

## Message Organization

Toast messages are organized by feature area in `messages/en.json` and `messages/es.json`.

### Feature-Specific Messages

Use without `common:` prefix. These messages are scoped to specific feature areas:

- **`teams.messages.*`** - Team-related operations
  - `success.created` - Team created successfully
  - `success.updated` - Team updated successfully
  - `success.deleted` - Team deleted successfully
  - `success.addedToTournament` - Team added to tournament
  - `error.failedToCreate` - Failed to create team
  - `error.failedToUpdate` - Failed to update team
  - `error.failedToDelete` - Failed to delete team

- **`matches.messages.*`** - Match operations and scoring validation
  - `success.scoreUpdated` - Match score updated
  - `success.created` - Match created successfully
  - `error.invalidScore` - Invalid score values
  - `error.failedToUpdate` - Failed to update match

- **`tournaments.messages.*`** - Tournament operations
  - `success.created` - Tournament created successfully
  - `success.updated` - Tournament updated successfully
  - `success.participantAdded` - Participant added to tournament
  - `error.failedToCreate` - Failed to create tournament

- **`predictions.messages.*`** - Prediction submissions
  - `success.submitted` - Prediction submitted successfully
  - `success.updated` - Prediction updated successfully
  - `error.failedToSubmit` - Failed to submit prediction
  - `error.matchStarted` - Cannot predict after match starts

- **`admin.messages.*`** - Admin permission management
  - `success.adminGranted` - Admin permissions granted to {name}
  - `success.adminRevoked` - Admin permissions revoked from {name}
  - `error.failedToUpdate` - Failed to update admin status

- **`profile.messages.*`** - Profile updates
  - `success.profileUpdated` - Profile updated successfully
  - `success.avatarUploaded` - Avatar uploaded successfully
  - `error.failedToUpdate` - Failed to update profile

- **`auth.passkeys.messages.*`** - Passkey authentication
  - `success.registered` - Passkey registered successfully
  - `error.registrationFailed` - Passkey registration failed

### Common Messages

Use with `common:` prefix. These are generic messages for truly generic operations:

- **`common.messages.success.*`** - Generic success messages
  - `saved` - Saved successfully
  - `created` - Created successfully
  - `updated` - Updated successfully
  - `deleted` - Deleted successfully

- **`common.messages.error.*`** - Generic errors
  - `generic` - Something went wrong. Please try again.
  - `networkError` - Network error. Please check your connection.
  - `unauthorized` - You don't have permission to perform this action.

- **`common.messages.info.*`** - Informational messages
  - `processing` - Processing...
  - `loading` - Loading...

- **`common.messages.warning.*`** - Warning messages
  - `unsavedChanges` - You have unsaved changes

### Status Messages (for Promise Pattern)

Use with `status:` prefix. These are loading state messages:

- **`common.status.*`**
  - `loading` - Loading...
  - `saving` - Saving...
  - `creating` - Creating...
  - `updating` - Updating...
  - `deleting` - Deleting...
  - `submitting` - Submitting...

## Rich Colors

Sonner is configured with `richColors={true}` in `components/ui/sonner.tsx`:

- **Success** toasts: Green background with checkmark icon
- **Error** toasts: Red background with X icon
- **Warning** toasts: Yellow/Orange background with warning icon
- **Info** toasts: Blue background with info icon

Rich colors provide:
- Visual differentiation between toast types
- Improved accessibility
- Better user experience with color-coded feedback

## Promise Pattern

For long-running async operations (API calls, file uploads, complex calculations), use `toast.promise()` to provide automatic loading → success/error state transitions.

### Benefits

- Eliminates manual `isLoading` state management
- Automatic state transitions (loading → success/error)
- Rich colors for visual feedback (blue → green/red)
- Better user experience with immediate feedback
- Consistent loading states across the app

### Basic Usage

```typescript
const toast = useFeatureToast('namespace');

// Wrap async operation in promise
const result = await toast.promise(
  asyncOperation(),  // Can be Promise or async function
  {
    loading: 'status:creating',   // Loading message key
    success: 'success.created',   // Success message key
    error: 'error.failedToCreate' // Error message key
  }
);
```

### Message Key Prefixes

- `status:*` - Uses `common.status.*` keys (loading, saving, creating, updating, deleting, submitting)
- `common:*` - Uses `common.messages.*` keys (generic messages)
- No prefix - Uses feature-specific keys from namespace

### Complete Example: Team Creation

```typescript
"use client";
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";
import { useRouter } from "next/navigation";

export function TeamCreateForm() {
  const router = useRouter();
  const toast = useFeatureToast('teams');

  const handleCreate = async (formData: FormData) => {
    const createPromise = fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get('name'),
        short_name: formData.get('short_name')
      }),
    }).then(async (response) => {
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      return response.json();
    });

    try {
      await toast.promise(createPromise, {
        loading: 'status:creating',          // "Creating..."
        success: 'success.created',           // "Team created successfully"
        error: 'error.failedToCreate',        // "Failed to create team"
      });

      router.push('/teams');
      router.refresh();
    } catch (err) {
      console.error('Error creating team:', err);
    }
  };

  return (
    <form onSubmit={handleCreate}>
      {/* Form fields */}
    </form>
  );
}
```

### Example: Profile Update with Error Handling

```typescript
const toast = useFeatureToast('profile');

async function handleUpdate() {
  const updatePromise = async () => {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };

  try {
    const result = await toast.promise(updatePromise, {
      loading: 'status:saving',              // "Saving..."
      success: 'success.profileUpdated',     // "Profile updated successfully"
      error: 'error.failedToUpdate',         // "Failed to update profile"
    });

    // Post-success actions
    router.refresh();
  } catch (err) {
    // Additional error handling if needed
    console.error('Update error:', err);
  }
}
```

### Example: File Upload (Team Logo)

```typescript
const toast = useFeatureToast('teams');

async function handleLogoUpload(file: File) {
  const uploadPromise = uploadImage(file, 'team-logos', `team-${teamId}`);

  try {
    const logoUrl = await toast.promise(uploadPromise, {
      loading: 'status:uploading',           // "Uploading..."
      success: 'success.logoUploaded',       // "Logo uploaded successfully"
      error: 'error.failedToUpload',         // "Failed to upload logo"
    });

    // Update team with new logo URL
    await updateTeam(teamId, { logo_url: logoUrl });
  } catch (err) {
    console.error('Upload error:', err);
  }
}
```

### When to Use Promise Pattern

Use `toast.promise()` for:
- API calls (create, update, delete operations)
- File uploads (team logos, user avatars)
- Match scoring (calculates points for multiple predictions)
- Any operation taking >1 second
- Operations where users need to see loading state

### When to Use Simple Toasts

Use simple `toast.success()` / `toast.error()` for:
- Quick operations (<1 second)
- Operations with custom loading UI already implemented
- Fire-and-forget actions without user-facing results
- Immediate feedback based on local state

## Best Practices

### 1. Use Feature-Specific Messages

When available, use feature-specific messages for better context:

```typescript
// ✅ Good - Feature-specific message
const toast = useFeatureToast('teams');
toast.success('success.created'); // "Team created successfully"

// ❌ Bad - Generic message
toast.success('common:success.created'); // "Created successfully"
```

### 2. Use Common Messages for Generic Operations

Use common messages only for truly generic operations:

```typescript
const toast = useFeatureToast('teams');

// Generic error
toast.error('common:error.generic');

// Generic success
toast.success('common:success.saved');

// Network error
toast.error('common:error.networkError');
```

### 3. Avoid Manual {item} Parameters

Use feature-specific messages instead of parameterized generic messages:

```typescript
// ❌ Old approach - requires parameter
toast.error('error.failedToUpdate', { item: 'team' });

// ✅ New approach - feature-specific message
const toast = useFeatureToast('teams');
toast.error('error.failedToUpdate'); // "Failed to update team"
```

### 4. Use Multiple Hooks for Multiple Feature Areas

When working with multiple features, use multiple toast hooks:

```typescript
const toastTeams = useFeatureToast('teams');
const toastTournaments = useFeatureToast('tournaments');

// Team-specific toast
toastTeams.success('success.addedToTournament');

// Tournament-specific toast
toastTournaments.success('success.participantAdded');
```

### 5. Use Promise Pattern for Loading States

Provide loading state feedback for async operations:

```typescript
const toast = useFeatureToast('predictions');

const handleSubmit = async () => {
  const submitPromise = fetch('/api/predictions', {
    method: 'POST',
    body: JSON.stringify(prediction)
  });

  await toast.promise(submitPromise, {
    loading: 'status:submitting',         // Shows loading toast
    success: 'success.submitted',         // Shows success on resolve
    error: 'error.failedToSubmit'         // Shows error on reject
  });
};
```

### 6. Handle Errors Gracefully

Always provide error handling for promise-based operations:

```typescript
try {
  await toast.promise(operation(), {
    loading: 'status:saving',
    success: 'success.saved',
    error: 'error.failed'
  });

  // Success path
  router.refresh();
} catch (err) {
  // Additional error handling
  console.error('Operation failed:', err);
  // Maybe revert UI state or show additional guidance
}
```

### 7. Keep Messages Concise

Toast messages should be:
- Short (1-2 lines max)
- Action-oriented ("Team created" not "The team was successfully created")
- Specific to the operation performed

### 8. Use Appropriate Toast Types

Choose the right toast type for the situation:

```typescript
const toast = useFeatureToast('matches');

// Success - operation completed successfully
toast.success('success.scoreUpdated');

// Error - operation failed
toast.error('error.failedToUpdate');

// Warning - potential issue or important notice
toast.warning('warning.matchAlreadyStarted');

// Info - informational message (use sparingly)
toast.info('info.scoringInProgress');
```

## Troubleshooting

### Toast not showing

1. **Check if namespace is correct**: Ensure the namespace matches the message structure in `messages/en.json`
2. **Verify message key exists**: Check that the message key exists in both `en.json` and `es.json`
3. **Check Sonner component**: Ensure `<Toaster />` is rendered in your layout

### Wrong message displayed

1. **Check key prefix**: Feature-specific keys don't need prefix, common keys need `common:` or `status:` prefix
2. **Verify namespace**: Ensure namespace matches the feature area (e.g., 'teams' for team operations)

### Promise pattern not working

1. **Check promise resolution**: Ensure the promise resolves/rejects correctly
2. **Verify error throwing**: Errors must be thrown (not returned) for error toast to show
3. **Check message keys**: All three keys (loading, success, error) must exist in localization files

### Parameters not working

1. **Check message definition**: Ensure message has placeholder like `{name}` in JSON files
2. **Match parameter names**: Parameter names must match placeholder names exactly
3. **Pass as object**: Parameters must be passed as object: `{ name: value }`

## Examples by Feature

### Teams

```typescript
const toast = useFeatureToast('teams');

// Create
await toast.promise(createTeam(data), {
  loading: 'status:creating',
  success: 'success.created',
  error: 'error.failedToCreate'
});

// Update
await toast.promise(updateTeam(id, data), {
  loading: 'status:updating',
  success: 'success.updated',
  error: 'error.failedToUpdate'
});

// Delete
await toast.promise(deleteTeam(id), {
  loading: 'status:deleting',
  success: 'success.deleted',
  error: 'error.failedToDelete'
});
```

### Matches

```typescript
const toast = useFeatureToast('matches');

// Score update
await toast.promise(updateMatchScore(matchId, scores), {
  loading: 'status:updating',
  success: 'success.scoreUpdated',
  error: 'error.failedToUpdate'
});

// Validation error (immediate)
if (!isValidScore(homeScore, awayScore)) {
  toast.error('error.invalidScore');
  return;
}
```

### Predictions

```typescript
const toast = useFeatureToast('predictions');

// Submit prediction
await toast.promise(submitPrediction(data), {
  loading: 'status:submitting',
  success: 'success.submitted',
  error: 'error.failedToSubmit'
});

// Update prediction
await toast.promise(updatePrediction(id, data), {
  loading: 'status:updating',
  success: 'success.updated',
  error: 'error.failedToUpdate'
});
```

### Profile

```typescript
const toast = useFeatureToast('profile');

// Profile update
await toast.promise(updateProfile(data), {
  loading: 'status:saving',
  success: 'success.profileUpdated',
  error: 'error.failedToUpdate'
});

// Avatar upload
await toast.promise(uploadAvatar(file), {
  loading: 'status:uploading',
  success: 'success.avatarUploaded',
  error: 'error.failedToUpload'
});
```

### Admin

```typescript
const toast = useFeatureToast('admin');

// Grant admin
toast.success('success.adminGranted', { name: userName });

// Revoke admin
toast.success('success.adminRevoked', { name: userName });

// Error
toast.error('error.failedToUpdate');
```

## Configuration

The toast system is configured in `components/ui/sonner.tsx`:

```typescript
<Toaster
  position="top-center"
  richColors={true}
  closeButton={true}
/>
```

**Key settings**:
- `position`: Where toasts appear (top-center, bottom-right, etc.)
- `richColors`: Enables colored backgrounds (green/red/yellow/blue)
- `closeButton`: Adds close button to each toast

To customize, edit `components/ui/sonner.tsx`.
