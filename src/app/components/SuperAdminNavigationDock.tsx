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

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-500/30 px-4 py-2.5 shadow-lg sticky top-0 z-40">
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

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onSelectCategoryTab && (
            <Button
              size="sm"
              onClick={onSelectCategoryTab}
              className="h-7 text-xs font-semibold bg-purple-600/90 hover:bg-purple-600 text-white border border-purple-400/40 cursor-pointer shadow-sm gap-1.5"
            >
              <Tag size={13} />
              <span>Category Manager</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
