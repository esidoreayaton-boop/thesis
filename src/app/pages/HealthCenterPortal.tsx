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
  Settings
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

const HEALTH_DOCS = [
  { name: 'Medical Certificate', icon: Stethoscope, color: 'bg-emerald-100 text-emerald-700', desc: 'General health status certification from BHW.' },
  { name: 'Health Clearance', icon: CheckCircle2, color: 'bg-teal-100 text-teal-700', desc: 'Clearance for employment or school enrollment.' },
  { name: 'Immunization Record', icon: Baby, color: 'bg-blue-100 text-blue-700', desc: 'Official record of completed child vaccinations.' },
  { name: 'Prenatal Record', icon: Heart, color: 'bg-pink-100 text-pink-700', desc: 'Maternal health and prenatal checkup history.' },
  { name: 'Postnatal Record', icon: Activity, color: 'bg-violet-100 text-violet-700', desc: 'Postpartum and newborn recovery records.' },
];

export default function HealthCenterPortal() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<{ id: number; type: string; purpose: string; status: string; date: string }[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [docType, setDocType] = useState(HEALTH_DOCS[0].name);
  const [purpose, setPurpose] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Dynamic extra fields per document type
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const setField = (key: string, val: string) => setExtraFields(prev => ({ ...prev, [key]: val }));
  const handleDocTypeChange = (val: string) => { setDocType(val); setExtraFields({}); setPurpose(''); };


  const loadData = async (currentUser?: any) => {
    try {
      const data = await apiService.getDocuments();
      const loggedInUser = currentUser || user;
      const healthDocNames = HEALTH_DOCS.map(d => d.name);
      const healthDocs = data.filter(d => healthDocNames.includes(d.document_type));
      if (loggedInUser?.name) {
        const firstName = loggedInUser.name.split(' ')[0].toLowerCase();
        const fullName = loggedInUser.name.toLowerCase();
        const userDocs = healthDocs.filter(d =>
          d.resident_name.toLowerCase().includes(firstName) ||
          d.resident_name.toLowerCase().includes(fullName) ||
          d.resident_id === loggedInUser.id
        );
        setRequests(userDocs.map(d => ({
          id: d.id,
          type: d.document_type,
          purpose: d.purpose || 'Health Requirement',
          status: d.status,
          date: d.requested_at || 'Today'
        })));
      } else {
        setRequests(healthDocs.slice(0, 3).map(d => ({
          id: d.id,
          type: d.document_type,
          purpose: d.purpose || 'Health Requirement',
          status: d.status,
          date: d.requested_at || 'Today'
        })));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast.error('Requests locked! Your account must be verified first.');
      return;
    }
    const fullPurpose = purpose || Object.entries(extraFields).map(([k, v]) => `${k}: ${v}`).join(' | ') || 'Personal Requirement';
    try {
      const created = await apiService.createDocument({
        resident_name: user?.name || 'Resident',
        document_type: docType,
        purpose: fullPurpose,
      });
      const newReq = {
        id: created.id,
        type: created.document_type,
        purpose: created.purpose || 'Personal Requirement',
        status: created.status,
        date: created.requested_at || new Date().toLocaleString(),
      };
      setRequests((prev) => [newReq, ...prev]);
      toast.success('Health record request submitted!', { description: `Request code: ${created.request_code}` });
    } catch (err) {
      const fallbackReq = {
        id: Date.now(),
        type: docType,
        purpose: purpose || 'Personal Requirement',
        status: 'Pending',
        date: new Date().toLocaleString(),
      };
      setRequests((prev) => [fallbackReq, ...prev]);
      toast.success('Health record request submitted!', { description: `Request for ${docType} is pending BHW review.` });
    }
    setIsAddOpen(false);
    setPurpose('');
    setExtraFields({});
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
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Heart size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">Smart Barangay System</h1>
              <span className="text-xs text-emerald-600 font-semibold">Health Center Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Heart size={22} className="text-emerald-600" />
              <h2 className="text-2xl font-extrabold text-slate-900">Health Center Document Requests</h2>
            </div>
            <p className="text-xs text-slate-500">Request health documents processed by Barangay Health Workers (BHW).</p>
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={!isVerified}
                className={`text-xs gap-1.5 shadow-sm ${!isVerified ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
              >
                {!isVerified ? <Lock size={14} /> : <PlusCircle size={15} />}
                Request Health Document
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Heart size={18} className="text-emerald-600" /> Request Health Document
                </DialogTitle>
                <DialogDescription className="text-xs">Fill in the fields specific to the health document you need.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3 py-2">
                <div>
                  <Label className="text-xs font-semibold">Health Document Type</Label>
                  <Select value={docType} onValueChange={handleDocTypeChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HEALTH_DOCS.map((d) => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Medical Certificate */}
                {docType === 'Medical Certificate' && (
                  <>
                    <div>
                      <Label className="text-xs font-semibold">Purpose / Where to Submit</Label>
                      <Select value={extraFields['Purpose'] || ''} onValueChange={v => setField('Purpose', v)}>
                        <SelectTrigger><SelectValue placeholder="Select purpose..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Employment / Pre-Employment">Employment / Pre-Employment</SelectItem>
                          <SelectItem value="School / College Enrollment">School / College Enrollment</SelectItem>
                          <SelectItem value="Driving License Application">Driving License Application</SelectItem>
                          <SelectItem value="Senior Citizen ID">Senior Citizen ID</SelectItem>
                          <SelectItem value="PWD ID Application">PWD ID Application</SelectItem>
                          <SelectItem value="Others">Others</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                    <div>
                      <Label className="text-xs font-semibold">Purpose of Health Clearance</Label>
                      <Select value={extraFields['Purpose'] || ''} onValueChange={v => setField('Purpose', v)}>
                        <SelectTrigger><SelectValue placeholder="Select purpose..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Employment">Employment</SelectItem>
                          <SelectItem value="School Enrollment">School Enrollment</SelectItem>
                          <SelectItem value="Food Handler Permit">Food Handler Permit</SelectItem>
                          <SelectItem value="Business Permit Application">Business Permit Application</SelectItem>
                          <SelectItem value="Community Event Participation">Community Event Participation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Employer / School / Institution Name</Label>
                      <Input value={extraFields['Institution'] || ''} onChange={e => setField('Institution', e.target.value)} placeholder="e.g. Butuan City Hospital" required />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Last Medical Check-Up Date</Label>
                      <Input type="date" value={extraFields['Last Check-Up'] || ''} onChange={e => setField('Last Check-Up', e.target.value)} required />
                    </div>
                  </>
                )}

                {/* Immunization Record */}
                {docType === 'Immunization Record' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-semibold">Child's Full Name</Label>
                        <Input value={extraFields["Child's Name"] || ''} onChange={e => setField("Child's Name", e.target.value)} placeholder="First and Last Name" required />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Child's Date of Birth</Label>
                        <Input type="date" value={extraFields["Child's DOB"] || ''} onChange={e => setField("Child's DOB", e.target.value)} required />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Mother's Full Name</Label>
                      <Input value={extraFields["Mother's Name"] || user?.name || ''} onChange={e => setField("Mother's Name", e.target.value)} required />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Purpose</Label>
                      <Select value={extraFields['Purpose'] || ''} onValueChange={v => setField('Purpose', v)}>
                        <SelectTrigger><SelectValue placeholder="Select purpose..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="School / Daycare Enrollment">School / Daycare Enrollment</SelectItem>
                          <SelectItem value="Travel Requirements">Travel Requirements</SelectItem>
                          <SelectItem value="PhilHealth Claims">PhilHealth Claims</SelectItem>
                          <SelectItem value="Routine Health Record">Routine Health Record</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Prenatal Record */}
                {docType === 'Prenatal Record' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-semibold">Mother's Age</Label>
                        <Input type="number" min="14" max="60" value={extraFields["Mother's Age"] || ''} onChange={e => setField("Mother's Age", e.target.value)} placeholder="e.g. 28" required />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Current Week of Pregnancy</Label>
                        <Input type="number" min="1" max="42" value={extraFields['Pregnancy Week'] || ''} onChange={e => setField('Pregnancy Week', e.target.value)} placeholder="e.g. 20" required />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Expected Due Date</Label>
                      <Input type="date" value={extraFields['Expected Due Date'] || ''} onChange={e => setField('Expected Due Date', e.target.value)} required />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Risk Level (Self-Assessment)</Label>
                      <Select value={extraFields['Risk Level'] || ''} onValueChange={v => setField('Risk Level', v)}>
                        <SelectTrigger><SelectValue placeholder="Select risk level..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low — Normal pregnancy</SelectItem>
                          <SelectItem value="Moderate">Moderate — Pre-existing condition</SelectItem>
                          <SelectItem value="High">High — Complications / Multiple births</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Number of Previous Pregnancies</Label>
                      <Input type="number" min="0" value={extraFields['Previous Pregnancies'] || ''} onChange={e => setField('Previous Pregnancies', e.target.value)} placeholder="0 if first pregnancy" required />
                    </div>
                  </>
                )}

                {/* Postnatal Record */}
                {docType === 'Postnatal Record' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-semibold">Delivery Date</Label>
                        <Input type="date" value={extraFields['Delivery Date'] || ''} onChange={e => setField('Delivery Date', e.target.value)} required />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Type of Delivery</Label>
                        <Select value={extraFields['Delivery Type'] || ''} onValueChange={v => setField('Delivery Type', v)}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Normal / Vaginal">Normal / Vaginal</SelectItem>
                            <SelectItem value="Cesarean Section (CS)">Cesarean Section (CS)</SelectItem>
                            <SelectItem value="Assisted Delivery">Assisted Delivery</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Baby's Full Name</Label>
                      <Input value={extraFields["Baby's Name"] || ''} onChange={e => setField("Baby's Name", e.target.value)} placeholder="As listed on birth record" required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-semibold">Birth Weight (kg)</Label>
                        <Input type="number" step="0.01" value={extraFields['Birth Weight'] || ''} onChange={e => setField('Birth Weight', e.target.value)} placeholder="e.g. 3.2" required />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Baby's Gender</Label>
                        <Select value={extraFields["Baby's Gender"] || ''} onValueChange={v => setField("Baby's Gender", v)}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Delivery Hospital / Facility</Label>
                      <Input value={extraFields['Delivery Facility'] || ''} onChange={e => setField('Delivery Facility', e.target.value)} placeholder="e.g. Butuan Medical Center / Home Delivery" required />
                    </div>
                  </>
                )}

                <DialogFooter>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Submit Request</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Available Health Document Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {HEALTH_DOCS.map(({ name, icon: Icon, color, desc }) => (
            <div key={name} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-emerald-300 hover:shadow-sm transition-all cursor-default">
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
                <Icon size={20} />
              </div>
              <p className="text-xs font-bold text-slate-800 leading-tight mb-1">{name}</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
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
