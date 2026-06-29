import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../../utils/AuthContext";

export function LoginPage() {
  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@etcrm.local");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to={user.role === "ADMIN" ? "/admin" : "/sales"} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedIn = await login(email, password);
      navigate(loggedIn.role === "ADMIN" ? "/admin" : "/sales");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to log in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-mist lg:grid-cols-[1fr_440px]">
      <section className="flex min-h-[40vh] flex-col justify-between bg-forest p-8 text-white lg:min-h-screen">
        <div className="flex items-center gap-2 text-lg font-bold">
          <ShieldCheck size={24} />
          ETCRM
        </div>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-white/70">Customer Relationship Management</p>
          <h1 className="mt-3 text-4xl font-bold tracking-normal sm:text-5xl">Run the sales day from one focused workspace.</h1>
          <p className="mt-4 max-w-xl text-base text-white/80">
            Admins manage quotas, imports, and exports. Sales agents work through today&apos;s leads, notes, and follow-ups.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-white/80 sm:grid-cols-2">
          <div className="rounded-lg border border-white/15 bg-white/10 p-4">Admin: admin@etcrm.local</div>
          <div className="rounded-lg border border-white/15 bg-white/10 p-4">Sales: sales@etcrm.local</div>
        </div>
      </section>
      <section className="flex items-center px-6 py-10">
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm rounded-lg border border-line bg-white p-6 shadow-soft">
          <h2 className="text-2xl font-bold">Sign in</h2>
          <p className="mt-1 text-sm text-neutral-500">Use the seeded demo accounts to test both roles.</p>
          {error ? <div className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
          <label className="mt-5 block text-sm font-semibold">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded border border-line px-3 py-2 outline-none focus:border-forest"
              type="email"
            />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded border border-line px-3 py-2 outline-none focus:border-forest"
              type="password"
            />
          </label>
          <button
            disabled={loading}
            className="mt-6 w-full rounded bg-forest px-4 py-2.5 font-semibold text-white hover:bg-forest/90 disabled:opacity-60"
            type="submit"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => setEmail(email === "admin@etcrm.local" ? "sales@etcrm.local" : "admin@etcrm.local")}
            className="mt-3 w-full rounded border border-line px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
          >
            Switch demo role
          </button>
        </form>
      </section>
    </main>
  );
}
