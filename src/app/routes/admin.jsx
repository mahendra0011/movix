import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BadgeIndianRupee,
  Ban,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Film,
  Gauge,
  LockKeyhole,
  LogIn,
  Mail,
  MapPin,
  Monitor,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldCheck,
  Ticket,
  Trash2,
  User,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import {
  deleteAdminUser,
  deleteAdminTheater,
  deleteTheaterApplication,
  fetchAdminTheaters,
  fetchAdminSummary,
  fetchAdminUsers,
  fetchTheaterApplications,
  updateAdminUser,
  updateTheaterApplicationStatus,
} from "@/features/admin/api/adminApi";
import { hydrateAuth, logout, readStoredAuth } from "@/features/auth/authSlice";
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

const adminTabs = [
  { id: "analytics", label: "Control room", icon: BarChart3 },
  { id: "theaters", label: "Theaters", icon: Building2 },
  { id: "users", label: "Users", icon: UserCog },
  { id: "refunds", label: "Refunds", icon: RefreshCcw },
  { id: "finance", label: "Revenue", icon: ReceiptText },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "bookings", label: "Bookings", icon: Ticket },
];

const paymentRows = [
  { label: "Demo payment", value: "Active", text: "Demo checkout for testing bookings" },
  { label: "Failed payments", value: "7", text: "Retry queue with user notification hooks" },
  { label: "Refund tracking", value: "T+1", text: "Refund status and support visibility" },
];

const adminSelectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring";

function AdminDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const [data, setData] = useState(fallback);
  const [loadState, setLoadState] = useState("idle");
  const [activeTab, setActiveTab] = useState("analytics");
  const [adminUsers, setAdminUsers] = useState([]);
  const [userQuery, setUserQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("All");
  const [userStatusFilter, setUserStatusFilter] = useState("All");
  const [theaterApprovals, setTheaterApprovals] = useState([]);
  const [managedTheaters, setManagedTheaters] = useState([]);
  const [selectedTheaterCity, setSelectedTheaterCity] = useState("Jabalpur");
  const [approvalBusy, setApprovalBusy] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!auth.hydrated) dispatch(hydrateAuth(readStoredAuth()));
  }, [auth.hydrated, dispatch]);

  useEffect(() => {
    if (!auth.hydrated || !auth.user || auth.user.role === "admin") return;
    navigate(auth.user.role === "theater-owner" ? "/owner" : "/dashboard", { replace: true });
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
        setTheaterApprovals(
          (result.theaters ?? []).filter((theater) => theater.status !== "Rejected"),
        );
      })
      .catch(() => {
        if (active) setTheaterApprovals([]);
      });

    return () => {
      active = false;
    };
  }, [auth.hydrated, auth.user?.role]);

  useEffect(() => {
    if (!auth.hydrated || auth.user?.role !== "admin") return undefined;
    let active = true;

    fetchAdminTheaters()
      .then((result) => {
        if (!active) return;
        setManagedTheaters((result.theaters ?? []).map(formatManagedTheater));
      })
      .catch(() => {
        if (active) setManagedTheaters([]);
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
  const approvalQueue = useMemo(
    () => theaterApprovals.filter((theater) => theater.status === "Pending"),
    [theaterApprovals],
  );
  const pendingCount = approvalQueue.length;
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
    if (!auth.hydrated || auth.user?.role !== "admin") return undefined;
    let active = true;

    fetchAdminUsers()
      .then((result) => {
        if (active) setAdminUsers((result.users ?? []).map(normalizeAdminUser));
      })
      .catch(() => {
        if (active) setAdminUsers([]);
      });

    return () => {
      active = false;
    };
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

  const refreshManagedTheaters = async () => {
    const result = await fetchAdminTheaters();
    setManagedTheaters((result.theaters ?? []).map(formatManagedTheater));
  };

  const updateApproval = async (id, status) => {
    const theater = theaterApprovals.find((item) => item.id === id);
    setApprovalBusy(id);
    try {
      const result = await updateTheaterApplicationStatus(id, status);
      setTheaterApprovals((current) => {
        if (status !== "Pending") return current.filter((item) => item.id !== id);
        return current.map((item) =>
          item.id === id ? { ...item, ...(result.theater ?? {}), status } : item,
        );
      });
      if (status === "Approved") await refreshManagedTheaters();
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
      const isApplication = theaterApprovals.some((item) => item.id === theater.id);
      if (isApplication) {
        await deleteTheaterApplication(theater.id);
        setTheaterApprovals((current) => current.filter((item) => item.id !== theater.id));
      } else {
        await deleteAdminTheater(theater.id);
        setManagedTheaters((current) => current.filter((item) => item.id !== theater.id));
      }
      setNotice(`${theater.name ?? "Theater"} deleted.`);
    } catch (error) {
      setNotice(error.response?.data?.error ?? `Could not delete ${theater.name ?? "theater"}.`);
    } finally {
      setApprovalBusy("");
    }
  };

  const toggleUserBlock = async (user) => {
    if (!user || user.role === "admin") return;
    try {
      const blocked = !isUserBlocked(user);
      const result = await updateAdminUser(user.id, { blocked });
      setAdminUsers((current) =>
        current.map((item) =>
          item.id === user.id ? normalizeAdminUser(result.user ?? { ...item, blocked }) : item,
        ),
      );
      setNotice(`${user.name || user.email} ${blocked ? "blocked" : "unblocked"}.`);
    } catch (error) {
      setNotice(error.response?.data?.error ?? `Could not update ${user.email}.`);
    }
  };

  const deleteUser = async (user) => {
    if (!user || user.role === "admin") return;
    try {
      await deleteAdminUser(user.id);
      setAdminUsers((current) => current.filter((item) => item.id !== user.id));
      setNotice(`${user.name || user.email} deleted.`);
    } catch (error) {
      setNotice(error.response?.data?.error ?? `Could not delete ${user.email}.`);
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
    <div className="mx-auto max-w-[1560px] px-4 py-8 pb-20 sm:px-5 lg:px-6">
      <section className="cinema-grid overflow-hidden rounded-lg border border-border/60 bg-card/75 shadow-2xl shadow-black/20">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              Admin
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
              Dashboard
            </h1>
          </div>
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
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader
            icon={BadgeIndianRupee}
            title="Revenue analytics"
            subtitle="Confirmed payments across the last 7 days"
            action={`${summary.occupancy}% occupancy`}
          />
          <div className="mt-5 h-60 sm:h-80">
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
          <div className="mt-5 h-60 sm:h-80">
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
  const totalScreens = cityTheaters.reduce((sum, t) => sum + Number(t.screens || 0), 0);
  return (
    <section className="mt-6 grid gap-6">
      {/* ── City Overview Card ── */}
      <SpotlightCard className="relative overflow-hidden rounded-xl p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-cyan-500/5 blur-3xl" />
        <PanelHeader
          icon={Building2}
          title="Theater management"
          subtitle="City-wise cinema list for admin review"
          action={`${cityTheaters.length} theaters`}
        />
        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[0.3fr_0.7fr]">
          {/* City selector + stats */}
          <div className="relative rounded-xl border border-border/50 bg-gradient-to-br from-background/60 to-background/30 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              City overview
            </div>
            <select
              value={selectedCity}
              onChange={(event) => onCityChange(event.target.value)}
              className="h-11 w-full rounded-lg border border-border/60 bg-background/60 px-3 text-sm shadow-sm outline-none backdrop-blur-sm transition-all focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              {cityOptions.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>
            <div className="mt-5 grid gap-2.5">
              <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 px-4 py-3">
                <span className="text-sm text-muted-foreground">Cinemas</span>
                <span className="text-lg font-bold tracking-tight text-primary">
                  {cityTheaters.length}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 px-4 py-3">
                <span className="text-sm text-muted-foreground">Screens</span>
                <span className="text-lg font-bold tracking-tight text-cyan-400">
                  {totalScreens}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 px-4 py-3">
                <span className="text-sm text-muted-foreground">Avg screens</span>
                <span className="text-lg font-bold tracking-tight text-amber-400">
                  {cityTheaters.length ? (totalScreens / cityTheaters.length).toFixed(1) : 0}
                </span>
              </div>
            </div>
          </div>

          {/* Theater cards */}
          {cityTheaters.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {cityTheaters.map((theater, idx) => (
                <div
                  key={theater.id}
                  className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background/50 to-background/20 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {/* Gradient accent line */}
                  <div className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-primary via-cyan-400 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Monitor className="h-4 w-4" />
                        </div>
                        <h3 className="truncate font-semibold">{theater.name}</h3>
                      </div>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {theater.area || "Area not set"}
                      </p>
                    </div>
                    <StatusPill status={theater.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border/30 bg-background/30 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Screens</p>
                      <p className="mt-0.5 text-sm font-semibold">{Number(theater.screens || 0)}</p>
                    </div>
                    <div className="rounded-lg border border-border/30 bg-background/30 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Listings</p>
                      <p className="mt-0.5 text-sm font-semibold">{Number(theater.showCount || 0)}</p>
                    </div>
                  </div>

                  <div className="mt-2 rounded-lg border border-border/30 bg-background/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Address</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {theater.address || "Address not set"}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="truncate rounded-md bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground">
                      {theater.amenities || "No amenities"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(theater)}
                      disabled={approvalBusy === theater.id}
                      className="h-8 gap-1.5 px-2.5 text-xs text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
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

      {/* ── Approval Queue ── */}
      <SpotlightCard className="relative overflow-hidden rounded-xl p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-28 w-28 rounded-full bg-emerald-500/5 blur-3xl" />
        <PanelHeader
          icon={CheckCircle2}
          title="Theater approvals"
          subtitle="Review owner requests before cinemas go live"
          action={theaters.length ? `${theaters.length} pending` : undefined}
        />
        {theaters.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {theaters.map((theater, idx) => (
              <div
                key={theater.id}
                className="group relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.04] to-background/30 p-5 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Pending indicator dot */}
                <span className="absolute right-3 top-3 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                </span>

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <h3 className="truncate font-semibold">{theater.name}</h3>
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3 shrink-0" />
                      {theater.owner}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/30 bg-background/30 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">City</p>
                    <p className="mt-0.5 text-sm font-semibold">{theater.city || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-border/30 bg-background/30 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Area</p>
                    <p className="mt-0.5 text-sm font-semibold">{theater.area || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-border/30 bg-background/30 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Screens</p>
                    <p className="mt-0.5 text-sm font-semibold">{Number(theater.screens || 0)}</p>
                  </div>
                  <div className="rounded-lg border border-border/30 bg-background/30 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Docs</p>
                    <p className="mt-0.5 text-sm font-semibold">{theater.documents || "—"}</p>
                  </div>
                </div>

                {theater.contact && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-border/30 bg-background/20 px-3 py-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" />
                    {theater.contact}{theater.ownerEmail ? ` · ${theater.ownerEmail}` : ""}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    onClick={() => onUpdate(theater.id, "Approved")}
                    disabled={approvalBusy === theater.id}
                    className="gap-1.5 bg-emerald-500/90 text-xs hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {approvalBusy === theater.id ? "..." : "Accept"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onUpdate(theater.id, "Rejected")}
                    disabled={approvalBusy === theater.id}
                    className="gap-1.5 border-destructive/30 bg-destructive/10 text-xs text-destructive hover:bg-destructive/20"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(theater)}
                    disabled={approvalBusy === theater.id}
                    className="gap-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Del
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CheckCircle2}
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
  const activeCount = users.filter((u) => getUserStatus(u) === "Active").length;
  const blockedCount = users.filter((u) => getUserStatus(u) === "Blocked").length;
  const pendingCount = users.filter((u) => getUserStatus(u) === "Pending").length;

  return (
    <section className="mt-6 grid gap-6">
      {/* ── Stats banner ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] to-background/30 p-4 backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-emerald-500/10 blur-2xl" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Active</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-400">{activeCount}</p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] to-background/30 p-4 backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-500/10 blur-2xl" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Pending</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-amber-400">{pendingCount}</p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-destructive/20 bg-gradient-to-br from-destructive/[0.06] to-background/30 p-4 backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-destructive/10 blur-2xl" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-destructive">Blocked</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-destructive">{blockedCount}</p>
        </div>
      </div>

      <SpotlightCard className="relative overflow-hidden rounded-xl p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
        <PanelHeader
          icon={Users}
          title="User management"
          subtitle={`${users.length} of ${totalUsers} users`}
        />
        {/* ── Filters ── */}
        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search name or email..."
              className="h-11 w-full rounded-lg border border-border/60 bg-background/50 pl-9 pr-3 text-sm shadow-sm outline-none backdrop-blur-sm transition-all focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => onRoleFilterChange(event.target.value)}
            className="h-11 rounded-lg border border-border/60 bg-background/50 px-3 text-sm shadow-sm outline-none backdrop-blur-sm transition-all focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <option>All roles</option>
            <option>User</option>
            <option>Theater owner</option>
            <option>Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            className="h-11 rounded-lg border border-border/60 bg-background/50 px-3 text-sm shadow-sm outline-none backdrop-blur-sm transition-all focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <option>All status</option>
            <option>Active</option>
            <option>Blocked</option>
            <option>Pending</option>
          </select>
        </div>

        {/* ── User cards ── */}
        <div className="mt-5 grid gap-3">
          {users.map((user, idx) => {
            const blocked = isUserBlocked(user);
            const isAdmin = user.role === "admin";
            const initials = (user.name || "U")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const userStatus = getUserStatus(user);
            return (
              <div
                key={user.email || user.id}
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background/50 to-background/20 p-4 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex flex-wrap items-center gap-4">
                  {/* Avatar */}
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${
                      isAdmin
                        ? "bg-primary/15 text-primary"
                        : blocked
                          ? "bg-destructive/15 text-destructive"
                          : userStatus === "Pending"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-emerald-500/15 text-emerald-400"
                    }`}
                  >
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{user.name || "Unnamed user"}</p>
                      {isAdmin && (
                        <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      {user.email}
                    </p>
                  </div>

                  {/* Role + Status */}
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {formatUserRole(user.role)}
                    </span>
                    <UserStatusPill status={userStatus} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onToggleBlock(user)}
                      disabled={isAdmin}
                      className={`h-8 gap-1.5 px-3 text-xs ${
                        blocked
                          ? "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                          : "text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                      }`}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {blocked ? "Unblock" : "Block"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(user)}
                      disabled={isAdmin}
                      className="h-8 gap-1.5 px-3 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {!users.length && (
            <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-border/60">
              <div className="text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No users found.</p>
              </div>
            </div>
          )}
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
  const refundRows = cancelledFromBookings;
  const totalRefundAmount = refundRows.reduce((sum, r) => sum + r.amount, 0);
  const pendingCount = refundRows.filter((r) => !r.status.includes("initiated")).length;
  const approvedCount = refundRows.length - pendingCount;

  return (
    <section className="mt-6 grid gap-6">
      {/* ── Refund summary banner ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/[0.06] to-background/30 p-4 backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-rose-500/10 blur-2xl" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">Total refunds</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-rose-400">{refundRows.length}</p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] to-background/30 p-4 backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-500/10 blur-2xl" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Pending</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-amber-400">{pendingCount}</p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] to-background/30 p-4 backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-emerald-500/10 blur-2xl" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Total amount</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-400">{formatCurrency(totalRefundAmount)}</p>
        </div>
      </div>

      {/* ── Refund queue ── */}
      <SpotlightCard className="relative overflow-hidden rounded-xl p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-rose-500/5 blur-3xl" />
        <PanelHeader
          icon={RefreshCcw}
          title="Cancelled ticket queue"
          subtitle="Approve, retry or audit refund cases"
          action={`${refundRows.length} cases`}
        />
        {refundRows.length ? (
          <div className="mt-5 grid gap-3">
            {refundRows.map((row, idx) => {
              const isApproved = row.status.includes("initiated");
              return (
                <div
                  key={row.ref}
                  className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background/50 to-background/20 p-4 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Left accent bar */}
                  <div
                    className={`absolute left-0 top-0 h-full w-0.5 transition-opacity ${
                      isApproved
                        ? "bg-emerald-500"
                        : "bg-gradient-to-b from-amber-400 to-rose-400"
                    } opacity-60`}
                  />

                  <div className="flex flex-wrap items-start gap-4 pl-2">
                    {/* Ref icon */}
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                      {row.ref?.slice(-4) || "N/A"}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="truncate font-semibold">{row.user}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          <Mail className="mr-1 inline h-3 w-3" />
                          {row.email}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="font-medium text-foreground">{row.movie}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.theater} · {formatSeatList(row.seats)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                            {row.ref}
                          </span>
                          {row.cancelledAt}
                        </span>
                      </div>
                    </div>

                    {/* Reason badge */}
                    <div className="hidden max-w-[180px] truncate rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground sm:block">
                      <p className="font-medium">Reason</p>
                      <p className="mt-0.5 truncate">{row.reason}</p>
                    </div>

                    {/* Amount + status */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className={`text-base font-bold ${isApproved ? "text-emerald-400" : "text-rose-400"}`}>
                        {formatCurrency(row.amount)}
                      </span>
                      <StatusPill
                        status={isApproved ? "Approved" : "Pending"}
                      />
                    </div>

                    {/* Action */}
                    <div className="flex items-center">
                      <Button
                        size="sm"
                        variant={isApproved ? "ghost" : "secondary"}
                        className={`h-9 gap-2 px-4 text-xs ${
                          isApproved
                            ? "text-muted-foreground"
                            : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                        }`}
                      >
                        <RefreshCcw className={`h-3.5 w-3.5 ${isApproved ? "" : "animate-spin-slow"}`} />
                        {isApproved ? "Audit" : "Process"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border/60">
            <div className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold">All caught up!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No cancelled tickets are waiting for refund review.
              </p>
            </div>
          </div>
        )}
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader
            icon={CircleDollarSign}
            title="Revenue trend"
            subtitle={`${range}-day booking revenue`}
            action={formatCurrency(summary.averageOrderValue)}
          />
          <div className="mt-5 h-60 sm:h-80">
            <TrendAreaChart data={chartData} valueKey="revenue" formatValue={formatCurrency} />
          </div>
        </SpotlightCard>

        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader icon={ReceiptText} title="Revenue split" subtitle="Current settlement" />
          <div className="mt-5 h-60 sm:h-80">
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

function formatManagedTheater(theater, index) {
  const screens = Array.isArray(theater.screens) ? theater.screens : [];
  const showPlan = Array.isArray(theater.showPlan) ? theater.showPlan : [];
  return {
    id: theater.id || `theater-${index}`,
    name: theater.name || "Unnamed theater",
    owner: theater.owner || theater.ownerName || "Cinema partner",
    city: theater.city || "City not set",
    area: theater.area || "Area not set",
    address: theater.address || "Address not set",
    screens: Math.max(1, screens.length || Number(theater.screens || 1)),
    showCount: showPlan.length || Number(theater.showCount || 0),
    amenities: Array.isArray(theater.amenities)
      ? theater.amenities.join(", ")
      : theater.amenities || "Amenities not listed",
    status: theater.status || (theater.approved === false ? "Pending" : "Approved"),
  };
}

function buildTheaterCityOptions(theaters) {
  return [...new Set(theaters.map((theater) => theater.city).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
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
    id: user.id || user.email,
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

export { AdminDashboard };
