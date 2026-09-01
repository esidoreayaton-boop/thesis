import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  FileText,
  UserCheck,
  AlertTriangle,
  Shield,
  LogOut,
  PlusCircle,
  CheckCircle2,
  Lock,
  Building2,
  Heart,
  ArrowRight,
  Settings,
  Clock,
  Bell,
  Info,
  XCircle,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { apiService, DocumentRequest } from '../../services/api';
import BarangayChatbot from '../components/BarangayChatbot';
import ProfileSettingsModal from '../components/ProfileSettingsModal';
import ResubmitIdModal from '../components/ResubmitIdModal';
import SuperAdminNavigationDock from '../components/SuperAdminNavigationDock';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const BARANGAY_DOCS = [
  'Barangay Clearance',
  'Certificate of Residency',
  'Certificate of Indigency',
  'Good Moral Clearance',
  'Business Clearance',
  'Business Retirement Certificate',
  'Certificate of Employment',
  'Certificate of Land Occupancy',
  'Barangay Activity Permit',
];

const DOC_DESCRIPTIONS: Record<string, string> = {
  'Barangay Clearance':              'For employment, bank requirement, loans & government IDs',
  'Certificate of Residency':        'Proof of bonafide residency for school, utility or bank',
  'Certificate of Indigency':        'For medical, educational, burial & DSWD financial assistance',
  'Good Moral Clearance':            'Official character clearance for PRC board exams & school',
  'Business Clearance':              'Barangay commercial permit for sari-sari stores & businesses',
  'Business Retirement Certificate': 'Official certification for closure or retirement of business',
  'Certificate of Employment':       'Barangay employment certificate & first time jobseeker aid',
  'Certificate of Land Occupancy':   'Proof of actual physical occupancy & lot possession',
  'Barangay Activity Permit':        'Permit for events, product sampling, promotions & gatherings',
};

const DUPLICATE_SUGGESTIONS: Record<string, string> = {
  'Barangay Clearance':              'Your Barangay Clearance request is being processed. Please wait for an SMS notification or visit the Barangay Hall.',
  'Certificate of Residency':        'A Certificate of Residency request is already on file. Visit the Barangay Hall with your valid ID if urgent.',
  'Certificate of Indigency':        'An Indigency Certificate request already exists. Please coordinate with the Barangay Social Welfare office.',
  'Good Moral Clearance':            'Your Good Moral Clearance application is under review by the Barangay Secretary.',
  'Business Clearance':              'Your Business Clearance application is currently under review by Barangay Staff.',
  'Business Retirement Certificate': 'A Business Retirement request is already pending verification.',
  'Certificate of Employment':       'Your Employment Certification is currently being prepared.',
  'Certificate of Land Occupancy':   'A Land Occupancy certification is being reviewed by the Barangay Council.',
  'Barangay Activity Permit':        'Your Activity Permit request is under evaluation by the Punong Barangay.',
};

