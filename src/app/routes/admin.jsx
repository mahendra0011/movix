import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BadgeIndianRupee,
  BarChart3,
  BellRing,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  Film,
  Gauge,
  LockKeyhole,
  LogIn,
  MonitorCog,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Ticket,
  UserCog,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  fetchAdminSummary,
  fetchTheaterApplications,
  updateTheaterApplicationStatus,
} from "@/features/admin/api/adminApi";
import { hydrateAuth, logout, readStoredAuth } from "@/features/auth/authSlice";
import { theaters as theaterCatalog } from "@/features/movies/data/movieCatalog";
import { SpotlightCard } from "@/shared/components/reactbits/SpotlightCard";
import { Button } from "@/shared/components/ui/button";
import { TrendAreaChart, VerticalBars } from "@/shared/components/ui/lightweight-chart";

const emptyTrend = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - index));
  return {
    day: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    revenue: 0,
    bookings: 0,
    seats: 0,
  };
});

const fallback = {
  summary: {
    revenue: 0,
    bookings: 0,
    seatsSold: 0,
    users: 0,
    movies: 0,
    theaters: 0,
    occupancy: 0,
    averageOrderValue: 0,
    averageSeatsPerBooking: 0,
    topMovie: "No bookings yet",
  },
  charts: {
    revenueTrend: emptyTrend,
    popularMovies: [],
    theaterPerformance: [],
  },
  recentBookings: [],
};

const pendingTheatersSeed = [
  {
    id: "sterling-imax",
    name: "Sterling IMAX",
    owner: "Aarav Cinemas LLP",
    screens: 6,
    status: "Pending",
    documents: "GST, FSSAI, Fire NOC",
  },
  {
    id: "galaxy-premium",
    name: "Galaxy Premium Screens",
    owner: "Galaxy Motion Pvt Ltd",
    screens: 4,
    status: "Pending",
    documents: "GST, Fire NOC",
  },
  {
    id: "liberty-dolby",
    name: "Liberty Dolby Cinema",
    owner: "Liberty Entertainment",
    screens: 3,
    status: "Pending",
    documents: "GST, Lease, Safety",
  },
];

const adminTabs = [
  { id: "analytics", label: "Control room", icon: BarChart3 },
  { id: "theaters", label: "Theaters", icon: Building2 },
  { id: "users", label: "Users", icon: UserCog },
  { id: "refunds", label: "Refunds", icon: RefreshCcw },
  { id: "finance", label: "Revenue", icon: ReceiptText },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "bookings", label: "Bookings", icon: Ticket },
];

const adminControlModules = [
  {
    title: "Theater Management",
    value: "Partners",
    text: "Approve cinemas, review documents, screens, seat layouts and service readiness.",
    icon: Building2,
  },
  {
    title: "User Management",
    value: "Trust",
    text: "Block or unblock users, complaints, refund requests and customer support queues.",
    icon: UserCog,
  },
  {
    title: "Revenue & Commission",
    value: "Finance",
    text: "Platform earnings, theatre payouts, commission rules, GST and tax reporting.",
    icon: ReceiptText,
  },
  {
    title: "Notifications",
    value: "Campaigns",
    text: "Push alerts, email campaigns and SMS updates for bookings and promotions.",
    icon: BellRing,
  },
  {
    title: "Payment Management",
    value: "Gateway",
    text: "Razorpay, Stripe, failed payments, settlement status and refund tracking.",
    icon: CreditCard,
  },
];

const theaterManagementTools = [
  {
    title: "Screen management",
    value: "Layouts",
    text: "Audit screens, capacities, VIP rows, wheelchair blocks and seat-map readiness.",
    icon: MonitorCog,
  },
  {
    title: "Partner compliance",
    value: "Docs",
    text: "GST, FSSAI, Fire NOC, lease documents and owner contact verification.",
    icon: ShieldCheck,
  },
  {
    title: "Payout readiness",
    value: "Finance",
    text: "Settlement account, commission slab and monthly tax report status.",
    icon: WalletCards,
  },
];

const userOpsRows = [
  {
    name: "Aditi Sharma",
    status: "Active",
    issue: "Complaint: recliner seat not working",
    action: "Assign support",
  },
  {
    name: "Rohan Mehta",
    status: "Watchlist",
    issue: "3 payment failures in 24 hours",
    action: "Block user",
  },
  {
    name: "Neha Kapoor",
    status: "Blocked",
    issue: "Chargeback abuse under review",
    action: "Unblock user",
  },
];

