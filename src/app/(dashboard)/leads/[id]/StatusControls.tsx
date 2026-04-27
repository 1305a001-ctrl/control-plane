"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";

const STATUS_OPTIONS = [
  "new", "outreached", "replied", "qualified", "won", "lost", "dead",
] as const;

const VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  new: "secondary",
  outreached: "default",
  replied: "default",
  qualified: "default",
  won: "default",
  lost: "destructive",
  dead: "destructive",
};

export function StatusControls({ leadId, current }: { leadId: string; current: string }) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(current);
  const update = api.leads.updateStatus.useMutation({
    onSuccess: () => router.refresh(),
    onError: () => setOptimistic(current),
  });

  return (
    <div>
      <div className="mb-3">
        <Badge variant={VARIANT[optimistic] ?? "secondary"}>{optimistic}</Badge>
        {update.isPending && (
          <span className="ml-2 text-xs text-gray-500">saving…</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            disabled={s === optimistic || update.isPending}
            onClick={() => {
              setOptimistic(s);
              update.mutate({ id: leadId, status: s });
            }}
            className={`text-xs rounded border px-2 py-1 transition-colors ${
              s === optimistic
                ? "border-indigo-600 bg-indigo-600/10 text-indigo-300 cursor-not-allowed"
                : "border-gray-700 hover:border-gray-500 text-gray-300"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {update.error && (
        <p className="mt-2 text-xs text-red-400">{update.error.message}</p>
      )}
    </div>
  );
}
