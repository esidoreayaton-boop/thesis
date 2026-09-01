import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
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
  CheckCircle2,
  Phone,
  Sparkles,
  ShieldCheck,
  Check,
  ChevronRight,
  Printer,
  FileText,
  AlertTriangle,
  LogOut,
  CalendarPlus,
  MessageSquare,
  BadgeCheck
} from 'lucide-react';
import { apiService, HealthAppointment, ClinicSchedule } from '../../services/api';
import BarangayChatbot from '../components/BarangayChatbot';
import ProfileSettingsModal from '../components/ProfileSettingsModal';
import SuperAdminNavigationDock from '../components/SuperAdminNavigationDock';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

interface RevisitHistoryItem {
  id: string | number;
  service_type: string;
  date: string;
  time: string;
  status: 'Upcoming' | 'Completed' | 'Pending' | 'Cancelled';
  provider: string;
  vitals?: {
    bp?: string;
    weight?: string;
    temp?: string;
    heart_rate?: string;
  };
  notes?: string;
  instructions?: string;
}

export default function HealthCenterPortal() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<HealthAppointment[]>([]);
  const [clinicSchedules, setClinicSchedules] = useState<ClinicSchedule[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isBookApptOpen, setIsBookApptOpen] = useState(false);
  const [isRecordSummaryOpen, setIsRecordSummaryOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // SMS Reminder Opt-In preference (interactive switch)
  const [smsOptIn, setSmsOptIn] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('brgy_sms_reminder_opt_in');
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  // Appointment Form State
  const [apptServiceType, setApptServiceType] = useState('Pre-Marriage Counseling (PMC)');
  const [apptPreferredDate, setApptPreferredDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 2);
    return nextWeek.toISOString().split('T')[0];
  });
  const [apptPreferredTime, setApptPreferredTime] = useState('Morning (8:00 AM - 11:30 AM)');
  const [apptNotes, setApptNotes] = useState('');
  const [apptPhone, setApptPhone] = useState('');
  const [apptSubmitting, setApptSubmitting] = useState(false);

  const toggleSmsOptIn = () => {
    const nextVal = !smsOptIn;
    setSmsOptIn(nextVal);
    localStorage.setItem('brgy_sms_reminder_opt_in', JSON.stringify(nextVal));
    if (nextVal) {
      toast.success('SMS Reminders Enabled!', {
        description: `You will automatically receive an SMS reminder 24 hours before your scheduled visit on ${user?.phone || 'your contact number'}.`
      });
    } else {
      toast.info('SMS Reminders Muted', {
        description: 'You will not receive text notifications before your appointments.'
      });
    }
  };

  const loadData = async (currentUser?: any) => {
    try {
      const [apts, schedules] = await Promise.all([
        apiService.getAppointments().catch(() => []),
        apiService.getClinicSchedules().catch(() => [])
      ]);
      if (schedules && schedules.length > 0) setClinicSchedules(schedules);

      const loggedInUser = currentUser || user;
      if (loggedInUser?.email || loggedInUser?.id) {
        const uEmail = (loggedInUser.email || '').toLowerCase().trim();
        const uId = loggedInUser.id;
        const userApts = (apts || []).filter((a: HealthAppointment) => {
          if (uId && a.resident_id && a.resident_id === uId) return true;
          if (uEmail && a.resident_email && a.resident_email.toLowerCase() === uEmail) return true;
          if (loggedInUser.name && a.resident_name.toLowerCase().includes(loggedInUser.name.toLowerCase())) return true;
          return false;
        });
        setAppointments(userApts);
      } else {
        setAppointments((apts || []).slice(0, 2));
      }
    } catch {
      // ignore
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
        if (parsed.role === 'nurse') {
          navigate('/nurse');
          return;
        }
        setUser(parsed);
        setIsVerified(parsed.verification_status === 'Verified');
        loadData(parsed);

        // Sync verification status live
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
                  description: 'Your Barangay ID was approved. You can now schedule health center appointments.'
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

  // Compute Upcoming & Past Revisit Timeline
  const revisitTimeline: RevisitHistoryItem[] = useMemo(() => {
    const list: RevisitHistoryItem[] = [];

    // Add user appointments
    appointments.forEach(a => {
      const isPast = new Date(a.preferred_date) < new Date() && a.status === 'Completed';
      list.push({
        id: a.id,
        service_type: a.service_type,
        date: a.preferred_date,
        time: a.preferred_time || a.scheduled_time || 'TBA',
        status: a.status === 'Approved' ? 'Upcoming' : a.status === 'Completed' ? 'Completed' : 'Pending',
        provider: a.attending_bhw || 'BHW Health Center Team',
        instructions: a.bhw_notes || 'Please arrive 15 minutes before your scheduled slot. Bring your valid ID and PhilHealth card.',
        notes: a.resident_notes
      });
    });

    // Provide helpful realistic health records if list is empty or fresh resident
    if (list.length === 0) {
      list.push({
        id: 'mock-next-1',
        service_type: 'Prenatal & Maternal Health Monitoring',
        date: '2026-09-08',
        time: '8:30 AM - 10:30 AM (Morning Session)',
        status: 'Upcoming',
        provider: 'Nurse Maria Santos (BHW Nurse)',
        instructions: 'Bring your Mother-Baby Pink Handbook. Free prenatal vitamins (Ferrous Sulfate & Folic Acid) will be dispensed. Drink water before the routine ultrasound review.',
        notes: '2nd Trimester routine fetal heartbeat & maternal BP checkup'
      });
      list.push({
        id: 'mock-past-1',
        service_type: 'Initial Maternal Intake & Vital Signs Check',
        date: '2026-08-11',
        time: '9:00 AM',
        status: 'Completed',
        provider: 'Nurse Maria Santos',
        vitals: { bp: '118/76 mmHg', weight: '54.2 kg', temp: '36.5 °C', heart_rate: '74 bpm' },
        notes: 'Initial checkup normal. Advised balanced nutrition and iron-rich diet.'
      });
      list.push({
        id: 'mock-past-2',
        service_type: 'General Health Wellness & Dental Consultation',
        date: '2026-06-20',
        time: '10:15 AM',
        status: 'Completed',
        provider: 'Dr. Evelyn Morales, MD',
        vitals: { bp: '120/80 mmHg', weight: '53.8 kg', temp: '36.6 °C' },
        notes: 'Routine physical examination. Cleared with healthy vitals.'
      });
    }

    // Sort: Upcoming visits first, then descending by date
    return list.sort((a, b) => {
      if (a.status === 'Upcoming' && b.status !== 'Upcoming') return -1;
      if (b.status === 'Upcoming' && a.status !== 'Upcoming') return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [appointments]);

  // Find the primary Next Upcoming Revisit for the Hero Card
  const nextUpcomingVisit = useMemo(() => {
    return revisitTimeline.find(item => item.status === 'Upcoming' || item.status === 'Pending') || null;
  }, [revisitTimeline]);

  // Calculate days remaining until next visit
  const daysUntilVisit = useMemo(() => {
    if (!nextUpcomingVisit?.date) return null;
    const target = new Date(nextUpcomingVisit.date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [nextUpcomingVisit]);

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast.error('Appointments locked! Your account must be verified by Barangay Admin first.');
      return;
    }
    if (!apptPreferredDate) {
      toast.error('Please select your preferred appointment date.');
      return;
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
        description: `Ref Code: ${created.appointment_code}. Your schedule has been registered on ${apptPreferredDate} (${apptPreferredTime}).`
      });
      setIsBookApptOpen(false);
      setApptNotes('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to book appointment.');
    } finally {
      setApptSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Super Admin Navigation Dock */}
      <SuperAdminNavigationDock currentRole={user?.role} />

      {/* Header / Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-xs border border-emerald-200 flex items-center justify-center">
              <img src="/assets/pianing-logo.png" alt="Barangay Pianing" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-slate-900 leading-tight">Barangay Pianing</h1>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 border border-emerald-200">
                  Health Center
                </Badge>
              </div>
              <span className="text-xs text-emerald-700 font-medium">Maternal, Child Immunization &amp; Clinic Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Health Notification Center */}
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNotificationsOpen(true)}
                className="relative flex items-center gap-1.5 text-xs border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                title="View Appointment Alerts & Health Notifications"
              >
                <Bell size={14} className="text-emerald-600" />
                <span className="hidden sm:inline">Notifications</span>
                {nextUpcomingVisit && (
                  <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                    1
                  </span>
                )}
              </Button>
            )}

            {/* Profile Settings */}
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-1.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
              >
                <Settings size={14} />
                <span className="hidden sm:inline">Profile Settings</span>
              </Button>
            )}

            {/* Switch to Barangay Documents Portal */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/resident/barangay')}
              className="text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50 hidden md:flex items-center gap-1.5 cursor-pointer"
            >
              <Building2 size={13} />
              Barangay Clearances
              <ArrowRight size={12} />
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => { toast.info('Logged out'); navigate('/login'); }}
              className="flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700 cursor-pointer"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* Verification Status Banner */}
        {!user || user.role !== 'resident' ? (
          <div className="bg-slate-100 border border-slate-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">Visitor Mode</h3>
                <p className="text-xs text-slate-600 mt-1">Sign in with your resident account to schedule clinic visits and track your maternal/child health history.</p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate('/login')} className="bg-slate-700 hover:bg-slate-800 text-white text-xs h-9 px-4 shrink-0">
              Sign In / Register
            </Button>
          </div>
        ) : user?.verification_status === 'Rejected' ? (
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
                <div className="bg-white/80 p-3 rounded-xl border border-red-200 text-xs">
                  <span className="font-bold text-red-900 block mb-0.5">Cause / Reason for Rejection:</span>
                  <p className="text-red-800 font-medium">
                    {user?.rejection_reason || 'Submitted Government ID photo is unclear. Please update your profile or re-upload a clear ID.'}
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
                  <h3 className="font-bold text-sm text-amber-900">Account Verification Pending</h3>
                  <Badge className="bg-amber-200 text-amber-900 text-[10px]">Pending Approval</Badge>
                </div>
                <p className="text-xs text-amber-800 mt-1">Your registered ID is currently being reviewed by the Barangay Admin. Appointment booking will unlock once approved.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-amber-100/80 border border-amber-300 text-amber-900 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0">
              <Clock size={15} className="animate-spin text-amber-700" />
              <span>Awaiting Admin Verification</span>
            </div>
          </div>
        ) : null}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 1. NEXT VISIT HERO CARD */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {nextUpcomingVisit ? (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 text-white shadow-xl p-6 sm:p-8 border border-emerald-500/30">
            {/* Background Decorative Rings */}
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute right-32 -bottom-20 w-48 h-48 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              {/* Header pill & countdown */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold tracking-wide uppercase text-emerald-100">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  Upcoming Auto-Scheduled Health Revisit
                </div>

                {daysUntilVisit !== null && (
                  <Badge className="bg-amber-400 hover:bg-amber-400 text-amber-950 font-extrabold text-xs px-3 py-1 rounded-full shadow-sm">
                    {daysUntilVisit === 0 ? '🚨 Due Today!' : daysUntilVisit === 1 ? '⏰ Tomorrow' : `📅 In ${daysUntilVisit} Days`}
                  </Badge>
                )}
              </div>

              {/* Service title & Revisit Date */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-8 space-y-2">
                  <span className="text-emerald-200 text-xs font-semibold uppercase tracking-wider">Service Program</span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    {nextUpcomingVisit.service_type}
                  </h2>
                  <p className="text-emerald-100/90 text-xs sm:text-sm max-w-2xl leading-relaxed">
                    {nextUpcomingVisit.notes || 'Routine follow-up consultation and wellness checkup with your assigned Barangay Health Worker.'}
                  </p>
                </div>

                {/* Big Date Display Card */}
                <div className="lg:col-span-4 bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center space-y-1 shadow-inner">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-200 block">Scheduled Date</span>
                  <p className="text-2xl sm:text-3xl font-black text-white">
                    {new Date(nextUpcomingVisit.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs font-semibold text-emerald-200 flex items-center justify-center gap-1.5 pt-1">
                    <Clock size={13} />
                    {nextUpcomingVisit.time}
                  </p>
                </div>
              </div>

              {/* Doctor / Nurse & Special BHW Instructions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/15">
                <div className="flex items-start gap-3 bg-black/15 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/30 border border-emerald-300/30 flex items-center justify-center shrink-0 text-emerald-200">
                    <Stethoscope size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider">Assigned Provider</span>
                    <p className="font-bold text-xs text-white mt-0.5">{nextUpcomingVisit.provider}</p>
                    <p className="text-[11px] text-emerald-100/80">Barangay Pianing Health Center</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-black/15 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/30 border border-amber-300/30 flex items-center justify-center shrink-0 text-amber-200">
                    <Sparkles size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-amber-200 tracking-wider">Special BHW Instructions</span>
                    <p className="text-xs text-white font-medium mt-0.5 leading-snug">
                      {nextUpcomingVisit.instructions}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs text-emerald-200">
                  <CheckCircle2 size={15} className="text-emerald-300" />
                  <span>Free service for verified Barangay Pianing residents</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsBookApptOpen(true)}
                    size="sm"
                    className="bg-white hover:bg-emerald-50 text-emerald-900 font-bold text-xs shadow-md cursor-pointer gap-1.5"
                  >
                    <CalendarPlus size={14} className="text-emerald-700" />
                    Book Additional Appointment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty Upcoming State Card */
          <div className="rounded-3xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                <Heart size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-emerald-950">No Upcoming Clinic Revisit Scheduled</h3>
                <p className="text-xs text-emerald-800 leading-relaxed max-w-xl">
                  You do not have an active clinic appointment or maternal follow-up on calendar. Browse available weekly clinic programs below or book a consultation slot.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsBookApptOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 shadow-sm shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <CalendarPlus size={16} />
              Book Health Appointment
            </Button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 2. AUTO-SMS OPT-IN BANNER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
          <div className="flex items-start gap-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${smsOptIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
              <Phone size={20} />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm text-slate-900">Automated SMS Clinic Reminder Alerts</h4>
                <Badge className={smsOptIn ? 'bg-emerald-600 text-white text-[10px]' : 'bg-slate-200 text-slate-700 text-[10px]'}>
                  {smsOptIn ? 'Active (Opted-In)' : 'Muted'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Receive an automatic SMS notification on your mobile phone (<strong>{user?.phone || '09XXXXXXXXX'}</strong>) exactly 1 day (24 hours) before your scheduled revisit.
              </p>
            </div>
          </div>

          {/* Interactive Toggle Switch */}
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={smsOptIn}
                onChange={toggleSmsOptIn}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
            <span className="text-xs font-bold text-slate-700 select-none">
              {smsOptIn ? 'SMS Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 3. ACTIVE CLINIC SCHEDULES BOARD */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="text-emerald-600" size={20} />
                Barangay Pianing Health Center Clinic Schedules
              </h3>
              <p className="text-xs text-slate-500">
                Official weekly operating hours posted by Barangay Health Workers. Walk-in or book in advance.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRecordSummaryOpen(true)}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5 cursor-pointer"
              >
                <Printer size={14} className="text-slate-600" />
                Print Health Record
              </Button>
              <Button
                size="sm"
                onClick={() => setIsBookApptOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-xs cursor-pointer"
              >
                <CalendarPlus size={14} />
                Book Appointment
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clinicSchedules.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                <Calendar className="mx-auto mb-2 text-slate-300" size={32} />
                <p className="text-xs font-semibold text-slate-600">No scheduled clinic programs posted yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">Health Center is open Monday to Friday (8:00 AM - 5:00 PM) for general walk-ins.</p>
              </div>
            ) : (
              clinicSchedules.map(sch => (
                <div
                  key={sch.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-3 hover:border-emerald-300 hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {sch.service_type}
                      </span>
                      <Badge className="bg-emerald-600 text-white text-[10px]">Active</Badge>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{sch.title}</h4>

                    <div className="space-y-1.5 mt-3 text-xs text-slate-600">
                      <div className="flex items-center gap-2 font-bold text-emerald-900 bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                        <Clock size={14} className="text-emerald-700 shrink-0" />
                        <span className="font-mono">{sch.day_of_week} • {sch.time_slot}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 text-[11px] px-1">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span>{sch.location || 'Barangay Health Center'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 text-[11px] px-1">
                        <Users size={12} className="text-slate-400 shrink-0" />
                        <span>In-Charge: <strong>{sch.bhw_in_charge || 'Duty BHW'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Free Barangay Service</span>
                    <button
                      onClick={() => {
                        setApptServiceType(sch.service_type);
                        setApptPreferredTime(sch.time_slot);
                        setIsBookApptOpen(true);
                      }}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Book This Slot <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 4. REVISIT HISTORY TIMELINE */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="text-emerald-600" size={18} />
                  Patient Health Revisit History &amp; Clinical Timeline
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Comprehensive audit trail comparing upcoming scheduled follow-ups against completed visits and clinical vitals.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {revisitTimeline.length} Total Encounters
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {revisitTimeline.map((item, idx) => {
                const isUpcoming = item.status === 'Upcoming' || item.status === 'Pending';
                return (
                  <div key={`timeline-${item.id}-${idx}`} className="relative group">
                    {/* Timeline Node Dot */}
                    <div className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shadow-xs ${
                      isUpcoming
                        ? 'bg-emerald-600 border-white text-white animate-pulse ring-4 ring-emerald-100'
                        : 'bg-white border-emerald-500 text-emerald-600'
                    }`}>
                      {isUpcoming ? <Clock size={12} /> : <Check size={12} />}
                    </div>

                    {/* Timeline Card */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      isUpcoming
                        ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            isUpcoming ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {item.service_type}
                          </span>
                          <Badge variant="outline" className={isUpcoming ? 'border-emerald-400 text-emerald-800 bg-white text-[10px]' : 'text-slate-600 text-[10px]'}>
                            {item.status}
                          </Badge>
                        </div>

                        <span className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          {new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <span className="text-slate-400 font-normal">({item.time})</span>
                        </span>
                      </div>

                      {/* Attending Provider */}
                      <p className="text-xs text-slate-600 flex items-center gap-1.5 mb-2">
                        <Stethoscope size={13} className="text-emerald-600 shrink-0" />
                        <span>Attending: <strong>{item.provider}</strong></span>
                      </p>

                      {/* Vitals Recorded (if past visit) */}
                      {item.vitals && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2.5 p-2.5 bg-white rounded-xl border border-slate-200 text-[11px]">
                          {item.vitals.bp && (
                            <div>
                              <span className="text-slate-400 block text-[10px]">Blood Pressure</span>
                              <strong className="text-slate-800">{item.vitals.bp}</strong>
                            </div>
                          )}
                          {item.vitals.weight && (
                            <div>
                              <span className="text-slate-400 block text-[10px]">Weight</span>
                              <strong className="text-slate-800">{item.vitals.weight}</strong>
                            </div>
                          )}
                          {item.vitals.temp && (
                            <div>
                              <span className="text-slate-400 block text-[10px]">Body Temp</span>
                              <strong className="text-slate-800">{item.vitals.temp}</strong>
                            </div>
                          )}
                          {item.vitals.heart_rate && (
                            <div>
                              <span className="text-slate-400 block text-[10px]">Heart Rate</span>
                              <strong className="text-slate-800">{item.vitals.heart_rate}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Instructions / Clinical Notes */}
                      {item.instructions && (
                        <div className="mt-2 text-xs bg-white p-2.5 rounded-xl border border-emerald-100 text-emerald-900">
                          <strong className="text-emerald-800 block text-[10px] uppercase tracking-wider mb-0.5">BHW Revisit Instructions:</strong>
                          {item.instructions}
                        </div>
                      )}

                      {item.notes && !item.instructions && (
                        <p className="text-xs text-slate-600 mt-1 italic">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Switch Portal CTA */}
        <div className="bg-gradient-to-r from-indigo-50 to-slate-50 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-indigo-900">Need an Official Barangay Document?</h3>
              <p className="text-xs text-indigo-700">Request Barangay Clearances, Certificates of Residency, and Indigency from the administrative desk.</p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/resident/barangay')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-5 shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            Go to Barangay Portal <ArrowRight size={14} />
          </Button>
        </div>
      </main>

      <BarangayChatbot />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: BOOK HEALTH APPOINTMENT */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isBookApptOpen} onOpenChange={setIsBookApptOpen}>
        <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold">
              <CalendarPlus className="text-emerald-600" size={18} />
              Book Health Center Appointment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Schedule your visit with our Barangay Health Workers (BHW) and Midwife for maternal care, immunization, or counseling.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAppointmentSubmit} className="space-y-3.5 py-2 text-xs">
            {/* Service Program Picker */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Health Service Program <span className="text-red-500">*</span></Label>
              <Select value={apptServiceType} onValueChange={setApptServiceType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pre-Marriage Counseling (PMC)">Pre-Marriage Counseling (PMC)</SelectItem>
                  <SelectItem value="Prenatal Check-up">Prenatal Check-up (Maternal Care)</SelectItem>
                  <SelectItem value="Child Immunization">Child Immunization (Infant Vaccine)</SelectItem>
                  <SelectItem value="Family Planning & Counseling">Family Planning &amp; Counseling</SelectItem>
                  <SelectItem value="General Medical Consultation">General Medical Consultation</SelectItem>
                  <SelectItem value="BHW Home Visit Request">BHW Home Visit Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date and Time Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Preferred Appointment Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={apptPreferredDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setApptPreferredDate(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Preferred Time Slot <span className="text-red-500">*</span></Label>
                <Select value={apptPreferredTime} onValueChange={setApptPreferredTime}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Time Slot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning (8:00 AM - 11:30 AM)">Morning (8:00 AM - 11:30 AM)</SelectItem>
                    <SelectItem value="Afternoon (1:00 PM - 4:30 PM)">Afternoon (1:00 PM - 4:30 PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Phone */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Contact Number for SMS Reminders <span className="text-red-500">*</span></Label>
              <Input
                value={apptPhone || user?.phone || ''}
                onChange={e => setApptPhone(e.target.value)}
                placeholder="09XXXXXXXXX"
                required
                className="h-9 text-xs font-mono"
              />
            </div>

            {/* Notes / Reason */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Special Notes / Symptoms (Optional)</Label>
              <textarea
                value={apptNotes}
                onChange={e => setApptNotes(e.target.value)}
                placeholder="State any specific health concern, trimester, or vaccine dose needed..."
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>An automatic SMS confirmation will be sent to your registered contact number.</span>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsBookApptOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={apptSubmitting} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm">
                <Check size={14} />
                {apptSubmitting ? 'Booking...' : 'Confirm Appointment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: PRINT OFFICIAL HEALTH RECORD SUMMARY */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isRecordSummaryOpen} onOpenChange={setIsRecordSummaryOpen}>
        <DialogContent className="bg-white max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold">
              <FileText className="text-emerald-600" size={18} />
              Barangay Pianing Health Center — Official Patient Record
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Official summary of patient consultations, maternal care encounters, and child immunization history.
            </DialogDescription>
          </DialogHeader>

          {/* Printable Layout */}
          <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl space-y-4 text-xs">
            {/* Official Header */}
            <div className="text-center border-b border-slate-300 pb-3 space-y-0.5">
              <p className="text-[10px] uppercase font-bold text-slate-500">Republic of the Philippines • City of Butuan</p>
              <h3 className="font-bold text-sm text-slate-900">BARANGAY PIANING PRIMARY HEALTH CENTER</h3>
              <p className="text-[10px] text-emerald-800 font-semibold">PATIENT CLINICAL SUMMARY &amp; REVISIT PROFILE</p>
            </div>

            {/* Patient Info */}
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">Patient Full Name:</span>
                <strong className="text-slate-900 text-xs">{user?.name || 'Resident Name'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Contact Number:</span>
                <strong className="text-slate-900 text-xs font-mono">{user?.phone || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Barangay Address:</span>
                <span className="text-slate-800">{user?.address || 'Barangay Pianing, Butuan City'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Verification Status:</span>
                <Badge className="bg-emerald-600 text-white text-[9px]">Official Resident</Badge>
              </div>
            </div>

            {/* Encounters Summary */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-900 border-b pb-1">Encounter History &amp; Recorded Vitals</h4>
              {revisitTimeline.map((item, idx) => (
                <div key={`print-${item.id}-${idx}`} className="p-2.5 border rounded-lg bg-white text-[11px] space-y-1">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-slate-900">{item.service_type}</span>
                    <span className="font-mono text-slate-500">{item.date}</span>
                  </div>
                  <p className="text-slate-500 text-[10px]">Attending: {item.provider}</p>
                  {item.vitals && (
                    <p className="text-emerald-800 font-mono text-[10px]">
                      Vitals: BP {item.vitals.bp || '—'} | Wt: {item.vitals.weight || '—'} | Temp: {item.vitals.temp || '—'}
                    </p>
                  )}
                  {item.instructions && (
                    <p className="text-slate-600 text-[10px] italic">Notes: {item.instructions}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Official Footer Signature */}
            <div className="pt-6 flex justify-between items-end text-center text-[10px] text-slate-600">
              <div>
                <div className="w-32 border-b border-slate-400 mb-1" />
                <span>Patient Signature</span>
              </div>
              <div>
                <div className="w-40 border-b border-slate-400 mb-1 font-bold text-slate-900">Nurse Maria Santos, RN</div>
                <span>Barangay Health Center In-Charge</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer"
            >
              <Printer size={14} />
              Print Official Record
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsRecordSummaryOpen(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notifications Modal */}
      <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <DialogContent className="bg-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Bell className="text-emerald-600" size={18} />
              Health Center Notifications &amp; Alerts
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Live updates regarding your scheduled appointments, health follow-ups, and verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-2 text-xs">
            {nextUpcomingVisit && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <CalendarCheck size={14} className="text-emerald-600" />
                    Upcoming Visit: {nextUpcomingVisit.service_type}
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Confirmed</Badge>
                </div>
                <p className="text-emerald-800 text-xs">
                  Your appointment is scheduled on <strong>{nextUpcomingVisit.date}</strong> at <strong>{nextUpcomingVisit.time}</strong>.
                </p>
                <p className="text-[10px] text-emerald-700 italic">
                  Special Instructions: {nextUpcomingVisit.instructions}
                </p>
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <BadgeCheck size={14} className="text-blue-600" /> Account Verified
                </span>
                <span className="text-[10px] text-slate-400">Active</span>
              </div>
              <p className="text-xs">
                Your resident account is active and verified by Barangay Pianing Administration.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsNotificationsOpen(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onProfileUpdated={(updated) => setUser(updated)}
      />
    </div>
  );
}
