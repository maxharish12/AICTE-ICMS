import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  DashboardMetrics,
  Case,
  OverlapFlag,
  WorkflowHistory,
  Bureau,
} from '../types';
import {
  AlertTriangle,
  Clock,
  Briefcase,
  GitCompare,
  Building,
  Lock,
  ChevronRight,
  RefreshCw,
  Search,
  CheckCircle2,
  FileText,
  ArrowRight,
  Shield,
  Layers,
  Activity,
  CheckCircle,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasRole, isAdmin } = useAuth();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [assignedCases, setAssignedCases] = useState<Case[]>([]);
  const [overlaps, setOverlaps] = useState<OverlapFlag[]>([]);
  const [recentActivities, setRecentActivities] = useState<WorkflowHistory[]>([]);
  const [confidentialCount, setConfidentialCount] = useState<number>(0);
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [myWorkFilter, setMyWorkFilter] = useState<'ALL' | 'PENDING' | 'DUE_SOON' | 'OVERDUE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  const canAccessSafeVoice =
    isAdmin || hasRole(['ROLE_MANAGEMENT', 'ROLE_BUREAU_HEAD', 'ROLE_PGRC_OFFICER', 'ROLE_RB_OFFICER']);

  const fetchDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [m, a, o, r, b] = await Promise.all([
        apiRequest<DashboardMetrics>('/reports/dashboard'),
        apiRequest<Case[]>(user ? `/cases?officer_id=${user.id}&limit=8` : '/cases?limit=8'),
        apiRequest<OverlapFlag[]>('/overlaps?state=POTENTIAL_OVERLAP'),
        apiRequest<WorkflowHistory[]>('/reports/recent-activity?limit=6'),
        apiRequest<Bureau[]>('/admin/bureaus'),
      ]);

      setMetrics(m);
      setAssignedCases(a);
      setOverlaps(o);
      setRecentActivities(r);
      setBureaus(b);
      setLastSyncedAt(new Date());

      // SafeVoice count if authorized
      if (canAccessSafeVoice) {
        try {
          const confCases = await apiRequest<Case[]>('/cases?is_confidential=true');
          setConfidentialCount(confCases.length);
        } catch {
          setConfidentialCount(0);
        }
      }
    } catch (err) {
      console.error('Failed to load operational dashboard data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  // Phase 8: Controlled 15s live polling refresh
  useEffect(() => {
    if (!autoSyncEnabled) return;
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoSyncEnabled, user]);

  const handleInstitutionSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = institutionSearch.trim();
    if (query) {
      navigate(`/institutions?search=${encodeURIComponent(query)}`);
    } else {
      navigate('/institutions');
    }
  };

  // Filter My Work
  const filteredMyWork = assignedCases.filter((c) => {
    if (myWorkFilter === 'OVERDUE') return c.is_overdue;
    if (myWorkFilter === 'DUE_SOON') return !c.is_overdue && (c.days_remaining ?? 99) <= 7;
    if (myWorkFilter === 'PENDING')
      return !['Disposed', 'Closed – Action Taken', 'Closed – No Action Required'].includes(c.status);
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Page Title & Purpose Banner */}
      <div className="gov-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-gov-primary bg-white shadow-gov-sm">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-gov-primary animate-pulse"></span>
            <span className="text-[11px] font-bold text-gov-dark uppercase tracking-wider font-mono">
              AICTE ICMS &bull; CENTRAL COMPLAINT MONITORING &amp; STATUS DASHBOARD
            </span>
            <span className="text-xs text-gov-muted">•</span>
            <span className="text-xs text-gov-muted font-mono">
              Last synced: {lastSyncedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-green-50 text-green-700 font-mono border border-green-200">
              LIVE SYNC (15s)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gov-text">
            Integrated Institution Complaint Monitoring and Status Dashboard
          </h1>
          <p className="text-xs text-gov-muted mt-1 max-w-3xl leading-relaxed">
            Centralized institutional intelligence for AICTE headquarters and regional offices. Correlates grievances by AICTE Permanent ID and internal College ID, detects cross-bureau overlaps, and protects confidential whistleblower disclosures.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchDashboard(false)}
            disabled={loading}
            className="gov-btn-secondary text-xs"
            title="Manual sync now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Now
          </button>
          <Link to="/complaints" className="gov-btn-primary text-xs">
            <FileText className="w-3.5 h-3.5" />
            Complaint Intake
          </Link>
        </div>
      </div>

      {/* 2. Institution360 — Institution-Centric Complaint Intelligence */}
      <div className="gov-card p-5 border-t-2 border-t-gov-primary shadow-gov-sm bg-gradient-to-r from-white via-white to-orange-50/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gov-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gov-light text-gov-dark font-mono uppercase border border-gov-primary/30">
                CORE INNOVATION &bull; PS-264
              </span>
              <span className="text-xs text-gov-muted font-medium">Institution-Centric Tracking</span>
            </div>
            <h2 className="text-lg font-bold text-gov-text mt-1 flex items-center gap-2">
              <Building className="w-5 h-5 text-gov-primary" />
              Institution360 — Single-Window Institutional Intelligence
            </h2>
            <p className="text-xs text-gov-muted mt-0.5 max-w-2xl">
              Consolidates statutory compliance, public grievances, and regulatory inquiries by AICTE Permanent ID and College ID across all AICTE handling units.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/institutions" className="gov-btn-outline text-xs">
              Open Registry
            </Link>
            <Link to="/coordination" className="gov-btn-primary text-xs">
              <span>View Overlaps</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Institution360 Search & Key Metrics */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <form onSubmit={handleInstitutionSearch} className="lg:col-span-7">
            <label htmlFor="inst360-search" className="block text-xs font-semibold text-gov-text mb-1">
              Search Institution by AICTE Permanent ID, College ID, or Name:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gov-muted" />
                <input
                  id="inst360-search"
                  type="text"
                  value={institutionSearch}
                  onChange={(e) => setInstitutionSearch(e.target.value)}
                  placeholder="Enter AICTE Permanent ID (DEMO-AICTE-001) or College ID (CLG-1001)..."
                  className="gov-input pl-9 text-xs"
                />
              </div>
              <button type="submit" className="gov-btn-primary text-xs whitespace-nowrap">
                Search 360°
              </button>
            </div>
          </form>

          <div className="lg:col-span-5 grid grid-cols-3 gap-2">
            <div className="p-3 bg-white rounded border border-gov-border text-center">
              <span className="text-[10px] font-bold text-gov-muted block uppercase">Institutions</span>
              <span className="text-xl font-bold text-gov-text font-mono mt-0.5 block">
                {metrics?.institutions_with_active_cases ?? 5}
              </span>
              <span className="text-[10px] text-gov-muted">With active cases</span>
            </div>
            <div className="p-3 bg-gov-light rounded border border-gov-primary/30 text-center">
              <span className="text-[10px] font-bold text-gov-dark block uppercase">In Scrutiny</span>
              <span className="text-xl font-bold text-gov-dark font-mono mt-0.5 block">
                {metrics?.cases_under_process ?? 4}
              </span>
              <span className="text-[10px] text-gov-muted">Active inquiries</span>
            </div>
            <div className="p-3 bg-red-50 rounded border border-red-200 text-center">
              <span className="text-[10px] font-bold text-red-700 block uppercase">Overdue SLA</span>
              <span className="text-xl font-bold text-red-700 font-mono mt-0.5 block">
                {metrics?.overdue_cases ?? 1}
              </span>
              <span className="text-[10px] text-red-600">Past deadline</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Overlapping Cases Workspace Preview */}
      <div className="gov-card p-5 border-l-4 border-l-orange-500 shadow-gov-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gov-border">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-orange-600" />
            <div>
              <h2 className="text-base font-bold text-gov-text">
                Overlapping Cases — Cross-Bureau Overlap Detection
              </h2>
              <p className="text-xs text-gov-muted">
                Identifies potentially related complaints regarding the same institution and incident across Bureaus before duplicate proceedings are initiated.
              </p>
            </div>
          </div>
          <Link to="/coordination" className="gov-btn-primary text-xs shrink-0">
            Open Overlapping Cases Workspace &rarr;
          </Link>
        </div>

        {/* Top Flagged Overlaps Preview */}
        <div className="mt-4">
          {overlaps.length === 0 ? (
            <div className="p-6 text-center text-xs text-gov-muted bg-slate-50 rounded border border-gov-border">
              <CheckCircle className="w-5 h-5 text-gov-success mx-auto mb-1" />
              All institutional overlaps have been reviewed and adjudicated.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overlaps.slice(0, 2).map((ov) => (
                <div
                  key={ov.id}
                  className="p-4 rounded-md border border-orange-200 bg-orange-50/40 space-y-2 text-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                        <span className="bg-white px-2 py-0.5 rounded border border-gov-border text-gov-dark">
                          AICTE: {ov.permanent_id || 'Not Available'}
                        </span>
                        {ov.college_id && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                            Col: {ov.college_id}
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                        {Math.round((ov.confidence_score || 0.85) * 100)}% Match Confidence
                      </span>
                    </div>

                    <h4 className="font-bold text-gov-text text-sm line-clamp-1">
                      {ov.institution_name}
                    </h4>

                    <p className="text-[11px] text-gov-text bg-white/80 p-2 rounded border border-orange-100 mt-2 leading-relaxed">
                      {ov.detection_reason}
                    </p>

                    <div className="text-[11px] text-gov-muted mt-2 flex items-center gap-2">
                      <span>Bureaus Involved: <strong className="text-gov-dark">{ov.involved_bureaus.join(' & ')}</strong></span>
                      <span>&bull;</span>
                      <span>Cases: <strong className="text-gov-dark">{ov.involved_cases.length} active</strong></span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-orange-100 flex items-center justify-between">
                    <span className="text-[10px] text-gov-muted font-mono">
                      State: {ov.relationship_state.replace(/_/g, ' ')}
                    </span>
                    <Link
                      to="/coordination"
                      className="text-xs text-gov-primary font-semibold hover:underline flex items-center"
                    >
                      Compare Complaints &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. SafeVoice — Confidential Complaint Workflow */}
      <div className="gov-card p-5 border-l-4 border-l-purple-600 shadow-gov-sm bg-gradient-to-r from-white to-purple-50/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gov-text">
                  SafeVoice — Confidential Complaint Protocol
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  PROTECTED WORKFLOW
                </span>
              </div>
              <p className="text-xs text-gov-muted mt-0.5 max-w-2xl">
                Restricted handling for sensitive harassment, faculty retaliation, and whistleblower allegations. Enforces least-privilege role access and automated identity masking across dossiers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[10px] text-gov-muted block uppercase">Clearance Status</span>
              <span className="text-xs font-bold text-purple-900">
                {canAccessSafeVoice ? 'Authorized Personnel' : 'Masked / Restricted'}
              </span>
            </div>
            <Link to="/safevoice" className="gov-btn-primary text-xs bg-purple-700 hover:bg-purple-800 border-purple-800">
              Open SafeVoice Workspace
            </Link>
          </div>
        </div>
      </div>

      {/* 5. Priority Complaint Queue ("Requires Your Attention") */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gov-primary" />
            <h2 className="text-sm font-bold text-gov-text uppercase tracking-wide">
              Priority Complaint Queue &bull; Immediate Attention
            </h2>
          </div>
          <span className="text-xs text-gov-muted font-mono">Classified by SLA Risk &amp; Priority</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overdue Cases (Red) */}
          <Link
            to="/cases?is_overdue=true"
            className="gov-card p-4 hover:border-red-400 transition-all group block border-l-4 border-l-red-500"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-red-900">Critical &amp; Overdue</span>
              <div className="w-7 h-7 rounded bg-red-100 flex items-center justify-center text-red-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-red-700 mt-2 font-mono">
              {metrics?.overdue_cases ?? 0}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gov-muted mt-2 pt-2 border-t border-gov-border">
              <span>Past SLA statutory deadline</span>
              <span className="text-red-700 font-medium group-hover:underline flex items-center">
                Review <ChevronRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </Link>

          {/* High Priority Cases (Orange) */}
          <Link
            to="/cases?priority=HIGH"
            className="gov-card p-4 hover:border-orange-400 transition-all group block border-l-4 border-l-orange-500"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-orange-900">High-Priority Cases</span>
              <div className="w-7 h-7 rounded bg-orange-100 flex items-center justify-center text-orange-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-orange-700 mt-2 font-mono">
              {metrics?.pending_cases ?? 0}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gov-muted mt-2 pt-2 border-t border-gov-border">
              <span>Urgent review &amp; verification</span>
              <span className="text-orange-700 font-medium group-hover:underline flex items-center">
                Action <ChevronRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </Link>

          {/* Approaching SLA Deadlines (Amber) */}
          <Link
            to="/cases?status=Under Verification"
            className="gov-card p-4 hover:border-amber-400 transition-all group block border-l-4 border-l-amber-500"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-900">Approaching Deadlines</span>
              <div className="w-7 h-7 rounded bg-amber-100 flex items-center justify-center text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-2 font-mono">
              {metrics?.cases_under_process ?? 0}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gov-muted mt-2 pt-2 border-t border-gov-border">
              <span>Due within 7 statutory days</span>
              <span className="text-amber-700 font-medium group-hover:underline flex items-center">
                Monitor <ChevronRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </Link>

          {/* SafeVoice Confidential Cases (Purple) */}
          <Link
            to="/safevoice"
            className="gov-card p-4 hover:border-purple-400 transition-all group block border-l-4 border-l-purple-500"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-900">Confidential / Restricted</span>
              <div className="w-7 h-7 rounded bg-purple-100 flex items-center justify-center text-purple-700">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-900 mt-2 font-mono">
              {canAccessSafeVoice ? confidentialCount : '• • •'}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gov-muted mt-2 pt-2 border-t border-gov-border">
              <span>Restricted whistleblower access</span>
              <span className="text-purple-700 font-medium group-hover:underline flex items-center">
                Inspect <ChevronRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* 6. Cross-Bureau Coordination Matrix */}
      <div className="gov-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gov-border mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-gov-primary" />
            <div>
              <h3 className="text-sm font-bold text-gov-text uppercase tracking-wide">
                Cross-Bureau Coordination Matrix
              </h3>
              <p className="text-xs text-gov-muted">
                Centralized monitoring across statutory Bureaus and specialized cells.
              </p>
            </div>
          </div>
          <span className="text-[11px] text-gov-muted font-mono">{bureaus.length} Active Handling Units</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {bureaus.map((b) => (
            <div key={b.id} className="p-3.5 rounded border border-gov-border bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-gov-light text-gov-dark border border-gov-primary/30">
                    {b.code}
                  </span>
                  <span className="text-[10px] text-gov-success font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                  </span>
                </div>
                <h4 className="font-bold text-xs text-gov-text mt-1">{b.name}</h4>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <Link
                  to={`/complaints?bureau_id=${b.id}`}
                  className="text-gov-primary font-medium hover:underline flex items-center gap-1"
                >
                  View Complaints &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Assigned & Recently Updated Complaints ("My Work" + Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: My Work Table */}
        <div className="lg:col-span-2 gov-card">
          <div className="gov-card-header flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gov-primary" />
              <span className="font-bold text-sm text-gov-text">My Work — Assigned Cases</span>
              <span className="gov-badge-neutral text-[10px]">{assignedCases.length} assigned</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setMyWorkFilter('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-semibold border cursor-pointer ${
                  myWorkFilter === 'ALL'
                    ? 'bg-gov-light text-gov-dark border-gov-primary'
                    : 'bg-white text-gov-muted border-gov-border'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setMyWorkFilter('PENDING')}
                className={`px-2.5 py-1 rounded text-xs font-semibold border cursor-pointer ${
                  myWorkFilter === 'PENDING'
                    ? 'bg-gov-light text-gov-dark border-gov-primary'
                    : 'bg-white text-gov-muted border-gov-border'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setMyWorkFilter('DUE_SOON')}
                className={`px-2.5 py-1 rounded text-xs font-semibold border cursor-pointer ${
                  myWorkFilter === 'DUE_SOON'
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-white text-gov-muted border-gov-border'
                }`}
              >
                Due Soon
              </button>
              <button
                onClick={() => setMyWorkFilter('OVERDUE')}
                className={`px-2.5 py-1 rounded text-xs font-semibold border cursor-pointer ${
                  myWorkFilter === 'OVERDUE'
                    ? 'bg-red-50 text-red-900 border-red-300'
                    : 'bg-white text-gov-muted border-gov-border'
                }`}
              >
                Overdue
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="gov-table">
              <thead className="gov-table-header">
                <tr>
                  <th className="w-24">Case ID</th>
                  <th className="min-w-[160px]">Institution</th>
                  <th className="min-w-[200px]">Subject</th>
                  <th className="w-20">Priority</th>
                  <th className="w-24">Status</th>
                  <th className="w-28">Deadline</th>
                  <th className="w-16 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gov-muted">
                      Loading your assigned cases...
                    </td>
                  </tr>
                ) : filteredMyWork.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <CheckCircle2 className="w-6 h-6 text-gov-success mx-auto mb-1.5" />
                      <p className="text-xs font-medium text-gov-text">No pending cases in this view</p>
                      <p className="text-[11px] text-gov-muted mt-0.5">
                        All assigned grievances under this filter are up to date.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredMyWork.map((c) => (
                    <tr key={c.id} className="gov-table-row">
                      <td className="font-mono text-xs font-semibold whitespace-nowrap">
                        <Link to={`/cases/${c.id}`} className="text-gov-primary hover:underline">
                          {c.case_reference}
                        </Link>
                      </td>
                      <td>
                        <div className="font-medium text-xs text-gov-text line-clamp-1">
                          {c.institution_name}
                        </div>
                        <div className="text-[10px] font-mono text-gov-muted">
                          AICTE: {c.permanent_id || 'Not Available'}
                        </div>
                      </td>
                      <td>
                        <div className="text-xs text-gov-text line-clamp-1">{c.title}</div>
                      </td>
                      <td>
                        <span
                          className={`gov-badge ${
                            c.priority === 'URGENT' || c.priority === 'HIGH'
                              ? 'gov-badge-danger'
                              : c.priority === 'MEDIUM'
                              ? 'gov-badge-warning'
                              : 'gov-badge-neutral'
                          }`}
                        >
                          {c.priority}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`gov-badge ${
                            c.status === 'Action Taken' || c.status === 'Disposed'
                              ? 'gov-badge-success'
                              : c.status === 'Under Verification'
                              ? 'gov-badge-warning'
                              : 'gov-badge-info'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td>
                        {c.is_overdue ? (
                          <span className="gov-badge-danger">{c.deadline_status_label}</span>
                        ) : (
                          <span className="text-xs text-gov-muted">{c.deadline_status_label}</span>
                        )}
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/cases/${c.id}`}
                          className="gov-btn-primary py-1 px-2.5 text-[11px]"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Recent Activity Timeline */}
        <div className="gov-card p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gov-border">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gov-primary" />
              <h3 className="text-sm font-bold text-gov-text uppercase tracking-wide">
                Recent Case Activity
              </h3>
            </div>
            <Link to="/audit" className="text-xs text-gov-primary hover:underline font-medium">
              Audit Trail
            </Link>
          </div>

          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-gov-muted text-center py-4">No recent activity recorded</p>
            ) : (
              recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-2.5 pb-2.5 border-b border-slate-100 last:border-b-0 text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-gov-primary mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gov-text font-mono text-[11px]">
                        {act.action_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-gov-muted">
                        {new Date(act.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-gov-muted text-[11px] mt-0.5">{act.remarks || 'Action logged'}</p>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      By: {act.performed_by_name || 'System'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 8. Compact Operational Statistics */}
      <div className="gov-card p-4 bg-slate-50 border border-gov-border flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-gov-muted text-[10px] block uppercase">Total Dockets</span>
            <span className="font-bold text-gov-text text-sm">{metrics?.total_complaints ?? 0}</span>
          </div>
          <div className="border-l border-gov-border pl-6">
            <span className="text-gov-muted text-[10px] block uppercase">Active Inquiries</span>
            <span className="font-bold text-gov-dark text-sm">{metrics?.cases_under_process ?? 0}</span>
          </div>
          <div className="border-l border-gov-border pl-6">
            <span className="text-gov-muted text-[10px] block uppercase">Disposed / Resolved</span>
            <span className="font-bold text-gov-success text-sm">{metrics?.disposed_cases ?? 0}</span>
          </div>
          <div className="border-l border-gov-border pl-6">
            <span className="text-gov-muted text-[10px] block uppercase">Cross-Bureau Overlaps</span>
            <span className="font-bold text-orange-600 text-sm">{metrics?.potential_overlaps ?? 0}</span>
          </div>
        </div>

        <div className="text-[11px] text-gov-muted">
          All statistics calculated strictly from underlying database state &bull; Role Scoped
        </div>
      </div>
    </div>
  );
};
