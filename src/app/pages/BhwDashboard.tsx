import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Baby,
  Syringe,
  Heart,
  Bell,
  BarChart,
  AlertTriangle,
  LogOut,
  Activity,
  Home,
  Menu,
  X,
  PlusCircle,
  CheckCircle2,
  Send,
  RefreshCcw,
  Search,
  PhoneCall,
  Calendar,
  Shield,
  Printer,
  Download,
  FileText,
  Eye,
  Check,
  CalendarCheck,
  MapPin,
  Users,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { apiService, ImmunizationRecord, MaternalRecord, SmsNotification, DocumentRequest, HealthAppointment, ClinicSchedule } from '../../services/api';
import SystemMessenger from '../components/SystemMessenger';
import ResidentProfileModal from '../components/ResidentProfileModal';
import DocumentPrintModal from '../components/DocumentPrintModal';
import DocumentInfoModal from '../components/DocumentInfoModal';
import SmsDetailsModal from '../components/SmsDetailsModal';
import SuperAdminNavigationDock from '../components/SuperAdminNavigationDock';
import { exportToCsv, printOfficialReport } from '../../utils/exportCsv';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

export default function BhwDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  // User session state
  const [user, setUser] = useState<any>(null);
  const [isVisitorMode, setIsVisitorMode] = useState(false);

  // Dynamic Data States
  const [immunizations, setImmunizations] = useState<ImmunizationRecord[]>([]);
  const [maternalRecords, setMaternalRecords] = useState<MaternalRecord[]>([]);
  const [notifications, setNotifications] = useState<SmsNotification[]>([]);
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [appointments, setAppointments] = useState<HealthAppointment[]>([]);
  const [clinicSchedules, setClinicSchedules] = useState<ClinicSchedule[]>([]);

  // Appointments & Schedules Sub-View & Filters
  const [apptSearch, setApptSearch] = useState('');
  const [apptStatusFilter, setApptStatusFilter] = useState('all');
  const [apptServiceFilter, setApptServiceFilter] = useState('all');
  const [selectedApptToSchedule, setSelectedApptToSchedule] = useState<HealthAppointment | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00 AM');
  const [scheduleBhwNotes, setScheduleBhwNotes] = useState('');

  // Post Clinic Schedule Modal State
  const [isPostScheduleOpen, setIsPostScheduleOpen] = useState(false);
  const [newScheduleTitle, setNewScheduleTitle] = useState('');
  const [newScheduleServiceType, setNewScheduleServiceType] = useState('Pre-Marriage Counseling (PMC)');
  const [newScheduleDay, setNewScheduleDay] = useState('Every Wednesday');
  const [newScheduleTime, setNewScheduleTime] = useState('8:30 AM - 11:30 AM');
  const [newScheduleLocation, setNewScheduleLocation] = useState('Barangay Pianing Health Center');
  const [newScheduleSlots, setNewScheduleSlots] = useState('20');
  const [newScheduleBhw, setNewScheduleBhw] = useState('Nurse Maria Santos');

  const [stats, setStats] = useState({
    childrenMonitored: 245,
    maternalRecords: 89,
    vaccinationsMonth: 156,
    overdueImmunizations: 12
  });

  // Document Info Modal State
  const [selectedInfoDoc, setSelectedInfoDoc] = useState<DocumentRequest | null>(null);
  const [isDocInfoOpen, setIsDocInfoOpen] = useState(false);

  // Document Print Modal State
  const [selectedPrintDoc, setSelectedPrintDoc] = useState<DocumentRequest | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const openDocInfo = (doc: DocumentRequest) => {
    setSelectedInfoDoc(doc);
    setIsDocInfoOpen(true);
  };

  const openPrintModal = (doc: DocumentRequest) => {
    setSelectedPrintDoc(doc);
    setPrintModalOpen(true);
  };

  // Resident Profile Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null);

  const openResidentProfile = (id: number) => {
    setSelectedResidentId(id);
    setProfileModalOpen(true);
  };

  // SMS Details Modal State
  const [selectedSms, setSelectedSms] = useState<SmsNotification | null>(null);
  const [isSmsDetailsOpen, setIsSmsDetailsOpen] = useState(false);

  const openSmsDetails = (sms: SmsNotification) => {
    setSelectedSms(sms);
    setIsSmsDetailsOpen(true);
  };

  // Search & Filters
  const [immSearch, setImmSearch] = useState('');
  const [maternalSearch, setMaternalSearch] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [smsSearch, setSmsSearch] = useState('');
  const [smsFilterType, setSmsFilterType] = useState('all');

  // Modals state
  const [isAddImmOpen, setIsAddImmOpen] = useState(false);
  const [isAddMaternalOpen, setIsAddMaternalOpen] = useState(false);
  const [isSendSmsOpen, setIsSendSmsOpen] = useState(false);

  // Form states
  const [newChildName, setNewChildName] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newVaccineName, setNewVaccineName] = useState('BCG');
  const [newDoseNumber, setNewDoseNumber] = useState('1');
  const [newDueDate, setNewDueDate] = useState('2026-05-15');
  const [newImmStatus, setNewImmStatus] = useState('Scheduled');

  const [newMotherName, setNewMotherName] = useState('');
  const [newMotherAge, setNewMotherAge] = useState('28');
  const [newPregnancyStatus, setNewPregnancyStatus] = useState('Prenatal - 1st Trimester');
  const [newNextVisit, setNewNextVisit] = useState('2026-05-20');
  const [newRiskLevel, setNewRiskLevel] = useState<'Low' | 'Moderate' | 'High'>('Low');

  const [smsRecipientName, setSmsRecipientName] = useState('');
  const [smsPhone, setSmsPhone] = useState('');
  const [smsType, setSmsType] = useState('Immunization Reminder');
  const [smsMessage, setSmsMessage] = useState('');

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [immData, matData, smsData, statsData, docsData, aptsData, schedulesData] = await Promise.all([
        apiService.getImmunizations(),
        apiService.getMaternalRecords(),
        apiService.getNotifications(),
        apiService.getBhwStats(),
        apiService.getDocuments(),
        apiService.getAppointments(),
        apiService.getClinicSchedules()
      ]);
      setImmunizations(immData);
      setMaternalRecords(matData);
      setNotifications(smsData);
      setStats(statsData);
      setDocuments(docsData || []);
      setAppointments(aptsData || []);
      setClinicSchedules(schedulesData || []);
    } catch (err) {
      toast.error('Failed to load health monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenScheduleModal = (apt: HealthAppointment) => {
    setSelectedApptToSchedule(apt);
    setScheduleDate(apt.scheduled_date || apt.preferred_date);
    setScheduleTime(apt.scheduled_time || '09:00 AM');
    setScheduleBhwNotes(apt.bhw_notes || `Confirmed slot for ${apt.service_type}. Please bring a valid ID.`);
    setIsScheduleModalOpen(true);
  };

  const handleApproveAndScheduleAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApptToSchedule) return;

    try {
      await apiService.updateAppointment(selectedApptToSchedule.id, {
        status: 'Approved',
        scheduled_date: scheduleDate,
        scheduled_time: scheduleTime,
        bhw_notes: scheduleBhwNotes,
        attending_bhw: user?.name || 'Nurse Maria Santos (BHW)',
        user_name: user?.name || 'Nurse Maria',
        user_role: user?.role || 'bhw'
      });

      toast.success('Appointment Approved & Confirmed!', {
        description: `📲 Auto-SMS & Email sent to ${selectedApptToSchedule.resident_name} for ${scheduleDate} at ${scheduleTime}.`
      });

      setIsScheduleModalOpen(false);
      setSelectedApptToSchedule(null);
      loadData();
    } catch (err) {
      toast.error('Failed to update appointment schedule');
    }
  };

  const handleUpdateApptStatus = async (id: number, newStatus: 'Completed' | 'Cancelled') => {
    const apt = appointments.find(a => a.id === id);
    try {
      await apiService.updateAppointment(id, {
        status: newStatus,
        attending_bhw: user?.name || 'Nurse Maria Santos (BHW)',
        user_name: user?.name,
        user_role: user?.role
      });
      toast.success(`Appointment marked as ${newStatus}`);
      loadData();
    } catch {
      toast.error(`Failed to mark appointment as ${newStatus}`);
    }
  };

  const handleCreateClinicSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleTitle || !newScheduleDay || !newScheduleTime) {
      toast.error('Please fill in title, day of week, and time slot.');
      return;
    }

    try {
      await apiService.createClinicSchedule({
        title: newScheduleTitle,
        service_type: newScheduleServiceType,
        day_of_week: newScheduleDay,
        time_slot: newScheduleTime,
        location: newScheduleLocation || 'Barangay Pianing Health Center',
        slots_available: Number(newScheduleSlots) || 20,
        bhw_in_charge: newScheduleBhw || user?.name || 'Nurse Maria Santos',
        barangay: user?.barangay || 'Pianing',
        created_by: user?.name || 'BHW Staff'
      });

      toast.success('Clinic Schedule Published!', {
        description: 'Residents can now view this official schedule and book appointments.'
      });

      setIsPostScheduleOpen(false);
      setNewScheduleTitle('');
      loadData();
    } catch {
      toast.error('Failed to post clinic schedule');
    }
  };

  const handleDeleteClinicSchedule = async (id: number) => {
    if (!confirm('Are you sure you want to remove this published clinic schedule?')) return;
    try {
      await apiService.deleteClinicSchedule(id);
      toast.success('Clinic schedule removed.');
      loadData();
    } catch {
      toast.error('Failed to remove schedule');
    }
  };

  const handleUpdateDocStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Pending' ? 'Processing' : 'Completed';
    const targetDoc = documents.find(d => d.id === id);
    const resName = targetDoc?.resident_name || 'Resident';

    try {
      await apiService.updateDocumentStatus(id, nextStatus, user?.name || 'Nurse Maria (BHW)');
      setDocuments(documents.map(d => d.id === id ? { ...d, status: nextStatus, processed_at: new Date().toLocaleDateString(), processed_by: user?.name || 'Nurse Maria (BHW)' } : d));
      
      if (nextStatus === 'Completed') {
        toast.success(`Health Document Approved & Ready for Release!`, {
          description: `📲 Auto-SMS sent to ${resName}: "Your certificate/clearance is approved & ready for pickup at the Health Center."`
        });
      } else {
        toast.info(`Request marked as ${nextStatus}`, {
          description: `📲 Auto-SMS sent to ${resName}: "Your request is now being processed."`
        });
      }
      loadData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  useEffect(() => {
    // Load user session
    const storedUser = localStorage.getItem('barangay_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        if (parsed.role === 'resident') {
          toast.error('Access Denied', {
            description: 'Resident accounts cannot access the BHW Health Center Portal.'
          });
          navigate('/resident');
          return;
        } else if (parsed.role !== 'bhw' && parsed.role !== 'superadmin') {
          toast.error('Access Denied', {
            description: 'You do not have permission to view the BHW Portal.'
          });
          navigate('/login');
          return;
        }
      } catch (e) {
        // Fallback in case of parsing errors
      }
    } else {
      toast.error('Authentication Required', {
        description: 'Please sign in with your BHW or Super Admin account.'
      });
      navigate('/login');
      return;
    }
    loadData();
  }, [navigate]);

  // Handlers
  const handleCreateImmunization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName.trim()) return;
    try {
      const created = await apiService.createImmunization({
        child_name: newChildName,
        parent_phone: newParentPhone || '09170000000',
        vaccine_name: newVaccineName,
        dose_number: Number(newDoseNumber) || 1,
        due_date: newDueDate,
        status: newImmStatus as any
      });
      setImmunizations([created, ...immunizations]);
      toast.success('Immunization record created successfully');
      setIsAddImmOpen(false);
      setNewChildName('');
    } catch (err) {
      toast.error('Could not create immunization record');
    }
  };

  const handleMarkImmunizationComplete = async (id: number) => {
    try {
      await apiService.updateImmunization(id, 'Completed', user?.name || 'BHW Maria');
      setImmunizations(immunizations.map(i => i.id === id ? { ...i, status: 'Completed', date_administered: new Date().toISOString().split('T')[0], days_overdue: 0 } : i));
      toast.success('Immunization marked as completed');
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleCreateMaternalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMotherName.trim()) return;
    try {
      const created = await apiService.createMaternalRecord({
        mother_name: newMotherName,
        age: Number(newMotherAge) || 25,
        pregnancy_status: newPregnancyStatus,
        last_visit: new Date().toISOString().split('T')[0],
        next_visit: newNextVisit,
        risk_level: newRiskLevel
      });
      setMaternalRecords([created, ...maternalRecords]);
      toast.success('Maternal record added to database');
      setIsAddMaternalOpen(false);
      setNewMotherName('');
    } catch (err) {
      toast.error('Could not add maternal record');
    }
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsRecipientName || !smsPhone) return;
    try {
      const sent = await apiService.sendNotification({
        recipient_name: smsRecipientName,
        recipient_phone: smsPhone,
        type: smsType,
        message: smsMessage || 'Reminder: Please visit the Barangay Health Center for scheduled checkup/vaccination.'
      });
      setNotifications([sent, ...notifications]);
      toast.success(`SMS Notification dispatched to ${smsPhone}`);
      setIsSendSmsOpen(false);
      setSmsRecipientName('');
      setSmsPhone('');
      setSmsMessage('');
    } catch (err) {
      toast.error('Failed to send SMS alert');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('barangay_user');
    toast.info('Logged out of BHW Portal');
    navigate('/login');
  };

  // Filtered
  const filteredImmunizations = immunizations.filter(i =>
    i.child_name.toLowerCase().includes(immSearch.toLowerCase()) ||
    i.vaccine_name.toLowerCase().includes(immSearch.toLowerCase())
  );

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch =
      (n.recipient_name || '').toLowerCase().includes(smsSearch.toLowerCase()) ||
      (n.recipient_phone || '').toLowerCase().includes(smsSearch.toLowerCase()) ||
      (n.message || '').toLowerCase().includes(smsSearch.toLowerCase());
    const matchesType = smsFilterType === 'all' || (n.type || '').toLowerCase().includes(smsFilterType.toLowerCase());
    return matchesSearch && matchesType;
  });

  const overdueVaccines = immunizations.filter(i => i.status === 'Overdue');

  const filteredAppointments = appointments.filter(a => {
    const matchesSearch =
      (a.appointment_code || '').toLowerCase().includes(apptSearch.toLowerCase()) ||
      (a.resident_name || '').toLowerCase().includes(apptSearch.toLowerCase()) ||
      (a.service_type || '').toLowerCase().includes(apptSearch.toLowerCase()) ||
      (a.resident_phone || '').toLowerCase().includes(apptSearch.toLowerCase());
    const matchesStatus = apptStatusFilter === 'all' || a.status === apptStatusFilter;
    const matchesService = apptServiceFilter === 'all' || a.service_type === apptServiceFilter;
    return matchesSearch && matchesStatus && matchesService;
  });

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'requests', label: 'Health Document Requests', icon: FileText },
    { id: 'appointments', label: 'Appointments & Schedules', icon: CalendarCheck },
    { id: 'immunization', label: 'Immunization Tracking', icon: Syringe },
    { id: 'maternal', label: 'Maternal Health', icon: Heart },
    { id: 'notifications', label: 'SMS Notifications', icon: Bell },
    { id: 'reports', label: 'Health Reports', icon: BarChart },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Super Admin Unified Ecosystem Switcher */}
      <SuperAdminNavigationDock currentRole={user?.role} />

      {/* Top Navbar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-white shadow-xs border border-blue-200 flex items-center justify-center">
                <img src="/assets/pianing-logo.png" alt="Barangay Pianing" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Barangay Pianing</h1>
                <span className="text-xs text-blue-600 font-semibold">BHW Health Portal</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.role === 'superadmin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
                className="flex items-center gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 font-semibold cursor-pointer animate-pulse"
              >
                <Shield size={14} />
                Switch to Admin Portal
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 border-slate-200"
            >
              <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar Navigation */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col py-4 shrink-0`}>
          <nav className="flex-1 px-3 space-y-1.5">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <item.icon size={18} className="shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
          {isVisitorMode && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-amber-900">Visitor Preview Mode</h3>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    You are currently previewing the Barangay Health Worker (BHW) portal. Recording vaccinations, creating maternal logs, and sending SMS reminders are locked in read-only preview.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/login')}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9 px-4 shrink-0 shadow-sm"
              >
                Log In as BHW
              </Button>
            </div>
          )}
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Barangay Health Monitoring Dashboard</h2>
                  <p className="text-xs text-slate-500">Maternal care, infant immunization tracking, and resident health alert dispatch.</p>
                </div>
                <div className="flex gap-2">
                  <Dialog open={isAddImmOpen} onOpenChange={setIsAddImmOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm">
                        <Syringe size={15} />
                        Record Vaccination
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white">
                      <DialogHeader>
                        <DialogTitle>Record New Vaccination</DialogTitle>
                        <DialogDescription className="text-xs">Schedule or record an immunization for a child.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateImmunization} className="space-y-3 py-2">
                        <div>
                          <Label className="text-xs">Child Full Name</Label>
                          <Input value={newChildName} onChange={e => setNewChildName(e.target.value)} required placeholder="Baby Maria Santos" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Parent Phone</Label>
                            <Input value={newParentPhone} onChange={e => setNewParentPhone(e.target.value)} placeholder="09182345678" />
                          </div>
                          <div>
                            <Label className="text-xs">Vaccine Type</Label>
                            <Select value={newVaccineName} onValueChange={setNewVaccineName}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BCG">BCG</SelectItem>
                                <SelectItem value="Hepatitis B">Hepatitis B</SelectItem>
                                <SelectItem value="DPT">DPT</SelectItem>
                                <SelectItem value="Polio">Polio</SelectItem>
                                <SelectItem value="MMR">MMR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Dose Number</Label>
                            <Input type="number" min="1" max="5" value={newDoseNumber} onChange={e => setNewDoseNumber(e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Due Date</Label>
                            <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} required />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Status</Label>
                          <Select value={newImmStatus} onValueChange={setNewImmStatus}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Scheduled">Scheduled</SelectItem>
                              <SelectItem value="Completed">Completed Now</SelectItem>
                              <SelectItem value="Overdue">Overdue</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Record</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Baby size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Children Monitored</p>
                      <h3 className="text-2xl font-bold text-slate-900">{stats.childrenMonitored}</h3>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                      <Heart size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Maternal Records</p>
                      <h3 className="text-2xl font-bold text-slate-900">{stats.maternalRecords}</h3>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Syringe size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Vaccinations Completed</p>
                      <h3 className="text-2xl font-bold text-slate-900">{stats.vaccinationsMonth}</h3>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Overdue Immunizations</p>
                      <h3 className="text-2xl font-bold text-slate-900">{overdueVaccines.length || stats.overdueImmunizations}</h3>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Overdue Alerts Box */}
              {overdueVaccines.length > 0 && (
                <Card className="border-red-200 bg-red-50/50 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-red-900 flex items-center gap-2">
                      <AlertTriangle className="text-red-600" size={18} />
                      Attention Required: Overdue Immunizations ({overdueVaccines.length})
                    </CardTitle>
                    <CardDescription className="text-xs text-red-700">Children requiring urgent follow-up vaccine dosage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-red-100/50">
                          <TableHead className="text-xs text-red-900">Child Name</TableHead>
                          <TableHead className="text-xs text-red-900">Vaccine</TableHead>
                          <TableHead className="text-xs text-red-900">Due Date</TableHead>
                          <TableHead className="text-xs text-red-900">Days Overdue</TableHead>
                          <TableHead className="text-xs text-red-900 text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overdueVaccines.map(ov => (
                          <TableRow key={ov.id} className="text-xs">
                            <TableCell className="font-semibold text-slate-900">{ov.child_name}</TableCell>
                            <TableCell><Badge variant="outline" className="border-red-300 text-red-800">{ov.vaccine_name}</Badge></TableCell>
                            <TableCell className="font-mono text-slate-600">{ov.due_date}</TableCell>
                            <TableCell><span className="text-red-700 font-bold">{ov.days_overdue || 10} days overdue</span></TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" onClick={() => handleMarkImmunizationComplete(ov.id)} className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white">
                                <CheckCircle2 size={12} className="mr-1" /> Mark Administered
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* TAB: HEALTH DOCUMENT REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Health Center Document Requests</h2>
                  <p className="text-xs text-slate-500">Medical certificates, health clearances, immunization cards, and maternal records submitted by residents.</p>
                </div>
              </div>

              {/* Filter and Export Toolbar */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="relative flex-1 max-w-md w-full">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <Input
                    placeholder="Search by request code, resident name, or type..."
                    value={docSearch}
                    onChange={e => setDocSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <Button
                  onClick={() => {
                    printOfficialReport({
                      title: 'Health Center Document Requests',
                      subtitle: `Medical certificates & health clearances — ${new Date().toLocaleDateString()}`,
                      preparedBy: user?.name || 'BHW Health Worker',
                      preparedByTitle: 'Barangay Health Worker',
                      department: 'Barangay Health Center',
                      stats: [{ label: 'Total Requests', value: documents.length, color: '#059669' }],
                      tables: [{
                        title: 'Health Document Requests',
                        headers: ['Code', 'Resident', 'Type', 'Purpose', 'Status', 'Date'],
                        rows: documents.map(d => [d.request_code ?? '', d.resident_name ?? '', d.document_type ?? '', d.purpose ?? '', d.status ?? '', d.requested_at ?? 'Recent'])
                      }]
                    });
                    toast.success('Health document requests opened as PDF');
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 h-9 border-slate-300 hover:bg-slate-50"
                >
                  <Download size={14} /> Export PDF
                </Button>
              </div>

              {/* Document Requests Table */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs font-bold">Request Code</TableHead>
                        <TableHead className="text-xs font-bold">Resident Name</TableHead>
                        <TableHead className="text-xs font-bold">Document Type</TableHead>
                        <TableHead className="text-xs font-bold">Purpose / Details</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                        <TableHead className="text-xs font-bold">Requested At</TableHead>
                        <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.filter(d =>
                        d.request_code.toLowerCase().includes(docSearch.toLowerCase()) ||
                        d.resident_name.toLowerCase().includes(docSearch.toLowerCase()) ||
                        d.document_type.toLowerCase().includes(docSearch.toLowerCase())
                      ).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-xs py-8 text-slate-400">
                            No document requests found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        documents.filter(d =>
                          d.request_code.toLowerCase().includes(docSearch.toLowerCase()) ||
                          d.resident_name.toLowerCase().includes(docSearch.toLowerCase()) ||
                          d.document_type.toLowerCase().includes(docSearch.toLowerCase())
                        ).map(doc => (
                          <TableRow key={doc.id} className="text-xs hover:bg-slate-50/80 transition-colors">
                            <TableCell>
                              <button
                                onClick={() => openDocInfo(doc)}
                                className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                                title="Click to view document info"
                              >
                                {doc.request_code}
                                <Eye size={12} className="opacity-70" />
                              </button>
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={() => openResidentProfile(doc.resident_id || 1)}
                                className="font-semibold text-slate-900 hover:text-blue-600 hover:underline transition-colors"
                              >
                                {doc.resident_name}
                              </button>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-slate-800">{doc.document_type}</span>
                            </TableCell>
                            <TableCell className="text-slate-500 max-w-[150px] truncate" title={doc.purpose}>
                              {doc.purpose || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                doc.status === 'Completed' ? 'bg-emerald-600' :
                                doc.status === 'Processing' ? 'bg-amber-500' : 'bg-orange-500'
                              }>
                                {doc.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-500 text-[11px] font-mono">
                              {doc.requested_at || 'Recent'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDocInfo(doc)}
                                  className="h-7 text-[11px] gap-1 text-slate-700 border-slate-300 hover:bg-slate-50"
                                >
                                  <Eye size={13} /> Details
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPrintModal(doc)}
                                  className="h-7 text-[11px] gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                                >
                                  <Printer size={13} /> Print
                                </Button>
                                {doc.status !== 'Completed' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateDocStatus(doc.id, doc.status)}
                                    className="h-7 text-[11px] gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                  >
                                    <Check size={12} />
                                    {doc.status === 'Pending' ? 'Process' : 'Approve'}
                                  </Button>
                                )}
                              </div>
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

          {/* TAB: HEALTH CENTER APPOINTMENTS & CLINIC SCHEDULES */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Health Center Appointments &amp; Schedules</h2>
                    <Badge className="bg-emerald-600 text-white text-[10px]">
                      {appointments.length} Total
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Review and confirm resident appointment requests for <strong>Pre-Marriage Counseling (PMC)</strong>, Prenatal Care, Immunizations, and Family Planning.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsPostScheduleOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm cursor-pointer"
                  >
                    <PlusCircle size={15} />
                    Post Clinic Schedule
                  </Button>
                </div>
              </div>

              {/* Quick Stat Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pending Review</span>
                  <span className="text-2xl font-black text-amber-600">
                    {appointments.filter(a => a.status === 'Pending').length}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Confirmed / Approved</span>
                  <span className="text-2xl font-black text-emerald-600">
                    {appointments.filter(a => a.status === 'Approved').length}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Completed Visits</span>
                  <span className="text-2xl font-black text-blue-600">
                    {appointments.filter(a => a.status === 'Completed').length}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Active Clinic Programs</span>
                  <span className="text-2xl font-black text-purple-600">
                    {clinicSchedules.length}
                  </span>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row gap-2 justify-between">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <Input
                      placeholder="Search resident name, ref code, or service..."
                      value={apptSearch}
                      onChange={e => setApptSearch(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>

                  <Select value={apptServiceFilter} onValueChange={setApptServiceFilter}>
                    <SelectTrigger className="w-[180px] h-9 text-xs">
                      <SelectValue placeholder="All Services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      <SelectItem value="Pre-Marriage Counseling (PMC)">Pre-Marriage Counseling</SelectItem>
                      <SelectItem value="Prenatal Check-up">Prenatal Check-up</SelectItem>
                      <SelectItem value="Child Immunization">Child Immunization</SelectItem>
                      <SelectItem value="Family Planning &amp; Counseling">Family Planning</SelectItem>
                      <SelectItem value="General Medical Consultation">General Consultation</SelectItem>
                      <SelectItem value="BHW Home Visit">BHW Home Visit</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={apptStatusFilter} onValueChange={setApptStatusFilter}>
                    <SelectTrigger className="w-[130px] h-9 text-xs">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => {
                    printOfficialReport({
                      title: 'Health Center Appointments Schedule Report',
                      subtitle: `Barangay Pianing Health Center — ${new Date().toLocaleDateString()}`,
                      preparedBy: user?.name || 'BHW Health Worker',
                      preparedByTitle: 'Barangay Health Worker',
                      department: 'Barangay Health Center',
                      stats: [
                        { label: 'Total Appointments', value: appointments.length, color: '#059669' },
                        { label: 'Confirmed', value: appointments.filter(a => a.status === 'Approved').length, color: '#2563EB' },
                        { label: 'Completed', value: appointments.filter(a => a.status === 'Completed').length, color: '#16A34A' }
                      ],
                      tables: [{
                        title: 'Health Appointments Registry',
                        headers: ['Ref Code', 'Resident Name', 'Phone', 'Service', 'Confirmed Date', 'Time', 'Status'],
                        rows: appointments.map(a => [
                          a.appointment_code ?? '',
                          a.resident_name ?? '',
                          a.resident_phone ?? 'N/A',
                          a.service_type ?? '',
                          a.scheduled_date ?? a.preferred_date ?? 'TBD',
                          a.scheduled_time ?? a.preferred_time ?? '',
                          a.status ?? ''
                        ])
                      }]
                    });
                    toast.success('Health appointments report exported as PDF');
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 h-9 border-slate-300 hover:bg-slate-50"
                >
                  <Download size={14} /> Export PDF
                </Button>
              </div>

              {/* Appointments Table */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CalendarCheck className="text-emerald-600" size={16} />
                    Incoming &amp; Confirmed Resident Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Ref Code</TableHead>
                        <TableHead className="text-xs">Resident Details</TableHead>
                        <TableHead className="text-xs">Program / Service</TableHead>
                        <TableHead className="text-xs">Requested Window</TableHead>
                        <TableHead className="text-xs">Confirmed Slot</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-xs py-10 text-slate-400">
                            <CalendarCheck className="mx-auto mb-2 text-slate-300" size={24} />
                            No appointment requests found matching your filter criteria.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAppointments.map(apt => (
                          <TableRow key={apt.id} className="text-xs">
                            <TableCell className="font-mono font-bold text-emerald-700">
                              {apt.appointment_code}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-slate-900">{apt.resident_name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{apt.resident_phone || 'No phone'}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-slate-800">{apt.service_type}</div>
                              {apt.resident_notes && (
                                <div className="text-[10px] text-slate-500 italic max-w-xs truncate" title={apt.resident_notes}>
                                  Note: {apt.resident_notes}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              <div>📅 {apt.preferred_date}</div>
                              <div className="text-[10px] text-slate-400">{apt.preferred_time}</div>
                            </TableCell>
                            <TableCell>
                              {apt.scheduled_date ? (
                                <div className="font-medium text-emerald-800">
                                  <div>📅 {apt.scheduled_date}</div>
                                  <div className="text-[10px] text-emerald-600 font-mono">⏰ {apt.scheduled_time || 'Morning'}</div>
                                </div>
                              ) : (
                                <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                                  Needs Scheduling
                                </span>
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
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {apt.status === 'Pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenScheduleModal(apt)}
                                    className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                  >
                                    <Check size={12} /> Confirm Schedule
                                  </Button>
                                )}

                                {apt.status === 'Approved' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenScheduleModal(apt)}
                                      className="h-7 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1"
                                      title="Reschedule / Edit instructions"
                                    >
                                      Edit Slot
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateApptStatus(apt.id, 'Completed')}
                                      className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                    >
                                      <CheckCircle2 size={12} /> Mark Completed
                                    </Button>
                                  </>
                                )}

                                {apt.status !== 'Cancelled' && apt.status !== 'Completed' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleUpdateApptStatus(apt.id, 'Cancelled')}
                                    className="h-7 text-[11px] text-red-600 hover:bg-red-50"
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Published Clinic Schedules Section */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="text-emerald-600" size={16} />
                      Published Health Center Clinic Schedules (Seen by Residents)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Official schedules published to the resident portal.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsPostScheduleOpen(true)}
                    className="h-8 text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                  >
                    + Add New Schedule
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {clinicSchedules.map(sch => (
                      <div key={sch.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {sch.service_type}
                            </span>
                            <Badge className="bg-emerald-600 text-white text-[10px] font-medium">
                              Active Hours
                            </Badge>
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
                          variant="ghost"
                          onClick={() => handleDeleteClinicSchedule(sch.id)}
                          className="w-full h-7 text-[10px] text-red-600 hover:bg-red-50"
                        >
                          Remove Published Schedule
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Confirm / Approve Appointment Schedule Modal */}
              <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
                <DialogContent className="bg-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-900">
                      <CalendarCheck size={18} className="text-emerald-600" />
                      Confirm &amp; Schedule Appointment
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Set the confirmed date, time slot, and instructions for <strong>{selectedApptToSchedule?.resident_name}</strong>. An automated SMS and Email confirmation will be dispatched immediately.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleApproveAndScheduleAppointment} className="space-y-3.5 py-2 text-xs">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-emerald-950">{selectedApptToSchedule?.service_type}</span>
                        <span className="font-mono text-emerald-800 font-bold">{selectedApptToSchedule?.appointment_code}</span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        Resident requested: 📅 {selectedApptToSchedule?.preferred_date} ({selectedApptToSchedule?.preferred_time})
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold">Confirmed Date <span className="text-red-500">*</span></Label>
                        <Input
                          type="date"
                          value={scheduleDate}
                          onChange={e => setScheduleDate(e.target.value)}
                          required
                          className="mt-1 h-9 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Confirmed Time Slot <span className="text-red-500">*</span></Label>
                        <Select value={scheduleTime} onValueChange={setScheduleTime}>
                          <SelectTrigger className="mt-1 h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="08:30 AM">08:30 AM (Morning Session)</SelectItem>
                            <SelectItem value="09:30 AM">09:30 AM</SelectItem>
                            <SelectItem value="10:30 AM">10:30 AM</SelectItem>
                            <SelectItem value="01:30 PM">01:30 PM (Afternoon Session)</SelectItem>
                            <SelectItem value="02:30 PM">02:30 PM</SelectItem>
                            <SelectItem value="03:30 PM">03:30 PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">BHW Instructions &amp; Requirements Note</Label>
                      <textarea
                        value={scheduleBhwNotes}
                        onChange={e => setScheduleBhwNotes(e.target.value)}
                        rows={3}
                        placeholder="e.g. Please bring: (1) Valid IDs of couple, (2) Barangay Residency Certificate, and (3) CENOMAR from PSA. Session starts promptly at 9:00 AM."
                        className="w-full mt-1 px-3 py-2 text-xs rounded-md border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsScheduleModalOpen(false)} className="text-xs">
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm">
                        <Check size={14} />
                        Approve &amp; Send Confirmation
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Post New Clinic Schedule Modal */}
              <Dialog open={isPostScheduleOpen} onOpenChange={setIsPostScheduleOpen}>
                <DialogContent className="bg-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-900">
                      <PlusCircle size={18} className="text-emerald-600" />
                      Post New Clinic Schedule
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Publish a regular weekly health clinic schedule for residents to view and book.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateClinicSchedule} className="space-y-3 py-2 text-xs">
                    <div>
                      <Label className="text-xs font-semibold">Schedule Title <span className="text-red-500">*</span></Label>
                      <Input
                        value={newScheduleTitle}
                        onChange={e => setNewScheduleTitle(e.target.value)}
                        placeholder="e.g. Pre-Marriage Counseling (PMC) Weekly Seminar"
                        required
                        className="mt-1 h-9 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Health Service / Program</Label>
                      <Select value={newScheduleServiceType} onValueChange={setNewScheduleServiceType}>
                        <SelectTrigger className="mt-1 h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pre-Marriage Counseling (PMC)">Pre-Marriage Counseling (PMC)</SelectItem>
                          <SelectItem value="Prenatal Check-up">Prenatal Check-up</SelectItem>
                          <SelectItem value="Child Immunization">Child Immunization</SelectItem>
                          <SelectItem value="Family Planning &amp; Counseling">Family Planning &amp; Counseling</SelectItem>
                          <SelectItem value="General Medical Consultation">General Medical Consultation</SelectItem>
                          <SelectItem value="BHW Home Visit">BHW Home Visit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-semibold">Day of Week <span className="text-red-500">*</span></Label>
                        <Input
                          value={newScheduleDay}
                          onChange={e => setNewScheduleDay(e.target.value)}
                          placeholder="e.g. Every Wednesday"
                          required
                          className="mt-1 h-9 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Operating Time Block <span className="text-red-500">*</span></Label>
                        <Input
                          value={newScheduleTime}
                          onChange={e => setNewScheduleTime(e.target.value)}
                          placeholder="e.g. 10:00 AM - 12:00 PM"
                          required
                          className="mt-1 h-9 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">BHW In-Charge</Label>
                      <Input
                        value={newScheduleBhw}
                        onChange={e => setNewScheduleBhw(e.target.value)}
                        placeholder="Nurse Maria Santos / Duty BHW"
                        className="mt-1 h-9 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Location / Room</Label>
                      <Input
                        value={newScheduleLocation}
                        onChange={e => setNewScheduleLocation(e.target.value)}
                        placeholder="Barangay Pianing Health Center - Room 1"
                        className="mt-1 h-9 text-xs"
                      />
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsPostScheduleOpen(false)} className="text-xs">
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm">
                        <PlusCircle size={14} />
                        Publish Schedule
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* TAB 2: IMMUNIZATION TRACKING */}
          {activeTab === 'immunization' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Child Immunization Registry</h2>
                  <p className="text-xs text-slate-500">Track vaccine doses (BCG, HepB, DPT, Polio, MMR) linked to MySQL database.</p>
                </div>

                <Dialog open={isAddImmOpen} onOpenChange={setIsAddImmOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm">
                      <PlusCircle size={15} />
                      Add Vaccine Schedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Record New Vaccination</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateImmunization} className="space-y-3 py-2">
                      <div>
                        <Label className="text-xs">Child Full Name</Label>
                        <Input value={newChildName} onChange={e => setNewChildName(e.target.value)} required placeholder="Baby Maria Santos" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Parent Phone</Label>
                          <Input value={newParentPhone} onChange={e => setNewParentPhone(e.target.value)} placeholder="09182345678" />
                        </div>
                        <div>
                          <Label className="text-xs">Vaccine Type</Label>
                          <Select value={newVaccineName} onValueChange={setNewVaccineName}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BCG">BCG</SelectItem>
                              <SelectItem value="Hepatitis B">Hepatitis B</SelectItem>
                              <SelectItem value="DPT">DPT</SelectItem>
                              <SelectItem value="Polio">Polio</SelectItem>
                              <SelectItem value="MMR">MMR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Dose Number</Label>
                          <Input type="number" min="1" max="5" value={newDoseNumber} onChange={e => setNewDoseNumber(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Due Date</Label>
                          <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} required />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Record</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="relative flex-1 max-w-md w-full">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <Input
                    placeholder="Search child name or vaccine..."
                    value={immSearch}
                    onChange={e => setImmSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <Button
                  onClick={() => {
                    printOfficialReport({
                      title: 'Immunization Records',
                      subtitle: `Child vaccine records — ${new Date().toLocaleDateString()}`,
                      preparedBy: user?.name || 'BHW Health Worker',
                      preparedByTitle: 'Barangay Health Worker',
                      department: 'Barangay Health Center',
                      stats: [
                        { label: 'Total Records', value: filteredImmunizations.length, color: '#0284c7' },
                        { label: 'Overdue', value: filteredImmunizations.filter(i => i.status === 'Overdue').length, color: '#dc2626' }
                      ],
                      tables: [{
                        title: 'Immunization Records',
                        headers: ['Child Name', 'Parent Phone', 'Vaccine', 'Dose', 'Status', 'Date Administered'],
                        rows: filteredImmunizations.map(i => [i.child_name, i.parent_phone || 'N/A', i.vaccine_name, `Dose ${i.dose_number}`, i.status, i.date_administered || i.due_date || 'N/A'])
                      }]
                    });
                    toast.success('Immunization records opened as PDF');
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 h-9 border-slate-300 hover:bg-slate-50"
                >
                  <Download size={14} /> Export PDF
                </Button>
              </div>

              <Card className="border-slate-200 bg-white">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Child Name</TableHead>
                        <TableHead className="text-xs">Vaccine</TableHead>
                        <TableHead className="text-xs">Dose</TableHead>
                        <TableHead className="text-xs">Due Date</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Administered Date</TableHead>
                        <TableHead className="text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredImmunizations.map(imm => (
                        <TableRow key={imm.id} className="text-xs">
                          <TableCell>
                            <button
                              onClick={() => openResidentProfile(imm.resident_id || 1)}
                              className="font-semibold text-blue-700 hover:text-blue-900 hover:underline transition-colors"
                            >
                              {imm.child_name}
                            </button>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="font-semibold">{imm.vaccine_name}</Badge></TableCell>
                          <TableCell className="font-mono">Dose #{imm.dose_number}</TableCell>
                          <TableCell className="font-mono text-slate-600">{imm.due_date}</TableCell>
                          <TableCell>
                            <Badge className={
                              imm.status === 'Completed' ? 'bg-emerald-600' :
                              imm.status === 'Overdue' ? 'bg-red-600' : 'bg-blue-500'
                            }>
                              {imm.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500 font-mono text-[11px]">{imm.date_administered || '-'}</TableCell>
                          <TableCell className="text-right">
                            {imm.status !== 'Completed' && (
                              <Button size="sm" onClick={() => handleMarkImmunizationComplete(imm.id)} className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white">
                                Complete
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: MATERNAL HEALTH */}
          {activeTab === 'maternal' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Maternal Healthcare Monitoring</h2>
                  <p className="text-xs text-slate-500">Prenatal & postnatal tracking, risk assessment, and appointment scheduling.</p>
                </div>

                <Dialog open={isAddMaternalOpen} onOpenChange={setIsAddMaternalOpen}>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        printOfficialReport({
                          title: 'Maternal Health Records',
                          subtitle: `Prenatal & postnatal monitoring — ${new Date().toLocaleDateString()}`,
                          preparedBy: user?.name || 'BHW Health Worker',
                          preparedByTitle: 'Barangay Health Worker',
                          department: 'Barangay Health Center',
                          stats: [
                            { label: 'Total Patients', value: maternalRecords.length, color: '#db2777' },
                            { label: 'High Risk', value: maternalRecords.filter(m => m.risk_level === 'High').length, color: '#dc2626' }
                          ],
                          tables: [{
                            title: 'Maternal Care Records',
                            headers: ['Mother', 'Age', 'Status', 'Due Date', 'Risk Level', 'Next Visit'],
                            rows: maternalRecords.map(m => [m.mother_name ?? '', String(m.age ?? ''), m.pregnancy_status ?? '', m.expected_due_date ?? 'N/A', m.risk_level ?? '', m.next_visit ?? 'TBD'])
                          }]
                        });
                        toast.success('Maternal health records opened as PDF');
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 h-9 border-slate-300 hover:bg-slate-50"
                    >
                      <Download size={14} /> Export PDF
                    </Button>
                    <DialogTrigger asChild>
                      <Button className="bg-pink-600 hover:bg-pink-700 text-white text-xs gap-1.5 shadow-sm">
                        <PlusCircle size={15} />
                        Add Maternal Record
                      </Button>
                    </DialogTrigger>
                  </div>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Add Maternal Care Record</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateMaternalRecord} className="space-y-3 py-2">
                      <div>
                        <Label className="text-xs">Mother Full Name</Label>
                        <Input value={newMotherName} onChange={e => setNewMotherName(e.target.value)} required placeholder="Teresa Ramos" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Age</Label>
                          <Input type="number" value={newMotherAge} onChange={e => setNewMotherAge(e.target.value)} required />
                        </div>
                        <div>
                          <Label className="text-xs">Risk Level</Label>
                          <Select value={newRiskLevel} onValueChange={(val: 'Low' | 'Moderate' | 'High') => setNewRiskLevel(val)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low Risk</SelectItem>
                              <SelectItem value="Moderate">Moderate Risk</SelectItem>
                              <SelectItem value="High">High Risk</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Pregnancy / Postnatal Status</Label>
                        <Select value={newPregnancyStatus} onValueChange={setNewPregnancyStatus}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Prenatal - 1st Trimester">Prenatal - 1st Trimester</SelectItem>
                            <SelectItem value="Prenatal - 2nd Trimester">Prenatal - 2nd Trimester</SelectItem>
                            <SelectItem value="Prenatal - 3rd Trimester">Prenatal - 3rd Trimester</SelectItem>
                            <SelectItem value="Postnatal - 2 weeks">Postnatal - 2 weeks</SelectItem>
                            <SelectItem value="Postnatal - 6 weeks">Postnatal - 6 weeks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Next Visit Schedule</Label>
                        <Input type="date" value={newNextVisit} onChange={e => setNewNextVisit(e.target.value)} required />
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white">Save Record</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="border-slate-200 bg-white">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Mother Name</TableHead>
                        <TableHead className="text-xs">Age</TableHead>
                        <TableHead className="text-xs">Pregnancy Status</TableHead>
                        <TableHead className="text-xs">Risk Level</TableHead>
                        <TableHead className="text-xs">Last Visit</TableHead>
                        <TableHead className="text-xs">Next Visit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {maternalRecords.map(mat => (
                        <TableRow key={mat.id} className="text-xs">
                          <TableCell>
                            <button
                              onClick={() => openResidentProfile(mat.resident_id || 1)}
                              className="font-semibold text-blue-700 hover:text-blue-900 hover:underline transition-colors"
                            >
                              {mat.mother_name}
                            </button>
                          </TableCell>
                          <TableCell>{mat.age} yrs</TableCell>
                          <TableCell><Badge variant="outline">{mat.pregnancy_status}</Badge></TableCell>
                          <TableCell>
                            <Badge className={
                              mat.risk_level === 'High' ? 'bg-red-600' :
                              mat.risk_level === 'Moderate' ? 'bg-amber-500' : 'bg-emerald-600'
                            }>
                              {mat.risk_level || 'Low'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-slate-500">{mat.last_visit}</TableCell>
                          <TableCell className="font-mono font-semibold text-blue-600">{mat.next_visit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: SMS NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">SMS Notification Dispatch</h2>
                    <Badge className="bg-blue-600 text-white text-[10px]">
                      {notifications.length} Sent
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live record of all SMS alerts dispatched to residents for clearances, immunization reminders, and maternal visits.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => {
                      printOfficialReport({
                        title: 'SMS Health Notification Dispatch Log',
                        subtitle: `All SMS alerts dispatched — ${new Date().toLocaleDateString()}`,
                        preparedBy: user?.name || 'BHW Health Worker',
                        preparedByTitle: 'Barangay Health Worker',
                        department: 'Barangay Health Center',
                        stats: [{ label: 'Total Dispatched', value: notifications.length, color: '#2563eb' }],
                        tables: [{
                          title: 'SMS Dispatch Log',
                          headers: ['Recipient', 'Phone', 'Alert Type', 'Status', 'Dispatched At'],
                          rows: notifications.map(n => [n.recipient_name, n.recipient_phone, n.type || 'General', n.status || 'Sent', n.sent_at || 'Recent'])
                        }]
                      });
                      toast.success('SMS dispatch log opened as PDF');
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 h-9 border-slate-300 hover:bg-slate-50"
                  >
                    <Download size={14} /> Export Log
                  </Button>

                  <Dialog open={isSendSmsOpen} onOpenChange={setIsSendSmsOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm h-9 font-semibold">
                        <Send size={15} />
                        Compose SMS Alert
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white">
                      <DialogHeader>
                        <DialogTitle>Send SMS Notification</DialogTitle>
                        <DialogDescription className="text-xs">
                          Directly dispatch an SMS alert to a resident mobile phone.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSendSms} className="space-y-3 py-2">
                        <div>
                          <Label className="text-xs">Recipient Name</Label>
                          <Input value={smsRecipientName} onChange={e => setSmsRecipientName(e.target.value)} required placeholder="e.g. Sofia Martinez" />
                        </div>
                        <div>
                          <Label className="text-xs">Mobile Phone Number</Label>
                          <Input value={smsPhone} onChange={e => setSmsPhone(e.target.value)} required placeholder="09226789012" />
                        </div>
                        <div>
                          <Label className="text-xs">Alert Type</Label>
                          <Select value={smsType} onValueChange={setSmsType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Immunization Reminder">Immunization Reminder</SelectItem>
                              <SelectItem value="Maternal Checkup Alert">Maternal Checkup Alert</SelectItem>
                              <SelectItem value="Document Ready">Document Ready</SelectItem>
                              <SelectItem value="Account Verified">Account Verified</SelectItem>
                              <SelectItem value="Barangay Announcement">Barangay Announcement</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">SMS Message</Label>
                          <textarea
                            value={smsMessage}
                            onChange={e => setSmsMessage(e.target.value)}
                            rows={3}
                            className="w-full border rounded-md p-2.5 text-xs border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
                            placeholder="Reminder: Baby Sofia is scheduled for MMR vaccine at Barangay Health Center tomorrow."
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                            <Send size={14} className="mr-1.5" />
                            Dispatch SMS Alert
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <Input
                    placeholder="Search by recipient name, phone number, or message text..."
                    value={smsSearch}
                    onChange={e => setSmsSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={smsFilterType} onValueChange={setSmsFilterType}>
                    <SelectTrigger className="w-44 h-9 text-xs">
                      <SelectValue placeholder="All Alert Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Alert Types</SelectItem>
                      <SelectItem value="Immunization">Immunization</SelectItem>
                      <SelectItem value="Maternal">Maternal Checkup</SelectItem>
                      <SelectItem value="Document">Document Ready</SelectItem>
                      <SelectItem value="Verified">Account Verified</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadData}
                    className="h-9 px-2.5 text-slate-600 hover:bg-slate-100"
                    title="Refresh SMS records"
                  >
                    <RefreshCcw size={14} />
                  </Button>
                </div>
              </div>

              {/* SMS Records Table */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 text-slate-600">
                        <TableHead className="text-xs font-semibold">Recipient</TableHead>
                        <TableHead className="text-xs font-semibold">Mobile Phone</TableHead>
                        <TableHead className="text-xs font-semibold">Alert Type</TableHead>
                        <TableHead className="text-xs font-semibold">Message Preview (Click to View)</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-xs font-semibold">Sent Timestamp</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNotifications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-xs py-12 text-slate-400">
                            <Bell size={28} className="mx-auto mb-2 opacity-40 text-blue-500" />
                            No SMS notifications found matching your search.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredNotifications.map(n => (
                          <TableRow
                            key={n.id}
                            className="text-xs hover:bg-blue-50/40 cursor-pointer transition-colors group"
                            onClick={() => openSmsDetails(n)}
                          >
                            <TableCell className="font-semibold text-slate-900 group-hover:text-blue-700">
                              {n.recipient_name || 'Resident'}
                            </TableCell>
                            <TableCell className="font-mono font-medium text-slate-600">
                              {n.recipient_phone || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  (n.type || '').includes('Immunization')
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : (n.type || '').includes('Maternal')
                                    ? 'bg-pink-50 border-pink-200 text-pink-700'
                                    : (n.type || '').includes('Document')
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                    : (n.type || '').includes('Verified')
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }
                              >
                                {n.type || 'General'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-600 max-w-[280px]">
                              <p className="truncate font-sans">{n.message}</p>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] gap-1 px-2 py-0.5">
                                <Check size={11} />
                                {n.status || 'Sent'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-slate-400 text-[11px]">
                              {n.sent_at ? new Date(n.sent_at).toLocaleDateString() + ' ' + new Date(n.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                            </TableCell>
                            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openSmsDetails(n)}
                                className="h-7 text-xs gap-1 text-blue-600 hover:bg-blue-50 font-medium px-2.5"
                              >
                                <Eye size={13} />
                                <span>View SMS</span>
                              </Button>
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

          {/* TAB 5: HEALTH REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Public Health Reports & Analytics</h2>
                  <p className="text-xs text-slate-500">Official Barangay Pianing Health Center reports, vaccination coverage, and maternal monitoring.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => {
                      printOfficialReport({
                        title: 'Child Immunization Report',
                        subtitle: `Full vaccination records — ${new Date().toLocaleDateString()}`,
                        preparedBy: user?.name || 'BHW Health Worker',
                        preparedByTitle: 'Barangay Health Worker',
                        department: 'Barangay Health Center',
                        stats: [
                          { label: 'Total Records', value: immunizations.length, color: '#0284c7' },
                          { label: 'Overdue', value: immunizations.filter(i => i.status === 'Overdue').length, color: '#dc2626' }
                        ],
                        tables: [{
                          title: 'Immunization Records',
                          headers: ['Child', 'Parent Contact', 'Vaccine', 'Dose', 'Status', 'Date', 'By'],
                          rows: immunizations.map(i => [i.child_name, i.parent_phone || 'N/A', i.vaccine_name, `Dose ${i.dose_number}`, i.status, i.date_administered || 'N/A', i.administered_by || 'BHW Clinic'])
                        }]
                      });
                      toast.success('Immunization report opened as PDF');
                    }}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 border-slate-300"
                  >
                    <Download size={13} /> Export Vaccines (PDF)
                  </Button>

                  <Button
                    onClick={() => {
                      printOfficialReport({
                        title: 'Maternal Health Report',
                        subtitle: `Prenatal & postnatal patient records — ${new Date().toLocaleDateString()}`,
                        preparedBy: user?.name || 'BHW Health Worker',
                        preparedByTitle: 'Barangay Health Worker',
                        department: 'Barangay Health Center',
                        stats: [
                          { label: 'Total Patients', value: maternalRecords.length, color: '#db2777' },
                          { label: 'High Risk', value: maternalRecords.filter(m => m.risk_level === 'High').length, color: '#dc2626' }
                        ],
                        tables: [{
                          title: 'Maternal Care Records',
                          headers: ['Mother', 'Age', 'Pregnancy Status', 'Due Date', 'Risk Level', 'Notes'],
                          rows: maternalRecords.map(m => [m.mother_name ?? '', String(m.age ?? ''), m.pregnancy_status ?? '', m.expected_due_date ?? 'N/A', m.risk_level ?? '', m.notes ?? ''])
                        }]
                      });
                      toast.success('Maternal health report opened as PDF');
                    }}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 border-slate-300"
                  >
                    <Download size={13} /> Export Maternal (PDF)
                  </Button>

                  <Button
                    onClick={() => {
                      printOfficialReport({
                        title: 'Public Health & Immunization Performance Report',
                        subtitle: 'Barangay Pianing Health Center • Comprehensive Child Healthcare & Maternal Program',
                        department: 'Barangay Health Center • Public Health Office',
                        preparedBy: user?.name || 'Nurse Maria Santos',
                        preparedByTitle: 'Barangay Health Worker / Nurse',
                        stats: [
                          { label: 'Children Monitored', value: stats.childrenMonitored, color: '#0284c7' },
                          { label: 'Vaccines This Month', value: stats.vaccinationsMonth, color: '#059669' },
                          { label: 'Overdue Doses', value: stats.overdueImmunizations, color: '#dc2626' },
                          { label: 'Active Maternal Patients', value: maternalRecords.length, color: '#db2777' }
                        ],
                        tables: [
                          {
                            title: 'Recent Child Immunization Deliveries',
                            headers: ['Child Patient', 'Parent Contact', 'Vaccine Administered', 'Dose', 'Status', 'Date'],
                            rows: immunizations.slice(0, 10).map(i => [
                              i.child_name,
                              i.parent_phone || 'N/A',
                              i.vaccine_name,
                              `Dose ${i.dose_number}`,
                              i.status,
                              i.date_administered || i.due_date || 'Recent'
                            ])
                          },
                          {
                            title: 'Maternal Care & High-Risk Pregnancy Monitoring',
                            headers: ['Mother Patient', 'Age', 'Pregnancy Stage', 'Expected Due Date', 'Risk Level', 'Next Visit'],
                            rows: maternalRecords.map(m => [
                              m.mother_name ?? '',
                              String(m.age ?? ''),
                              m.pregnancy_status ?? '',
                              m.expected_due_date ?? 'Postnatal',
                              m.risk_level ?? '',
                              m.next_visit ?? 'TBD'
                            ])
                          }
                        ]
                      });
                    }}
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold"
                  >
                    <Printer size={13} /> Print Official Health Report
                  </Button>
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Baby size={16} className="text-blue-600" />
                      Immunization Dataset
                    </CardTitle>
                    <CardDescription className="text-[11px] text-blue-700">All child vaccine records & overdue logs</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-slate-600 mb-3">Total registered child vaccines: <strong>{immunizations.length}</strong> records.</p>
                    <Button
                      onClick={() => {
                        printOfficialReport({
                          title: 'Overdue Vaccine Alert Report',
                          subtitle: `Children with overdue vaccination doses — ${new Date().toLocaleDateString()}`,
                          preparedBy: user?.name || 'BHW Health Worker',
                          preparedByTitle: 'Barangay Health Worker',
                          department: 'Barangay Health Center',
                          stats: [{ label: 'Overdue Cases', value: immunizations.filter(i => i.status === 'Overdue').length, color: '#dc2626' }],
                          tables: [{
                            title: 'Overdue Vaccine Records',
                            headers: ['Child Name', 'Parent Phone', 'Vaccine', 'Days Overdue'],
                            rows: immunizations.filter(i => i.status === 'Overdue').map(i => [i.child_name, i.parent_phone || 'N/A', i.vaccine_name, i.days_overdue || 'N/A'])
                          }]
                        });
                        toast.success('Overdue vaccine report opened as PDF');
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-7 text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      <Download size={12} className="mr-1" /> Export Overdue Vaccine List
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-pink-200 bg-pink-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-pink-900 flex items-center gap-1.5">
                      <Heart size={16} className="text-pink-600" />
                      Maternal Health Registry
                    </CardTitle>
                    <CardDescription className="text-[11px] text-pink-700">Prenatal & postnatal patient monitoring</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-slate-600 mb-3">Active maternal cases: <strong>{maternalRecords.length}</strong> patients.</p>
                    <Button
                      onClick={() => {
                        printOfficialReport({
                          title: 'High-Risk Maternal Patients Report',
                          subtitle: `High & moderate risk pregnancy cases — ${new Date().toLocaleDateString()}`,
                          preparedBy: user?.name || 'BHW Health Worker',
                          preparedByTitle: 'Barangay Health Worker',
                          department: 'Barangay Health Center',
                          stats: [
                            { label: 'High Risk', value: maternalRecords.filter(m => m.risk_level === 'High').length, color: '#dc2626' },
                            { label: 'Moderate Risk', value: maternalRecords.filter(m => m.risk_level === 'Moderate').length, color: '#d97706' }
                          ],
                          tables: [{
                            title: 'High-Risk Maternal Patients',
                            headers: ['Mother', 'Age', 'Status', 'Risk Level', 'Notes'],
                            rows: maternalRecords.filter(m => m.risk_level === 'High' || m.risk_level === 'Moderate').map(m => [m.mother_name ?? '', String(m.age ?? ''), m.pregnancy_status ?? '', m.risk_level ?? '', m.notes ?? ''])
                          }]
                        });
                        toast.success('High-risk maternal report opened as PDF');
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-7 text-pink-700 border-pink-300 hover:bg-pink-100"
                    >
                      <Download size={12} className="mr-1" /> Export High-Risk Patients
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-purple-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <Bell size={16} className="text-purple-600" />
                      SMS Health Dispatch Log
                    </CardTitle>
                    <CardDescription className="text-[11px] text-purple-700">SMS notification history & alerts</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-slate-600 mb-3">Total health alerts dispatched: <strong>{notifications.length}</strong> sent.</p>
                    <Button
                      onClick={() => {
                        printOfficialReport({
                          title: 'SMS Health Dispatch Log Report',
                          subtitle: `Health alert notifications dispatched — ${new Date().toLocaleDateString()}`,
                          preparedBy: user?.name || 'BHW Health Worker',
                          preparedByTitle: 'Barangay Health Worker',
                          department: 'Barangay Health Center',
                          stats: [{ label: 'Total SMS Sent', value: notifications.length, color: '#7c3aed' }],
                          tables: [{
                            title: 'SMS Health Dispatch Log',
                            headers: ['Recipient', 'Phone', 'Type', 'Message', 'Status', 'Sent At'],
                            rows: notifications.map(n => [n.recipient_name, n.recipient_phone, n.type || 'General', (n.message || '').substring(0, 40) + '...', n.status || 'Sent', n.sent_at || 'Recent'])
                          }]
                        });
                        toast.success('SMS dispatch log opened as PDF');
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-7 text-purple-700 border-purple-300 hover:bg-purple-100"
                    >
                      <Download size={12} className="mr-1" /> Export SMS Log (PDF)
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Syringe className="text-blue-600" size={18} />
                      Vaccine Coverage Rates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>BCG Vaccine Coverage</span>
                      <span className="font-bold text-emerald-600">98.5%</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>Hepatitis B Initial Dose</span>
                      <span className="font-bold text-emerald-600">94.2%</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>DPT Booster Compliance</span>
                      <span className="font-bold text-amber-600">89.0%</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span>MMR Vaccine Compliance</span>
                      <span className="font-bold text-amber-600">87.5%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Heart className="text-pink-600" size={18} />
                      Maternal Health Program
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>Active Prenatal Consultations</span>
                      <span className="font-bold font-mono text-pink-600">{maternalRecords.length}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>Postnatal Care Checks</span>
                      <span className="font-bold font-mono text-emerald-600">34</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span>High Risk Pregnancy Monitoring</span>
                      <span className="font-bold font-mono text-red-600">{maternalRecords.filter(m => m.risk_level === 'High').length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Intra-System Messenger (floating, Staff Chat) */}
      <SystemMessenger
        currentUserRole={user?.role === 'superadmin' ? 'superadmin' : 'bhw'}
        currentUserName={user?.name || "BHW Maria Santos"}
        currentUserEmail={user?.email}
        currentUserId={user?.id}
        currentUserBarangay={user?.barangay || (user?.role === 'superadmin' ? 'All (City-Wide)' : 'Pianing')}
      />

      {/* Resident 360° Profile Modal */}
      <ResidentProfileModal
        residentId={selectedResidentId}
        isOpen={profileModalOpen}
        onClose={() => { setProfileModalOpen(false); setSelectedResidentId(null); }}
      />

      {/* Official Document Print & Download Modal */}
      <DocumentPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        document={selectedPrintDoc}
      />

      {/* Document Info / Specifics Viewer Modal */}
      <DocumentInfoModal
        isOpen={isDocInfoOpen}
        onClose={() => setIsDocInfoOpen(false)}
        document={selectedInfoDoc}
        onUpdateStatus={(id, status) => handleUpdateDocStatus(id, status)}
        onPrint={(doc) => openPrintModal(doc)}
        canEdit={true}
      />

      {/* SMS Details & Message Viewer Modal */}
      <SmsDetailsModal
        isOpen={isSmsDetailsOpen}
        onClose={() => setIsSmsDetailsOpen(false)}
        notification={selectedSms}
        onComposeReply={(recipient, phone) => {
          setSmsRecipientName(recipient);
          setSmsPhone(phone);
          setIsSendSmsOpen(true);
        }}
      />
    </div>
  );
}
