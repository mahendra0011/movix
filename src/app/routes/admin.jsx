import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BadgeIndianRupee,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  Film,
  Gauge,
  LockKeyhole,
  LogIn,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Ticket,
  Trash2,
  UserCog,
  XCircle,
} from "lucide-react";
import {
  deleteTheaterApplication,
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
    status: "Refund initiated",
    cancelledAt: "Yesterday, 8:42 PM",
  },
];

const paymentRows = [
  { label: "Razorpay", value: "Live", text: "UPI, cards, netbanking and wallet checkout" },
  { label: "Stripe", value: "Ready", text: "International card payments and reconciliation" },
  { label: "Failed payments", value: "7", text: "Retry queue with user notification hooks" },
  { label: "Refund tracking", value: "T+1", text: "Refund status and support visibility" },
];

const adminSelectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring";
const LOCAL_USERS_KEY = "bms-local-auth-users";
const DELETED_THEATERS_KEY = "bms-admin-deleted-theaters";
const DEMO_THEATER_STATUSES_KEY = "bms-admin-demo-theater-statuses";
const STATIC_ADMIN_USER = {
  id: "local-admin",
  name: "Mahendra Admin",
  email: "mahendrapra0077@gmail.com",
  role: "admin",
  verified: true,
  status: "Active",
};

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
  const [adminUsers, setAdminUsers] = useState(readAdminUsers);
  const [userQuery, setUserQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("All");
  const [userStatusFilter, setUserStatusFilter] = useState("All");
  const [theaterApprovals, setTheaterApprovals] = useState(pendingTheatersSeed);
  const [deletedTheaterIds, setDeletedTheaterIds] = useState(readDeletedTheaterIds);
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
        const applications = (result.theaters ?? []).filter(
          (theater) => theater.status !== "Rejected",
        );
        setTheaterApprovals(
          applications.length ? applications : buildFallbackTheaterApprovals(deletedTheaterIds),
        );
      })
      .catch(() => {
        if (active) setTheaterApprovals(buildFallbackTheaterApprovals(deletedTheaterIds));
      });

    return () => {
      active = false;
    };
  }, [auth.hydrated, auth.user?.role, deletedTheaterIds]);

  const summary = data.summary ?? fallback.summary;
  const charts = data.charts ?? fallback.charts;
  const recentBookings = data.recentBookings ?? [];
  const revenueTrend = charts.revenueTrend?.length ? charts.revenueTrend : emptyTrend;
  const popularMovies = charts.popularMovies ?? [];
  const theaterPerformance = charts.theaterPerformance ?? [];
  const hasRevenueData = revenueTrend.some((row) => row.revenue > 0 || row.bookings > 0);
  const approvalQueue = useMemo(
    () => theaterApprovals.filter((theater) => theater.status === "Pending"),
    [theaterApprovals],
  );
  const pendingCount = approvalQueue.length;
  const managedTheaters = useMemo(
    () =>
      buildManagedTheaters(theaterCatalog, theaterApprovals).filter(
        (theater) => !deletedTheaterIds.includes(theater.id),
      ),
    [deletedTheaterIds, theaterApprovals],
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

  useEffect(() => {
    if (auth.hydrated && auth.user?.role === "admin") setAdminUsers(readAdminUsers());
  }, [auth.hydrated, auth.user?.role]);

  const filteredUsers = useMemo(
    () =>
      filterAdminUsers({
        users: adminUsers,
        query: userQuery,
        role: userRoleFilter,
        status: userStatusFilter,
      }),
    [adminUsers, userQuery, userRoleFilter, userStatusFilter],
  );

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
        label: "Bookings",
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
    const isFallbackTheater = pendingTheatersSeed.some((item) => item.id === id);
    setApprovalBusy(id);
    try {
      const result = await updateTheaterApplicationStatus(id, status);
      if (isFallbackTheater && !result.theater) writeDemoTheaterStatus(id, status);
      setTheaterApprovals((current) => {
        if (status === "Rejected") return current.filter((item) => item.id !== id);
        return current.map((item) =>
          item.id === id ? { ...item, ...(result.theater ?? {}), status } : item,
        );
      });
      setNotice(`${theater?.name ?? "Theater"} marked as ${status.toLowerCase()}.`);
    } catch (error) {
      setNotice(error.response?.data?.error ?? `Could not update ${theater?.name ?? "theater"}.`);
    } finally {
      setApprovalBusy("");
    }
  };

  const deleteTheater = async (theater) => {
    setApprovalBusy(theater.id);
    try {
      if (theaterApprovals.some((item) => item.id === theater.id)) {
        await deleteTheaterApplication(theater.id);
        setTheaterApprovals((current) => current.filter((item) => item.id !== theater.id));
      }
      const nextDeletedIds = [...new Set([...deletedTheaterIds, theater.id])];
      setDeletedTheaterIds(nextDeletedIds);
      writeDeletedTheaterIds(nextDeletedIds);
      removeDemoTheaterStatus(theater.id);
      setNotice(`${theater.name ?? "Theater"} deleted from admin theater list.`);
    } catch (error) {
      setNotice(error.response?.data?.error ?? `Could not delete ${theater.name ?? "theater"}.`);
    } finally {
      setApprovalBusy("");
    }
  };

  const toggleUserBlock = (email) => {
    const nextUsers = adminUsers.map((user) => {
      if (normalizeAdminEmail(user.email) !== normalizeAdminEmail(email) || user.role === "admin") {
        return user;
      }
      const blocked = isUserBlocked(user);
      return { ...user, blocked: !blocked, status: blocked ? "Active" : "Blocked" };
    });
    setAdminUsers(nextUsers);
    writeAdminUsers(nextUsers);
    setNotice("User status updated.");
  };

  const deleteUser = (email) => {
    const user = adminUsers.find(
      (item) => normalizeAdminEmail(item.email) === normalizeAdminEmail(email),
    );
    if (!user || user.role === "admin") return;
    const nextUsers = adminUsers.filter(
      (item) => normalizeAdminEmail(item.email) !== normalizeAdminEmail(email),
    );
    setAdminUsers(nextUsers);
    writeAdminUsers(nextUsers);
    setNotice(`${user.name || user.email} deleted.`);
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
          theaters={approvalQueue}
          cityOptions={theaterCityOptions}
          cityTheaters={cityTheaters}
          selectedCity={selectedTheaterCity}
          onCityChange={setSelectedTheaterCity}
          onUpdate={updateApproval}
          onDelete={deleteTheater}
          approvalBusy={approvalBusy}
        />
      )}

      {activeTab === "users" && (
        <UserManagementTab
          users={filteredUsers}
          totalUsers={adminUsers.length}
          query={userQuery}
          roleFilter={userRoleFilter}
          statusFilter={userStatusFilter}
          onQueryChange={setUserQuery}
          onRoleFilterChange={setUserRoleFilter}
          onStatusFilterChange={setUserStatusFilter}
          onToggleBlock={toggleUserBlock}
          onDelete={deleteUser}
        />
      )}

      {activeTab === "refunds" && <RefundsTab recentBookings={recentBookings} />}

      {activeTab === "finance" && <FinanceTab summary={summary} revenueTrend={revenueTrend} />}

      {activeTab === "payments" && <PaymentsTab />}

      {activeTab === "bookings" && <BookingStatisticsTab recentBookings={recentBookings} />}
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

