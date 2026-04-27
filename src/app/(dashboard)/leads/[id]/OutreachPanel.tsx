"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";

type Message = {
  id: string;
  status: string;
  subject: string | null;
  body: string;
  demoUrl: string | null;
  toEmail: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  openedAt: Date | null;
  repliedAt: Date | null;
  bouncedAt: Date | null;
  resendMessageId: string | null;
  errors: unknown;
  createdAt: Date;
};

const STATUS_COLOR: Record<string, string> = {
  drafted: "text-gray-300 border-gray-700",
  approved: "text-amber-300 border-amber-700",
  queued: "text-amber-300 border-amber-700",
  sent: "text-indigo-300 border-indigo-700",
  delivered: "text-blue-300 border-blue-700",
  opened: "text-emerald-300 border-emerald-700",
  replied: "text-emerald-300 border-emerald-700",
  bounced: "text-red-300 border-red-700",
  failed: "text-red-300 border-red-700",
  cancelled: "text-gray-500 border-gray-700",
};

const SENDABLE = new Set(["drafted", "approved", "failed"]);
const CANCELLABLE = new Set(["drafted", "approved", "queued", "failed"]);

export function OutreachPanel({ leadId }: { leadId: string }) {
  const router = useRouter();
  const messagesQuery = api.outreach.forLead.useQuery({ leadId });

  if (messagesQuery.isLoading) {
    return <p className="text-sm text-gray-500">loading outreach…</p>;
  }
  const messages = (messagesQuery.data ?? []) as Message[];
  if (messages.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No drafts yet. Run{" "}
        <code className="font-mono text-xs">
          docker compose run --rm outreach-agent python -m outreach_agent.main draft {leadId} --demo-url …
        </code>{" "}
        to create one.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((m) => (
        <MessageCard
          key={m.id}
          message={m}
          onChanged={() => {
            void messagesQuery.refetch();
            router.refresh();
          }}
        />
      ))}
    </div>
  );
}

function MessageCard({ message, onChanged }: { message: Message; onChanged: () => void }) {
  const [toEmail, setToEmail] = useState(message.toEmail ?? "");
  const [error, setError] = useState<string | null>(null);

  const send = api.outreach.approveAndSend.useMutation({
    onSuccess: () => {
      setError(null);
      onChanged();
    },
    onError: (e) => setError(e.message),
  });
  const cancel = api.outreach.cancel.useMutation({
    onSuccess: onChanged,
    onError: (e) => setError(e.message),
  });

  const cls = STATUS_COLOR[message.status] ?? "text-gray-300 border-gray-700";
  const sendable = SENDABLE.has(message.status);
  const cancellable = CANCELLABLE.has(message.status);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono uppercase px-2 py-0.5 rounded border ${cls}`}>
            {message.status}
          </span>
          <span className="text-xs text-gray-500">
            drafted {new Date(message.createdAt).toLocaleString()}
          </span>
        </div>
        {message.resendMessageId && (
          <span className="text-xs font-mono text-gray-500" title="Resend message id">
            {message.resendMessageId.slice(0, 8)}…
          </span>
        )}
      </div>

      {message.subject && (
        <p className="text-sm font-medium text-gray-200 mb-1">
          Subject: {message.subject}
        </p>
      )}
      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans bg-gray-900/40 p-3 rounded mb-3">
        {message.body}
      </pre>

      {message.demoUrl && (
        <p className="text-xs text-gray-500 mb-3">
          demo:{" "}
          <a
            href={message.demoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-400 hover:text-indigo-300"
          >
            {message.demoUrl}
          </a>
        </p>
      )}

      <div className="flex items-center gap-2 mb-3">
        <input
          type="email"
          placeholder="recipient email"
          value={toEmail}
          onChange={(e) => setToEmail(e.target.value)}
          disabled={!sendable || send.isPending}
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm font-mono disabled:opacity-50"
        />
        <button
          disabled={!sendable || !toEmail || send.isPending}
          onClick={() => {
            setError(null);
            send.mutate({ id: message.id, toEmail });
          }}
          className="text-xs rounded border border-emerald-700 bg-emerald-700/20 text-emerald-200 px-3 py-1.5 hover:bg-emerald-700/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {send.isPending ? "sending…" : "Approve & Send"}
        </button>
        <button
          disabled={!cancellable || cancel.isPending}
          onClick={() => {
            setError(null);
            if (confirm("Cancel this message?")) cancel.mutate({ id: message.id });
          }}
          className="text-xs rounded border border-gray-700 px-3 py-1.5 hover:border-gray-500 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 font-mono">
        {message.approvedBy && (
          <div>approved by {message.approvedBy}{message.approvedAt && ` @ ${new Date(message.approvedAt).toLocaleString()}`}</div>
        )}
        {message.sentAt && <div>sent {new Date(message.sentAt).toLocaleString()}</div>}
        {message.deliveredAt && <div>delivered {new Date(message.deliveredAt).toLocaleString()}</div>}
        {message.openedAt && <div>opened {new Date(message.openedAt).toLocaleString()}</div>}
        {message.repliedAt && <div>replied {new Date(message.repliedAt).toLocaleString()}</div>}
        {message.bouncedAt && <div className="text-red-400">bounced {new Date(message.bouncedAt).toLocaleString()}</div>}
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </div>
  );
}
