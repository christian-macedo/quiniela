"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Check, X, Smartphone, Computer, Key } from "lucide-react";
import { formatLocalDate, formatLocalDateTime } from "@/lib/utils/date";
import type { PasskeyCredentialSummary } from "@/types/webauthn";

interface PasskeyListItemProps {
  passkey: PasskeyCredentialSummary;
  onRename: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export function PasskeyListItem({
  passkey,
  onRename,
  onDelete,
  isDeleting,
}: PasskeyListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(passkey.credentialName || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const handleSaveRename = async () => {
    if (!editName.trim()) return;

    setIsRenaming(true);
    try {
      await onRename(passkey.id, editName.trim());
      setIsEditing(false);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(passkey.credentialName || "");
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await onDelete(passkey.id);
    setShowDeleteDialog(false);
  };

  // Get device icon based on transports and device type
  const getDeviceIcon = () => {
    if (passkey.transports?.includes("internal")) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (passkey.deviceType === "multiDevice") {
      return <Computer className="h-5 w-5" />;
    }
    return <Key className="h-5 w-5" />;
  };

  const getDeviceTypeLabel = () => {
    if (passkey.backedUp) return "Synced across devices";
    if (passkey.deviceType === "singleDevice") return "This device only";
    if (passkey.deviceType === "multiDevice") return "Available on multiple devices";
    return "Security key";
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-1 text-muted-foreground">
            {getDeviceIcon()}
          </div>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={100}
                  className="max-w-xs"
                  placeholder="Enter passkey name"
                  disabled={isRenaming}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveRename();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSaveRename}
                  disabled={isRenaming || !editName.trim()}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  disabled={isRenaming}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <p className="font-medium truncate">
                  {passkey.credentialName || "Unnamed Passkey"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getDeviceTypeLabel()}
                </p>
                <div className="text-xs text-muted-foreground mt-1">
                  <p>Created {formatLocalDate(passkey.createdAt)}</p>
                  {passkey.lastUsedAt && (
                    <p>Last used {formatLocalDateTime(passkey.lastUsedAt)}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2 ml-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              disabled={isDeleting}
              title="Rename passkey"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
              title="Delete passkey"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Passkey</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{passkey.credentialName || "this passkey"}&quot;?
              This action cannot be undone. You will need to register this device again to use
              passkey authentication.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
