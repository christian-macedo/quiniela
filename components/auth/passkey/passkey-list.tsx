"use client";

import { useEffect, useState } from "react";
import { PasskeyListItem } from "./passkey-list-item";
import { listPasskeys, renamePasskey, deletePasskey } from "@/lib/webauthn/client";
import { Loader2, AlertCircle } from "lucide-react";
import type { PasskeyCredentialSummary } from "@/types/webauthn";

interface PasskeyListProps {
  onPasskeysChange?: () => void;
}

export function PasskeyList({ onPasskeysChange }: PasskeyListProps) {
  const [passkeys, setPasskeys] = useState<PasskeyCredentialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPasskeys = async () => {
    setLoading(true);
    setError(null);

    const result = await listPasskeys();

    if (result.success && result.passkeys) {
      setPasskeys(result.passkeys);
    } else {
      setError(result.error || "Failed to load passkeys");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadPasskeys();
  }, []);

  const handleRename = async (id: string, newName: string) => {
    const result = await renamePasskey(id, newName);

    if (result.success) {
      // Update local state
      setPasskeys((prev) =>
        prev.map((p) => (p.id === id ? { ...p, credentialName: newName } : p))
      );
      onPasskeysChange?.();
    } else {
      setError(result.error || "Failed to rename passkey");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deletePasskey(id);

    if (result.success) {
      // Update local state
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
      onPasskeysChange?.();
    } else {
      setError(result.error || "Failed to delete passkey");
    }

    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm flex items-start gap-2">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  if (passkeys.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No passkeys registered yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {passkeys.map((passkey) => (
        <PasskeyListItem
          key={passkey.id}
          passkey={passkey}
          onRename={handleRename}
          onDelete={handleDelete}
          isDeleting={deletingId === passkey.id}
        />
      ))}
    </div>
  );
}
