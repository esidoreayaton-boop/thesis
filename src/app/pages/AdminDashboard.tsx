import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  FileText,
  Users,
  FolderOpen,
  BarChart,
  LogOut,
  Search,
  CheckCircle,
  Clock,
  Shield,
  Heart,
  UserPlus,
  PlusCircle,
  Trash2,
  Home,
  Menu,
  X,
  Filter,
  Check,
  RefreshCcw,
  Activity,
  AlertCircle,
  Printer,
  Download,
  UserCheck,
  Eye,
  AlertTriangle,
  Tag,
  Archive,
  InboxIcon,
  Settings,
  Sliders,
  Database
} from 'lucide-react';
import { apiService, DocumentRequest, Resident, SystemUser } from '../../services/api';
import SystemMessenger from '../components/SystemMessenger';
import ResidentProfileModal from '../components/ResidentProfileModal';
import DocumentPrintModal from '../components/DocumentPrintModal';
import DocumentInfoModal from '../components/DocumentInfoModal';
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  // User session state
  const [user, setUser] = useState<any>(null);
  const [isVisitorMode, setIsVisitorMode] = useState(false);

  // Dynamic Data States
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [pendingResidents, setPendingResidents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    pendingDocs: 0,
    processedToday: 0,
    totalResidents: 0,
    activeRecords: 0
  });

  // Resident Profile Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null);

  const openResidentProfile = (id: number) => {
    setSelectedResidentId(id);
    setProfileModalOpen(true);
  };

  // Print Document Certificate Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedPrintDoc, setSelectedPrintDoc] = useState<DocumentRequest | null>(null);

  // Submitted ID Photo Preview Modal State
  const [selectedIdPreview, setSelectedIdPreview] = useState<string | null>(null);

  // Document Info / Details Modal State
  const [selectedInfoDoc, setSelectedInfoDoc] = useState<DocumentRequest | null>(null);
  const [isDocInfoOpen, setIsDocInfoOpen] = useState(false);

  const openDocInfo = (doc: DocumentRequest) => {
    setSelectedInfoDoc(doc);
    setIsDocInfoOpen(true);
  };

  const openPrintModal = (doc: DocumentRequest) => {
    setSelectedPrintDoc(doc);
    setPrintModalOpen(true);
  };

  // Search & Filter
  const [docSearch, setDocSearch] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState('all');
  const [residentSearch, setResidentSearch] = useState('');

  // Modals state
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [isAddResidentOpen, setIsAddResidentOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Form states
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('Barangay Clearance');
  const [newDocPurpose, setNewDocPurpose] = useState('');

  const [newResFirstName, setNewResFirstName] = useState('');
  const [newResLastName, setNewResLastName] = useState('');
  const [newResGender, setNewResGender] = useState<'Male' | 'Female'>('Male');
  const [newResAddress, setNewResAddress] = useState('');
  const [newResHousehold, setNewResHousehold] = useState('HH-006');
  const [newResPhone, setNewResPhone] = useState('');

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('123');
  const [newUserRole, setNewUserRole] = useState<'superadmin' | 'admin' | 'staff' | 'bhw' | 'resident'>('staff');

  // Category Management (Super Admin only)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'barangay' | 'health'>('barangay');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [categories, setCategories] = useState([
    { id: 1, name: 'Barangay Clearance', type: 'barangay', desc: 'Clearance for general purposes', active: true },
    { id: 2, name: 'Certificate of Residency', type: 'barangay', desc: 'Proof of residency', active: true },
    { id: 3, name: 'Business Permit', type: 'barangay', desc: 'Permit for sari-sari stores and businesses', active: true },
    { id: 4, name: 'Barangay ID', type: 'barangay', desc: 'Official Barangay Identification Card', active: true },
    { id: 5, name: 'Certificate of Indigency', type: 'barangay', desc: 'For low-income families', active: true },
    { id: 6, name: 'Medical Certificate', type: 'health', desc: 'General health certificate issued by health center', active: true },
    { id: 7, name: 'Immunization Card', type: 'health', desc: 'Child immunization record and card', active: true },
    { id: 8, name: 'Health Clearance', type: 'health', desc: 'Health status clearance for employment/school', active: true },
  ]);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [docsData, resData, usersData, statsData, pendingData] = await Promise.all([
        apiService.getDocuments(),
        apiService.getResidents(),
        apiService.getUsers(),
        apiService.getAdminStats(),
        apiService.getPendingResidents()
      ]);
      setDocuments(docsData);
      setResidents(resData);
      setUsers(usersData);
      setStats(statsData);
      setPendingResidents(pendingData || []);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('barangay_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        if (parsed.role === 'resident') {
          toast.error('Access Denied', {
            description: 'Resident accounts cannot access the Barangay Admin Portal.'
          });
          navigate('/resident');
          return;
        } else if (parsed.role !== 'admin' && parsed.role !== 'superadmin' && parsed.role !== 'staff') {
          toast.error('Access Denied', {
            description: 'You do not have administrative permission to view this portal.'
          });
          navigate('/login');
          return;
        }
      } catch (e) {}
    } else {
      toast.error('Authentication Required', {
        description: 'Please sign in with your administrative account.'
      });
      navigate('/login');
      return;
    }
    loadData();
  }, []);

  // Handlers
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;
    try {
      const created = await apiService.createDocument({
        resident_name: newDocName,
        document_type: newDocType,
        purpose: newDocPurpose || 'General Request'
      });
      setDocuments([created, ...documents]);
      setStats(prev => ({ ...prev, pendingDocs: prev.pendingDocs + 1, activeRecords: prev.activeRecords + 1 }));
      toast.success('Document request created successfully', {
        description: `Request Code: ${created.request_code}`
      });
      setIsAddDocOpen(false);
      setNewDocName('');
      setNewDocPurpose('');
    } catch (err) {
      toast.error('Could not create document request');
    }
  };

  const handleUpdateDocStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Pending' ? 'Processing' : 'Completed';
    const targetDoc = documents.find(d => d.id === id);
    const resName = targetDoc?.resident_name || 'Resident';

    try {
      await apiService.updateDocumentStatus(id, nextStatus, user?.name || 'Admin Juan');
      setDocuments(documents.map(d => d.id === id ? { ...d, status: nextStatus, processed_at: new Date().toLocaleTimeString(), processed_by: user?.name || 'Admin Juan' } : d));
      
      if (nextStatus === 'Completed') {
        toast.success(`Document Approved & Ready for Pickup!`, {
          description: `📲 Auto-SMS sent to ${resName}: "Your document is approved & ready for release at the Barangay Hall."`
        });
      } else {
        toast.info(`Document status set to ${nextStatus}`, {
          description: `📲 Auto-SMS sent to ${resName}: "Your document is now being processed."`
        });
      }
      loadData();
    } catch (err) {
      toast.error('Failed to update document status');
    }
  };

  const handleDeleteDoc = async (id: number) => {
    try {
      await apiService.deleteDocument(id);
      setDocuments(documents.filter(d => d.id !== id));
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleApproveResident = async (id: number) => {
    try {
      await apiService.approveResident(id, user?.name || 'Admin Juan');
      toast.success('Resident application approved! Account is now Verified.');
      loadData();
    } catch (err) {
      toast.error('Failed to approve resident');
    }
  };

  const handleRejectResident = async (id: number) => {
    try {
      await apiService.rejectResident(id);
      toast.warning('Resident application rejected.');
      loadData();
    } catch (err) {
      toast.error('Failed to reject resident');
    }
  };

  const handleCreateResident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResFirstName || !newResLastName) return;
    try {
      const created = await apiService.createResident({
        first_name: newResFirstName,
        last_name: newResLastName,
        date_of_birth: '1990-01-01',
        gender: newResGender,
        address: newResAddress || 'Purok 1, Barangay Pianing, Butuan City',
        household_id: newResHousehold,
        phone: newResPhone || '09170000000'
      });
      setResidents([created, ...residents]);
      setStats(prev => ({ ...prev, totalResidents: prev.totalResidents + 1 }));
      toast.success('Resident registered successfully');
      setIsAddResidentOpen(false);
      setNewResFirstName('');
      setNewResLastName('');
      setNewResAddress('');
    } catch (err) {
      toast.error('Could not register resident');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;
    try {
      const created = await apiService.createUser({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        status: 'Active'
      });
      setUsers([...users, created]);
      toast.success('System account created');
      setIsAddUserOpen(false);
      setNewUserName('');
      setNewUserEmail('');
    } catch (err) {
      toast.error('Failed to add user account');
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await apiService.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      toast.success('User account removed');
    } catch (err) {
      toast.error('Remove failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('barangay_user');
    toast.info('Logged out of Admin Portal');
    navigate('/login');
  };

  // Filtered lists — Documents tab shows ONLY active (untouched/in-progress) requests
  const activeDocuments = documents.filter(doc => doc.status === 'Pending' || doc.status === 'Processing');
  const filteredDocuments = activeDocuments.filter(doc => {
    const matchesSearch = doc.resident_name.toLowerCase().includes(docSearch.toLowerCase()) ||
                          doc.request_code.toLowerCase().includes(docSearch.toLowerCase()) ||
                          doc.document_type.toLowerCase().includes(docSearch.toLowerCase());
    return matchesSearch;
  });

  // Archive lists — processed/completed records that moved out of the active queue
  const [archiveDocSearch, setArchiveDocSearch] = useState('');
  const [archiveDocTypeFilter, setArchiveDocTypeFilter] = useState('all');
  const archivedDocuments = documents.filter(doc => doc.status === 'Completed');
  const filteredArchivedDocs = archivedDocuments.filter(doc => {
    const matchesSearch = doc.resident_name.toLowerCase().includes(archiveDocSearch.toLowerCase()) ||
                          doc.request_code.toLowerCase().includes(archiveDocSearch.toLowerCase()) ||
                          doc.document_type.toLowerCase().includes(archiveDocSearch.toLowerCase());
    const matchesType = archiveDocTypeFilter === 'all' || doc.document_type === archiveDocTypeFilter;
    return matchesSearch && matchesType;
  });

  const filteredResidents = residents.filter(res =>
    `${res.first_name} ${res.last_name}`.toLowerCase().includes(residentSearch.toLowerCase()) ||
    res.household_id.toLowerCase().includes(residentSearch.toLowerCase()) ||
    res.address.toLowerCase().includes(residentSearch.toLowerCase())
  );

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'approvals', label: 'Pending Approvals', icon: CheckCircle },
    { id: 'documents', label: 'Document Processing', icon: InboxIcon },
    { id: 'records', label: 'Resident Records', icon: FolderOpen },
    { id: 'users', label: 'User Accounts', icon: Users },
    { id: 'reports', label: 'System Reports', icon: BarChart },
    { id: 'archive', label: 'Settings & Data Archive', icon: Settings },
    ...(user?.role === 'superadmin' ? [{ id: 'categories', label: 'Category Manager', icon: Tag }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Super Admin Unified Ecosystem Switcher */}
      <SuperAdminNavigationDock
        currentRole={user?.role}
        onSelectCategoryTab={user?.role === 'superadmin' ? () => setActiveTab('categories') : undefined}
      />

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
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Shield size={20} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Smart Barangay System</h1>
                <span className="text-xs text-indigo-600 font-semibold">Admin Portal</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.role === 'superadmin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/bhw')}
                className="flex items-center gap-1.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 hover:text-blue-800 font-semibold cursor-pointer animate-pulse"
              >
                <Activity size={14} />
                Switch to BHW Portal
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === item.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className="shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </div>
                {sidebarOpen && item.id === 'approvals' && pendingResidents.length > 0 && (
                  <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 h-4 border-0 font-bold">
                    {pendingResidents.length}
                  </Badge>
                )}
                {sidebarOpen && item.id === 'documents' && activeDocuments.length > 0 && (
                  <Badge className="bg-indigo-500 text-white text-[10px] px-1.5 py-0 h-4 border-0 font-bold">
                    {activeDocuments.length}
                  </Badge>
                )}
                {sidebarOpen && item.id === 'archive' && archivedDocuments.length > 0 && (
                  <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 h-4 border-0 font-bold">
                    {archivedDocuments.length}
                  </Badge>
                )}
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
                    You are currently previewing the Barangay Admin portal. Creating certificates, verifying residents, and configuring system accounts are locked in read-only preview.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/login')}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9 px-4 shrink-0 shadow-sm"
              >
                Log In as Admin
              </Button>
            </div>
          )}
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Super Admin Unified Ecosystem Command Banner */}
              {user?.role === 'superadmin' && (
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-xl border border-indigo-500/40 relative overflow-hidden">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                          👑 SUPER ADMINISTRATOR COMMAND CENTER
                        </span>
                        <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Full Access Active
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white">Barangay Pianing Complete Public Ecosystem</h3>
                      <p className="text-xs text-indigo-200/80 max-w-2xl">
                        You have master oversight across both Barangay Administrative Operations and the Barangay Health Worker (BHW) Clinic.
                      </p>
                    </div>

                    {/* Quick Access Portal Launchers */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => navigate('/bhw')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md gap-1.5"
                      >
                        <Activity size={14} /> Open BHW Health Hub
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/resident/barangay')}
                        className="bg-indigo-900/60 border-indigo-400/40 text-indigo-200 hover:text-white hover:bg-indigo-800 text-xs gap-1.5"
                      >
                        <FileText size={14} /> Resident Brgy Hub
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/resident/health')}
                        className="bg-teal-900/60 border-teal-400/40 text-teal-200 hover:text-white hover:bg-teal-800 text-xs gap-1.5"
                      >
                        <Heart size={14} /> Resident Health Hub
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Header Title */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Barangay Administrative Dashboard</h2>
                  <p className="text-xs text-slate-500">Real-time overview of document clearance requests, resident profiles, and administrative services.</p>
                </div>
                <div className="flex gap-2">
                  <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm">
                        <PlusCircle size={15} />
                        New Document Request
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white">
                      <DialogHeader>
                        <DialogTitle>Issue New Clearance / Certificate</DialogTitle>
                        <DialogDescription className="text-xs">Create a new document request in the database.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateDocument} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Resident Name</Label>
                          <Input value={newDocName} onChange={e => setNewDocName(e.target.value)} placeholder="e.g. Juan Dela Cruz" required />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Document Type</Label>
                          <Select value={newDocType} onValueChange={setNewDocType}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Barangay Clearance">Barangay Clearance</SelectItem>
                              <SelectItem value="Certificate of Residency">Certificate of Residency</SelectItem>
                              <SelectItem value="Business Permit">Business Permit</SelectItem>
                              <SelectItem value="Certificate of Indigency">Certificate of Indigency</SelectItem>
                              <SelectItem value="Barangay ID">Barangay ID</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Purpose</Label>
                          <Input value={newDocPurpose} onChange={e => setNewDocPurpose(e.target.value)} placeholder="e.g. Employment / Local Permit" />
                        </div>
                        <DialogFooter>
                          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Request</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Pending Resident Approvals Alert Banner */}
              {pendingResidents.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-300 dark:border-amber-700/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <UserCheck size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {pendingResidents.length} Pending Resident Account {pendingResidents.length > 1 ? 'Registrations' : 'Registration'}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        New resident submitted government ID for account verification. Review & approve to unlock online requests.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('approvals')}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0 font-semibold shadow-xs"
                  >
                    Review Applications →
                  </Button>
                </div>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <Clock size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Pending Requests</p>
                      <h3 className="text-2xl font-bold text-slate-900">{stats.pendingDocs}</h3>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Processed Today</p>
                      <h3 className="text-2xl font-bold text-slate-900">{stats.processedToday}</h3>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Total Residents</p>
                      <h3 className="text-2xl font-bold text-slate-900">{stats.totalResidents}</h3>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      <FolderOpen size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Active Records</p>
                      <h3 className="text-2xl font-bold text-slate-900">{stats.activeRecords}</h3>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Document Requests Quick View */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Recent Document Requests</CardTitle>
                    <CardDescription className="text-xs">Active clearance requests stored in MySQL database</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('documents')} className="text-indigo-600 text-xs font-semibold">
                    View All Documents →
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Request Code</TableHead>
                        <TableHead className="text-xs">Resident Name</TableHead>
                        <TableHead className="text-xs">Document Type</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.slice(0, 5).map(doc => (
                        <TableRow key={doc.id} className="text-xs">
                          <TableCell>
                            <button
                              onClick={() => openDocInfo(doc)}
                              className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
                              title="Click to view document info"
                            >
                              {doc.request_code}
                              <Eye size={12} className="opacity-70" />
                            </button>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => openResidentProfile(doc.resident_id || 1)}
                              className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline transition-colors"
                            >
                              {doc.resident_name}
                            </button>
                          </TableCell>
                          <TableCell>{doc.document_type}</TableCell>
                          <TableCell>
                            <Badge variant={doc.status === 'Completed' ? 'default' : doc.status === 'Processing' ? 'outline' : 'secondary'}
                              className={doc.status === 'Completed' ? 'bg-emerald-600' : doc.status === 'Processing' ? 'border-amber-400 text-amber-800 bg-amber-50' : 'bg-orange-100 text-orange-800'}>
                              {doc.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {doc.status !== 'Completed' && (
                              <Button size="sm" variant="outline" onClick={() => handleUpdateDocStatus(doc.id, doc.status)} className="h-7 text-[11px] gap-1">
                                <Check size={12} />
                                {doc.status === 'Pending' ? 'Process' : 'Complete'}
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

          {/* TAB: PENDING APPROVALS */}
          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Resident Account Approvals</h2>
                    <Badge className="bg-amber-500 text-white text-xs">{pendingResidents.length} Pending</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Review submitted Government IDs from residents who created an account. Approve to unlock online certificate & clearance requests.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs">
                  <RefreshCcw size={13} className={loading ? "animate-spin" : ""} /> Refresh List
                </Button>
              </div>

              <Card className="border-slate-200 bg-white dark:bg-slate-900 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <UserCheck className="text-amber-600" size={18} />
                    Pending Resident Verification Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                        <TableHead className="text-xs">Resident Name</TableHead>
                        <TableHead className="text-xs">Contact Info</TableHead>
                        <TableHead className="text-xs">Address</TableHead>
                        <TableHead className="text-xs">Submitted ID</TableHead>
                        <TableHead className="text-xs">Submitted Date</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Admin Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingResidents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-xs py-12 text-slate-400">
                            <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500 opacity-80" />
                            No pending resident account applications! All registrations have been reviewed.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendingResidents.map((r) => (
                          <TableRow key={r.id} className="text-xs hover:bg-slate-50/50">
                            <TableCell className="font-semibold text-slate-900 dark:text-white">
                              {r.name || `${r.first_name || ''} ${r.last_name || ''}`}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <p className="text-slate-700 dark:text-slate-300 font-medium">{r.email}</p>
                                <p className="text-[11px] text-slate-400">{r.phone || 'No phone'}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400">
                              {r.address || 'Zone 1'}
                            </TableCell>
                            <TableCell>
                              {r.submitted_id ? (
                                <button
                                  onClick={() => setSelectedIdPreview(r.submitted_id)}
                                  className="flex items-center gap-1.5 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-md transition-colors"
                                >
                                  <Eye size={13} />
                                  <span>View ID Photo</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">No ID attached</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-slate-400 text-[11px]">
                              {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : 'Recent'}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                                Pending Review
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveResident(r.id)}
                                  className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
                                >
                                  <Check size={12} />
                                  Approve & Verify
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectResident(r.id)}
                                  className="h-7 text-[11px] gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <X size={12} />
                                  Reject
                                </Button>
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

          {/* TAB 2: DOCUMENT PROCESSING — Active (Pending/Processing) only */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Active Queue Banner */}
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <InboxIcon size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-indigo-900">Active Document Queue</h3>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Showing <strong>{activeDocuments.length}</strong> unprocessed request{activeDocuments.length !== 1 ? 's' : ''} (Pending &amp; Processing). Once approved, documents automatically move to the <button onClick={() => setActiveTab('archive')} className="underline font-semibold hover:text-indigo-900 cursor-pointer">Archive tab</button>.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Document Clearance &amp; Permits</h2>
                  <p className="text-xs text-slate-500">Manage and approve active barangay clearances, residency certificates, and business permits.</p>
                </div>

                <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm">
                      <PlusCircle size={15} />
                      Issue Document Request
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Issue New Clearance / Certificate</DialogTitle>
                      <DialogDescription className="text-xs">Create a new document request in the database.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateDocument} className="space-y-4 py-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Resident Name</Label>
                        <Input value={newDocName} onChange={e => setNewDocName(e.target.value)} placeholder="e.g. Maria Santos" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Document Type</Label>
                        <Select value={newDocType} onValueChange={setNewDocType}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Barangay Clearance">Barangay Clearance</SelectItem>
                            <SelectItem value="Certificate of Residency">Certificate of Residency</SelectItem>
                            <SelectItem value="Business Permit">Business Permit</SelectItem>
                            <SelectItem value="Certificate of Indigency">Certificate of Indigency</SelectItem>
                            <SelectItem value="Barangay ID">Barangay ID</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Purpose</Label>
                        <Input value={newDocPurpose} onChange={e => setNewDocPurpose(e.target.value)} placeholder="e.g. Bank Account / Employment" />
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Request</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Filters — Active queue only (no Completed filter needed) */}
              <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200 justify-between items-center">
                <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <Input
                      placeholder="Search by Resident Name or Request Code..."
                      value={docSearch}
                      onChange={e => setDocSearch(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => exportToCsv('Active_Document_Requests', filteredDocuments)}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 h-9 border-slate-300 hover:bg-slate-50"
                >
                  <Download size={14} /> Export CSV
                </Button>
              </div>

              {/* Full Document Table */}
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Request Code</TableHead>
                        <TableHead className="text-xs">Resident Name</TableHead>
                        <TableHead className="text-xs">Document Type</TableHead>
                        <TableHead className="text-xs">Purpose</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Requested At</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-xs py-8 text-slate-400">
                            No document requests found matching filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDocuments.map(doc => (
                          <TableRow key={doc.id} className="text-xs">
                            <TableCell>
                              <button
                                onClick={() => openDocInfo(doc)}
                                className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
                                title="Click to view document info"
                              >
                                {doc.request_code}
                                <Eye size={12} className="opacity-70" />
                              </button>
                            </TableCell>
                            <TableCell className="font-semibold text-slate-900">{doc.resident_name}</TableCell>
                            <TableCell>{doc.document_type}</TableCell>
                            <TableCell className="text-slate-500 max-w-[150px] truncate">{doc.purpose || '-'}</TableCell>
                            <TableCell>
                              <Badge className={
                                doc.status === 'Completed' ? 'bg-emerald-600' :
                                doc.status === 'Processing' ? 'bg-amber-500' : 'bg-orange-500'
                              }>
                                {doc.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-500 text-[11px]">{doc.requested_at || 'Today'}</TableCell>
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
                                  className="h-7 text-[11px] gap-1 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                                >
                                  <Printer size={13} /> Print
                                </Button>
                                {doc.status !== 'Completed' && (
                                  <Button size="sm" variant="outline" onClick={() => handleUpdateDocStatus(doc.id, doc.status)} className="h-7 text-[11px] gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                                    <Check size={12} />
                                    {doc.status === 'Pending' ? 'Process' : 'Approve'}
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteDoc(doc.id)} className="h-7 text-[11px] text-red-600 hover:bg-red-50">
                                  <Trash2 size={13} />
                                </Button>
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

          {/* TAB: ARCHIVE / RECORDS SETTINGS */}
          {activeTab === 'archive' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Settings className="text-indigo-600" size={22} />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings &amp; Completed Records Archive</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Central archive for all approved/completed clearance documents, residency certificates, and verified resident accounts.
                  </p>
                </div>
                <Button
                  onClick={() => exportToCsv('Archive_Completed_Documents', archivedDocuments)}
                  variant="outline" size="sm" className="text-xs gap-1.5 border-slate-300"
                >
                  <Download size={14} /> Export Archive CSV
                </Button>
              </div>

              {/* Data Migration Callout Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-sm flex items-start gap-3 border border-indigo-500/30">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Database size={20} />
                </div>
                <div className="text-xs space-y-1">
                  <h4 className="font-bold text-indigo-200 flex items-center gap-2">
                    📥 Automated Archive Workflow Active
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    When you click <strong>Approve / Complete</strong> on a pending document request, the item is removed from the active <strong>Document Processing</strong> tab and moved here to <strong>Settings &amp; Data Archive</strong> for permanent record storage and printing.
                  </p>
                </div>
              </div>

              {/* Archive Stats Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-700">Completed Documents</p>
                    <h3 className="text-xl font-bold text-emerald-900">{archivedDocuments.length}</h3>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-blue-700">Verified Residents</p>
                    <h3 className="text-xl font-bold text-blue-900">
                      {residents.filter(r => (r as any).verification_status === 'Verified').length}
                    </h3>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Archive size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-600">Total Archive Entries</p>
                    <h3 className="text-xl font-bold text-slate-900">{archivedDocuments.length + residents.length}</h3>
                  </div>
                </div>
              </div>

              {/* Archived Documents Section */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="text-emerald-600" size={18} />
                      Completed Document Requests
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">All approved clearances, certificates, and permits</CardDescription>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-xs">{archivedDocuments.length} Completed</Badge>
                </CardHeader>
                {/* Archive Doc Filters */}
                <div className="px-6 pb-3 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <Input
                      placeholder="Search archived documents..."
                      value={archiveDocSearch}
                      onChange={e => setArchiveDocSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <Select value={archiveDocTypeFilter} onValueChange={setArchiveDocTypeFilter}>
                    <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="Filter by type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Document Types</SelectItem>
                      <SelectItem value="Barangay Clearance">Barangay Clearance</SelectItem>
                      <SelectItem value="Certificate of Residency">Certificate of Residency</SelectItem>
                      <SelectItem value="Business Permit">Business Permit</SelectItem>
                      <SelectItem value="Barangay ID">Barangay ID</SelectItem>
                      <SelectItem value="Certificate of Indigency">Certificate of Indigency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-emerald-50/50">
                        <TableHead className="text-xs">Request Code</TableHead>
                        <TableHead className="text-xs">Resident Name</TableHead>
                        <TableHead className="text-xs">Document Type</TableHead>
                        <TableHead className="text-xs">Purpose</TableHead>
                        <TableHead className="text-xs">Processed At</TableHead>
                        <TableHead className="text-xs">Processed By</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredArchivedDocs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-xs py-10 text-slate-400">
                            <Archive size={30} className="mx-auto mb-2 opacity-30" />
                            No completed documents found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredArchivedDocs.map(doc => (
                          <TableRow key={doc.id} className="text-xs hover:bg-emerald-50/30">
                            <TableCell>
                              <button
                                onClick={() => openDocInfo(doc)}
                                className="font-mono font-bold text-indigo-600 hover:underline flex items-center gap-1"
                              >
                                {doc.request_code}<Eye size={11} className="opacity-60" />
                              </button>
                            </TableCell>
                            <TableCell className="font-semibold text-slate-900">
                              <button onClick={() => openResidentProfile(doc.resident_id || 1)} className="hover:underline text-indigo-700">
                                {doc.resident_name}
                              </button>
                            </TableCell>
                            <TableCell>{doc.document_type}</TableCell>
                            <TableCell className="text-slate-500 max-w-[130px] truncate">{doc.purpose || '-'}</TableCell>
                            <TableCell className="text-slate-400 text-[11px]">
                              {doc.processed_at ? new Date(doc.processed_at).toLocaleDateString() : 'Today'}
                            </TableCell>
                            <TableCell className="text-slate-500">{doc.processed_by || 'Admin'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button size="sm" variant="outline" onClick={() => openDocInfo(doc)} className="h-7 text-[11px] gap-1">
                                  <Eye size={12} /> View
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openPrintModal(doc)} className="h-7 text-[11px] gap-1 text-indigo-700 border-indigo-200 hover:bg-indigo-50">
                                  <Printer size={12} /> Print
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Verified Residents Archive */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="text-blue-600" size={18} />
                    Verified &amp; Processed Resident Accounts
                  </CardTitle>
                  <CardDescription className="text-xs">Residents who have been reviewed and verified or rejected by admin</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-50/50">
                        <TableHead className="text-xs">Full Name</TableHead>
                        <TableHead className="text-xs">Contact</TableHead>
                        <TableHead className="text-xs">Address</TableHead>
                        <TableHead className="text-xs">Household</TableHead>
                        <TableHead className="text-xs">Verification</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {residents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-xs py-8 text-slate-400">
                            No resident records found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        residents.map(res => (
                          <TableRow key={res.id} className="text-xs hover:bg-blue-50/20">
                            <TableCell className="font-semibold text-slate-900">
                              <button onClick={() => openResidentProfile(res.id)} className="hover:underline text-indigo-700">
                                {res.first_name} {res.last_name}
                              </button>
                            </TableCell>
                            <TableCell className="text-slate-600">{(res as any).phone || '—'}</TableCell>
                            <TableCell className="text-slate-500 max-w-[140px] truncate">{res.address}</TableCell>
                            <TableCell className="font-mono text-slate-500">{res.household_id}</TableCell>
                            <TableCell>
                              <Badge className={
                                (res as any).verification_status === 'Verified'
                                  ? 'bg-emerald-600 text-white'
                                  : (res as any).verification_status === 'Rejected'
                                  ? 'bg-red-100 text-red-700 border-red-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }>
                                {(res as any).verification_status || 'Verified'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => openResidentProfile(res.id)} className="h-7 text-[11px] gap-1">
                                <Eye size={12} /> Profile
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

          {/* TAB 3: RESIDENT RECORDS */}
          {activeTab === 'records' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Barangay Resident Registry</h2>
                  <p className="text-xs text-slate-500">Demographic profiles and household registration linked to MySQL database.</p>
                </div>

                <Dialog open={isAddResidentOpen} onOpenChange={setIsAddResidentOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm">
                      <UserPlus size={15} />
                      Register Resident
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Register New Resident</DialogTitle>
                      <DialogDescription className="text-xs">Add new resident information to the barangay database.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateResident} className="space-y-3 py-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">First Name</Label>
                          <Input value={newResFirstName} onChange={e => setNewResFirstName(e.target.value)} required />
                        </div>
                        <div>
                          <Label className="text-xs">Last Name</Label>
                          <Input value={newResLastName} onChange={e => setNewResLastName(e.target.value)} required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Gender</Label>
                          <Select value={newResGender} onValueChange={(val: 'Male' | 'Female') => setNewResGender(val)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Household ID</Label>
                          <Input value={newResHousehold} onChange={e => setNewResHousehold(e.target.value)} placeholder="HH-006" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Address / Zone</Label>
                        <Input value={newResAddress} onChange={e => setNewResAddress(e.target.value)} placeholder="Zone 1, Sampaguita St" />
                      </div>
                      <div>
                        <Label className="text-xs">Contact Phone</Label>
                        <Input value={newResPhone} onChange={e => setNewResPhone(e.target.value)} placeholder="09171234567" />
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Resident</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <Input
                    placeholder="Search by Name, Household ID, or Address..."
                    value={residentSearch}
                    onChange={e => setResidentSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <Button
                  onClick={() => {
                    exportToCsv('Barangay_Pianing_Resident_Records', filteredResidents.map(r => ({
                      'ID': r.id,
                      'Full Name': `${r.first_name} ${r.last_name}`,
                      'Gender': r.gender,
                      'Purok / Address': r.address,
                      'Household ID': r.household_id,
                      'Contact Phone': r.phone || 'N/A'
                    })));
                    toast.success('Resident records exported (CSV)');
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 h-9 border-slate-300 hover:bg-slate-50"
                >
                  <Download size={14} /> Export Residents (CSV)
                </Button>
              </div>

              <Card className="border-slate-200 bg-white">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">ID</TableHead>
                        <TableHead className="text-xs">Full Name</TableHead>
                        <TableHead className="text-xs">Household</TableHead>
                        <TableHead className="text-xs">Gender</TableHead>
                        <TableHead className="text-xs">Address</TableHead>
                        <TableHead className="text-xs">Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResidents.map(res => (
                        <TableRow key={res.id} className="text-xs">
                          <TableCell className="font-mono text-slate-500">{res.id}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => openResidentProfile(res.id)}
                              className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline transition-colors"
                            >
                              {res.first_name} {res.last_name}
                            </button>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="font-mono text-[11px]">{res.household_id}</Badge></TableCell>
                          <TableCell>{res.gender}</TableCell>
                          <TableCell className="text-slate-600">{res.address}</TableCell>
                          <TableCell className="font-mono text-slate-500">{res.phone || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: USER ACCOUNTS */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Accounts Management</h2>
                  <p className="text-xs text-slate-500">
                    {user?.role === 'superadmin'
                      ? 'Full account control — create, manage, or delete any system user.'
                      : 'View admin, staff, and BHW accounts. Account management is restricted to Super Admin.'}
                  </p>
                </div>

                {/* Only Super Admin can add new accounts */}
                {user?.role === 'superadmin' && (
                  <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm">
                        <UserPlus size={15} />
                        Add System Account
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white">
                      <DialogHeader>
                        <DialogTitle>Add System User</DialogTitle>
                        <DialogDescription className="text-xs">Grant login access to an official or health nurse.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateUser} className="space-y-3 py-2">
                        <div>
                          <Label className="text-xs">Full Name</Label>
                          <Input value={newUserName} onChange={e => setNewUserName(e.target.value)} required placeholder="e.g. Dr. Roberto Cruz" />
                        </div>
                        <div>
                          <Label className="text-xs">Email Address</Label>
                          <Input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required placeholder="roberto.nurse@barangay.gov" />
                        </div>
                        <div>
                          <Label className="text-xs">Password</Label>
                          <Input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Default: 123" required />
                        </div>
                        <div>
                          <Label className="text-xs">Role</Label>
                          <Select value={newUserRole} onValueChange={(val: 'superadmin' | 'admin' | 'staff' | 'bhw' | 'resident') => setNewUserRole(val)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="superadmin">Super Admin</SelectItem>
                              <SelectItem value="admin">Barangay Admin</SelectItem>
                              <SelectItem value="staff">Barangay Staff</SelectItem>
                              <SelectItem value="bhw">BHW (Barangay Health Worker)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Create Account</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <Card className="border-slate-200 bg-white">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">ID</TableHead>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Role</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Last Login</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users
                        .filter(u => {
                          // Barangay Admin: cannot see resident accounts
                          if (user?.role === 'admin') return u.role !== 'resident';
                          return true;
                        })
                        .map(u => (
                        <TableRow key={u.id} className="text-xs">
                          <TableCell className="font-mono text-slate-400">#{u.id}</TableCell>
                          <TableCell className="font-semibold text-slate-900">{u.name}</TableCell>
                          <TableCell className="font-mono text-slate-600">{u.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              u.role === 'superadmin' ? 'border-violet-500 text-violet-700 bg-violet-50' :
                              u.role === 'admin' ? 'border-indigo-500 text-indigo-700 bg-indigo-50' :
                              u.role === 'bhw' ? 'border-emerald-500 text-emerald-700 bg-emerald-50' :
                              u.role === 'staff' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-slate-300'
                            }>
                              {u.role === 'superadmin' ? 'SUPER ADMIN' : u.role.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={u.status === 'Active' ? 'bg-emerald-600' : 'bg-slate-400'}>
                              {u.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500 text-[11px]">{u.last_login || 'Never'}</TableCell>
                          <TableCell className="text-right">
                            {/* Only Super Admin can delete accounts */}
                            {user?.role === 'superadmin' ? (
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteUser(u.id)} className="h-7 text-red-600 hover:bg-red-50">
                                <Trash2 size={13} />
                              </Button>
                            ) : (
                              <span className="text-slate-300 text-[11px] italic">View only</span>
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



          {/* TAB: CATEGORY MANAGER (Super Admin Only) */}
          {activeTab === 'categories' && user?.role === 'superadmin' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Category Manager</h2>
                  <p className="text-xs text-slate-500">Add or manage document categories available to Barangay and Health Center portals.</p>
                </div>
                <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1.5 shadow-sm">
                      <PlusCircle size={15} />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Add Document Category</DialogTitle>
                      <DialogDescription className="text-xs">Define a new document type available for residents to request.</DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        if (!newCategoryName.trim()) return;
                        setCategories(prev => [
                          ...prev,
                          { id: Date.now(), name: newCategoryName.trim(), type: newCategoryType, desc: newCategoryDesc.trim(), active: true }
                        ]);
                        setNewCategoryName('');
                        setNewCategoryDesc('');
                        setIsAddCategoryOpen(false);
                        toast.success(`Category "${newCategoryName}" added successfully.`);
                      }}
                      className="space-y-3 py-2"
                    >
                      <div>
                        <Label className="text-xs">Category Name</Label>
                        <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} required placeholder="e.g. Solo Parent ID" />
                      </div>
                      <div>
                        <Label className="text-xs">Portal Type</Label>
                        <Select value={newCategoryType} onValueChange={(val: 'barangay' | 'health') => setNewCategoryType(val)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="barangay">Barangay Portal</SelectItem>
                            <SelectItem value="health">Health Center Portal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Input value={newCategoryDesc} onChange={e => setNewCategoryDesc(e.target.value)} placeholder="Short description of purpose" />
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white">Save Category</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Barangay Categories */}
              <div className="grid gap-6">
                {(['barangay', 'health'] as const).map(type => (
                  <Card key={type} className="border-slate-200 bg-white">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        {type === 'barangay'
                          ? <><Shield size={15} className="text-indigo-500" /> Barangay Portal Categories</>
                          : <><Activity size={15} className="text-emerald-500" /> Health Center Portal Categories</>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-xs">Category Name</TableHead>
                            <TableHead className="text-xs">Description</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categories.filter(c => c.type === type).map(cat => (
                            <TableRow key={cat.id} className="text-xs">
                              <TableCell className="font-semibold text-slate-800 flex items-center gap-2">
                                <Tag size={13} className={type === 'barangay' ? 'text-indigo-400' : 'text-emerald-400'} />
                                {cat.name}
                              </TableCell>
                              <TableCell className="text-slate-500">{cat.desc}</TableCell>
                              <TableCell>
                                <Badge className={cat.active ? 'bg-emerald-600' : 'bg-slate-400'}>{cat.active ? 'Active' : 'Inactive'}</Badge>
                              </TableCell>
                              <TableCell className="text-right flex items-center justify-end gap-1">
                                <Button
                                  size="sm" variant="outline"
                                  onClick={() => {
                                    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: !c.active } : c));
                                    toast.success(`${cat.name} ${cat.active ? 'deactivated' : 'activated'}.`);
                                  }}
                                  className="h-7 text-[11px] gap-1"
                                >
                                  {cat.active ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button
                                  size="sm" variant="ghost"
                                  onClick={() => {
                                    setCategories(prev => prev.filter(c => c.id !== cat.id));
                                    toast.success(`"${cat.name}" removed.`);
                                  }}
                                  className="h-7 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}



          {/* TAB 5: SYSTEM REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Barangay Administrative & System Reports</h2>
                  <p className="text-xs text-slate-500">Official Barangay Pianing, Butuan City analytics, resident registry, and database export center.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => {
                      exportToCsv('Barangay_Pianing_All_Clearances_Log', documents.map(d => ({
                        'Request Code': d.request_code,
                        'Resident Name': d.resident_name,
                        'Document Type': d.document_type,
                        'Purpose': d.purpose,
                        'Status': d.status,
                        'Requested Date': d.requested_at || 'Recent',
                        'Processed By': d.processed_by || 'Pending',
                        'Processed Date': d.processed_at || 'N/A'
                      })));
                      toast.success('Clearance records downloaded (CSV)');
                    }}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 border-slate-300"
                  >
                    <Download size={13} /> Export Clearances (CSV)
                  </Button>

                  <Button
                    onClick={() => {
                      exportToCsv('Barangay_Pianing_Resident_Demographics', residents.map(r => ({
                        'Resident ID': r.id,
                        'First Name': r.first_name,
                        'Last Name': r.last_name,
                        'Gender': r.gender,
                        'Address': r.address,
                        'Household ID': r.household_id,
                        'Phone': r.phone || 'N/A',
                        'Email': r.email || 'N/A',
                        'Verification Status': (r as any).verification_status || 'Verified'
                      })));
                      toast.success('Resident registry downloaded (CSV)');
                    }}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 border-slate-300"
                  >
                    <Download size={13} /> Export Residents (CSV)
                  </Button>

                  <Button
                    onClick={() => {
                      printOfficialReport({
                        title: 'Official Barangay System & Administrative Report',
                        subtitle: 'Barangay Pianing, Butuan City, Agusan del Norte • Administrative Operations & Registry',
                        department: 'Office of the Barangay Captain • Administrative Division',
                        preparedBy: user?.name || 'Admin Juan Dela Cruz',
                        preparedByTitle: user?.role === 'superadmin' ? 'Super Administrator' : user?.role === 'staff' ? 'Barangay Staff / Clerk' : 'Barangay Administrator',
                        stats: [
                          { label: 'Total Residents', value: residents.length, color: '#2563eb' },
                          { label: 'Clearance Requests', value: documents.length, color: '#4f46e5' },
                          { label: 'Completed Clearances', value: documents.filter(d => d.status === 'Completed').length, color: '#059669' },
                          { label: 'Pending Approvals', value: pendingResidents.length, color: '#d97706' }
                        ],
                        tables: [
                          {
                            title: 'Recent Document Clearances & Certification Issuances',
                            headers: ['Control Code', 'Resident Applicant', 'Document Type', 'Status', 'Date'],
                            rows: documents.slice(0, 10).map(d => [
                              d.request_code,
                              d.resident_name,
                              d.document_type,
                              d.status,
                              d.requested_at || 'Recent'
                            ])
                          },
                          {
                            title: 'Barangay Resident Demographic Sample',
                            headers: ['Resident ID', 'Full Name', 'Gender', 'Purok / Address', 'Household ID', 'Contact'],
                            rows: residents.slice(0, 10).map(r => [
                              `#${r.id}`,
                              `${r.first_name} ${r.last_name}`,
                              r.gender,
                              r.address,
                              r.household_id,
                              r.phone || 'N/A'
                            ])
                          }
                        ]
                      });
                    }}
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold"
                  >
                    <Printer size={13} /> Print Official System Report
                  </Button>
                </div>
              </div>

              {/* Data Export Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-indigo-200 bg-indigo-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <FolderOpen size={16} className="text-indigo-600" />
                      Resident Registry Dataset
                    </CardTitle>
                    <CardDescription className="text-[11px] text-indigo-700">Demographic census & household records</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-slate-600 mb-3">Total registered residents: <strong>{residents.length}</strong> in database.</p>
                    <Button
                      onClick={() => {
                        exportToCsv('Barangay_Pianing_Resident_Census_Export', residents.map(r => ({
                          'ID': r.id,
                          'Name': `${r.first_name} ${r.last_name}`,
                          'Gender': r.gender,
                          'Address': r.address,
                          'Household': r.household_id,
                          'Phone': r.phone
                        })));
                        toast.success('Resident census dataset exported');
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-7 text-indigo-700 border-indigo-300 hover:bg-indigo-100"
                    >
                      <Download size={12} className="mr-1" /> Export Full Census (CSV)
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-emerald-200 bg-emerald-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <FileText size={16} className="text-emerald-600" />
                      Document Clearances Log
                    </CardTitle>
                    <CardDescription className="text-[11px] text-emerald-700">Clearances, permits & certificate requests</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-slate-600 mb-3">Total processed requests: <strong>{documents.length}</strong> documents.</p>
                    <Button
                      onClick={() => {
                        exportToCsv('Barangay_Pianing_Clearance_Requests_Master', documents.map(d => ({
                          'Code': d.request_code,
                          'Applicant': d.resident_name,
                          'Type': d.document_type,
                          'Purpose': d.purpose,
                          'Status': d.status,
                          'Processed By': d.processed_by
                        })));
                        toast.success('Clearance requests master list exported');
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-7 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                    >
                      <Download size={12} className="mr-1" /> Export Clearances Master (CSV)
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Users size={16} className="text-blue-600" />
                      System User Accounts
                    </CardTitle>
                    <CardDescription className="text-[11px] text-blue-700">Administrator, BHW & staff account list</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-slate-600 mb-3">Active authorized accounts: <strong>{users.length}</strong> users.</p>
                    <Button
                      onClick={() => {
                        exportToCsv('Barangay_Pianing_System_Users_List', users.map(u => ({
                          'User ID': u.id,
                          'Full Name': u.name,
                          'Email Address': u.email,
                          'Assigned Role': u.role,
                          'Status': u.status,
                          'Last Login': u.last_login || 'Never'
                        })));
                        toast.success('System user accounts list exported');
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-7 text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      <Download size={12} className="mr-1" /> Export User Accounts (CSV)
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FolderOpen className="text-indigo-600" size={18} />
                      Database Records Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>Total Resident Demographics</span>
                      <span className="font-bold font-mono text-indigo-600">{residents.length}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>Total Document Clearance Requests</span>
                      <span className="font-bold font-mono text-indigo-600">{documents.length}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>Completed Clearances</span>
                      <span className="font-bold font-mono text-emerald-600">{documents.filter(d => d.status === 'Completed').length}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span>System User Accounts</span>
                      <span className="font-bold font-mono text-blue-600">{users.length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Activity className="text-emerald-600" size={18} />
                      Health & Administrative Status Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <h4 className="font-bold text-xs text-emerald-900">Service Performance</h4>
                      <p className="text-[11px] text-emerald-700 mt-1">Average document processing turn-around time: 15 minutes.</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <h4 className="font-bold text-xs text-blue-900">Barangay Pianing Database Driver Health</h4>
                      <p className="text-[11px] text-blue-700 mt-1">Active MySQL2 connection pool with automatic error recovery.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Intra-System Messenger (floating, Barangay Admin role) */}
      <SystemMessenger currentUserRole={user?.role === 'superadmin' ? 'superadmin' : user?.role === 'staff' ? 'staff' : 'admin'} currentUserName={user?.name || "Admin Juan Dela Cruz"} />

      {/* Resident 360° Profile Modal */}
      <ResidentProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        residentId={selectedResidentId}
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

      {/* Submitted Government ID Photo Preview Modal */}
      <Dialog open={!!selectedIdPreview} onOpenChange={(open) => !open && setSelectedIdPreview(null)}>
        <DialogContent className="bg-white dark:bg-slate-900 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Shield className="text-indigo-600" size={18} />
              Submitted Resident Government ID
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review the uploaded identification document to verify resident authenticity.
            </DialogDescription>
          </DialogHeader>
          <div className="p-2 border rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center min-h-[220px]">
            {selectedIdPreview ? (
              <img
                src={selectedIdPreview}
                alt="Submitted Government ID"
                className="max-h-[380px] w-auto max-w-full object-contain rounded-lg shadow-sm"
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setSelectedIdPreview(null)} className="text-xs">
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
