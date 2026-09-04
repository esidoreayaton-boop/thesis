import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  FileText,
  UserCheck,
  AlertTriangle,
  LogOut,
  Building2,
  Heart,
  ArrowRight,
  Shield,
  Activity,
  CheckCircle2,
  Settings,
  User,
  Clock,
  Phone,
  Mail
} from 'lucide-react';
import { getBarangayContact, getBarangayEmail } from '../../utils/barangays';
import { apiService, DocumentRequest } from '../../services/api';
import BarangayChatbot from '../components/BarangayChatbot';
import ProfileSettingsModal from '../components/ProfileSettingsModal';
import SuperAdminNavigationDock from '../components/SuperAdminNavigationDock';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';

export default function ResidentPortal() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const residentBrgy = user?.barangay || (() => {
    if (user?.address) {
      const match = user.address.match(/Barangay\s+([^,]+)/i);
      if (match) return match[1].trim();
      if (user.address.toLowerCase().includes('anticala')) return 'Anticala';
    }
    return 'Pianing';
  })();

  const loadData = async (currentUser?: any) => {
    try {
      const data = await apiService.getDocuments();
      const loggedInUser = currentUser || user;
      if (loggedInUser?.name || loggedInUser?.email || loggedInUser?.id) {
        const uEmail = (loggedInUser.email || '').toLowerCase().trim();
        const uId = loggedInUser.id;
        const uName = (loggedInUser.name || '').toLowerCase().trim();
        const matched = data.filter(d => {
          const dEmail = ((d as any).email || '').toLowerCase().trim();
          if (uEmail && dEmail && dEmail === uEmail) return true;
          if (uId && d.resident_id && d.resident_id === uId) return true;
          if (uName && d.resident_name && d.resident_name.toLowerCase().trim() === uName) return true;
          return false;
        });
        const uniqueDocs = new Map();
        for (const doc of matched) {
          const key = doc.id ? `id-${doc.id}` : (doc.request_code ? `code-${doc.request_code}` : JSON.stringify(doc));
          if (!uniqueDocs.has(key)) {
            uniqueDocs.set(key, doc);
          }
        }
        setDocuments(Array.from(uniqueDocs.values()));
      } else {
        // Visitor: show sample docs
        setDocuments(data.slice(0, 3));
      }
    } catch (e) {
      toast.error('Failed to load document requests');
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('barangay_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.role === 'superadmin' || parsed.role === 'admin' || parsed.role === 'staff') {
          navigate('/admin');
          return;
        }
        if (parsed.role === 'bhw') {
          navigate('/bhw');
          return;
        }
        setUser(parsed);
        setIsVerified(parsed.verification_status === 'Verified');
        loadData(parsed);

        // Live-check if admin has approved the account since last login, and sync date_of_birth / age
        if (parsed.email) {
          apiService.checkVerificationStatus(parsed.email).then(result => {
            const liveUser = (result as any)?.user || result;
            if (liveUser) {
              const liveStatus = liveUser.verification_status;
              const hasChanged = liveStatus && liveStatus !== parsed.verification_status;
              const cleanDob = liveUser.date_of_birth ? (typeof liveUser.date_of_birth === 'string' ? liveUser.date_of_birth.split('T')[0] : liveUser.date_of_birth) : (parsed.date_of_birth || '');
              const updated = {
                ...parsed,
                ...liveUser,
                date_of_birth: cleanDob,
                age: liveUser.age !== undefined && liveUser.age !== null && liveUser.age !== '' ? liveUser.age : parsed.age
              };
              setUser(updated);
              setIsVerified(updated.verification_status === 'Verified');
              localStorage.setItem('barangay_user', JSON.stringify(updated));
              if (hasChanged && liveStatus === 'Verified') {
                toast.success('Account Verified!', {
                  description: 'Your Barangay ID was approved. You can now request documents.'
                });
              }
            }
          }).catch(() => {});
        }
      } catch (e) {
        loadData();
      }
    } else {
      setIsVerified(false);
      loadData();
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans relative">
      {/* Super Admin Unified Ecosystem Switcher */}
      <SuperAdminNavigationDock currentRole={user?.role} />

      {/* Top Navbar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-white shadow-xs border border-teal-200 flex items-center justify-center">
              <img src="/assets/pianing-logo.png" alt="Barangay Pianing" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Barangay {residentBrgy}</h1>
              <span className="text-xs text-teal-600 font-semibold">Resident Self-Service Hub</span>
            </div>
          </div>

          {/* Quick Barangay Contact Pill in Navbar */}
          <div className="hidden md:flex items-center gap-3 text-xs bg-teal-50/70 border border-teal-200/80 px-3 py-1.5 rounded-xl">
            <a href={`tel:${getBarangayContact(residentBrgy).replace(/[^0-9+]/g, '')}`} className="flex items-center gap-1.5 text-teal-800 hover:text-teal-950 font-medium transition-colors cursor-pointer" title="Barangay Official Hotline">
              <Phone size={13} className="text-teal-600 shrink-0" />
              <span className="font-mono font-bold text-[11px]">{getBarangayContact(residentBrgy)}</span>
            </a>
            <span className="text-teal-300">|</span>
            <a href={`mailto:${getBarangayEmail(residentBrgy)}`} className="flex items-center gap-1.5 text-teal-800 hover:text-teal-950 font-medium transition-colors cursor-pointer" title="Official Barangay Gmail">
              <Mail size={13} className="text-teal-600 shrink-0" />
              <span className="truncate max-w-[200px] text-[11px]">{getBarangayEmail(residentBrgy)}</span>
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-1.5 text-xs border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-400"
              >
                <Settings size={14} />
                <span>Profile Settings</span>
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={() => { toast.info('Logged out'); navigate('/login'); }}
              className="flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Personalized Welcome Banner for Authenticated Resident */}
        {user && user.role === 'resident' ? (
          <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm border border-teal-800/40 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-teal-500/20 text-teal-300 border border-teal-400/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Official Resident Account
                  </span>
                  <span className="text-[11px] text-teal-200/90 font-mono">
                    • Barangay {residentBrgy} • {user.purok || 'Purok 1'}
                  </span>
                  {isVerified ? (
                    <span className="text-[11px] text-emerald-300 font-bold flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle size={12} /> Verified Citizen
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                      <Clock size={12} /> Verification Under Review
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
                  Welcome back, {user.name || 'Resident'}! 👋
                </h2>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  Official self-service desk for Barangay {residentBrgy}. Request clearances, monitor processing status, and book community health visits.
                </p>
              </div>

              {/* Quick Help Hotline */}
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`tel:${getBarangayContact(residentBrgy).replace(/[^0-9+]/g, '')}`}
                  className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs"
                >
                  <Phone size={13} />
                  <span>{getBarangayContact(residentBrgy)}</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* Official Barangay Helpdesk & Contact Banner for Guests */
          <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-teal-800/40 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-teal-500/20 text-teal-300 border border-teal-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Barangay {residentBrgy} Official Helpdesk
                  </span>
                  <span className="text-slate-300 text-[11px] flex items-center gap-1">
                    <Clock size={12} className="text-teal-400" /> Mon - Fri: 8:00 AM - 5:00 PM
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Barangay {residentBrgy} Official Assistance Desk
                </h2>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  For questions regarding document clearances, pickup verification, or community health services:
                </p>
              </div>

              {/* Quick Contact Buttons */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto shrink-0">
                <a
                  href={`tel:${getBarangayContact(residentBrgy).replace(/[^0-9+]/g, '')}`}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Phone size={13} />
                  <span>{getBarangayContact(residentBrgy)}</span>
                </a>
                <a
                  href={`mailto:${getBarangayEmail(residentBrgy)}`}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-medium px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Mail size={13} />
                  <span className="truncate max-w-[200px]">{getBarangayEmail(residentBrgy)}</span>
                </a>
              </div>
            </div>
          </div>
        )}
        {/* Account Verification Warning Banner */}
        {!user || user.role !== 'resident' ? (
          <div className="bg-slate-100 border border-slate-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-800">Visitor Mode (Preview)</h3>
                  <Badge variant="secondary" className="bg-slate-200 text-slate-800 border-slate-300 text-[10px]">
                    Visitor
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                  You are currently viewing the resident hub. Sign in to request official clearances or health certificates.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/login')}
              className="bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs h-9 px-4 shrink-0 shadow-sm"
            >
              Sign In / Register
            </Button>
          </div>
        ) : !isVerified ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-amber-900">Verification Pending Review</h3>
                  <Badge variant="secondary" className="bg-amber-200 text-amber-900 border-amber-300 text-[10px]">
                    Pending
                  </Badge>
                </div>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed max-w-2xl">
                  Your uploaded ID is under review by the Barangay Admin. Document requests will be unlocked once approved.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-amber-100/80 border border-amber-300 text-amber-900 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0">
              <Clock size={15} className="animate-spin text-amber-700" />
              <span>Awaiting Barangay Admin Approval</span>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span className="font-bold">Account Status: Verified Resident</span>
            </div>
            <Badge className="bg-emerald-600">Online Requests Unlocked</Badge>
          </div>
        )}

        {/* Portal Selection Cards Header */}
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Resident Portals</h2>
          <p className="text-xs text-slate-500">Select a portal below to request documents specific to that department.</p>
        </div>

        {/* Two Resident Portals */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1: Barangay Portal */}
          <Card className="border-indigo-200 bg-gradient-to-br from-white to-indigo-50/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between">
            <CardHeader>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-2 shadow-md">
                <Building2 size={24} />
              </div>
              <CardTitle className="text-lg font-bold text-slate-900">Barangay Portal</CardTitle>
              <CardDescription className="text-xs text-slate-600 leading-relaxed">
                Request official barangay clearances, residency certificates, business permits, certificates of indigency, and barangay IDs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">Barangay Clearance</Badge>
                <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">Residency Cert</Badge>
                <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">Business Permit</Badge>
                <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">Indigency Cert</Badge>
                <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">Barangay ID</Badge>
              </div>
              <Button
                onClick={() => navigate('/resident/barangay')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 shadow-sm flex items-center justify-center gap-1.5"
              >
                Enter Barangay Portal
                <ArrowRight size={15} />
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Health Center Portal */}
          <Card className="border-emerald-200 bg-gradient-to-br from-white to-emerald-50/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between">
            <CardHeader>
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-md">
                <Heart size={24} />
              </div>
              <CardTitle className="text-lg font-bold text-slate-900">Health Center Portal</CardTitle>
              <CardDescription className="text-xs text-slate-600 leading-relaxed">
                Request health center documents including medical certificates, health clearances, child immunization records, and maternal care records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">Medical Cert</Badge>
                <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">Health Clearance</Badge>
                <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">Immunization Record</Badge>
                <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">Prenatal Record</Badge>
                <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">Postnatal Record</Badge>
              </div>
              <Button
                onClick={() => navigate('/resident/health')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 shadow-sm flex items-center justify-center gap-1.5"
              >
                Enter Health Center Portal
                <ArrowRight size={15} />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table Summary */}
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="text-teal-600" size={18} />
              Recent Barangay Requests Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">Request Code</TableHead>
                  <TableHead className="text-xs">Document Type</TableHead>
                  <TableHead className="text-xs">Purpose</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Submitted Date</TableHead>
                  <TableHead className="text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs py-8 text-slate-400">
                      No active requests found. Click on one of the portals above to submit a request.
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc, idx) => (
                    <TableRow key={`res-doc-${doc.id || doc.request_code || idx}-${idx}`} className="text-xs">
                      <TableCell className="font-mono font-semibold text-teal-600">{doc.request_code}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{doc.document_type}</TableCell>
                      <TableCell className="text-slate-500">{doc.purpose || '-'}</TableCell>
                      <TableCell>
                        <Badge className={
                          doc.status === 'Completed' ? 'bg-emerald-600 text-white' :
                          doc.status === 'Ready for Pickup' ? 'bg-indigo-600 text-white' :
                          doc.status === 'Processing' ? 'bg-amber-500 text-white' :
                          doc.status === 'Rejected' ? 'bg-red-500 text-white' :
                          'bg-orange-500 text-white'
                        }>
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-slate-400 text-[11px]">{doc.requested_at || 'Today'}</TableCell>
                      <TableCell className="text-right">
                        {doc.status === 'Ready for Pickup' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md shadow-xs animate-pulse">
                            <CheckCircle2 size={12} className="text-indigo-600" />
                            Ready for Pickup at Hall
                          </span>
                        ) : doc.status === 'Completed' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            Claimed / Completed
                          </span>
                        ) : doc.status === 'Processing' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                            <Clock size={12} />
                            In Preparation
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                            <Clock size={12} />
                            Pending Processing
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Embedded Floating Resident Assistant Chatbot */}
      <BarangayChatbot />

      {/* Resident Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onProfileUpdated={(updated) => setUser(updated)}
      />
    </div>
  );
}
