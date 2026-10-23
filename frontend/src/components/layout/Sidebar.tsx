import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Building,
  GitCompare,
  BarChart3,
  Lock,
  Clock,
  Users,
  History,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { DashboardMetrics } from '../../types';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { user, hasRole, isAdmin } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    async function fetchBadge() {
      try {
        const data = await apiRequest<DashboardMetrics>('/reports/dashboard');
        setMetrics(data);
      } catch {
        // ignore
      }
    }
    fetchBadge();
  }, []);

  const isCitizenOnly = user?.roles?.length === 1 && user.roles[0].code === 'ROLE_COMPLAINANT';

  interface NavItemDef {
    to: string;
    label: string;
    icon: any;
    show: boolean;
    badge?: string | number;
    badgeStyle?: string;
  }

  interface NavSection {
    category: string;
    items: NavItemDef[];
  }

  const sections: NavSection[] = [
    {
      category: 'WORKSPACE',
      items: [
        {
          to: '/',
          label: 'Overview',
          icon: LayoutDashboard,
          show: !isCitizenOnly,
        },
        {
          to: '/my-work',
          label: 'My Work',
          icon: Briefcase,
          show: !isCitizenOnly,
        },
        {
          to: '/complaints',
          label: isCitizenOnly ? 'My Grievances' : 'All Complaints',
          icon: FileText,
          show: true,
          badge: metrics?.total_complaints,
          badgeStyle: 'bg-[#FAF9F7] text-gov-text border border-gov-border',
        },
        {
          to: '/cases',
          label: 'Official Cases',
          icon: Briefcase,
          show: !isCitizenOnly,
          badge: metrics?.pending_cases ? `${metrics.pending_cases}` : undefined,
          badgeStyle: 'bg-gov-light text-gov-dark border border-gov-primary/30',
        },
      ],
    },
    {
      category: 'INTELLIGENCE',
      items: [
        {
          to: '/institutions',
          label: 'Institution360',
          icon: Building,
          show: !isCitizenOnly,
          badge: metrics?.institutions_with_active_cases,
          badgeStyle: 'bg-[#FAF9F7] text-gov-muted border border-gov-border',
        },
        {
          to: '/coordination',
          label: 'Potential Overlaps',
          icon: GitCompare,
          show: !isCitizenOnly,
          badge: metrics?.potential_overlaps ? `${metrics.potential_overlaps} Overlap` : undefined,
          badgeStyle: 'bg-[#FFF0E6] text-gov-dark border border-gov-primary/50 font-bold',
        },
        {
          to: '/reports',
          label: 'Reports & Analytics',
          icon: BarChart3,
          show: !isCitizenOnly,
        },
      ],
    },
    {
      category: 'CONFIDENTIAL WORK',
      items: [
        {
          to: '/safevoice',
          label: 'SafeVoice Workspace',
          icon: Lock,
          show: !isCitizenOnly,
          badge: 'Protected',
          badgeStyle: 'bg-[#F4F6F8] text-[#526174] border border-[#526174]/20',
        },
      ],
    },
    {
      category: 'ADMINISTRATION',
      items: [
        {
          to: '/deadlines',
          label: 'Workflow & SLA Rules',
          icon: Clock,
          show: !isCitizenOnly,
          badge: metrics?.overdue_cases ? `${metrics.overdue_cases} Due` : undefined,
          badgeStyle: 'bg-[#FDF2F2] text-gov-critical border border-gov-critical/30 font-semibold',
        },
        {
          to: '/admin',
          label: 'Master Settings & Users',
          icon: Users,
          show: isAdmin,
        },
        {
          to: '/audit',
          label: 'Security & Audit Logs',
          icon: History,
          show: isAdmin || hasRole(['ROLE_MANAGEMENT']),
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 bg-white text-gov-text border-r border-gov-border flex flex-col shrink-0 select-none transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Header / Brand */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-gov-border">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded bg-gov-light flex items-center justify-center shrink-0 border border-gov-primary/30">
                <Shield className="w-4 h-4 text-gov-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-gov-text tracking-wide truncate">
                  AICTE ICMS
                </div>
                <div className="text-[10px] text-gov-muted truncate">
                  Complaint Monitoring & Coordination
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded bg-gov-light flex items-center justify-center border border-gov-primary/30">
                <Shield className="w-4 h-4 text-gov-primary" />
              </div>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded hover:bg-[#F0EFEA] text-gov-muted hover:text-gov-text cursor-pointer transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {sections.map((sec) => {
            const visibleItems = sec.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={sec.category} className="space-y-1">
                {!collapsed && (
                  <div className="px-2.5 py-1 text-[10px] font-bold text-gov-muted uppercase tracking-wider font-mono">
                    {sec.category}
                  </div>
                )}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-colors group relative ${
                          isActive
                            ? 'bg-gov-light text-gov-dark font-semibold border-l-4 border-gov-primary'
                            : 'text-gov-text hover:bg-[#FAF9F7] font-medium'
                        } ${collapsed ? 'justify-center' : ''}`
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0 text-gov-muted group-hover:text-gov-text" />
                      {!collapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                item.badgeStyle || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer info */}
        {!collapsed && (
          <div className="p-3 border-t border-gov-border bg-[#FAF9F7] text-[10px] text-gov-muted">
            <div className="font-semibold text-gov-text">Smart India Hackathon PS-264</div>
            <div className="truncate mt-0.5">Prototype for Evaluation</div>
          </div>
        )}
      </aside>
    </>
  );
};
