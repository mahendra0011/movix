import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { forgotPassword, login, register, verifyOtp } from "@/features/auth/api/authApi";
import { hydrateAuth, logout, readStoredAuth, setCredentials } from "@/features/auth/authSlice";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const [mode, setMode] = useState("login");
  const [otpStep, setOtpStep] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
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

  const startOtpStep = (result, email) => {
    setPendingEmail(result.email || email);
    setOtpStep(true);
    setMessage(result.message || "OTP sent to your email.");
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (otpStep) {
        const result = await verifyOtp({ email: pendingEmail || form.email, otp: form.otp });
        dispatch(setCredentials(result));
        setMessage("Signed in successfully.");
        return;
      }

      if (mode === "login") {
        const result = await login({ email: form.email, password: form.password });
        if (result.requiresOtp) startOtpStep(result, form.email);
        else dispatch(setCredentials(result));
      } else {
        const result = await register({
          name: form.name,
          email: form.email,
          password: form.password,
          role: "user",
        });
        if (result.requiresOtp) startOtpStep(result, form.email);
        else dispatch(setCredentials(result));
      }
    } catch (error) {
      setMessage(error.response?.data?.error ?? "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    const email = pendingEmail || form.email;
    if (!email) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await forgotPassword(email);
      setMessage(result.message ?? "OTP sent to your email.");
    } catch (error) {
      setMessage(error.response?.data?.error ?? "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setOtpStep(false);
    setPendingEmail("");
    setMessage("");
    setForm((current) => ({ ...current, otp: "" }));
  };

  if (!auth.hydrated) {
    return <AuthLoading />;
  }

  if (auth.user) {
    return <SignedInCard user={auth.user} onLogout={() => dispatch(logout())} />;
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-190px)] max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-[1fr_440px]">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="hidden lg:block"
      >
        <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          <ShieldCheck className="h-4 w-4" />
          Verified access
        </div>
        <h1 className="mt-6 max-w-2xl text-5xl font-bold tracking-tight">
          Secure sign in for customers, operators and admins.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Every login and new account is confirmed with an email OTP before a session is created.
        </p>
        <div className="mt-8 grid max-w-xl gap-3">
          <TrustItem
            icon={Mail}
            title="Email OTP"
            text="One-time code verification before access."
          />
          <TrustItem
            icon={Building2}
            title="Admin ready"
            text="Owner credentials open the admin console."
          />
          <TrustItem
            icon={CheckCircle2}
            title="Ticket safe"
            text="Booking emails are verified before payment."
          />
        </div>
      </motion.section>

      <section className="rounded-lg border border-border/60 bg-card/85 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div>
          <p className="text-sm font-medium text-primary">BookMyScreen account</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            {otpStep ? "Verify your email" : mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {otpStep
              ? `Enter the OTP sent to ${pendingEmail || form.email}.`
              : "Use your email and password to continue."}
          </p>
        </div>

        {!otpStep && (
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-1 text-sm">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-md px-3 py-2 transition-colors ${
                mode === "login"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`rounded-md px-3 py-2 transition-colors ${
                mode === "register"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Create
            </button>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {!otpStep && mode === "register" && (
            <Field icon={UserRound}>
              <Input value={form.name} onChange={update("name")} placeholder="Full name" />
            </Field>
          )}

          {!otpStep && (
            <>
              <Field icon={Mail}>
                <Input
                  value={form.email}
                  onChange={update("email")}
                  placeholder="Email address"
                  type="email"
                />
              </Field>
              <Field icon={KeyRound}>
                <Input
                  value={form.password}
                  onChange={update("password")}
                  placeholder="Password"
                  type="password"
                />
              </Field>
            </>
          )}

          {otpStep && (
            <Field icon={ShieldCheck}>
              <Input
                value={form.otp}
                onChange={update("otp")}
                placeholder="6-digit OTP"
                inputMode="numeric"
              />
            </Field>
          )}

          {message && (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{message}</p>
          )}

          <Button className="h-11 w-full gap-2" disabled={busy}>
            {busy ? "Please wait..." : otpStep ? "Verify and continue" : "Continue"}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        {otpStep && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button type="button" onClick={resendOtp} className="text-primary hover:underline">
              Resend OTP
            </button>
            <button
              type="button"
              onClick={() => setOtpStep(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Change email
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function SignedInCard({ user, onLogout }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-lg border border-border/60 bg-card p-6 shadow-xl shadow-black/10">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/15 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-sm text-muted-foreground">
              {user.email} - {user.role}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/">Browse movies</Link>
              </Button>
              {user.role === "admin" && (
                <Button variant="secondary" asChild>
                  <Link to="/admin">Open dashboard</Link>
                </Button>
              )}
              <Button variant="ghost" onClick={onLogout}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>
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

function TrustItem({ icon: Icon, title, text }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/60 p-4">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, children }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <div className="[&_input]:h-11 [&_input]:pl-9">{children}</div>
    </div>
  );
}

export { Route };
