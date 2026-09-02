import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Crown,
  Tag,
  Users,
  History,
  LogOut
} from 'lucide-react';
import { Button } from './ui/button';

interface SuperAdminNavigationDockProps {
  currentRole?: string;
  onSelectUsersTab?: () => void;
  onSelectCategoryTab?: () => void;
  onSelectLogsTab?: () => void;
  onLogout?: () => void;
}

export default function SuperAdminNavigationDock({
  currentRole,
  onSelectUsersTab,
  onSelectCategoryTab,
  onSelectLogsTab,
  onLogout
}: SuperAdminNavigationDockProps) {
  const navigate = useNavigate();

  if (currentRole !== 'superadmin') return null;

  const handleDefaultLogout = () => {
    localStorage.removeItem('barangay_user');
    navigate('/login');
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-500/30 px-4 py-2 shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Left Badge & Mode */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg text-xs font-bold shadow-inner">
            <Crown size={14} className="text-amber-400" />
            <span>SUPER ADMINISTRATOR</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Master User Directory &amp; System Oversight</span>
          </div>
        </div>

        {/* Action Controls & Prominent Logout Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {onSelectUsersTab && (
            <Button
              size="sm"
              onClick={onSelectUsersTab}
              className="h-7 text-xs font-semibold bg-indigo-600/90 hover:bg-indigo-600 text-white border border-indigo-400/40 cursor-pointer shadow-xs gap-1.5"
            >
              <Users size={13} />
              <span>User Directory</span>
            </Button>
          )}

          {onSelectCategoryTab && (
            <Button
              size="sm"
              onClick={onSelectCategoryTab}
              className="h-7 text-xs font-semibold bg-purple-600/90 hover:bg-purple-600 text-white border border-purple-400/40 cursor-pointer shadow-xs gap-1.5"
            >
              <Tag size={13} />
              <span>Category Manager</span>
            </Button>
          )}

          {onSelectLogsTab && (
            <Button
              size="sm"
              onClick={onSelectLogsTab}
              className="h-7 text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white border border-slate-500/40 cursor-pointer shadow-xs gap-1.5"
            >
              <History size={13} />
              <span>Audit Logs</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={onLogout || handleDefaultLogout}
            className="h-7 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white border border-rose-400/40 cursor-pointer shadow-sm gap-1.5"
            title="Sign out of Super Administrator account"
          >
            <LogOut size={13} />
            <span>Log Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
