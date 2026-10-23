import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut, ChevronDown, Building2, Shield, Users, Clock, Menu } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { AppNotification } from '../../types';

interface HeaderProps {
  onToggleMobile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobile }) => {
  const { user, logout, switchUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest<AppNotification[]>('/notifications?limit=10');
      setNotifications(data);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Ignore
    }
  };

  const quickSwitch = async (username: string, pass: string) => {
    await switchUser(username, pass);
    setShowRoleSwitcher(false);
    navigate('/');
  };

  const demoAccounts = [
    { role: 'System Administrator', name: 'Dr. Rajesh Kumar', username: 'admin', pass: 'Admin@123', tag: 'HQ Central' },
    { role: 'PGRC Officer', name: 'Shri Arvind Sharma', username: 'pgrc_officer', pass: 'Pgrc@123', tag: 'PGRC Bureau' },
    { role: 'Regulation Bureau Off', name: 'Smt. Sunita Verma', username: 'rb_officer', pass: 'Rb@123', tag: 'Regulation' },
    { role: 'Bureau Head', name: 'Dr. Vikramaditya Rao', username: 'bureau_head', pass: 'Head@123', tag: 'Senior Mgmt' },
    { role: 'Regional Office Officer', name: 'Er. Manoj Tiwari', username: 'ro_northern', pass: 'Ro@123', tag: 'RO Northern' },
    { role: 'Competent Authority', name: 'Member Secretary AICTE', username: 'competent_authority', pass: 'Auth@123', tag: 'Executive' },
    { role: 'Citizen Complainant', name: 'Rahul S. (Student)', username: 'complainant_user', pass: 'Citizen@123', tag: 'Stakeholder' },
  ];

  return (
    <header className="bg-white text-gov-text border-b border-gov-border sticky top-0 z-40 shadow-gov-sm">
      {/* Subtle National Tricolor Ribbon at Top Edge */}
      <div className="tricolor-ribbon" />

      {/* Institutional Administrative Utility Bar */}
      <div className="bg-[#FAF9F7] text-gov-muted text-[11px] px-4 sm:px-8 py-1.5 flex items-center justify-between border-b border-gov-border">
        <div className="flex items-center gap-2 tracking-wide">
          <span className="font-semibold text-gov-text">भारत सरकार | Government of India</span>
          <span className="text-slate-300 hidden sm:inline">&bull;</span>
          <span className="hidden sm:inline text-gov-muted">शिक्षा मंत्रालय | Ministry of Education</span>
          <span className="text-slate-300 hidden md:inline">&bull;</span>
          <span className="hidden md:inline bg-gov-light text-gov-dark px-1.5 py-0.5 rounded text-[10px] font-mono border border-gov-primary/30 font-semibold">
            SIH-2026 PS-264 Prototype
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-gov-muted font-mono text-[11px]">
            <Clock className="w-3 h-3 text-gov-primary" />
            <span>{currentTime || 'New Delhi, IST'}</span>
          </div>

          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white hover:bg-gov-light text-gov-dark border border-gov-border text-[11px] font-medium transition-colors cursor-pointer shadow-gov-sm"
          >
            <Users className="w-3 h-3 text-gov-primary" />
            <span className="font-semibold">Evaluation Role Switcher</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showRoleSwitcher ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Role Switcher Drawer */}
      {showRoleSwitcher && (
        <div className="bg-[#FAF9F7] border-b border-gov-border px-4 sm:px-8 py-3 shadow-inner">
          <div className="w-full max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gov-text flex items-center gap-1.5 uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-gov-primary" />
                Select Role Persona for Prototype Evaluation (PS-264)
              </span>
              <button
                onClick={() => setShowRoleSwitcher(false)}
                className="text-xs text-gov-muted hover:text-gov-dark font-medium cursor-pointer"
              >
                Close &times;
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.username}
                  onClick={() => quickSwitch(acc.username, acc.pass)}
                  className={`p-2 rounded text-left transition-all border cursor-pointer ${
                    user?.username === acc.username
                      ? 'bg-gov-light border-gov-primary text-gov-dark shadow-sm'
                      : 'bg-white hover:bg-gov-light/50 border-gov-border text-gov-text'
                  }`}
                >
                  <div className="text-[11px] font-bold truncate leading-tight">{acc.role}</div>
                  <div className="text-[10px] text-gov-muted truncate mt-0.5">{acc.name}</div>
                  <div className="mt-1 flex items-center justify-between text-[9px] font-mono">
                    <span className="text-gov-dark">{acc.tag}</span>
                    {user?.username === acc.username && (
                      <span className="text-gov-success font-bold font-sans">Active</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Header Masthead */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Branding & Institutional Identity */}
        <div className="flex items-center gap-3">
          {onToggleMobile && (
            <button
              onClick={onToggleMobile}
              className="lg:hidden p-2 rounded-md hover:bg-gov-bg text-gov-muted hover:text-gov-text cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-md bg-gov-light border border-gov-primary/30 flex items-center justify-center text-gov-primary shadow-gov-sm shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-gov-muted tracking-wide leading-tight uppercase">
                अखिल भारतीय तकनीकी शिक्षा परिषद &bull; AICTE
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-gov-text leading-none">
                  AICTE ICMS
                </span>
                <span className="text-[10px] font-bold bg-gov-light text-gov-dark px-1.5 py-0.5 rounded border border-gov-primary/30 font-mono tracking-wider">
                  PORTAL PS-264
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Right: Actions, Notifications & Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 rounded-md hover:bg-gov-light/60 text-gov-muted hover:text-gov-text relative transition-colors border border-transparent hover:border-gov-border cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-gov-critical text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-gov-text rounded-md shadow-gov-modal border border-gov-border z-50 overflow-hidden animate-fade-in">
                <div className="px-4 py-3 bg-[#FAF9F7] border-b border-gov-border flex items-center justify-between">
                  <span className="font-bold text-xs text-gov-text uppercase tracking-wider">
                    Notifications ({unreadCount} unread)
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-gov-primary hover:text-gov-dark font-semibold hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-gov-border">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gov-muted">No active notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkAsRead(n.id)}
                        className={`p-3.5 hover:bg-[#FAF9F7] cursor-pointer text-xs transition-colors ${
                          !n.is_read ? 'bg-gov-light/40 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`font-semibold ${!n.is_read ? 'text-gov-dark' : 'text-gov-text'}`}>
                            {n.title}
                          </span>
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-gov-primary mt-1 shrink-0" />}
                        </div>
                        <p className="text-gov-muted text-[11px] mt-1 leading-relaxed line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-gov-muted/80 mt-1.5 block font-mono">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2.5 bg-[#FAF9F7] border-t border-gov-border text-center">
                  <Link
                    to="/deadlines"
                    onClick={() => setShowNotifMenu(false)}
                    className="text-xs text-gov-primary hover:text-gov-dark font-semibold hover:underline"
                  >
                    View All Deadlines & Alerts &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-md hover:bg-gov-light/50 text-left transition-colors border border-transparent hover:border-gov-border cursor-pointer"
            >
              <div className="w-8 h-8 rounded-md bg-gov-light flex items-center justify-center font-bold text-xs text-gov-primary border border-gov-primary/30 shadow-gov-sm">
                {user?.display_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-bold text-gov-text leading-tight">{user?.display_name}</div>
                <div className="text-[10px] text-gov-muted leading-tight">
                  {user?.roles?.[0]?.name || 'Authorized Official'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gov-muted" />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white text-gov-text rounded-md shadow-gov-modal border border-gov-border z-50 py-1">
                <div className="px-3.5 py-3 border-b border-gov-border bg-[#FAF9F7]">
                  <p className="text-xs font-bold text-gov-text">{user?.display_name}</p>
                  <p className="text-[11px] text-gov-muted truncate mt-0.5">{user?.email}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gov-light text-gov-dark font-mono font-semibold border border-gov-primary/30">
                      {user?.roles?.[0]?.code}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white text-gov-muted font-mono border border-gov-border">
                      {user?.bureau_assignments?.[0]?.bureau?.code || 'Central'}
                    </span>
                  </div>
                </div>

                <div className="px-2 py-1.5 text-[11px] text-gov-muted border-b border-gov-border space-y-1">
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Account Status:</span>
                    <span className="font-semibold text-gov-success capitalize">{user?.account_status || 'Active'}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Jurisdiction:</span>
                    <span className="font-semibold text-gov-text">{user?.bureau_assignments?.[0]?.bureau?.name || 'Central Head Office'}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs text-gov-critical hover:bg-red-50 flex items-center gap-2 font-semibold cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out from Administrative Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};


