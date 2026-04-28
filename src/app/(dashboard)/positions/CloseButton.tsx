"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";

const CLOSABLE = new Set(["pending", "open"]);

export function CloseButton({
  positionId,
  currentStatus,
}: {
  positionId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [optimisticDisabled, setOptimisticDisabled] = useState(false);
  const close = api.polyPositions.close.useMutation({
    onSuccess: () => router.refresh(),
    onError: () => setOptimisticDisabled(false),
  });

  if (!CLOSABLE.has(currentStatus)) return null;

  const disabled = optimisticDisabled || close.isPending;

  return (
    <button
      disabled={disabled}
      onClick={() => {
        setOptimisticDisabled(true);
        close.mutate({ id: positionId });
      }}
      className={`text-xs rounded border px-2 py-1 transition-colors ${
        disabled
          ? "border-gray-800 text-gray-500 cursor-not-allowed"
          : "border-gray-700 hover:border-gray-500 text-gray-300"
      }`}
    >
      {close.isPending ? "closing…" : "close"}
    </button>
  );
}