const cancelledTicketRows = [
  {
    ref: "BMS-CNL-1042",
    user: "Aditi Sharma",
    email: "aditi.sharma@example.com",
    movie: "Dune: Part Two",
    theater: "PVR INOX: Orion Mall",
    seats: ["F7", "F8"],
    amount: 960,
    reason: "User cancelled ticket",
    status: "Pending refund",
    cancelledAt: "Today, 3:20 PM",
  },
  {
    ref: "BMS-CNL-1038",
    user: "Kabir Khan",
    email: "kabir.khan@example.com",
    movie: "Avengers: Endgame",
    theater: "Movie Magic (SAM)",
    seats: ["D11"],
    amount: 420,
    reason: "Show cancelled by cinema",
    status: "Manual review",
    cancelledAt: "Today, 1:05 PM",
  },
  {
    ref: "BMS-CNL-1029",
    user: "Meera Joshi",
    email: "meera.joshi@example.com",
    movie: "Interstellar",
    theater: "Samdareeya Era Cinema",
    seats: ["C4", "C5"],
    amount: 780,
    reason: "Payment captured after cancellation",
    status: "Gateway initiated",
    cancelledAt: "Yesterday, 8:42 PM",
  },
];

const financeRows = [
  { label: "Platform commission", value: "10%", text: "Default slab for standard cinema partners" },
  { label: "GST report", value: "Ready", text: "Monthly taxable booking and convenience fees" },
  {
    label: "Theatre payouts",
    value: "T+2",
    text: "Auto settlement after successful reconciliation",
  },
];

const paymentRows = [
  { label: "Razorpay", value: "Live", text: "UPI, cards, netbanking and wallet checkout" },
  { label: "Stripe", value: "Ready", text: "International card payments and reconciliation" },
  { label: "Failed payments", value: "7", text: "Retry queue with user notification hooks" },
  { label: "Refund tracking", value: "T+1", text: "Gateway refund status and support visibility" },
];

const adminSelectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring";