export default function BarangayPortal() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [docType, setDocType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [readNotifKeys, setReadNotifKeys] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('brgy_read_notifs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const markNotifRead = (key: string) => {
    setReadNotifKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      localStorage.setItem('brgy_read_notifs', JSON.stringify([...next]));
      return next;
    });
  };

  const markAllNotifsRead = () => {
    const allKeys: string[] = [];
    if (user?.verification_status === 'Rejected') allKeys.push('acct-rejected');
    documents.forEach(d => allKeys.push(`doc-${d.id || d.request_code}`));
    setReadNotifKeys(prev => {
      const next = new Set(prev);
      allKeys.forEach(k => next.add(k));
      localStorage.setItem('brgy_read_notifs', JSON.stringify([...next]));
      return next;
    });
  };

  // Dynamic extra fields per document type
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const setField = (key: string, val: string) => setExtraFields(prev => ({ ...prev, [key]: val }));

  const userBarangay = user?.barangay || (user?.address?.toLowerCase().includes('anticala') ? 'Anticala' : 'Pianing');

  const isCategoryActive = (docName: string) => {
    if (!categories || categories.length === 0) return true;
    const cat = categories.find(c => c.name.toLowerCase() === docName.toLowerCase());
    return cat ? cat.status === 'Active' : true;
  };

  // Extract purok from user address (e.g. "Purok 1, Barangay Pianing, Butuan City" → "Purok 1")
  const extractPurok = (address?: string): string => {
    if (!address) return '';
    const match = address.match(/^([^,]+)/); // take everything before the first comma
    return match ? match[1].trim() : address.trim();
  };

  // Calculate age from date_of_birth or birthdate
  const calculateAge = (dobStr?: string, ageNum?: number | string): string => {
    if (ageNum !== undefined && ageNum !== null && ageNum !== '' && !isNaN(Number(ageNum))) {
      return `${ageNum} yrs old`;
    }
    if (!dobStr) return '—';
    try {
      const dob = new Date(dobStr);
      if (isNaN(dob.getTime())) return '—';
      const diff = Date.now() - dob.getTime();
      const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      return isNaN(age) || age < 0 ? '—' : `${age} yrs old`;
    } catch {
      return '—';
    }
  };

  const handleDocTypeChange = (val: string) => {
    setDocType(val);
    setPurpose('');
    setExtraFields({});
  };

  const handleOpenDocModal = (type?: string) => {
    if (!isVerified) {
      toast.error('Document requests locked!', {
        description: 'Your account must be verified by Barangay Admin first.',
      });
      return;
    }
    if (type && !isCategoryActive(type)) {
      toast.error('Service Temporarily Suspended', {
        description: `Requests for ${type} have been deactivated by the Super Administrator.`
      });
      return;
    }
    setIsAddDocOpen(true);
    if (type) {
      handleDocTypeChange(type);
    }
  };

  // Reset dialog fully when closed
  const handleDialogOpenChange = (open: boolean) => {
    setIsAddDocOpen(open);
    if (!open) {
      setDocType('');
      setExtraFields({});
      setPurpose('');
    }
  };

  const loadData = async (currentUser?: any) => {
    try {
      const [data, cats] = await Promise.all([
        apiService.getDocuments(),
        apiService.getCategories().catch(() => [])
      ]);
      if (cats && cats.length > 0) setCategories(cats);
      const brgyData = data.filter(d => BARANGAY_DOCS.includes(d.document_type));
      const loggedInUser = currentUser || user;
      if (loggedInUser?.email || loggedInUser?.id) {
        const uEmail = (loggedInUser.email || '').toLowerCase().trim();
        const uId = loggedInUser.id;
        const myDocs = brgyData.filter(d => {
          const dEmail = ((d as any).email || '').toLowerCase().trim();
          if (uEmail && dEmail && dEmail === uEmail) return true;
          if (uId && d.resident_id && d.resident_id === uId) return true;
          return false;
        });
        // Deduplicate to ensure no duplicate documents exist in state
        const uniqueDocsMap = new Map();
        for (const doc of myDocs) {
          const key = doc.id ? `id-${doc.id}` : (doc.request_code ? `code-${doc.request_code}` : JSON.stringify(doc));
          if (!uniqueDocsMap.has(key)) {
            uniqueDocsMap.set(key, doc);
          }
        }
        setDocuments(Array.from(uniqueDocsMap.values()));
      } else {
        setDocuments([]);
      }
    } catch {
      toast.error('Failed to load document requests');
    }
  };


  useEffect(() => {
    const storedUser = localStorage.getItem('barangay_user');
    let parsed: any = null;
    if (storedUser) {
      try {
        parsed = JSON.parse(storedUser);
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
      } catch {
        loadData();
      }
    } else {
      loadData();
    }

    // Helper to live-check and sync verification status, date_of_birth, and age from DB
    const syncVerificationStatus = async (currentParsed: any) => {
      if (!currentParsed?.email) return;
      try {
        const result = await apiService.checkVerificationStatus(currentParsed.email);
        const liveUser = (result as any)?.user || result;
        if (liveUser) {
          const stored = JSON.parse(localStorage.getItem('barangay_user') || '{}');
          const hasChanged = liveUser.verification_status && liveUser.verification_status !== stored.verification_status;
          const cleanDob = liveUser.date_of_birth ? (typeof liveUser.date_of_birth === 'string' ? liveUser.date_of_birth.split('T')[0] : liveUser.date_of_birth) : (stored.date_of_birth || '');
          const updated = {
            ...stored,
            ...liveUser,
            date_of_birth: cleanDob,
            age: liveUser.age !== undefined && liveUser.age !== null && liveUser.age !== '' ? liveUser.age : stored.age
          };
          setUser(updated);
          setIsVerified(updated.verification_status === 'Verified');
          localStorage.setItem('barangay_user', JSON.stringify(updated));
          if (hasChanged && liveUser.verification_status === 'Verified') {
            toast.success('Account Verified!', {
              description: 'Your account was approved by Barangay Admin. You can now request documents.'
            });
          } else if (hasChanged && liveUser.verification_status === 'Rejected') {
            toast.error('Application Rejected', {
              description: 'Your registration was rejected. Please contact the Barangay Office.'
            });
          }
        }
      } catch { /* silent */ }
    };

    // Immediately sync on mount
    if (parsed) syncVerificationStatus(parsed);

    // Poll every 4 seconds for live DB changes (e.g. admin approves in phpMyAdmin or database)
    const pollInterval = setInterval(() => {
      const latest = JSON.parse(localStorage.getItem('barangay_user') || '{}');
      if (latest?.email) syncVerificationStatus(latest);
    }, 4000);

    // Also re-sync whenever the browser tab regains focus or window is activated
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const latest = JSON.parse(localStorage.getItem('barangay_user') || '{}');
        if (latest?.email) syncVerificationStatus(latest);
        loadData(latest);
      }
    };
    const handleFocus = () => {
      const latest = JSON.parse(localStorage.getItem('barangay_user') || '{}');
      if (latest?.email) syncVerificationStatus(latest);
      loadData(latest);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleRequestDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast.error('Document requests locked!', {
        description: 'Your account must be verified by Barangay Admin first.',
      });
      return;
    }

    // --- Duplicate detection: check if resident already has a pending/processing request ---
    const duplicate = documents.find(
      d => d.document_type === docType && (d.status === 'Pending' || d.status === 'Processing')
    );
    if (duplicate) {
      const suggestion = DUPLICATE_SUGGESTIONS[docType] || 'Please visit the Barangay Hall for assistance.';
      toast.warning(`You already have a ${duplicate.status} request for this document.`, {
        description: `Request Code: ${duplicate.request_code} — ${suggestion}`,
        duration: 9000,
      });
      return;
    }

    const isNoPurposeDoc = docType === 'Certificate of Employment' || docType === 'Certificate of Land Occupancy';
    if (!isNoPurposeDoc && !purpose.trim()) {
      toast.error('Please state the purpose of your request');
      return;
    }

    // Auto-build extra_fields from user profile
    const purok = extractPurok(user?.address);
    const ageDisplay = calculateAge(user?.date_of_birth || user?.birth_date || user?.birthdate, user?.age);
    const autoExtraFields: Record<string, string> = {
      'Age': ageDisplay !== '—' ? ageDisplay.replace(' yrs old', '').trim() : '',
      'Gender': user?.gender || 'Male',
      'Civil Status': user?.civil_status || user?.civilStatus || 'Single',
      'Date of Birth': user?.date_of_birth || user?.birth_date || user?.birthdate || '',
      'Purok / Location': purok || `Barangay ${userBarangay}`,
      'Home Address': user?.address || `Barangay ${userBarangay}, Butuan City`,
      ...extraFields,
    };
    try {
      const defaultDocPurpose = docType === 'Certificate of Land Occupancy'
        ? 'Official Land Actual Occupancy Certification'
        : (docType === 'Certificate of Employment' ? 'Official Employment Certification' : (purpose.trim() || 'Personal Requirement'));
      const created = await apiService.createDocument({
        resident_id: user?.id,
        resident_name: user?.name || 'Resident',
        email: user?.email,
        barangay: user?.barangay || (user?.address?.toLowerCase().includes('anticala') ? 'Anticala' : 'Pianing'),
        document_type: docType,
        purpose: defaultDocPurpose,
        extra_fields: JSON.stringify(autoExtraFields),
      } as any);
      setDocuments([created, ...documents]);
      toast.success('Request submitted!', { description: `Request Code: ${created.request_code}` });
      handleDialogOpenChange(false);
    } catch {
      toast.error('Submission failed. Please try again.');
    }
  };

  const statusColor = (s: string) =>
    s === 'Completed' ? 'bg-emerald-600' : s === 'Processing' ? 'bg-blue-500' : s === 'Rejected' ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Super Admin Unified Ecosystem Switcher */}
      <SuperAdminNavigationDock currentRole={user?.role} />

      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-white shadow-xs border border-indigo-200 flex items-center justify-center">
              <img src="/assets/pianing-logo.png" alt="Barangay Pianing" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">Barangay Pianing</h1>
              <span className="text-xs text-indigo-600 font-semibold">Resident Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Center Trigger */}
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setIsNotificationsOpen(true); }}
                className="relative flex items-center gap-1.5 text-xs border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                title="View Document Status & Verification Notifications"
              >
                <Bell
                  size={14}
                  className={(() => {
                    const unreadCount = [
                      ...(user?.verification_status === 'Rejected' && !readNotifKeys.has('acct-rejected') ? ['acct-rejected'] : []),
                      ...documents.filter(d => ['Completed','Ready for Pickup','Rejected'].includes(d.status) && !readNotifKeys.has(`doc-${d.id || d.request_code}`))
                    ].length;
                    return unreadCount > 0 ? 'text-indigo-600' : 'text-slate-500';
                  })()}
                />
                <span className="hidden sm:inline">Notifications</span>
                {(() => {
                  const unreadCount = [
                    ...(user?.verification_status === 'Rejected' && !readNotifKeys.has('acct-rejected') ? [1] : []),
                    ...documents.filter(d => ['Completed','Ready for Pickup','Rejected'].includes(d.status) && !readNotifKeys.has(`doc-${d.id || d.request_code}`))
                  ].length;
                  return unreadCount > 0 ? (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-xs animate-pulse">
                      {unreadCount}
                    </span>
                  ) : null;
                })()}
              </Button>
            )}

            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-1.5 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              >
                <Settings size={14} />
                <span className="hidden sm:inline">Profile Settings</span>
              </Button>
            )}

            {/* Switch to Health Center */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/resident/health')}
              className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 hidden sm:flex items-center gap-1.5"
            >
              <Heart size={13} />
              Health Center Portal
              <ArrowRight size={12} />
            </Button>

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

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* Verification Banner */}
        {!user || user.role !== 'resident' ? (
          <div className="bg-slate-100 border border-slate-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">Visitor Mode</h3>
                <p className="text-xs text-slate-600 mt-1">Sign in to submit document requests and track their status.</p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate('/login')} className="bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs h-9 px-4 shrink-0">
              Sign In / Register
            </Button>
          </div>
        ) : user?.verification_status === 'Rejected' ? (
          /* Prominent Rejection Banner with Cause */
          <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
                <XCircle size={22} />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-red-950 dark:text-red-200">ID Verification Notice — Correction Required</h3>
                  <Badge className="bg-red-600 text-white text-[10px]">Action Required</Badge>
                </div>
                <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-red-200 dark:border-red-800 text-xs">
                  <span className="font-bold text-red-900 dark:text-red-300 block mb-0.5">Barangay Admin Notice:</span>
                  <p className="text-red-800 dark:text-red-200 font-medium">
                    {user?.rejection_reason || 'Submitted Government ID photo is unclear or information requires correction. Please re-upload a clear photo of your valid ID.'}
                  </p>
                </div>
              </div>
            </div>
            <Button size="sm" onClick={() => setIsResubmitModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-9 px-4 shrink-0 cursor-pointer gap-1.5 shadow-sm">
              <RefreshCw size={13} /> Resubmit Valid ID
            </Button>
          </div>
        ) : !isVerified ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-amber-900">Verification Pending</h3>
                  <Badge className="bg-amber-200 text-amber-900 text-[10px]">Pending</Badge>
                </div>
                <p className="text-xs text-amber-800 mt-1">Your Government ID is under review. Document requests are locked until approval.</p>
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
              <span className="font-bold">Account Verified — Requests Unlocked</span>
            </div>
            <Badge className="bg-emerald-600">Active</Badge>
          </div>
        )}

        {/* Portal Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={22} className="text-indigo-600" />
              <h2 className="text-2xl font-extrabold text-slate-900">Barangay Document Requests</h2>
            </div>
            <p className="text-xs text-slate-500">Request official barangay documents and track their processing status.</p>
          </div>

          <Dialog open={isAddDocOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button
                disabled={!isVerified}
                className={`text-xs gap-1.5 shadow-sm ${!isVerified ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                {!isVerified ? <Lock size={14} /> : <PlusCircle size={15} />}
                Request Barangay Document
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 size={18} className="text-indigo-600" />
                  {docType ? `Request: ${docType}` : 'Choose Document Type'}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {docType
                    ? 'Fill in the required details below, then submit your request.'
                    : 'Select the document you need from the options below.'}
                </DialogDescription>
              </DialogHeader>

              {/* STEP 1: Document type picker — visible only when no type is selected yet */}
              {!docType && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2">
                  {BARANGAY_DOCS.map((doc) => {
                    const existing = documents.find(
                      d => d.document_type === doc && (d.status === 'Pending' || d.status === 'Processing')
                    );
                    const isActive = isCategoryActive(doc);
                    return (
                      <button
                        key={doc}
                        type="button"
                        disabled={!isActive}
                        onClick={() => isActive && handleDocTypeChange(doc)}
                        className={`relative flex items-start gap-3 text-left p-3.5 rounded-xl border-2 transition-all group ${
                          isActive
                            ? 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer'
                            : 'border-slate-200 bg-slate-100/80 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'
                        }`}>
                          <FileText size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={`font-semibold text-xs ${isActive ? 'text-slate-900 group-hover:text-indigo-700' : 'text-slate-500 line-through'}`}>{doc}</p>
                            {!isActive && (
                              <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-rose-200">
                                Suspended
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{DOC_DESCRIPTIONS[doc]}</p>
                          {existing && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">
                              ⏳ {existing.status} · {existing.request_code}
                            </span>
                          )}
                        </div>
                        {isActive && (
                          <span className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs mt-0.5">→</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* STEP 2: Form — visible only after type is selected */}
              {docType && (
                <form onSubmit={handleRequestDocument} className="space-y-4 py-1">
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={() => { setDocType(''); setExtraFields({}); setPurpose(''); }}
                    className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 mb-1"
                  >
                    ← Change document type
                  </button>

                  {/* Auto-filled info — read only */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Your Information (Auto-filled from your account)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <p className="text-[10px] text-slate-400">Full Name</p>
                        <p className="text-xs font-semibold text-slate-800">{user?.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Gender</p>
                        <p className="text-xs font-semibold text-slate-800">{user?.gender || 'Male'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Age</p>
                        <p className="text-xs font-semibold text-slate-800">{calculateAge(user?.date_of_birth || user?.birth_date || user?.birthdate, user?.age)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Purok</p>
                        <p className="text-xs font-semibold text-slate-800">{extractPurok(user?.address) || '—'}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-4">
                        <p className="text-[10px] text-slate-400">Address</p>
                        <p className="text-xs font-semibold text-slate-800">{user?.address || `Barangay ${userBarangay}, Butuan City`}</p>
                      </div>
                    </div>
                  </div>

                  {/* Residency Duration Field for Certificate of Residency */}
                  {docType === 'Certificate of Residency' && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Years of Residency / Living in Barangay
                      </Label>
                      <Input
                        value={extraFields['Duration of Residence'] ?? (user as any)?.years_of_residency ?? ''}
                        onChange={(e) => setField('Duration of Residence', e.target.value)}
                        placeholder="e.g. 5 years (or since 2019)"
                        className="h-9 text-xs"
                      />
                      <p className="text-[10px] text-slate-400">Specify how many years or since what year you have been residing in the barangay.</p>
                    </div>
                  )}

                  {/* Custom Fields for Business Clearance / Business Permit */}
                  {(docType === 'Business Clearance' || docType === 'Business Permit' || docType === 'Business Certificate') && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Store / Business Name & Type <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={extraFields['Business Name'] || ''}
                        onChange={(e) => setField('Business Name', e.target.value)}
                        placeholder="e.g. Maria's Sari-Sari Store"
                        required
                        className="h-9 text-xs"
                      />
                      <p className="text-[10px] text-slate-400">Specify the name of the store or home-based business.</p>
                    </div>
                  )}

                  {/* Custom Fields for Certificate of Employment */}
                  {docType === 'Certificate of Employment' && (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">
                            Job Position / Role <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={extraFields['Job Position'] || ''}
                            onChange={(e) => setField('Job Position', e.target.value)}
                            placeholder="e.g. Store Clerk / Barangay Worker"
                            required
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">
                            Employer / Establishment Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={extraFields['Employer'] || ''}
                            onChange={(e) => setField('Employer', e.target.value)}
                            placeholder="e.g. Pianing Community Enterprise"
                            required
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">
                            Start Date (From) <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={extraFields['Start Date'] || ''}
                            onChange={(e) => setField('Start Date', e.target.value)}
                            placeholder="e.g. January 2022 or 2021"
                            required
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">
                            End Date (To) <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={extraFields['End Date'] || ''}
                            onChange={(e) => setField('End Date', e.target.value)}
                            placeholder="e.g. Present or December 2024"
                            required
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Custom Fields for Certificate of Land Occupancy / Actual Occupancy */}
                  {(docType === 'Certificate of Land Occupancy' || docType === 'Land Occupancy' || docType === 'Actual Occupancy') && (
                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">
                          Parcel Land Area (in Words and Figures) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={extraFields['Land Area'] || ''}
                          onChange={(e) => setField('Land Area', e.target.value)}
                          placeholder="e.g. Nine Hundred Thirty-One (931)"
                          required
                          className="h-9 text-xs"
                        />
                        <p className="text-[10px] text-slate-400">Enter words & figures in parentheses. e.g. <em>Nine Hundred Thirty-One (931)</em></p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">
                            Lot Number (Lot #) <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={extraFields['Lot Number'] || ''}
                            onChange={(e) => setField('Lot Number', e.target.value)}
                            placeholder="e.g. 1005"
                            required
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">
                            Survey / Cadastral Info
                          </Label>
                          <Input
                            value={extraFields['Survey Info'] || ''}
                            onChange={(e) => setField('Survey Info', e.target.value)}
                            placeholder="e.g. PLS-74"
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">
                          Year Started (Occupancy Period) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={extraFields['Occupancy Since'] || ''}
                          onChange={(e) => setField('Occupancy Since', e.target.value)}
                          placeholder="e.g. 1970's (or 1995)"
                          required
                          className="h-9 text-xs"
                        />
                        <p className="text-[10px] text-slate-400">Starting year of actual occupancy (e.g. 1970's or 1995).</p>
                      </div>
                    </div>
                  )}


                  {/* Purpose — only for documents requiring a specific purpose */}
                  {docType !== 'Certificate of Employment' && docType !== 'Certificate of Land Occupancy' && docType !== 'Land Occupancy' && docType !== 'Actual Occupancy' && (
                    <div>
                      <Label className="text-xs font-semibold">
                        {docType === 'Good Moral Clearance' ? 'Purpose / Application To Support' : 'State Purpose'} <span className="text-red-500">*</span>
                      </Label>
                      <textarea
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder={docType === 'Good Moral Clearance' 
                          ? 'e.g. Board Examination for CELE (Certified Electrical Licensure Examination) / PRC Licensure / Employment Application' 
                          : 'e.g. For employment, loan application, school enrollment, bank requirement...'}
                        required
                        rows={3}
                        className="w-full mt-1 px-3 py-2 text-xs rounded-md border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none placeholder:text-slate-400"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">This will appear on your official document. Be specific.</p>
                    </div>
                  )}

                  <DialogFooter>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white w-full">Submit Request</Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Available Documents Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {BARANGAY_DOCS.map((doc) => {
            const isActive = isCategoryActive(doc);
            return (
              <div
                key={doc}
                onClick={() => isActive && handleOpenDocModal(doc)}
                className={`bg-white border rounded-xl p-3 text-center transition-all group shadow-xs ${
                  isActive
                    ? 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 cursor-pointer hover:shadow-sm'
                    : 'border-slate-200 bg-slate-100/80 opacity-60 cursor-not-allowed'
                }`}
                title={isActive ? `Click to request ${doc}` : `${doc} is temporarily suspended by Super Admin`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 transition-colors ${
                  isActive
                    ? 'bg-indigo-100 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white'
                    : 'bg-slate-200 text-slate-400'
                }`}>
                  <FileText size={16} />
                </div>
                <p className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-slate-700 group-hover:text-indigo-700' : 'text-slate-500'}`}>{doc}</p>
                {!isActive && (
                  <span className="inline-block mt-1 bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-200">
                    Suspended
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Requests Table */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="text-indigo-600" size={18} />
              My Barangay Document Requests
              <Badge variant="outline" className="ml-auto text-[10px]">{documents.length} Total</Badge>
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
                  <TableHead className="text-xs">Date Submitted</TableHead>
                  <TableHead className="text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs py-10 text-slate-400">
                      <Building2 className="mx-auto mb-2 text-slate-300" size={28} />
                      No barangay document requests yet. Click <strong>"Request Barangay Document"</strong> above.
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc, idx) => (
                    <TableRow key={`doc-${doc.id}-${doc.document_type}-${idx}`} className="text-xs">
                      <TableCell className="font-mono font-semibold text-indigo-600">{doc.request_code}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{doc.document_type}</TableCell>
                      <TableCell className="text-slate-500">{doc.purpose || '—'}</TableCell>
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
                            <CheckCircle2 size={12} className="text-indigo-600" /> Ready for Pickup at Hall
                          </span>
                        ) : doc.status === 'Completed' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                            <CheckCircle2 size={12} /> Claimed / Completed
                          </span>
                        ) : doc.status === 'Processing' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                            <Clock size={12} /> In Preparation
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                            <Clock size={12} /> Queued
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

        {/* Switch Portal CTA */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Heart size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-emerald-900">Need Health Center Services?</h3>
              <p className="text-xs text-emerald-700">Request medical certificates, immunization records, or maternal health documents.</p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/resident/health')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-5 shrink-0 flex items-center gap-1.5"
          >
            Go to Health Center Portal <ArrowRight size={14} />
          </Button>
        </div>
      </main>

      <BarangayChatbot />

      {/* Resident Notifications Center Modal */}
      <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 max-w-lg max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Bell className="text-indigo-600" size={18} />
                  Resident Notifications &amp; Status Updates
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Live updates for your document requests, clearance approvals, and account status.
                </DialogDescription>
              </div>
              <button
                onClick={markAllNotifsRead}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold whitespace-nowrap hover:underline mt-1 cursor-pointer"
                title="Mark all notifications as read"
              >
                ✓ Mark All Read
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-2.5 py-2 text-xs">
            {/* 1. Account Rejection Notice (if rejected) */}
            {user?.verification_status === 'Rejected' && (() => {
              const notifKey = 'acct-rejected';
              const isRead = readNotifKeys.has(notifKey);
              return (
                <div
                  className={`p-3.5 rounded-xl border space-y-1.5 cursor-pointer transition-all ${
                    isRead
                      ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200/60 opacity-70'
                      : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700 shadow-sm'
                  }`}
                  onClick={() => markNotifRead(notifKey)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-900 dark:text-red-300 flex items-center gap-1.5">
                      {!isRead && <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />}
                      <XCircle size={14} /> Account Registration Rejected
                    </span>
                    <Badge className="bg-red-600 text-white text-[10px]">Action Needed</Badge>
                  </div>
                  <p className="text-red-800 dark:text-red-200 text-xs">
                    <strong>Cause of Rejection:</strong> {user?.rejection_reason || 'Submitted Government ID photo is unclear or information does not match.'}
                  </p>
                  <div className="pt-1">
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); markNotifRead(notifKey); setIsNotificationsOpen(false); setIsProfileModalOpen(true); }}
                      className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white gap-1 cursor-pointer"
                    >
                      <Settings size={12} /> Re-submit ID / Update Details
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* 2. Ready for Pickup Documents */}
            {documents.filter(d => d.status === 'Ready for Pickup').map((doc, idx) => {
              const notifKey = `doc-${doc.id || doc.request_code}`;
              const isRead = readNotifKeys.has(notifKey);
              return (
                <div
                  key={`notif-ready-${doc.id || idx}`}
                  className={`p-3.5 rounded-xl border space-y-1 cursor-pointer transition-all ${
                    isRead
                      ? 'bg-indigo-50/40 border-indigo-200/50 opacity-70'
                      : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-sm'
                  }`}
                  onClick={() => markNotifRead(notifKey)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1.5 ${isRead ? 'font-semibold text-indigo-700' : 'font-bold text-indigo-900 dark:text-indigo-300'}`}>
                      {!isRead && <span className="w-2 h-2 bg-indigo-500 rounded-full inline-block shrink-0" />}
                      <CheckCircle2 size={14} className="text-indigo-600" /> 🎉 Ready for Pick-Up: {doc.document_type}
                    </span>
                    <Badge className="bg-indigo-600 text-white text-[10px]">Ready for Pickup</Badge>
                  </div>
                  <p className="text-indigo-800 dark:text-indigo-200 text-xs">
                    Your document (<strong>{doc.request_code}</strong>) is approved and signed. Claim at the Barangay Hall during office hours.
                  </p>
                  <p className="text-[10px] text-indigo-600 font-mono">
                    Ref: {doc.request_code} • By: {doc.processed_by || 'Barangay Staff'}
                  </p>
                </div>
              );
            })}

            {/* 3. Claimed / Completed Documents */}
            {documents.filter(d => d.status === 'Completed').map((doc, idx) => {
              const notifKey = `doc-${doc.id || doc.request_code}`;
              const isRead = readNotifKeys.has(notifKey);
              return (
                <div
                  key={`notif-done-${doc.id || idx}`}
                  className={`p-3.5 rounded-xl border space-y-1 cursor-pointer transition-all ${
                    isRead
                      ? 'bg-emerald-50/40 border-emerald-200/50 opacity-70'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-sm'
                  }`}
                  onClick={() => markNotifRead(notifKey)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1.5 ${isRead ? 'font-semibold text-emerald-700' : 'font-bold text-emerald-900 dark:text-emerald-300'}`}>
                      {!isRead && <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block shrink-0" />}
                      <CheckCircle2 size={14} className="text-emerald-600" /> Issued &amp; Claimed: {doc.document_type}
                    </span>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Completed</Badge>
                  </div>
                  <p className="text-emerald-800 dark:text-emerald-200 text-xs">
                    Your request (<strong>{doc.request_code}</strong>) was successfully issued and received.
                  </p>
                  <p className="text-[10px] text-emerald-600 font-mono">
                    Ref: {doc.request_code} • Released by: {doc.processed_by || 'Barangay Staff'}
                  </p>
                </div>
              );
            })}

            {/* 4. Processing Documents */}
            {documents.filter(d => d.status === 'Processing').map((doc, idx) => {
              const notifKey = `doc-${doc.id || doc.request_code}`;
              const isRead = readNotifKeys.has(notifKey);
              return (
                <div
                  key={`notif-proc-${doc.id || idx}`}
                  className={`p-3 rounded-xl border space-y-0.5 cursor-pointer transition-all ${
                    isRead
                      ? 'bg-amber-50/40 border-amber-200/50 opacity-60'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200'
                  }`}
                  onClick={() => markNotifRead(notifKey)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      {!isRead && <span className="w-2 h-2 bg-amber-500 rounded-full inline-block shrink-0" />}
                      <Clock size={13} className="text-amber-600" /> In Preparation: {doc.document_type}
                    </span>
                    <Badge className="bg-amber-500 text-white text-[10px]">Processing</Badge>
                  </div>
                  <p className="text-amber-800 dark:text-amber-200 text-xs">
                    <strong>{doc.request_code}</strong> is being prepared by the Barangay Office.
                  </p>
                </div>
              );
            })}

            {/* 5. Pending Documents */}
            {documents.filter(d => d.status === 'Pending').map((doc, idx) => {
              const notifKey = `doc-${doc.id || doc.request_code}`;
              const isRead = readNotifKeys.has(notifKey);
              return (
                <div
                  key={`notif-pend-${doc.id || idx}`}
                  className={`p-3 rounded-xl border space-y-0.5 cursor-pointer transition-all ${
                    isRead
                      ? 'bg-slate-50/40 border-slate-200/50 opacity-60'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200'
                  }`}
                  onClick={() => markNotifRead(notifKey)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {!isRead && <span className="w-2 h-2 bg-slate-400 rounded-full inline-block shrink-0" />}
                      <Clock size={13} className="text-slate-500" /> Queued: {doc.document_type}
                    </span>
                    <Badge className="bg-slate-500 text-white text-[10px]">Pending</Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">
                    <strong>{doc.request_code}</strong> is in the verification queue.
                  </p>
                </div>
              );
            })}

            {/* 6. Rejected Document Requests */}
            {documents.filter(d => d.status === 'Rejected').map((doc, idx) => {
              const notifKey = `doc-${doc.id || doc.request_code}`;
              const isRead = readNotifKeys.has(notifKey);
              return (
                <div
                  key={`notif-rej-${doc.id || idx}`}
                  className={`p-3.5 rounded-xl border space-y-1 cursor-pointer transition-all ${
                    isRead
                      ? 'bg-red-50/40 border-red-200/50 opacity-60'
                      : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700 shadow-sm'
                  }`}
                  onClick={() => markNotifRead(notifKey)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1.5 ${isRead ? 'font-semibold text-red-700' : 'font-bold text-red-900 dark:text-red-300'}`}>
                      {!isRead && <span className="w-2 h-2 bg-red-500 rounded-full inline-block shrink-0" />}
                      <XCircle size={14} className="text-red-600" /> Document Request Rejected
                    </span>
                    <Badge className="bg-red-600 text-white text-[10px]">Rejected</Badge>
                  </div>
                  <p className="text-red-800 dark:text-red-200 text-xs">
                    Request for <strong>{doc.document_type}</strong> ({doc.request_code}) was rejected.
                  </p>
                  <p className="text-xs text-red-700 bg-red-100/70 p-2 rounded-md">
                    <strong>Cause:</strong> {doc.purpose || 'Document requirements incomplete or unverified.'}
                  </p>
                </div>
              );
            })}

            {/* Empty State */}
            {documents.length === 0 && user?.verification_status !== 'Rejected' && (
              <div className="text-center py-10 text-slate-400">
                <Bell size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium text-slate-500">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-1">When your document requests are updated or need attention, they'll appear here.</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={markAllNotifsRead} className="text-xs gap-1.5">
              ✓ Mark All as Read
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsNotificationsOpen(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resident Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onProfileUpdated={(updated) => setUser(updated)}
      />

      {/* Resident ID Resubmission / Correction Modal */}
      <ResubmitIdModal
        isOpen={isResubmitModalOpen}
        onClose={() => setIsResubmitModalOpen(false)}
        user={user}
        onResubmitted={(updated) => {
          setUser(updated);
          setIsVerified(false);
        }}
      />
    </div>
  );
}
