import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Case } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  RefreshCw,
  ChevronRight,
  Calendar,
  Building,
  UserCheck,
} from 'lucide-react';

export const MyWorkPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'PENDING' | 'DUE_SOON' | 'OVERDUE' | 'RECENT'>('ALL');
  const [search, setSearch] = useState('');

  const fetchMyCases = async () => {
    setLoading(true);
    try {
      if (!user) return;
      // Fetch cases assigned to the current official
      const data = await apiRequest<Case[]>(`/cases?officer_id=${user.id}`);
      setCases(data);
    } catch (err: any) {
      toast.error('Failed to load assigned cases', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCases();
  }, [user]);

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      search === '' ||
      c.case_reference.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.institution_name.toLowerCase().includes(search.toLowerCase()) ||
      c.permanent_id.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'OVERDUE') return c.is_overdue;
    if (filterType === 'DUE_SOON') return !c.is_overdue && (c.days_remaining ?? 99) <= 7;
    if (filterType === 'PENDING')
      return !['Disposed', 'Closed – Action Taken', 'Closed – No Action Required'].includes(c.status);
    if (filterType === 'RECENT') {
      const updatedDate = new Date(c.last_action_at);
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      return updatedDate >= threeDaysAgo;
    }
    return true;
  });

  const overdueCount = cases.filter((c) => c.is_overdue).length;
  const dueSoonCount = cases.filter((c) => !c.is_overdue && (c.days_remaining ?? 99) <= 7).length;
  const pendingCount = cases.filter(
    (c) => !['Disposed', 'Closed – Action Taken', 'Closed – No Action Required'].includes(c.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="gov-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-gov-primary">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-gov-primary"></span>
            <span className="text-[11px] font-bold text-gov-dark uppercase tracking-wider font-mono">
              OFFICER DESK
            </span>
          </div>
          <h1 className="text-xl font-bold text-gov-text">My Assigned Work</h1>
          <p className="text-xs text-gov-muted mt-1 max-w-2xl">
            Cases specifically allocated to you for grievance scrutiny, fact-finding verification, and official disposal.
          </p>
        </div>

        <button onClick={fetchMyCases} disabled={loading} className="gov-btn-secondary">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Quick Filter Pill Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer transition-colors ${
            filterType === 'ALL'
              ? 'bg-gov-light text-gov-dark border-gov-primary'
              : 'bg-white text-gov-muted border-gov-border hover:bg-slate-50'
          }`}
        >
          All Assigned ({cases.length})
        </button>
        <button
          onClick={() => setFilterType('PENDING')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer transition-colors ${
            filterType === 'PENDING'
              ? 'bg-gov-light text-gov-dark border-gov-primary'
              : 'bg-white text-gov-muted border-gov-border hover:bg-slate-50'
          }`}
        >
          Pending Action ({pendingCount})
        </button>
        <button
          onClick={() => setFilterType('DUE_SOON')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer transition-colors ${
            filterType === 'DUE_SOON'
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-white text-gov-muted border-gov-border hover:bg-slate-50'
          }`}
        >
          Due Soon (≤7d) ({dueSoonCount})
        </button>
        <button
          onClick={() => setFilterType('OVERDUE')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer transition-colors ${
            filterType === 'OVERDUE'
              ? 'bg-red-50 text-red-900 border-red-300'
              : 'bg-white text-gov-muted border-gov-border hover:bg-slate-50'
          }`}
        >
          Overdue ({overdueCount})
        </button>
        <button
          onClick={() => setFilterType('RECENT')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer transition-colors ${
            filterType === 'RECENT'
              ? 'bg-gov-light text-gov-dark border-gov-primary'
              : 'bg-white text-gov-muted border-gov-border hover:bg-slate-50'
          }`}
        >
          Updated Recently
        </button>
      </div>

      {/* Search Input */}
      <div className="gov-card p-3.5 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by complaint ID, title, or institution name..."
          className="w-full text-xs text-gov-text outline-none placeholder:text-slate-400 bg-transparent"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-gov-muted hover:text-gov-text mr-1">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="gov-table-container">
        <table className="gov-table">
          <thead className="gov-table-header">
            <tr>
              <th className="w-32">Case ID</th>
              <th className="min-w-[200px]">Institution</th>
              <th className="min-w-[250px]">Subject & Immediate Next Action</th>
              <th className="w-28">Priority</th>
              <th className="w-32">Status</th>
              <th className="w-36">SLA Deadline</th>
              <th className="w-32">Last Updated</th>
              <th className="w-24 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gov-muted">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-gov-primary" />
                    <span>Loading your assigned workload...</span>
                  </div>
                </td>
              </tr>
            ) : filteredCases.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-xs font-semibold text-gov-text">No cases matching filter criteria</h4>
                  <p className="text-[11px] text-gov-muted mt-1">
                    {filterType === 'OVERDUE'
                      ? 'No overdue cases currently assigned to you.'
                      : 'You have no active cases matching the current criteria.'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredCases.map((c) => (
                <tr key={c.id} className="gov-table-row">
                  <td className="font-mono text-xs font-semibold whitespace-nowrap">
                    <Link to={`/cases/${c.id}`} className="text-gov-primary hover:underline">
                      {c.case_reference}
                    </Link>
                  </td>
                  <td>
                    <div className="font-medium text-gov-text text-xs">{c.institution_name}</div>
                    <div className="text-[11px] font-mono text-gov-muted">{c.permanent_id}</div>
                  </td>
                  <td>
                    <div className="text-xs font-medium text-gov-text line-clamp-1">{c.title}</div>
                    <div className="text-[11px] text-gov-muted mt-0.5 line-clamp-1">
                      Next: {c.next_action || 'Review and take procedural action'}
                    </div>
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
                          : c.status === 'Under Verification' || c.status === 'Under Scrutiny'
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
                  <td className="text-xs text-gov-muted">
                    {new Date(c.last_action_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="text-right">
                    <Link to={`/cases/${c.id}`} className="gov-btn-primary py-1 px-2.5 text-[11px]">
                      Open
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