const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const [data, setData] = useState(fallback);
  const [loadState, setLoadState] = useState("idle");
  const [activeTab, setActiveTab] = useState("analytics");
  const [theaterApprovals, setTheaterApprovals] = useState(pendingTheatersSeed);
  const [selectedTheaterCity, setSelectedTheaterCity] = useState("Jabalpur");
  const [approvalBusy, setApprovalBusy] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!auth.hydrated) dispatch(hydrateAuth(readStoredAuth()));
  }, [auth.hydrated, dispatch]);

  useEffect(() => {
    if (!auth.hydrated || !auth.user || auth.user.role === "admin") return;
    navigate({ to: auth.user.role === "theater-owner" ? "/owner" : "/dashboard", replace: true });
  }, [auth.hydrated, auth.user, navigate]);

  useEffect(() => {
    if (!auth.hydrated || auth.user?.role !== "admin") return undefined;
    let active = true;
    setLoadState("loading");

    fetchAdminSummary()
      .then((nextData) => {
        if (!active) return;
        setData(nextData);
        setLoadState("ready");
      })
      .catch((error) => {
        if (!active) return;
        if ([401, 403].includes(error.response?.status)) {
          dispatch(logout());
          return;
        }
        setData(fallback);
        setLoadState("error");
      });

    return () => {
      active = false;
    };
  }, [auth.hydrated, auth.user?.role, dispatch]);

  useEffect(() => {
    if (!auth.hydrated || auth.user?.role !== "admin") return undefined;
    let active = true;

    fetchTheaterApplications()
      .then((result) => {
        if (!active) return;
        const applications = result.theaters ?? [];
        setTheaterApprovals(applications.length ? applications : pendingTheatersSeed);
      })
      .catch(() => {
        if (active) setTheaterApprovals(pendingTheatersSeed);
      });

    return () => {
      active = false;
    };
  }, [auth.hydrated, auth.user?.role]);

  const summary = data.summary ?? fallback.summary;
  const charts = data.charts ?? fallback.charts;
  const recentBookings = data.recentBookings ?? [];
  const revenueTrend = charts.revenueTrend?.length ? charts.revenueTrend : emptyTrend;
  const popularMovies = charts.popularMovies ?? [];
  const theaterPerformance = charts.theaterPerformance ?? [];
  const hasRevenueData = revenueTrend.some((row) => row.revenue > 0 || row.bookings > 0);
  const pendingCount = theaterApprovals.filter((theater) => theater.status === "Pending").length;
  const managedTheaters = useMemo(
    () => buildManagedTheaters(theaterCatalog, theaterApprovals),
    [theaterApprovals],
  );
  const theaterCityOptions = useMemo(
    () => buildTheaterCityOptions(managedTheaters),
    [managedTheaters],
  );
  const cityTheaters = useMemo(
    () => managedTheaters.filter((theater) => theater.city === selectedTheaterCity),
    [managedTheaters, selectedTheaterCity],
  );

  useEffect(() => {
    if (theaterCityOptions.length && !theaterCityOptions.includes(selectedTheaterCity)) {
      setSelectedTheaterCity(theaterCityOptions[0]);
    }
  }, [selectedTheaterCity, theaterCityOptions]);

  const metrics = useMemo(
    () => [
      {
        label: "Revenue",
        value: formatCurrency(summary.revenue),
        sub: `${summary.bookings.toLocaleString()} paid bookings`,
        icon: BadgeIndianRupee,
        tone: "primary",
      },
      {
        label: "Booking statistics",
        value: summary.bookings.toLocaleString(),
        sub: `${summary.averageOrderValue ? formatCurrency(summary.averageOrderValue) : "Rs 0"} AOV`,
        icon: Ticket,
        tone: "emerald",
      },
      {
        label: "Occupancy",
        value: `${summary.occupancy}%`,
        sub: `${summary.seatsSold.toLocaleString()} seats sold`,
        icon: Gauge,
        tone: "amber",
      },
      {
        label: "Approvals",
        value: pendingCount.toLocaleString(),
        sub: `${summary.theaters.toLocaleString()} active cinemas`,
        icon: Building2,
        tone: "cyan",
      },
    ],
    [pendingCount, summary],
  );

  const updateApproval = async (id, status) => {
    const theater = theaterApprovals.find((item) => item.id === id);
    setApprovalBusy(id);
    try {
      const result = await updateTheaterApplicationStatus(id, status);
      setTheaterApprovals((current) =>
        current.map((item) =>
          item.id === id ? { ...item, ...(result.theater ?? {}), status } : item,
        ),
      );
      setNotice(`${theater?.name ?? "Theater"} marked as ${status.toLowerCase()}.`);
    } catch (error) {
      setNotice(error.response?.data?.error ?? `Could not update ${theater?.name ?? "theater"}.`);
    } finally {
      setApprovalBusy("");
    }
  };

  if (!auth.hydrated) {
    return (
      <AccessState
        icon={ShieldCheck}
        title="Checking admin access"
        text="Your secure session is being verified."
      />
    );
  }

  if (!auth.user) {
    return (
      <AccessState
        icon={LogIn}
        title="Admin sign in required"
        text="Only verified admin accounts can open this operations panel."
        action={
          <Button asChild>
            <Link to="/auth">Sign in as admin</Link>
          </Button>
        }
      />
    );
  }

  if (auth.user.role !== "admin") {
    return (
      <AccessState
        icon={LockKeyhole}
        title="Admin panel is restricted"
        text="Your account role does not have admin access."
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-20">
      <section className="cinema-grid overflow-hidden rounded-lg border border-border/60 bg-card/75 shadow-2xl shadow-black/20">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              Admin dashboard
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
              Admin panel
            </h1>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => setActiveTab("theaters")} className="gap-2">
                <Building2 className="h-4 w-4" />
                Review theaters
              </Button>
              <Button variant="secondary" onClick={() => setActiveTab("refunds")} className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Refund queue
              </Button>
            </div>
          </div>

          <SpotlightCard className="rounded-lg p-5">
            <PanelHeader
              icon={ClipboardCheck}
              title="Operations snapshot"
              subtitle={loadState === "loading" ? "Loading live data" : "Live admin summary"}
            />
            <div className="mt-5 grid gap-3">
              <SnapshotRow label="Top movie" value={summary.topMovie} />
              <SnapshotRow
                label="Average order"
                value={formatCurrency(summary.averageOrderValue)}
              />
              <SnapshotRow label="Pending approvals" value={pendingCount.toLocaleString()} />
              <SnapshotRow label="Active cinemas" value={summary.theaters.toLocaleString()} />
            </div>
          </SpotlightCard>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Metric key={metric.label} {...metric} />
        ))}
      </section>

      <div className="mt-6 flex gap-2 overflow-x-auto rounded-lg border border-border/60 bg-card/50 p-1">
        {adminTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <p className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {notice}
        </p>
      )}

      {activeTab === "analytics" && (
        <AnalyticsTab
          hasRevenueData={hasRevenueData}
          revenueTrend={revenueTrend}
          popularMovies={popularMovies}
          theaterPerformance={theaterPerformance}
          summary={summary}
        />
      )}

      {activeTab === "theaters" && (
        <TheaterApprovalsTab
          theaters={theaterApprovals}
          cityOptions={theaterCityOptions}
          cityTheaters={cityTheaters}
          selectedCity={selectedTheaterCity}
          onCityChange={setSelectedTheaterCity}
          onUpdate={updateApproval}
          approvalBusy={approvalBusy}
        />
      )}

      {activeTab === "users" && <UserManagementTab />}

      {activeTab === "refunds" && <RefundsTab recentBookings={recentBookings} />}

      {activeTab === "finance" && <FinanceTab summary={summary} />}

      {activeTab === "payments" && <PaymentsTab />}

      {activeTab === "bookings" && (
        <BookingStatisticsTab recentBookings={recentBookings} revenueTrend={revenueTrend} />
      )}
    </div>
  );
}

