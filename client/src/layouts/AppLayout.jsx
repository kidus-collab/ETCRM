import { useState } from "react";
import { KeyRound, LogOut, X } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../utils/AuthContext";

export function AppLayout({ children, title, subtitle }) {
  const { user, logout } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  function updatePasswordField(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  async function submitPasswordChange(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await api.patch("/auth/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage("Password updated.");
    } catch (error) {
      setPasswordError(error.response?.data?.message || "Could not update password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-mist">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-forest">ETCRM</p>
            <h1 className="text-2xl font-bold tracking-normal text-ink">{title}</h1>
            {subtitle ? <p className="text-sm text-neutral-500">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-neutral-500">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm((current) => !current);
                setPasswordError("");
                setPasswordMessage("");
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded border border-line bg-white text-neutral-700 hover:bg-neutral-50"
              title="Change password"
            >
              <KeyRound size={18} />
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-10 w-10 items-center justify-center rounded border border-line bg-white text-neutral-700 hover:bg-neutral-50"
              title="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
        {showPasswordForm ? (
          <div className="border-t border-line bg-neutral-50">
            <form
              onSubmit={submitPasswordChange}
              className="mx-auto grid max-w-7xl gap-3 px-4 py-4 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-end sm:px-6"
            >
              <label className="text-sm font-medium text-neutral-700">
                Current password
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => updatePasswordField("currentPassword", event.target.value)}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="text-sm font-medium text-neutral-700">
                New password
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => updatePasswordField("newPassword", event.target.value)}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
                  minLength={8}
                  required
                />
              </label>
              <label className="text-sm font-medium text-neutral-700">
                Confirm password
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => updatePasswordField("confirmPassword", event.target.value)}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
                  minLength={8}
                  required
                />
              </label>
              <button
                type="submit"
                disabled={passwordSaving}
                className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {passwordSaving ? "Saving..." : "Update"}
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordForm(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded border border-line bg-white text-neutral-700 hover:bg-neutral-100"
                title="Close"
              >
                <X size={18} />
              </button>
              {(passwordError || passwordMessage) && (
                <p className={`text-sm sm:col-span-5 ${passwordError ? "text-red-700" : "text-forest"}`}>
                  {passwordError || passwordMessage}
                </p>
              )}
            </form>
          </div>
        ) : null}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
