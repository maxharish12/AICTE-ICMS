import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Complaint, ComplaintCategory, Institution, Bureau } from '../types';
import {
  FileText,
  Search,
  Filter,
  Plus,
  ExternalLink,
  X,
  Building,
  CheckCircle,
  GitCompare,
  RotateCcw,
  AlertTriangle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const ComplaintsPage: React.FC = () => {
  const { showToast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [collegeIdFilter, setCollegeIdFilter] = useState('');
  const [permanentIdFilter, setPermanentIdFilter] = useState('');
  const [institutionNameFilter, setInstitutionNameFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedBureau, setSelectedBureau] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [overlapFilter, setOverlapFilter] = useState<'ALL' | 'OVERLAP_ONLY' | 'NO_OVERLAP'>('ALL');

  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Registration Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    institution_id: 1,
    category_id: 1,
    complainant_type: 'STUDENT',
    source: 'PORTAL',
    sensitivity_classification: 'NORMAL',
    assigned_bureau_id: 1,
    create_case_automatically: true,
    priority: 'MEDIUM',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (collegeIdFilter.trim()) params.append('college_id', collegeIdFilter.trim());
      if (permanentIdFilter.trim()) params.append('permanent_id', permanentIdFilter.trim());
      if (institutionNameFilter.trim()) params.append('institution_name', institutionNameFilter.trim());
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (selectedStatus && selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedBureau) params.append('bureau_id', selectedBureau);
      if (selectedPriority && selectedPriority !== 'ALL') params.append('priority', selectedPriority);
      if (overlapFilter === 'OVERLAP_ONLY') params.append('has_overlap', 'true');
      if (overlapFilter === 'NO_OVERLAP') params.append('has_overlap', 'false');

      const data = await apiRequest<Complaint[]>(`/complaints?${params.toString()}`);
      setComplaints(data);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      apiRequest<ComplaintCategory[]>('/complaints/categories'),
      apiRequest<Bureau[]>('/admin/bureaus'),
      apiRequest<Institution[]>('/institutions?limit=100'),
    ])
      .then(([cats, burs, insts]) => {
        setCategories(cats);
        setBureaus(burs);
        setInstitutions(insts);
        if (cats.length > 0) setFormData((prev) => ({ ...prev, category_id: cats[0].id }));
        if (burs.length > 0) setFormData((prev) => ({ ...prev, assigned_bureau_id: burs[0].id }));
        if (insts.length > 0) setFormData((prev) => ({ ...prev, institution_id: insts[0].id }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchComplaints, 250);
    return () => clearTimeout(timer);
  }, [
    search,
    collegeIdFilter,
    permanentIdFilter,
    institutionNameFilter,
    selectedCategory,
    selectedStatus,
    selectedBureau,
    selectedPriority,
    overlapFilter,
  ]);

  const clearAllFilters = () => {
    setSearch('');
    setCollegeIdFilter('');
    setPermanentIdFilter('');
    setInstitutionNameFilter('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedBureau('');
    setSelectedPriority('');
    setOverlapFilter('ALL');
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
      collegeIdFilter.trim() ||
      permanentIdFilter.trim() ||
      institutionNameFilter.trim() ||
      selectedCategory ||
      (selectedStatus && selectedStatus !== 'ALL') ||
      selectedBureau ||
      (selectedPriority && selectedPriority !== 'ALL') ||
      overlapFilter !== 'ALL'
  );

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const created = await apiRequest<Complaint>('/complaints', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowAddModal(false);
      setFormData({
        title: '',
        description: '',
        institution_id: institutions[0]?.id || 1,
        category_id: categories[0]?.id || 1,
        complainant_type: 'STUDENT',
        source: 'PORTAL',
        sensitivity_classification: 'NORMAL',
        assigned_bureau_id: bureaus[0]?.id || 1,
        create_case_automatically: true,
        priority: 'MEDIUM',
      });
      showToast(
        'success',
        'Grievance Registered',
        `Complaint ${created.complaint_reference} successfully docketed.`
      );
      fetchComplaints();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit complaint');
      showToast('error', 'Registration Failed', err.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="gov-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gov-primary"></span>
            <span className="text-[11px] font-bold text-gov-muted uppercase tracking-widest font-mono">
              CENTRAL COMPLAINT MANAGEMENT
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gov-text mt-1">
            Complaints Intake &amp; Case Monitoring
          </h1>
          <p className="text-xs text-gov-muted mt-1 max-w-3xl">
            Correlates complaints across AICTE Bureaus. Filter by College ID, AICTE Permanent ID, status, priority, and potential overlap flags.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="gov-btn gov-btn-primary self-start sm:self-center text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Grievance</span>
        </button>
      </div>

      {/* Mandatory Phase 4 Filter Bar */}
      <div className="gov-card p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gov-border">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gov-primary" />
            <span className="text-xs font-bold text-gov-text uppercase tracking-wide">
              Mandatory Institution &amp; Case Filters
            </span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset / Clear Filters
            </button>
          )}
        </div>

        {/* Primary Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
          {/* 1. College ID */}
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold text-gov-muted uppercase mb-1">
              College ID
            </label>
            <input
              type="text"
              placeholder="e.g. CLG-1001"
              value={collegeIdFilter}
              onChange={(e) => setCollegeIdFilter(e.target.value)}
              className="gov-input text-xs py-1.5"
            />
          </div>

          {/* 2. AICTE Permanent ID */}
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold text-gov-muted uppercase mb-1">
              Permanent ID
            </label>
            <input
              type="text"
              placeholder="DEMO-AICTE-001"
              value={permanentIdFilter}
              onChange={(e) => setPermanentIdFilter(e.target.value)}
              className="gov-input text-xs py-1.5 font-mono"
            />
          </div>

          {/* 3. Institution Name */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold text-gov-muted uppercase mb-1">
              Institution Name
            </label>
            <input
              type="text"
              placeholder="Filter by institute name..."
              value={institutionNameFilter}
              onChange={(e) => setInstitutionNameFilter(e.target.value)}
              className="gov-input text-xs py-1.5"
            />
          </div>

          {/* 4. Bureau / Cell */}
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold text-gov-muted uppercase mb-1">
              Bureau / Cell
            </label>
            <select
              value={selectedBureau}
              onChange={(e) => setSelectedBureau(e.target.value)}
              className="gov-select text-xs py-1.5"
            >
              <option value="">All Bureaus</option>
              {bureaus.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} ({b.name})
                </option>
              ))}
            </select>
          </div>

          {/* 5. Status */}
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold text-gov-muted uppercase mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="gov-select text-xs py-1.5"
            >
              <option value="ALL">All Statuses</option>
              <option value="REGISTERED">REGISTERED</option>
              <option value="CASE_LINKED">CASE_LINKED</option>
              <option value="DISPOSED">DISPOSED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          {/* 6. Priority */}
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold text-gov-muted uppercase mb-1">
              Priority
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="gov-select text-xs py-1.5"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">URGENT</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          {/* 7. Potential Overlap Filter */}
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold text-gov-muted uppercase mb-1">
              Overlap Status
            </label>
            <select
              value={overlapFilter}
              onChange={(e) => setOverlapFilter(e.target.value as any)}
              className="gov-select text-xs py-1.5 font-semibold text-orange-900 bg-orange-50/50"
            >
              <option value="ALL">All Cases</option>
              <option value="OVERLAP_ONLY">Overlaps Only</option>
              <option value="NO_OVERLAP">Non-Overlapping</option>
            </select>
          </div>
        </div>

        {/* Free text search bar + Category select */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gov-muted" />
            <input
              type="text"
              placeholder="Search keyword in subject or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="gov-input pl-8 text-xs py-1.5"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-gov-muted whitespace-nowrap">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="gov-select text-xs py-1.5 min-w-[200px]"
            >
              <option value="">All Grievance Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[11px]">
            <span className="text-gov-muted font-semibold">Active Filters:</span>
            {collegeIdFilter.trim() && (
              <span className="px-2 py-0.5 rounded bg-gov-light text-gov-dark border border-gov-primary/30 flex items-center gap-1">
                College ID: {collegeIdFilter.trim()}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setCollegeIdFilter('')} />
              </span>
            )}
            {permanentIdFilter.trim() && (
              <span className="px-2 py-0.5 rounded bg-gov-light text-gov-dark border border-gov-primary/30 flex items-center gap-1">
                Permanent ID: {permanentIdFilter.trim()}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setPermanentIdFilter('')} />
              </span>
            )}
            {institutionNameFilter.trim() && (
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1">
                Institution: {institutionNameFilter.trim()}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setInstitutionNameFilter('')} />
              </span>
            )}
            {selectedBureau && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                Bureau: {bureaus.find((b) => b.id.toString() === selectedBureau)?.code}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedBureau('')} />
              </span>
            )}
            {selectedPriority && selectedPriority !== 'ALL' && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                Priority: {selectedPriority}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedPriority('')} />
              </span>
            )}
            {selectedStatus && selectedStatus !== 'ALL' && (
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1">
                Status: {selectedStatus}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedStatus('')} />
              </span>
            )}
            {overlapFilter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-900 border border-orange-300 flex items-center gap-1">
                Overlap: {overlapFilter === 'OVERLAP_ONLY' ? 'Flagged Only' : 'Non-Overlapping'}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setOverlapFilter('ALL')} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Mandatory Results Table with ID Matching & Overlap Indicator */}
      <div className="gov-table-container">
        <div className="p-3 bg-slate-50 border-b border-gov-border flex items-center justify-between text-xs">
          <span className="font-bold text-gov-text font-mono">
            {complaints.length} Records Found
          </span>
          <span className="text-gov-muted text-[11px]">
            Showing complaints matching applied identifier and status criteria
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="gov-table-header">
              <tr>
                <th className="py-3 px-3 min-w-[120px]">Complaint ID</th>
                <th className="py-3 px-3 min-w-[240px]">Institution Details</th>
                <th className="py-3 px-3 min-w-[110px]">College ID</th>
                <th className="py-3 px-3 min-w-[130px]">AICTE Perm ID</th>
                <th className="py-3 px-3 min-w-[100px]">Bureau / Cell</th>
                <th className="py-3 px-3 min-w-[80px]">Priority</th>
                <th className="py-3 px-3 min-w-[110px]">Status</th>
                <th className="py-3 px-3 min-w-[140px]">Overlap Indicator</th>
                <th className="py-3 px-3 text-right min-w-[80px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gov-muted">
                    Loading grievance records...
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-gov-text">No matching complaints found</p>
                    <p className="text-[11px] text-gov-muted mt-0.5">
                      Check your College ID or Permanent ID filter, or select "Reset / Clear Filters" above.
                    </p>
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c.id} className="gov-table-row hover:bg-orange-50/20">
                    <td className="py-3 px-3 font-mono font-bold text-gov-dark whitespace-nowrap">
                      {c.complaint_reference}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-gov-text leading-snug line-clamp-1" title={c.title}>
                        {c.title}
                      </div>
                      <div className="text-[11px] text-gov-muted font-medium mt-0.5 truncate max-w-[230px]">
                        {c.institution_name}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                        Category: {c.category_name}
                      </span>
                    </td>

                    {/* College ID */}
                    <td className="py-3 px-3 font-mono text-xs">
                      {c.college_id ? (
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 font-bold border border-slate-200">
                          {c.college_id}
                        </span>
                      ) : (
                        <span className="text-gov-muted italic text-[11px]">Not Available</span>
                      )}
                    </td>

                    {/* AICTE Permanent ID */}
                    <td className="py-3 px-3 font-mono text-xs">
                      {c.permanent_id && c.permanent_id !== 'Not Available' ? (
                        <span className="px-1.5 py-0.5 bg-gov-light rounded text-gov-dark font-bold border border-gov-primary/30">
                          {c.permanent_id}
                        </span>
                      ) : (
                        <span className="text-gov-muted italic text-[11px]">Not Available</span>
                      )}
                    </td>

                    {/* Bureau / Cell */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {c.assigned_bureau_name || 'Central PGRC'}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-3">
                      <span
                        className={`gov-badge ${
                          c.priority === 'URGENT' || c.priority === 'HIGH'
                            ? 'gov-badge-danger'
                            : c.priority === 'MEDIUM'
                            ? 'gov-badge-warning'
                            : 'gov-badge-neutral'
                        }`}
                      >
                        {c.priority || 'MEDIUM'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span
                        className={`gov-badge ${
                          c.status === 'CASE_LINKED' || c.status === 'DISPOSED'
                            ? 'gov-badge-success'
                            : c.status === 'REGISTERED'
                            ? 'gov-badge-warning'
                            : 'gov-badge-neutral'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>

                    {/* Potential Overlap Indicator */}
                    <td className="py-3 px-3">
                      {c.has_potential_overlap ? (
                        <div className="space-y-0.5">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-300"
                            title={c.overlap_reason || 'Cross-bureau institutional overlap detected'}
                          >
                            <GitCompare className="w-3 h-3 text-orange-700" />
                            Potential Overlap
                          </span>
                          {c.overlap_confidence && (
                            <span className="block text-[10px] font-mono text-orange-800">
                              {Math.round(c.overlap_confidence * 100)}% Confidence
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-gov-muted font-mono">Independent</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      {c.linked_case_reference ? (
                        <Link
                          to={`/cases`}
                          className="gov-btn-primary py-1 px-2 text-[11px] whitespace-nowrap"
                        >
                          View Case
                        </Link>
                      ) : (
                        <button
                          onClick={() => {
                            showToast('info', 'Complaint Docket', `Reference: ${c.complaint_reference}. Status: ${c.status}.`);
                          }}
                          className="gov-btn-secondary py-1 px-2 text-[11px] whitespace-nowrap"
                        >
                          Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-gov-lg border border-gov-border max-w-xl w-full p-6 text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gov-border">
              <h2 className="text-sm font-bold text-gov-text flex items-center gap-2">
                <FileText className="w-4 h-4 text-gov-primary" />
                Register New Grievance Docket
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gov-muted hover:text-gov-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-gov-text mb-1">
                  Target Technical Institution:
                </label>
                <select
                  value={formData.institution_id}
                  onChange={(e) =>
                    setFormData({ ...formData, institution_id: parseInt(e.target.value) })
                  }
                  className="gov-select w-full"
                  required
                >
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.institution_name} ({inst.permanent_id ? `AICTE: ${inst.permanent_id}` : `College ID: ${inst.college_id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gov-text mb-1">
                  Grievance Category:
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: parseInt(e.target.value) })
                  }
                  className="gov-select w-full"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gov-text mb-1">
                  Assigned Handling Bureau / Cell:
                </label>
                <select
                  value={formData.assigned_bureau_id}
                  onChange={(e) =>
                    setFormData({ ...formData, assigned_bureau_id: parseInt(e.target.value) })
                  }
                  className="gov-select w-full"
                >
                  {bureaus.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gov-text mb-1">
                  Grievance Subject / Title:
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Concise description of the allegation or grievance..."
                  className="gov-input w-full"
                  required
                  minLength={3}
                />
              </div>

              <div>
                <label className="block font-semibold text-gov-text mb-1">
                  Full Allegation Narrative / Description:
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed facts, dates, academic year, and specific department involved..."
                  className="gov-input w-full"
                  required
                  minLength={10}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gov-text mb-1">
                    Complainant Category:
                  </label>
                  <select
                    value={formData.complainant_type}
                    onChange={(e) => setFormData({ ...formData, complainant_type: e.target.value })}
                    className="gov-select w-full"
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="PARENT">PARENT</option>
                    <option value="FACULTY">FACULTY</option>
                    <option value="STAFF">STAFF</option>
                    <option value="CITIZEN">CITIZEN</option>
                    <option value="ANONYMOUS">ANONYMOUS</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gov-text mb-1">
                    Classification / Sensitivity:
                  </label>
                  <select
                    value={formData.sensitivity_classification}
                    onChange={(e) =>
                      setFormData({ ...formData, sensitivity_classification: e.target.value })
                    }
                    className="gov-select w-full"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH_PRIORITY">HIGH_PRIORITY</option>
                    <option value="CONFIDENTIAL">CONFIDENTIAL [SafeVoice Protocol]</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gov-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="gov-btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="gov-btn-primary" disabled={submitting}>
                  {submitting ? 'Docketing...' : 'Submit & Register Grievance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
