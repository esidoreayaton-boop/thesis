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
} from 'lucide-react';
import { apiService, DocumentRequest } from '../../services/api';
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

  const loadData = async () => {
    try {
      const data = await apiService.getDocuments();
      setDocuments(data.filter((d) => BARANGAY_DOCS.includes(d.document_type)));
    } catch {
      toast.error('Failed to load document requests');
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('barangay_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setIsVerified(parsed.verification_status === 'Verified');
      } catch {}
    }
    loadData();
  }, []);

  const handleRequestDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast.error('Document requests locked!', {
        description: 'Your account must be verified by Barangay Admin first.',
      });
      return;
    }
    try {
      const created = await apiService.createDocument({
        resident_name: user?.name || 'Resident',
        document_type: docType,
        purpose: purpose || 'Personal Requirement',
      });
      setDocuments([created, ...documents]);
      toast.success('Request submitted!', { description: `Request Code: ${created.request_code}` });
      setIsAddDocOpen(false);
      setPurpose('');
    } catch {
      toast.error('Submission failed. Please try again.');
    }
  };

  const statusColor = (s: string) =>
    s === 'Completed' ? 'bg-emerald-600' : s === 'Processing' ? 'bg-blue-500' : s === 'Rejected' ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
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
            <DatabaseStatusBadge />

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
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 size={18} className="text-indigo-600" /> Request Barangay Document
                </DialogTitle>
                <DialogDescription className="text-xs">Submit a document request to the Barangay Office.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleRequestDocument} className="space-y-3 py-2">
                <div>
                  <Label className="text-xs font-semibold">Document Type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BARANGAY_DOCS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Purpose of Request</Label>
                  <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} required placeholder="e.g. Employment / Bank Requirement" />
                </div>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs py-10 text-slate-400">
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
    </div>
  );
}
