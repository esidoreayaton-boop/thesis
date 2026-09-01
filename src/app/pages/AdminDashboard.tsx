import { useState, useEffect, useMemo } from 'react';
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
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  RotateCcw,
  AlertTriangle,
  Tag,
  Archive,
  InboxIcon,
  Settings,
  Sliders,
  Database,
  UserCircle,
  MapPin,
  Phone,
  KeyRound,
  MessageSquare,
  Send,
  Bell,
  FileWarning,
  ShieldCheck,
  Edit3,
  Building2,
  Key,
  History,
  CalendarCheck,
  CalendarPlus,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { apiService, DocumentRequest, Resident, SystemUser, PendingResident, ActivityLog, ClinicSchedule, HealthAppointment } from '../../services/api';
import SystemMessenger from '../components/SystemMessenger';
import ResidentProfileModal from '../components/ResidentProfileModal';
import DocumentPrintModal from '../components/DocumentPrintModal';
import DocumentInfoModal from '../components/DocumentInfoModal';
import PendingApplicantReviewModal from '../components/PendingApplicantReviewModal';
import SuperAdminNavigationDock from '../components/SuperAdminNavigationDock';
import { exportToCsv, printOfficialReport } from '../../utils/exportCsv';
import { BUTUAN_BARANGAYS } from '../../utils/barangays';
import { PIANING_LOGO_BASE64, BUTUAN_LOGO_BASE64 } from '../components/officialLogos';
import {
  sendResidentApprovalEmail,
  sendResidentCorrectionEmail,
  sendDocumentReadyEmail,
  sendEmailNotification,
  getEmailJsConfig,
  saveEmailJsConfig,
  EmailJsConfig
} from '../../services/emailJsService';
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

  // User session state — initialized synchronously from localStorage to prevent session flash/reset on refresh
  const [user, setUser] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('barangay_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isVisitorMode, setIsVisitorMode] = useState(false);

  // Barangay isolation & role helpers
  const userBarangay = user?.barangay || (user?.email?.toLowerCase().includes('anticala') ? 'Anticala' : user?.address?.toLowerCase().includes('anticala') ? 'Anticala' : 'Pianing');
  const currentAdminBarangay = (user?.barangay || (user?.email?.toLowerCase().includes('anticala') ? 'Anticala' : user?.address?.toLowerCase().includes('anticala') ? 'Anticala' : 'Pianing')).toLowerCase().trim();
  const isSuperAdmin = user?.role === 'superadmin';
  const isStaff = user?.role === 'staff';

  // Dynamic Data States
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [pendingResidents, setPendingResidents] = useState<any[]>([]);
  const [clinicSchedules, setClinicSchedules] = useState<ClinicSchedule[]>([]);
  const [appointments, setAppointments] = useState<HealthAppointment[]>([]);

  // Staff Schedule Creator Modal State
  const [isPostScheduleModalOpen, setIsPostScheduleModalOpen] = useState(false);
  const [newScheduleTitle, setNewScheduleTitle] = useState('');
  const [newScheduleServiceType, setNewScheduleServiceType] = useState('Pre-Marriage Counseling (PMC)');
  const [newScheduleDay, setNewScheduleDay] = useState('Every Wednesday');
  const [newScheduleTime, setNewScheduleTime] = useState('8:30 AM - 11:30 AM');
  const [newScheduleLocation, setNewScheduleLocation] = useState('Barangay Pianing Health Center');
  const [newScheduleSlots, setNewScheduleSlots] = useState('20');
  const [newScheduleBhw, setNewScheduleBhw] = useState('');
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

  // Pending Resident Applicant Review Modal State
  const [selectedApplicantForReview, setSelectedApplicantForReview] = useState<PendingResident | null>(null);
  const [isApplicantReviewOpen, setIsApplicantReviewOpen] = useState(false);
  const [isApprovingApplicant, setIsApprovingApplicant] = useState(false);

  const openDocInfo = (doc: DocumentRequest) => {
    setSelectedInfoDoc(doc);
    setIsDocInfoOpen(true);
  };

  const openPrintModal = (doc: DocumentRequest) => {
    setSelectedPrintDoc(doc);
    setPrintModalOpen(true);
  };

  const openApplicantReview = (applicant: PendingResident) => {
    setSelectedApplicantForReview(applicant);
    setIsApplicantReviewOpen(true);
  };

  // Search & Filter
  const [docSearch, setDocSearch] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState('all');
  const [residentSearch, setResidentSearch] = useState('');

  // Activity Logs & Audit Trail State
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logActionTypeFilter, setLogActionTypeFilter] = useState('All');
  const [logRoleFilter, setLogRoleFilter] = useState('All');
  const [logBarangayFilter, setLogBarangayFilter] = useState('All');

  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [isAddResidentOpen, setIsAddResidentOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Issue Document State
  const [selectedResidentForDoc, setSelectedResidentForDoc] = useState<string>('manual');
  const [newDocResidentId, setNewDocResidentId] = useState<number | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('Barangay Clearance');
  const [newDocGender, setNewDocGender] = useState<'Male' | 'Female'>('Male');
  const [newDocCivilStatus, setNewDocCivilStatus] = useState('Single');
  const [newDocPurok, setNewDocPurok] = useState('Purok 1');
  const [newDocAge, setNewDocAge] = useState('');
  const [newDocAddress, setNewDocAddress] = useState('');
  const [newDocPurpose, setNewDocPurpose] = useState('');
  const [newDocDuration, setNewDocDuration] = useState('');
  const [newDocExtraFields, setNewDocExtraFields] = useState<Record<string, string>>({});

  const [newResFirstName, setNewResFirstName] = useState('');
  const [newResMiddleName, setNewResMiddleName] = useState('');
  const [newResLastName, setNewResLastName] = useState('');
  const [newResDOB, setNewResDOB] = useState('');
  const [newResPurok, setNewResPurok] = useState('');
  const [newResGender, setNewResGender] = useState<'Male' | 'Female'>('Male');
  const [newResPhone, setNewResPhone] = useState('');
  const [newResPassword, setNewResPassword] = useState('');
  const [newResEmail, setNewResEmail] = useState('');

  // New User Form State (First, Middle, Last Name)
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserMiddleName, setNewUserMiddleName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPass, setShowNewUserPass] = useState(false);
  const [newUserRole, setNewUserRole] = useState<'superadmin' | 'admin' | 'staff' | 'bhw' | 'resident'>('staff');
  const [newUserBarangay, setNewUserBarangay] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // User Directory tab & filter states
  const [userCategoryTab, setUserCategoryTab] = useState<'all' | 'officials' | 'residents' | 'archived'>('all');
  const [userBarangayFilter, setUserBarangayFilter] = useState('all');
  const [userSearchText, setUserSearchText] = useState('');

  // Edit User Modal State (Super Admin & Admin)
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState<'superadmin' | 'admin' | 'staff' | 'bhw' | 'resident'>('staff');
  const [editUserBarangay, setEditUserBarangay] = useState('Pianing');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserStatus, setEditUserStatus] = useState<'Active' | 'Inactive' | 'Archived'>('Active');

  // Reset Password Modal State
  const [resetPassUser, setResetPassUser] = useState<SystemUser | null>(null);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [newPassVal, setNewPassVal] = useState('123456');

  // Admin Profile Modal State
  const [isAdminProfileOpen, setIsAdminProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [showProfilePass, setShowProfilePass] = useState(false);

  // Staff Info Viewer Modal State (When admin clicks staff name)
  const [selectedStaffInfo, setSelectedStaffInfo] = useState<SystemUser | null>(null);

  // SMS Correction Notice Modal State (Notify applicant regarding ID, Birthday, Name, or Address discrepancy)
  const [smsApplicantModal, setSmsApplicantModal] = useState<PendingResident | null>(null);
  const [smsNoticeReason, setSmsNoticeReason] = useState('Invalid / Blurry ID Photo');
  const [smsCustomMessage, setSmsCustomMessage] = useState('');
  const [smsMarkAsRejected, setSmsMarkAsRejected] = useState(true);
  const [smsSending, setSmsSending] = useState(false);

  // Email & EmailJS Integration State
  const [emailJsSettings, setEmailJsSettings] = useState<EmailJsConfig>(() => getEmailJsConfig());
  const [emailJsTestTarget, setEmailJsTestTarget] = useState('');
  const [emailJsTestSending, setEmailJsTestSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ configured: boolean; mode: string; message: string; user: string | null } | null>(null);
  const [emailTestTarget, setEmailTestTarget] = useState('');
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [overdueData, setOverdueData] = useState<{ overdueImmunizations: any[]; overdueMaternalVisits: any[] } | null>(null);
  const [overdueLoading, setOverdueLoading] = useState(false);
  const [announcementEmailTitle, setAnnouncementEmailTitle] = useState('');
  const [announcementEmailBody, setAnnouncementEmailBody] = useState('');
  const [announcementEmailLoading, setAnnouncementEmailLoading] = useState(false);

  const handleSaveEmailJsSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveEmailJsConfig(emailJsSettings);
    toast.success('EmailJS settings saved successfully!');
  };

  const handleSendEmailJsTest = async () => {
    if (!emailJsTestTarget.includes('@')) {
      toast.error('Please enter a valid recipient email address.');
      return;
    }
    setEmailJsTestSending(true);
    try {
      const res = await sendEmailNotification({
        to_name: 'Resident Constituent',
        to_email: emailJsTestTarget.trim(),
        subject: '🧪 [Test] Barangay Pianing Smart System EmailJS Test',
        message: 'Mabuhay! This is an automated test message from the Barangay Pianing Smart Governance System powered by EmailJS (Service ID: service_6nk2ylj). If you received this email, automated resident notifications for approvals, clearance pick-up, and correction notices are active and working!',
        barangay: user?.barangay || 'Pianing',
        status: 'Operational'
      });
      if (res.success) {
        toast.success(`✅ Live test email sent to ${emailJsTestTarget}!`, {
          description: res.message
        });
      } else {
        toast.error(`Email delivery failed: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Failed to send test email: ${err?.message || 'Error'}`);
    } finally {
      setEmailJsTestSending(false);
    }
  };

  const loadEmailStatus = async () => {
    try {
      const status = await apiService.getEmailStatus();
      setEmailStatus(status);
    } catch (err) {
      console.warn('Email status fetch failed');
    }
  };

  const loadOverdueData = async () => {
    setOverdueLoading(true);
    try {
      const data = await apiService.getOverdueRecords();
      setOverdueData(data);
    } catch (err) {
      console.warn('Overdue data fetch failed');
    } finally {
      setOverdueLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!emailTestTarget.includes('@')) { toast.error('Enter a valid email address.'); return; }
    setEmailTestLoading(true);
    try {
      const result = await apiService.sendTestEmail(emailTestTarget);
      if (result.success) {
        toast.success(result.simulated ? '✅ Test email logged (simulation mode – configure .env to send live emails)' : '✅ Test email sent successfully!');
      } else {
        toast.error(`Email failed: ${result.error}`);
      }
    } catch (err) {
      toast.error('Email test failed. Check server connection.');
    } finally {
      setEmailTestLoading(false);
    }
  };

  const handleSendAnnouncementEmail = async () => {
    if (!announcementEmailTitle.trim() || !announcementEmailBody.trim()) {
      toast.error('Title and body are required.'); return;
    }
    setAnnouncementEmailLoading(true);
    try {
      // Collect all resident emails from loaded residents list
      const recipients = residents
        .filter(r => r.email && r.email.includes('@'))
        .map(r => ({ email: r.email!, name: `${r.first_name} ${r.last_name}` }));

      if (recipients.length === 0) {
        toast.error('No residents with email addresses found.'); return;
      }

      const result = await apiService.sendAnnouncementEmail({
        recipients,
        title: announcementEmailTitle,
        body: announcementEmailBody,
        sender: user?.name || 'Barangay Administration',
      });
      toast.success(`📧 Announcement sent! ${result.sent}/${result.total} delivered.`);
      setAnnouncementEmailTitle('');
      setAnnouncementEmailBody('');
    } catch (err) {
      toast.error('Failed to send announcement email.');
    } finally {
      setAnnouncementEmailLoading(false);
    }
  };

  // Category Management (Super Admin only)
  const [categories, setCategories] = useState<any[]>([
    { id: 1, name: 'Barangay Clearance', department: 'Barangay', description: 'Employment, legal transactions, identity verification', status: 'Active' },
    { id: 2, name: 'Certificate of Residency', department: 'Barangay', description: 'Proof of resident living in the barangay', status: 'Active' },
    { id: 3, name: 'Certificate of Indigency', department: 'Barangay', description: 'Financial, educational, and medical assistance', status: 'Active' },
    { id: 4, name: 'Business Permit', department: 'Barangay', description: 'Commercial sari-sari store & local business operations', status: 'Active' },
    { id: 5, name: 'Barangay ID', department: 'Barangay', description: 'Official community resident identification card', status: 'Active' },
    { id: 6, name: 'Medical Certificate', department: 'Health Center', description: 'Physician physical fitness and medical diagnosis', status: 'Active' },
    { id: 7, name: 'Health Clearance Certificate', department: 'Health Center', description: 'Sanitary and occupational health assessment', status: 'Active' },
    { id: 8, name: 'Immunization Card / Record', department: 'Health Center', description: 'Child infant immunization history', status: 'Active' },
    { id: 9, name: 'Maternal & Child Health Card', department: 'Health Center', description: 'Prenatal and postnatal pregnancy records', status: 'Active' }
  ]);

  const handleToggleCategoryStatus = async (catName: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await apiService.updateCategory(catName, newStatus);
      setCategories(prev => prev.map(c => c.name === catName ? { ...c, status: newStatus } : c));
      toast.success(`Category '${catName}' is now ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update category status');
    }
  };

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const activeBarangayParam = isSuperAdmin ? undefined : userBarangay;
      const [docsData, resData, usersData, statsData, pendingData, catData, logsData, schedData, aptsData] = await Promise.all([
        apiService.getDocuments(activeBarangayParam),
        apiService.getResidents(activeBarangayParam),
        apiService.getUsers(),
        apiService.getAdminStats(activeBarangayParam),
        apiService.getPendingResidents(activeBarangayParam),
        apiService.getCategories().catch(() => []),
        apiService.getActivityLogs().catch(() => []),
        apiService.getClinicSchedules(activeBarangayParam).catch(() => []),
        apiService.getAppointments({ barangay: activeBarangayParam }).catch(() => [])
      ]);
      setDocuments(docsData);
      setResidents(resData);
      setUsers(usersData);
      setStats(statsData);
      setPendingResidents(pendingData || []);
      if (schedData) setClinicSchedules(schedData);
      if (aptsData) setAppointments(aptsData);
      if (catData && catData.length > 0) {
        setCategories(catData);
      }
      if (logsData && logsData.length > 0) {
        setActivityLogs(logsData);
      }
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleTitle || !newScheduleDay || !newScheduleTime) {
      toast.error('Please fill in title, day of week, and time slot.');
      return;
    }

    try {
      const created = await apiService.createClinicSchedule({
        title: newScheduleTitle,
        service_type: newScheduleServiceType,
        day_of_week: newScheduleDay,
        time_slot: newScheduleTime,
        location: newScheduleLocation || 'Barangay Pianing Health Center',
        slots_available: Number(newScheduleSlots) || 20,
        bhw_in_charge: newScheduleBhw || user?.name || 'Assigned Staff',
        barangay: userBarangay || 'Pianing',
        created_by: user?.name || 'Staff'
      });

      setClinicSchedules(prev => [created, ...prev]);
      toast.success('Available Schedule Published!', {
        description: 'Residents can now choose this schedule when booking appointments.'
      });

      setIsPostScheduleModalOpen(false);
      setNewScheduleTitle('');
    } catch (err) {
      toast.error('Failed to publish schedule.');
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!confirm('Are you sure you want to remove this available schedule?')) return;
    try {
      await apiService.deleteClinicSchedule(id);
      setClinicSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Schedule removed successfully.');
    } catch {
      toast.error('Failed to delete schedule.');
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await apiService.getActivityLogs({
        barangay: logBarangayFilter !== 'All' ? logBarangayFilter : (user?.role === 'superadmin' ? undefined : userBarangay),
        action_type: logActionTypeFilter !== 'All' ? logActionTypeFilter : undefined,
        role: logRoleFilter !== 'All' ? logRoleFilter : undefined,
        search: logSearch || undefined
      });
      setActivityLogs(data);
      toast.success('Activity logs refreshed');
    } catch (err) {
      toast.error('Failed to refresh activity logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const handlePrintAuditReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print reports.');
      return;
    }
    const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Filter displayed logs
    const displayedLogs = activityLogs.filter(log => {
      if (!isSuperAdmin && log.barangay && log.barangay !== 'All (City-Wide)' && !log.barangay.toLowerCase().includes(userBarangay.toLowerCase())) {
        return false;
      }
      if (logBarangayFilter !== 'All' && log.barangay && !log.barangay.toLowerCase().includes(logBarangayFilter.toLowerCase()) && log.barangay !== 'All (City-Wide)') {
        return false;
      }
      if (logActionTypeFilter !== 'All' && (log.action_type || 'General') !== logActionTypeFilter) {
        return false;
      }
      if (logRoleFilter !== 'All' && log.user_role?.toLowerCase() !== logRoleFilter.toLowerCase()) {
        return false;
      }
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        const match = log.user_name?.toLowerCase().includes(q) ||
          log.action?.toLowerCase().includes(q) ||
          log.details?.toLowerCase().includes(q) ||
          log.user_role?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    const rowsHtml = displayedLogs.map((l, i) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 8.5pt;">${i + 1}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">
          <strong style="color: #0f172a;">${l.user_name}</strong><br/>
          <span style="font-size: 8pt; color: #64748b; text-transform: uppercase;">${l.user_role || 'STAFF'} &bull; ${l.barangay || 'Pianing'}</span>
        </td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">
          <strong style="color: #1e3a8a;">${l.action}</strong><br/>
          <span style="font-size: 8pt; color: #475569;">${l.details || 'Operational record'}</span>
        </td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">
          <span style="font-size: 7.5pt; font-weight: bold; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #334155; text-transform: uppercase;">
            ${l.action_type || 'General'}
          </span>
        </td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 8.5pt; white-space: nowrap; color: #475569;">
          ${l.timestamp}
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>System Audit & Activity Logs Report - ${today}</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; padding: 15px; line-height: 1.5; }
            .hdr-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
            .hdr-logo-box { width: 75px; height: 75px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .hdr-logo { width: 100%; height: 100%; object-fit: contain; }
            .header-text { text-align: center; flex: 1; padding: 0 10px; }
            .header-text h4 { margin: 0; font-size: 10pt; text-transform: uppercase; font-weight: normal; color: #475569; letter-spacing: 0.5px; }
            .header-text h3 { margin: 2px 0; font-size: 10.5pt; font-weight: 600; color: #334155; }
            .header-text h2 { margin: 3px 0 1px 0; font-size: 12.5pt; font-weight: bold; color: #0f172a; text-transform: uppercase; }
            .header-text h1 { margin: 3px 0 0 0; font-size: 15pt; font-weight: 900; letter-spacing: 1px; color: #1e3a8a; text-transform: uppercase; }
            .header-text p { margin: 3px 0 0 0; font-size: 8.5pt; color: #64748b; font-style: italic; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-family: sans-serif; font-size: 8.5pt; }
            th { background: #0f172a; color: white; padding: 8px; border: 1px solid #0f172a; text-align: left; font-size: 8pt; text-transform: uppercase; }
            td { padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 8pt; color: #334155; }
            .footer { margin-top: 35px; display: flex; justify-content: space-between; align-items: flex-end; font-family: sans-serif; font-size: 8.5pt; }
            .seal-box { border: 2px double #1e3a8a; border-radius: 50%; width: 75px; height: 75px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 6.5pt; font-weight: bold; color: #1e3a8a; text-transform: uppercase; margin: 0 auto; }
            .sig-block { text-align: center; width: 220px; }
            .sig-line { border-top: 1px solid #0f172a; margin-top: 35px; padding-top: 4px; font-weight: bold; text-transform: uppercase; font-size: 9.5pt; }
            .sig-title { font-size: 8.5pt; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="hdr-container">
            <div class="hdr-logo-box"><img src="${BUTUAN_LOGO_BASE64}" class="hdr-logo" alt="City of Butuan Seal" /></div>
            <div class="header-text">
              <h4>Republic of the Philippines</h4>
              <h3>Province of Agusan del Norte • City of Butuan</h3>
              <h2>BARANGAY PIANING</h2>
              <h1>OFFICIAL AUDIT TRAIL &amp; SYSTEM ACTIVITY LOGS</h1>
              <p>Barangay Pianing, Butuan City &bull; Generated: ${today} &bull; Total Filtered Records: ${displayedLogs.length}</p>
            </div>
            <div class="hdr-logo-box"><img src="${PIANING_LOGO_BASE64}" class="hdr-logo" alt="Barangay Pianing Seal" /></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th style="width: 180px;">Actor / System User</th>
                <th>Action &amp; Context Details</th>
                <th style="width: 110px; text-align: center;">Category</th>
                <th style="width: 140px;">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="5" style="text-align:center; padding: 25px; color: #64748b;">No activity logs recorded matching the specified criteria.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <div class="sig-block">
              <div class="sig-title" style="margin-bottom: 35px; font-weight: bold; text-align: left;">GENERATED BY:</div>
              <div class="sig-line">${user?.name || 'Administrator'}</div>
              <div class="sig-title">${user?.role === 'superadmin' ? 'Super Administrator' : user?.role === 'admin' ? 'Barangay Administrator' : 'Barangay Staff'} &bull; Pianing</div>
            </div>
            <div class="seal-box">
              OFFICIAL SEAL<br/>BARANGAY PIANING<br/>BUTUAN CITY
            </div>
            <div class="sig-block">
              <div class="sig-title" style="margin-bottom: 35px; font-weight: bold; text-align: left;">CERTIFIED &amp; APPROVED:</div>
              <div class="sig-line">HON. VIRGENIA S. GOLANDRINA</div>
              <div class="sig-title">Punong Barangay</div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
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

  const setNewDocField = (key: string, val: string) => {
    setNewDocExtraFields(prev => ({ ...prev, [key]: val }));
  };

  const handleSelectResidentForDoc = (val: string) => {
    setSelectedResidentForDoc(val);
    if (val === 'manual') {
      setNewDocResidentId(null);
      setNewDocName('');
      setNewDocGender('Male');
      setNewDocCivilStatus('Single');
      setNewDocPurok('Purok 1');
      setNewDocAge('');
      setNewDocAddress('');
      return;
    }
    const r = residents.find(res => String(res.id) === val);
    if (r) {
      setNewDocResidentId(r.id);
      setNewDocName(`${r.first_name} ${r.last_name}`.trim());
      setNewDocGender((r.gender === 'Female' ? 'Female' : 'Male') as any);
      setNewDocCivilStatus(r.civil_status || 'Single');
      setNewDocPurok(r.purok || 'Purok 1');
      setNewDocAge(r.age ? String(r.age) : '');
      setNewDocAddress(r.address || `Purok ${r.purok || '1'}, Barangay ${r.barangay || 'Pianing'}, Butuan City`);
    }
  };

  const handleNewDocTypeChange = (type: string) => {
    setNewDocType(type);
    if (type === 'Certificate of Land Occupancy' || type === 'Land Occupancy' || type === 'Actual Occupancy') {
      setNewDocExtraFields(prev => ({
        ...prev,
        'Land Area': prev['Land Area'] || 'Nine Hundred Thirty-One (931)',
        'Lot Number': prev['Lot Number'] || '1005',
        'Survey Info': prev['Survey Info'] || 'PLS-74',
        'Occupancy Since': prev['Occupancy Since'] || "1970's"
      }));
      setNewDocPurpose('whatever legal purposes it may serve best');
    } else if (type === 'Certificate of Employment') {
      setNewDocExtraFields(prev => ({
        ...prev,
        'Job Position': prev['Job Position'] || 'Barangay Worker',
        'Employer': prev['Employer'] || 'Barangay Pianing',
        'Start Date': prev['Start Date'] || 'January 2024',
        'End Date': prev['End Date'] || 'Present'
      }));
      setNewDocPurpose('statutory and official verification requirements');
    } else if (type === 'Business Clearance' || type === 'Business Permit') {
      setNewDocExtraFields(prev => ({
        ...prev,
        'Business Name': prev['Business Name'] || '',
        'Nature of Business': prev['Nature of Business'] || 'General Merchandise / Retail'
      }));
      setNewDocPurpose('Business Permit application');
    } else if (type === 'Certificate of Residency') {
      setNewDocExtraFields(prev => ({
        ...prev,
        'Duration of Residence': prev['Duration of Residence'] || '5 years'
      }));
      setNewDocPurpose('whatever legal purpose it may serve best');
    } else if (type === 'Good Moral Clearance') {
      setNewDocPurpose('employment application');
    }
  };

  const handleSaveAndPrintDoc = async (markAsCompleted = false) => {
    if (!newDocName.trim()) {
      toast.error('Resident name is required');
      return;
    }

    let finalPurpose = newDocPurpose;
    if (newDocType === 'Certificate of Land Occupancy' || newDocType === 'Actual Occupancy') {
      finalPurpose = 'whatever legal purposes it may serve best';
    } else if (newDocType === 'Certificate of Employment') {
      finalPurpose = 'statutory and official verification requirements';
    }

    const payloadExtra: Record<string, string> = {
      ...newDocExtraFields,
      'Gender': newDocGender,
      'Civil Status': newDocCivilStatus,
      'Purok / Location': newDocPurok,
      'Home Address': newDocAddress || `Purok ${newDocPurok}, Barangay Pianing, Butuan City`,
      'Age': newDocAge
    };

    try {
      const created = await apiService.createDocument({
        resident_id: newDocResidentId || undefined,
        resident_name: newDocName.trim(),
        document_type: newDocType,
        purpose: finalPurpose || 'Official Barangay Document',
        extra_fields: payloadExtra,
        status: markAsCompleted ? 'Completed' : 'Pending',
        processed_by: markAsCompleted ? (user?.name || 'Barangay Administrator') : undefined
      });

      const augmentedDoc = {
        ...created,
        resident_address: newDocAddress || `Purok ${newDocPurok}, Barangay Pianing, Butuan City`,
        resident_civil_status: newDocCivilStatus,
        resident_gender: newDocGender,
        resident_age: newDocAge,
        extra_fields: JSON.stringify(payloadExtra),
        status: markAsCompleted ? 'Completed' : 'Pending',
        processed_by: markAsCompleted ? (user?.name || 'Barangay Administrator') : undefined,
        processed_at: markAsCompleted ? new Date().toLocaleTimeString() : undefined
      };

      setDocuments([augmentedDoc as any, ...documents]);
      setIsAddDocOpen(false);

      if (markAsCompleted) {
        setStats(prev => ({ ...prev, processedToday: prev.processedToday + 1, activeRecords: prev.activeRecords + 1 }));
        toast.success(`Document Issued & Archived!`, {
          description: `Request Code: ${created.request_code} has been marked Completed and saved to Archive.`
        });
        openPrintModal(augmentedDoc as any);
      } else {
        setStats(prev => ({ ...prev, pendingDocs: prev.pendingDocs + 1, activeRecords: prev.activeRecords + 1 }));
        toast.success('Document request added to active queue', {
          description: `Request Code: ${created.request_code}`
        });
      }

      // Reset form
      setSelectedResidentForDoc('manual');
      setNewDocResidentId(null);
      setNewDocName('');
      setNewDocPurpose('');
      setNewDocExtraFields({});
    } catch (err) {
      toast.error('Could not issue document request');
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveAndPrintDoc(false);
  };

  const handleUpdateDocStatus = async (id: number, currentStatus: string) => {
    // Status flow: Pending → Processing → Ready for Pickup → Completed
    let nextStatus: string;
    if (currentStatus === 'Pending') nextStatus = 'Processing';
    else if (currentStatus === 'Processing') nextStatus = 'Ready for Pickup';
    else if (currentStatus === 'Ready for Pickup') nextStatus = 'Completed';
    else return; // Already completed, no action

    const targetDoc = documents.find(d => d.id === id);
    const resName = targetDoc?.resident_name || 'Resident';

    try {
      await apiService.updateDocumentStatus(id, nextStatus, user?.name || 'Admin Juan');
      setDocuments(documents.map(d => d.id === id ? { ...d, status: nextStatus as any, processed_at: new Date().toLocaleTimeString(), processed_by: user?.name || 'Admin Juan' } : d));
      
      if (nextStatus === 'Completed') {
        toast.success(`Document Completed & Archived!`, {
          description: `${resName}'s document has been marked as claimed and moved to archive.`
        });
      } else if (nextStatus === 'Ready for Pickup') {
        toast.success(`Document Ready for Pickup! 🎉`, {
          description: `📲 SMS sent to ${resName}: "Your document is signed & ready for release at the Barangay Hall."`
        });
      } else {
        toast.info(`Document is now being Processed`, {
          description: `📲 SMS sent to ${resName}: "Your document is now being processed by ${user?.name || 'Barangay Staff'}."`
        });
      }

      // Automated EmailJS Notification on Document Status Change
      if (targetDoc && (targetDoc as any).resident_email) {
        sendDocumentReadyEmail({
          resident_name: resName,
          resident_email: (targetDoc as any).resident_email,
          document_type: targetDoc.document_type,
          request_code: targetDoc.request_code,
          status: nextStatus,
          barangay: targetDoc.barangay || user?.barangay || 'Pianing'
        }).catch(() => {});
      }

      loadData();
    } catch (err) {
      toast.error('Failed to update document status');
    }
  };

  const handleArchiveDoc = async (id: number) => {
    try {
      await apiService.deleteDocument(id);
      setDocuments(documents.filter(d => d.id !== id));
      toast.success('Document request archived');
    } catch (err) {
      toast.error('Archive failed');
    }
  };

  const handleApproveResident = async (id: number) => {
    try {
      const applicant = pendingResidents.find(r => r.id === id);
      await apiService.approveResident(id, user?.name || 'Admin Juan');
      toast.success('Resident application approved! Account is now Verified.');

      // Automated EmailJS Notification to Resident on Verification
      if (applicant && applicant.email && applicant.email.includes('@')) {
        sendResidentApprovalEmail({
          name: applicant.name || `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() || 'Resident',
          email: applicant.email,
          barangay: applicant.barangay || user?.barangay || 'Pianing'
        }).then(res => {
          if (res.success) {
            toast.info(`📧 Verification email dispatched to ${applicant.email}`);
          }
        }).catch(() => {});
      }

      loadData();
    } catch (err) {
      toast.error('Failed to approve resident');
    }
  };

  const handleOpenRejectModal = (applicant: PendingResident) => {
    setSmsApplicantModal(applicant);
    const applicantName = applicant.name || `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() || 'Resident';
    setSmsNoticeReason('Invalid / Blurry ID Photo');
    setSmsCustomMessage(`Submitted Government ID photo is blurry or illegible. Please re-upload a clear photo of your valid ID.`);
    setSmsMarkAsRejected(true);
  };

  const handleNoticeReasonChange = (reason: string, applicant: PendingResident) => {
    setSmsNoticeReason(reason);
    switch (reason) {
      case 'Invalid / Blurry ID Photo':
        setSmsCustomMessage(`Submitted Government ID photo is blurry or illegible. Please re-upload a clear photo of your valid ID.`);
        break;
      case 'Name Mismatch':
        setSmsCustomMessage(`The registered name does not match the name on your submitted Government ID. Please check and correct your details.`);
        break;
      case 'Birthday Discrepancy':
        setSmsCustomMessage(`The Date of Birth provided does not match your official Government ID document. Please verify and register with your exact birthday.`);
        break;
      case 'Address Discrepancy':
        setSmsCustomMessage(`Your Purok/Barangay address could not be verified in the resident registry. Please bring proof of residency.`);
        break;
      case 'Custom Reason':
      default:
        setSmsCustomMessage(`Application requires revision: `);
        break;
    }
  };

  const handleSendSmsNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsApplicantModal) return;
    const applicant = smsApplicantModal;
    const phone = applicant.phone || '09170000000';
    const applicantName = applicant.name || `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() || 'Resident';
    const cause = smsCustomMessage.trim() || smsNoticeReason;

    setSmsSending(true);
    try {
      // 1. Mark resident as rejected with specific cause saved in database
      await apiService.rejectResident(applicant.id, cause);

      // 2. If SMS checkbox was selected by admin
      if (smsMarkAsRejected && phone && phone !== '09170000000') {
        try {
          await apiService.sendNotification({
            recipient_name: applicantName,
            recipient_phone: phone,
            type: 'Barangay Announcement',
            message: `Barangay Notice: Hello ${applicantName}, your account application was rejected. Cause: ${cause}. Please update your profile or re-upload your ID.`
          });
        } catch {}
      }

      toast.warning(`Application rejected: ${applicantName} notified`, {
        description: `Rejection cause has been sent to the resident's portal notification center.`
      });
      setSmsApplicantModal(null);
      loadData();
    } catch {
      toast.error('Failed to reject application');
    } finally {
      setSmsSending(false);
    }
  };

  const handleRejectResident = (id: number) => {
    const applicant = pendingResidents.find(r => r.id === id);
    if (applicant) {
      handleOpenRejectModal(applicant);
    } else {
      apiService.rejectResident(id).then(() => {
        toast.warning('Resident application marked for correction.');
        loadData();
      });
    }
  };

  const handleRejectWithDirectReason = async (id: number, reason: string) => {
    try {
      const applicant = pendingResidents.find(r => r.id === id);
      await apiService.rejectResident(id, reason);
      toast.warning('Correction / Resubmission notice dispatched to resident.', {
        description: `Reason: ${reason}`
      });

      // Automated EmailJS Correction Notice Email
      if (applicant && applicant.email && applicant.email.includes('@')) {
        sendResidentCorrectionEmail({
          name: applicant.name || `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() || 'Resident',
          email: applicant.email,
          barangay: applicant.barangay || user?.barangay || 'Pianing',
          reason
        }).then(res => {
          if (res.success) {
            toast.info(`📧 Correction instructions emailed to ${applicant.email}`);
          }
        }).catch(() => {});
      }

      loadData();
    } catch {
      toast.error('Failed to dispatch resubmission notice');
    }
  };

  const handleToggleResidentVerification = async (res: Resident) => {
    const isCurrentlyVerified = res.verification_status === 'Verified';
    const nextStatus = isCurrentlyVerified ? 'Unverified' : 'Verified';
    try {
      if (isCurrentlyVerified) {
        await apiService.unverifyResident(res.id, 'Unverified');
        toast.warning(`${res.first_name} ${res.last_name} is now UNVERIFIED. (Account remains intact in database)`);
      } else {
        await apiService.approveResident(res.id, user?.name);
        toast.success(`${res.first_name} ${res.last_name} has been VERIFIED.`);
      }
      loadData();
    } catch {
      toast.error('Failed to update verification status.');
    }
  };

  const handlePurgeResident = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this account registration? This action cannot be undone.')) return;
    try {
      await apiService.purgeResident(id);
      toast.success('Registration record purged successfully.');
      loadData();
    } catch {
      toast.error('Failed to delete registration record.');
    }
  };

  const handleCreateResident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResFirstName.trim() || !newResLastName.trim()) {
      toast.error('First Name and Last Name are required');
      return;
    }
    if (!newResDOB) {
      toast.error('Date of Birth is required');
      return;
    }
    if (!newResPhone.trim()) {
      toast.error('Contact Number is required');
      return;
    }
    const cleanPhone = newResPhone.replace(/\D/g, '');
    if (!/^09\d{9}$/.test(cleanPhone)) {
      toast.error('Invalid Contact Number format (must be 11 digits starting with 09)');
      return;
    }
    if (!newResPurok.trim()) {
      toast.error('Purok / Street Address is required');
      return;
    }

    // Auto-build address from dynamic purok + admin's current barangay
    const adminBarangay = user?.barangay || 'Pianing';
    const autoAddress = `${newResPurok.trim()}, Barangay ${adminBarangay}, Butuan City`;
    try {
      await apiService.createResident({
        first_name: newResFirstName.trim(),
        middle_name: newResMiddleName.trim(),
        last_name: newResLastName.trim(),
        date_of_birth: newResDOB,
        gender: newResGender,
        address: autoAddress,
        phone: cleanPhone,
        email: newResEmail.trim() || undefined,
        password: newResPassword.trim() || undefined
      } as any);
      // Reload to avoid duplicates (never manually push)
      const freshResidents = await apiService.getResidents();
      setResidents(freshResidents);
      setStats(prev => ({ ...prev, totalResidents: freshResidents.length }));
      toast.success('Resident registered successfully');
      setIsAddResidentOpen(false);
      setNewResFirstName('');
      setNewResMiddleName('');
      setNewResLastName('');
      setNewResDOB('');
      setNewResPurok('');
      setNewResPhone('');
      setNewResPassword('');
      setNewResEmail('');
    } catch (err) {
      toast.error('Could not register resident');
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    toast.loading('Refreshing barangay data...', { id: 'manual-refresh' });
    try {
      await loadData();
      toast.success('Barangay records are up to date!', { id: 'manual-refresh' });
    } catch {
      toast.error('Could not refresh data. Please check connection.', { id: 'manual-refresh' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserFirstName.trim() || !newUserLastName.trim() || !newUserEmail.trim()) {
      toast.error('First Name, Last Name, and Email are required');
      return;
    }

    const cleanPhone = newUserPhone.trim().replace(/\D/g, '');
    if (!cleanPhone) {
      toast.error('Mobile Phone Number is required. Enter an 11-digit PH mobile number.');
      return;
    }

    if (!/^09\d{9}$/.test(cleanPhone)) {
      toast.error('Invalid Philippine mobile number format! Must be exactly 11 digits starting with 09 (e.g. 09171234567).');
      return;
    }

    const cleanFirst = newUserFirstName.trim();
    const cleanMiddle = newUserMiddleName.trim();
    const cleanLast = newUserLastName.trim();
    const fullName = `${cleanFirst} ${cleanMiddle ? cleanMiddle + ' ' : ''}${cleanLast}`.trim();
    const assignedBarangay = user?.role === 'superadmin' ? (newUserBarangay || 'Pianing') : (user?.barangay || 'Pianing');

    // Role Access Rule: Only Super Admin can create Barangay Admin accounts
    if (newUserRole === 'admin' && !isSuperAdmin) {
      toast.error('Access Restricted: Only Super Admin can create Barangay Administrator accounts. You may create Staff and BHW accounts.');
      return;
    }

    // 1 Admin per Barangay rule check
    if (newUserRole === 'admin') {
      const existingAdmin = users.find(u =>
        u.role === 'admin' &&
        u.status === 'Active' &&
        (u.barangay || 'Pianing').toLowerCase().trim() === assignedBarangay.toLowerCase().trim()
      );
      if (existingAdmin) {
        toast.error(`Barangay ${assignedBarangay} already has an active Administrator (${existingAdmin.name}). Only 1 Admin per Barangay is allowed.`);
        return;
      }
    }

    try {
      const created = await apiService.createUser({
        name: fullName,
        email: newUserEmail.trim(),
        password: newUserPassword || '123',
        role: newUserRole === 'resident' ? 'staff' : newUserRole,
        status: 'Active',
        barangay: assignedBarangay,
        phone: cleanPhone
      });
      setUsers([created, ...users]);
      toast.success(`${newUserRole === 'admin' ? 'Administrator' : newUserRole.toUpperCase()} account created for Barangay ${assignedBarangay}`);
      setIsAddUserOpen(false);
      setNewUserFirstName('');
      setNewUserMiddleName('');
      setNewUserLastName('');
      setNewUserEmail('');
      setNewUserPassword('123');
      setNewUserPhone('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add user account');
    }
  };

  const handleUpdateAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileNewPassword) {
      if (!profileCurrentPassword) {
        toast.error('Current password is required to set a new password');
        return;
      }
      if (profileNewPassword !== profileConfirmPassword) {
        toast.error('New passwords do not match');
        return;
      }
      if (profileNewPassword.length < 4) {
        toast.error('New password must be at least 4 characters');
        return;
      }
      // verify current password
      try {
        const verify = await apiService.login(user.email, profileCurrentPassword);
        if (!verify?.success) {
          toast.error('Incorrect current password');
          return;
        }
      } catch {
        toast.error('Could not verify current password');
        return;
      }
    }

    try {
      await apiService.updateProfile({
        id: user?.id,
        email: user?.email,
        name: profileName.trim() !== user?.name ? profileName.trim() : undefined,
        phone: profilePhone.trim() || undefined,
        password: profileNewPassword || undefined
      });

      const updated = {
        ...user,
        name: profileName.trim() || user?.name,
        phone: profilePhone.trim() || user?.phone
      };
      setUser(updated);
      localStorage.setItem('barangay_user', JSON.stringify(updated));
      toast.success('Admin Profile & Security updated successfully!');
      setIsAdminProfileOpen(false);
    } catch (err) {
      toast.error('Failed to update profile');
    }
  };

  const handleArchiveUser = async (u: SystemUser) => {
    const isArchived = u.status === 'Archived';
    const nextStatus = isArchived ? 'Active' : 'Archived';
    try {
      await apiService.updateUser(u.id, { status: nextStatus });
      setUsers(users.map(item => item.id === u.id ? { ...item, status: nextStatus } : item));
      toast.success(isArchived ? `${u.name} account has been restored to Active.` : `${u.name} account has been moved to Archived.`);
    } catch (err) {
      toast.error('Archive action failed');
    }
  };

  const handleActivateUser = async (u: SystemUser) => {
    try {
      await apiService.updateUser(u.id, { status: 'Active' });
      setUsers(users.map(item => item.id === u.id ? { ...item, status: 'Active' } : item));
      toast.success(`${u.name} account is now ACTIVE and can log in.`);
    } catch {
      toast.error('Failed to activate account');
    }
  };

  const handleDeactivateUser = async (u: SystemUser) => {
    try {
      await apiService.updateUser(u.id, { status: 'Inactive' });
      setUsers(users.map(item => item.id === u.id ? { ...item, status: 'Inactive' } : item));
      toast.warning(`${u.name} account is now DEACTIVATED (login access blocked).`);
    } catch {
      toast.error('Failed to deactivate account');
    }
  };

  const handleToggleUserStatus = async (u: SystemUser) => {
    const nextStatus = u.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await apiService.updateUser(u.id, { status: nextStatus });
      setUsers(users.map(item => item.id === u.id ? { ...item, status: nextStatus } : item));
      toast.success(`Account status for ${u.name} set to ${nextStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleOpenEditUser = (u: SystemUser) => {
    setEditingUser(u);
    setEditUserName(u.name);
    setEditUserEmail(u.email);
    setEditUserRole(u.role);
    setEditUserBarangay(u.barangay || 'Pianing');
    setEditUserPhone(u.phone || '');
    setEditUserStatus(u.status || 'Active');
    setIsEditUserOpen(true);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const cleanEditPhone = editUserPhone.trim().replace(/\D/g, '');
    if (!cleanEditPhone) {
      toast.error('Mobile Phone Number is required.');
      return;
    }
    if (!/^09\d{9}$/.test(cleanEditPhone)) {
      toast.error('Invalid Philippine mobile number format! Must be exactly 11 digits starting with 09 (e.g. 09171234567).');
      return;
    }

    // 1 Admin per Barangay rule check
    if (editUserRole === 'admin') {
      const existingAdmin = users.find(u =>
        u.id !== editingUser.id &&
        u.role === 'admin' &&
        u.status === 'Active' &&
        (u.barangay || 'Pianing').toLowerCase().trim() === editUserBarangay.toLowerCase().trim()
      );
      if (existingAdmin) {
        toast.error(`Barangay ${editUserBarangay} already has an active Administrator (${existingAdmin.name}). Only 1 Admin per Barangay is allowed.`);
        return;
      }
    }

    try {
      await apiService.updateUser(editingUser.id, {
        name: editUserName.trim(),
        email: editUserEmail.trim(),
        role: editUserRole,
        barangay: editUserBarangay,
        phone: cleanEditPhone,
        status: editUserStatus
      });
      setUsers(users.map(u => u.id === editingUser.id ? {
        ...u,
        name: editUserName.trim(),
        email: editUserEmail.trim(),
        role: editUserRole,
        barangay: editUserBarangay,
        phone: cleanEditPhone,
        status: editUserStatus
      } : u));
      toast.success('User details updated successfully');
      setIsEditUserOpen(false);
      setEditingUser(null);
    } catch {
      toast.error('Failed to update user details');
    }
  };

  const handleOpenResetPassword = (u: SystemUser) => {
    setResetPassUser(u);
    setNewPassVal('123456');
    setIsResetPassOpen(true);
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUser) return;
    try {
      const res = await apiService.resetUserPassword(resetPassUser.id, newPassVal);
      toast.success(res?.message || `Password successfully reset to: ${newPassVal}`);
      setIsResetPassOpen(false);
      setResetPassUser(null);
    } catch {
      toast.error('Failed to reset user password');
    }
  };

  const handleExportUsersCsv = () => {
    const dataToExport = users
      .filter(u => {
        if (isSuperAdmin) return true;
        if (user?.role === 'admin') {
          if (u.role === 'superadmin' || u.role === 'resident') return false;
          const uBrgy = (u.barangay || (u.email?.toLowerCase().includes('anticala') ? 'Anticala' : 'Pianing')).toLowerCase().trim();
          if (uBrgy !== currentAdminBarangay) return false;
          return true;
        }
        return false;
      })
      .map(u => ({
        ID: u.id,
        Name: u.name,
        Email: u.email,
        Role: u.role.toUpperCase(),
        Barangay: u.barangay || 'Pianing',
        Phone: u.phone || '—',
        Status: u.status,
        Last_Login: (u as any).last_login ? new Date((u as any).last_login).toLocaleString() : 'Never',
        Verification: (u as any).verification_status || 'Verified'
      }));
    printOfficialReport({
      title: 'Barangay User Directory',
      subtitle: `Exported on ${new Date().toLocaleDateString()} — All system user accounts`,
      preparedBy: user?.name || 'Administrator',
      preparedByTitle: user?.role === 'superadmin' ? 'Super Administrator' : user?.role === 'staff' ? 'Barangay Staff' : 'Barangay Administrator',
      tables: [{
        title: 'User Account Directory',
        headers: ['ID', 'Name', 'Email', 'Role', 'Barangay', 'Status', 'Last Login'],
        rows: dataToExport.map(u => [u.ID, u.Name, u.Email, u.Role, u.Barangay, u.Status, u.Last_Login])
      }]
    });
    toast.success('User directory opened as printable PDF report');
  };

  const handleLogout = () => {
    localStorage.removeItem('barangay_user');
    toast.info('Logged out of Admin Portal');
    navigate('/login');
  };

  // Check if a system user account is visible to the current administrator
  const isUserForAdmin = (u: SystemUser) => {
    if (isSuperAdmin) return true;
    if (user?.role === 'admin') {
      if (u.role === 'superadmin') return false;
      const uBrgy = (u.barangay || (u.email?.toLowerCase().includes('anticala') ? 'Anticala' : 'Pianing')).toLowerCase().trim();
      if (uBrgy !== currentAdminBarangay) return false;
      return true; // allows admin, staff, bhw, and resident!
    }
    return false;
  };

  // Check if an address or record belongs to current admin's barangay
  const belongsToMyBarangay = (itemAddressOrBarangay?: string, itemEmail?: string, itemBarangay?: string) => {
    if (isSuperAdmin) return true;
    if (!currentAdminBarangay) return false;

    // Direct barangay field match
    if (itemBarangay) {
      return itemBarangay.toLowerCase().trim() === currentAdminBarangay;
    }

    // Direct address field check
    if (itemAddressOrBarangay) {
      const target = itemAddressOrBarangay.toLowerCase().trim();
      if (target.includes(currentAdminBarangay)) return true;
      return false;
    }

    // Email check
    if (itemEmail) {
      const targetEm = itemEmail.toLowerCase().trim();
      if (targetEm.includes(currentAdminBarangay)) return true;
    }

    return false;
  };

  // Filtered lists — Documents tab shows ONLY active requests for this barangay
  const isDocForMyBarangay = (doc: DocumentRequest) => {
    if (isSuperAdmin) return true;
    if (!currentAdminBarangay) return false;

    if ((doc as any).barangay) {
      return (doc as any).barangay.toLowerCase().trim() === currentAdminBarangay;
    }
    const res = residents.find(r => 
      (doc.resident_id && r.id === doc.resident_id) || 
      ((doc as any).email && r.email && r.email.toLowerCase() === (doc as any).email.toLowerCase()) ||
      (`${r.first_name} ${r.last_name}`.toLowerCase() === (doc.resident_name || '').toLowerCase())
    );
    if (res) {
      return belongsToMyBarangay(res.address || (res as any).barangay, res.email, (res as any).barangay);
    }
    if ((doc as any).resident_address) {
      return ((doc as any).resident_address || '').toLowerCase().includes(currentAdminBarangay);
    }
    return false;
  };

  const barangayDocs = documents.filter(isDocForMyBarangay);
  const activeDocuments = barangayDocs.filter(doc => doc.status === 'Pending' || doc.status === 'Processing' || doc.status === 'Ready for Pickup');
  const filteredDocuments = activeDocuments.filter(doc => {
    const matchesSearch = doc.resident_name.toLowerCase().includes(docSearch.toLowerCase()) ||
                          doc.request_code.toLowerCase().includes(docSearch.toLowerCase()) ||
                          doc.document_type.toLowerCase().includes(docSearch.toLowerCase());
    return matchesSearch;
  });

  // Archive lists — processed/completed records that moved out of the active queue
  const [archiveDocSearch, setArchiveDocSearch] = useState('');
  const [archiveDocTypeFilter, setArchiveDocTypeFilter] = useState('all');
  const archivedDocuments = barangayDocs.filter(doc => doc.status === 'Completed');
  const filteredArchivedDocs = archivedDocuments.filter(doc => {
    const matchesSearch = doc.resident_name.toLowerCase().includes(archiveDocSearch.toLowerCase()) ||
                          doc.request_code.toLowerCase().includes(archiveDocSearch.toLowerCase()) ||
                          doc.document_type.toLowerCase().includes(archiveDocSearch.toLowerCase());
    const matchesType = archiveDocTypeFilter === 'all' || doc.document_type === archiveDocTypeFilter;
    return matchesSearch && matchesType;
  });

  // Resident Records — strictly isolated by barangay
  const barangayResidents = residents.filter(res => belongsToMyBarangay(res.address || (res as any).barangay));
  const filteredResidents = barangayResidents.filter(res =>
    `${res.first_name} ${res.last_name}`.toLowerCase().includes(residentSearch.toLowerCase()) ||
    (res.address || '').toLowerCase().includes(residentSearch.toLowerCase()) ||
    (res.email || '').toLowerCase().includes(residentSearch.toLowerCase()) ||
    (res.phone || '').toLowerCase().includes(residentSearch.toLowerCase())
  );

  // Pending resident approvals — strictly isolated by barangay
  const myPendingResidents = pendingResidents.filter(res => belongsToMyBarangay(res.address || (res as any).barangay, res.email, (res as any).barangay));

  // Dynamic Barangay-scoped Stats
  const brgyPendingDocsCount = barangayDocs.filter(d => d.status === 'Pending' || d.status === 'Processing' || d.status === 'Ready for Pickup').length;
  const brgyProcessedCount = barangayDocs.filter(d => d.status === 'Completed').length;
  const brgyTotalResidentsCount = barangayResidents.length;
  const brgyActiveRecordsCount = barangayDocs.length;


  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    // Barangay-specific tabs (not for Super Admin)
    ...(!isSuperAdmin ? [{ id: 'approvals', label: 'Pending Approvals', icon: CheckCircle }] : []),
    ...(!isSuperAdmin ? [{ id: 'documents', label: 'Document Processing', icon: InboxIcon }] : []),
    ...(!isSuperAdmin ? [{ id: 'records', label: 'Resident Records', icon: FolderOpen }] : []),
    // Staff members do NOT have System Management (User Accounts) or Activity History Logs permission
    ...(!isStaff ? [{ id: 'users', label: isSuperAdmin ? 'User Directory' : 'User Accounts', icon: Users }] : []),
    { id: 'reports', label: 'System Reports', icon: BarChart },
    ...(!isStaff ? [{ id: 'logs', label: isSuperAdmin ? 'System Audit & History Logs' : 'Activity History Logs', icon: History }] : []),
    { id: 'archive', label: 'Settings & Data Archive', icon: Settings },
    ...(isSuperAdmin ? [{ id: 'categories', label: 'Category Manager', icon: Tag }] : []),
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
              <div className="w-9 h-9 rounded-full overflow-hidden bg-white shadow-xs border border-indigo-200 flex items-center justify-center">
                <img src="/assets/pianing-logo.png" alt="Barangay Pianing" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Barangay Pianing</h1>
                <span className="text-xs text-indigo-600 font-semibold">Admin Portal</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Alert Indicator */}
            {(!isSuperAdmin && (myPendingResidents.length > 0 || activeDocuments.length > 0)) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab(myPendingResidents.length > 0 ? 'approvals' : 'documents')}
                className="relative flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100 font-semibold cursor-pointer shadow-2xs"
                title={`${myPendingResidents.length} Pending Resident Approvals, ${activeDocuments.length} Active Document Requests`}
              >
                <Bell size={14} className="text-amber-600 animate-bounce" />
                <span className="hidden sm:inline">Alerts</span>
                <span className="bg-red-600 text-white text-[10px] font-extrabold rounded-full px-1.5 py-0.2 min-w-[18px] text-center shadow-xs animate-pulse">
                  {myPendingResidents.length + activeDocuments.length}
                </span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setProfileName(user?.name || '');
                setProfilePhone(user?.phone || '');
                setProfileCurrentPassword('');
                setProfileNewPassword('');
                setProfileConfirmPassword('');
                setIsAdminProfileOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-semibold cursor-pointer"
            >
              <UserCircle size={15} />
              <span className="hidden md:inline">{user?.name || 'Admin Profile'}</span>
            </Button>

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
        {/* Sticky Sidebar Navigation */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col py-4 shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto`}>
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
                {sidebarOpen && item.id === 'approvals' && myPendingResidents.length > 0 && (
                  <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 h-4 border-0 font-bold">
                    {myPendingResidents.length}
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
                      <h3 className="text-lg font-bold text-white">System-Wide Super Administrator Control</h3>
                      <p className="text-xs text-indigo-200/80 max-w-2xl">
                        Comprehensive administrative oversight across all system users, account permissions, activity tracking, and system audit logs.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Header Title */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Barangay {user?.barangay || 'Pianing'} Administrative Dashboard
                  </h2>
                  <p className="text-xs text-slate-500">Real-time overview of document clearance requests, resident profiles, and administrative services.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing || loading}
                    className="gap-1.5 text-xs cursor-pointer hover:bg-slate-50 border-slate-200 shadow-xs"
                    title="Refresh all barangay records"
                  >
                    <RefreshCcw size={13} className={isRefreshing || loading ? "animate-spin text-indigo-600" : ""} />
                    <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                  </Button>

                  {!isSuperAdmin && (
                    <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm cursor-pointer">
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
                  )}
                </div>
              </div>

              {/* Pending Resident Approvals Alert Banner (Barangay Admins only) */}
              {!isSuperAdmin && myPendingResidents.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-300 dark:border-amber-700/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <UserCheck size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {myPendingResidents.length} Pending Resident Account {myPendingResidents.length > 1 ? 'Registrations' : 'Registration'}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        New resident submitted government ID for account verification in Barangay {user?.barangay || 'Pianing'}. Review &amp; approve to unlock online requests.
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

              {/* Stats Cards — 4 columns */}
              {isSuperAdmin ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Super Admin Card 1: Total System Accounts */}
                  <Card className="border-l-4 border-l-indigo-500 border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Total System Users</p>
                          <h3 className="text-3xl font-black text-slate-900 mt-1">{users.length}</h3>
                          <p className="text-[11px] text-indigo-600 font-medium mt-1">All barangay accounts</p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                          <Users size={22} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Super Admin Card 2: Barangay Administrators */}
                  <Card className="border-l-4 border-l-blue-500 border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Barangay Admins</p>
                          <h3 className="text-3xl font-black text-slate-900 mt-1">{users.filter(u => u.role === 'admin').length}</h3>
                          <p className="text-[11px] text-blue-600 font-medium mt-1">Active barangay heads</p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <Shield size={22} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Super Admin Card 3: Barangay Staff & BHWs */}
                  <Card className="border-l-4 border-l-emerald-500 border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Staff &amp; Health Workers</p>
                          <h3 className="text-3xl font-black text-slate-900 mt-1">{users.filter(u => u.role === 'staff' || u.role === 'bhw').length}</h3>
                          <p className="text-[11px] text-emerald-600 font-medium mt-1">Operational personnel</p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <UserCheck size={22} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Super Admin Card 4: Audit Logs */}
                  <Card className="border-l-4 border-l-purple-500 border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('logs')}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">System Audit Logs</p>
                          <h3 className="text-3xl font-black text-slate-900 mt-1">{activityLogs.length}</h3>
                          <p className="text-[11px] text-purple-600 font-medium mt-1">Click to view audit trail →</p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                          <History size={22} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Pending Document Requests */}
                  <Card className="border-l-4 border-l-amber-400 border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Pending Requests</p>
                          <h3 className="text-3xl font-black text-slate-900 mt-1">{brgyPendingDocsCount}</h3>
                          <p className="text-[11px] text-amber-600 font-medium mt-1">
                            {brgyPendingDocsCount === 0 ? 'Queue is clear ✓' : `${brgyPendingDocsCount} awaiting action`}
                          </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                          <Clock size={22} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 2: Completed Documents */}
                  <Card className="border-l-4 border-l-emerald-400 border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Documents Issued</p>
                          <h3 className="text-3xl font-black text-slate-900 mt-1">{brgyProcessedCount}</h3>
                          <p className="text-[11px] text-emerald-600 font-medium mt-1">
                            {brgyProcessedCount > 0 ? `${brgyProcessedCount} completed` : 'None yet this period'}
                          </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <CheckCircle size={22} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 3: Total Registered Residents */}
                  <Card className="border-l-4 border-l-blue-400 border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Registered Residents</p>
                          <h3 className="text-3xl font-black text-slate-900 mt-1">{brgyTotalResidentsCount}</h3>
                          <p className="text-[11px] text-blue-600 font-medium mt-1">Barangay {user?.barangay || 'Pianing'}</p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <Users size={22} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 4: Pending Approvals */}
                  <Card className="border-l-4 border-l-rose-400 border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('approvals')}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Pending Approvals</p>
                          <h3 className="text-3xl font-black text-slate-900 mt-1">{myPendingResidents.length}</h3>
                          <p className="text-[11px] text-rose-600 font-medium mt-1">
                            {myPendingResidents.length === 0 ? 'All residents verified ✓' : 'Click to review →'}
                          </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <UserCheck size={22} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Overview Quick View Section */}
              {isSuperAdmin ? (
                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">Recent System Activity Audit Logs</CardTitle>
                      <CardDescription className="text-xs">Live activity log stream across all barangay users and administrators</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('logs')} className="text-indigo-600 text-xs font-semibold">
                      View Full Audit Trail →
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-xs">Timestamp</TableHead>
                          <TableHead className="text-xs">Actor / User</TableHead>
                          <TableHead className="text-xs">Role</TableHead>
                          <TableHead className="text-xs">Barangay</TableHead>
                          <TableHead className="text-xs">Action Performed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activityLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-xs py-8 text-slate-400">
                              No activity logs recorded yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          activityLogs.slice(0, 6).map((log, idx) => (
                            <TableRow key={`sa-ov-log-${log.id}-${idx}`} className="text-xs">
                              <TableCell className="font-mono text-slate-500 text-[11px]">
                                {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                              </TableCell>
                              <TableCell className="font-semibold text-slate-900">{log.user_name || 'System'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                  {log.user_role || 'User'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-600">{log.barangay || 'Pianing'}</TableCell>
                              <TableCell className="text-slate-700 font-medium">{log.action}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">Recent Document Requests</CardTitle>
                      <CardDescription className="text-xs">Active clearance requests for Barangay {user?.barangay || 'Pianing'}</CardDescription>
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
                        {barangayDocs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-xs py-8 text-slate-400">
                              No document requests found for Barangay {user?.barangay || 'Pianing'}.
                            </TableCell>
                          </TableRow>
                        ) : (
                          barangayDocs.slice(0, 5).map((doc, idx) => (
                            <TableRow key={`quick-doc-${doc.id}-${idx}`} className="text-xs">
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
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* TAB: PENDING APPROVALS */}
          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Resident Account Approvals</h2>
                    <Badge className="bg-amber-500 text-white text-xs">{myPendingResidents.length} Pending</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Review submitted Government IDs from residents of Barangay {user?.barangay || 'Pianing'} who created an account. Approve to unlock online certificate & clearance requests.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing || loading}
                  className="gap-1.5 text-xs cursor-pointer hover:bg-slate-50 border-slate-200 shadow-xs"
                >
                  <RefreshCcw size={13} className={isRefreshing || loading ? "animate-spin text-indigo-600" : ""} />
                  <span>{isRefreshing ? 'Refreshing...' : 'Refresh List'}</span>
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
                      {myPendingResidents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-xs py-12 text-slate-400">
                            <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500 opacity-80" />
                            No pending resident account applications! All registrations have been reviewed.
                          </TableCell>
                        </TableRow>
                      ) : (
                        myPendingResidents.map((r, idx) => (
                          <TableRow key={`pending-res-${r.id}-${idx}`} className="text-xs hover:bg-slate-50/50">
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
                                  variant="outline"
                                  onClick={() => openApplicantReview(r)}
                                  className="h-7 text-[11px] gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-semibold cursor-pointer"
                                  title="View full applicant details, inspect ID, and accept or request correction"
                                >
                                  <Eye size={12} />
                                  Review
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveResident(r.id)}
                                  className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold cursor-pointer"
                                  title="Approve and verify resident account"
                                >
                                  <Check size={12} />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handlePurgeResident(r.id)}
                                  className="h-7 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
                                  title="Permanently delete fake or spam account"
                                >
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
                    Showing <strong>{activeDocuments.length}</strong> active request{activeDocuments.length !== 1 ? 's' : ''} (Pending, In Preparation &amp; Ready for Pickup). Once signed and claimed, documents move to the <button onClick={() => setActiveTab('archive')} className="underline font-semibold hover:text-indigo-900 cursor-pointer">Archive tab</button>.
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
                  <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-base font-bold text-slate-900">Issue &amp; Process Barangay Document</DialogTitle>
                      <DialogDescription className="text-xs text-slate-500">
                        Fill in document parameters, auto-fill resident profile, and print or archive directly into completed records.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateDocument} className="space-y-4 py-2 text-xs">
                      {/* 1. Select Resident or Manual Walk-in */}
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">Select Resident (Auto-fills Demographics)</Label>
                        <Select value={selectedResidentForDoc} onValueChange={handleSelectResidentForDoc}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Choose a registered resident or manual..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            <SelectItem value="manual">✍️ Manual / Walk-in Constituent</SelectItem>
                            {residents.map(r => (
                              <SelectItem key={`res-opt-${r.id}`} value={String(r.id)}>
                                {r.first_name} {r.last_name} ({r.purok ? (r.purok.startsWith('Purok') ? r.purok : `Purok ${r.purok}`) : 'Pianing'} • {r.gender})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 2. Resident Profile Card */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">Resident Information</span>
                          <span className="text-[10px] text-slate-400">Used for certificate variables</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-600">Full Name <span className="text-red-500">*</span></Label>
                            <Input
                              value={newDocName}
                              onChange={e => setNewDocName(e.target.value)}
                              placeholder="e.g. Juan Dela Cruz"
                              required
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-slate-600">Gender</Label>
                              <Select value={newDocGender} onValueChange={(v: any) => setNewDocGender(v)}>
                                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Male">Male</SelectItem>
                                  <SelectItem value="Female">Female</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-slate-600">Civil Status</Label>
                              <Select value={newDocCivilStatus} onValueChange={setNewDocCivilStatus}>
                                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Single">Single</SelectItem>
                                  <SelectItem value="Married">Married</SelectItem>
                                  <SelectItem value="Widowed">Widowed</SelectItem>
                                  <SelectItem value="Separated">Separated</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-600">Purok / Zone</Label>
                            <Input
                              value={newDocPurok}
                              onChange={e => setNewDocPurok(e.target.value)}
                              placeholder="e.g. Purok 1"
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-600">Age / Date of Birth</Label>
                            <Input
                              value={newDocAge}
                              onChange={e => setNewDocAge(e.target.value)}
                              placeholder="e.g. 28 yrs old"
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 3. Document Type Selection */}
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">Document Type <span className="text-red-500">*</span></Label>
                        <Select value={newDocType} onValueChange={handleNewDocTypeChange}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Barangay Clearance">Barangay Clearance</SelectItem>
                            <SelectItem value="Certificate of Residency">Certificate of Residency</SelectItem>
                            <SelectItem value="Certificate of Indigency">Certificate of Indigency</SelectItem>
                            <SelectItem value="Good Moral Clearance">Good Moral Clearance</SelectItem>
                            <SelectItem value="Business Clearance">Business Clearance</SelectItem>
                            <SelectItem value="Business Permit">Business Permit</SelectItem>
                            <SelectItem value="Certificate of Employment">Certificate of Employment</SelectItem>
                            <SelectItem value="Certificate of Land Occupancy">Certificate of Land Occupancy (Actual Occupancy)</SelectItem>
                            <SelectItem value="Barangay ID">Barangay ID</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 4. Dynamic Document Fields (Matches Resident Portal exactly) */}
                      {/* For Certificate of Land Occupancy */}
                      {(newDocType === 'Certificate of Land Occupancy' || newDocType === 'Actual Occupancy') && (
                        <div className="space-y-2.5 bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                          <span className="font-bold text-amber-900 text-[11px] uppercase tracking-wide">Land Occupancy Details</span>
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-700">Parcel Land Area (in Words &amp; Figures) <span className="text-red-500">*</span></Label>
                            <Input
                              value={newDocExtraFields['Land Area'] || ''}
                              onChange={e => setNewDocField('Land Area', e.target.value)}
                              placeholder="e.g. Nine Hundred Thirty-One (931)"
                              required
                              className="h-8 text-xs bg-white"
                            />
                            <p className="text-[10px] text-slate-400">e.g. Nine Hundred Thirty-One (931)</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-700">Lot Number (Lot #) <span className="text-red-500">*</span></Label>
                              <Input
                                value={newDocExtraFields['Lot Number'] || ''}
                                onChange={e => setNewDocField('Lot Number', e.target.value)}
                                placeholder="e.g. 1005"
                                required
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-700">Survey Info</Label>
                              <Input
                                value={newDocExtraFields['Survey Info'] || ''}
                                onChange={e => setNewDocField('Survey Info', e.target.value)}
                                placeholder="e.g. PLS-74"
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-700">Year Started <span className="text-red-500">*</span></Label>
                            <Input
                              value={newDocExtraFields['Occupancy Since'] || ''}
                              onChange={e => setNewDocField('Occupancy Since', e.target.value)}
                              placeholder="e.g. 1970's (or 1995)"
                              required
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* For Certificate of Employment */}
                      {newDocType === 'Certificate of Employment' && (
                        <div className="space-y-2.5 bg-blue-50/70 border border-blue-200 rounded-xl p-3">
                          <span className="font-bold text-blue-900 text-[11px] uppercase tracking-wide">Employment Details</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-700">Job Position <span className="text-red-500">*</span></Label>
                              <Input
                                value={newDocExtraFields['Job Position'] || ''}
                                onChange={e => setNewDocField('Job Position', e.target.value)}
                                placeholder="e.g. Barangay Tanod"
                                required
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-700">Employer / Office <span className="text-red-500">*</span></Label>
                              <Input
                                value={newDocExtraFields['Employer'] || ''}
                                onChange={e => setNewDocField('Employer', e.target.value)}
                                placeholder="e.g. Barangay Pianing"
                                required
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-700">Start Date <span className="text-red-500">*</span></Label>
                              <Input
                                value={newDocExtraFields['Start Date'] || ''}
                                onChange={e => setNewDocField('Start Date', e.target.value)}
                                placeholder="e.g. January 2022"
                                required
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-700">End Date <span className="text-red-500">*</span></Label>
                              <Input
                                value={newDocExtraFields['End Date'] || ''}
                                onChange={e => setNewDocField('End Date', e.target.value)}
                                placeholder="e.g. Present"
                                required
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* For Business Clearance / Permit */}
                      {(newDocType === 'Business Clearance' || newDocType === 'Business Permit') && (
                        <div className="space-y-2 bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
                          <span className="font-bold text-emerald-900 text-[11px] uppercase tracking-wide">Business Details</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-700">Business / Store Name <span className="text-red-500">*</span></Label>
                              <Input
                                value={newDocExtraFields['Business Name'] || ''}
                                onChange={e => setNewDocField('Business Name', e.target.value)}
                                placeholder="e.g. Dela Cruz Store"
                                required
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-700">Nature of Business</Label>
                              <Input
                                value={newDocExtraFields['Nature of Business'] || ''}
                                onChange={e => setNewDocField('Nature of Business', e.target.value)}
                                placeholder="e.g. Sari-sari / Retail"
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* For Certificate of Residency */}
                      {newDocType === 'Certificate of Residency' && (
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-700">Years of Residency / Living in Barangay</Label>
                          <Input
                            value={newDocExtraFields['Duration of Residence'] || ''}
                            onChange={e => setNewDocField('Duration of Residence', e.target.value)}
                            placeholder="e.g. 5 years (or since 2019)"
                            className="h-8 text-xs"
                          />
                        </div>
                      )}

                      {/* Purpose */}
                      {newDocType !== 'Certificate of Employment' && newDocType !== 'Certificate of Land Occupancy' && newDocType !== 'Actual Occupancy' && (
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">
                            {newDocType === 'Good Moral Clearance' ? 'Purpose / Application To Support' : 'State Purpose'} <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={newDocPurpose}
                            onChange={e => setNewDocPurpose(e.target.value)}
                            placeholder={newDocType === 'Good Moral Clearance' ? 'e.g. Employment application / PRC Board Examination' : 'e.g. Bank Account / Loan / School Requirement'}
                            required
                            className="h-8 text-xs"
                          />
                        </div>
                      )}

                      <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSaveAndPrintDoc(false)}
                          className="text-xs border-slate-300 hover:bg-slate-50 w-full sm:w-auto"
                        >
                          Save to Active Queue (Pending)
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleSaveAndPrintDoc(true)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm w-full sm:w-auto"
                        >
                          <Printer size={13} />
                          Save, Print &amp; Archive (Completed)
                        </Button>
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
                  onClick={() => printOfficialReport({
                    title: 'Active Document Requests',
                    subtitle: `Barangay ${user?.barangay || 'Pianing'} — Active Clearance Queue`,
                    preparedBy: user?.name || 'Admin',
                    preparedByTitle: 'Barangay Administrator',
                    tables: [{
                      title: 'Document Requests',
                      headers: ['Code', 'Resident', 'Document Type', 'Purpose', 'Status', 'Requested At'],
                      rows: filteredDocuments.map(d => [d.request_code || '-', d.resident_name || '-', d.document_type || '-', d.purpose || '-', d.status || '-', d.requested_at || '-'])
                    }]
                  })}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 h-9 border-slate-300 hover:bg-slate-50"
                >
                  <Download size={14} /> Export PDF
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
                        filteredDocuments.map((doc, idx) => (
                          <TableRow key={`filter-doc-${doc.id}-${idx}`} className="text-xs">
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
                                doc.status === 'Ready for Pickup' ? 'bg-indigo-600' :
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
                                {doc.status === 'Pending' && (
                                  <Button size="sm" onClick={() => handleUpdateDocStatus(doc.id, doc.status)} className="h-7 text-[11px] gap-1 bg-amber-500 hover:bg-amber-600 text-white shadow-sm font-semibold">
                                    <RefreshCcw size={12} />
                                    Process
                                  </Button>
                                )}
                                {doc.status === 'Processing' && (
                                  <Button size="sm" onClick={() => handleUpdateDocStatus(doc.id, doc.status)} className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold">
                                    <CheckCircle size={12} />
                                    Ready for Pickup
                                  </Button>
                                )}
                                {doc.status === 'Ready for Pickup' && (
                                  <Button size="sm" onClick={() => handleUpdateDocStatus(doc.id, doc.status)} className="h-7 text-[11px] gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold">
                                    <Check size={12} />
                                    Mark Claimed
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => handleArchiveDoc(doc.id)} className="h-7 text-[11px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" title="Archive document request">
                                  <Archive size={13} />
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
                  onClick={() => printOfficialReport({
                    title: 'Completed Documents Archive',
                    subtitle: `Barangay ${user?.barangay || 'Pianing'} — Archived & Completed Records`,
                    preparedBy: user?.name || 'Admin',
                    preparedByTitle: 'Barangay Administrator',
                    tables: [{
                      title: 'Completed Document Records',
                      headers: ['Code', 'Resident', 'Document Type', 'Purpose', 'Status', 'Completed At'],
                      rows: archivedDocuments.map(d => [d.request_code || '-', d.resident_name || '-', d.document_type || '-', d.purpose || '-', d.status || '-', d.processed_at || d.requested_at || '-'])
                    }]
                  })}
                  variant="outline" size="sm" className="text-xs gap-1.5 border-slate-300"
                >
                  <Download size={14} /> Export Archive PDF
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

              {/* Interactive Clickable Archive Stats Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('completed-docs-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 hover:border-emerald-300 rounded-2xl p-4 flex items-center justify-between text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 transition-colors">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-emerald-700">Completed Documents</p>
                      <h3 className="text-xl font-bold text-emerald-900">{archivedDocuments.length}</h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-200/60 group-hover:bg-emerald-600 group-hover:text-white px-2 py-1 rounded-md transition-all shrink-0">
                    View ↓
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('verified-residents-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-blue-50 hover:bg-blue-100/80 border border-blue-200 hover:border-blue-300 rounded-2xl p-4 flex items-center justify-between text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 group-hover:bg-blue-200 text-blue-600 flex items-center justify-center shrink-0 transition-colors">
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-blue-700">Verified Residents</p>
                      <h3 className="text-xl font-bold text-blue-900">
                        {residents.filter(r => (r as any).verification_status === 'Verified').length}
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-200/60 group-hover:bg-blue-600 group-hover:text-white px-2 py-1 rounded-md transition-all shrink-0">
                    View ↓
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('completed-docs-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 rounded-2xl p-4 flex items-center justify-between text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer group col-span-1 sm:col-span-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition-colors">
                      <Archive size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-600">Total Archive Entries</p>
                      <h3 className="text-xl font-bold text-slate-900">{archivedDocuments.length + residents.length}</h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-200/60 group-hover:bg-slate-700 group-hover:text-white px-2 py-1 rounded-md transition-all shrink-0">
                    View All ↓
                  </span>
                </button>
              </div>

              {/* EmailJS Automated Gateway Configuration Card */}
              <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/40 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                        @
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">
                          EmailJS Automated Gateway Connection
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Auto-dispatch real emails for account approvals, ID corrections, and document ready-for-pickup notifications.
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-indigo-600 text-white text-[10px] font-mono">
                      Service: {emailJsSettings.serviceId}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <form onSubmit={handleSaveEmailJsSettings} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">EmailJS Service ID</Label>
                      <Input
                        value={emailJsSettings.serviceId}
                        onChange={e => setEmailJsSettings({ ...emailJsSettings, serviceId: e.target.value })}
                        placeholder="service_6nk2ylj"
                        className="h-8 text-xs font-mono mt-1 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Template ID</Label>
                      <Input
                        value={emailJsSettings.templateId}
                        onChange={e => setEmailJsSettings({ ...emailJsSettings, templateId: e.target.value })}
                        placeholder="e.g. template_xxxxxxx"
                        className="h-8 text-xs font-mono mt-1 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Public Key (User ID)</Label>
                      <Input
                        value={emailJsSettings.publicKey}
                        onChange={e => setEmailJsSettings({ ...emailJsSettings, publicKey: e.target.value })}
                        placeholder="From EmailJS Account > API Keys"
                        className="h-8 text-xs font-mono mt-1 bg-white"
                        required
                      />
                    </div>
                    <div className="sm:col-span-3 flex justify-end">
                      <Button type="submit" size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                        Save EmailJS Gateway Settings
                      </Button>
                    </div>
                  </form>

                  {/* Send Live Test Email Box */}
                  <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">Test Live Delivery:</span> Send a test email to verify your EmailJS connection.
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Input
                        type="email"
                        placeholder="your-email@gmail.com"
                        value={emailJsTestTarget}
                        onChange={e => setEmailJsTestTarget(e.target.value)}
                        className="h-8 text-xs w-full sm:w-60 bg-white"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSendEmailJsTest}
                        disabled={emailJsTestSending || !emailJsTestTarget}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                      >
                        {emailJsTestSending ? 'Sending...' : 'Send Test'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Archived Documents Section */}
              <Card id="completed-docs-section" className="border-slate-200 bg-white shadow-xs scroll-mt-6">
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
              <Card id="verified-residents-section" className="border-slate-200 bg-white shadow-xs scroll-mt-6">
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
                        <TableHead className="text-xs">Verification</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {residents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-xs py-8 text-slate-400">
                            No resident records found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        residents.map((res, idx) => (
                          <TableRow key={`res-ov-${res.id}-${idx}`} className="text-xs hover:bg-blue-50/20">
                            <TableCell className="font-semibold text-slate-900">
                              <button onClick={() => openResidentProfile(res.id)} className="hover:underline text-indigo-700">
                                {res.first_name} {res.last_name}
                              </button>
                            </TableCell>
                            <TableCell className="text-slate-600">{(res as any).phone || '—'}</TableCell>
                            <TableCell className="text-slate-500 max-w-[140px] truncate">{res.address}</TableCell>
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
                  <p className="text-xs text-slate-500">Demographic profiles and resident records linked to MySQL database.</p>
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
                      {/* Auto-location notice */}
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs text-indigo-700 flex items-center gap-1.5">
                        <span>📍</span>
                        <span>Location auto-set to <strong>Barangay {user?.barangay || 'Pianing'}, Butuan City</strong></span>
                      </div>
                      {/* Name Row: First / Middle / Last */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs font-semibold">First Name *</Label>
                          <Input value={newResFirstName} onChange={e => setNewResFirstName(e.target.value)} placeholder="e.g. Juan" required className="text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Middle Name</Label>
                          <Input value={newResMiddleName} onChange={e => setNewResMiddleName(e.target.value)} placeholder="e.g. Perez" className="text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Last Name *</Label>
                          <Input value={newResLastName} onChange={e => setNewResLastName(e.target.value)} placeholder="e.g. Dela Cruz" required className="text-xs" />
                        </div>
                      </div>
                      {/* Birthday & Gender */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs font-semibold">Date of Birth</Label>
                          <Input type="date" value={newResDOB} onChange={e => setNewResDOB(e.target.value)} className="text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Gender</Label>
                          <Select value={newResGender} onValueChange={(val: 'Male' | 'Female') => setNewResGender(val)}>
                            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {/* Purok & Phone */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs font-semibold">Purok / Zone</Label>
                          <Input value={newResPurok} onChange={e => setNewResPurok(e.target.value)} placeholder="e.g. Purok 1" className="text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Contact Number</Label>
                          <Input
                            value={newResPhone}
                            onChange={e => setNewResPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                            placeholder="09XXXXXXXXX (11 digits)"
                            className="text-xs font-mono"
                            maxLength={11}
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                      {/* Email & Password for Portal Access */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs font-semibold">Email / Account (Optional)</Label>
                          <Input value={newResEmail} onChange={e => setNewResEmail(e.target.value)} placeholder="resident@gmail.com" className="text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Portal Password</Label>
                          <Input type="text" value={newResPassword} onChange={e => setNewResPassword(e.target.value)} placeholder="Default: 123" className="text-xs" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white w-full">Save Resident</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <Input
                    placeholder="Search by Resident Name or Address..."
                    value={residentSearch}
                    onChange={e => setResidentSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <Button
                  onClick={() => {
                    printOfficialReport({
                      title: 'Barangay Resident Registry',
                      subtitle: `Barangay ${user?.barangay || 'Pianing'} — Demographic Records`,
                      preparedBy: user?.name || 'Admin',
                      preparedByTitle: 'Barangay Administrator',
                      stats: [
                        { label: 'Total Residents', value: filteredResidents.length, color: '#4f46e5' },
                        { label: 'Male', value: filteredResidents.filter(r => r.gender === 'Male').length, color: '#0284c7' },
                        { label: 'Female', value: filteredResidents.filter(r => r.gender === 'Female').length, color: '#db2777' },
                      ],
                      tables: [{
                        title: 'Resident List',
                        headers: ['ID', 'Full Name', 'Gender', 'Purok / Address', 'Contact Phone'],
                        rows: filteredResidents.map(r => [r.id, `${r.first_name} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name}`, r.gender || 'N/A', r.address || 'N/A', r.phone || 'N/A'])
                      }]
                    });
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
                        <TableHead className="text-xs">ID</TableHead>
                        <TableHead className="text-xs">Full Name</TableHead>
                        <TableHead className="text-xs">Gender</TableHead>
                        <TableHead className="text-xs">Address</TableHead>
                        <TableHead className="text-xs">Contact Number</TableHead>
                        <TableHead className="text-xs">Verification</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResidents.map((res, idx) => (
                        <TableRow key={`res-rec-${res.id}-${idx}`} className="text-xs hover:bg-slate-50/80">
                          <TableCell className="font-mono text-slate-500 font-semibold">#{res.id}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => openResidentProfile(res.id)}
                              className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline transition-colors text-left block"
                            >
                              {res.first_name} {res.last_name}
                            </button>
                            {res.email && <span className="text-[10px] text-slate-400 font-mono block">{res.email}</span>}
                          </TableCell>
                          <TableCell>{res.gender}</TableCell>
                          <TableCell className="text-slate-600">{res.address}</TableCell>
                          <TableCell className="font-mono text-slate-500">{res.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge className={
                              res.verification_status === 'Verified' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              res.verification_status === 'Rejected' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                              'bg-amber-100 text-amber-800 border-amber-300'
                            }>
                              {res.verification_status === 'Verified' ? 'Verified' : res.verification_status === 'Rejected' ? 'Rejected / Need Fix' : 'Unverified / Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openResidentProfile(res.id)}
                                className="h-7 text-xs text-indigo-600 hover:bg-indigo-50 gap-1"
                                title="View Full Profile"
                              >
                                <Eye size={12} /> Profile
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleResidentVerification(res)}
                                className={`h-7 text-[11px] gap-1 font-semibold cursor-pointer ${
                                  res.verification_status === 'Verified'
                                    ? 'text-amber-700 border-amber-300 hover:bg-amber-50'
                                    : 'text-emerald-700 border-emerald-300 hover:bg-emerald-50 bg-emerald-50/50'
                                }`}
                                title={res.verification_status === 'Verified' ? 'Click to unverify resident' : 'Click to verify resident'}
                              >
                                {res.verification_status === 'Verified' ? (
                                  <><ShieldAlert size={12} /> Unverify</>
                                ) : (
                                  <><Check size={12} /> Verify</>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: USER DIRECTORY & SYSTEM ACCOUNTS CONTROL */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Super Admin Control Header */}
              {isSuperAdmin && (
                <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-lg space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-violet-600/30 border border-violet-400/30 rounded-xl backdrop-blur-sm">
                        <ShieldCheck size={24} className="text-violet-300" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                          Super Admin Control Center
                          <Badge className="bg-violet-500/30 text-violet-200 border border-violet-400/40 text-[10px] uppercase tracking-wider">Full System Control</Badge>
                        </h2>
                        <p className="text-xs text-violet-200/80">
                          Complete directory of all personnel and residents across all barangays. Manage permissions, reset credentials, and track login records.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={handleExportUsersCsv}
                        variant="outline"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5 cursor-pointer"
                      >
                        <Download size={14} />
                        Export Directory (CSV)
                      </Button>
                      <Button
                        size="sm"
                        onClick={loadData}
                        variant="outline"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5 cursor-pointer"
                      >
                        <RefreshCcw size={14} />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-[11px] text-violet-300 font-medium">Total Accounts</p>
                      <p className="text-xl font-bold text-white mt-0.5">{users.length}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-[11px] text-indigo-300 font-medium">Officials & Staff</p>
                      <p className="text-xl font-bold text-indigo-200 mt-0.5">
                        {users.filter(u => u.role === 'admin' || u.role === 'staff' || u.role === 'bhw' || u.role === 'superadmin').length}
                      </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-[11px] text-emerald-300 font-medium">Registered Residents</p>
                      <p className="text-xl font-bold text-emerald-200 mt-0.5">
                        {users.filter(u => u.role === 'resident').length}
                      </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-[11px] text-amber-300 font-medium">Active Accounts</p>
                      <p className="text-xl font-bold text-amber-200 mt-0.5">
                        {users.filter(u => u.status === 'Active').length}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Bar: Specific Tabs / Segregation Pills & Search & Add User */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                {/* Specific Category Tabs for Users */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg flex-wrap">
                  <button
                    onClick={() => setUserCategoryTab('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      userCategoryTab === 'all'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users size={14} />
                    All Active
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 font-mono">
                      {users.filter(u => isUserForAdmin(u) && u.status !== 'Archived').length}
                    </span>
                  </button>
                  <button
                    onClick={() => setUserCategoryTab('officials')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      userCategoryTab === 'officials'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 size={14} />
                    Barangay Officials & Staff
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 font-mono">
                      {users.filter(u => isUserForAdmin(u) && u.status !== 'Archived' && (u.role === 'admin' || u.role === 'staff' || u.role === 'bhw' || u.role === 'superadmin')).length}
                    </span>
                  </button>
                  <button
                    onClick={() => setUserCategoryTab('residents')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      userCategoryTab === 'residents'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserCircle size={14} />
                    Residents
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                      {users.filter(u => isUserForAdmin(u) && u.status !== 'Archived' && u.role === 'resident').length}
                    </span>
                  </button>
                  <button
                    onClick={() => setUserCategoryTab('archived')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      userCategoryTab === 'archived'
                        ? 'bg-white text-rose-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Archive size={14} />
                    Archived Accounts
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 font-mono">
                      {users.filter(u => isUserForAdmin(u) && u.status === 'Archived').length}
                    </span>
                  </button>
                </div>

                {/* Filters & Add Button */}
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                  {/* Search Bar */}
                  <div className="relative flex-1 sm:w-48">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search name, email..."
                      value={userSearchText}
                      onChange={e => setUserSearchText(e.target.value)}
                      className="pl-8 h-8 text-xs bg-slate-50"
                    />
                  </div>

                  {/* Searchable Barangay Filter (Super Admin) */}
                  {isSuperAdmin && (
                    <div className="relative">
                      <Input
                        list="user-accounts-barangay-list"
                        placeholder="Search Barangay..."
                        value={userBarangayFilter === 'all' ? '' : userBarangayFilter}
                        onChange={e => setUserBarangayFilter(e.target.value.trim() || 'all')}
                        className="h-8 text-xs w-48 bg-slate-50 border-slate-200"
                      />
                      <datalist id="user-accounts-barangay-list">
                        <option value="all">All Barangays</option>
                        {BUTUAN_BARANGAYS.map(b => (
                          <option key={b} value={b}>Barangay {b}</option>
                        ))}
                      </datalist>
                    </div>
                  )}

                  {/* Add User Dialog */}
                  {(isSuperAdmin || user?.role === 'admin') && (
                    <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1.5 shadow-xs cursor-pointer">
                          <UserPlus size={14} />
                          {isSuperAdmin ? 'Add User Account' : `Add Staff (${user?.barangay || 'Pianing'})`}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-slate-900">
                            <UserPlus className="text-indigo-600" size={18} />
                            {isSuperAdmin ? 'Add System User Account' : `Add Staff for Barangay ${user?.barangay || 'Pianing'}`}
                          </DialogTitle>
                          <DialogDescription className="text-xs text-slate-500">
                            {isSuperAdmin ? 'Register a new barangay administrator, staff, or health worker account. All fields marked with ' : 'Register a new barangay staff or health worker account. All fields marked with '}
                            <span className="text-red-500">*</span> are required.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser} className="space-y-3 py-2" autoComplete="off">
                          {/* First, Middle, and Last Name */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs font-semibold">First Name <span className="text-red-500">*</span></Label>
                              <Input
                                value={newUserFirstName}
                                onChange={e => setNewUserFirstName(e.target.value)}
                                placeholder="e.g. Maria"
                                required
                                className="h-9 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold">Middle Name</Label>
                              <Input
                                value={newUserMiddleName}
                                onChange={e => setNewUserMiddleName(e.target.value)}
                                placeholder="e.g. Clara"
                                className="h-9 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold">Last Name <span className="text-red-500">*</span></Label>
                              <Input
                                value={newUserLastName}
                                onChange={e => setNewUserLastName(e.target.value)}
                                placeholder="e.g. Santos"
                                required
                                className="h-9 text-xs mt-1"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs font-semibold">Email Address <span className="text-red-500">*</span></Label>
                            <Input
                              type="email"
                              value={newUserEmail}
                              onChange={e => setNewUserEmail(e.target.value)}
                              placeholder="e.g. maria.santos@barangay.gov.ph"
                              autoComplete="off"
                              required
                              className="h-9 text-xs mt-1"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs font-semibold">Account Password <span className="text-red-500">*</span></Label>
                              <div className="relative mt-1">
                                <Input
                                  type={showNewUserPass ? "text" : "password"}
                                  value={newUserPassword}
                                  onChange={e => setNewUserPassword(e.target.value)}
                                  placeholder="Set account password"
                                  autoComplete="new-password"
                                  required
                                  className="h-9 text-xs font-mono pr-8"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNewUserPass(!showNewUserPass)}
                                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                  tabIndex={-1}
                                >
                                  {showNewUserPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-semibold">Contact Number <span className="text-red-500">*</span></Label>
                              <Input
                                value={newUserPhone}
                                onChange={e => {
                                  const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                                  setNewUserPhone(v);
                                }}
                                placeholder="09XXXXXXXXX (11 digits)"
                                maxLength={11}
                                required
                                pattern="09[0-9]{9}"
                                title="Must be an 11-digit Philippine mobile number starting with 09 (e.g. 09171234567)"
                                inputMode="numeric"
                                autoComplete="off"
                                className="h-9 text-xs font-mono mt-1"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs font-semibold">System Role <span className="text-red-500">*</span></Label>
                              <Select
                                value={newUserRole === 'resident' || (!isSuperAdmin && newUserRole === 'admin') ? 'staff' : newUserRole}
                                onValueChange={(val: 'admin' | 'staff' | 'bhw') => setNewUserRole(val)}
                              >
                                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {/* Only Super Admin can create Admin accounts; Admin can only add Staff & BHW */}
                                  {isSuperAdmin && <SelectItem value="admin">Barangay Admin</SelectItem>}
                                  <SelectItem value="staff">Barangay Staff / Clerk</SelectItem>
                                  <SelectItem value="bhw">BHW (Health Worker)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs font-semibold">Assigned Barangay <span className="text-red-500">*</span></Label>
                              {isSuperAdmin || user?.role === 'superadmin' ? (
                                <>
                                  <Input
                                    list="add-user-barangay-datalist"
                                    value={newUserBarangay}
                                    onChange={e => setNewUserBarangay(e.target.value)}
                                    placeholder="Type Barangay (e.g. Pianing)"
                                    required
                                    className="h-9 text-xs mt-1 bg-white"
                                  />
                                  <datalist id="add-user-barangay-datalist">
                                    {BUTUAN_BARANGAYS.map(b => (
                                      <option key={b} value={b}>Barangay {b}</option>
                                    ))}
                                  </datalist>
                                </>
                              ) : (
                                <>
                                  <Input
                                    value={user?.barangay || 'Pianing'}
                                    readOnly
                                    disabled
                                    className="h-9 text-xs mt-1 bg-slate-100 cursor-not-allowed"
                                  />
                                  <p className="text-[10px] text-slate-400 mt-0.5">Auto-assigned to your barangay</p>
                                </>
                              )}
                            </div>
                          </div>

                          <DialogFooter className="pt-2">
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs w-full cursor-pointer">
                              Create Account
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

              {/* Interactive User Table */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs w-16">ID</TableHead>
                        <TableHead className="text-xs">Account Name</TableHead>
                        <TableHead className="text-xs">Email Address</TableHead>
                        <TableHead className="text-xs">Role</TableHead>
                        <TableHead className="text-xs">Barangay</TableHead>
                        <TableHead className="text-xs">Contact Phone</TableHead>
                        <TableHead className="text-xs">Verification</TableHead>
                        <TableHead className="text-xs">Last Login</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users
                        .filter(u => {
                          // 1. Role & Barangay permission check
                          if (!isUserForAdmin(u)) return false;

                          // 2. Category Tab filter
                          if (userCategoryTab === 'archived') {
                            if (u.status !== 'Archived') return false;
                          } else {
                            if (u.status === 'Archived') return false;
                            if (userCategoryTab === 'officials' && u.role === 'resident') return false;
                            if (userCategoryTab === 'residents' && u.role !== 'resident') return false;
                          }

                          // 3. Super Admin Barangay dropdown filter
                          if (isSuperAdmin && userBarangayFilter !== 'all') {
                            const uBrgy = (u.barangay || '').toLowerCase();
                            if (!uBrgy.includes(userBarangayFilter.toLowerCase())) return false;
                          }

                          // 4. Search text filter
                          if (userSearchText.trim()) {
                            const q = userSearchText.toLowerCase();
                            const matchName = u.name?.toLowerCase().includes(q);
                            const matchEmail = u.email?.toLowerCase().includes(q);
                            const matchPhone = u.phone?.toLowerCase().includes(q);
                            if (!matchName && !matchEmail && !matchPhone) return false;
                          }

                          return true;
                        })
                        .map((u, idx) => (
                          <TableRow key={`user-${u.id}-${u.email}-${idx}`} className="text-xs hover:bg-slate-50/80">
                            <TableCell className="font-mono text-slate-400 font-semibold">#{u.id}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                  u.role === 'superadmin' ? 'bg-violet-100 text-violet-700' :
                                  u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                                  u.role === 'bhw' ? 'bg-emerald-100 text-emerald-700' :
                                  u.role === 'staff' ? 'bg-blue-100 text-blue-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div>
                                  <button
                                    onClick={() => setSelectedStaffInfo(u)}
                                    className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left block"
                                  >
                                    {u.name}
                                  </button>
                                  {u.role === 'superadmin' && <span className="text-[10px] text-violet-600 font-medium">City Administrator</span>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-slate-600">{u.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                u.role === 'superadmin' ? 'border-violet-500 text-violet-700 bg-violet-50 font-semibold' :
                                u.role === 'admin' ? 'border-indigo-500 text-indigo-700 bg-indigo-50 font-semibold' :
                                u.role === 'bhw' ? 'border-emerald-500 text-emerald-700 bg-emerald-50 font-semibold' :
                                u.role === 'staff' ? 'border-blue-500 text-blue-700 bg-blue-50 font-semibold' :
                                'border-slate-300 text-slate-700 bg-slate-50'
                              }>
                                {u.role === 'superadmin' ? 'SUPER ADMIN' : u.role === 'admin' ? 'BARANGAY ADMIN' : u.role === 'bhw' ? 'BHW WORKER' : u.role === 'staff' ? 'STAFF / CLERK' : 'RESIDENT'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                                <MapPin size={11} className="text-indigo-600" />
                                {u.barangay || 'Pianing'}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-slate-600">
                              {u.phone && !u.phone.includes('@') ? u.phone : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                (u as any).verification_status === 'Verified' ? 'bg-emerald-600 text-white text-[10px]' :
                                (u as any).verification_status === 'Rejected' ? 'bg-red-100 text-red-700 border border-red-300 text-[10px]' :
                                (u as any).verification_status === 'Pending_Review' || (u as any).verification_status === 'Unverified' ? 'bg-amber-100 text-amber-800 border border-amber-300 text-[10px]' :
                                'bg-emerald-600 text-white text-[10px]'
                              }>
                                {(u as any).verification_status === 'Pending_Review' || (u as any).verification_status === 'Unverified' ? 'Pending' : (u as any).verification_status || 'Verified'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-[11px] font-mono text-slate-500">
                                {(u as any).last_login && (u as any).last_login !== 'Never'
                                  ? new Date((u as any).last_login).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                  : 'Never'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={() => (isSuperAdmin || user?.role === 'admin') && handleToggleUserStatus(u)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                                  u.status === 'Active'
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                    : u.status === 'Archived'
                                    ? 'bg-violet-100 text-violet-800 hover:bg-violet-200 border border-violet-300'
                                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                                }`}
                                title="Click to toggle Active / Inactive status"
                              >
                                <span className={`w-2 h-2 rounded-full ${
                                  u.status === 'Active' ? 'bg-emerald-500 animate-pulse' :
                                  u.status === 'Archived' ? 'bg-violet-500' : 'bg-amber-500'
                                }`} />
                                {u.status || 'Active'}
                              </button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1 flex-wrap">
                                {/* Edit User Button */}
                                {(isSuperAdmin || (user?.role === 'admin' && (u.role === 'staff' || u.role === 'bhw'))) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenEditUser(u)}
                                    className="h-7 px-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer text-[11px] gap-1"
                                    title="Edit user details"
                                  >
                                    <Edit3 size={12} />
                                    <span className="hidden xl:inline">Edit</span>
                                  </Button>
                                )}

                                {/* Reset Password Button */}
                                {(isSuperAdmin || (user?.role === 'admin' && (u.role === 'staff' || u.role === 'bhw'))) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenResetPassword(u)}
                                    className="h-7 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 cursor-pointer text-[11px] gap-1"
                                    title="Reset user password"
                                  >
                                    <Key size={12} />
                                    <span className="hidden xl:inline">Reset</span>
                                  </Button>
                                )}

                                {/* Activate / Deactivate Button */}
                                {(isSuperAdmin || (user?.role === 'admin' && (u.role === 'staff' || u.role === 'bhw'))) && (
                                  u.status === 'Active' ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeactivateUser(u)}
                                      className="h-7 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-100/60 cursor-pointer text-[11px] font-semibold gap-1"
                                      title="Deactivate account (disable login)"
                                    >
                                      <UserX size={12} />
                                      Deactivate
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleActivateUser(u)}
                                      className="h-7 px-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/60 cursor-pointer text-[11px] font-semibold gap-1"
                                      title="Activate account (enable login)"
                                    >
                                      <UserCheck size={12} />
                                      Activate
                                    </Button>
                                  )
                                )}

                                {/* Archive / Restore Button */}
                                {(isSuperAdmin || (user?.role === 'admin' && u.role !== 'superadmin')) ? (
                                  u.status === 'Archived' ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleArchiveUser(u)}
                                      className="h-7 px-2 text-indigo-600 hover:bg-indigo-50 cursor-pointer text-[11px] font-semibold gap-1"
                                      title="Restore user account to Active"
                                    >
                                      <RotateCcw size={12} />
                                      Restore
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        if (confirm(`Move ${u.name} (${u.email}) to Archived? Login access will be disabled and the record will be preserved.`)) {
                                          handleArchiveUser(u);
                                        }
                                      }}
                                      className="h-7 px-2 text-rose-600 hover:bg-rose-50 cursor-pointer text-[11px] font-semibold gap-1"
                                      title="Archive user account"
                                    >
                                      <Archive size={12} />
                                      Archive
                                    </Button>
                                  )
                                ) : (
                                  <span className="text-slate-300 text-[10px] italic pr-1">Protected</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* EDIT USER MODAL */}
              <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
                <DialogContent className="bg-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-900">
                      <Edit3 className="text-indigo-600" size={18} />
                      Edit User Account Details
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Update official profile, role permissions, and barangay assignments.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSaveEditUser} className="space-y-3 py-2">
                    <div>
                      <Label className="text-xs font-semibold">Full Name <span className="text-red-500">*</span></Label>
                      <Input
                        value={editUserName}
                        onChange={e => setEditUserName(e.target.value)}
                        required
                        className="h-9 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Email Address <span className="text-red-500">*</span></Label>
                      <Input
                        type="email"
                        value={editUserEmail}
                        onChange={e => setEditUserEmail(e.target.value)}
                        required
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-semibold">System Role</Label>
                        <Select
                          value={editUserRole}
                          onValueChange={(val: 'superadmin' | 'admin' | 'staff' | 'bhw' | 'resident') => setEditUserRole(val)}
                        >
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {isSuperAdmin && (
                              <>
                                <SelectItem value="superadmin">Super Admin</SelectItem>
                                <SelectItem value="admin">Barangay Admin</SelectItem>
                              </>
                            )}
                            <SelectItem value="staff">Barangay Staff / Clerk</SelectItem>
                            <SelectItem value="bhw">BHW (Health Worker)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Account Status</Label>
                        <Select
                          value={editUserStatus}
                          onValueChange={(val: 'Active' | 'Inactive' | 'Archived') => setEditUserStatus(val)}
                        >
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive (Deactivated)</SelectItem>
                            <SelectItem value="Archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-semibold">Assigned Barangay</Label>
                        {isSuperAdmin || user?.role === 'superadmin' ? (
                          <>
                            <Input
                              list="edit-user-barangay-datalist"
                              value={editUserBarangay}
                              onChange={e => setEditUserBarangay(e.target.value)}
                              placeholder="Type Barangay (e.g. Pianing)"
                              className="h-9 text-xs bg-white"
                            />
                            <datalist id="edit-user-barangay-datalist">
                              {BUTUAN_BARANGAYS.map(b => (
                                <option key={b} value={b}>Barangay {b}</option>
                              ))}
                            </datalist>
                          </>
                        ) : (
                          <Input
                            value={editUserBarangay || user?.barangay || 'Pianing'}
                            onChange={e => setEditUserBarangay(e.target.value)}
                            placeholder="e.g. Pianing"
                            className="h-9 text-xs bg-white"
                          />
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Contact Number <span className="text-red-500">*</span></Label>
                        <Input
                          value={editUserPhone}
                          onChange={e => setEditUserPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                          placeholder="09XXXXXXXXX (11 digits)"
                          maxLength={11}
                          required
                          pattern="09[0-9]{9}"
                          title="Must be an 11-digit Philippine mobile number starting with 09 (e.g. 09171234567)"
                          inputMode="numeric"
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <DialogFooter className="pt-3">
                      <Button type="button" variant="outline" onClick={() => setIsEditUserOpen(false)} className="text-xs">
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* RESET PASSWORD MODAL */}
              <Dialog open={isResetPassOpen} onOpenChange={setIsResetPassOpen}>
                <DialogContent className="bg-white max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-900">
                      <Key className="text-amber-600" size={18} />
                      Reset User Password
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Set a new temporary or permanent password for <strong>{resetPassUser?.name}</strong> ({resetPassUser?.email}).
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleExecuteResetPassword} className="space-y-3 py-2">
                    <div>
                      <Label className="text-xs font-semibold">New Password <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                        value={newPassVal}
                        onChange={e => setNewPassVal(e.target.value)}
                        required
                        placeholder="Enter new password"
                        className="h-9 text-xs font-mono mt-1"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Default suggestion: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">123456</code>. Inform the user of their new password so they can log in.
                    </p>
                    <DialogFooter className="pt-2">
                      <Button type="button" variant="outline" onClick={() => setIsResetPassOpen(false)} className="text-xs">
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                        Reset Password
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
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
                      printOfficialReport({
                        title: 'Barangay Clearance Requests Log',
                        subtitle: `All clearance & certificate requests — Generated ${new Date().toLocaleDateString()}`,
                        preparedBy: user?.name || 'Administrator',
                        preparedByTitle: user?.role === 'superadmin' ? 'Super Administrator' : user?.role === 'staff' ? 'Barangay Staff' : 'Barangay Administrator',
                        stats: [
                          { label: 'Total Requests', value: documents.length, color: '#4f46e5' },
                          { label: 'Completed', value: documents.filter(d => d.status === 'Completed').length, color: '#059669' },
                          { label: 'Pending', value: documents.filter(d => d.status === 'Pending').length, color: '#d97706' }
                        ],
                        tables: [{
                          title: 'Document Clearance Requests',
                          headers: ['Code', 'Resident', 'Document Type', 'Purpose', 'Status', 'Date'],
                          rows: documents.map(d => [d.request_code || '', d.resident_name || '', d.document_type || '', d.purpose || '', d.status || '', d.requested_at || 'Recent'])
                        }]
                      });
                      toast.success('Clearance log opened as printable PDF');
                    }}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 border-slate-300"
                  >
                    <Download size={13} /> Export Clearances (PDF)
                  </Button>

                  <Button
                    onClick={() => {
                      printOfficialReport({
                        title: 'Resident Demographic Registry',
                        subtitle: `Barangay Pianing resident census — Generated ${new Date().toLocaleDateString()}`,
                        preparedBy: user?.name || 'Administrator',
                        preparedByTitle: user?.role === 'superadmin' ? 'Super Administrator' : user?.role === 'staff' ? 'Barangay Staff' : 'Barangay Administrator',
                        stats: [
                          { label: 'Total Residents', value: residents.length, color: '#2563eb' }
                        ],
                        tables: [{
                          title: 'Resident Demographics',
                          headers: ['ID', 'First Name', 'Last Name', 'Gender', 'Address', 'Phone', 'Email', 'Status'],
                          rows: residents.map(r => [r.id, r.first_name, r.last_name, r.gender, r.address, r.phone || 'N/A', r.email || 'N/A', (r as any).verification_status || 'Verified'])
                        }]
                      });
                      toast.success('Resident registry opened as printable PDF');
                    }}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 border-slate-300"
                  >
                    <Download size={13} /> Export Residents (PDF)
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
                            headers: ['Resident ID', 'Full Name', 'Gender', 'Purok / Address', 'Contact'],
                            rows: residents.slice(0, 10).map(r => [
                              `#${r.id}`,
                              `${r.first_name} ${r.last_name}`,
                              r.gender,
                              r.address,
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
                    <CardDescription className="text-[11px] text-indigo-700">Demographic census & resident records</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-slate-600 mb-3">Total registered residents: <strong>{residents.length}</strong> in database.</p>
                    <Button
                      onClick={() => {
                        printOfficialReport({
                          title: 'Resident Census Report',
                          subtitle: `Full demographic census — ${new Date().toLocaleDateString()}`,
                          preparedBy: user?.name || 'Administrator',
                          preparedByTitle: user?.role === 'superadmin' ? 'Super Administrator' : 'Barangay Administrator',
                          stats: [{ label: 'Total Residents', value: residents.length, color: '#4f46e5' }],
                          tables: [{
                            title: 'Full Resident Census',
                            headers: ['ID', 'Full Name', 'Gender', 'Address', 'Phone'],
                            rows: residents.map(r => [r.id, `${r.first_name} ${r.last_name}`, r.gender, r.address, r.phone || 'N/A'])
                          }]
                        });
                        toast.success('Resident census PDF report opened');
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-7 text-indigo-700 border-indigo-300 hover:bg-indigo-100"
                    >
                      <Download size={12} className="mr-1" /> Export Full Census (PDF)
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
                        printOfficialReport({
                          title: 'Document Clearances Master List',
                          subtitle: `All clearance & certificate issuances — ${new Date().toLocaleDateString()}`,
                          preparedBy: user?.name || 'Administrator',
                          preparedByTitle: user?.role === 'superadmin' ? 'Super Administrator' : 'Barangay Administrator',
                          stats: [
                            { label: 'Total', value: documents.length, color: '#059669' },
                            { label: 'Completed', value: documents.filter(d => d.status === 'Completed').length, color: '#2563eb' }
                          ],
                          tables: [{
                            title: 'Clearance Requests Master',
                            headers: ['Code', 'Applicant', 'Document Type', 'Purpose', 'Status', 'Processed By'],
                            rows: documents.map(d => [d.request_code || '', d.resident_name || '', d.document_type || '', d.purpose || '', d.status || '', d.processed_by || 'Pending'])
                          }]
                        });
                        toast.success('Clearances master PDF report opened');
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-7 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                    >
                      <Download size={12} className="mr-1" /> Export Clearances Master (PDF)
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
                        printOfficialReport({
                          title: 'System User Accounts Directory',
                          subtitle: `All authorized staff, BHW & admin accounts — ${new Date().toLocaleDateString()}`,
                          preparedBy: user?.name || 'Administrator',
                          preparedByTitle: user?.role === 'superadmin' ? 'Super Administrator' : 'Barangay Administrator',
                          stats: [
                            { label: 'Total Accounts', value: users.length, color: '#2563eb' },
                            { label: 'Active', value: users.filter(u => u.status === 'Active').length, color: '#059669' }
                          ],
                          tables: [{
                            title: 'System User Accounts',
                            headers: ['ID', 'Full Name', 'Email', 'Role', 'Barangay', 'Status', 'Last Login'],
                            rows: users.map(u => [u.id, u.name, u.email, u.role.toUpperCase(), u.barangay || 'Pianing', u.status, (u as any).last_login ? new Date((u as any).last_login).toLocaleDateString() : 'Never'])
                          }]
                        });
                        toast.success('User accounts PDF report opened');
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-7 text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      <Download size={12} className="mr-1" /> Export User Accounts (PDF)
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

          {/* TAB 8: CATEGORY MANAGER (SUPER ADMIN EXCLUSIVE) */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-purple-300">
                      SUPER ADMIN EXCLUSIVE
                    </span>
                    <span className="text-xs text-slate-500 font-mono">Live Service Configuration</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    Document &amp; Service Category Manager
                  </h2>
                  <p className="text-xs text-slate-500">
                    Activate or deactivate document clearance categories and health services across the ecosystem. When deactivated, residents and staff cannot request that document type.
                  </p>
                </div>

                <Button
                  onClick={loadData}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 border-slate-300 cursor-pointer"
                >
                  <RefreshCcw size={13} className={loading ? "animate-spin" : ""} /> Refresh Status
                </Button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-purple-700 uppercase">Total Services</p>
                      <p className="text-2xl font-bold text-purple-900">{categories.length}</p>
                    </div>
                    <Tag size={28} className="text-purple-500 opacity-60" />
                  </CardContent>
                </Card>

                <Card className="border-emerald-200 bg-emerald-50/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-emerald-700 uppercase">Active Categories</p>
                      <p className="text-2xl font-bold text-emerald-900">
                        {categories.filter(c => c.status === 'Active').length}
                      </p>
                    </div>
                    <CheckCircle size={28} className="text-emerald-500 opacity-60" />
                  </CardContent>
                </Card>

                <Card className="border-rose-200 bg-rose-50/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-rose-700 uppercase">Deactivated Categories</p>
                      <p className="text-2xl font-bold text-rose-900">
                        {categories.filter(c => c.status === 'Inactive').length}
                      </p>
                    </div>
                    <AlertTriangle size={28} className="text-rose-500 opacity-60" />
                  </CardContent>
                </Card>
              </div>

              {/* Categories Table */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Tag className="text-purple-600" size={18} />
                    Service Categories Directory
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Toggle individual document types on or off. Deactivated services will be locked and unavailable on resident portals.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 text-xs">
                        <TableHead className="font-bold">Service Category Name</TableHead>
                        <TableHead className="font-bold">Department / Portal</TableHead>
                        <TableHead className="font-bold">Description / Purpose</TableHead>
                        <TableHead className="font-bold text-center">Status</TableHead>
                        <TableHead className="font-bold text-right">Quick Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((cat, idx) => {
                        const isActive = cat.status === 'Active';
                        return (
                          <TableRow key={`cat-${cat.id || idx}-${cat.name}`} className="text-xs hover:bg-slate-50/80">
                            <TableCell className="font-semibold text-slate-900 flex items-center gap-2 py-3">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isActive ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-500'
                              }`}>
                                <FileText size={14} />
                              </div>
                              <div>
                                <p className="font-bold text-xs">{cat.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">ID: #{cat.id || idx + 1}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] font-semibold ${
                                cat.department === 'Health Center'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-300'
                              }`}>
                                {cat.department || 'Barangay'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-600 max-w-xs truncate text-[11px]">
                              {cat.description || 'Standard public document issuance.'}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                {isActive ? 'Active' : 'Deactivated'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {isActive ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleCategoryStatus(cat.name, cat.status)}
                                  className="h-7 px-2.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 cursor-pointer text-[11px] font-semibold gap-1"
                                  title="Deactivate service (hide and block from resident portals)"
                                >
                                  <UserX size={12} />
                                  Deactivate
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleCategoryStatus(cat.name, cat.status)}
                                  className="h-7 px-2.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer text-[11px] font-semibold gap-1"
                                  title="Activate service (enable for resident requests)"
                                >
                                  <CheckCircle size={12} />
                                  Activate
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB: AUDIT TRAIL & ACTIVITY HISTORY LOGS (Admin / Super Admin Only) */}
          {activeTab === 'logs' && !isStaff && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                      isSuperAdmin 
                        ? 'bg-purple-100 text-purple-800 border-purple-300' 
                        : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                    }`}>
                      {isSuperAdmin ? 'SUPER ADMIN & ADMIN AUDIT' : 'BARANGAY AUDIT TRAIL'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">Live Activity Stream</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {isSuperAdmin ? 'System-Wide Audit & Activity History Logs' : `Activity History Logs — Barangay ${userBarangay}`}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Comprehensive chronological record of staff actions, certificate issuances, resident verifications, and security events.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={loadLogs}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 border-slate-300 cursor-pointer"
                  >
                    <RefreshCcw size={13} className={logsLoading ? "animate-spin" : ""} /> Refresh Logs
                  </Button>
                  <Button
                    onClick={handlePrintAuditReport}
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                  >
                    <Printer size={13} /> Print Official Audit Report
                  </Button>
                </div>
              </div>

              {/* Metric Stat Cards */}
              {(() => {
                const scopedLogs = activityLogs.filter(log => {
                  if (!isSuperAdmin && log.barangay && log.barangay !== 'All (City-Wide)' && !log.barangay.toLowerCase().includes(userBarangay.toLowerCase())) {
                    return false;
                  }
                  return true;
                });
                const docEventsCount = scopedLogs.filter(l => l.action_type === 'Document').length;
                const residentEventsCount = scopedLogs.filter(l => l.action_type === 'Resident').length;
                const systemSecurityCount = scopedLogs.filter(l => ['Category', 'User', 'Security', 'System'].includes(l.action_type || '')).length;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Card className="border-indigo-200 bg-indigo-50/40">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-indigo-700 uppercase">Total Logged Events</p>
                          <p className="text-2xl font-bold text-indigo-950">{scopedLogs.length}</p>
                          <p className="text-[10px] text-indigo-600 mt-0.5">Across recorded history</p>
                        </div>
                        <History size={26} className="text-indigo-500 opacity-60" />
                      </CardContent>
                    </Card>

                    <Card className="border-blue-200 bg-blue-50/40">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-blue-700 uppercase">Document Transactions</p>
                          <p className="text-2xl font-bold text-blue-950">{docEventsCount}</p>
                          <p className="text-[10px] text-blue-600 mt-0.5">Certificates & Clearances</p>
                        </div>
                        <FileText size={26} className="text-blue-500 opacity-60" />
                      </CardContent>
                    </Card>

                    <Card className="border-emerald-200 bg-emerald-50/40">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-emerald-700 uppercase">Resident Verifications</p>
                          <p className="text-2xl font-bold text-emerald-950">{residentEventsCount}</p>
                          <p className="text-[10px] text-emerald-600 mt-0.5">Approvals & Rejections</p>
                        </div>
                        <UserCheck size={26} className="text-emerald-500 opacity-60" />
                      </CardContent>
                    </Card>

                    <Card className="border-purple-200 bg-purple-50/40">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-purple-700 uppercase">Security &amp; System</p>
                          <p className="text-2xl font-bold text-purple-950">{systemSecurityCount}</p>
                          <p className="text-[10px] text-purple-600 mt-0.5">Categories, Logins &amp; Users</p>
                        </div>
                        <ShieldCheck size={26} className="text-purple-500 opacity-60" />
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}

              {/* Filters & Search Control Bar */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                    {/* Search Bar */}
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                      <Input
                        placeholder="Search actor, action, details..."
                        value={logSearch}
                        onChange={e => setLogSearch(e.target.value)}
                        className="pl-8 h-9 text-xs"
                      />
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      {/* Action Type Filter */}
                      <Select value={logActionTypeFilter} onValueChange={setLogActionTypeFilter}>
                        <SelectTrigger className="h-9 text-xs w-36">
                          <SelectValue placeholder="Action Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Event Types</SelectItem>
                          <SelectItem value="Document">📄 Document</SelectItem>
                          <SelectItem value="Resident">👤 Resident</SelectItem>
                          <SelectItem value="Category">⚙️ Category</SelectItem>
                          <SelectItem value="User">👥 User Account</SelectItem>
                          <SelectItem value="Health">🏥 Health</SelectItem>
                          <SelectItem value="Security">🛡️ Security</SelectItem>
                          <SelectItem value="System">🔔 System</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* User Role Filter */}
                      <Select value={logRoleFilter} onValueChange={setLogRoleFilter}>
                        <SelectTrigger className="h-9 text-xs w-32">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Roles</SelectItem>
                          <SelectItem value="superadmin">Super Admin</SelectItem>
                          <SelectItem value="admin">Barangay Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="bhw">BHW</SelectItem>
                          <SelectItem value="resident">Resident</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Searchable Barangay Filter (Super Admin) */}
                      {isSuperAdmin && (
                        <div className="relative">
                          <Input
                            list="activity-logs-barangay-list"
                            placeholder="Filter by Barangay..."
                            value={logBarangayFilter === 'All' ? '' : logBarangayFilter}
                            onChange={e => setLogBarangayFilter(e.target.value.trim() || 'All')}
                            className="h-9 text-xs w-44 bg-white dark:bg-slate-800 border-slate-200"
                          />
                          <datalist id="activity-logs-barangay-list">
                            <option value="All">All Barangays</option>
                            {BUTUAN_BARANGAYS.map(b => (
                              <option key={b} value={b}>Barangay {b}</option>
                            ))}
                          </datalist>
                        </div>
                      )}

                      {(logSearch || logActionTypeFilter !== 'All' || logRoleFilter !== 'All' || logBarangayFilter !== 'All') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setLogSearch('');
                            setLogActionTypeFilter('All');
                            setLogRoleFilter('All');
                            setLogBarangayFilter('All');
                          }}
                          className="h-9 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 cursor-pointer"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Logs Table */}
              <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <History className="text-indigo-600" size={18} />
                      Activity &amp; Operational Audit Trail
                    </CardTitle>
                    <CardDescription className="text-xs">
                      All administrative transactions are immutably logged with timestamp and user attribution.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {(() => {
                      const displayed = activityLogs.filter(log => {
                        if (!isSuperAdmin && log.barangay && log.barangay !== 'All (City-Wide)' && !log.barangay.toLowerCase().includes(userBarangay.toLowerCase())) return false;
                        if (logBarangayFilter !== 'All' && log.barangay && !log.barangay.toLowerCase().includes(logBarangayFilter.toLowerCase()) && log.barangay !== 'All (City-Wide)') return false;
                        if (logActionTypeFilter !== 'All' && (log.action_type || 'General') !== logActionTypeFilter) return false;
                        if (logRoleFilter !== 'All' && log.user_role?.toLowerCase() !== logRoleFilter.toLowerCase()) return false;
                        if (logSearch.trim()) {
                          const q = logSearch.toLowerCase();
                          const match = log.user_name?.toLowerCase().includes(q) || log.action?.toLowerCase().includes(q) || log.details?.toLowerCase().includes(q);
                          if (!match) return false;
                        }
                        return true;
                      });
                      return `${displayed.length} Events Showing`;
                    })()}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 text-xs">
                          <TableHead className="font-bold">Actor / User</TableHead>
                          <TableHead className="font-bold">Event &amp; Action</TableHead>
                          <TableHead className="font-bold text-center">Category</TableHead>
                          <TableHead className="font-bold text-center">Barangay Scope</TableHead>
                          <TableHead className="font-bold text-right">Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const displayedLogs = activityLogs.filter(log => {
                            if (!isSuperAdmin && log.barangay && log.barangay !== 'All (City-Wide)' && !log.barangay.toLowerCase().includes(userBarangay.toLowerCase())) return false;
                            if (logBarangayFilter !== 'All' && log.barangay && !log.barangay.toLowerCase().includes(logBarangayFilter.toLowerCase()) && log.barangay !== 'All (City-Wide)') return false;
                            if (logActionTypeFilter !== 'All' && (log.action_type || 'General') !== logActionTypeFilter) return false;
                            if (logRoleFilter !== 'All' && log.user_role?.toLowerCase() !== logRoleFilter.toLowerCase()) return false;
                            if (logSearch.trim()) {
                              const q = logSearch.toLowerCase();
                              const match = log.user_name?.toLowerCase().includes(q) || log.action?.toLowerCase().includes(q) || log.details?.toLowerCase().includes(q);
                              if (!match) return false;
                            }
                            return true;
                          });

                          if (displayedLogs.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                                  <History size={36} className="mx-auto mb-2 opacity-30 text-indigo-400" />
                                  <p className="font-semibold text-sm text-slate-600">No activity logs found</p>
                                  <p className="text-xs text-slate-400 mt-1">Try clearing filters or search queries to see all logs.</p>
                                </TableCell>
                              </TableRow>
                            );
                          }

                          return displayedLogs.map((log, idx) => {
                            const role = (log.user_role || '').toLowerCase();
                            const actionType = log.action_type || 'General';

                            // Role badge styling
                            const roleBadgeColor = 
                              role === 'superadmin' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                              role === 'admin' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                              role === 'staff' ? 'bg-sky-100 text-sky-800 border-sky-300' :
                              role === 'bhw' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              'bg-slate-100 text-slate-800 border-slate-300';

                            // Action badge styling
                            const actionBadgeColor =
                              actionType === 'Document' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              actionType === 'Resident' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              actionType === 'Category' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              actionType === 'User' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              actionType === 'Health' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                              actionType === 'Security' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-slate-100 text-slate-700 border-slate-200';

                            return (
                              <TableRow key={`log-${log.id || idx}`} className="text-xs hover:bg-slate-50/80 transition-colors">
                                {/* Actor */}
                                <TableCell className="py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                      role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                                      role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                                      role === 'bhw' ? 'bg-emerald-100 text-emerald-700' :
                                      role === 'staff' ? 'bg-sky-100 text-sky-700' :
                                      'bg-slate-200 text-slate-700'
                                    }`}>
                                      {log.user_name ? log.user_name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900">{log.user_name || 'System Actor'}</p>
                                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold border ${roleBadgeColor}`}>
                                        {log.user_role ? log.user_role.toUpperCase() : 'USER'}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>

                                {/* Action & Details */}
                                <TableCell className="max-w-md py-3">
                                  <p className="font-bold text-slate-900">{log.action}</p>
                                  {log.details && (
                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{log.details}</p>
                                  )}
                                </TableCell>

                                {/* Category */}
                                <TableCell className="text-center py-3">
                                  <Badge variant="outline" className={`text-[10px] font-semibold ${actionBadgeColor}`}>
                                    {actionType}
                                  </Badge>
                                </TableCell>

                                {/* Scope */}
                                <TableCell className="text-center py-3">
                                  <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    {log.barangay || 'Pianing'}
                                  </span>
                                </TableCell>

                                {/* Timestamp */}
                                <TableCell className="text-right py-3 whitespace-nowrap text-slate-500 text-[11px]">
                                  <div className="flex items-center justify-end gap-1 font-mono">
                                    <Clock size={11} className="text-slate-400" />
                                    <span>{log.timestamp}</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}



        </main>
      </div>

      {/* Intra-System Messenger (floating, Staff Chat) */}
      <SystemMessenger
        currentUserRole={user?.role === 'superadmin' ? 'superadmin' : user?.role === 'staff' ? 'staff' : 'admin'}
        currentUserName={user?.name || "Admin Juan Dela Cruz"}
        currentUserEmail={user?.email}
        currentUserId={user?.id}
        currentUserBarangay={user?.barangay || (user?.email?.toLowerCase().includes('anticala') ? 'Anticala' : user?.address?.toLowerCase().includes('anticala') ? 'Anticala' : (user?.role === 'superadmin' ? 'All (City-Wide)' : 'Pianing'))}
      />

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

      {/* Admin Profile & Security Modal */}
      <Dialog open={isAdminProfileOpen} onOpenChange={setIsAdminProfileOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <UserCircle className="text-indigo-600" size={20} />
              Admin Profile &amp; Security
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update your display name, contact number, or change your login password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateAdminProfile} className="space-y-4 py-2">
            {/* Identity Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Account Info</p>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Full Name</Label>
                <Input
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="Your official name"
                  className="h-9 text-sm mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Phone size={12} /> Mobile Phone Number
                </Label>
                <Input
                  value={profilePhone}
                  onChange={e => setProfilePhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="09XXXXXXXXX"
                  maxLength={11}
                  inputMode="numeric"
                  className="h-9 text-sm font-mono mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Assigned Barangay</Label>
                <Input
                  value={user?.barangay || (user?.role === 'superadmin' ? 'Butuan City' : 'Pianing')}
                  disabled
                  className="h-9 text-sm bg-slate-100 text-slate-600 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Role</Label>
                <Input
                  value={user?.role === 'superadmin' ? 'Super Administrator (City-Wide)' : user?.role === 'admin' ? 'Barangay Administrator' : (user?.role || '').toUpperCase()}
                  disabled
                  className="h-9 text-sm bg-slate-100 text-slate-600 mt-1"
                />
              </div>
            </div>

            {/* Password Change Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <KeyRound size={12} /> Change Password (optional)
              </p>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Current Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showProfilePass ? 'text' : 'password'}
                    value={profileCurrentPassword}
                    onChange={e => setProfileCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="h-9 text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProfilePass(p => !p)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                  >
                    {showProfilePass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">New Password</Label>
                  <Input
                    type="password"
                    value={profileNewPassword}
                    onChange={e => setProfileNewPassword(e.target.value)}
                    placeholder="Min 4 characters"
                    className="h-9 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Confirm New</Label>
                  <Input
                    type="password"
                    value={profileConfirmPassword}
                    onChange={e => setProfileConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="h-9 text-sm mt-1"
                  />
                </div>
              </div>
              {profileNewPassword && profileConfirmPassword && profileNewPassword !== profileConfirmPassword && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> Passwords do not match
                </p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAdminProfileOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
              >
                Save Profile Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Staff / Official Information Modal */}
      <Dialog open={!!selectedStaffInfo} onOpenChange={(open) => !open && setSelectedStaffInfo(null)}>
        <DialogContent className="bg-white dark:bg-slate-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Shield className="text-indigo-600" size={20} />
              Barangay Official / Staff Information
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Assigned system credentials and operational jurisdiction.
            </DialogDescription>
          </DialogHeader>

          {selectedStaffInfo && (
            <div className="space-y-4 py-2 text-xs">
              {/* Top Banner Card */}
              <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/60 rounded-xl border border-indigo-100 dark:border-slate-700">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-md">
                  {selectedStaffInfo.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{selectedStaffInfo.name}</h4>
                  <p className="text-slate-500 font-mono text-[11px]">{selectedStaffInfo.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge variant="outline" className={
                      selectedStaffInfo.role === 'superadmin' ? 'border-violet-500 text-violet-700 bg-violet-50 font-bold' :
                      selectedStaffInfo.role === 'admin' ? 'border-indigo-500 text-indigo-700 bg-indigo-50 font-bold' :
                      selectedStaffInfo.role === 'bhw' ? 'border-emerald-500 text-emerald-700 bg-emerald-50 font-bold' :
                      'border-blue-500 text-blue-700 bg-blue-50 font-bold'
                    }>
                      {selectedStaffInfo.role === 'superadmin' ? 'SUPER ADMIN' : selectedStaffInfo.role === 'admin' ? 'BARANGAY ADMIN' : selectedStaffInfo.role === 'bhw' ? 'BHW HEALTH WORKER' : 'BARANGAY STAFF / CLERK'}
                    </Badge>
                    <Badge className={selectedStaffInfo.status === 'Active' ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'}>
                      {selectedStaffInfo.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Assigned Barangay</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                    <MapPin size={12} className="text-indigo-600" />
                    Barangay {selectedStaffInfo.barangay || 'Pianing'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Mobile Phone</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                    <Phone size={12} className="text-indigo-600" />
                    {selectedStaffInfo.phone && !selectedStaffInfo.phone.includes('@') ? selectedStaffInfo.phone : '09171234567'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Account ID</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">#{selectedStaffInfo.id}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Last Active</span>
                  <span className="text-slate-700 dark:text-slate-300">{selectedStaffInfo.last_login || 'Never logged in'}</span>
                </div>
              </div>

              {/* Assigned Responsibilities */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">Key Responsibilities</span>
                <ul className="text-[11px] text-slate-600 dark:text-slate-400 list-disc list-inside space-y-1">
                  {selectedStaffInfo.role === 'superadmin' && (
                    <>
                      <li>Full city-wide system governance across all barangays.</li>
                      <li>Create and manage Barangay Administrators.</li>
                      <li>Global document catalog and demographic reporting.</li>
                    </>
                  )}
                  {selectedStaffInfo.role === 'admin' && (
                    <>
                      <li>Full executive administration of Barangay {selectedStaffInfo.barangay || 'Pianing'}.</li>
                      <li>Approve resident accounts, review IDs, and grant clearance documents.</li>
                      <li>Manage Barangay Staff and BHW health personnel.</li>
                    </>
                  )}
                  {selectedStaffInfo.role === 'staff' && (
                    <>
                      <li>Process and issue official Barangay Clearances, Residency, and Permits.</li>
                      <li>Register walk-in residents and verify demographic information.</li>
                      <li>Intra-barangay team communication via Staff Chat.</li>
                    </>
                  )}
                  {selectedStaffInfo.role === 'bhw' && (
                    <>
                      <li>Health Center administration for Barangay {selectedStaffInfo.barangay || 'Pianing'}.</li>
                      <li>Manage Maternal Care, Child Immunization, and Medical Consultations.</li>
                    </>
                  )}
                </ul>
              </div>

              <DialogFooter className="pt-2">
                <Button size="sm" onClick={() => setSelectedStaffInfo(null)} className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs cursor-pointer">
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Applicant Registration Rejection & Notification Modal */}
      <Dialog open={!!smsApplicantModal} onOpenChange={(open) => !open && setSmsApplicantModal(null)}>
        <DialogContent className="bg-white dark:bg-slate-900 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle size={18} />
              Reject Resident Application
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Specify the discrepancy cause. The applicant will be notified immediately on their resident portal.
            </DialogDescription>
          </DialogHeader>

          {smsApplicantModal && (
            <form onSubmit={handleSendSmsNotice} className="space-y-4 py-2 text-xs">
              {/* Applicant Card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Applicant Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {smsApplicantModal.name || `${smsApplicantModal.first_name || ''} ${smsApplicantModal.last_name || ''}`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Mobile Phone</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1">
                    <Phone size={11} className="text-indigo-600" />
                    {smsApplicantModal.phone && !smsApplicantModal.phone.includes('@') ? smsApplicantModal.phone : '09171234567'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Provided Birthday</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono font-medium">
                    {smsApplicantModal.date_of_birth && smsApplicantModal.date_of_birth !== '0000-00-00'
                      ? new Date(smsApplicantModal.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                      : 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Submitted ID</span>
                  {smsApplicantModal.submitted_id ? (
                    <button
                      type="button"
                      onClick={() => setSelectedIdPreview(smsApplicantModal.submitted_id || null)}
                      className="text-[11px] text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={11} /> View ID Document
                    </button>
                  ) : (
                    <span className="text-slate-400 text-[11px] italic">None attached</span>
                  )}
                </div>
              </div>

              {/* Quick Issue Reason Selector */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Discrepancy Cause / Rejection Reason
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {[
                    { key: 'Invalid / Blurry ID Photo', label: '📸 Blurry / Invalid ID' },
                    { key: 'Name Mismatch', label: '🏷️ Name Mismatch' },
                    { key: 'Birthday Discrepancy', label: '🎂 Birthday Mismatch' },
                    { key: 'Address Discrepancy', label: '📍 Address Issue' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleNoticeReasonChange(opt.key, smsApplicantModal)}
                      className={`p-2 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer ${
                        smsNoticeReason === opt.key
                          ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-950 dark:border-red-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rejection Cause Message Textarea */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Detailed Reason for Applicant <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {smsCustomMessage.length} characters
                  </span>
                </div>
                <textarea
                  value={smsCustomMessage}
                  onChange={e => setSmsCustomMessage(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none leading-relaxed"
                  placeholder="Explain why the registration cannot be approved and what the resident should correct..."
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  This explanation will be displayed prominently on the resident's portal and notification center.
                </p>
              </div>

              {/* Notification Option Box */}
              <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Portal In-App Notification: <strong>Active (Always sent to resident)</strong></span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <input
                    type="checkbox"
                    id="markRejectedCheckbox"
                    checked={smsMarkAsRejected}
                    onChange={e => setSmsMarkAsRejected(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="markRejectedCheckbox" className="text-xs text-slate-600 dark:text-slate-400 font-medium cursor-pointer">
                    Also send SMS text alert to applicant mobile number
                  </label>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSmsApplicantModal(null)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={smsSending || !smsCustomMessage.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs gap-1.5 shadow-sm cursor-pointer"
                >
                  <X size={13} />
                  {smsSending ? 'Processing Rejection...' : 'Confirm Rejection & Notify'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Pending Applicant Review Modal */}
      {selectedApplicantForReview && (
        <PendingApplicantReviewModal
          applicant={selectedApplicantForReview}
          isOpen={isApplicantReviewOpen}
          onClose={() => {
            setIsApplicantReviewOpen(false);
            setSelectedApplicantForReview(null);
          }}
          onApprove={async (id: number) => {
            setIsApprovingApplicant(true);
            try {
              await apiService.approveResident(id, user?.name || 'Admin');
              toast.success('Resident account approved and verified!');
              setIsApplicantReviewOpen(false);
              setSelectedApplicantForReview(null);
              loadData();
            } catch {
              toast.error('Failed to approve resident');
            } finally {
              setIsApprovingApplicant(false);
            }
          }}
          onRejectWithReason={async (id: number, reason: string) => {
            await handleRejectWithDirectReason(id, reason);
            setIsApplicantReviewOpen(false);
            setSelectedApplicantForReview(null);
          }}
          approving={isApprovingApplicant}
        />
      )}
    </div>
  );
}
