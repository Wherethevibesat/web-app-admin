"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function AccountSettingsForm({
  email: initialEmail,
  fullName,
}: {
  email: string;
  fullName: string;
}) {
  const [name, setName] = useState(fullName);
  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    setProfileError(null);

    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail || !nextEmail.includes("@")) {
      setProfileError("Enter a valid email address.");
      setSavingProfile(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProfileError("Session expired. Sign in again.");
      setSavingProfile(false);
      return;
    }

    const emailChanged =
      nextEmail !== (initialEmail || "").trim().toLowerCase();

    if (emailChanged) {
      const { error: authError } = await supabase.auth.updateUser({
        email: nextEmail,
      });
      if (authError) {
        setSavingProfile(false);
        setProfileError(authError.message);
        return;
      }
    }

    const { error } = await supabase
      .from("users")
      .update({
        name: name.trim() || "",
        email: nextEmail,
      })
      .eq("id", user.id);

    setSavingProfile(false);
    if (error) {
      setProfileError(error.message);
      return;
    }

    setProfileMsg(
      emailChanged
        ? "Profile saved. Check your inbox to confirm the new email if prompted."
        : "Profile updated.",
    );
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordMsg("Password updated.");
  }

  return (
    <div className="w-full max-w-3xl space-y-6">
      <form
        onSubmit={saveProfile}
        className="rounded-2xl border border-wtva-dark-300 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold tracking-tight">Profile</h2>
        <p className="mt-1 text-sm text-wtva-muted">
          Your admin account details.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="mt-1 text-xs text-wtva-subtle">
              Changing email may require confirming the new address from your inbox.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
        </div>
        {profileError && (
          <p className="mt-3 text-sm text-red-600">{profileError}</p>
        )}
        {profileMsg && (
          <p className="mt-3 text-sm text-emerald-700">{profileMsg}</p>
        )}
        <div className="mt-5">
          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>

      <form
        onSubmit={changePassword}
        className="rounded-2xl border border-wtva-dark-300 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold tracking-tight">Password</h2>
        <p className="mt-1 text-sm text-wtva-muted">
          Set a new password while signed in. No current password needed.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="new_password">New password</Label>
            <Input
              id="new_password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirm new password</Label>
            <Input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        {passwordError && (
          <p className="mt-3 text-sm text-red-600">{passwordError}</p>
        )}
        {passwordMsg && (
          <p className="mt-3 text-sm text-emerald-700">{passwordMsg}</p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={savingPassword}>
            {savingPassword ? "Updating…" : "Update password"}
          </Button>
          <Link
            href="/auth/reset"
            className="text-sm font-medium text-accent underline-offset-2 hover:underline"
          >
            Forgot password? Email a reset link
          </Link>
        </div>
      </form>
    </div>
  );
}
