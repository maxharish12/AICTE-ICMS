import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Case, DashboardMetrics } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ShieldAlert,
  Lock,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  FileText,
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const SafeVoicePage: React.FC = () => {
  const { user, hasRole, isAdmin } = useAuth();
  const toast = useToast();

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedMilestone, setSelectedMilestone] = useState('ALL');

  const canAccessConfidential =
    isAdmin || hasRole(['ROLE_MANAGEMENT', 'ROLE_BUREAU_HEAD', 'ROLE_PGRC_OFFICER', 'ROLE_RB_OFFICER']);

  const fetchSafeVoiceCases = async () => {
    setLoading(true);
    try {
      // Query cases with is_confidential=true
      const data = await apiRequest<Case[]>('/cases?is_confidential=true');
      setCases(data);
    } catch (err: any) {
      toast.error('Failed to load SafeVoice records', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSafeVoiceCases();
  }, []);

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      search === '' ||
      c.case_reference.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.institution_name.toLowerCase().includes(search.toLowerCase()) ||
      c.permanent_id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate procedural milestones
  const activeCount = cases.filter(
    (c) => !['Disposed', 'Closed – Action Taken', 'Closed – No Action Required'].includes(c.status)
  ).length;
  const overdueCount = cases.filter((c) => c.is_overdue).length;
  const underVerificationCount = cases.filter((c) => c.status === 'Under Verification').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="gov-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-gov-primary">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-gov-primary"></span>
            <span className="text-[11px] font-bold text-gov-dark uppercase tracking-wider font-mono">
              CONFIDENTIAL GRIEVANCE WORKSPACE
            </span>
            <span className="gov-badge-confidential flex items-center gap-1 text-[10px]">
              <Lock className="w-3 h-3 text-slate-500" /> RESTRICTED ACCESS
            </span>
          </div>
          <h1 className="text-xl font-bold text-gov-text">SafeVoice — Confidential Complaint Handling</h1>
          <p className="text-xs text-gov-muted mt-1 max-w-3xl">
            Specialized administrative workflow for high-sensitivity grievances, whistleblower disclosures, and
            protected institutional inquiries. Enforces strict role-based isolation, protected notifications, and
            procedural milestone tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSafeVoiceCases}
            disabled={loading}
            className="gov-btn-secondary"
            title="Refresh records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/complaints/new" className="gov-btn-primary">
            <ShieldAlert className="w-3.5 h-3.5" />
            File Confidential Case
          </Link>
        </div>
      </div>

      {/* Protocol & Governance Explanation Banner */}
      <div className="bg-white border border-gov-border rounded-md p-4 shadow-gov-card">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gov-light flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4 text-gov-dark" />
          </div>
          <div className="flex-1">
            <h3 className="text-xs font-semibold text-gov-text">SafeVoice Confidential Handling Protocols</h3>
            <p className="text-[11px] text-gov-muted mt-0.5 leading-relaxed">
              Every complaint tagged as <strong>CONFIDENTIAL</strong> operates under least-privilege security controls.
              Complainant identity is masked in public registries, attachments require explicit security clearance,
              and cross-bureau overlap detection preserves institution-level links without disclosing protected case
              merits to unauthorized officers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gov-border text-xs">
              <div className="flex items-center gap-2 text-gov-text">
                <CheckCircle2 className="w-3.5 h-3.5 text-gov-success shrink-0" />
                <span>End-to-End Cryptographic Session Token Validation</span>
              </div>
              <div className="flex items-center gap-2 text-gov-text">
                <CheckCircle2 className="w-3.5 h-3.5 text-gov-success shrink-0" />
                <span>Masked Complainant Disclosures & Whistleblower Shield</span>
              </div>
              <div className="flex items-center gap-2 text-gov-text">
                <CheckCircle2 className="w-3.5 h-3.5 text-gov-success shrink-0" />
                <span>Configured Milestone Reminders & Audit Trails</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Procedural Milestone Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="gov-card p-4">
          <div className="flex items-center justify-between text-xs text-gov-muted">
            <span className="font-medium">Active Inquiries</span>
            <Lock className="w-4 h-4 text-gov-primary" />
          </div>
          <div className="text-2xl font-bold text-gov-text mt-2">{activeCount}</div>
          <div className="text-[11px] text-gov-muted mt-1">Under confidential scrutiny</div>
        </div>

        <div className="gov-card p-4">
          <div className="flex items-center justify-between text-xs text-gov-muted">
            <span className="font-medium">Verification Stage</span>
            <Clock className="w-4 h-4 text-gov-warning" />
          </div>
          <div className="text-2xl font-bold text-gov-text mt-2">{underVerificationCount}</div>
          <div className="text-[11px] text-gov-muted mt-1">Fact-finding committee review</div>
        </div>

        <div className="gov-card p-4">
          <div className="flex items-center justify-between text-xs text-gov-muted">
            <span className="font-medium">Overdue Milestones</span>
            <AlertTriangle className="w-4 h-4 text-gov-critical" />
          </div>
          <div className="text-2xl font-bold text-gov-critical mt-2">{overdueCount}</div>
          <div className="text-[11px] text-gov-muted mt-1">Exceeding configured SLA threshold</div>
        </div>

        <div className="gov-card p-4">
          <div className="flex items-center justify-between text-xs text-gov-muted">
            <span className="font-medium">Protected Entities</span>
            <Building className="w-4 h-4 text-gov-info" />
          </div>
          <div className="text-2xl font-bold text-gov-text mt-2">
            {new Set(cases.map((c) => c.institution_id)).size}
          </div>
          <div className="text-[11px] text-gov-muted mt-1">Distinct institutions involved</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="gov-card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case ref, title, or institution..."
            className="gov-input pl-8"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-gov-muted">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Status:</span>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="gov-select"
          >
            <option value="ALL">All Statuses</option>
            <option value="Received">Received</option>
            <option value="Under Scrutiny">Under Scrutiny</option>
            <option value="Under Verification">Under Verification</option>
            <option value="Awaiting Response">Awaiting Response</option>
            <option value="Action Taken">Action Taken</option>
            <option value="Disposed">Disposed</option>
          </select>
          {search || selectedStatus !== 'ALL' ? (
            <button
              onClick={() => {
                setSearch('');
                setSelectedStatus('ALL');
              }}
              className="text-xs text-gov-primary hover:underline ml-2"
            >
              Clear Filters
            </button>
          ) : null}
        </div>
      </div>

      {/* Confidential Cases Table */}
      <div className="gov-table-container">
        <table className="gov-table">
          <thead className="gov-table-header">
            <tr>
              <th className="w-32">Case ID</th>
              <th className="min-w-[200px]">Institution & Permanent ID</th>
              <th className="min-w-[260px]">Protected Grievance Subject</th>
              <th className="w-36">Current Handling Bureau</th>
              <th className="w-32">Assigned Officer</th>
              <th className="w-28">Status</th>
              <th className="w-32">Target Deadline</th>
              <th className="w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gov-muted">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-gov-primary" />
                    <span>Loading confidential records...</span>
                  </div>
                </td>
              </tr>
            ) : filteredCases.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10">
                  <div className="max-w-sm mx-auto text-center">
                    <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-xs font-semibold text-gov-text">No Confidential Records Found</h4>
                    <p className="text-[11px] text-gov-muted mt-1">
                      {search || selectedStatus !== 'ALL'
                        ? 'No SafeVoice records matched your current search filters.'
                        : 'No confidential whistleblower complaints are currently pending review.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCases.map((c) => (
                <tr key={c.id} className="gov-table-row">
                  <td className="font-mono text-xs font-semibold text-gov-text whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                      <Link to={`/cases/${c.id}`} className="text-gov-primary hover:underline">
                        {c.case_reference}
                      </Link>
                    </div>
                  </td>
                  <td>
                    <div className="font-medium text-gov-text text-xs">{c.institution_name}</div>
                    <div className="text-[11px] font-mono text-gov-muted">{c.permanent_id}</div>
                  </td>
                  <td>
                    <div className="text-xs font-medium text-gov-text line-clamp-1">{c.title}</div>
                    <div className="text-[11px] text-gov-muted mt-0.5 line-clamp-1">
                      {c.next_action || 'Procedural inquiry in progress'}
                    </div>
                  </td>
                  <td>
                    <span className="gov-badge-neutral">{c.current_bureau_name}</span>
                  </td>
                  <td className="text-xs text-gov-muted">
                    <div className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      <span>{c.current_officer_name || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`gov-badge ${
                        c.status === 'Under Verification'
                          ? 'gov-badge-warning'
                          : c.status === 'Action Taken' || c.status === 'Disposed'
                          ? 'gov-badge-success'
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
                      className="gov-btn-outline py-1 px-2.5 text-[11px]"
                    >
                      <span>Review</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
