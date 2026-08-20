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
  User
} from 'lucide-react';
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

  const loadData = async (currentUser?: any) => {
    try {
      const data = await apiService.getDocuments();
      const loggedInUser = currentUser || user;
      if (loggedInUser?.name) {
        // Match by resident name (first name or full name match)
        const firstName = loggedInUser.name.split(' ')[0].toLowerCase();
        const fullName = loggedInUser.name.toLowerCase();
        setDocuments(data.filter(d =>
          d.resident_name.toLowerCase().includes(firstName) ||
          d.resident_name.toLowerCase().includes(fullName) ||
          d.resident_id === loggedInUser.id
        ));
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

        // Live-check if admin has approved the account since last login
        if (parsed.email) {
          apiService.checkVerificationStatus(parsed.email).then(result => {
            if (result?.success && result.user) {
              const liveStatus = result.user.verification_status;
              if (liveStatus && liveStatus !== parsed.verification_status) {
                const updated = { ...parsed, verification_status: liveStatus };
                setUser(updated);
                setIsVerified(liveStatus === 'Verified');
                localStorage.setItem('barangay_user', JSON.stringify(updated));
                if (liveStatus === 'Verified') {
                  toast.success('Account Verified!', {
                    description: 'Your Barangay ID was approved. You can now request documents.'
                  });
                }
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
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <UserCheck size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Smart Barangay System</h1>
              <span className="text-xs text-teal-600 font-semibold">Resident Self-Service Hub</span>
            </div>
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
                  documents.map(doc => (
                    <TableRow key={doc.id} className="text-xs">
                      <TableCell className="font-mono font-semibold text-teal-600">{doc.request_code}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{doc.document_type}</TableCell>
                      <TableCell className="text-slate-500">{doc.purpose || '-'}</TableCell>
                      <TableCell>
                        <Badge className={doc.status === 'Completed' ? 'bg-emerald-600' : 'bg-amber-500'}>
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-slate-400 text-[11px]">{doc.requested_at || 'Today'}</TableCell>
                      <TableCell className="text-right">
                        {doc.status === 'Completed' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            Ready for Pickup at Hall
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
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
