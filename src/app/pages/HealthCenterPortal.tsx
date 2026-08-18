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
} from 'lucide-react';
import { apiService } from '../../services/api';
import DatabaseStatusBadge from '../components/DatabaseStatusBadge';
import BarangayChatbot from '../components/BarangayChatbot';
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

  useEffect(() => {
    const storedUser = localStorage.getItem('barangay_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setIsVerified(parsed.verification_status === 'Verified');
      } catch {}
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast.error('Requests locked! Your account must be verified first.');
      return;
    }
    const newRequest = {
      id: Date.now(),
      type: docType,
      purpose: purpose || 'Personal Requirement',
      status: 'Pending',
      date: new Date().toLocaleString(),
    };
    setRequests((prev) => [newRequest, ...prev]);
    toast.success('Health record request submitted!', { description: `Request for ${docType} is pending BHW review.` });
    setIsAddOpen(false);
    setPurpose('');
  };

  const statusColor = (s: string) =>
    s === 'Completed' ? 'bg-emerald-600' : s === 'Processing' ? 'bg-blue-500' : s === 'Rejected' ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
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
            <DatabaseStatusBadge />

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
            <Button
              size="sm"
              onClick={() => {
                setIsVerified(true);
                const updated = { ...user, verification_status: 'Verified' };
                setUser(updated);
                localStorage.setItem('barangay_user', JSON.stringify(updated));
                toast.success('Demo: Account verified!');
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 px-4 shrink-0"
            >
              <CheckCircle2 size={14} className="mr-1.5" /> Verify Demo Account
            </Button>
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
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Heart size={18} className="text-emerald-600" /> Request Health Document
                </DialogTitle>
                <DialogDescription className="text-xs">Submit a health record request to the Barangay Health Center.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3 py-2">
                <div>
                  <Label className="text-xs font-semibold">Health Document Type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HEALTH_DOCS.map((d) => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Purpose</Label>
                  <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} required placeholder="e.g. School Requirement / Employment" />
                </div>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs py-10 text-slate-400">
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
    </div>
  );
}
