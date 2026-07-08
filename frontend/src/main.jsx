import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import {
  Activity, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Download, FileDown, Gauge,
  LayoutDashboard, LogOut, Search, ShieldCheck, SlidersHorizontal,
  UserRoundCheck, Users, Zap, TrendingUp, Lightbulb, BarChart2,
  Brain, ArrowRight, CheckCircle, Mail, Phone, MapPin, Globe,
  Target, LineChart as LineChartIcon, Layers, Clock, Lock,
} from 'lucide-react';
import { api, clearToken, downloadCsv, getToken, setToken } from './api';
import './index.css';

const NAV = [
  ['Dashboard', LayoutDashboard],
  ['Journey Explorer', Search],
  ['Customer Segmentation', Users],
  ['Root Cause Analysis', ShieldCheck],
  ['Business Impact Simulator', SlidersHorizontal],
  ['Action Brief', Zap],
];
const COLORS = ['#2F80ED', '#12B886', '#F59F00', '#E03131', '#7048E8', '#0CA678'];
const defaultFilters = {
  start_date: { label: 'From', value: null },
  end_date: { label: 'To', value: null },
  loan_type: { label: 'Loan Type', value: 'All' },
  city: { label: 'City', value: 'All' },
  device_type: { label: 'Device Type', value: 'All' },
  age_group: { label: 'Age Group', value: 'All' }
};

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

// ─── OnboardIQ Brand Logo SVG ─────────────────────────────────────────────────
function Logo({ size = 40, variant = 'color' }) {
  const isDark = variant === 'white';
  const primary = isDark ? '#FFFFFF' : '#2F80ED';
  const secondary = isDark ? 'rgba(255,255,255,0.7)' : '#071B34';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer rounded square */}
      <rect width="48" height="48" rx="12" fill={secondary} />
      {/* Central bar chart abstraction — data visualization */}
      <rect x="10" y="28" width="5" height="10" rx="1.5" fill={primary} opacity="0.5" />
      <rect x="18" y="20" width="5" height="18" rx="1.5" fill={primary} opacity="0.75" />
      <rect x="26" y="14" width="5" height="24" rx="1.5" fill={primary} />
      <rect x="34" y="22" width="5" height="16" rx="1.5" fill={primary} opacity="0.65" />
      {/* Trend line overlay */}
      <polyline
        points="12.5,24 20.5,18 28.5,12 36.5,20"
        stroke={primary}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.9"
      />
      {/* Dot on the trend */}
      <circle cx="28.5" cy="12" r="2.2" fill={primary} />
    </svg>
  );
}

