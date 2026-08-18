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
  Shield
} from 'lucide-react';
import { apiService, ImmunizationRecord, MaternalRecord, SmsNotification } from '../../services/api';
import DatabaseStatusBadge from '../components/DatabaseStatusBadge';
import SystemMessenger from '../components/SystemMessenger';
import ResidentProfileModal from '../components/ResidentProfileModal';
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
  const [stats, setStats] = useState({
    childrenMonitored: 245,
    maternalRecords: 89,
    vaccinationsMonth: 156,
    overdueImmunizations: 12
  });

  // Resident Profile Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null);

  const openResidentProfile = (id: number) => {
    setSelectedResidentId(id);
    setProfileModalOpen(true);
  };

  // Search
  const [immSearch, setImmSearch] = useState('');
  const [maternalSearch, setMaternalSearch] = useState('');

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
      const [immData, matData, smsData, statsData] = await Promise.all([
        apiService.getImmunizations(),
        apiService.getMaternalRecords(),
        apiService.getNotifications(),
        apiService.getBhwStats()
      ]);
      setImmunizations(immData);
      setMaternalRecords(matData);
      setNotifications(smsData);
      setStats(statsData);
    } catch (err) {
      toast.error('Failed to load health monitoring data');
    } finally {
      setLoading(false);
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
          setIsVisitorMode(true);
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
      setIsVisitorMode(true);
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

  const overdueVaccines = immunizations.filter(i => i.status === 'Overdue');

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'immunization', label: 'Immunization Tracking', icon: Syringe },
    { id: 'maternal', label: 'Maternal Health', icon: Heart },
    { id: 'notifications', label: 'SMS Notifications', icon: Bell },
    { id: 'reports', label: 'Health Reports', icon: BarChart },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
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
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Activity size={20} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Smart Barangay System</h1>
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
            <DatabaseStatusBadge />
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

              <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <Input
                  placeholder="Search child name or vaccine..."
                  value={immSearch}
                  onChange={e => setImmSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
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
                  <DialogTrigger asChild>
                    <Button className="bg-pink-600 hover:bg-pink-700 text-white text-xs gap-1.5 shadow-sm">
                      <PlusCircle size={15} />
                      Add Maternal Record
                    </Button>
                  </DialogTrigger>
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
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">SMS Notification Dispatch</h2>
                  <p className="text-xs text-slate-500">Send timely immunization alerts and maternal health checkup reminders directly to resident mobile phones.</p>
                </div>

                <Dialog open={isSendSmsOpen} onOpenChange={setIsSendSmsOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm">
                      <Send size={15} />
                      Compose SMS Alert
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Send SMS Notification</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSendSms} className="space-y-3 py-2">
                      <div>
                        <Label className="text-xs">Recipient Name</Label>
                        <Input value={smsRecipientName} onChange={e => setSmsRecipientName(e.target.value)} required placeholder="Sofia Martinez" />
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
                          className="w-full border rounded-md p-2 text-xs border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          placeholder="Reminder: Baby Sofia is scheduled for MMR vaccine at Barangay Health Center tomorrow."
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Send SMS</Button>
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
                        <TableHead className="text-xs">Recipient</TableHead>
                        <TableHead className="text-xs">Phone</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Message</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Sent At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.map(n => (
                        <TableRow key={n.id} className="text-xs">
                          <TableCell className="font-semibold text-slate-900">{n.recipient_name}</TableCell>
                          <TableCell className="font-mono text-slate-600">{n.recipient_phone}</TableCell>
                          <TableCell><Badge variant="outline">{n.type}</Badge></TableCell>
                          <TableCell className="text-slate-600 max-w-[250px] truncate">{n.message}</TableCell>
                          <TableCell><Badge className="bg-emerald-600">{n.status}</Badge></TableCell>
                          <TableCell className="font-mono text-slate-400 text-[11px]">{n.sent_at || 'Just now'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 5: HEALTH REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Public Health Reports & Vaccine Coverage</h2>
                <p className="text-xs text-slate-500">Immunization rate analysis and maternal care summaries.</p>
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

      {/* Intra-System Messenger (floating, BHW role) */}
      <SystemMessenger currentUserRole={user?.role === 'superadmin' ? 'superadmin' : 'bhw'} currentUserName={user?.name || "BHW Maria Santos"} />

      {/* Resident 360° Profile Modal */}
      <ResidentProfileModal
        residentId={selectedResidentId}
        isOpen={profileModalOpen}
        onClose={() => { setProfileModalOpen(false); setSelectedResidentId(null); }}
      />
    </div>
  );
}
