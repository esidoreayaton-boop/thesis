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
  AlertCircle
} from 'lucide-react';
import { apiService, DocumentRequest, Resident, SystemUser } from '../../services/api';
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
  const [newUserRole, setNewUserRole] = useState<'superadmin' | 'admin' | 'staff' | 'bhw' | 'resident'>('staff');

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
          setIsVisitorMode(true);
        } else if (parsed.role !== 'admin' && parsed.role !== 'superadmin' && parsed.role !== 'staff') {
          toast.error('Access Denied', {
            description: 'You do not have permission to view the Admin Portal.'
          });
          navigate('/login');
          return;
        }
      } catch (e) {}
    } else {
      setIsVisitorMode(true);
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
    const nextStatus = currentStatus === 'Pending' ? 'Processing' : currentStatus === 'Processing' ? 'Completed' : 'Completed';
    try {
      await apiService.updateDocumentStatus(id, nextStatus, 'Admin Juan');
      setDocuments(documents.map(d => d.id === id ? { ...d, status: nextStatus, processed_at: new Date().toLocaleTimeString(), processed_by: 'Admin Juan' } : d));
      toast.success(`Document status updated to ${nextStatus}`);
      loadData();
    } catch (err) {
      toast.error('Failed to update document status');
    }
  };

  const handleDeleteDoc = async (id: number) => {
    try {
      await apiService.deleteDocument(id);
      setDocuments(documents.filter(d => d.id !== id));
      toast.success('Document request removed');
    } catch (err) {
      toast.error('Delete failed');
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
        address: newResAddress || 'Zone 1, Barangay Main',
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

  // Filtered lists
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.resident_name.toLowerCase().includes(docSearch.toLowerCase()) ||
                          doc.request_code.toLowerCase().includes(docSearch.toLowerCase()) ||
                          doc.document_type.toLowerCase().includes(docSearch.toLowerCase());
    const matchesStatus = docStatusFilter === 'all' || doc.status === docStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredResidents = residents.filter(res =>
    `${res.first_name} ${res.last_name}`.toLowerCase().includes(residentSearch.toLowerCase()) ||
    res.household_id.toLowerCase().includes(residentSearch.toLowerCase()) ||
    res.address.toLowerCase().includes(residentSearch.toLowerCase())
  );

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'approvals', label: 'Pending Approvals', icon: CheckCircle },
    { id: 'documents', label: 'Document Processing', icon: FileText },
    { id: 'records', label: 'Resident Records', icon: FolderOpen },
    { id: 'users', label: 'User Accounts', icon: Users },
    { id: 'reports', label: 'System Reports', icon: BarChart },
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
                    ? 'bg-indigo-600 text-white shadow-md'
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
                          <TableCell className="font-mono font-semibold text-indigo-600">{doc.request_code}</TableCell>
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

          {/* TAB 2: DOCUMENT PROCESSING */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Document Clearance & Permits</h2>
                  <p className="text-xs text-slate-500">Manage, update, and approve official barangay clearances, residency certificates, and business permits.</p>
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

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <Input
                    placeholder="Search by Resident Name or Request Code..."
                    value={docSearch}
                    onChange={e => setDocSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400" />
                  <Select value={docStatusFilter} onValueChange={setDocStatusFilter}>
                    <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Status Filter" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Processing">Processing</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                            <TableCell className="font-mono font-semibold text-indigo-600">{doc.request_code}</TableCell>
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

              <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <Input
                  placeholder="Search by Name, Household ID, or Address..."
                  value={residentSearch}
                  onChange={e => setResidentSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
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
                  <p className="text-xs text-slate-500">Authorized Admin, BHW, and Resident portal credentials stored in MySQL <code className="font-mono text-indigo-600">users</code> table.</p>
                </div>

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
                        <Label className="text-xs">Role</Label>
                        <Select value={newUserRole} onValueChange={(val: 'superadmin' | 'admin' | 'staff' | 'bhw' | 'resident') => setNewUserRole(val)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {user?.role === 'superadmin' && (
                              <SelectItem value="superadmin">Super Admin</SelectItem>
                            )}
                            <SelectItem value="admin">Barangay Admin</SelectItem>
                            <SelectItem value="staff">Barangay Staff</SelectItem>
                            <SelectItem value="bhw">BHW (Barangay Health Worker)</SelectItem>
                            <SelectItem value="resident">Resident</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Create Account</Button>
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
                      {users.map(u => (
                        <TableRow key={u.id} className="text-xs">
                          <TableCell className="font-mono text-slate-400">#{u.id}</TableCell>
                          <TableCell className="font-semibold text-slate-900">{u.name}</TableCell>
                          <TableCell className="font-mono text-slate-600">{u.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              u.role === 'admin' ? 'border-indigo-500 text-indigo-700 bg-indigo-50' :
                              u.role === 'nurse' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-slate-300'
                            }>
                              {u.role.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={u.status === 'Active' ? 'bg-emerald-600' : 'bg-slate-400'}>
                              {u.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500 text-[11px]">{u.last_login || 'Never'}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteUser(u.id)} className="h-7 text-red-600 hover:bg-red-50">
                              <Trash2 size={13} />
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

          {/* TAB 6: PENDING APPROVALS */}
          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Resident Account Verification Queue</h2>
                <p className="text-xs text-slate-500">Review submitted Government IDs and approve or reject resident portal accounts.</p>
              </div>

              <Card className="border-slate-200 bg-white">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Resident Name</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Contact Phone</TableHead>
                        <TableHead className="text-xs">Address</TableHead>
                        <TableHead className="text-xs">Submitted Date</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingResidents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-xs py-8 text-slate-400">
                            No pending resident accounts to review.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendingResidents.map(item => (
                          <TableRow key={item.id} className="text-xs">
                            <TableCell className="font-semibold text-slate-900">{item.name || `${item.first_name} ${item.last_name}`}</TableCell>
                            <TableCell>{item.email}</TableCell>
                            <TableCell className="font-mono">{item.phone || 'N/A'}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{item.address || 'N/A'}</TableCell>
                            <TableCell className="font-mono text-slate-400 text-[11px]">{item.submitted_at || 'Just now'}</TableCell>
                            <TableCell>
                              <Badge className="bg-amber-500">{item.verification_status || 'Pending_Review'}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-7 text-[11px] border-slate-300">
                                      View ID
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-white">
                                    <DialogHeader>
                                      <DialogTitle>Government ID Document</DialogTitle>
                                      <DialogDescription className="text-xs">Uploaded identification image for {item.name || `${item.first_name} ${item.last_name}`}</DialogDescription>
                                    </DialogHeader>
                                    <div className="flex items-center justify-center p-4 border rounded-lg bg-slate-50 min-h-[200px]">
                                      {item.submitted_id ? (
                                        <img src={item.submitted_id} alt="Government ID" className="max-h-[300px] object-contain rounded-md shadow-sm" />
                                      ) : (
                                        <div className="text-slate-400 text-xs text-center">
                                          <AlertCircle size={32} className="mx-auto mb-2 text-slate-300" />
                                          No ID photo uploaded (Using default fallback ID for demo)
                                          <div className="mt-4 p-3 bg-white border rounded text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                                            [Demo Government ID Card: Juan Dela Cruz, Barangay Resident ID #BR-99120]
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>

                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await apiService.approveResident(item.id, user?.name || 'Admin Juan');
                                      toast.success('Resident account approved successfully');
                                      loadData();
                                    } catch (e) {
                                      toast.error('Failed to approve account');
                                    }
                                  }}
                                  className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await apiService.rejectResident(item.id);
                                      toast.success('Resident registration rejected');
                                      loadData();
                                    } catch (e) {
                                      toast.error('Failed to reject registration');
                                    }
                                  }}
                                  className="h-7 text-[11px] bg-red-600 hover:bg-red-700 text-white"
                                >
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

          {/* TAB 5: SYSTEM REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Barangay System Analytics & MySQL Reports</h2>
                <p className="text-xs text-slate-500">Summary reports generated directly from database tables.</p>
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
                      <h4 className="font-bold text-xs text-blue-900">Database Driver Health</h4>
                      <p className="text-[11px] text-blue-700 mt-1">Connected via MySQL2 connection pool with automatic error recovery.</p>
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
        residentId={selectedResidentId}
        isOpen={profileModalOpen}
        onClose={() => { setProfileModalOpen(false); setSelectedResidentId(null); }}
      />
    </div>
  );
}