// ─── Wordmark (Logo + Text) ───────────────────────────────────────────────────
function Wordmark({ size = 40, textColor = 'text-white', showTagline = false }) {
  return (
    <div className="flex items-center gap-3">
      <Logo size={size} variant="color" />
      <div>
        <div className={`text-xl font-bold tracking-tight leading-none ${textColor}`}>
          OnboardIQ
        </div>
        {showTagline && (
          <div className="text-xs text-blue-300 font-medium tracking-wide mt-0.5">
            Fintech Journey Intelligence
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Landing Page (Login + Marketing) ────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@onboardiq.io');
  const [password, setPassword] = useState('OnboardIQ@2026');
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

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

  function scrollTo(id) {
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
    setMenuOpen(false);
  }

  const features = [
    {
      icon: Target,
      title: 'Drop-off Detection',
      description: 'Identify exactly where applicants abandon the onboarding funnel with step-level precision. Pinpoint friction before it costs you revenue.',
      color: 'blue',
    },
    {
      icon: Brain,
      title: 'Root-Cause AI Scoring',
      description: 'Our ML engine surfaces the real reasons behind every exit - from OTP timeouts to confusing KYC flows - ranked by business impact.',
      color: 'purple',
    },
    {
      icon: LineChartIcon,
      title: 'Journey Explorer',
      description: 'Replay any customer\'s onboarding journey step-by-step. Understand individual friction points and error patterns in full detail.',
      color: 'emerald',
    },
    {
      icon: Users,
      title: 'Customer Segmentation',
      description: 'Slice performance by age group, income, device, loan type, and employment status to find which segments need the most attention.',
      color: 'amber',
    },
    {
      icon: SlidersHorizontal,
      title: 'Business Impact Simulator',
      description: 'Model the revenue lift from proposed fixes before you build them. Justify engineering investment with data-backed projections.',
      color: 'red',
    },
    {
      icon: Zap,
      title: 'Action Brief & Insights',
      description: 'Auto-generated executive summaries with prioritized action cards. From data to decision in seconds, not days.',
      color: 'mint',
    },
  ];

  const stats = [
    { value: '94%', label: 'Accuracy in drop-off prediction' },
    { value: '3.2×', label: 'Faster time-to-insight vs manual analysis' },
    { value: '₹18L+', label: 'Average monthly revenue recovered' },
    { value: '60+', label: 'Onboarding friction patterns tracked' },
  ];

  const colorMap = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-100' },
    mint: { bg: 'bg-teal-50', icon: 'text-teal-600', border: 'border-teal-100' },
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] font-sans">
      {/* ── Sticky Navbar ─────────────────────────────────── */}
      <nav id="home" className="sticky top-0 z-50 bg-[#0C2E58]/95 backdrop-blur border-b border-white/10 shadow-lg">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-16">
          <Wordmark size={36} textColor="text-white" showTagline={false} />

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollTo('home')}
              className="text-sm font-semibold text-blue-200 hover:text-white transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollTo('about')}
              className="text-sm font-semibold text-blue-200 hover:text-white transition-colors"
            >
              About Us
            </button>
            <button
              onClick={() => scrollTo('contact')}
              className="text-sm font-semibold text-blue-200 hover:text-white transition-colors"
            >
              Contact Us
            </button>
            <button
              onClick={() => scrollTo('login-section')}
              className="ml-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
            >
              Sign In
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-1"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className={`block w-5 h-0.5 bg-white transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#071B34] px-6 py-4 space-y-3">
            {[['Home', 'home'], ['About Us', 'about'], ['Contact Us', 'contact'], ['Sign In', 'login-section']].map(([label, id]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="block w-full text-left text-sm font-semibold text-blue-100 hover:text-white py-2 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ── Hero Section (Home) ─────────────────────────── */}
      <section className="relative overflow-hidden bg-[#071B34] pt-20 pb-24 lg:pt-28 lg:pb-32">
        {/* Background gradient mesh */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Hero copy */}
          <div>

            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white leading-tight tracking-tight">
              Turn Onboarding{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Drop-offs
              </span>{' '}
              Into Revenue
            </h1>

            <p className="mt-5 text-lg text-blue-100 leading-relaxed max-w-lg">
              OnboardIQ uses AI to detect friction, explain root causes, and simulate the business value of fixing them - before you write a single line of code.
            </p>

            {/* Tagline */}
            <p className="mt-3 text-sm font-semibold text-blue-300 tracking-wide italic">
              "From onboarding data to decisions - not just charts."
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => scrollTo('login-section')}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-900/40"
              >
                Get Started <ArrowRight size={16} />
              </button>
              <button
                onClick={() => scrollTo('about')}
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/8 transition-all"
              >
                Explore Features
              </button>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap gap-4">
              {['Bank-grade Security', 'Real-time Analytics', 'Zero-code Setup'].map((badge) => (
                <span key={badge} className="flex items-center gap-1.5 text-xs font-semibold text-blue-200">
                  <CheckCircle size={13} className="text-emerald-400" />
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Login card */}
          <div id="login-section" className="w-full">
            <form onSubmit={submit} className="rounded-2xl bg-white p-8 text-[#12233D] shadow-2xl border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <Logo size={36} variant="color" />
                <div>
                  <h2 className="text-xl font-bold">Sign in to OnboardIQ</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Decision intelligence platform</p>
                </div>
              </div>

              <p className="mb-5 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                Demo credentials: <strong>admin@onboardiq.io</strong> / <strong>OnboardIQ@2026</strong>
              </p>

              <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
              <input
                className="field w-full"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />

              <label className="mt-4 block text-sm font-semibold text-slate-700 mb-1">Password</label>
              <input
                className="field w-full"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />

              {error && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <button className="btn btn-primary mt-6 w-full py-3 text-base font-bold" type="submit">
                Enter Platform
              </button>

              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
                <Lock size={12} />
                <span>256-bit encrypted · SOC 2 compliant</span>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ── Stats Band ──────────────────────────────────── */}
      <section className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center py-4 md:py-0">
              <div className="text-3xl font-extrabold text-[#071B34] tracking-tight">{value}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features / About Us ─────────────────────────── */}
      <section id="about" className="bg-[#F5F7FB] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6">
          {/* Section heading */}
          <div className="text-center mb-14">
            <span className="inline-block rounded-full bg-blue-100 px-4 py-1.5 text-xs font-bold text-blue-700 uppercase tracking-widest mb-4">
              About OnboardIQ
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#071B34] tracking-tight">
              Everything you need to stop losing applicants
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              OnboardIQ is a decision intelligence platform built for fintech product teams. We transform raw onboarding event data into clear, prioritized actions that recover revenue.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description, color }) => {
              const c = colorMap[color];
              return (
                <div
                  key={title}
                  className={`rounded-xl border ${c.border} bg-white p-6 shadow-sm hover:shadow-md transition-all group`}
                >
                  <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <Icon size={22} className={c.icon} />
                  </div>
                  <h3 className="text-base font-bold text-[#071B34] mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Contact Section ─────────────────────────────── */}
      <section id="contact" className="bg-white py-20 lg:py-28 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <span className="inline-block rounded-full bg-blue-100 px-4 py-1.5 text-xs font-bold text-blue-700 uppercase tracking-widest mb-4">
              Contact Us
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#071B34] tracking-tight">
              Let's talk about your onboarding funnel
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
              Reach out to schedule a demo, ask a question, or discuss a custom integration for your team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl mx-auto text-center mt-12">
            {/* Email */}
            <div className="flex flex-col items-center">
              <div className="mb-3 text-blue-600">
                <Mail size={24} />
              </div>
              <h4 className="text-base font-bold text-[#071B34] mb-1">Email</h4>
              <p className="text-sm text-slate-500 mb-2">We respond within 24 hours</p>
              <a
                href="mailto:hello@onboardiq.io"
                className="text-sm font-semibold text-black hover:text-blue-700 hover:underline transition-colors"
              >
                hello@onboardiq.io
              </a>
            </div>

            {/* Phone */}
            <div className="flex flex-col items-center">
              <div className="mb-3 text-blue-600">
                <Phone size={24} />
              </div>
              <h4 className="text-base font-bold text-[#071B34] mb-1">Phone</h4>
              <p className="text-sm text-slate-500 mb-2">Mon–Fri, 9 AM – 6 PM IST</p>
              <a
                href="tel:+918000123456"
                className="text-sm font-semibold text-black hover:text-blue-700 hover:underline transition-colors"
              >
                +91 80001 23456
              </a>
            </div>

            {/* Office */}
            <div className="flex flex-col items-center">
              <div className="mb-3 text-blue-600">
                <MapPin size={24} />
              </div>
              <h4 className="text-base font-bold text-[#071B34] mb-1">Office</h4>
              <p className="text-sm text-slate-500 mb-2">Headquartered in India</p>
              <span className="text-sm font-semibold text-black">
                Bengaluru, Karnataka, IN
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="bg-[#0C2E58] text-blue-200 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo size={32} variant="color" />
            <div>
              <div className="font-bold text-white text-sm">OnboardIQ</div>
              <div className="text-xs text-blue-400 mt-0.5">Fintech Journey Intelligence</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
            {[['Home', 'home'], ['About Us', 'about'], ['Contact Us', 'contact'], ['Sign In', 'login-section']].map(([label, id]) => (
              <button
                key={id}
                onClick={() => {
                  if (id === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
                  else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-white transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-xs text-blue-400">
            © {new Date().getFullYear()} OnboardIQ. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Shell({ user, onLogout, children, active, setActive }) {
  const [isOpen, setIsOpen] = useState(() => window.innerWidth >= 1024);

  return (
    <div className="flex min-h-screen relative overflow-x-hidden">
      {/* Backdrop overlay for mobile screen drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-20 flex w-72 bg-[#071B34] text-white flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Sidebar header with Logo and collapse button */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Logo size={38} variant="color" />
            <div>
              <div className="text-base font-bold leading-tight">OnboardIQ</div>
              <div className="text-xs text-blue-300 mt-0.5">Journey Intelligence</div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map(([label, Icon]) => (
            <button
              key={label}
              onClick={() => {
                setActive(label);
                if (window.innerWidth < 1024) {
                  setIsOpen(false);
                }
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all ${active === label
                ? 'bg-accent text-white shadow-sm'
                : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className={`min-w-0 flex-1 transition-all duration-300 ease-in-out ${isOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur shadow-sm">
          <div className="flex items-center gap-3">
            {/* Toggle button when sidebar is collapsed */}
            {!isOpen && (
              <button
                onClick={() => setIsOpen(true)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-colors mr-1 flex items-center justify-center bg-white shadow-sm"
                title="Expand Sidebar"
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* Mobile logo in header (only shown when sidebar is closed and on mobile) */}
            <div className={`lg:hidden transition-opacity duration-200 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <Logo size={30} variant="color" />
            </div>

            <div>
              <h1 className="text-base font-bold text-[#12233D]">{active}</h1>
              <p className="text-xs text-slate-400 hidden sm:block">OnboardIQ · Fintech Journey Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-[#12233D]">{user?.name}</div>
              <div className="text-xs text-slate-400">{user?.role}</div>
            </div>
            <button className="btn btn-secondary text-xs" onClick={onLogout}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}

function FilterBar({ metadata, filters, setFilters, onRefresh }) {
  const update = (key, value) => {
    setFilters((f) => ({
      ...f,
      [key]: {
        ...f[key],
        value: value || null,
      },
    }));
  };

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-soft lg:grid-cols-7">

      <label>
        <span className="mb-1 block text-xs font-semibold text-slate-500">
          {filters.start_date.label}
        </span>
        <input
          className="field w-full"
          type="date"
          value={filters.start_date.value || ''}
          onChange={(e) => update('start_date', e.target.value)}
        />
      </label>

      <label>
        <span className="mb-1 block text-xs font-semibold text-slate-500">
          {filters.end_date.label}
        </span>
        <input
          className="field w-full"
          type="date"
          value={filters.end_date.value || ''}
          onChange={(e) => update('end_date', e.target.value)}
        />
      </label>

      <Select
        label={filters.loan_type.label}
        value={filters.loan_type.value}
        values={metadata.loan_types}
        onChange={(v) => update('loan_type', v)}
      />

      <Select
        label={filters.city.label}
        value={filters.city.value}
        values={metadata.cities}
        onChange={(v) => update('city', v)}
      />

      <Select
        label={filters.device_type.label}
        value={filters.device_type.value}
        values={metadata.devices}
        onChange={(v) => update('device_type', v)}
      />

      <Select
        label={filters.age_group.label}
        value={filters.age_group.value}
        values={metadata.age_groups}
        onChange={(v) => update('age_group', v)}
      />
      <div className="flex items-end">
        <button className="btn btn-primary h-[44px] w-full" onClick={onRefresh}>
          Apply
        </button>
      </div>
    </div>
  );
}

function Select({ label, value, values = [], onChange }) {
  return (
    <label>
      {label && (
        <span className="mb-1 block text-xs font-semibold text-slate-500">
          {label}
        </span>
      )}

      <div className="relative">
        <select
          className="field w-full appearance-none pr-8"
          value={value || 'All'}
          onChange={(e) => onChange(e.target.value)}
        >
          {values.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <ChevronDown
          className="pointer-events-none absolute right-2 top-2.5 text-slate-400"
          size={16}
        />
      </div>
    </label>
  );
}


function Card({ label, value, icon: Icon, tone = 'blue' }) {
  const tones = { blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700' };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
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
          {csvKind && (<button className="btn btn-secondary px-2" onClick={() => downloadCsv(csvKind, buildApiFilters(filters))} title="Export CSV"><FileDown size={16} /></button>)}
        </div>
      </div>
      <div className="h-72">{children}</div>
    </section>
  );
}

function FilteredOut({ dimension, value }) {
  return (
    <div className="chart-card flex h-[17rem] flex-col items-center justify-center gap-2 text-center">
      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">{dimension} = {value}</span>
      <p className="text-sm text-slate-400">Breakdown not shown — already filtered to a single {dimension.toLowerCase()}.</p>
    </div>
  );
}

function Dashboard({ data, filters }) {
  if (!data) return <Loading />;
  const { kpis, charts } = data;
  const deviceActive = filters.device_type.value && filters.device_type.value !== 'All';
  const ageActive = filters.age_group.value && filters.age_group.value !== 'All';
  const loanActive = filters.loan_type.value && filters.loan_type.value !== 'All';
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
        {deviceActive
          ? <FilteredOut dimension="Device" value={filters.device_type} />
          : <ChartBox id="device" title="Completion by Device" csvKind="completion_by_device" filters={filters}>
            <ResponsiveContainer><PieChart><Pie data={charts.completion_by_device} dataKey="completion_rate" nameKey="device_type" outerRadius={105} label>{charts.completion_by_device.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
          </ChartBox>}
        {ageActive
          ? <FilteredOut dimension="Age Group" value={filters.age_group} />
          : <ChartBox id="age" title="Completion by Age Group" filters={filters}>
            <ResponsiveContainer><BarChart data={charts.completion_by_age}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="age_group" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="completion_rate" fill="#7048E8" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer>
          </ChartBox>}
        {loanActive
          ? <FilteredOut dimension="Loan Type" value={filters.loan_type} />
          : <ChartBox id="loan" title="Completion by Loan Type" filters={filters}>
            <ResponsiveContainer><BarChart data={charts.completion_by_loan}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="loan_type" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="completion_rate" fill="#0CA678" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer>
          </ChartBox>}
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
  useEffect(() => { api(`/segmentation/${dimension}`, { method: 'POST', body: JSON.stringify(buildApiFilters(filters)) }).then((d) => setData(d.segments)); }, [dimension, filters]);
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
  useEffect(() => { api('/root-causes', { method: 'POST', body: JSON.stringify(buildApiFilters(filters)) }).then((d) => setData(d.causes)); }, [filters]);
  return <DecisionList title="Root Cause Analysis" items={data} mode="cause" exportKind="root_causes" filters={filters} />;
}

function Recommendations({ filters }) {
  const [data, setData] = useState([]);
  useEffect(() => { api('/recommendations', { method: 'POST', body: JSON.stringify(buildApiFilters(filters)) }).then((d) => setData(d.recommendations)); }, [filters]);
  return <DecisionList title="Recommended Product Changes" items={data} mode="recommendation" />;
}

function DecisionList({ title, items, mode, exportKind, filters }) {
  return (
    <section className="chart-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold">{title}</h3>
        {exportKind && (<button className="btn btn-secondary" onClick={() => downloadCsv(exportKind, buildApiFilters(filters))}><FileDown size={16} /> Export CSV</button>)}
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
  useEffect(() => { api('/simulator', { method: 'POST', body: JSON.stringify({ ...buildApiFilters(filters), ...assumptions }) }).then(setResult); }, [filters, assumptions]);
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
  return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading decision intelligence...</div>;
}

// ─── Action Brief ────────────────────────────────────────────────────────────

function HealthScore({ cards, topFindings }) {
  if (!cards || cards.length === 0) return null;
  const highCount = cards.filter((c) => c.priority === 'High').length;
  const avgConfidence = Math.round(cards.reduce((s, c) => s + c.confidence, 0) / cards.length);
  const raw = Math.max(10, 100 - highCount * 14 - (cards.length - highCount) * 5 + (avgConfidence - 80));
  const score = Math.min(99, Math.round(raw));
  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D';
  const color = score >= 80 ? 'text-emerald-600' : score >= 65 ? 'text-amber-500' : 'text-red-500';
  const ring = score >= 80 ? 'border-emerald-400' : score >= 65 ? 'border-amber-400' : 'border-red-400';
  return (
    <section className="chart-card flex flex-wrap items-center gap-6">
      <div className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-4 ${ring}`}>
        <span className={`text-3xl font-black ${color}`}>{grade}</span>
        <span className="text-xs font-semibold text-slate-400">{score}/100</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-bold">Funnel Health Score</h3>
        <p className="mt-1 text-sm text-slate-500">
          {highCount} high-priority issue{highCount !== 1 ? 's' : ''} detected across {cards.length} friction areas.
          Average model confidence: {avgConfidence}%.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {cards.map((c) => (
            <span key={c.kind} className={`rounded-full px-3 py-0.5 text-xs font-semibold ${c.priority === 'High' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
              }`}>{c.kind.replaceAll('_', ' ')}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function TopInsights({ findings }) {
  if (!findings || findings.length === 0) return null;
  return (
    <section className="chart-card">
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb size={18} className="text-amber-500" />
        <h3 className="font-bold">Top Insights</h3>
        <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Dynamic · filter-aware</span>
      </div>
      <ul className="space-y-2">
        {findings.map((f, i) => (
          <li key={i} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{i + 1}</span>
            <span className="text-slate-700">{f}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const PRIORITY_STYLE = {
  High: { badge: 'bg-red-50 text-red-700 border-red-200', border: 'border-l-red-500' },
  Medium: { badge: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-l-amber-400' },
  Low: { badge: 'bg-slate-100 text-slate-600 border-slate-200', border: 'border-l-slate-300' },
};

function ActionCard({ card }) {
  const style = PRIORITY_STYLE[card.priority] || PRIORITY_STYLE.Medium;
  return (
    <article className={`rounded-xl border border-slate-200 border-l-4 ${style.border} bg-white shadow-soft overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {card.kind.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${style.badge}`}>{card.priority} Priority</span>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{card.confidence}% confidence</span>
        </div>
      </div>
      <div className="grid gap-0 md:grid-cols-2">
        <div className="border-b border-slate-100 p-5 md:border-b-0 md:border-r">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" /> What happened?
          </p>
          <p className="text-sm font-semibold text-slate-800">{card.finding}</p>
        </div>
        <div className="border-b border-slate-100 p-5">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" /> Why did it happen?
          </p>
          <p className="text-sm text-slate-600">{card.evidence}</p>
        </div>
        <div className="border-b border-slate-100 p-5 md:border-b-0 md:border-r md:border-t">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" /> What should we do?
          </p>
          <p className="text-sm text-slate-700">{card.recommendation}</p>
        </div>
        <div className="border-t border-slate-100 p-5">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> Expected business impact?
          </p>
          <p className="text-sm font-semibold text-emerald-700">{card.expected_impact}</p>
          <p className="mt-1 text-xs text-slate-400">{card.affected_users.toLocaleString()} affected users</p>
        </div>
      </div>
    </article>
  );
}

function CombinedImpact({ cards }) {
  if (!cards || cards.length === 0) return null;
  let totalApps = 0;
  let totalRevenue = 0;
  let totalPts = 0;
  cards.forEach((c) => {
    const m = c.expected_impact.match(/\+([\d.]+)%.*~([\d,]+) additional.*~Rs ([\d,]+)/);
    if (m) {
      totalPts += parseFloat(m[1]);
      totalApps += parseInt(m[2].replace(/,/g, ''), 10);
      totalRevenue += parseInt(m[3].replace(/,/g, ''), 10);
    }
  });
  return (
    <section className="chart-card">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp size={18} className="text-emerald-500" />
        <h3 className="font-bold">Combined Impact Estimate</h3>
        <span className="ml-auto text-xs text-slate-400">If all recommendations implemented</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-emerald-50 p-4 text-center">
          <div className="text-2xl font-black text-emerald-700">+{totalPts.toFixed(1)}%</div>
          <div className="mt-1 text-xs font-semibold uppercase text-emerald-600">Completion Rate Uplift</div>
        </div>
        <div className="rounded-lg bg-blue-50 p-4 text-center">
          <div className="text-2xl font-black text-blue-700">~{totalApps.toLocaleString()}</div>
          <div className="mt-1 text-xs font-semibold uppercase text-blue-600">Additional Completed Applications</div>
        </div>
        <div className="rounded-lg bg-amber-50 p-4 text-center">
          <div className="text-2xl font-black text-amber-700">₹{totalRevenue.toLocaleString()}</div>
          <div className="mt-1 text-xs font-semibold uppercase text-amber-600">Estimated Revenue Uplift</div>
        </div>
      </div>
    </section>
  );
}


function ActionBrief({ filters }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    setData(null);
    api('/insights', { method: 'POST', body: JSON.stringify(buildApiFilters(filters)) }).then(setData);
  }, [filters]);

  if (!data) return <Loading />;

  const { action_cards: cards = [], top_findings: findings = [] } = data;

  return (
    <div className="space-y-5">
      <HealthScore cards={cards} topFindings={findings} />
      <TopInsights findings={findings} />
      {cards.length > 0 && (
        <section className="chart-card">
          <div className="mb-4 flex items-center gap-2">
            <BarChart2 size={18} className="text-blue-600" />
            <h3 className="font-bold">Executive Action Cards</h3>
            <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {cards.length} friction area{cards.length !== 1 ? 's' : ''} · filter-aware
            </span>
          </div>
          <div className="grid gap-5">
            {cards.map((card) => <ActionCard key={card.kind} card={card} />)}
          </div>
        </section>
      )}
      <CombinedImpact cards={cards} />
    </div>
  );
}

function buildApiFilters(filters) {
  return Object.fromEntries(
    Object.entries(filters).map(([key, filter]) => [
      key,
      filter.value ?? '',
    ])
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [active, setActive] = useState('Dashboard');
  const [metadata, setMetadata] = useState({});
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me').then(setUser).catch(clearToken);
  }, []);
  useEffect(() => {
    if (!user) return;
    api('/metadata').then((m) => {
      setMetadata(m);
      const dateRange = {
        start_date: { label: 'From', value: m.date_min },
        end_date: { label: 'To', value: m.date_max },
      };
      setFilters((f) => ({ ...f, ...dateRange }));
      setAppliedFilters((f) => ({ ...f, ...dateRange }));
    });
  }, [user]);
  useEffect(() => {
    if (!user || !appliedFilters.start_date.value) return;
    const payload = buildApiFilters(appliedFilters);
    api('/analytics/dashboard', { method: 'POST', body: JSON.stringify(payload) }).then(setDashboard);
  }, [user, appliedFilters]);

  const handleApply = () => setAppliedFilters({ ...filters });

  if (!user) return <Login onLogin={setUser} />;
  const logout = () => { clearToken(); setUser(null); };
  return (
    <Shell user={user} onLogout={logout} active={active} setActive={setActive}>
      {active !== 'Journey Explorer' && <FilterBar metadata={metadata} filters={filters} setFilters={setFilters} onRefresh={handleApply} />}
      {active === 'Dashboard' && <Dashboard data={dashboard} filters={appliedFilters} />}
      {active === 'Journey Explorer' && <JourneyExplorer metadata={metadata} />}
      {active === 'Customer Segmentation' && <Segmentation filters={appliedFilters} />}
      {active === 'Root Cause Analysis' && <RootCauses filters={appliedFilters} />}
      {active === 'Business Impact Simulator' && <Simulator filters={appliedFilters} />}
      {active === 'Action Brief' && <ActionBrief filters={appliedFilters} />}
    </Shell>
  );
}

createRoot(document.getElementById('root')).render(<App />);
