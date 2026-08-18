import { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Server, Terminal, Info } from 'lucide-react';
import { apiService, DbStatusResponse } from '../../services/api';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

export default function DatabaseStatusBadge() {
  const [status, setStatus] = useState<DbStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await apiService.getDbStatus();
      setStatus(data);
    } catch (e) {
      setStatus({
        connected: false,
        mode: 'Offline',
        error: 'Failed to communicate with Express server'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = status?.connected ?? false;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors border border-slate-200 shadow-xs cursor-pointer">
          <Database className={isConnected ? "text-emerald-500 animate-pulse" : "text-amber-500"} size={14} />
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            MySQL:
          </span>
          <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-amber-100 text-amber-800 border-amber-300"}>
            {isConnected ? "Connected" : "In-Memory Engine"}
          </Badge>
        </button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md sm:max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Server className="text-blue-600" size={20} />
            MySQL Database Connection Status
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            Barangay System Data Persistence and MySQL Server Engine status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Main Status Box */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isConnected 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            {isConnected ? (
              <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" size={20} />
            ) : (
              <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={20} />
            )}
            <div>
              <h4 className="font-semibold text-sm">
                {isConnected ? 'Connected to Live MySQL Database' : 'Running on Active In-Memory Engine'}
              </h4>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {isConnected 
                  ? `Successfully connected to MySQL database '${status?.database || 'smart_barangay_db'}' on ${status?.host || 'localhost'}:${status?.port || 3306}.`
                  : 'MySQL server is not actively connected on localhost:3306. The system is operating seamlessly with local mock state so all features remain functional.'
                }
              </p>
            </div>
          </div>

          {/* Details list */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Database Host:</span>
              <span className="font-mono text-slate-800">{status?.host || 'localhost'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Port:</span>
              <span className="font-mono text-slate-800">{status?.port || 3306}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Database Name:</span>
              <span className="font-mono text-slate-800">{status?.database || 'smart_barangay_db'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Driver:</span>
              <span className="font-mono text-slate-800">mysql2 / promise</span>
            </div>
          </div>

          {/* Instructions to initialize MySQL */}
          {!isConnected && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-900 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold">
                <Terminal size={14} className="text-blue-700" />
                How to Connect your local MySQL Database:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-blue-800 pl-1">
                <li>Start your MySQL server (XAMPP / WAMP / Docker / MySQL Workbench).</li>
                <li>Import <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[11px]">database/schema.sql</code> and <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[11px]">database/seed.sql</code>.</li>
                <li>Ensure credentials match <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[11px]">server/config/db.js</code> or set your <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[11px]">.env</code> file.</li>
              </ol>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-1 text-xs"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Re-check Connection
          </Button>
          <span className="text-[11px] text-slate-400">Smart Barangay System v1.0</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
