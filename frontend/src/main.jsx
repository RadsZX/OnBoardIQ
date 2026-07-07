import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import {
  Activity, AlertTriangle, ChevronDown, Download, FileDown, Gauge,
  LayoutDashboard, LogOut, Search, ShieldCheck, SlidersHorizontal,
  UserRoundCheck, Users,
} from 'lucide-react';
import { api, clearToken, downloadCsv, getToken, setToken } from './api';
import './index.css';

const NAV = [
  ['Dashboard', LayoutDashboard],
  ['Journey Explorer', Search],
  ['Customer Segmentation', Users],
  ['Root Cause Analysis', ShieldCheck],
  ['Business Impact Simulator', SlidersHorizontal],
];
const COLORS = ['#2F80ED', '#12B886', '#F59F00', '#E03131', '#7048E8', '#0CA678'];
const defaultFilters = { start_date: null, end_date: null, loan_type: 'All', city: 'All', device_type: 'All', age_group: 'All' };

function exportChart(id, filename) {
  const node = document.getElementById(id);
  const svg = node?.querySelector('svg');
  if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  const image = new Image();
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(900, svg.viewBox.baseVal.width || node.clientWidth);
  canvas.height = Math.max(420, svg.viewBox.baseVal.height || node.clientHeight);
  image.onload = () => {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename;
    a.click();
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@onboardiq.io');
  const [password, setPassword] = useState('OnboardIQ@2026');
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setToken(data.token);
      onLogin(data.user);
    } catch {
      setError('Invalid credentials');
    }
  }
  return (
    <div className="min-h-screen bg-navy text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-center px-8 py-12">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent"><ShieldCheck /></div>
            <div>
              <h1 className="text-3xl font-bold tracking-normal">OnboardIQ</h1>
              <p className="text-blue-100">Decision intelligence for digital onboarding</p>
            </div>
          </div>
          <h2 className="max-w-2xl text-5xl font-bold leading-tight tracking-normal">Detect abandonment, explain friction, and estimate the business value of fixing it.</h2>
          <div className="mt-10 grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-3">
            {['Root-cause scoring', 'Recommendation engine', 'Impact simulator'].map((item) => (
              <div key={item} className="rounded-lg border border-white/15 bg-white/8 p-4 text-sm text-blue-50">{item}</div>
            ))}
          </div>
        </section>
        <section className="flex items-center px-8 py-12">
          <form onSubmit={submit} className="w-full rounded-lg bg-white p-7 text-ink shadow-soft">
            <h2 className="text-2xl font-bold">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Demo: admin@onboardiq.io / OnboardIQ@2026</p>
            <label className="mt-6 block text-sm font-semibold">Email</label>
            <input className="field mt-2 w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
            <label className="mt-4 block text-sm font-semibold">Password</label>
            <input className="field mt-2 w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button className="btn btn-primary mt-6 w-full" type="submit">Enter platform</button>
          </form>
        </section>
      </div>
    </div>
  );
}

