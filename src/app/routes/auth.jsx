import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Chrome, Film, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import {
  forgotPassword,
  googleLogin,
  login,
  register,
  verifyOtp,
} from "@/features/auth/api/authApi";
import { hydrateAuth, logout, readStoredAuth, setCredentials } from "@/features/auth/authSlice";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function loadGoogleScript() {
  if (typeof window === "undefined")
    return Promise.reject(new Error("Google sign-in unavailable."));
  const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Google sign-in failed to load."));
    document.body.appendChild(script);
  });
}

function AuthPage() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    otp: "",
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dispatch(hydrateAuth(readStoredAuth()));
  }, [dispatch]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "login") {
        const result = await login({ email: form.email, password: form.password });
        dispatch(setCredentials(result));
        setMessage("Signed in successfully.");
      } else if (mode === "register") {
        const result = await register(form);
        dispatch(setCredentials(result));
        setMessage("Account created.");
      } else if (mode === "forgot") {
        await forgotPassword(form.email);
        setMessage("OTP sent if the account exists.");
      } else if (mode === "otp") {
        await verifyOtp({ email: form.email, otp: form.otp });
        setMessage("OTP verified.");
      }
    } catch (error) {
      setMessage(error.response?.data?.error ?? "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const continueWithGoogle = async () => {
    if (!googleClientId) {
      setMessage("Add VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID to enable real Google OAuth.");
      return;
    }

    setBusy(true);
    try {
      await loadGoogleScript();
      const credential = await new Promise((resolve, reject) => {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => resolve(response.credential),
        });
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            reject(new Error("Google sign-in was not completed."));
          }
        });
      });
      const result = await googleLogin({ credential });
      dispatch(setCredentials(result));
      setMessage("Signed in with Google.");
    } catch (error) {
      setMessage(error.response?.data?.error ?? error.message ?? "Google login failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!auth.hydrated) {
    return <AuthLoading />;
  }

  if (auth.user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-lg border border-border/60 bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/15 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <h1 className="text-2xl font-bold">{auth.user.name}</h1>
              <p className="text-sm text-muted-foreground">
                {auth.user.email} - {auth.user.role}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/">Browse movies</Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link to="/admin">Open dashboard</Link>
                </Button>
                <Button variant="ghost" onClick={() => dispatch(logout())}>
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_420px]">
      <div className="flex min-h-[520px] flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="max-w-xl"
        >
          <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
            <Film className="h-4 w-4" /> JWT, OTP, roles and Google OAuth
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
            One login for users, theater owners and admins.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            This auth layer is wired to Express, JWT, MongoDB, Brevo OTP mail and provider-based
            OAuth when credentials are configured.
          </p>
        </motion.div>
      </div>

      <form onSubmit={submit} className="rounded-lg border border-border/60 bg-card p-6">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-1 text-sm">
          {[
            ["login", "Login"],
            ["register", "Register"],
            ["forgot", "Forgot"],
            ["otp", "Verify OTP"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`rounded-md px-3 py-2 transition-colors ${
                mode === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {mode === "register" && (
            <Field icon={UserRound}>
              <Input value={form.name} onChange={update("name")} placeholder="Full name" />
            </Field>
          )}
          <Field icon={Mail}>
            <Input value={form.email} onChange={update("email")} placeholder="Email" type="email" />
          </Field>
          {(mode === "login" || mode === "register") && (
            <Field icon={KeyRound}>
              <Input
                value={form.password}
                onChange={update("password")}
                placeholder="Password"
                type="password"
              />
            </Field>
          )}
          {mode === "register" && (
            <select
              value={form.role}
              onChange={update("role")}
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="user">User</option>
              <option value="theater-owner">Theater owner</option>
              <option value="admin">Admin</option>
            </select>
          )}
          {mode === "otp" && (
            <Input value={form.otp} onChange={update("otp")} placeholder="6-digit OTP" />
          )}
        </div>

        {message && <p className="mt-4 text-sm text-primary">{message}</p>}

        <Button className="mt-6 w-full" disabled={busy}>
          {busy
            ? "Please wait..."
            : mode === "login"
              ? "Sign in"
              : mode === "register"
                ? "Create account"
                : mode === "forgot"
                  ? "Send OTP"
                  : "Verify OTP"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="mt-3 w-full gap-2"
          onClick={continueWithGoogle}
          disabled={busy}
        >
          <Chrome className="h-4 w-4" />
          {googleClientId ? "Continue with Google" : "Set up Google OAuth"}
        </Button>
      </form>
    </div>
  );
}

function AuthLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-lg border border-border/60 bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/15 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Checking session</p>
            <h1 className="text-2xl font-bold">BookMyScreen account</h1>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, children }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <div className="[&_input]:pl-9">{children}</div>
    </div>
  );
}

export { Route };
