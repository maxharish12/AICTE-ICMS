import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Case, SLARule } from '../types';
import { AlertTriangle, Clock, ShieldCheck, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';

export const AlertsDeadlinesPage: React.FC = () => {
  const [overdueCases, setOverdueCases] = useState<Case[]>([]);
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [slaRules, setSlaRules] = useState<SLARule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [casesData, rulesData] = await Promise.all([
        apiRequest<Case[]>('/cases?limit=100'),
        apiRequest<SLARule[]>('/admin/sla-rules'),
      ]);

      const overdue = casesData.filter((c) => c.is_overdue);
      setOverdueCases(overdue);
      setAllCases(casesData);
      setSlaRules(rulesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const approachingCases = allCases.filter(
    (c) => !c.is_overdue && c.days_remaining !== null && c.days_remaining !== undefined && c.days_remaining >= 0 && c.days_remaining <= 5
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="gov-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gov-primary"></span>
              <span className="text-[11px] font-bold text-gov-muted uppercase tracking-widest font-mono">
                SLA & WORKFLOW GOVERNANCE
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gov-text tracking-tight mt-1">
              Statutory SLA & Deadline Monitoring
            </h1>
            <p className="text-xs text-gov-muted max-w-3xl">
              Automated institutional oversight of approaching statutory resolution deadlines and overdue grievances.
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="gov-btn gov-btn-secondary text-xs flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gov-muted ${loading ? 'animate-spin' : ''}`} />
            <span>Recalculate Deadlines</span>
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="gov-card p-5 border-l-4 border-l-gov-critical bg-[#FDF2F2]">
          <div className="flex items-center justify-between text-gov-critical">
            <span className="text-xs font-bold uppercase tracking-wider">Overdue Cases</span>
            <AlertTriangle className="w-5 h-5 text-gov-critical" />
          </div>
          <div className="text-3xl font-extrabold text-gov-critical mt-2 font-mono">{overdueCases.length}</div>
          <p className="text-[11px] text-gov-critical/90 font-medium mt-1">Exceeded statutory SLA duration</p>
        </div>

        <div className="gov-card p-5 border-l-4 border-l-gov-warning bg-[#FFF8EB]">
          <div className="flex items-center justify-between text-gov-warning">
            <span className="text-xs font-bold uppercase tracking-wider">Approaching Deadline</span>
            <Clock className="w-5 h-5 text-gov-warning" />
          </div>
          <div className="text-3xl font-extrabold text-gov-warning mt-2 font-mono">{approachingCases.length}</div>
          <p className="text-[11px] text-gov-warning/90 font-medium mt-1">&le; 5 working days remaining before breach</p>
        </div>

        <div className="gov-card p-5 border-l-4 border-l-gov-primary bg-gov-light">
          <div className="flex items-center justify-between text-gov-dark">
            <span className="text-xs font-bold uppercase tracking-wider">Configured SLA Rules</span>
            <ShieldCheck className="w-5 h-5 text-gov-primary" />
          </div>
          <div className="text-3xl font-extrabold text-gov-dark mt-2 font-mono">{slaRules.length}</div>
          <p className="text-[11px] text-gov-muted font-medium mt-1">Rule 6 compliance: Configured statutory policies</p>
        </div>
      </div>

      {/* Overdue Cases Table */}
      <div className="gov-card overflow-hidden">
        <div className="p-4 bg-[#FDF2F2] border-b border-red-200 flex items-center justify-between">
          <span className="font-bold text-xs text-gov-critical uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gov-critical" />
            Overdue Cases Requiring Statutory Escalation ({overdueCases.length})
          </span>
          <span className="text-[11px] text-gov-critical font-medium">Urgent disposal directive active</span>
        </div>
        <div className="gov-table-container">
          <table className="gov-table">
            <thead>
              <tr className="gov-table-header">
                <th className="min-w-[130px]">Case Ref</th>
                <th className="min-w-[240px]">Institution & Permanent ID</th>
                <th className="min-w-[140px]">Handling Bureau</th>
                <th className="min-w-[140px]">Assigned Officer</th>
                <th className="min-w-[140px]">Status</th>
                <th className="min-w-[130px]">Deadline Date</th>
                <th className="min-w-[140px] text-gov-critical">Overdue Duration</th>
                <th className="min-w-[100px] text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {overdueCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gov-muted font-medium text-xs">
                    No cases are overdue past statutory deadlines.
                  </td>
                </tr>
              ) : (
                overdueCases.map((c) => (
                  <tr key={c.id} className="gov-table-row hover:bg-red-50/40">
                    <td className="font-mono font-bold text-gov-dark text-xs">
                      <Link to={`/cases/${c.id}`} className="hover:underline">{c.case_reference}</Link>
                    </td>
                    <td>
                      <div className="font-semibold text-gov-text text-xs">{c.institution_name}</div>
                      <span className="font-mono text-[11px] text-gov-muted font-medium">{c.permanent_id}</span>
                    </td>
                    <td className="font-semibold text-gov-text text-xs">{c.current_bureau_code}</td>
                    <td className="text-gov-text text-xs">{c.current_officer_name || 'Desk Registry'}</td>
                    <td>
                      <span className="gov-badge-danger font-medium">
                        {c.status}
                      </span>
                    </td>
                    <td className="text-gov-muted font-mono text-xs">
                      {c.applicable_deadline_at ? new Date(c.applicable_deadline_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="font-bold text-gov-critical font-mono text-xs">
                      {c.deadline_status_label}
                    </td>
                    <td className="text-right">
                      <Link to={`/cases/${c.id}`} className="gov-btn gov-btn-secondary text-[11px] py-1 px-2.5 inline-flex items-center gap-1 font-semibold">
                        <span>Expedite</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approaching Deadlines Table */}
      <div className="gov-card overflow-hidden">
        <div className="p-4 bg-[#FFF8EB] border-b border-amber-200 flex items-center justify-between">
          <span className="font-bold text-xs text-gov-warning uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-gov-warning" />
            Approaching Deadlines Within 5 Working Days ({approachingCases.length})
          </span>
          <span className="text-[11px] text-gov-warning font-medium">Priority review recommended</span>
        </div>
        <div className="gov-table-container">
          <table className="gov-table">
            <thead>
              <tr className="gov-table-header">
                <th className="min-w-[130px]">Case Ref</th>
                <th className="min-w-[240px]">Institution & Permanent ID</th>
                <th className="min-w-[140px]">Handling Bureau</th>
                <th className="min-w-[140px]">Status</th>
                <th className="min-w-[130px]">Deadline Date</th>
                <th className="min-w-[140px] text-gov-warning">Days Remaining</th>
                <th className="min-w-[100px] text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {approachingCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gov-muted font-medium text-xs">
                    No cases with deadlines expiring within the next 5 working days.
                  </td>
                </tr>
              ) : (
                approachingCases.map((c) => (
                  <tr key={c.id} className="gov-table-row hover:bg-amber-50/30">
                    <td className="font-mono font-bold text-gov-dark text-xs">
                      <Link to={`/cases/${c.id}`} className="hover:underline">{c.case_reference}</Link>
                    </td>
                    <td>
                      <div className="font-semibold text-gov-text text-xs">{c.institution_name}</div>
                      <span className="font-mono text-[11px] text-gov-muted font-medium">{c.permanent_id}</span>
                    </td>
                    <td className="font-semibold text-gov-text text-xs">{c.current_bureau_code}</td>
                    <td>
                      <span className="gov-badge-warning font-medium">
                        {c.status}
                      </span>
                    </td>
                    <td className="text-gov-muted font-mono text-xs">
                      {c.applicable_deadline_at ? new Date(c.applicable_deadline_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="font-bold text-gov-warning font-mono text-xs">
                      {c.days_remaining} day(s) left
                    </td>
                    <td className="text-right">
                      <Link to={`/cases/${c.id}`} className="gov-btn gov-btn-secondary text-[11px] py-1 px-2.5 inline-flex items-center gap-1 font-semibold">
                        <span>Review</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configurable SLA Rules Table */}
      <div className="gov-card overflow-hidden">
        <div className="gov-card-header p-4 bg-[#FAF9F7] border-b border-gov-border flex items-center justify-between">
          <span className="font-bold text-xs text-gov-text uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gov-primary" />
            Configured AICTE SLA & Target Disposal Framework
          </span>
          <span className="text-[11px] text-gov-dark font-mono bg-gov-light px-2 py-0.5 rounded border border-gov-primary/30">
            Rule 6 Compliance Protocol
          </span>
        </div>
        <div className="gov-table-container">
          <table className="gov-table">
            <thead>
              <tr className="gov-table-header">
                <th className="min-w-[180px]">Rule Designation</th>
                <th className="min-w-[140px]">Competent Bureau</th>
                <th className="min-w-[160px]">Grievance Category</th>
                <th className="min-w-[120px] text-center">Duration</th>
                <th className="min-w-[140px] text-center">Reminder Threshold</th>
                <th className="min-w-[140px] text-center">Escalation Trigger</th>
                <th className="min-w-[100px] text-center">Rule Status</th>
              </tr>
            </thead>
            <tbody>
              {slaRules.map((r) => (
                <tr key={r.id} className="gov-table-row">
                  <td className="font-semibold text-gov-text text-xs">{r.rule_name}</td>
                  <td className="text-gov-text text-xs">{r.bureau_name}</td>
                  <td className="text-gov-text text-xs">{r.category_name}</td>
                  <td className="text-center font-bold text-gov-text text-xs font-mono">{r.duration_days} days</td>
                  <td className="text-center text-gov-muted text-xs font-mono">{r.reminder_threshold_days} days prior</td>
                  <td className="text-center text-gov-muted text-xs font-mono">+{r.escalation_threshold_days} days overdue</td>
                  <td className="text-center">
                    <span className="gov-badge-success text-[10px]">
                      Active Statutory
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