function Shell({ user, onLogout, children, active, setActive }) {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 bg-navy text-white lg:block">
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent"><Gauge size={21} /></div>
          <div><div className="text-xl font-bold">OnboardIQ</div><div className="text-xs text-blue-100">Fintech Journey Intelligence</div></div>
        </div>
        <nav className="space-y-1 px-3">
          {NAV.map(([label, Icon]) => (
            <button key={label} onClick={() => setActive(label)} className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition ${active === label ? 'bg-white text-navy' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 lg:pl-72">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur">
          <div>
            <h1 className="text-xl font-bold text-ink">{active}</h1>
            <p className="text-xs text-slate-500">From onboarding data to decisions, not just charts.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block"><div className="text-sm font-semibold">{user?.name}</div><div className="text-xs text-slate-500">{user?.role}</div></div>
            <button className="btn btn-secondary" onClick={onLogout}><LogOut size={16} /> Logout</button>
          </div>
        </header>
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}

function FilterBar({ metadata, filters, setFilters, onRefresh }) {
  const update = (key, value) => setFilters((f) => ({ ...f, [key]: value || null }));
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-soft lg:grid-cols-7">
      <input className="field" type="date" value={filters.start_date || ''} onChange={(e) => update('start_date', e.target.value)} />
      <input className="field" type="date" value={filters.end_date || ''} onChange={(e) => update('end_date', e.target.value)} />
      <Select value={filters.loan_type} values={metadata.loan_types} onChange={(v) => update('loan_type', v)} />
      <Select value={filters.city} values={metadata.cities} onChange={(v) => update('city', v)} />
      <Select value={filters.device_type} values={metadata.devices} onChange={(v) => update('device_type', v)} />
      <Select value={filters.age_group} values={metadata.age_groups} onChange={(v) => update('age_group', v)} />
      <button className="btn btn-primary" onClick={onRefresh}><Activity size={16} /> Apply</button>
    </div>
  );
}

function Select({ value, values = [], onChange }) {
  return (
    <label className="relative">
      <select className="field w-full appearance-none pr-8" value={value || 'All'} onChange={(e) => onChange(e.target.value)}>
        {values.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-2.5 text-slate-400" size={16} />
    </label>
  );
}

function Card({ label, value, icon: Icon, tone = 'blue' }) {
  const tones = { blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700' };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-md ${tones[tone]}`}><Icon size={18} /></span>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-normal">{value}</div>
    </div>
  );
}

function ChartBox({ id, title, children, csvKind, filters }) {
  return (
    <section className="chart-card" id={id}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-bold">{title}</h3>
        <div className="flex gap-2">
          <button className="btn btn-secondary px-2" onClick={() => exportChart(id, `${id}.png`)} title="Export PNG"><Download size={16} /></button>
          {csvKind && <button className="btn btn-secondary px-2" onClick={() => downloadCsv(csvKind, filters)} title="Export CSV"><FileDown size={16} /></button>}
        </div>
      </div>
      <div className="h-72">{children}</div>
    </section>
  );
}

function Dashboard({ data, filters }) {
  if (!data) return <Loading />;
  const { kpis, charts } = data;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card label="Total Sessions" value={kpis.total_sessions.toLocaleString()} icon={Users} />
        <Card label="Completion Rate" value={`${kpis.completion_rate}%`} icon={UserRoundCheck} tone="green" />
        <Card label="Avg Completion Time" value={`${kpis.average_completion_time_minutes}m`} icon={Activity} tone="amber" />
        <Card label="Highest Drop-off" value={kpis.highest_dropoff_step} icon={AlertTriangle} tone="red" />
        <Card label="Common Error" value={kpis.most_common_error} icon={ShieldCheck} />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartBox id="funnel" title="Interactive Funnel" csvKind="funnel" filters={filters}>
          <ResponsiveContainer><AreaChart data={charts.funnel}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="step" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Area dataKey="reached" stroke="#2F80ED" fill="#2F80ED" fillOpacity={0.18} /><Area dataKey="completed" stroke="#12B886" fill="#12B886" fillOpacity={0.25} /></AreaChart></ResponsiveContainer>
        </ChartBox>
        <ChartBox id="dropoff" title="Drop-off by Step" csvKind="dropoff" filters={filters}>
          <ResponsiveContainer><BarChart data={charts.dropoff}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="step" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="dropoffs" fill="#E03131" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartBox>
        <ChartBox id="device" title="Completion by Device" csvKind="completion_by_device" filters={filters}>
          <ResponsiveContainer><PieChart><Pie data={charts.completion_by_device} dataKey="completion_rate" nameKey="device_type" outerRadius={105} label>{charts.completion_by_device.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
        </ChartBox>
        <ChartBox id="age" title="Completion by Age Group" filters={filters}>
          <ResponsiveContainer><BarChart data={charts.completion_by_age}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="age_group" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="completion_rate" fill="#7048E8" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartBox>
        <ChartBox id="loan" title="Completion by Loan Type" filters={filters}>
          <ResponsiveContainer><BarChart data={charts.completion_by_loan}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="loan_type" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="completion_rate" fill="#0CA678" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartBox>
        <ChartBox id="daily" title="Daily Trend" filters={filters}>
          <ResponsiveContainer><LineChart data={charts.daily_trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="completion_rate" stroke="#2F80ED" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
        </ChartBox>
      </div>
    </div>
  );
}

function JourneyExplorer({ metadata }) {
  const [customer, setCustomer] = useState(metadata.sample_customer_ids?.[0] || 'CUST-000001');
  const [journey, setJourney] = useState(null);
  async function search() {
    setJourney(await api(`/journey/${customer}`));
  }
  useEffect(() => { if (metadata.sample_customer_ids?.[0]) search(); }, [metadata.sample_customer_ids]);
  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <section className="chart-card">
        <h3 className="font-bold">Customer Lookup</h3>
        <div className="mt-4 flex gap-2"><input className="field min-w-0 flex-1" value={customer} onChange={(e) => setCustomer(e.target.value)} /><button className="btn btn-primary" onClick={search}><Search size={16} /></button></div>
        <p className="mt-3 text-xs text-slate-500">Try {metadata.sample_customer_ids?.slice(0, 3).join(', ')}</p>
      </section>
      <section className="chart-card">
        {!journey ? <Loading /> : !journey.found ? <p>No journey found.</p> : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="text-lg font-bold">{journey.customer_id}</h3><p className="text-sm text-slate-500">{journey.session_id} · {journey.profile.loan_type} · {journey.profile.device_type}</p></div>
              <span className={`rounded-md px-3 py-1 text-sm font-semibold ${journey.final_status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{journey.final_status}</span>
            </div>
            <div className="mt-6 space-y-3">
              {journey.steps.map((step, idx) => (
                <div key={step.step_name} className="flex gap-3">
                  <div className={`mt-1 h-8 w-8 rounded-full border-2 ${step.completed_step ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'}`} />
                  <div className="min-w-0 flex-1 rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap justify-between gap-2"><strong>{idx + 1}. {step.step_name}</strong><span className="text-sm text-slate-500">{step.time_spent_seconds}s</span></div>
                    <p className="mt-1 text-sm text-slate-500">Error: {step.error_code} · {step.completed_step ? 'Completed' : 'Exited here'}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Segmentation({ filters }) {
  const [dimension, setDimension] = useState('age_group');
  const [data, setData] = useState([]);
  useEffect(() => { api(`/segmentation/${dimension}`, { method: 'POST', body: JSON.stringify(filters) }).then((d) => setData(d.segments)); }, [dimension, filters]);
  return (
    <section className="chart-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold">Segment Performance</h3>
        <Select value={dimension} values={['age_group', 'income_range', 'device_type', 'loan_type', 'employment_status']} onChange={setDimension} />
      </div>
      <DataTable rows={data} columns={['segment', 'users', 'completion_rate', 'dropoff_rate', 'average_time_minutes', 'most_common_exit_point']} />
    </section>
  );
}

function RootCauses({ filters }) {
  const [data, setData] = useState([]);
  useEffect(() => { api('/root-causes', { method: 'POST', body: JSON.stringify(filters) }).then((d) => setData(d.causes)); }, [filters]);
  return <DecisionList title="Root Cause Analysis" items={data} mode="cause" exportKind="root_causes" filters={filters} />;
}

function Recommendations({ filters }) {
  const [data, setData] = useState([]);
  useEffect(() => { api('/recommendations', { method: 'POST', body: JSON.stringify(filters) }).then((d) => setData(d.recommendations)); }, [filters]);
  return <DecisionList title="Recommended Product Changes" items={data} mode="recommendation" />;
}

function DecisionList({ title, items, mode, exportKind, filters }) {
  return (
    <section className="chart-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold">{title}</h3>
        {exportKind && <button className="btn btn-secondary" onClick={() => downloadCsv(exportKind, filters)}><FileDown size={16} /> Export CSV</button>}
      </div>
      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.cause || item.problem} className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-3xl">
                <h4 className="font-bold">{mode === 'cause' ? item.cause : item.problem}</h4>
                <p className="mt-1 text-sm text-slate-600">{mode === 'cause' ? item.reasoning : item.recommendation}</p>
              </div>
              <span className={`rounded-md px-3 py-1 text-xs font-bold ${item.severity === 'High' || item.priority === 'High' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{item.severity || item.priority}</span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              {mode === 'cause' ? <><Metric label="Affected Users" value={item.affected_users.toLocaleString()} /><Metric label="Business Impact" value={item.business_impact} /><Metric label="Completion" value={`${item.completion_rate}%`} /></> : <><Metric label="Expected Improvement" value={item.estimated_impact} /><Metric label="Recovered Apps" value={item.estimated_completed_applications.toLocaleString()} /><Metric label="Reasoning" value={item.reasoning} /></>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-md bg-slate-50 p-3"><div className="text-xs font-semibold uppercase text-slate-400">{label}</div><div className="mt-1 font-semibold text-slate-800">{value}</div></div>;
}

function Simulator({ filters }) {
  const [assumptions, setAssumptions] = useState({ otp_timeout_seconds: 30, auto_save: false, document_compression: false, guided_kyc: false, fallback_uploader: false, revenue_per_application: 1850 });
  const [result, setResult] = useState(null);
  useEffect(() => { api('/simulator', { method: 'POST', body: JSON.stringify({ ...filters, ...assumptions }) }).then(setResult); }, [filters, assumptions]);
  const toggle = (key) => setAssumptions((a) => ({ ...a, [key]: !a[key] }));
  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <section className="chart-card">
        <h3 className="font-bold">Assumptions</h3>
        <label className="mt-5 block text-sm font-semibold">OTP Timeout: {assumptions.otp_timeout_seconds}s</label>
        <input className="mt-2 w-full" type="range" min="30" max="90" step="15" value={assumptions.otp_timeout_seconds} onChange={(e) => setAssumptions({ ...assumptions, otp_timeout_seconds: Number(e.target.value) })} />
        {['auto_save', 'document_compression', 'guided_kyc', 'fallback_uploader'].map((key) => (
          <label key={key} className="mt-4 flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm font-semibold">
            {key.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')}
            <input type="checkbox" checked={assumptions[key]} onChange={() => toggle(key)} />
          </label>
        ))}
        <label className="mt-4 block text-sm font-semibold">Revenue per completed application</label>
        <input className="field mt-2 w-full" type="number" value={assumptions.revenue_per_application} onChange={(e) => setAssumptions({ ...assumptions, revenue_per_application: Number(e.target.value) })} />
      </section>
      <section className="chart-card">
        {!result ? <Loading /> : <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card label="Expected Completion" value={`${result.expected_completion_rate}%`} icon={Gauge} tone="green" />
            <Card label="Completed App Increase" value={result.estimated_increase_completed_applications.toLocaleString()} icon={UserRoundCheck} />
            <Card label="Revenue Increase" value={`₹${Number(result.estimated_revenue_increase).toLocaleString()}`} icon={Activity} tone="amber" />
          </div>
          <div className="mt-6 rounded-lg bg-slate-50 p-4">
            <h4 className="font-bold">Why the estimate changes</h4>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">{result.explanation.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </>}
      </section>
    </div>
  );
}

function DataTable({ rows, columns }) {
  return (
    <div className="overflow-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead><tr className="border-b bg-slate-50">{columns.map((c) => <th className="px-3 py-3 font-bold" key={c}>{c.replaceAll('_', ' ')}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr className="border-b border-slate-100" key={row.segment}>{columns.map((c) => <td className="px-3 py-3" key={c}>{row[c]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Loading() {
  return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">Loading decision intelligence...</div>;
}

function App() {
  const [user, setUser] = useState(null);
  const [active, setActive] = useState('Dashboard');
  const [metadata, setMetadata] = useState({});
  const [filters, setFilters] = useState(defaultFilters);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const effectiveFilters = useMemo(() => ({ ...filters }), [filters, refreshKey]);

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me').then(setUser).catch(clearToken);
  }, []);
  useEffect(() => {
    if (!user) return;
    api('/metadata').then((m) => {
      setMetadata(m);
      setFilters((f) => ({ ...f, start_date: m.date_min, end_date: m.date_max }));
    });
  }, [user]);
  useEffect(() => {
    if (!user || !metadata.date_min) return;
    api('/analytics/dashboard', { method: 'POST', body: JSON.stringify(effectiveFilters) }).then(setDashboard);
  }, [user, metadata.date_min, effectiveFilters]);

  if (!user) return <Login onLogin={setUser} />;
  const logout = () => { clearToken(); setUser(null); };
  return (
    <Shell user={user} onLogout={logout} active={active} setActive={setActive}>
      {active !== 'Journey Explorer' && <FilterBar metadata={metadata} filters={filters} setFilters={setFilters} onRefresh={() => setRefreshKey((x) => x + 1)} />}
      {active === 'Dashboard' && <Dashboard data={dashboard} filters={effectiveFilters} />}
      {active === 'Journey Explorer' && <JourneyExplorer metadata={metadata} />}
      {active === 'Customer Segmentation' && <Segmentation filters={effectiveFilters} />}
      {active === 'Root Cause Analysis' && <RootCauses filters={effectiveFilters} />}
      {active === 'Business Impact Simulator' && <Simulator filters={effectiveFilters} />}
    </Shell>
  );
}

createRoot(document.getElementById('root')).render(<App />);
