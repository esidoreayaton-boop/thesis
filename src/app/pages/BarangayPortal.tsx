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
  Clock
} from 'lucide-react';
import { apiService, DocumentRequest } from '../../services/api';
import BarangayChatbot from '../components/BarangayChatbot';
import ProfileSettingsModal from '../components/ProfileSettingsModal';
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
  'Business Permit',
  'Certificate of Indigency',
  'Barangay ID',
];

export default function BarangayPortal() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [docType, setDocType] = useState(BARANGAY_DOCS[0]);
  const [purpose, setPurpose] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Dynamic extra fields per document type
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});

  const setField = (key: string, val: string) => setExtraFields(prev => ({ ...prev, [key]: val }));

  // Clear extra fields when doc type changes
  const handleDocTypeChange = (val: string) => {
    setDocType(val);
    setExtraFields({});
    setPurpose('');
  };

  const loadData = async (currentUser?: any) => {
    try {
      const data = await apiService.getDocuments();
      const loggedInUser = currentUser || user;
      const barangayDocs = data.filter((d) => BARANGAY_DOCS.includes(d.document_type));
      if (loggedInUser?.name) {
        const firstName = loggedInUser.name.split(' ')[0].toLowerCase();
        const fullName = loggedInUser.name.toLowerCase();
        setDocuments(barangayDocs.filter(d =>
          d.resident_name.toLowerCase().includes(firstName) ||
          d.resident_name.toLowerCase().includes(fullName) ||
          d.resident_id === loggedInUser.id
        ));
      } else {
        setDocuments(barangayDocs.slice(0, 3));
      }
    } catch {
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

        // Live-check if admin has approved since last login
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
      } catch {
        loadData();
      }
    } else {
      loadData();
    }
  }, []);

  const handleRequestDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast.error('Document requests locked!', {
        description: 'Your account must be verified by Barangay Admin first.',
      });
      return;
    }
    // Build purpose string from specific fields
    const fullPurpose = purpose || Object.entries(extraFields).map(([k, v]) => `${k}: ${v}`).join(' | ') || 'Personal Requirement';
    try {
      const created = await apiService.createDocument({
        resident_name: user?.name || 'Resident',
        document_type: docType,
        purpose: fullPurpose,
      });
      setDocuments([created, ...documents]);
      toast.success('Request submitted!', { description: `Request Code: ${created.request_code}` });
      setIsAddDocOpen(false);
      setPurpose('');
      setExtraFields({});
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
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Building2 size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">Smart Barangay System</h1>
              <span className="text-xs text-indigo-600 font-semibold">Barangay Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

          <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={!isVerified}
                className={`text-xs gap-1.5 shadow-sm ${!isVerified ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                {!isVerified ? <Lock size={14} /> : <PlusCircle size={15} />}
                Request Barangay Document
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 size={18} className="text-indigo-600" /> Request Barangay Document
                </DialogTitle>
                <DialogDescription className="text-xs">Submit a document request to the Barangay Office. Fill in all required fields.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleRequestDocument} className="space-y-3 py-2">
                {/* Step 1: Document Type */}
                <div>
                  <Label className="text-xs font-semibold">Document Type</Label>
                  <Select value={docType} onValueChange={handleDocTypeChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BARANGAY_DOCS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dynamic fields per document type */}
                {docType === 'Barangay Clearance' && (
                  <>
                    <div>
                      <Label className="text-xs font-semibold">Purpose of Clearance</Label>
                      <Select value={extraFields['Purpose'] || ''} onValueChange={v => setField('Purpose', v)}>
                        <SelectTrigger><SelectValue placeholder="Select purpose..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Employment">Employment</SelectItem>
                          <SelectItem value="Bank Loan / Account">Bank Loan / Account</SelectItem>
                          <SelectItem value="Travel / Visa Application">Travel / Visa Application</SelectItem>
                          <SelectItem value="School Enrollment">School Enrollment</SelectItem>
                          <SelectItem value="Government ID Application">Government ID Application</SelectItem>
                          <SelectItem value="Others">Others</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Full Name of Applicant</Label>
                      <Input value={extraFields['Applicant Name'] || user?.name || ''} onChange={e => setField('Applicant Name', e.target.value)} placeholder="As it appears on valid ID" required />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Length of Residency in Barangay</Label>
                      <Input value={extraFields['Residency Duration'] || ''} onChange={e => setField('Residency Duration', e.target.value)} placeholder="e.g. 5 years" required />
                    </div>
                  </>
                )}

                {docType === 'Certificate of Residency' && (
                  <>
                    <div>
                      <Label className="text-xs font-semibold">Purpose</Label>
                      <Input value={extraFields['Purpose'] || ''} onChange={e => setField('Purpose', e.target.value)} placeholder="e.g. School Enrollment / Bank Requirement" required />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Purok / Home Address in Barangay Pianing</Label>
                      <Input value={extraFields['Home Address'] || ''} onChange={e => setField('Home Address', e.target.value)} placeholder="e.g. Purok 3, Barangay Pianing, Butuan City" required />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Duration of Residence</Label>
                      <Input value={extraFields['Duration of Residence'] || ''} onChange={e => setField('Duration of Residence', e.target.value)} placeholder="e.g. 3 years, 6 months" required />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Date of Birth</Label>
                      <Input type="date" value={extraFields['Date of Birth'] || ''} onChange={e => setField('Date of Birth', e.target.value)} required />
                    </div>
                  </>
                )}

                {docType === 'Business Permit' && (
                  <>
                    <div>
                      <Label className="text-xs font-semibold">Business Name</Label>
                      <Input value={extraFields['Business Name'] || ''} onChange={e => setField('Business Name', e.target.value)} placeholder="Registered trade name" required />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Type / Nature of Business</Label>
                      <Select value={extraFields['Business Type'] || ''} onValueChange={v => setField('Business Type', v)}>
                        <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Retail / Sari-Sari Store">Retail / Sari-Sari Store</SelectItem>
                          <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                          <SelectItem value="Salon / Beauty Services">Salon / Beauty Services</SelectItem>
                          <SelectItem value="Repair Shop">Repair Shop</SelectItem>
                          <SelectItem value="Home-Based Business">Home-Based Business</SelectItem>
                          <SelectItem value="Other Trade">Other Trade</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Business Location / Address</Label>
                      <Input value={extraFields['Business Address'] || ''} onChange={e => setField('Business Address', e.target.value)} placeholder="e.g. Purok 2, Brgy. Pianing" required />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Name of Business Owner</Label>
                      <Input value={extraFields['Owner Name'] || user?.name || ''} onChange={e => setField('Owner Name', e.target.value)} placeholder="Full legal name of owner" required />
                    </div>
                  </>
                )}

                {docType === 'Certificate of Indigency' && (
                  <>
                    <div>
                      <Label className="text-xs font-semibold">Reason for Indigency Certificate</Label>
                      <Select value={extraFields['Reason'] || ''} onValueChange={v => setField('Reason', v)}>
                        <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hospital / Medical Assistance">Hospital / Medical Assistance</SelectItem>
                          <SelectItem value="Educational Financial Aid">Educational Financial Aid</SelectItem>
                          <SelectItem value="DSWD / Government Assistance">DSWD / Government Assistance</SelectItem>
                          <SelectItem value="Legal Aid / PAO">Legal Aid / PAO</SelectItem>
                          <SelectItem value="Burial Assistance">Burial Assistance</SelectItem>
                          <SelectItem value="Others">Others</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Monthly Household Income (Approximate)</Label>
                      <Input value={extraFields['Monthly Income'] || ''} onChange={e => setField('Monthly Income', e.target.value)} placeholder="e.g. Below ₱5,000" required />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Number of Dependents</Label>
                      <Input type="number" min="0" value={extraFields['Dependents'] || ''} onChange={e => setField('Dependents', e.target.value)} placeholder="e.g. 4" required />
                    </div>
                  </>
                )}

                {docType === 'Barangay ID' && (
                  <>
                    <div>
                      <Label className="text-xs font-semibold">Complete Address in Barangay Pianing</Label>
                      <Input value={extraFields['Complete Address'] || ''} onChange={e => setField('Complete Address', e.target.value)} placeholder="Purok #, Barangay Pianing, Butuan City" required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-semibold">Date of Birth</Label>
                        <Input type="date" value={extraFields['Date of Birth'] || ''} onChange={e => setField('Date of Birth', e.target.value)} required />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Civil Status</Label>
                        <Select value={extraFields['Civil Status'] || ''} onValueChange={v => setField('Civil Status', v)}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Single">Single</SelectItem>
                            <SelectItem value="Married">Married</SelectItem>
                            <SelectItem value="Widowed">Widowed</SelectItem>
                            <SelectItem value="Separated">Separated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Emergency Contact Person & Number</Label>
                      <Input value={extraFields['Emergency Contact'] || ''} onChange={e => setField('Emergency Contact', e.target.value)} placeholder="e.g. Maria Santos — 09171234567" required />
                    </div>
                  </>
                )}

                <DialogFooter>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Submit Request</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Available Documents Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {BARANGAY_DOCS.map((doc) => (
            <div key={doc} className="bg-white border border-slate-200 rounded-xl p-3 text-center hover:border-indigo-300 hover:shadow-sm transition-all cursor-default">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                <FileText size={16} />
              </div>
              <p className="text-[10px] font-semibold text-slate-700 leading-tight">{doc}</p>
            </div>
          ))}
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
                  documents.map((doc) => (
                    <TableRow key={doc.id} className="text-xs">
                      <TableCell className="font-mono font-semibold text-indigo-600">{doc.request_code}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{doc.document_type}</TableCell>
                      <TableCell className="text-slate-500">{doc.purpose || '—'}</TableCell>
                      <TableCell>
                        <Badge className={statusColor(doc.status)}>{doc.status}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-slate-400 text-[11px]">{doc.requested_at || 'Today'}</TableCell>
                      <TableCell className="text-right">
                        {doc.status === 'Completed' ? (
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
