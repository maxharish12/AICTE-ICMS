import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Shield } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gov-bg">
      <Header onToggleMobile={() => setMobileOpen((prev) => !prev)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <main className="flex-1 overflow-y-auto bg-gov-bg">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Official Government Administrative Portal Footer */}
      <footer className="bg-white text-gov-muted border-t border-gov-border py-3 px-4 sm:px-8 text-xs shrink-0 select-none shadow-gov-sm">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
            <span className="font-semibold text-gov-text tracking-wide">
              अखिल भारतीय तकनीकी शिक्षा परिषद (AICTE)
            </span>
            <span className="text-slate-300 hidden sm:inline">&bull;</span>
            <span className="text-gov-muted font-medium">
              Ministry of Education, Government of India
            </span>
            <span className="text-slate-300 hidden sm:inline">&bull;</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-gov-light text-gov-dark border border-gov-primary/30 font-mono font-semibold">
              SIH-2026 PS-264 Prototype
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-gov-muted flex-wrap justify-center md:justify-end">
            <span className="flex items-center gap-1.5 text-gov-dark font-medium">
              <Shield className="w-3.5 h-3.5 text-gov-primary" />
              <span>Official Administrative Interface</span>
            </span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="text-gov-muted font-mono font-medium">v2.4-PROTOTYPE</span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="text-gov-muted">Evaluation Demonstration</span>
          </div>
        </div>
      </footer>
    </div>
  );
};


