"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import type { SupportThreadRow } from "@/lib/admin/messages";

type MessageRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: { name: string; role: string } | { name: string; role: string }[] | null;
};

type SearchUser = { id: string; name: string; email: string; role: string };

export function MessageInbox({ initialThreads }: { initialThreads: SupportThreadRow[] }) {
  const [threads, setThreads] = useState(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreads[0]?.id ?? null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    fetch(`/api/admin/messages/inbox/${activeThreadId}`)
      .then((r) => r.json())
      .then((data) => setMessages(data.messages ?? []))
      .catch(() => setMessages([]));
  }, [activeThreadId]);

  useEffect(() => {
    if (!userQuery.trim()) {
      setUserResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/admin/messages/users?q=${encodeURIComponent(userQuery)}`)
        .then((r) => r.json())
        .then((data) => setUserResults(data.users ?? []))
        .catch(() => setUserResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [userQuery]);

  async function sendReply() {
    if (!activeThreadId || !reply.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/messages/inbox/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: activeThreadId, message: reply }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Send failed");
      return;
    }
    setReply("");
    const msgRes = await fetch(`/api/admin/messages/inbox/${activeThreadId}`);
    const msgData = await msgRes.json();
    setMessages(msgData.messages ?? []);
    const inboxRes = await fetch("/api/admin/messages/inbox");
    const inboxData = await inboxRes.json();
    setThreads(inboxData.threads ?? []);
  }

  async function startThread(userId: string) {
    if (!newMessage.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/messages/inbox/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, message: newMessage }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to start thread");
      return;
    }
    setNewMessage("");
    setUserQuery("");
    setUserResults([]);
    const inboxRes = await fetch("/api/admin/messages/inbox");
    const inboxData = await inboxRes.json();
    const nextThreads = inboxData.threads ?? [];
    setThreads(nextThreads);
    setActiveThreadId(data.threadId ?? nextThreads[0]?.id ?? null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-xl border border-wtva-dark-300 bg-wtva-card p-4 lg:col-span-1">
        <h3 className="font-semibold">Support inbox</h3>
        <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="text-sm text-wtva-muted">No support threads yet.</p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveThreadId(t.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  activeThreadId === t.id ? "bg-accent-gradient text-white shadow-accent" : "hover:bg-wtva-dark-300"
                }`}
              >
                <p className="font-medium">{t.user.name}</p>
                <p className="truncate text-xs opacity-80">{t.preview ?? t.user.email}</p>
              </button>
            ))
          )}
        </div>

        <div className="mt-6 border-t border-wtva-dark-300 pt-4">
          <h4 className="text-sm font-semibold">New support message</h4>
          <Input
            placeholder="Search user by name or email"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            className="mt-2"
          />
          {userResults.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-wtva-dark-300">
              {userResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setUserQuery(`${u.name} (${u.email})`);
                    setUserResults([u]);
                  }}
                  className="block w-full px-3 py-2 text-left text-xs hover:bg-wtva-dark-300"
                >
                  {u.name} · {u.role} · {u.email}
                </button>
              ))}
            </div>
          )}
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={3}
            placeholder="Message to user"
            className="mt-2"
          />
          <Button
            className="mt-2"
            disabled={busy || !newMessage.trim() || userResults.length !== 1}
            onClick={() => startThread(userResults[0].id)}
          >
            Start thread
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-wtva-dark-300 bg-wtva-card p-4 lg:col-span-2">
        {activeThread ? (
          <>
            <h3 className="font-semibold">
              {activeThread.user.name}{" "}
              <span className="text-sm font-normal text-wtva-muted">({activeThread.user.role})</span>
            </h3>
            <p className="text-sm text-wtva-muted">{activeThread.user.email}</p>
            <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto rounded-lg border border-wtva-dark-300 p-3">
              {messages.map((m) => {
                const sender = Array.isArray(m.sender) ? m.sender[0] : m.sender;
                const isAdmin = sender?.role === "admin";
                return (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      isAdmin ? "ml-auto bg-accent-gradient text-white shadow-accent" : "bg-wtva-dark-400"
                    }`}
                  >
                    <p className="text-xs opacity-70">{sender?.name ?? "User"}</p>
                    <p>{m.body}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="Reply..."
                className="flex-1"
              />
              <Button disabled={busy || !reply.trim()} onClick={sendReply}>
                Send
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-wtva-muted">Select a thread or start a new support conversation.</p>
        )}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
