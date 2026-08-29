import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  FileText,
  AlertTriangle,
  LogOut,
  PlusCircle,
  CheckCircle2,
  Lock,
  Heart,
  Building2,
  ArrowRight,
  Baby,
  Stethoscope,
  Activity,
  Clock,
  Settings,
  Bell,
  XCircle,
  Calendar,
  CalendarCheck,
  MapPin,
  Users,
  CheckCircle,
  Phone,
  Sparkles
} from 'lucide-react';
import { apiService, DocumentRequest, HealthAppointment, ClinicSchedule } from '../../services/api';
import BarangayChatbot from '../components/BarangayChatbot';
import ProfileSettingsModal from '../components/ProfileSettingsModal';
import SuperAdminNavigationDock from '../components/SuperAdminNavigationDock';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const HEALTH_DOCS = [
  { name: 'Medical Certificate', icon: Stethoscope, color: 'bg-emerald-100 text-emerald-700', desc: 'General health status certification from BHW.' },
  { name: 'Health Clearance', icon: CheckCircle2, color: 'bg-teal-100 text-teal-700', desc: 'Clearance for employment or school enrollment.' },
  { name: 'Immunization Record', icon: Baby, color: 'bg-blue-100 text-blue-700', desc: 'Official record of completed child vaccinations.' },
  { name: 'Prenatal Record', icon: Heart, color: 'bg-pink-100 text-pink-700', desc: 'Maternal health and prenatal checkup history.' },
  { name: 'Postnatal Record', icon: Activity, color: 'bg-violet-100 text-violet-700', desc: 'Postpartum and newborn recovery records.' },
];

const HEALTH_SERVICES = [
  { name: 'Pre-Marriage Counseling (PMC)', icon: Heart, desc: 'Mandatory seminar and counseling session for marriage license applicants.' },
  { name: 'Prenatal Check-up', icon: Activity, desc: 'Regular maternal and fetal growth monitoring with BHWs and Midwife.' },
  { name: 'Child Immunization', icon: Baby, desc: 'DOH infant and child vaccination series (BCG, DPT, Hepatitis B, MMR, Polio).' },
  { name: 'Family Planning & Counseling', icon: Users, desc: 'Reproductive health, contraceptives, and responsible parenthood.' },
  { name: 'General Medical Consultation', icon: Stethoscope, desc: 'Non-emergency health consultation and vital signs check.' },
  { name: 'Dental Check-up & Hygiene', icon: Sparkles, desc: 'Oral health screening and preventive fluoride application.' },
];

function getUpcomingDatesForSchedule(scheduleDay: string, count = 4): { dateStr: string; label: string }[] {
  const dayIndexMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
  };
  const cleanDay = scheduleDay.toLowerCase().replace(/every\s*/i, '').replace(/s$/i, '').trim();
  const targetDay = dayIndexMap[cleanDay];
  if (targetDay === undefined) return [];

  const results: { dateStr: string; label: string }[] = [];
  const current = new Date();
  current.setDate(current.getDate() + 1); // Start from tomorrow

  let attempts = 0;
  while (results.length < count && attempts < 90) {
    if (current.getDay() === targetDay) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const label = current.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      results.push({ dateStr, label });
    }
    current.setDate(current.getDate() + 1);
    attempts++;
  }
  return results;
}

