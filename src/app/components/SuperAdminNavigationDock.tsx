import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Crown,
  Building2,
  Heart,
  Layers,
  Database,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface SuperAdminNavigationDockProps {
  currentRole?: string;
  onSelectCategoryTab?: () => void;
}

export default function SuperAdminNavigationDock({ currentRole, onSelectCategoryTab }: SuperAdminNavigationDockProps) {
  const navigate = useNavigate();
  const location = useLocation();

  if (currentRole !== 'superadmin') return null;

  const currentPath = location.pathname;

  const hubs = [
    {
      id: 'admin',
      label: 'Barangay Admin Hub',
      path: '/admin',
      icon: Building2,
      activeBorder: 'ring-2 ring-indigo-400 bg-indigo-600 shadow-indigo-500/50',
      description: 'Barangay Hall, Staff, Resident Verification & Clearances'
    },
    {
      id: 'bhw',
      label: 'BHW Health Center Hub',
      path: '/bhw',
      icon: Heart,
      activeBorder: 'ring-2 ring-emerald-400 bg-emerald-600 shadow-emerald-500/50',
      description: 'Clinic Operations, Vaccines, Maternal & Health Requests'
    }
  ];

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-500/30 px-3 py-2 shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Left Badge & Status */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg text-xs font-bold shadow-inner">
            <Crown size={14} className="text-amber-400 animate-bounce" />
            <span>SUPER ADMIN CONTROL</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Master Management Mode (Admin & BHW)</span>
          </div>
        </div>

        {/* Center Portal Switcher Navigation Pills (Admin & BHW only, no resident access) */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {hubs.map((hub) => {
            const isActive = currentPath === hub.path;
            const Icon = hub.icon;
            return (
              <button
                key={hub.id}
                onClick={() => navigate(hub.path)}
                title={hub.description}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md ${
                  isActive
                    ? `${hub.activeBorder} text-white scale-105`
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{hub.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
                )}
              </button>
            );
          })}

          {onSelectCategoryTab && (
            <button
              onClick={onSelectCategoryTab}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600/80 hover:bg-purple-600 text-white border border-purple-400/40 cursor-pointer shadow-md"
              title="Manage Document & Service Categories"
            >
              <Tag size={13} />
              <span>Category Manager</span>
            </button>
          )}
        </div>

        {/* Right Quick Info */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-indigo-200">
          <div className="flex items-center gap-1 bg-indigo-900/60 border border-indigo-700/50 px-2 py-0.5 rounded-md font-mono">
            <Database size={12} className="text-indigo-400" />
            <span>MySQL: Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
