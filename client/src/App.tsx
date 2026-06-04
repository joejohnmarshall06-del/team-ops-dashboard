import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, CircleDashed, Search, ShieldAlert } from "lucide-react";
import "./styles.css";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";

type Initiative = {
  id: string;
  title: string;
  owner: string;
  status: "planned" | "in-progress" | "blocked" | "done";
  priority: "low" | "medium" | "high" | "critical";
  dueDate: string;
  progress: number;
};

type Risk = {
  id: string;
  initiativeTitle?: string;
  title: string;
  severity: "low" | "medium" | "high";
  mitigation: string;
  open: boolean;
};

type Metrics = {
  completionRate: number;
  blockedWork: number;
  averageProgress: number;
  openHighRisks: number;
};

const statusLabels = {
  planned: "Planned",
  "in-progress": "In progress",
  blocked: "Blocked",
  done: "Done"
};

function classNames(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(" ");
}

export default function App() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ status, q: query });
      const [initiativeResponse, riskResponse, metricResponse] = await Promise.all([
        fetch(`${apiUrl}/api/initiatives?${params}`),
        fetch(`${apiUrl}/api/risks`),
        fetch(`${apiUrl}/api/metrics`)
      ]);

      setInitiatives(await initiativeResponse.json());
      setRisks(await riskResponse.json());
      setMetrics(await metricResponse.json());
      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, [status, query]);

  const grouped = useMemo(() => {
    return initiatives.reduce<Record<string, Initiative[]>>((groups, initiative) => {
      groups[initiative.status] = [...(groups[initiative.status] || []), initiative];
      return groups;
    }, {});
  }, [initiatives]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="mark"><BarChart3 size={22} /></div>
        <nav>
          <button className="active" title="Dashboard"><BarChart3 size={18} /></button>
          <button title="Risks"><ShieldAlert size={18} /></button>
          <button title="Delivery"><CheckCircle2 size={18} /></button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="page-header">
          <div>
            <p className="eyebrow">Team Operations</p>
            <h1>Delivery Command Center</h1>
          </div>
          <div className="search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search initiatives or owners" />
          </div>
        </header>

        <section className="metrics-grid">
          <MetricCard label="Completion" value={`${metrics?.completionRate ?? 0}%`} icon={<CheckCircle2 size={18} />} />
          <MetricCard label="Avg progress" value={`${metrics?.averageProgress ?? 0}%`} icon={<CircleDashed size={18} />} />
          <MetricCard label="Blocked" value={String(metrics?.blockedWork ?? 0)} icon={<AlertTriangle size={18} />} tone="warn" />
          <MetricCard label="High risks" value={String(metrics?.openHighRisks ?? 0)} icon={<ShieldAlert size={18} />} tone="risk" />
        </section>

        <section className="toolbar">
          {["all", "planned", "in-progress", "blocked", "done"].map((item) => (
            <button key={item} className={status === item ? "selected" : ""} onClick={() => setStatus(item)}>
              {item === "all" ? "All" : statusLabels[item as keyof typeof statusLabels]}
            </button>
          ))}
        </section>

        <section className="board" aria-busy={loading}>
          {(["planned", "in-progress", "blocked", "done"] as const).map((column) => (
            <div className="column" key={column}>
              <div className="column-header">
                <h2>{statusLabels[column]}</h2>
                <span>{grouped[column]?.length || 0}</span>
              </div>
              {(grouped[column] || []).map((initiative) => (
                <article className="initiative-card" key={initiative.id}>
                  <div className="card-topline">
                    <span className={classNames("priority", initiative.priority)}>{initiative.priority}</span>
                    <span>{initiative.dueDate}</span>
                  </div>
                  <h3>{initiative.title}</h3>
                  <p>{initiative.owner}</p>
                  <div className="progress"><span style={{ width: `${initiative.progress}%` }} /></div>
                  <strong>{initiative.progress}%</strong>
                </article>
              ))}
            </div>
          ))}
        </section>

        <section className="risk-panel">
          <div className="section-title">
            <h2>Risk Register</h2>
            <span>{risks.filter((risk) => risk.open).length} open</span>
          </div>
          <div className="risk-list">
            {risks.map((risk) => (
              <article className="risk-item" key={risk.id}>
                <span className={classNames("severity", risk.severity)}>{risk.severity}</span>
                <div>
                  <h3>{risk.title}</h3>
                  <p>{risk.mitigation}</p>
                </div>
                <small>{risk.initiativeTitle || "General"}</small>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function MetricCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone?: string }) {
  return (
    <article className={classNames("metric-card", tone)}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