function AnalyticsTab({
  hasRevenueData,
  revenueTrend,
  popularMovies,
  theaterPerformance,
  summary,
}) {
  return (
    <section className="mt-6 grid gap-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {adminControlModules.map((item) => (
          <ControlModuleCard key={item.title} {...item} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader
            icon={BadgeIndianRupee}
            title="Revenue analytics"
            subtitle="Confirmed payments across the last 7 days"
            action={`${summary.occupancy}% occupancy`}
          />
          <div className="mt-5 h-80">
            {hasRevenueData ? (
              <TrendAreaChart data={revenueTrend} valueKey="revenue" formatValue={formatCurrency} />
            ) : (
              <EmptyState
                icon={BadgeIndianRupee}
                title="No revenue yet"
                text="Sales appear here."
              />
            )}
          </div>
        </SpotlightCard>

        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader icon={Film} title="Popular movies" subtitle="Revenue by title" />
          <div className="mt-5 h-80">
            <VerticalBars
              data={popularMovies}
              labelKey="movie"
              valueKey="value"
              formatValue={formatCurrency}
            />
          </div>
        </SpotlightCard>

        <SpotlightCard className="rounded-lg p-5 xl:col-span-2">
          <PanelHeader
            icon={Gauge}
            title="Occupancy rates"
            subtitle="Cinema occupancy based on confirmed seats sold"
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {theaterPerformance.length ? (
              theaterPerformance.map((theater) => (
                <TheaterRow key={theater.theater} theater={theater} />
              ))
            ) : (
              <EmptyState
                icon={Gauge}
                title="No occupancy data"
                text="Cinema occupancy appears after confirmed bookings."
              />
            )}
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}

function ControlModuleCard({ icon: Icon, title, value }) {
  return (
    <SpotlightCard className="rounded-lg p-4 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-md bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
          {value}
        </span>
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
    </SpotlightCard>
  );
}

function TheaterApprovalsTab({
  theaters,
  cityOptions,
  cityTheaters,
  selectedCity,
  onCityChange,
  onUpdate,
  approvalBusy,
}) {
  return (
    <section className="mt-6 grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        {theaterManagementTools.map((item) => {
          const Icon = item.icon;
          return (
            <SpotlightCard key={item.title} className="rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-md bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  {item.value}
                </span>
              </div>
              <h3 className="mt-4 font-semibold">{item.title}</h3>
            </SpotlightCard>
          );
        })}
      </div>

      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={Building2}
          title="Theater management"
          subtitle="City-wise cinema list for admin review"
          action={`${cityTheaters.length} theaters`}
        />
        <div className="mt-5 grid gap-4 xl:grid-cols-[0.35fr_0.65fr]">
          <div className="rounded-lg border border-border/60 bg-background/40 p-4">
            <label>
              <span className="text-xs font-medium uppercase text-muted-foreground">City</span>
              <select
                value={selectedCity}
                onChange={(event) => onCityChange(event.target.value)}
                className={`${adminSelectClass} mt-2`}
              >
                {cityOptions.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </label>
            <div className="mt-4 grid gap-2">
              <SnapshotRow label="Selected city" value={selectedCity || "No city selected"} />
              <SnapshotRow label="Cinemas" value={cityTheaters.length.toLocaleString()} />
              <SnapshotRow
                label="Screens"
                value={cityTheaters
                  .reduce((sum, theater) => sum + Number(theater.screens || 0), 0)
                  .toLocaleString()}
              />
            </div>
          </div>

          {cityTheaters.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {cityTheaters.map((theater) => (
                <div
                  key={theater.id}
                  className="rounded-lg border border-border/60 bg-background/35 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{theater.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {theater.area || "Area not set"}
                      </p>
                    </div>
                    <StatusPill status={theater.status} />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm">
                    <SnapshotRow label="Address" value={theater.address || "Address not set"} />
                    <SnapshotRow
                      label="Screens"
                      value={Number(theater.screens || 0).toLocaleString()}
                    />
                    <SnapshotRow
                      label="Shows"
                      value={Number(theater.showCount || 0).toLocaleString()}
                    />
                    <SnapshotRow label="Amenities" value={theater.amenities || "Not listed"} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="No theaters in this city"
              text="Select another city to view cinema partners."
            />
          )}
        </div>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={Building2}
          title="Theater approvals"
          subtitle="Review owner requests before cinemas go live"
        />
        {theaters.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {theaters.map((theater) => (
              <div
                key={theater.id}
                className="rounded-lg border border-border/60 bg-background/35 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{theater.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{theater.owner}</p>
                  </div>
                  <StatusPill status={theater.status} />
                </div>
                <div className="mt-4 grid gap-2 text-sm">
                  <SnapshotRow label="City" value={theater.city || "City not set"} />
                  <SnapshotRow label="Area" value={theater.area || "Area not set"} />
                  <SnapshotRow
                    label="Screens"
                    value={Number(theater.screens || 0).toLocaleString()}
                  />
                  <SnapshotRow label="Documents" value={theater.documents} />
                  {theater.contact && <SnapshotRow label="Contact" value={theater.contact} />}
                  {theater.ownerEmail && <SnapshotRow label="Email" value={theater.ownerEmail} />}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    onClick={() => onUpdate(theater.id, "Approved")}
                    disabled={approvalBusy === theater.id}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {approvalBusy === theater.id ? "Saving" : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onUpdate(theater.id, "Rejected")}
                    disabled={approvalBusy === theater.id}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            title="No owner applications"
            text="New theater owner forms appear here for admin approval."
          />
        )}
      </SpotlightCard>
    </section>
  );
}

function UserManagementTab() {
  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={UserCog}
          title="User management"
          subtitle="Block, unblock and complaint workflows"
        />
        <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Issue</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {userOpsRows.map((user) => (
                  <tr key={user.name} className="bg-card/20">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3">
                      <UserStatusPill status={user.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.issue}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary">
                        {user.action}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SpotlightCard>

      <div className="grid gap-4">
        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader icon={UserCog} title="User controls" subtitle="Admin account actions" />
          <div className="mt-5 grid gap-3">
            <SnapshotRow label="Block / unblock" value="Enabled" />
            <SnapshotRow label="Watchlist checks" value="3 users" />
            <SnapshotRow label="Support assignment" value="Live" />
          </div>
        </SpotlightCard>
        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader
            icon={ClipboardCheck}
            title="Complaints"
            subtitle="Support triage by severity"
          />
          <div className="mt-5 grid gap-3">
            <SnapshotRow label="Payment complaints" value="5 open" />
            <SnapshotRow label="Cinema complaints" value="3 open" />
            <SnapshotRow label="F&B complaints" value="2 open" />
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}

function RefundsTab({ recentBookings }) {
  const cancelledFromBookings = (recentBookings ?? [])
    .filter((booking) =>
      String(booking.status ?? booking.ticketStatus ?? "")
        .toLowerCase()
        .includes("cancel"),
    )
    .map((booking) => ({
      ref: booking.ref,
      user: booking.customer || booking.user || "Customer",
      email: booking.email || "Not available",
      movie: booking.movie,
      theater: booking.theater,
      seats: Array.isArray(booking.seats) ? booking.seats : [],
      amount: Number(booking.total || booking.amount || 0),
      reason: booking.reason || "Ticket cancelled by user",
      status: booking.refundStatus || "Pending refund",
      cancelledAt: booking.cancelledAt || "Recent cancellation",
    }));
  const refundRows = cancelledFromBookings.length ? cancelledFromBookings : cancelledTicketRows;
  const pendingAmount = refundRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const manualReviewCount = refundRows.filter((row) =>
    String(row.status).toLowerCase().includes("manual"),
  ).length;

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={RefreshCcw}
          title="Refund dashboard"
          subtitle="Cancelled tickets land here for admin refund review"
          action={`${refundRows.length} cases`}
        />
        <div className="mt-5 grid gap-3">
          <SnapshotRow label="Pending amount" value={formatCurrency(pendingAmount)} />
          <SnapshotRow label="Manual review" value={manualReviewCount.toLocaleString()} />
          <SnapshotRow label="Gateway SLA" value="T+1 settlement" />
          <SnapshotRow label="Customer alerts" value="Email + SMS" />
        </div>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={Ticket}
          title="Cancelled ticket queue"
          subtitle="Approve, retry or audit refund cases"
        />
        <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Ticket</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {refundRows.map((row) => (
                  <tr key={row.ref} className="bg-card/20">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{row.ref}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.user}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <p className="font-medium text-foreground">{row.movie}</p>
                      <p className="mt-1">
                        {row.theater} - {formatSeatList(row.seats)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <p>{row.reason}</p>
                      <p className="mt-1 text-xs">{row.cancelledAt}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(row.amount)}</td>
                    <td className="px-4 py-3">
                      <StatusPill
                        status={row.status.includes("Gateway") ? "Approved" : "Pending"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" className="gap-2">
                        <RefreshCcw className="h-4 w-4" />
                        Process
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SpotlightCard>
    </section>
  );
}

function FinanceTab({ summary }) {
  const commission = summary.revenue * 0.1;
  const payout = Math.max(0, summary.revenue - commission);

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={CircleDollarSign}
          title="Revenue & commission"
          subtitle="Platform earnings and theatre payouts"
        />
        <div className="mt-5 grid gap-3">
          <SnapshotRow label="Gross booking revenue" value={formatCurrency(summary.revenue)} />
          <SnapshotRow label="Platform commission" value={formatCurrency(commission)} />
          <SnapshotRow label="Theatre payout" value={formatCurrency(payout)} />
          <SnapshotRow label="Average order" value={formatCurrency(summary.averageOrderValue)} />
        </div>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={ReceiptText}
          title="Finance controls"
          subtitle="GST, tax and payout ops"
        />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {financeRows.map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-border/60 bg-background/40 p-4"
            >
              <p className="text-xs uppercase text-muted-foreground">{row.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{row.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{row.text}</p>
            </div>
          ))}
        </div>
      </SpotlightCard>
    </section>
  );
}

function PaymentsTab() {
  return (
    <section className="mt-6 grid gap-4 md:grid-cols-2">
      {paymentRows.map((row) => (
        <SpotlightCard key={row.label} className="rounded-lg p-5">
          <PanelHeader
            icon={row.label === "Refund tracking" ? RefreshCcw : CreditCard}
            title={row.label}
            subtitle={row.text}
            action={row.value}
          />
          <div className="mt-5 grid gap-3">
            <SnapshotRow label="Owner visibility" value="Enabled" />
            <SnapshotRow label="Admin audit trail" value="Synced" />
            <SnapshotRow label="Customer alerts" value="Push + email" />
          </div>
        </SpotlightCard>
      ))}
    </section>
  );
}

function BookingStatisticsTab({ recentBookings, revenueTrend }) {
  const totals = revenueTrend.reduce(
    (acc, row) => ({
      revenue: acc.revenue + Number(row.revenue || 0),
      bookings: acc.bookings + Number(row.bookings || 0),
      seats: acc.seats + Number(row.seats || 0),
    }),
    { revenue: 0, bookings: 0, seats: 0 },
  );

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader icon={ClipboardCheck} title="Booking statistics" subtitle="7-day totals" />
        <div className="mt-5 grid gap-3">
          <SnapshotRow label="Revenue" value={formatCurrency(totals.revenue)} />
          <SnapshotRow label="Bookings" value={totals.bookings.toLocaleString()} />
          <SnapshotRow label="Seats" value={totals.seats.toLocaleString()} />
        </div>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader icon={Ticket} title="Recent bookings" subtitle="Latest confirmed tickets" />
        <BookingsTable bookings={recentBookings} />
      </SpotlightCard>
    </section>
  );
}

function BookingsTable({ bookings }) {
  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Movie</th>
              <th className="px-4 py-3 font-medium">Theater</th>
              <th className="px-4 py-3 font-medium">Seats</th>
              <th className="px-4 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {bookings.map((booking) => (
              <tr key={booking.ref} className="bg-card/20">
                <td className="px-4 py-3 font-mono text-xs text-primary">{booking.ref}</td>
                <td className="px-4 py-3 font-medium">{booking.movie}</td>
                <td className="px-4 py-3 text-muted-foreground">{booking.theater}</td>
                <td className="px-4 py-3">{booking.seats.join(", ")}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrency(booking.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccessState({ icon: Icon, title, text, action }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-190px)] max-w-3xl place-items-center px-4 py-12">
      <SpotlightCard className="w-full rounded-lg p-6 text-center shadow-2xl shadow-black/20">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{text}</p>
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </SpotlightCard>
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub, tone }) {
  const toneClass = {
    primary: "bg-primary/15 text-primary",
    emerald: "bg-emerald-500/15 text-emerald-300",
    amber: "bg-amber-500/15 text-amber-300",
    cyan: "bg-cyan-500/15 text-cyan-300",
  }[tone];

  return (
    <SpotlightCard className="rounded-lg p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </SpotlightCard>
  );
}

function PanelHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {action && (
        <span className="shrink-0 rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
          {action}
        </span>
      )}
    </div>
  );
}

function SnapshotRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-right text-sm font-semibold">{value}</p>
    </div>
  );
}

function TheaterRow({ theater }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{theater.theater}</p>
          <p className="text-xs text-muted-foreground">
            {theater.bookings} bookings - {formatCurrency(theater.revenue)}
          </p>
        </div>
        <span className="text-sm font-semibold text-primary">{theater.occupancy}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
          style={{ width: `${Math.max(3, theater.occupancy)}%` }}
        />
      </div>
    </div>
  );
}

