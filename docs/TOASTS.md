# Toast Notifications

The application uses **Sonner** with feature-scoped localization via `useFeatureToast`. Configured in `components/ui/sonner.tsx` with `richColors`, `position: "top-center"`, and `closeButton`.

## API

```typescript
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";

const toast = useFeatureToast("teams"); // namespace = feature area

toast.success("success.created"); // Feature-specific: teams.messages.success.created
toast.error("common:error.generic"); // Common namespace: common.messages.error.generic
toast.warning("warning.duplicateEntry");
toast.info("info.processing");

// With parameters (for messages with {placeholders})
toast.success("success.adminGranted", { name: userName });

// Promise pattern for async operations (loading → success/error)
await toast.promise(asyncOperation(), {
  loading: "status:creating", // common.status.creating
  success: "success.created", // teams.messages.success.created
  error: "error.failedToCreate", // teams.messages.error.failedToCreate
});
```

## Message Key Prefixes

- **No prefix** — feature-specific: `{namespace}.messages.{key}`
- **`common:`** — common messages: `common.messages.{key}`
- **`status:`** — loading states: `common.status.{key}`

## Message Organization

Messages live in `messages/en.json` and `messages/es.json`, organized by feature:

**Feature-specific** (use without prefix):

- `teams.messages.*` — created, updated, deleted, addedToTournament, failedToCreate/Update/Delete
- `matches.messages.*` — scoreUpdated, created, invalidScore, failedToUpdate
- `tournaments.messages.*` — created, updated, participantAdded, failedToCreate
- `predictions.messages.*` — submitted, updated, failedToSubmit, matchStarted
- `admin.messages.*` — adminGranted({name}), adminRevoked({name}), failedToUpdate
- `profile.messages.*` — profileUpdated, avatarUploaded, failedToUpdate
- `auth.passkeys.messages.*` — registered, registrationFailed

**Common** (use with `common:` prefix):

- `common.messages.success.*` — saved, created, updated, deleted
- `common.messages.error.*` — generic, networkError, unauthorized
- `common.messages.warning.*` — unsavedChanges
- `common.messages.info.*` — processing, loading

**Status** (use with `status:` prefix for promise loading states):

- `common.status.*` — loading, saving, creating, updating, deleting, submitting

## Promise Pattern

Use `toast.promise()` for operations >1 second (API calls, uploads, scoring). Use simple `toast.success()`/`toast.error()` for quick operations or when custom loading UI exists.

```typescript
const toast = useFeatureToast("teams");

const handleCreate = async (formData: FormData) => {
  const createPromise = fetch("/api/teams", {
    method: "POST",
    body: JSON.stringify({ name: formData.get("name") }),
  }).then(async (res) => {
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  });

  try {
    await toast.promise(createPromise, {
      loading: "status:creating",
      success: "success.created",
      error: "error.failedToCreate",
    });
    router.push("/teams");
    router.refresh();
  } catch (err) {
    console.error("Error creating team:", err);
  }
};
```

## Best Practices

1. **Prefer feature-specific over generic** — `toast.success('success.created')` > `toast.success('common:success.created')`
2. **Use multiple hooks** for multiple features — `useFeatureToast('teams')` + `useFeatureToast('tournaments')`
3. **Always wrap promise errors in try-catch** — errors must be thrown (not returned) for the error toast to show
4. **Keep messages concise** — 1-2 lines, action-oriented ("Team created" not "The team was successfully created")

## Troubleshooting

- **Toast not showing**: Verify namespace matches message structure in `messages/en.json`, check `<Toaster />` is in layout
- **Wrong message**: Feature keys need no prefix; common keys need `common:` or `status:` prefix
- **Promise pattern fails**: Errors must be thrown (not returned) for error toast; all 3 keys (loading, success, error) must exist
- **Parameters not working**: Placeholder names in JSON (`{name}`) must match parameter object keys exactly
