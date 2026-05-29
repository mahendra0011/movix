import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Hash,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Ticket,
  UserRound,
} from "lucide-react";
import {
  forgotPassword,
  login,
  register,
  resetPassword,
  verifyOtp,
} from "@/features/auth/api/authApi";
import { hydrateAuth, logout, readStoredAuth, setCredentials } from "@/features/auth/authSlice";
import { movies } from "@/features/movies/data/movieCatalog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const accessCards = [
  { label: "Moviegoer", value: "Book seats", icon: Ticket },
  { label: "Admin", value: "Approve & track", icon: ShieldCheck },
  { label: "Owner", value: "Manage cinema", icon: Building2 },
];

const authMovie = movies.find((movie) => movie.id === "dune-part-two") ?? movies[0];
const accountTypes = [
  { id: "user", label: "Customer" },
  { id: "theater-owner", label: "Theater owner" },
];

function AuthPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const [mode, setMode] = useState("login");
  const [otpStep, setOtpStep] = useState(false);
  const [ownerApplicationStep, setOwnerApplicationStep] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
    otp: "",
    ownerApplication: {
      theaterName: "",
      companyName: "",
      city: "",
      area: "",
      address: "",
      screens: "2",
      contact: "",
      gstNumber: "",
      documents: "GST, Fire NOC",
    },
  });
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!auth.hydrated) dispatch(hydrateAuth(readStoredAuth()));
    setAuthReady(true);
  }, [auth.hydrated, dispatch]);

  useEffect(() => {
    if (!authReady || !auth.hydrated || !auth.user) return;
    navigate({ to: routeForRole(auth.user), replace: true });
  }, [auth.hydrated, auth.user, authReady, navigate]);

  const isSubmitDisabled = useMemo(() => {
    if (busy) return true;
    if (mode === "forgot") {
      if (!otpStep) return !form.email.trim();
      return (
        form.otp.trim().length < 4 ||
        form.password.trim().length < 8 ||
        form.password !== form.confirmPassword
      );
    }
    if (otpStep) return form.otp.trim().length < 4;
    if (!form.email.trim() || !form.password.trim()) return true;
    if (mode !== "register") return false;
    if (!form.name.trim()) return true;
    if (form.role !== "theater-owner") return false;
    if (!ownerApplicationStep) return false;
    return (
      !form.ownerApplication.theaterName.trim() ||
      !form.ownerApplication.city.trim() ||
      !form.ownerApplication.address.trim() ||
      !form.ownerApplication.contact.trim() ||
      Number(form.ownerApplication.screens) < 1
    );
  }, [
    busy,
    form.confirmPassword,
    form.email,
    form.name,
    form.otp,
    form.ownerApplication,
    form.password,
    form.role,
    mode,
    ownerApplicationStep,
    otpStep,
  ]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setNotice(null);
  };

  const updateOwnerApplication = (field) => (event) => {
    setForm((current) => ({
      ...current,
      ownerApplication: {
        ...current.ownerApplication,
        [field]: event.target.value,
      },
    }));
    setNotice(null);
  };

  const startOtpStep = (result, email) => {
    setPendingEmail(result.email || email);
    setOtpStep(true);
    setNotice({ tone: "success", text: result.message || "OTP sent to your email." });
  };

  const completeSignIn = async (result) => {
    dispatch(setCredentials(result));
    await navigate({ to: routeForRole(result.user), replace: true });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (isSubmitDisabled) return;

    setBusy(true);
    setNotice(null);
    try {
      if (mode === "forgot") {
        if (!otpStep) {
          const result = await forgotPassword(form.email);
          startOtpStep(result, form.email);
          return;
        }

        const result = await resetPassword({
          email: pendingEmail || form.email,
          otp: form.otp,
          password: form.password,
        });
        setMode("login");
        setOtpStep(false);
        setPendingEmail("");
        setForm((current) => ({
          ...current,
          password: "",
          confirmPassword: "",
          otp: "",
        }));
        setNotice({
          tone: "success",
          text: result.message ?? "Password reset successful. Sign in with your new password.",
        });
        return;
      }

      if (otpStep) {
        const result = await verifyOtp({ email: pendingEmail || form.email, otp: form.otp });
        await completeSignIn(result);
        return;
      }

      if (mode === "login") {
        const result = await login({ email: form.email, password: form.password });
        if (result.requiresOtp) startOtpStep(result, form.email);
        else await completeSignIn(result);
      } else {
        if (form.role === "theater-owner" && !ownerApplicationStep) {
          setOwnerApplicationStep(true);
          setNotice({
            tone: "success",
            text: "Basic account ready. Fill the theatre owner application before email verification.",
          });
          return;
        }

        const result = await register({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          ownerApplication:
            form.role === "theater-owner"
              ? {
                  ...form.ownerApplication,
                  ownerName: form.name,
                  ownerEmail: form.email,
                }
              : undefined,
        });
        if (result.requiresOtp) startOtpStep(result, form.email);
        else await completeSignIn(result);
      }
    } catch (error) {
      setNotice({ tone: "error", text: error.response?.data?.error ?? "Request failed." });
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    const email = pendingEmail || form.email;
    if (!email) {
      setNotice({ tone: "error", text: "Enter your email first." });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const result =
        mode === "forgot"
          ? await forgotPassword(email)
          : await login({ email, password: form.password });
      setNotice({ tone: "success", text: result.message ?? "OTP sent to your email." });
    } catch (error) {
      setNotice({ tone: "error", text: error.response?.data?.error ?? "Could not send OTP." });
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setOtpStep(false);
    setOwnerApplicationStep(false);
    setPendingEmail("");
    setNotice(null);
    setForm((current) => ({ ...current, password: "", confirmPassword: "", otp: "" }));
  };

  const copy = authCopy(mode, otpStep, pendingEmail || form.email, ownerApplicationStep, form.role);

  if (!authReady) {
    return <AuthLoading />;
  }

  if (auth.user) {
    return <SignedInCard user={auth.user} onLogout={() => dispatch(logout())} />;
  }

  return (
    <div className="relative min-h-[calc(100vh-190px)] overflow-hidden">
      <img
        src={authMovie.backdrop}
        alt={authMovie.title}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/88 to-background/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />

      <div className="relative mx-auto grid min-h-[calc(100vh-190px)] max-w-[1560px] items-center gap-8 px-4 py-10 sm:px-5 lg:grid-cols-[1fr_460px] lg:px-6">
        <section className="hidden lg:block">
          <span className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-3 py-2 text-sm font-medium text-primary backdrop-blur">
            <ShieldCheck className="h-4 w-4" />
            Movie booking access
          </span>
          <h1 className="mt-6 max-w-3xl text-5xl font-bold tracking-tight">
            Book seats, manage cinema operations and handle approvals from one place.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Customers get OTP-secured tickets, theater owners manage cinema operations, and admins
            control movies, approvals and revenue.
          </p>

          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            {accessCards.map((card) => (
              <AccessCard key={card.label} {...card} />
            ))}
          </div>

          <div className="mt-8 max-w-xl rounded-lg border border-border/60 bg-background/50 p-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <img
                src={authMovie.poster}
                alt={authMovie.title}
                className="h-20 w-14 rounded-md object-cover"
              />
              <div>
                <p className="text-xs uppercase text-muted-foreground">Now booking</p>
                <h2 className="mt-1 font-semibold">{authMovie.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {authMovie.language} - {authMovie.duration} - {authMovie.rating}/10
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/90 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary">BookMyScreen account</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">{copy.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{copy.text}</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/15 text-primary">
              {otpStep ? (
                <BadgeCheck className="h-6 w-6" />
              ) : mode === "forgot" ? (
                <KeyRound className="h-6 w-6" />
              ) : (
                <UserRound className="h-6 w-6" />
              )}
            </div>
          </div>

          {!otpStep && mode !== "forgot" && (
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-background/50 p-1 text-sm">
              <SegmentButton active={mode === "login"} onClick={() => switchMode("login")}>
                Sign in
              </SegmentButton>
              <SegmentButton active={mode === "register"} onClick={() => switchMode("register")}>
                Register
              </SegmentButton>
            </div>
          )}

          {!otpStep && mode === "forgot" && (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="mt-5 text-sm text-primary hover:underline"
            >
              Back to sign in
            </button>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2 lg:hidden">
            {accessCards.map((card) => (
              <CompactAccessCard key={card.label} {...card} />
            ))}
          </div>

          {otpStep && <OtpHeader email={pendingEmail || form.email} />}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {!otpStep && mode === "register" && (
              <>
                {!ownerApplicationStep && (
                  <>
                    <Field label="Full name" icon={UserRound}>
                      <Input
                        value={form.name}
                        onChange={update("name")}
                        placeholder="Mahendra Prajapati"
                        autoComplete="name"
                      />
                    </Field>

                    <div>
                      <span className="text-xs font-medium uppercase text-muted-foreground">
                        Account type
                      </span>
                      <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-background/50 p-1 text-sm">
                        {accountTypes.map((type) => (
                          <SegmentButton
                            key={type.id}
                            active={form.role === type.id}
                            onClick={() => {
                              setOwnerApplicationStep(false);
                              setForm((current) => ({
                                ...current,
                                role: type.id,
                              }));
                            }}
                          >
                            {type.label}
                          </SegmentButton>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {form.role === "theater-owner" && ownerApplicationStep && (
                  <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Owner account details saved</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {form.name} - {form.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOwnerApplicationStep(false);
                          setNotice(null);
                        }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}

                {form.role === "theater-owner" && ownerApplicationStep && (
                  <div className="rounded-lg border border-border/60 bg-background/35 p-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold uppercase text-muted-foreground">
                        Theater owner application
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Field label="Cinema name" icon={Building2}>
                        <Input
                          value={form.ownerApplication.theaterName}
                          onChange={updateOwnerApplication("theaterName")}
                          placeholder="Samdareeya Era Cinema"
                        />
                      </Field>
                      <Field label="Company / owner" icon={UserRound}>
                        <Input
                          value={form.ownerApplication.companyName}
                          onChange={updateOwnerApplication("companyName")}
                          placeholder="Cinema company name"
                        />
                      </Field>
                      <Field label="City" icon={MapPin}>
                        <Input
                          value={form.ownerApplication.city}
                          onChange={updateOwnerApplication("city")}
                          placeholder="Jabalpur"
                        />
                      </Field>
                      <Field label="Area" icon={MapPin}>
                        <Input
                          value={form.ownerApplication.area}
                          onChange={updateOwnerApplication("area")}
                          placeholder="Napier Town"
                        />
                      </Field>
                      <Field label="Screens" icon={Hash}>
                        <Input
                          value={form.ownerApplication.screens}
                          onChange={updateOwnerApplication("screens")}
                          type="number"
                          min="1"
                          placeholder="2"
                        />
                      </Field>
                      <Field label="Contact" icon={Phone}>
                        <Input
                          value={form.ownerApplication.contact}
                          onChange={updateOwnerApplication("contact")}
                          placeholder="+91 98765 43210"
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="Full address" icon={MapPin}>
                          <Input
                            value={form.ownerApplication.address}
                            onChange={updateOwnerApplication("address")}
                            placeholder="Complete cinema address"
                          />
                        </Field>
                      </div>
                      <Field label="GST number" icon={FileText}>
                        <Input
                          value={form.ownerApplication.gstNumber}
                          onChange={updateOwnerApplication("gstNumber")}
                          placeholder="Optional"
                        />
                      </Field>
                      <Field label="Documents" icon={FileText}>
                        <Input
                          value={form.ownerApplication.documents}
                          onChange={updateOwnerApplication("documents")}
                          placeholder="GST, Fire NOC, Lease"
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </>
            )}

            {!otpStep && !ownerApplicationStep && (
              <Field label="Email address" icon={Mail}>
                <Input
                  value={form.email}
                  onChange={update("email")}
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                />
              </Field>
            )}

            {!otpStep && mode !== "forgot" && !ownerApplicationStep && (
              <Field
                label="Password"
                icon={KeyRound}
                action={
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              >
                <Input
                  value={form.password}
                  onChange={update("password")}
                  placeholder="Enter password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="pr-12"
                />
              </Field>
            )}

            {!otpStep && mode === "login" && (
              <div className="-mt-2 text-right">
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {otpStep && (
              <Field label="Email OTP" icon={ShieldCheck}>
                <Input
                  value={form.otp}
                  onChange={update("otp")}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </Field>
            )}

            {otpStep && mode === "forgot" && (
              <>
                <Field
                  label="New password"
                  icon={KeyRound}
                  action={
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                >
                  <Input
                    value={form.password}
                    onChange={update("password")}
                    placeholder="Minimum 8 characters"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-12"
                  />
                </Field>
                <Field label="Confirm password" icon={KeyRound}>
                  <Input
                    value={form.confirmPassword}
                    onChange={update("confirmPassword")}
                    placeholder="Re-enter new password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                  />
                </Field>
              </>
            )}

            {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

            <Button className="h-11 w-full gap-2" disabled={isSubmitDisabled}>
              {submitLabel(mode, otpStep, busy, ownerApplicationStep, form.role)}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          {otpStep ? (
            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={resendOtp}
                disabled={busy}
                className="text-primary hover:underline disabled:opacity-50"
              >
                Resend OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpStep(false);
                  setOwnerApplicationStep(false);
                  setNotice(null);
                  setForm((current) => ({
                    ...current,
                    otp: "",
                    password: "",
                    confirmPassword: "",
                  }));
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Change email
              </button>
            </div>
          ) : mode === "forgot" ? (
            <div className="mt-5 rounded-lg border border-border/60 bg-background/35 p-3 text-xs text-muted-foreground">
              Password reset is protected with a one-time email code. The code expires in 10
              minutes.
            </div>
          ) : ownerApplicationStep ? (
            <div className="mt-5 rounded-lg border border-border/60 bg-background/35 p-3 text-xs text-muted-foreground">
              After this form, email OTP verification runs. Owner access stays pending until admin
              approval.
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-border/60 bg-background/35 p-3 text-xs text-muted-foreground">
              Theater owner accounts can open the owner dashboard after admin approval.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function authCopy(mode, otpStep, email, ownerApplicationStep, role) {
  if (mode === "forgot") {
    if (otpStep) {
      return {
        title: "Create a new password",
        text: `Enter the OTP sent to ${email || "your email"} and choose a stronger password.`,
      };
    }

    return {
      title: "Forgot password?",
      text: "Enter your account email. We will send a secure OTP to reset your password.",
    };
  }

  if (otpStep) {
    return {
      title: "Verify your email",
      text:
        role === "theater-owner"
          ? `Use the OTP sent to ${email || "your inbox"}. Your owner account stays pending until admin approval.`
          : `Use the OTP sent to ${email || "your inbox"} to continue securely.`,
    };
  }

  if (ownerApplicationStep) {
    return {
      title: "Complete theatre details",
      text: "Fill the cinema application. After email verification, admin approval is required before the owner panel becomes active.",
    };
  }

  if (mode === "register") {
    return {
      title: "Create your account",
      text:
        role === "theater-owner"
          ? "Theatre owners start with name, email and password, then submit cinema details for approval."
          : "Register as a customer to book seats, manage tickets and track refunds.",
    };
  }

  return {
    title: "Welcome back",
    text: "Sign in with email and password, then confirm the OTP sent to your inbox.",
  };
}

function submitLabel(mode, otpStep, busy, ownerApplicationStep, role) {
  if (busy) return "Please wait";
  if (mode === "forgot") return otpStep ? "Reset password" : "Send reset OTP";
  if (otpStep) return "Verify OTP";
  if (mode === "register" && role === "theater-owner" && !ownerApplicationStep) {
    return "Continue to theatre form";
  }
  if (mode === "register" && ownerApplicationStep) return "Submit application";
  return mode === "register" ? "Create account" : "Sign in";
}

function SegmentButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 font-medium transition-colors ${
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function AccessCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/45 p-4 backdrop-blur">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function CompactAccessCard({ icon: Icon, label }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/45 p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-2 text-[11px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function OtpHeader({ email }) {
  return (
    <div className="mt-6 rounded-lg border border-primary/30 bg-primary/10 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Mail className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Check your inbox</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{email}</p>
        </div>
      </div>
    </div>
  );
}

function Notice({ tone, children }) {
  const toneClass =
    tone === "error"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-primary/30 bg-primary/10 text-primary";

  return (
    <p className={`rounded-md border px-3 py-2 text-sm ${toneClass}`}>
      <span className="inline-flex items-center gap-2">
        {tone === "error" ? (
          <ShieldCheck className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        {children}
      </span>
    </p>
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
              <Button variant="secondary" asChild>
                <Link to={routeForRole(user)}>
                  {user.role === "admin"
                    ? "Open admin panel"
                    : user.role === "theater-owner"
                      ? "Open owner dashboard"
                      : "Open user dashboard"}
                </Link>
              </Button>
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

function Field({ icon: Icon, label, children, action }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <div className="relative mt-2">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <div className="[&_input]:h-11 [&_input]:pl-9">{children}</div>
        {action && <div className="absolute right-1 top-1/2 -translate-y-1/2">{action}</div>}
      </div>
    </label>
  );
}

function routeForRole(user) {
  if (user?.role === "admin") return "/admin";
  if (user?.role === "theater-owner") return "/owner";
  return "/dashboard";
}

export { Route };