function UserStatusPill({ status }) {
  const tone =
    status === "Active"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
      : status === "Blocked"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-amber-500/30 bg-amber-500/10 text-amber-500";

  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${tone}`}>{status}</span>
  );
}

function StatusPill({ status }) {
  const tone =
    status === "Approved"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
      : status === "Rejected"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-amber-500/30 bg-amber-500/10 text-amber-500";
  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${tone}`}>{status}</span>
  );
}

function buildManagedTheaters(catalog, applications) {
  const approvalRows = (applications ?? []).map((theater, index) => ({
    id: theater.id || `application-${index}`,
    name: theater.name || theater.theaterName || "Unnamed theater",
    owner: theater.owner || theater.ownerName || "Owner details pending",
    city: theater.city || "Pending city",
    area: theater.area || "Area not set",
    address: theater.address || "Address not set",
    screens: Number(theater.screens || 1),
    showCount: Number(theater.showCount || 0),
    amenities: theater.amenities || theater.documents || "Partner onboarding",
    status: theater.status || "Pending",
  }));
  const approvalKeys = new Set(approvalRows.map((theater) => normalizeAdminKey(theater.name)));
  const catalogRows = (catalog ?? [])
    .filter((theater) => !approvalKeys.has(normalizeAdminKey(theater.name)))
    .map((theater) => ({
      id: theater.id,
      name: theater.name,
      owner: "Catalog cinema",
      city: theater.city || "City not set",
      area: theater.area || "Area not set",
      address: theater.address || "Address not set",
      screens: Math.max(1, new Set((theater.showPlan ?? []).map((show) => show.screen)).size || 1),
      showCount: theater.showPlan?.length ?? 0,
      amenities: Array.isArray(theater.amenities)
        ? theater.amenities.join(", ")
        : theater.amenities || "Amenities not listed",
      status: "Approved",
    }));

  return [...catalogRows, ...approvalRows];
}

function buildTheaterCityOptions(theaters) {
  return [...new Set(theaters.map((theater) => theater.city).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function normalizeAdminKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function formatSeatList(seats) {
  return Array.isArray(seats) && seats.length ? seats.join(", ") : "Seats not assigned";
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="grid h-full min-h-48 place-items-center rounded-lg border border-dashed border-border/70 p-6 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-semibold">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

export { Route };