function TheaterApprovalsTab({
  theaters,
  cityOptions,
  cityTheaters,
  selectedCity,
  onCityChange,
  onUpdate,
  onDelete,
  approvalBusy,
}) {
  return (
    <section className="mt-6 grid gap-4">
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
                      label="Listings"
                      value={Number(theater.showCount || 0).toLocaleString()}
                    />
                    <SnapshotRow label="Amenities" value={theater.amenities || "Not listed"} />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onDelete(theater)}
                    disabled={approvalBusy === theater.id}
                    className="mt-4 gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
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
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
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
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onDelete(theater)}
                    disabled={approvalBusy === theater.id}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
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

function UserManagementTab({
  users,
  totalUsers,
  query,
  roleFilter,
  statusFilter,
  onQueryChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onToggleBlock,
  onDelete,
}) {
  return (
    <section className="mt-6 grid gap-4">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={UserCog}
          title="User management"
          subtitle={`${users.length} of ${totalUsers} users`}
        />
        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label>
            <span className="text-xs font-medium uppercase text-muted-foreground">Search</span>
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Name or email"
              className={`${adminSelectClass} mt-2`}
            />
          </label>
          <label>
            <span className="text-xs font-medium uppercase text-muted-foreground">Role</span>
            <select
              value={roleFilter}
              onChange={(event) => onRoleFilterChange(event.target.value)}
              className={`${adminSelectClass} mt-2`}
            >
              <option>All</option>
              <option>User</option>
              <option>Theater owner</option>
              <option>Admin</option>
            </select>
          </label>
          <label>
            <span className="text-xs font-medium uppercase text-muted-foreground">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
              className={`${adminSelectClass} mt-2`}
            >
              <option>All</option>
              <option>Active</option>
              <option>Blocked</option>
              <option>Pending</option>
            </select>
          </label>
        </div>
        <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((user) => {
                  const blocked = isUserBlocked(user);
                  const isAdmin = user.role === "admin";
                  return (
                    <tr key={user.email || user.id} className="bg-card/20">
                      <td className="px-4 py-3 font-medium">{user.name || "Unnamed user"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">{formatUserRole(user.role)}</td>
                      <td className="px-4 py-3">
                        <UserStatusPill status={getUserStatus(user)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onToggleBlock(user.email)}
                            disabled={isAdmin}
                          >
                            {blocked ? "Unblock" : "Block"}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onDelete(user.email)}
                            disabled={isAdmin}
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!users.length && (
                  <tr className="bg-card/20">
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SpotlightCard>
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

  return (
    <section className="mt-6 grid gap-4">
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
                        status={row.status.includes("initiated") ? "Approved" : "Pending"}
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

function FinanceTab({ summary, revenueTrend }) {
  const [range, setRange] = useState("7");
  const chartData = useMemo(
    () => buildFinanceChartData(revenueTrend, summary, Number(range)),
    [range, revenueTrend, summary],
  );
  const displayRevenue =
    summary.revenue || chartData.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
  const commission = displayRevenue * 0.1;
  const payout = Math.max(0, displayRevenue - commission);
  const breakdown = [
    { label: "Gross revenue", value: displayRevenue },
    { label: "Platform fee", value: commission },
    { label: "Theatre payout", value: payout },
  ];

  return (
    <section className="mt-6 grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Revenue</h2>
        </div>
        <div className="inline-flex rounded-lg border border-border/60 bg-card/60 p-1">
          {["7", "14", "30"].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                range === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {option} days
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FinanceMetric title="Gross revenue" value={formatCurrency(displayRevenue)} />
        <FinanceMetric title="Platform fee" value={formatCurrency(commission)} />
        <FinanceMetric title="Theatre payout" value={formatCurrency(payout)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader
            icon={CircleDollarSign}
            title="Revenue trend"
            subtitle={`${range}-day booking revenue`}
            action={formatCurrency(summary.averageOrderValue)}
          />
          <div className="mt-5 h-80">
            <TrendAreaChart data={chartData} valueKey="revenue" formatValue={formatCurrency} />
          </div>
        </SpotlightCard>

        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader icon={ReceiptText} title="Revenue split" subtitle="Current settlement" />
          <div className="mt-5 h-80">
            <VerticalBars
              data={breakdown}
              labelKey="label"
              valueKey="value"
              formatValue={formatCurrency}
            />
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}

function FinanceMetric({ title, value }) {
  return (
    <SpotlightCard className="rounded-lg p-5">
      <p className="text-xs uppercase text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </SpotlightCard>
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

function BookingStatisticsTab({ recentBookings }) {
  return (
    <section className="mt-6 grid gap-4">
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
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Customer</th>
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
                <td className="px-4 py-3">
                  <p className="font-medium">{booking.customer || booking.user || "Customer"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {booking.email || "Email not available"}
                  </p>
                </td>
                <td className="px-4 py-3 font-medium">{booking.movie}</td>
                <td className="px-4 py-3 text-muted-foreground">{booking.theater}</td>
                <td className="px-4 py-3">{formatSeatList(booking.seats)}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrency(booking.total)}</td>
              </tr>
            ))}
            {!bookings.length && (
              <tr className="bg-card/20">
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No bookings yet.
                </td>
              </tr>
            )}
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
  const approvalRows = (applications ?? [])
    .filter((theater) => theater.status !== "Rejected")
    .map((theater, index) => ({
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

function buildFallbackTheaterApprovals(deletedIds = []) {
  const statuses = readDemoTheaterStatuses();
  return pendingTheatersSeed
    .map((theater) => ({
      ...theater,
      status: statuses[theater.id] || theater.status,
    }))
    .filter((theater) => theater.status !== "Rejected" && !deletedIds.includes(theater.id));
}

function buildTheaterCityOptions(theaters) {
  return [...new Set(theaters.map((theater) => theater.city).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function readAdminUsers() {
  const users = readAdminJson(LOCAL_USERS_KEY, []);
  const hasAdmin = users.some(
    (user) => normalizeAdminEmail(user.email) === STATIC_ADMIN_USER.email,
  );
  const normalizedUsers = users.map(normalizeAdminUser);
  return hasAdmin ? normalizedUsers : [STATIC_ADMIN_USER, ...normalizedUsers];
}

function writeAdminUsers(users) {
  const writableUsers = users
    .filter((user) => normalizeAdminEmail(user.email) !== STATIC_ADMIN_USER.email)
    .map((user) => ({
      ...user,
      status: getUserStatus(user),
      blocked: isUserBlocked(user),
    }));
  writeAdminJson(LOCAL_USERS_KEY, writableUsers);
}

function filterAdminUsers({ users, query, role, status }) {
  const normalizedQuery = normalizeAdminEmail(query);
  return users.filter((user) => {
    const userStatus = getUserStatus(user);
    const roleLabel = formatUserRole(user.role);
    const matchesQuery =
      !normalizedQuery ||
      normalizeAdminEmail(user.name).includes(normalizedQuery) ||
      normalizeAdminEmail(user.email).includes(normalizedQuery);
    const matchesRole = role === "All" || roleLabel === role;
    const matchesStatus = status === "All" || userStatus === status;
    return matchesQuery && matchesRole && matchesStatus;
  });
}

function normalizeAdminUser(user) {
  return {
    ...user,
    name: user.name || "Unnamed user",
    email: normalizeAdminEmail(user.email),
    role: user.role || "user",
    status: getUserStatus(user),
  };
}

function getUserStatus(user) {
  if (isUserBlocked(user)) return "Blocked";
  if (user.role === "theater-owner" && user.ownerStatus === "Pending") return "Pending";
  return user.status || "Active";
}

function isUserBlocked(user) {
  return Boolean(user.blocked || user.status === "Blocked");
}

function formatUserRole(role) {
  if (role === "admin") return "Admin";
  if (role === "theater-owner") return "Theater owner";
  return "User";
}

function readDeletedTheaterIds() {
  return readAdminJson(DELETED_THEATERS_KEY, []);
}

function writeDeletedTheaterIds(ids) {
  writeAdminJson(DELETED_THEATERS_KEY, ids);
}

function readDemoTheaterStatuses() {
  return readAdminJson(DEMO_THEATER_STATUSES_KEY, {});
}

function writeDemoTheaterStatus(id, status) {
  const statuses = readDemoTheaterStatuses();
  writeAdminJson(DEMO_THEATER_STATUSES_KEY, { ...statuses, [id]: status });
}

function removeDemoTheaterStatus(id) {
  const statuses = readDemoTheaterStatuses();
  delete statuses[id];
  writeAdminJson(DEMO_THEATER_STATUSES_KEY, statuses);
}

function buildFinanceChartData(revenueTrend, summary, days) {
  const trend = revenueTrend?.length ? revenueTrend : [];
  if (trend.some((row) => Number(row.revenue || 0) > 0)) {
    return expandTrend(trend, days);
  }

  const total = Number(summary.revenue || 13900);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    const wave = 0.75 + (index % 5) * 0.08;
    const revenue = Math.round((total / days) * wave);
    return {
      day: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue,
      bookings: Math.max(1, Math.round(revenue / 700)),
      seats: Math.max(2, Math.round(revenue / 350)),
    };
  });
}

function expandTrend(trend, days) {
  if (trend.length >= days) return trend.slice(-days);
  const missing = days - trend.length;
  const firstValue = Number(trend[0]?.revenue || 0);
  const filler = Array.from({ length: missing }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return {
      day: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: Math.round(firstValue * (0.65 + (index % 4) * 0.08)),
      bookings: 0,
      seats: 0,
    };
  });
  return [...filler, ...trend].slice(-days);
}

function readAdminJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeAdminJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeAdminKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeAdminEmail(value) {
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
