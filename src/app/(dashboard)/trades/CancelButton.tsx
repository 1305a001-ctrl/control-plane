"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";

const CANCELLABLE = new Set(["pending", "open"]);

export function CancelButton({
  tradeId,
  currentStatus,
}: {
  tradeId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [optimisticDisabled, setOptimisticDisabled] = useState(false);
  const cancel = api.trades.cancel.useMutation({
    onSuccess: () => router.refresh(),
    onError: () => setOptimisticDisabled(false),
  });

  if (!CANCELLABLE.has(currentStatus)) return null;

  const disabled = optimisticDisabled || cancel.isPending;

  return (
    <button
      disabled={disabled}
      onClick={() => {
        setOptimisticDisabled(true);
        cancel.mutate({ id: tradeId });
      }}
      className={`text-xs rounded border px-2 py-1 transition-colors ${
        disabled
          ? "border-gray-800 text-gray-500 cursor-not-allowed"
          : "border-gray-700 hover:border-gray-500 text-gray-300"
      }`}
    >
      {cancel.isPending ? "cancelling…" : "cancel"}
    </button>
  );
}
