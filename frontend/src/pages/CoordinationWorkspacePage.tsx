import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { OverlapFlag, CaseSimple, CoordinationDecision } from '../types';
import {
  GitCompare,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Clock,
  ArrowRight,
  UserCheck,
  Building,
  RefreshCw,
  X,
  FileText,
  ExternalLink,
  Filter,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export const CoordinationWorkspacePage: React.FC = () => {
  const { showToast } = useToast();
  const [overlaps, setOverlaps] = useState<OverlapFlag[]>([]);
  const [selectedOverlap, setSelectedOverlap] = useState<OverlapFlag | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  // Filters
  const [collegeIdFilter, setCollegeIdFilter] = useState('');
  const [permanentIdFilter, setPermanentIdFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');

  // Decision Form
  const [actionType, setActionType] = useState('CONFIRM_RELATED');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOverlaps = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (collegeIdFilter.trim()) params.append('college_id', collegeIdFilter.trim());
      if (permanentIdFilter.trim()) params.append('permanent_id', permanentIdFilter.trim());
      if (stateFilter !== 'ALL') params.append('state', stateFilter);

      const data = await apiRequest<OverlapFlag[]>(`/overlaps?${params.toString()}`);
      setOverlaps(data);

      if (data.length > 0) {
        if (!selectedOverlap || !data.some((o) => o.id === selectedOverlap.id)) {
          setSelectedOverlap(data[0]);
        } else {
          const updated = data.find((o) => o.id === selectedOverlap.id);
          if (updated) setSelectedOverlap(updated);
        }
      } else {
        setSelectedOverlap(null);
      }
    } catch (err) {
      console.error('Failed to load overlaps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverlaps();
  }, [collegeIdFilter, permanentIdFilter, stateFilter]);

  const clearFilters = () => {
    setCollegeIdFilter('');
    setPermanentIdFilter('');
    setStateFilter('ALL');
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOverlap) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const updated = await apiRequest<OverlapFlag>(`/overlaps/${selectedOverlap.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          action_type: actionType,
          remarks,
        }),
      });
      setSelectedOverlap(updated);
      setShowDecisionModal(false);
      setRemarks('');
      showToast(
        'success',
        'Coordination Decision Recorded',
        'Decision committed and logged to statutory audit trail.'
      );
      fetchOverlaps();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record coordination decision');
      showToast('error', 'Decision Submission Failed', err.message || 'Failed to record coordination decision');
    } finally {
      setSubmitting(false);
    }
  };

  // Summary Metrics calculations
  const totalOverlaps = overlaps.length;
  const unreviewedOverlaps = overlaps.filter(
    (o) => o.relationship_state === 'POTENTIAL_OVERLAP' || o.relationship_state === 'UNDER_REVIEW'
  ).length;
  const confirmedRelated = overlaps.filter((o) => o.relationship_state === 'CONFIRMED_RELATED').length;
  const dismissedNotRelated = overlaps.filter((o) => o.relationship_state === 'NOT_RELATED').length;
  const multiBureauOverlaps = overlaps.filter((o) => o.involved_bureaus && o.involved_bureaus.length > 1).length;
  const overdueInOverlaps = overlaps.reduce(
    (acc, o) => acc + o.involved_cases.filter((c) => c.is_overdue).length,
    0
  );

  const STATE_BADGES: Record<string, { label: string; color: string }> = {
    POTENTIAL_OVERLAP: { label: 'Potential Overlap', color: 'bg-red-50 text-red-800 border-red-300' },
    UNDER_REVIEW: { label: 'Under Joint Review', color: 'bg-gov-light text-gov-dark border-gov-primary/40' },
    COORDINATION_REQUESTED: { label: 'Coordination Requested', color: 'bg-purple-50 text-purple-800 border-purple-200' },
    CONFIRMED_RELATED: { label: 'Confirmed Related Cases', color: 'bg-[#FFF0E6] text-gov-dark border-gov-primary/50' },
    NOT_RELATED: { label: 'Marked Not Related (Dismissed)', color: 'bg-slate-100 text-gov-muted border-gov-border' },
    JOINT_ACTION_IN_PROGRESS: { label: 'Joint Action In Progress', color: 'bg-amber-50 text-amber-900 border-amber-300' },
    COORDINATION_COMPLETED: { label: 'Coordination Completed', color: 'bg-green-50 text-gov-success border-green-300' },
    ESCALATED: { label: 'Escalated to Supervisor', color: 'bg-red-100 text-red-900 border-red-300' },
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="gov-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-gov-text tracking-tight">
                Overlapping Cases Workspace &bull; Cross-Bureau Coordination
              </h1>
              <span className="bg-gov-light text-gov-dark px-2 py-0.5 rounded text-[10px] font-mono border border-gov-primary/30 font-bold uppercase tracking-wider">
                CORE INNOVATION
              </span>
            </div>
            <p className="text-xs text-gov-muted max-w-3xl">
              Identifies potential overlaps using AICTE Permanent ID and College ID with explainable incident-level scoring. Compare complaints side by side, review reasons, and commit persistent decisions without losing case identities.
            </p>
          </div>
          <button
            onClick={fetchOverlaps}
            disabled={loading}
            className="gov-btn gov-btn-secondary text-xs flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gov-muted ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Workspace</span>
          </button>
        </div>
      </div>

      {/* 2. Mandatory Phase 3.3 Workspace Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white rounded border border-gov-border shadow-gov-sm">
          <span className="text-[10px] font-bold text-gov-muted block uppercase tracking-wider">
            Total Overlaps
          </span>
          <span className="text-2xl font-bold text-gov-text font-mono mt-1 block">{totalOverlaps}</span>
          <span className="text-[10px] text-gov-muted">Flagged groups</span>
        </div>

        <div className="p-3.5 bg-amber-50 rounded border border-amber-200 shadow-gov-sm">
          <span className="text-[10px] font-bold text-amber-900 block uppercase tracking-wider">
            Unreviewed
          </span>
          <span className="text-2xl font-bold text-amber-900 font-mono mt-1 block">
            {unreviewedOverlaps}
          </span>
          <span className="text-[10px] text-amber-700">Pending officer ruling</span>
        </div>

        <div className="p-3.5 bg-[#FFF0E6] rounded border border-gov-primary/40 shadow-gov-sm">
          <span className="text-[10px] font-bold text-gov-dark block uppercase tracking-wider">
            Confirmed Related
          </span>
          <span className="text-2xl font-bold text-gov-dark font-mono mt-1 block">
            {confirmedRelated}
          </span>
          <span className="text-[10px] text-gov-dark/80">Joint findings confirmed</span>
        </div>

        <div className="p-3.5 bg-slate-50 rounded border border-slate-200 shadow-gov-sm">
          <span className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider">
            Dismissed / Unrelated
          </span>
          <span className="text-2xl font-bold text-slate-700 font-mono mt-1 block">
            {dismissedNotRelated}
          </span>
          <span className="text-[10px] text-slate-500">Ruled independent</span>
        </div>

        <div className="p-3.5 bg-blue-50 rounded border border-blue-200 shadow-gov-sm">
          <span className="text-[10px] font-bold text-blue-900 block uppercase tracking-wider">
            Multi-Bureau
          </span>
          <span className="text-2xl font-bold text-blue-900 font-mono mt-1 block">
            {multiBureauOverlaps}
          </span>
          <span className="text-[10px] text-blue-700">Involves 2+ cells</span>
        </div>

        <div className="p-3.5 bg-red-50 rounded border border-red-200 shadow-gov-sm">
          <span className="text-[10px] font-bold text-red-700 block uppercase tracking-wider">
            Overdue Cases
          </span>
          <span className="text-2xl font-bold text-red-700 font-mono mt-1 block">
            {overdueInOverlaps}
          </span>
          <span className="text-[10px] text-red-600">Within flagged groups</span>
        </div>
      </div>

      {/* 3. Workspace Identifier & State Filter Bar */}
      <div className="gov-card p-4 space-y-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-gov-border">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gov-primary" />
            <span className="font-bold text-gov-text uppercase tracking-wide">
              Filter Overlapping Cases
            </span>
          </div>
          {(collegeIdFilter.trim() || permanentIdFilter.trim() || stateFilter !== 'ALL') && (
            <button
              onClick={clearFilters}
              className="text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gov-muted uppercase mb-1">
              Filter by Internal College ID
            </label>
            <input
              type="text"
              placeholder="e.g. CLG-1001"
              value={collegeIdFilter}
              onChange={(e) => setCollegeIdFilter(e.target.value)}
              className="gov-input text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gov-muted uppercase mb-1">
              Filter by AICTE Permanent ID
            </label>
            <input
              type="text"
              placeholder="e.g. DEMO-AICTE-001"
              value={permanentIdFilter}
              onChange={(e) => setPermanentIdFilter(e.target.value)}
              className="gov-input text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gov-muted uppercase mb-1">
              Review Status
            </label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="gov-select text-xs w-full"
            >
              <option value="ALL">All Review Statuses</option>
              <option value="POTENTIAL_OVERLAP">POTENTIAL_OVERLAP (Unreviewed)</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW (In Scrutiny)</option>
              <option value="CONFIRMED_RELATED">CONFIRMED_RELATED (Confirmed)</option>
              <option value="NOT_RELATED">NOT_RELATED (Marked Independent)</option>
              <option value="COORDINATION_REQUESTED">COORDINATION_REQUESTED</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List of Overlap Flags */}
        <div className="gov-card flex flex-col h-[700px] overflow-hidden">
          <div className="gov-card-header p-4 bg-slate-50/80 border-b border-gov-border flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-gov-primary" />
              Flagged Overlap Groups
            </span>
            <span className="gov-badge-neutral font-bold">{overlaps.length} Active</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1 p-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-gov-primary mb-2"></div>
                <p>Scanning institutional dockets...</p>
              </div>
            ) : overlaps.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No active cross-bureau institutional overlaps match the current filter.
              </div>
            ) : (
              overlaps.map((ov) => {
                const isSelected = selectedOverlap?.id === ov.id;
                const badge = STATE_BADGES[ov.relationship_state] || {
                  label: ov.relationship_state,
                  color: 'bg-slate-100 text-gov-muted border-gov-border',
                };
                return (
                  <div
                    key={ov.id}
                    onClick={() => setSelectedOverlap(ov)}
                    className={`p-3.5 rounded-md hover:bg-gov-light/40 cursor-pointer transition-all text-xs mb-1 ${
                      isSelected
                        ? 'bg-gov-light border border-gov-primary shadow-gov-sm'
                        : 'border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-gov-dark text-[11px] bg-white px-1.5 py-0.5 rounded border border-gov-border">
                          AICTE: {ov.permanent_id || 'Not Available'}
                        </span>
                        {ov.college_id && (
                          <span className="font-mono text-slate-700 text-[10px] bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                            {ov.college_id}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="font-bold text-gov-text line-clamp-1 text-xs">{ov.institution_name}</div>
                    
                    <div className="text-[11px] text-gov-muted mt-2 flex items-center gap-1.5 flex-wrap">
                      <span>Bureaus: <strong className="text-gov-text">{ov.involved_bureaus.join(' & ')}</strong></span>
                      <span>&bull;</span>
                      <span>Cases: <strong className="text-gov-text">{ov.involved_cases.length}</strong></span>
                      <span>&bull;</span>
                      <span className="font-mono text-orange-800 font-bold">
                        {Math.round((ov.confidence_score || 0.85) * 100)}% match
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail & Coordination Panel */}
        <div className="lg:col-span-2 space-y-6">
          {selectedOverlap ? (
            <>
              {/* STATUTORY OVERLAP ADVISORY BANNER */}
              <div className="p-5 rounded-lg border-2 border-gov-primary bg-[#FFF4E8] shadow-gov-sm">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-md bg-gov-primary text-white shrink-0 mt-0.5 shadow-gov-sm">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-white text-gov-dark rounded border border-gov-primary/30">
                          STATUTORY OVERLAP ADVISORY &bull; PS-264
                        </span>
                        <span className="text-xs font-mono font-bold text-gov-dark">
                          AICTE ID: {selectedOverlap.permanent_id || 'Not Available'}
                        </span>
                        {selectedOverlap.college_id && (
                          <span className="text-xs font-mono font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            College ID: {selectedOverlap.college_id}
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded border border-red-200">
                          {Math.round((selectedOverlap.confidence_score || 0.85) * 100)}% Confidence Score
                        </span>
                      </div>

                      <h2 className="text-sm font-bold text-gov-dark tracking-tight">
                        POTENTIAL OVERLAPPING CASES — MANDATORY INTER-BUREAU COORDINATION
                      </h2>

                      {/* Explainable Detection Reason */}
                      <div className="p-2.5 bg-white/90 rounded border border-orange-200 text-xs text-gov-text leading-relaxed">
                        <strong className="text-gov-dark block mb-0.5">Detection Reason:</strong>
                        {selectedOverlap.detection_reason}
                      </div>

                      <div className="pt-1 text-xs text-gov-text font-medium flex items-center gap-2">
                        <span>Target Institution: <strong>{selectedOverlap.institution_name}</strong></span>
                        <span>&bull;</span>
                        <span>Region: <strong>{selectedOverlap.institution_region}</strong></span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowDecisionModal(true)}
                    className="gov-btn gov-btn-primary shrink-0 text-xs flex items-center gap-1.5 self-end sm:self-center cursor-pointer"
                  >
                    <span>Record Joint Decision</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Side-by-Side Comparison of Overlapping Cases */}
              <div className="gov-card p-5 space-y-4">
                <div className="gov-card-header flex items-center justify-between pb-3">
                  <h3 className="text-xs font-bold text-gov-text uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gov-primary" />
                    Side-by-Side Case File Comparison ({selectedOverlap.involved_cases.length} Concurrently Handled)
                  </h3>
                  <span className="text-[11px] text-gov-muted font-medium">
                    Independent dockets preserved without destructive merging
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedOverlap.involved_cases.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-lg border border-gov-border bg-[#FAF9F7] space-y-3 text-xs flex flex-col justify-between hover:border-gov-primary/50 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-gov-dark text-xs bg-white px-2 py-0.5 rounded border border-gov-border">
                            {c.case_reference}
                          </span>
                          <span className="gov-badge gov-badge-info font-bold">
                            {c.current_bureau_name}
                          </span>
                        </div>

                        <h4 className="font-bold text-gov-text text-sm leading-snug">{c.title}</h4>

                        <div className="p-2.5 bg-white rounded border border-gov-border space-y-1.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-gov-muted">Discipline / Category:</span>
                            <span className="font-semibold text-gov-text">{c.category || 'General Grievance'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gov-muted">Current Status:</span>
                            <span className="font-semibold text-gov-text">{c.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gov-muted">Assigned Officer:</span>
                            <span className="font-semibold text-gov-text">{c.assigned_officer_name || 'Desk Registry'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gov-muted">Priority:</span>
                            <span className="font-bold text-gov-dark">{c.priority}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gov-muted">SLA Deadline:</span>
                            <span className={c.is_overdue ? 'font-bold text-red-600' : 'text-gov-text'}>
                              {c.is_overdue ? 'OVERDUE' : 'Within statutory limit'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gov-border flex justify-end">
                        <Link
                          to={`/cases/${c.id}`}
                          className="gov-btn-primary py-1 px-3 text-[11px] flex items-center gap-1"
                        >
                          <span>Open Full Dossier</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Official Review History & Statutory Audit Trail */}
              <div className="gov-card p-5">
                <div className="gov-card-header pb-3 mb-3 border-b border-gov-border flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gov-text uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gov-primary" />
                    Inter-Bureau Adjudication History &amp; Audit Trail
                  </h3>
                  <span className="text-[11px] text-gov-muted">
                    Persistent rulings commit to permanent record
                  </span>
                </div>

                <div className="space-y-3 divide-y divide-gov-border">
                  {selectedOverlap.decisions.length === 0 ? (
                    <div className="text-gov-muted py-6 text-center text-xs">
                      No formal coordination rulings recorded yet. Potential overlap awaiting inter-bureau joint review.
                    </div>
                  ) : (
                    selectedOverlap.decisions.map((dec) => (
                      <div key={dec.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-bold text-gov-text text-xs bg-gov-light px-2 py-0.5 rounded border border-gov-primary/30">
                            {dec.action_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] text-gov-muted font-mono">
                            {new Date(dec.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gov-text mt-2 text-xs leading-relaxed bg-[#FAF9F7] p-2.5 rounded border border-gov-border">
                          {dec.remarks}
                        </p>
                        <div className="text-[11px] text-gov-muted mt-1.5 flex items-center gap-2">
                          <UserCheck className="w-3 h-3 text-gov-muted" />
                          <span>
                            Adjudicated by: <strong className="text-gov-text">{dec.performed_by_name || 'Designated Bureau Coordinator'}</strong>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="gov-card p-12 text-center text-gov-muted text-xs">
              Select an institutional overlap from the registry on the left to inspect case dossiers.
            </div>
          )}
        </div>
      </div>

      {/* Coordination Decision Modal */}
      {showDecisionModal && selectedOverlap && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-gov-modal max-w-lg w-full p-6 border border-gov-border animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gov-border">
              <h3 className="font-bold text-sm text-gov-text uppercase tracking-wide flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-gov-primary" />
                Record Cross-Bureau Coordination Decision
              </h3>
              <button
                onClick={() => setShowDecisionModal(false)}
                className="text-gov-muted hover:text-gov-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-gov-critical text-xs rounded-md">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleDecisionSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gov-text mb-1">
                  Target Institution &amp; Identifiers
                </label>
                <div className="p-2.5 bg-gov-light border border-gov-primary/30 rounded font-semibold text-gov-text text-xs space-y-1">
                  <div>{selectedOverlap.institution_name}</div>
                  <div className="font-mono text-gov-dark text-[11px]">
                    AICTE: {selectedOverlap.permanent_id || 'Not Available'} &bull; College ID: {selectedOverlap.college_id || 'Not Available'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gov-text mb-1">
                  Coordination Action / Adjudication Category *
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="gov-select w-full"
                >
                  <option value="CONFIRM_RELATED">Confirm Related Cases (Coordinate joint inquiry)</option>
                  <option value="MARK_NOT_RELATED">Mark Not Related (Independent unrelated matters)</option>
                  <option value="REVIEW">Review Relationship (Mark as Under Joint Review)</option>
                  <option value="REOPEN">Reopen Review (Re-evaluate previous decision)</option>
                  <option value="REQUEST_COORDINATION">Request Joint Meeting / Scrutiny Session</option>
                  <option value="RECORD_JOINT_ACTION">Record Joint Action in Progress</option>
                  <option value="ESCALATE">Escalate to Bureau Head / Competent Authority</option>
                  <option value="COMPLETE">Coordination Completed &amp; Finalized</option>
                </select>
                <p className="text-[11px] text-gov-muted mt-1">
                  * Note: Recording a relationship preserves both underlying case IDs without destructive merging.
                </p>
              </div>

              <div>
                <label className="block font-bold text-gov-text mb-1">
                  Official Coordination Rationale / Joint Finding *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail the rationale, joint consensus between Bureaus, or reasons why matters are verified independent..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="gov-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gov-border">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(false)}
                  className="gov-btn gov-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="gov-btn gov-btn-primary"
                >
                  {submitting ? 'Recording Decision...' : 'Commit Coordination Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
