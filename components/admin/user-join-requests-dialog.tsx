"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";
import { JoinRequestWithDetails } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatLocalDate } from "@/lib/utils/date";
import { X, Check, XCircle } from "lucide-react";

interface UserJoinRequestsDialogProps {
  userId: string;
  userName: string;
  open: boolean;
  onClose: () => void;
}

type TabKey = "pending" | "history";

export function UserJoinRequestsDialog({
  userId,
  userName,
  open,
  onClose,
}: UserJoinRequestsDialogProps) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const toast = useFeatureToast("admin");
  const router = useRouter();
  const [requests, setRequests] = useState<JoinRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    fetch(`/api/admin/join-requests?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setRequests(data.requests || []);
      })
      .catch(() => {
        toast.error("common:error.failedToLoad");
      })
      .finally(() => setLoading(false));
  }, [open, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Move focus to close button when dialog opens
  useEffect(() => {
    if (open) {
      queueMicrotask(() => closeButtonRef.current?.focus());
    }
  }, [open]);

  // Scroll lock, focus trap, and Escape handler — active only while dialog is open
  const dialogRef = useRef<HTMLDivElement>(null);
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const mainContent = document.getElementById("main-content");
    if (mainContent) mainContent.setAttribute("inert", "");

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      mainContent?.removeAttribute("inert");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  async function handleAction(requestId: string, action: "approve" | "reject") {
    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/admin/join-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error("Failed to process request");

      const successKey = action === "approve" ? "success.approveSuccess" : "success.rejectSuccess";
      toast.success(successKey);

      // Refresh the list
      const listResponse = await fetch(`/api/admin/join-requests?userId=${userId}`);
      const data = await listResponse.json();
      setRequests(data.requests || []);

      router.refresh();
    } catch {
      toast.error("error.failedToProcessRequest");
    } finally {
      setProcessingId(null);
    }
  }

  if (!open) return null;

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const historyRequests = requests.filter((r) => r.status !== "pending");

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/80" aria-hidden="true" onClick={onClose} />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-requests-dialog-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-background border rounded-lg shadow-lg p-6 max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="join-requests-dialog-title" className="text-lg font-semibold">
              {t("users.joinRequests")}
            </h2>
            <p className="text-sm text-muted-foreground">{userName}</p>
          </div>
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="icon"
            aria-label={tCommon("action.close")}
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Tabs — WAI-ARIA Tabs pattern: roving tabindex + arrow key navigation */}
        <div
          className="flex gap-2 mb-4 border-b pb-2"
          role="tablist"
          onKeyDown={(e) => {
            const tabs: TabKey[] = ["pending", "history"];
            const currentIdx = tabs.indexOf(activeTab);
            if (e.key === "ArrowRight") {
              e.preventDefault();
              setActiveTab(tabs[(currentIdx + 1) % tabs.length]);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              setActiveTab(tabs[(currentIdx - 1 + tabs.length) % tabs.length]);
            }
          }}
        >
          <button
            role="tab"
            tabIndex={activeTab === "pending" ? 0 : -1}
            aria-selected={activeTab === "pending"}
            aria-controls="tab-panel-pending"
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === "pending" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
            onClick={() => setActiveTab("pending")}
          >
            {t("users.pending")}
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </button>
          <button
            role="tab"
            tabIndex={activeTab === "history" ? 0 : -1}
            aria-selected={activeTab === "history"}
            aria-controls="tab-panel-history"
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === "history" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
            onClick={() => setActiveTab("history")}
          >
            {t("users.history")}
          </button>
        </div>

        {/* Tab panels — always rendered so aria-controls links resolve correctly; hidden panel removed from a11y tree */}
        {(["pending", "history"] as TabKey[]).map((tab) => {
          const tabRequests = tab === "pending" ? pendingRequests : historyRequests;
          return (
            <div
              key={tab}
              id={`tab-panel-${tab}`}
              role="tabpanel"
              hidden={activeTab !== tab}
              className="flex-1 overflow-y-auto space-y-3"
            >
              {loading && (
                <p className="text-center text-muted-foreground py-4">
                  {tCommon("status.loading")}
                </p>
              )}

              {!loading && tabRequests.length === 0 && (
                <p className="text-center text-muted-foreground py-8">{t("users.noRequests")}</p>
              )}

              {!loading &&
                tabRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">
                          {request.tournament?.name ?? request.tournament_id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("users.requestedOn")}: {formatLocalDate(request.created_at)}
                        </p>
                        {request.status !== "pending" && (
                          <Badge
                            variant={request.status === "approved" ? "default" : "destructive"}
                            className="mt-1"
                          >
                            {request.status === "approved"
                              ? t("users.statusApproved")
                              : t("users.statusRejected")}
                          </Badge>
                        )}
                      </div>

                      {request.status === "pending" && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleAction(request.id, "approve")}
                            disabled={processingId === request.id}
                            aria-label={t("users.approveAriaLabel", {
                              name: request.tournament?.name ?? request.tournament_id,
                            })}
                          >
                            <Check className="h-4 w-4 mr-1" aria-hidden="true" />
                            {t("users.approve")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(request.id, "reject")}
                            disabled={processingId === request.id}
                            aria-label={t("users.rejectAriaLabel", {
                              name: request.tournament?.name ?? request.tournament_id,
                            })}
                          >
                            <XCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                            {t("users.reject")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
