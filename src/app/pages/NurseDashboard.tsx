import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Stethoscope,
  Heart,
  Baby,
  Activity,
  CalendarCheck,
  CalendarPlus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  FileText,
  Printer,
  RefreshCcw,
  Search,
  Users,
  Shield,
  LogOut,
  MapPin,
  Pill,
  Syringe,
  Thermometer,
  Calendar,
  Check,
  X,
  Menu,
  Sparkles,
  Download,
  Phone,
  Settings,
  ChevronRight,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import {
  apiService,
  ImmunizationRecord,
  MaternalRecord,
  HealthAppointment,
  ClinicSchedule,
  Resident
} from '../../services/api';
import SuperAdminNavigationDock from '../components/SuperAdminNavigationDock';
import { exportToCsv, printOfficialReport } from '../../utils/exportCsv';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

interface ClinicalConsultation {
  id: number | string;
  patient_name: string;
  age: number | string;
  gender: string;
  barangay: string;
  service_type: string;
  bp: string;
  temp: string;
  weight: string;
  heart_rate: string;
  chief_complaint: string;
  diagnosis: string;
  treatment: string;
  attending_nurse: string;
  consultation_date: string;
}

export default function NurseDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'consultations' | 'maternal' | 'immunizations' | 'appointments' | 'inventory' | 'reports'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  // User session
  const [user, setUser] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('barangay_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const nurseBarangay = user?.barangay || 'Pianing';

  // Dynamic Data States
  const [appointments, setAppointments] = useState<HealthAppointment[]>([]);
  const [clinicSchedules, setClinicSchedules] = useState<ClinicSchedule[]>([]);
  const [maternalRecords, setMaternalRecords] = useState<MaternalRecord[]>([]);
  const [immunizations, setImmunizations] = useState<ImmunizationRecord[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);

  // Clinical Consultations / Triage State
  const [consultations, setConsultations] = useState<ClinicalConsultation[]>([
    {
      id: 1,
      patient_name: 'Elena Ramos-Santos',
      age: 28,
      gender: 'Female',
      barangay: 'Pianing',
      service_type: 'Prenatal Care & Maternal Triage',
      bp: '118/76 mmHg',
      temp: '36.5 °C',
      weight: '56.4 kg',
      heart_rate: '78 bpm',
      chief_complaint: 'Routine 2nd Trimester follow-up checkup',
      diagnosis: 'Intrauterine Pregnancy at 22 Weeks, Normal Condition',
      treatment: 'Prescribed Ferrous Sulfate 60mg + Folic Acid 400mcg daily. Advised iron-rich diet & adequate hydration.',
      attending_nurse: user?.name || 'Nurse Maria Santos, RN',
      consultation_date: new Date().toISOString().split('T')[0]
    },
    {
      id: 2,
      patient_name: 'Baby Liam Kenneth Diaz',
      age: '6 mos',
      gender: 'Male',
      barangay: 'Pianing',
      service_type: 'EPI Infant Immunization',
      bp: 'N/A',
      temp: '36.6 °C',
      weight: '7.8 kg',
      heart_rate: '110 bpm',
      chief_complaint: 'Scheduled Pentavalent Dose 3 & PCV Dose 3',
      diagnosis: 'Well Infant, cleared for DOH routine immunization',
      treatment: 'Administered Pentavalent-3 (0.5 mL IM) and PCV-3 (0.5 mL IM). Paracetamol drops prescribed for post-vaccine fever PRN.',
      attending_nurse: user?.name || 'Nurse Maria Santos, RN',
      consultation_date: new Date().toISOString().split('T')[0]
    },
    {
      id: 3,
      patient_name: 'Roberto Manalo',
      age: 58,
      gender: 'Male',
      barangay: 'Pianing',
      service_type: 'General Medical Consultation',
      bp: '135/85 mmHg',
      temp: '36.7 °C',
      weight: '68.0 kg',
      heart_rate: '82 bpm',
      chief_complaint: 'Mild headache, BP monitoring',
      diagnosis: 'Stage 1 Hypertension, well-controlled',
      treatment: 'Lifestyle modification, low sodium diet advised. Continue maintenance Amlodipine 5mg OD.',
      attending_nurse: user?.name || 'Nurse Maria Santos, RN',
      consultation_date: new Date().toISOString().split('T')[0]
    }
  ]);

  // Modals State
  const [isNewConsultOpen, setIsNewConsultOpen] = useState(false);
  const [isNewMaternalOpen, setIsNewMaternalOpen] = useState(false);
  const [isNewImmunizationOpen, setIsNewImmunizationOpen] = useState(false);
  const [isScheduleAppointmentOpen, setIsScheduleAppointmentOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<HealthAppointment | null>(null);

  // New Consultation Form
  const [consultPatientName, setConsultPatientName] = useState('');
  const [consultAge, setConsultAge] = useState('');
  const [consultGender, setConsultGender] = useState<'Male' | 'Female'>('Female');
  const [consultService, setConsultService] = useState('General Consultation');
  const [consultBp, setConsultBp] = useState('120/80');
  const [consultTemp, setConsultTemp] = useState('36.5');
  const [consultWeight, setConsultWeight] = useState('');
  const [consultHeartRate, setConsultHeartRate] = useState('75');
  const [consultComplaint, setConsultComplaint] = useState('');
  const [consultDiagnosis, setConsultDiagnosis] = useState('');
  const [consultTreatment, setConsultTreatment] = useState('');

  // Medical Inventory Mock
  const [inventory, setInventory] = useState([
    { id: 1, item_name: 'Pentavalent Vaccine (DPT-HepB-Hib)', category: 'Vaccine (EPI)', stock: 45, unit: 'vials', cold_chain: '4.2 °C (Optimal)', status: 'In Stock' },
    { id: 2, item_name: 'PCV 13 (Pneumococcal Conjugate)', category: 'Vaccine (EPI)', stock: 32, unit: 'vials', cold_chain: '4.1 °C (Optimal)', status: 'In Stock' },
    { id: 3, item_name: 'Measles-Rubella (MR) Vaccine', category: 'Vaccine (EPI)', stock: 28, unit: 'vials', cold_chain: '3.9 °C (Optimal)', status: 'In Stock' },
    { id: 4, item_name: 'Ferrous Sulfate + Folic Acid Tablets', category: 'Maternal Vitamin', stock: 1200, unit: 'tablets', cold_chain: 'Room Temp', status: 'In Stock' },
    { id: 5, item_name: 'Calcium Carbonate 500mg', category: 'Maternal Vitamin', stock: 850, unit: 'tablets', cold_chain: 'Room Temp', status: 'In Stock' },
    { id: 6, item_name: 'Paracetamol 500mg / Oral Drops', category: 'Essential Medicine', stock: 600, unit: 'units', cold_chain: 'Room Temp', status: 'In Stock' },
    { id: 7, item_name: 'Oral Rehydration Salts (ORS)', category: 'Pediatric Supply', stock: 350, unit: 'packets', cold_chain: 'Room Temp', status: 'In Stock' }
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apts, scheds, mat, imm, res] = await Promise.all([
        apiService.getAppointments({ barangay: nurseBarangay }).catch(() => []),
        apiService.getClinicSchedules(nurseBarangay).catch(() => []),
        apiService.getMaternalRecords().catch(() => []),
        apiService.getImmunizations().catch(() => []),
        apiService.getResidents(nurseBarangay).catch(() => [])
      ]);
      setAppointments(apts);
      setClinicSchedules(scheds);
      setMaternalRecords(mat);
      setImmunizations(imm);
      setResidents(res);
    } catch {
      toast.error('Failed to refresh clinical health records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultPatientName.trim()) {
      toast.error('Patient Name is required');
      return;
    }

    const newRecord: ClinicalConsultation = {
      id: Date.now(),
      patient_name: consultPatientName.trim(),
      age: consultAge || '—',
      gender: consultGender,
      barangay: nurseBarangay,
      service_type: consultService,
      bp: consultBp ? `${consultBp} mmHg` : 'N/A',
      temp: consultTemp ? `${consultTemp} °C` : 'N/A',
      weight: consultWeight ? `${consultWeight} kg` : 'N/A',
      heart_rate: consultHeartRate ? `${consultHeartRate} bpm` : 'N/A',
      chief_complaint: consultComplaint || 'Routine Health Visit',
      diagnosis: consultDiagnosis || 'Clinical Assessment Complete',
      treatment: consultTreatment || 'Health counseling and monitoring advised.',
      attending_nurse: user?.name || 'Nurse Maria Santos, RN',
      consultation_date: new Date().toISOString().split('T')[0]
    };

    setConsultations(prev => [newRecord, ...prev]);
    toast.success('Clinical Consultation recorded successfully!');
    setIsNewConsultOpen(false);

    // Reset Form
    setConsultPatientName('');
    setConsultAge('');
    setConsultComplaint('');
    setConsultDiagnosis('');
    setConsultTreatment('');
  };

  const handleApproveAppointment = async (appt: HealthAppointment) => {
    try {
      await apiService.updateAppointment(appt.id, {
        status: 'Approved',
        attending_bhw: user?.name || 'Nurse Maria Santos, RN',
        bhw_notes: 'Confirmed by Attending Nurse. Please arrive on time with your Health Card / Pink Book.'
      });
      toast.success(`Appointment for ${appt.resident_name} approved!`);
      loadData();
    } catch {
      toast.error('Failed to approve appointment');
    }
  };

  const handleCompleteAppointment = async (appt: HealthAppointment) => {
    try {
      await apiService.updateAppointment(appt.id, {
        status: 'Completed',
        attending_bhw: user?.name || 'Nurse Maria Santos, RN',
        bhw_notes: 'Consultation completed successfully. Follow-up scheduled if necessary.'
      });
      toast.success(`Appointment for ${appt.resident_name} marked Completed!`);
      loadData();
    } catch {
      toast.error('Failed to complete appointment');
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Clinical Overview', icon: Activity },
    { id: 'consultations', label: 'Patient Triage & Consultations', icon: Stethoscope },
    { id: 'maternal', label: 'Maternal & Prenatal Care', icon: Heart },
    { id: 'immunizations', label: 'EPI Child Immunizations', icon: Baby },
    { id: 'appointments', label: 'Clinic Schedule & Appointments', icon: CalendarCheck },
    { id: 'inventory', label: 'Vaccines & Medicine Supply', icon: Pill },
    { id: 'reports', label: 'Clinical Health Reports', icon: BarChart2 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Super Admin Ecosystem Dock */}
      <SuperAdminNavigationDock currentRole={user?.role} />

      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-teal-50 border border-teal-200 flex items-center justify-center shadow-xs">
                <Stethoscope size={22} className="text-teal-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold text-slate-900 leading-tight">Barangay Pianing</h1>
                  <Badge className="bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.2">
                    Nurse Portal
                  </Badge>
                </div>
                <span className="text-xs text-teal-700 font-semibold">Primary Health Center Clinical Management</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              Attending Nurse: <strong>{user?.name || 'Nurse Maria Santos, RN'}</strong>
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="flex items-center gap-1.5 text-xs text-slate-600 border-slate-200 cursor-pointer"
            >
              <RefreshCcw size={14} className={loading ? 'animate-spin text-teal-600' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                localStorage.removeItem('barangay_user');
                toast.info('Logged out of Nurse Portal');
                navigate('/login');
              }}
              className="flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700 cursor-pointer"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar Navigation */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col py-4 shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto`}>
          <nav className="flex-1 px-3 space-y-1.5">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-teal-700 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className="shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </div>
                {sidebarOpen && item.id === 'appointments' && appointments.filter(a => a.status === 'Pending').length > 0 && (
                  <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 h-4 border-0 font-bold">
                    {appointments.filter(a => a.status === 'Pending').length}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 1: CLINICAL OVERVIEW */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Stethoscope className="text-teal-700" size={24} />
                    Barangay {nurseBarangay} Health Center Clinical Command
                  </h2>
                  <p className="text-xs text-slate-500">Clinical triage, maternal health monitoring, child vaccination tracking, and patient encounters.</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsNewConsultOpen(true)}
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
                  >
                    <PlusCircle size={15} />
                    Record Patient Consultation
                  </Button>
                </div>
              </div>

              {/* Health Metrics Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-teal-600 bg-white shadow-xs">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Patient Consultations</p>
                        <h3 className="text-3xl font-black text-slate-900 mt-1">{consultations.length}</h3>
                        <p className="text-[11px] text-teal-700 font-medium mt-1">Recorded encounters</p>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                        <Stethoscope size={22} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-rose-500 bg-white shadow-xs">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Maternal / Prenatal</p>
                        <h3 className="text-3xl font-black text-slate-900 mt-1">{maternalRecords.length || 89}</h3>
                        <p className="text-[11px] text-rose-600 font-medium mt-1">Expectant mothers tracked</p>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <Heart size={22} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 bg-white shadow-xs">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">EPI Immunizations</p>
                        <h3 className="text-3xl font-black text-slate-900 mt-1">{immunizations.length || 156}</h3>
                        <p className="text-[11px] text-blue-600 font-medium mt-1">Infants vaccinated</p>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Baby size={22} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500 bg-white shadow-xs">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Pending Appointments</p>
                        <h3 className="text-3xl font-black text-slate-900 mt-1">
                          {appointments.filter(a => a.status === 'Pending').length}
                        </h3>
                        <p className="text-[11px] text-amber-600 font-medium mt-1">Awaiting confirmation</p>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock size={22} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Consultations Table */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Activity className="text-teal-700" size={18} />
                      Recent Clinical Patient Consultations &amp; Vitals
                    </CardTitle>
                    <CardDescription className="text-xs">Patient diagnostic notes and vital signs recorded at Barangay Health Center</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('consultations')} className="text-teal-700 text-xs font-semibold">
                    View All Consultations →
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Patient Name</TableHead>
                        <TableHead className="text-xs">Service Type</TableHead>
                        <TableHead className="text-xs">Vital Signs (BP / Temp / Wt)</TableHead>
                        <TableHead className="text-xs">Clinical Diagnosis</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consultations.slice(0, 5).map((c, idx) => (
                        <TableRow key={`ov-c-${c.id}-${idx}`} className="text-xs hover:bg-slate-50/70">
                          <TableCell>
                            <div>
                              <strong className="text-slate-900 block">{c.patient_name}</strong>
                              <span className="text-[11px] text-slate-400">{c.age} yrs • {c.gender}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-800 border-teal-200">
                              {c.service_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-[11px] text-slate-700">
                            {c.bp} • {c.temp} • {c.weight}
                          </TableCell>
                          <TableCell className="text-slate-800 font-medium max-w-xs truncate">
                            {c.diagnosis}
                          </TableCell>
                          <TableCell className="text-slate-500 font-mono text-[11px]">
                            {c.consultation_date}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 2: PATIENT TRIAGE & CONSULTATIONS */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'consultations' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Stethoscope className="text-teal-700" size={22} />
                    Clinical Patient Triage &amp; Encounters
                  </h2>
                  <p className="text-xs text-slate-500">Record patient vital signs, chief complaints, nursing assessment, and prescribe treatment/medication.</p>
                </div>
                <Button
                  onClick={() => setIsNewConsultOpen(true)}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
                >
                  <PlusCircle size={15} />
                  New Patient Consultation
                </Button>
              </div>

              <Card className="border-slate-200 bg-white shadow-xs">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Patient</TableHead>
                        <TableHead className="text-xs">Program</TableHead>
                        <TableHead className="text-xs">Vital Signs</TableHead>
                        <TableHead className="text-xs">Chief Complaint</TableHead>
                        <TableHead className="text-xs">Diagnosis &amp; Care Plan</TableHead>
                        <TableHead className="text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consultations.map((c, idx) => (
                        <TableRow key={`consult-${c.id}-${idx}`} className="text-xs">
                          <TableCell>
                            <div>
                              <strong className="text-slate-900 text-xs block">{c.patient_name}</strong>
                              <span className="text-[11px] text-slate-500">{c.age} yrs • {c.gender}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-teal-700 text-white text-[10px] font-medium">
                              {c.service_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-[11px] space-y-0.5">
                            <p className="text-slate-800">BP: <strong>{c.bp}</strong></p>
                            <p className="text-slate-500 text-[10px]">Temp: {c.temp} | Wt: {c.weight}</p>
                          </TableCell>
                          <TableCell className="text-slate-600 max-w-xs">
                            {c.chief_complaint}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <strong className="text-slate-900 block">{c.diagnosis}</strong>
                            <p className="text-[11px] text-slate-500 mt-0.5">{c.treatment}</p>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                printOfficialReport({
                                  title: 'Official Clinical Patient Record',
                                  subtitle: `Consultation on ${c.consultation_date} — Barangay Pianing Health Center`,
                                  preparedBy: c.attending_nurse,
                                  preparedByTitle: 'Attending Registered Nurse',
                                  stats: [
                                    { label: 'Patient Name', value: c.patient_name, color: '#0d9488' },
                                    { label: 'Blood Pressure', value: c.bp, color: '#0284c7' },
                                    { label: 'Temperature', value: c.temp, color: '#ea580c' }
                                  ],
                                  tables: [{
                                    title: 'Clinical Assessment & Treatment Plan',
                                    headers: ['Parameter', 'Details'],
                                    rows: [
                                      ['Service Program', c.service_type],
                                      ['Chief Complaint', c.chief_complaint],
                                      ['Diagnosis', c.diagnosis],
                                      ['Treatment & Prescriptions', c.treatment],
                                      ['Attending Provider', c.attending_nurse]
                                    ]
                                  }]
                                });
                              }}
                              className="h-7 text-[11px] gap-1 cursor-pointer"
                            >
                              <Printer size={12} />
                              Print
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 3: MATERNAL & PRENATAL CARE */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'maternal' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Heart className="text-rose-600" size={22} />
                    Maternal Health &amp; Prenatal Revisit Tracking
                  </h2>
                  <p className="text-xs text-slate-500">Monitor trimester progress, Expected Due Dates (EDD), and high-risk pregnancy alerts.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                  <span className="text-xs font-bold text-rose-900 block">Total Monitored Pregnancies</span>
                  <p className="text-2xl font-black text-rose-950 mt-1">{maternalRecords.length || 42}</p>
                </Card>
                <Card className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <span className="text-xs font-bold text-amber-900 block">3rd Trimester (Near Term)</span>
                  <p className="text-2xl font-black text-amber-950 mt-1">14</p>
                </Card>
                <Card className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-xs font-bold text-emerald-900 block">Prenatal Vitamins Dispensed</span>
                  <p className="text-2xl font-black text-emerald-950 mt-1">100%</p>
                </Card>
              </div>

              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Maternal Clinical Records</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Mother's Name</TableHead>
                        <TableHead className="text-xs">Age</TableHead>
                        <TableHead className="text-xs">Pregnancy Status</TableHead>
                        <TableHead className="text-xs">Expected Due Date</TableHead>
                        <TableHead className="text-xs">Last Checkup</TableHead>
                        <TableHead className="text-xs">Next Scheduled Revisit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {maternalRecords.slice(0, 10).map((m, idx) => (
                        <TableRow key={`mat-${m.id}-${idx}`} className="text-xs">
                          <TableCell className="font-semibold text-slate-900">{m.mother_name}</TableCell>
                          <TableCell>{m.age} yrs</TableCell>
                          <TableCell>
                            <Badge className="bg-rose-600 text-white text-[10px]">{m.pregnancy_status}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-[11px] text-slate-700">{m.expected_due_date || 'TBA'}</TableCell>
                          <TableCell className="font-mono text-[11px] text-slate-500">{m.last_visit}</TableCell>
                          <TableCell className="font-mono text-[11px] text-emerald-700 font-bold">{m.next_visit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 4: EPI CHILD IMMUNIZATIONS */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'immunizations' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Baby className="text-blue-600" size={22} />
                    EPI Infant &amp; Child Immunization Registry
                  </h2>
                  <p className="text-xs text-slate-500">Track routine DOH pediatric vaccines: BCG, Hepatitis B, Pentavalent, OPV/IPV, PCV, and MMR.</p>
                </div>
              </div>

              <Card className="border-slate-200 bg-white shadow-xs">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Child Name</TableHead>
                        <TableHead className="text-xs">Vaccine Type</TableHead>
                        <TableHead className="text-xs">Dose #</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Administered Date</TableHead>
                        <TableHead className="text-xs">Next Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {immunizations.slice(0, 10).map((imm, idx) => (
                        <TableRow key={`imm-${imm.id}-${idx}`} className="text-xs">
                          <TableCell className="font-semibold text-slate-900">{imm.child_name}</TableCell>
                          <TableCell>{imm.vaccine_name}</TableCell>
                          <TableCell className="font-mono font-bold">Dose {imm.dose_number}</TableCell>
                          <TableCell>
                            <Badge className={imm.status === 'Completed' ? 'bg-emerald-600' : 'bg-amber-500'}>
                              {imm.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-slate-500">{imm.date_administered || '—'}</TableCell>
                          <TableCell className="font-mono text-blue-700 font-bold">{imm.due_date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 5: APPOINTMENTS & CLINIC SCHEDULES */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <CalendarCheck className="text-teal-700" size={22} />
                    Health Center Appointments &amp; Weekly Schedules
                  </h2>
                  <p className="text-xs text-slate-500">Manage resident appointment bookings and approve clinic consultations.</p>
                </div>
              </div>

              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Incoming Resident Health Appointments</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Ref Code</TableHead>
                        <TableHead className="text-xs">Resident Name</TableHead>
                        <TableHead className="text-xs">Service</TableHead>
                        <TableHead className="text-xs">Preferred Date &amp; Time</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Nurse Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-xs py-10 text-slate-400">
                            No appointments registered yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        appointments.map((a, idx) => (
                          <TableRow key={`appt-${a.id}-${idx}`} className="text-xs">
                            <TableCell className="font-mono font-bold text-teal-700">{a.appointment_code}</TableCell>
                            <TableCell className="font-semibold text-slate-900">{a.resident_name}</TableCell>
                            <TableCell>{a.service_type}</TableCell>
                            <TableCell className="font-mono text-slate-600">{a.preferred_date} • {a.preferred_time}</TableCell>
                            <TableCell>
                              <Badge className={a.status === 'Completed' ? 'bg-emerald-600' : a.status === 'Approved' ? 'bg-blue-600' : 'bg-amber-500'}>
                                {a.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              {a.status === 'Pending' && (
                                <Button size="sm" onClick={() => handleApproveAppointment(a)} className="h-7 text-[11px] bg-teal-700 hover:bg-teal-800 text-white cursor-pointer">
                                  Approve
                                </Button>
                              )}
                              {a.status === 'Approved' && (
                                <Button size="sm" onClick={() => handleCompleteAppointment(a)} className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                                  Mark Completed
                                </Button>
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
          {/* TAB 6: MEDICAL INVENTORY */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Pill className="text-teal-700" size={22} />
                  Medical Supplies &amp; Vaccine Cold Chain Monitor
                </h2>
                <p className="text-xs text-slate-500">Live inventory of EPI vaccines, maternal micronutrients, and cold chain temperature regulation.</p>
              </div>

              <Card className="border-slate-200 bg-white shadow-xs">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Item Name</TableHead>
                        <TableHead className="text-xs">Category</TableHead>
                        <TableHead className="text-xs">Available Stock</TableHead>
                        <TableHead className="text-xs">Storage Temp / Cold Chain</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item, idx) => (
                        <TableRow key={`inv-${item.id}-${idx}`} className="text-xs">
                          <TableCell className="font-semibold text-slate-900">{item.item_name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell className="font-mono font-bold">{item.stock} {item.unit}</TableCell>
                          <TableCell className="font-mono text-teal-800 font-semibold">{item.cold_chain}</TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-600 text-white text-[10px]">{item.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 7: REPORTS */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <BarChart2 className="text-teal-700" size={22} />
                  Primary Health Center Official Reports
                </h2>
                <p className="text-xs text-slate-500">Official epidemiological, maternal, and immunization statistical export center.</p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    printOfficialReport({
                      title: 'Primary Health Center Clinical Encounter Log',
                      subtitle: `Official Nurse Clinical Summary — Barangay Pianing, Butuan City`,
                      preparedBy: user?.name || 'Nurse Maria Santos, RN',
                      preparedByTitle: 'Attending Registered Nurse',
                      stats: [
                        { label: 'Total Consultations', value: consultations.length, color: '#0d9488' },
                        { label: 'Maternal Patients', value: maternalRecords.length || 42, color: '#e11d48' },
                        { label: 'Vaccinations', value: immunizations.length || 156, color: '#2563eb' }
                      ],
                      tables: [{
                        title: 'Clinical Patient Records',
                        headers: ['Patient Name', 'Service', 'Vitals', 'Diagnosis', 'Date'],
                        rows: consultations.map(c => [c.patient_name, c.service_type, `${c.bp} | ${c.temp}`, c.diagnosis, c.consultation_date])
                      }]
                    });
                  }}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer size={14} />
                  Print Official Health Center Report
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL: NEW CLINICAL CONSULTATION */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isNewConsultOpen} onOpenChange={setIsNewConsultOpen}>
        <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold">
              <Stethoscope className="text-teal-700" size={20} />
              Record Clinical Patient Encounter &amp; Vitals
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter patient diagnostic vitals, assessment findings, and treatment plan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateConsultation} className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Patient Full Name <span className="text-red-500">*</span></Label>
              <Input
                value={consultPatientName}
                onChange={e => setConsultPatientName(e.target.value)}
                placeholder="e.g. Maria Santos"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Age</Label>
                <Input value={consultAge} onChange={e => setConsultAge(e.target.value)} placeholder="e.g. 28" className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Gender</Label>
                <Select value={consultGender} onValueChange={(v: any) => setConsultGender(v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Service</Label>
                <Select value={consultService} onValueChange={setConsultService}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General Consultation">General Checkup</SelectItem>
                    <SelectItem value="Prenatal Care">Prenatal Care</SelectItem>
                    <SelectItem value="Child Immunization">Immunization</SelectItem>
                    <SelectItem value="Family Planning">Family Planning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Vital Signs Grid */}
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-teal-900 block">Patient Vital Signs (Triage)</span>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-[10px] text-teal-800">BP (mmHg)</Label>
                  <Input value={consultBp} onChange={e => setConsultBp(e.target.value)} placeholder="120/80" className="h-8 text-xs font-mono bg-white" />
                </div>
                <div>
                  <Label className="text-[10px] text-teal-800">Temp (°C)</Label>
                  <Input value={consultTemp} onChange={e => setConsultTemp(e.target.value)} placeholder="36.5" className="h-8 text-xs font-mono bg-white" />
                </div>
                <div>
                  <Label className="text-[10px] text-teal-800">Weight (kg)</Label>
                  <Input value={consultWeight} onChange={e => setConsultWeight(e.target.value)} placeholder="54" className="h-8 text-xs font-mono bg-white" />
                </div>
                <div>
                  <Label className="text-[10px] text-teal-800">Heart Rate</Label>
                  <Input value={consultHeartRate} onChange={e => setConsultHeartRate(e.target.value)} placeholder="76" className="h-8 text-xs font-mono bg-white" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Chief Complaint / Symptoms</Label>
              <Input value={consultComplaint} onChange={e => setConsultComplaint(e.target.value)} placeholder="e.g. Mild fever, headache for 2 days" className="h-9 text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Clinical Diagnosis / Nursing Assessment</Label>
              <Input value={consultDiagnosis} onChange={e => setConsultDiagnosis(e.target.value)} placeholder="e.g. Upper Respiratory Tract Infection (URTI)" className="h-9 text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Treatment Plan / Prescription Dispensed</Label>
              <textarea
                value={consultTreatment}
                onChange={e => setConsultTreatment(e.target.value)}
                placeholder="e.g. Paracetamol 500mg q4h PRN, oral hydration, warm compress..."
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewConsultOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold gap-1 shadow-sm">
                <Check size={14} />
                Save Consultation Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