export default function HealthCenterPortal() {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState<'documents' | 'appointments'>('documents');
  const [requests, setRequests] = useState<{ id: number; type: string; purpose: string; status: string; date: string }[]>([]);
  const [appointments, setAppointments] = useState<HealthAppointment[]>([]);
  const [clinicSchedules, setClinicSchedules] = useState<ClinicSchedule[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBookApptOpen, setIsBookApptOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [docType, setDocType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  // Appointment Form State
  const [apptServiceType, setApptServiceType] = useState('Pre-Marriage Counseling (PMC)');
  const [apptPreferredDate, setApptPreferredDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    return tomorrow.toISOString().split('T')[0];
  });
  const [apptPreferredTime, setApptPreferredTime] = useState('Morning (8:00 AM - 11:30 AM)');
  const [apptNotes, setApptNotes] = useState('');
  const [apptPhone, setApptPhone] = useState('');
  const [apptSubmitting, setApptSubmitting] = useState(false);

  // Dynamic extra fields per document type
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const setField = (key: string, val: string) => setExtraFields(prev => ({ ...prev, [key]: val }));
  
  const isCategoryActive = (docName: string) => {
    if (!categories || categories.length === 0) return true;
    const cat = categories.find(c => c.name.toLowerCase() === docName.toLowerCase());
    return cat ? cat.status === 'Active' : true;
  };

  const handleDocTypeChange = (val: string) => { 
    setDocType(val); 
    setExtraFields({}); 
    setPurpose(''); 
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsAddOpen(open);
    if (!open) {
      setDocType('');
      setExtraFields({});
      setPurpose('');
    }
  };

  const loadData = async (currentUser?: any) => {
    try {
      const [data, cats, apts, schedules] = await Promise.all([
        apiService.getDocuments(),
        apiService.getCategories().catch(() => []),
        apiService.getAppointments().catch(() => []),
        apiService.getClinicSchedules().catch(() => [])
      ]);
      if (cats && cats.length > 0) setCategories(cats);
      if (schedules) setClinicSchedules(schedules);

      const loggedInUser = currentUser || user;
      const healthDocNames = HEALTH_DOCS.map(d => d.name);
      const healthDocs = data.filter(d => healthDocNames.includes(d.document_type));
      if (loggedInUser?.email || loggedInUser?.id) {
        const uEmail = (loggedInUser.email || '').toLowerCase().trim();
        const uId = loggedInUser.id;
        // STRICT filter: only match by exact email or exact resident_id
        const userDocs = healthDocs.filter(d => {
          const dEmail = ((d as any).email || '').toLowerCase().trim();
          if (uEmail && dEmail && dEmail === uEmail) return true;
          if (uId && d.resident_id && d.resident_id === uId) return true;
          return false;
        });
        setRequests(userDocs.map(d => ({
          id: d.id,
          type: d.document_type,
          purpose: d.purpose || 'Health Requirement',
          status: d.status,
          date: d.requested_at ? new Date(d.requested_at).toLocaleDateString() : 'Recent'
        })));

        // Filter appointments for this resident
        const userApts = (apts || []).filter((a: HealthAppointment) => {
          if (uId && a.resident_id && a.resident_id === uId) return true;
          if (uEmail && a.resident_email && a.resident_email.toLowerCase() === uEmail) return true;
          if (loggedInUser.name && a.resident_name.toLowerCase().includes(loggedInUser.name.toLowerCase())) return true;
          return false;
        });
        setAppointments(userApts);
      } else {
        setRequests([]);
        setAppointments((apts || []).slice(0, 2));
      }
    } catch {
      // Fallback
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

        // Live-check if admin has approved since last login, and sync date_of_birth / age
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
      } catch {
        loadData();
      }
    } else {
      loadData();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast.error('Requests locked! Your account must be verified first.');
      return;
    }
    // Duplicate detection: check if resident already has a pending/processing request
    const duplicate = requests.find(
      d => d.type === docType && (d.status === 'Pending' || d.status === 'Processing')
    );
    if (duplicate) {
      toast.warning(`You already have an active ${duplicate.status} request for ${docType}.`, {
        description: 'Please wait for BHW processing or visit the Health Center.',
        duration: 8000,
      });
      return;
    }

    const extraParts = Object.entries(extraFields).filter(([k]) => k !== 'Purpose').map(([k, v]) => `${k}: ${v}`).join(' | ');
    const fullPurpose = [purpose, extraParts].filter(Boolean).join(' — ') || 'Health Requirement';
    try {
      const created = await apiService.createDocument({
        resident_id: user?.id,
        resident_name: user?.name || 'Resident',
        document_type: docType,
        purpose: fullPurpose,
      });
      const newReq = {
        id: created.id,
        type: created.document_type,
        purpose: created.purpose || 'Health Requirement',
        status: created.status,
        date: created.requested_at ? new Date(created.requested_at).toLocaleDateString() : 'Recent',
      };
      setRequests((prev) => [newReq, ...prev]);
      toast.success('Health record request submitted!', { description: `Request code: ${created.request_code}` });
      handleDialogOpenChange(false);
    } catch (err) {
      toast.error('Submission failed. Please try again.');
    }
  };

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast.error('Appointments locked! Your account must be verified first.');
      return;
    }
    if (!apptPreferredDate) {
      toast.error('Please select your preferred appointment date.');
      return;
    }

    // Strict Schedule Validation
    const matchingSchedules = clinicSchedules.filter(s =>
      s.service_type === apptServiceType ||
      apptServiceType.toLowerCase().includes(s.service_type.toLowerCase()) ||
      s.service_type.toLowerCase().includes(apptServiceType.toLowerCase())
    );
    const activeSchedule = matchingSchedules[0] || null;

    if (activeSchedule) {
      const selectedDateObj = new Date(apptPreferredDate + 'T00:00:00');
      const selectedDayName = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const isDayValid = activeSchedule.day_of_week.toLowerCase().includes(selectedDayName.toLowerCase());

      if (!isDayValid) {
        toast.error(`Strict Schedule Rule: Invalid Day!`, {
          description: `${apptServiceType} is strictly scheduled on ${activeSchedule.day_of_week} only. You selected a ${selectedDayName}. Please pick a valid ${activeSchedule.day_of_week.replace(/every\s*/i, '')}.`
        });
        return;
      }

      const isTimeValid = matchingSchedules.some(s => s.time_slot.toLowerCase().trim() === apptPreferredTime.toLowerCase().trim());
      if (!isTimeValid) {
        toast.error(`Strict Schedule Rule: Invalid Time Slot!`, {
          description: `${apptServiceType} is strictly scheduled for ${activeSchedule.time_slot}. Please select the official time slot.`
        });
        return;
      }
    }

    setApptSubmitting(true);
    try {
      const created = await apiService.createAppointment({
        resident_id: user?.id,
        resident_name: user?.name || 'Resident',
        resident_phone: apptPhone || user?.phone || '',
        resident_email: user?.email || '',
        barangay: user?.barangay || 'Pianing',
        service_type: apptServiceType,
        preferred_date: apptPreferredDate,
        preferred_time: apptPreferredTime,
        resident_notes: apptNotes,
      });

      setAppointments(prev => [created, ...prev]);
      toast.success('Health appointment booked!', {
        description: `Ref Code: ${created.appointment_code}. Schedule confirmed on ${apptPreferredDate} (${apptPreferredTime}).`
      });
      setIsBookApptOpen(false);
      setApptNotes('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to book appointment.');
    } finally {
      setApptSubmitting(false);
    }
  };

  const statusColor = (s: string) =>
    s === 'Completed' ? 'bg-emerald-600' : s === 'Processing' || s === 'Approved' ? 'bg-blue-600' : s === 'Rejected' || s === 'Cancelled' ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Super Admin Unified Ecosystem Switcher */}
      <SuperAdminNavigationDock currentRole={user?.role} />

      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-white shadow-xs border border-emerald-200 flex items-center justify-center">
              <img src="/assets/pianing-logo.png" alt="Barangay Pianing" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">Barangay Pianing</h1>
              <span className="text-xs text-emerald-600 font-semibold">Health Center Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Center Trigger */}
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNotificationsOpen(true)}
                className="relative flex items-center gap-1.5 text-xs border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                title="View Document Status & Verification Notifications"
              >
                <Bell size={14} className={requests.some(d => d.status === 'Completed' || d.status === 'Rejected') || user?.verification_status === 'Rejected' ? "text-emerald-600" : ""} />
                <span className="hidden sm:inline">Notifications</span>
                {(requests.filter(d => d.status === 'Completed' || d.status === 'Rejected').length + (user?.verification_status === 'Rejected' ? 1 : 0)) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-xs animate-pulse">
                    {requests.filter(d => d.status === 'Completed' || d.status === 'Rejected').length + (user?.verification_status === 'Rejected' ? 1 : 0)}
                  </span>
                )}
              </Button>
            )}

            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-1.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <Settings size={14} />
                <span className="hidden sm:inline">Profile Settings</span>
              </Button>
            )}

            {/* Switch to Barangay */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/resident/barangay')}
              className="text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50 hidden sm:flex items-center gap-1.5"
            >
              <Building2 size={13} />
              Barangay Portal
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
                <p className="text-xs text-slate-600 mt-1">Sign in to request health documents and view your records.</p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate('/login')} className="bg-slate-700 hover:bg-slate-800 text-white text-xs h-9 px-4 shrink-0">
              Sign In / Register
            </Button>
          </div>
        ) : user?.verification_status === 'Rejected' ? (
          /* Prominent Rejection Banner with Cause */
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
                <XCircle size={22} />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-red-950">Application Revision Required</h3>
                  <Badge className="bg-red-600 text-white text-[10px]">Rejected by Admin</Badge>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-red-200 text-xs">
                  <span className="font-bold text-red-900 block mb-0.5">Cause / Reason for Rejection:</span>
                  <p className="text-red-800 font-medium">
                    {user?.rejection_reason || 'Submitted Government ID photo is unclear or information requires correction. Please update your profile or re-upload a clear ID.'}
                  </p>
                </div>
              </div>
            </div>
            <Button size="sm" onClick={() => setIsProfileModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-9 px-4 shrink-0 cursor-pointer">
              Update Profile / ID
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
                <p className="text-xs text-amber-800 mt-1">Your ID is under review by the Barangay Admin. Requests are locked until approved.</p>
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
              <span className="font-bold">Account Verified — Health Requests Unlocked</span>
            </div>
            <Badge className="bg-emerald-600">Active</Badge>
          </div>
        )}

        {/* Sub-Tab Switcher: Documents vs. Health Appointments */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('documents')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'documents'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText size={15} />
            <span>Health Documents &amp; Certificates</span>
            <Badge variant="secondary" className={`text-[10px] ml-1 ${activeSubTab === 'documents' ? 'bg-emerald-700 text-white' : 'bg-slate-100'}`}>
              {requests.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('appointments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'appointments'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CalendarCheck size={15} />
            <span>Health Appointments &amp; Clinic Schedule</span>
            <Badge variant="secondary" className={`text-[10px] ml-1 ${activeSubTab === 'appointments' ? 'bg-emerald-700 text-white' : 'bg-slate-100'}`}>
              {appointments.length}
            </Badge>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* VIEW 1: HEALTH DOCUMENTS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'documents' && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Heart size={22} className="text-emerald-600" />
                  <h2 className="text-2xl font-extrabold text-slate-900">Health Center Document Requests</h2>
                </div>
                <p className="text-xs text-slate-500">Request health documents processed by Barangay Health Workers (BHW).</p>
              </div>

              <Dialog open={isAddOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button
                    disabled={!isVerified}
                    className={`text-xs gap-1.5 shadow-sm ${!isVerified ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'}`}
                  >
                    {!isVerified ? <Lock size={14} /> : <PlusCircle size={15} />}
                    Request Health Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Heart size={18} className="text-emerald-600" />
                      {docType ? `Request: ${docType}` : 'Choose Document Type'}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      {docType
                        ? 'Fill in the required health details below, then submit your request.'
                        : 'Select the health document you need from the options below.'}
                    </DialogDescription>
                  </DialogHeader>

                  {/* STEP 1: Health Document Type Picker */}
                  {!docType && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-2">
                      {HEALTH_DOCS.map(({ name, icon: Icon, color, desc }) => {
                        const existing = requests.find(
                          d => d.type === name && (d.status === 'Pending' || d.status === 'Processing')
                        );
                        const isActive = isCategoryActive(name);
                        return (
                          <button
                            key={name}
                            type="button"
                            disabled={!isActive}
                            onClick={() => isActive && handleDocTypeChange(name)}
                            className={`relative flex items-start gap-3 text-left p-3.5 rounded-xl border-2 transition-all group ${
                              isActive
                                ? 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/60 cursor-pointer'
                                : 'border-slate-200 bg-slate-100/80 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg ${isActive ? color : 'bg-slate-200 text-slate-400'} flex items-center justify-center shrink-0 mt-0.5 shadow-xs`}>
                              <Icon size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className={`font-bold text-xs ${isActive ? 'text-slate-900 group-hover:text-emerald-800' : 'text-slate-500 line-through'}`}>{name}</p>
                                {!isActive && (
                                  <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-rose-200">
                                    Suspended
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{desc}</p>
                              {existing && (
                                <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                                  ⏳ {existing.status}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* STEP 2: Detail Form */}
                  {docType && (
                    <form onSubmit={handleSubmit} className="space-y-3.5 py-2 text-xs">
                      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <span className="text-[11px] font-semibold text-slate-600">Selected: <strong>{docType}</strong></span>
                        <button
                          type="button"
                          onClick={() => setDocType('')}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                        >
                          ← Change Document
                        </button>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold">Purpose / Reason for Request <span className="text-red-500">*</span></Label>
                        <textarea
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          placeholder={`State why and where you need this ${docType} (e.g. Pre-employment medical clearance, daycare enrollment, PhilHealth...)`}
                          required
                          rows={2}
                          className="w-full mt-1 px-3 py-2 text-xs rounded-md border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none placeholder:text-slate-400"
                        />
                      </div>

                      {/* Medical Certificate */}
                      {docType === 'Medical Certificate' && (
                        <>
                          <div>
                            <Label className="text-xs font-semibold">Known Medical Condition (if any)</Label>
                            <Input value={extraFields['Condition'] || ''} onChange={e => setField('Condition', e.target.value)} placeholder="e.g. None / Hypertension / Asthma" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs font-semibold">Date of Birth</Label>
                              <Input type="date" value={extraFields['Date of Birth'] || ''} onChange={e => setField('Date of Birth', e.target.value)} required />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold">Gender</Label>
                              <Select value={extraFields['Gender'] || ''} onValueChange={v => setField('Gender', v)}>
                                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Male">Male</SelectItem>
                                  <SelectItem value="Female">Female</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Health Clearance */}
                      {docType === 'Health Clearance' && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs font-semibold">Chest X-Ray Result</Label>
                              <Input value={extraFields['X-Ray'] || ''} onChange={e => setField('X-Ray', e.target.value)} placeholder="e.g. Normal / Pending" />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold">CBC / Urinalysis</Label>
                              <Input value={extraFields['Lab Results'] || ''} onChange={e => setField('Lab Results', e.target.value)} placeholder="e.g. Normal" />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold">Employer / Institution</Label>
                            <Input value={extraFields['Institution'] || ''} onChange={e => setField('Institution', e.target.value)} placeholder="e.g. ABC School / XYZ Corporation" />
                          </div>
                        </>
                      )}

                      {/* Immunization Record */}
                      {docType === 'Immunization Record' && (
                        <>
                          <div>
                            <Label className="text-xs font-semibold">Child Full Name</Label>
                            <Input value={extraFields['Child Name'] || ''} onChange={e => setField('Child Name', e.target.value)} placeholder="Baby Juan Dela Cruz" required />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs font-semibold">Child Date of Birth</Label>
                              <Input type="date" value={extraFields['Child DOB'] || ''} onChange={e => setField('Child DOB', e.target.value)} required />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold">Mother / Guardian Name</Label>
                              <Input value={extraFields['Mother Name'] || ''} onChange={e => setField('Mother Name', e.target.value)} placeholder="Maria Santos" required />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Prenatal Record */}
                      {docType === 'Prenatal Record' && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs font-semibold">Current Trimester</Label>
                              <Select value={extraFields['Trimester'] || ''} onValueChange={v => setField('Trimester', v)}>
                                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1st Trimester">1st Trimester</SelectItem>
                                  <SelectItem value="2nd Trimester">2nd Trimester</SelectItem>
                                  <SelectItem value="3rd Trimester">3rd Trimester</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs font-semibold">Expected Due Date</Label>
                              <Input type="date" value={extraFields['Due Date'] || ''} onChange={e => setField('Due Date', e.target.value)} />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold">Attending BHW / Midwife</Label>
                            <Input value={extraFields['Attending Midwife'] || ''} onChange={e => setField('Attending Midwife', e.target.value)} placeholder="e.g. Nurse Maria Santos" />
                          </div>
                        </>
                      )}

                      {/* Postnatal Record */}
                      {docType === 'Postnatal Record' && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs font-semibold">Date of Delivery</Label>
                              <Input type="date" value={extraFields['Delivery Date'] || ''} onChange={e => setField('Delivery Date', e.target.value)} required />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold">Type of Delivery</Label>
                              <Select value={extraFields['Delivery Type'] || ''} onValueChange={v => setField('Delivery Type', v)}>
                                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Normal Spontaneous (NSD)">Normal (NSD)</SelectItem>
                                  <SelectItem value="Cesarean Section (CS)">Cesarean (CS)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </>
                      )}

                      <DialogFooter className="gap-2 pt-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleDialogOpenChange(false)} className="text-xs">
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm">
                          <PlusCircle size={14} />
                          Submit Request
                        </Button>
                      </DialogFooter>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            {/* Available Health Document Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {HEALTH_DOCS.map(({ name, icon: Icon, color, desc }) => {
                const isActive = isCategoryActive(name);
                return (
                  <div
                    key={name}
                    onClick={() => {
                      if (isActive) {
                        setIsAddOpen(true);
                        handleDocTypeChange(name);
                      }
                    }}
                    className={`bg-white border rounded-xl p-4 transition-all shadow-xs ${
                      isActive
                        ? 'border-slate-200 hover:border-emerald-400 hover:shadow-sm cursor-pointer'
                        : 'border-slate-200 bg-slate-100/80 opacity-60 cursor-not-allowed'
                    }`}
                    title={isActive ? `Click to request ${name}` : `${name} is temporarily suspended by Super Admin`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${isActive ? color : 'bg-slate-200 text-slate-400'} flex items-center justify-center mb-3`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <p className={`text-xs font-bold leading-tight ${isActive ? 'text-slate-800' : 'text-slate-500 line-through'}`}>{name}</p>
                      {!isActive && (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-200">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Requests Table */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="text-emerald-600" size={18} />
                  My Health Document Requests
                  <Badge variant="outline" className="ml-auto text-[10px]">{requests.length} Total</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs">Document Type</TableHead>
                      <TableHead className="text-xs">Purpose</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Date Submitted</TableHead>
                      <TableHead className="text-xs text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs py-10 text-slate-400">
                          <Heart className="mx-auto mb-2 text-slate-300" size={28} />
                          No health requests yet. Click <strong>"Request Health Document"</strong> above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((r) => (
                        <TableRow key={r.id} className="text-xs">
                          <TableCell className="font-semibold text-slate-900">{r.type}</TableCell>
                          <TableCell className="text-slate-500">{r.purpose}</TableCell>
                          <TableCell><Badge className={statusColor(r.status)}>{r.status}</Badge></TableCell>
                          <TableCell className="font-mono text-slate-400 text-[11px]">{r.date}</TableCell>
                          <TableCell className="text-right">
                            {r.status === 'Completed' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                                <CheckCircle2 size={12} /> Ready for Pickup
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                                Processing
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
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: HEALTH APPOINTMENTS & CLINIC SCHEDULES */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'appointments' && (
          <div className="space-y-6">
            {/* Header with Book Appointment button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CalendarCheck size={22} className="text-emerald-600" />
                  <h2 className="text-2xl font-extrabold text-slate-900">Health Center Appointments &amp; Schedules</h2>
                </div>
                <p className="text-xs text-slate-500">
                  Book an appointment for <strong>Pre-Marriage Counseling (PMC)</strong>, Prenatal Care, Child Immunization, and general consultations.
                </p>
              </div>

              {/* Book Appointment Modal Trigger */}
              <Dialog open={isBookApptOpen} onOpenChange={setIsBookApptOpen}>
                <DialogTrigger asChild>
                  <Button
                    disabled={!isVerified}
                    className={`text-xs gap-1.5 shadow-sm ${!isVerified ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'}`}
                  >
                    {!isVerified ? <Lock size={14} /> : <Calendar size={15} />}
                    Book Health Appointment
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-900">
                      <CalendarCheck size={18} className="text-emerald-600" />
                      Book Health Center Appointment
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Submit your preferred appointment schedule. The Barangay Health Worker (BHW) will review and confirm your slot via SMS &amp; Email.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleAppointmentSubmit} className="space-y-3.5 py-2 text-xs">
                    {/* Service Type Selection */}
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Select Health Service / Program <span className="text-red-500">*</span></Label>
                      <Select
                        value={apptServiceType}
                        onValueChange={(val) => {
                          setApptServiceType(val);
                          const matched = clinicSchedules.find(s =>
                            s.service_type === val ||
                            val.toLowerCase().includes(s.service_type.toLowerCase()) ||
                            s.service_type.toLowerCase().includes(val.toLowerCase())
                          );
                          if (matched) {
                            setApptPreferredTime(matched.time_slot);
                            const upcoming = getUpcomingDatesForSchedule(matched.day_of_week, 1);
                            if (upcoming.length > 0) {
                              setApptPreferredDate(upcoming[0].dateStr);
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1 h-9 text-xs">
                          <SelectValue placeholder="Select health program..." />
                        </SelectTrigger>
                        <SelectContent>
                          {HEALTH_SERVICES.map(s => (
                            <SelectItem key={s.name} value={s.name} className="text-xs">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {HEALTH_SERVICES.find(s => s.name === apptServiceType)?.desc}
                      </p>
                    </div>

                    {/* Pre-Marriage Special Notice */}
                    {apptServiceType.includes('Pre-Marriage') && (
                      <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl text-pink-900 text-xs space-y-1">
                        <span className="font-bold flex items-center gap-1.5 text-pink-950">
                          💍 Pre-Marriage Counseling (PMC) Requirement Note:
                        </span>
                        <p className="text-[11px] leading-relaxed text-pink-800">
                          Both couple applicants are required to attend the seminar. Please bring: (1) Valid IDs of both parties, (2) Barangay Residency Certificate, and (3) CENOMAR from PSA.
                        </p>
                      </div>
                    )}

                    {/* Available Official Schedules Picker (Posted by Staff / BHW) */}
                    {(() => {
                      const matchingSchedules = clinicSchedules.filter(s =>
                        s.service_type === apptServiceType ||
                        apptServiceType.toLowerCase().includes(s.service_type.toLowerCase()) ||
                        s.service_type.toLowerCase().includes(apptServiceType.toLowerCase())
                      );
                      const activeSchedule = matchingSchedules[0] || null;

                      const selectedDateObj = apptPreferredDate ? new Date(apptPreferredDate + 'T00:00:00') : null;
                      const selectedDayName = selectedDateObj && !isNaN(selectedDateObj.getTime())
                        ? selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' })
                        : '';
                      const isDayValid = !activeSchedule || activeSchedule.day_of_week.toLowerCase().includes(selectedDayName.toLowerCase());
                      const isTimeValid = !activeSchedule || matchingSchedules.some(s => s.time_slot.toLowerCase().trim() === apptPreferredTime.toLowerCase().trim());
                      const upcomingDates = activeSchedule ? getUpcomingDatesForSchedule(activeSchedule.day_of_week, 4) : [];

                      return (
                        <>
                          <div className="space-y-2 pt-1">
                            <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
                                <CalendarCheck size={14} className="text-emerald-600" />
                                Official Clinic Schedule (Strict Rules)
                              </span>
                              {activeSchedule && (
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                                  🔒 {activeSchedule.day_of_week} • {activeSchedule.time_slot}
                                </span>
                              )}
                            </Label>

                            {matchingSchedules.length > 0 ? (
                              <div className="space-y-1.5">
                                {matchingSchedules.map(sch => (
                                  <div
                                    key={sch.id}
                                    onClick={() => {
                                      setApptPreferredTime(sch.time_slot);
                                      const upcoming = getUpcomingDatesForSchedule(sch.day_of_week, 1);
                                      if (upcoming.length > 0) {
                                        setApptPreferredDate(upcoming[0].dateStr);
                                      }
                                      toast.info(`Schedule Locked: ${sch.day_of_week}`, {
                                        description: `Time: ${sch.time_slot} | ${sch.location}`
                                      });
                                    }}
                                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                                      apptPreferredTime === sch.time_slot
                                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200 shadow-xs'
                                        : 'bg-slate-50 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'
                                    }`}
                                  >
                                    <div className="space-y-0.5">
                                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                        <span>📅 {sch.day_of_week}</span>
                                        <span className="font-mono text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                                          ⏰ {sch.time_slot}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                        <span>📍 {sch.location}</span>
                                        <span>• In-charge: {sch.bhw_in_charge}</span>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <Badge className="bg-emerald-600 text-white text-[10px]">
                                        {sch.slots_available} Slots
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500">
                                ℹ️ No fixed weekly schedule posted for this service yet. You may propose your preferred date and time below.
                              </div>
                            )}
                          </div>

                          {/* Date & Time with Strict Rule Indicators */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-slate-700">Preferred Date <span className="text-red-500">*</span></Label>
                                {selectedDayName && (
                                  <span className={`text-[10px] font-bold ${isDayValid ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {selectedDayName} {isDayValid ? '✓' : '✗ Invalid'}
                                  </span>
                                )}
                              </div>
                              <Input
                                type="date"
                                value={apptPreferredDate}
                                onChange={e => setApptPreferredDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                required
                                className={`text-xs h-9 ${!isDayValid ? 'border-red-400 bg-red-50 text-red-900 focus:ring-red-400' : 'border-emerald-300'}`}
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-700">Official Time Window <span className="text-red-500">*</span></Label>
                              {matchingSchedules.length > 0 ? (
                                <Select value={apptPreferredTime} onValueChange={setApptPreferredTime}>
                                  <SelectTrigger className="text-xs h-9 border-emerald-300 bg-white font-semibold text-emerald-950">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {matchingSchedules.map(s => (
                                      <SelectItem key={s.id} value={s.time_slot} className="text-xs font-medium">
                                        ⏰ {s.time_slot} ({s.day_of_week})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Select value={apptPreferredTime} onValueChange={setApptPreferredTime}>
                                  <SelectTrigger className="text-xs h-9 bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Morning (8:00 AM - 11:30 AM)">Morning (8:00 AM - 11:30 AM)</SelectItem>
                                    <SelectItem value="Afternoon (1:00 PM - 4:30 PM)">Afternoon (1:00 PM - 4:30 PM)</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>

                          {/* Strict Day Rule Warning & Valid Date Shortcuts */}
                          {activeSchedule && !isDayValid && apptPreferredDate && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs">
                              <div className="flex items-start gap-2 text-red-800 font-semibold text-[11px]">
                                <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                                <div>
                                  <span>Strict Schedule Rule: </span>
                                  <strong>{apptServiceType}</strong> is strictly conducted on <strong>{activeSchedule.day_of_week}</strong> only.
                                  <div className="font-normal text-red-700 text-[10px] mt-0.5">
                                    You selected <strong>{selectedDayName} ({apptPreferredDate})</strong>, which is not permitted.
                                  </div>
                                </div>
                              </div>

                              {upcomingDates.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-red-900 block">Click a valid {activeSchedule.day_of_week.replace(/every\s*/i, '')} below to select:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {upcomingDates.map(d => (
                                      <button
                                        key={d.dateStr}
                                        type="button"
                                        onClick={() => {
                                          setApptPreferredDate(d.dateStr);
                                          toast.success(`Date updated to ${d.label}`);
                                        }}
                                        className="text-[10px] bg-red-100 hover:bg-emerald-600 hover:text-white text-red-900 font-bold px-2.5 py-1 rounded-lg border border-red-300 transition-all cursor-pointer shadow-2xs"
                                      >
                                        📅 {d.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Quick upcoming date shortcut buttons for convenience */}
                          {activeSchedule && isDayValid && upcomingDates.length > 0 && (
                            <div className="space-y-1 pt-0.5">
                              <span className="text-[10px] text-slate-500 font-medium">Quick Select Available {activeSchedule.day_of_week.replace(/every\s*/i, '')} Dates:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {upcomingDates.map(d => (
                                  <button
                                    key={d.dateStr}
                                    type="button"
                                    onClick={() => setApptPreferredDate(d.dateStr)}
                                    className={`text-[10px] px-2.5 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                      apptPreferredDate === d.dateStr
                                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                    }`}
                                  >
                                    {d.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Contact Number for SMS */}
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Contact Number for SMS Confirmation</Label>
                      <Input
                        type="tel"
                        value={apptPhone}
                        onChange={e => setApptPhone(e.target.value)}
                        placeholder={user?.phone || '09171234567'}
                        className="mt-1 text-xs h-9"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">We will send real-time SMS updates to this mobile number.</p>
                    </div>

                    {/* Purpose / Resident Notes */}
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Purpose / Details for BHW</Label>
                      <textarea
                        value={apptNotes}
                        onChange={e => setApptNotes(e.target.value)}
                        rows={2}
                        placeholder="e.g. Partner: Maria Santos. Applying for marriage license next month. Need official PMC Certificate."
                        className="w-full mt-1 px-3 py-2 text-xs rounded-md border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsBookApptOpen(false)} className="text-xs">
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={apptSubmitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm cursor-pointer"
                      >
                        <CalendarCheck size={14} />
                        {apptSubmitting ? 'Booking...' : 'Confirm Appointment Request'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* My Booked Appointments Card */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CalendarCheck className="text-emerald-600" size={18} />
                  My Scheduled &amp; Requested Appointments
                  <Badge variant="outline" className="ml-auto text-[10px]">{appointments.length} Total</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Review the status of your health center appointments and confirmed time slots.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs">Ref Code</TableHead>
                      <TableHead className="text-xs">Service Program</TableHead>
                      <TableHead className="text-xs">Preferred Date</TableHead>
                      <TableHead className="text-xs">Confirmed Schedule</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">BHW Instructions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs py-10 text-slate-400">
                          <Calendar className="mx-auto mb-2 text-slate-300" size={28} />
                          No health appointments booked yet. Click <strong>"Book Health Appointment"</strong> above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      appointments.map(apt => (
                        <TableRow key={apt.id} className="text-xs">
                          <TableCell className="font-mono font-bold text-emerald-700">{apt.appointment_code}</TableCell>
                          <TableCell className="font-semibold text-slate-900">
                            <div>{apt.service_type}</div>
                            {apt.attending_bhw && (
                              <div className="text-[10px] text-slate-400">Attending: {apt.attending_bhw}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            <div>{apt.preferred_date}</div>
                            <div className="text-[10px] text-slate-400">{apt.preferred_time}</div>
                          </TableCell>
                          <TableCell>
                            {apt.scheduled_date ? (
                              <div className="font-semibold text-emerald-800">
                                <div>📅 {apt.scheduled_date}</div>
                                <div className="text-[10px] text-emerald-600 font-mono">⏰ {apt.scheduled_time || 'Morning Session'}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Awaiting BHW Confirmation</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              apt.status === 'Approved' ? 'bg-emerald-600 text-white' :
                              apt.status === 'Completed' ? 'bg-blue-600 text-white' :
                              apt.status === 'Cancelled' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                            }>
                              {apt.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 max-w-xs text-[11px]">
                            {apt.bhw_notes || <span className="text-slate-400 italic">No notes</span>}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Official Health Center Regular Clinic Schedules Board */}
            <Card className="border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                  <Calendar className="text-emerald-600" size={18} />
                  Official Health Center Clinic Schedule Board
                </CardTitle>
                <CardDescription className="text-xs">
                  Regular schedules posted by Barangay Health Workers and the City Health Office for Barangay Pianing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {clinicSchedules.map(sch => (
                    <div key={sch.id} className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-xs flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {sch.service_type}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-700 font-bold">
                            {sch.slots_available} Slots
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 mt-1">{sch.title}</h4>
                        <div className="space-y-1 mt-2 text-[11px] text-slate-600">
                          <div className="flex items-center gap-1.5 font-medium text-emerald-900">
                            <Clock size={12} className="text-emerald-600 shrink-0" />
                            <span>{sch.day_of_week} ({sch.time_slot})</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span>{sch.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Users size={12} className="text-slate-400 shrink-0" />
                            <span>In-charge: <strong>{sch.bhw_in_charge}</strong></span>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          setApptServiceType(sch.service_type);
                          setIsBookApptOpen(true);
                        }}
                        className="w-full h-8 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold"
                      >
                        Book for this Program
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Switch Portal CTA */}
        <div className="bg-gradient-to-r from-indigo-50 to-slate-50 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-indigo-900">Need a Barangay Document?</h3>
              <p className="text-xs text-indigo-700">Request clearances, residency certificates, business permits, and more.</p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/resident/barangay')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-5 shrink-0 flex items-center gap-1.5"
          >
            Go to Barangay Portal <ArrowRight size={14} />
          </Button>
        </div>
      </main>

      <BarangayChatbot />

      {/* Resident Health Notifications Center Modal */}
      <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Bell className="text-emerald-600" size={18} />
              Health Center Notifications &amp; Alerts
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Updates regarding medical certificates, immunization records, and account verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {/* 1. Account Rejection Notice */}
            {user?.verification_status === 'Rejected' && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-900 dark:text-red-300 flex items-center gap-1.5">
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
                    onClick={() => { setIsNotificationsOpen(false); setIsProfileModalOpen(true); }}
                    className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white gap-1 cursor-pointer"
                  >
                    <Settings size={12} /> Re-submit ID / Update Details
                  </Button>
                </div>
              </div>
            )}

            {/* 2. Ready for Pickup Health Documents */}
            {requests.filter(d => d.status === 'Ready for Pickup').map(doc => (
              <div key={`health-ready-${doc.id}`} className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-indigo-600" /> 🎉 Ready for Release: {doc.type}
                  </span>
                  <Badge className="bg-indigo-600 text-white text-[10px]">Ready for Pickup</Badge>
                </div>
                <p className="text-indigo-800 dark:text-indigo-200 text-xs">
                  Your requested health document has been signed by the attending BHW / Medical Officer. You may claim the physical record at the Barangay Health Center during clinic hours.
                </p>
              </div>
            ))}

            {/* 3. Completed Health Documents */}
            {requests.filter(d => d.status === 'Completed').map(doc => (
              <div key={`health-done-${doc.id}`} className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600" /> Issued &amp; Claimed: {doc.type}
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Completed</Badge>
                </div>
                <p className="text-emerald-800 dark:text-emerald-200 text-xs">
                  Your requested health document has been successfully issued and claimed.
                </p>
              </div>
            ))}

            {/* 4. Processing Requests */}
            {requests.filter(d => d.status === 'Processing').map(doc => (
              <div key={`health-proc-${doc.id}`} className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-600" /> Under BHW Review: {doc.type}
                  </span>
                  <Badge className="bg-amber-500 text-white text-[10px]">Processing</Badge>
                </div>
                <p className="text-amber-800 dark:text-amber-200 text-xs">
                  Your health document request is being evaluated and prepared by the Barangay Health Worker.
                </p>
              </div>
            ))}

            {/* 5. Pending Requests */}
            {requests.filter(d => d.status === 'Pending').map(doc => (
              <div key={`health-pend-${doc.id}`} className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-500" /> Queued: {doc.type}
                  </span>
                  <Badge className="bg-slate-500 text-white text-[10px]">Pending</Badge>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-xs">
                  Your health document request has been submitted to the clinic queue.
                </p>
              </div>
            ))}

            {/* 6. Rejected Health Requests */}
            {requests.filter(d => d.status === 'Rejected').map(doc => (
              <div key={`health-rej-${doc.id}`} className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-900 dark:text-red-300 flex items-center gap-1.5">
                    <XCircle size={14} className="text-red-600" /> Health Request Rejected
                  </span>
                  <Badge className="bg-red-600 text-white text-[10px]">Rejected</Badge>
                </div>
                <p className="text-red-800 dark:text-red-200 text-xs">
                  Your request for <strong>{doc.type}</strong> was rejected.
                </p>
                <p className="text-xs text-red-700 bg-red-100/70 p-2 rounded-md">
                  <strong>Remarks / Cause:</strong> {doc.purpose || 'Health records require in-person consultation at the Health Center.'}
                </p>
              </div>
            ))}

            {/* Empty State */}
            {requests.length === 0 && user?.verification_status !== 'Rejected' && (
              <div className="text-center py-8 text-slate-400">
                <Bell size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">No notifications right now.</p>
                <p className="text-[11px] text-slate-400">Updates about your health certificates and records will appear here.</p>
              </div>
            )}
          </div>

          <DialogFooter>
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
    </div>
  );
}
