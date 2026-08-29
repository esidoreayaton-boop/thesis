import { useState, useEffect } from 'react';
import { User, FileText, Syringe, Heart, Phone, MapPin, ShieldCheck, Building2, Send, MessageSquare, CheckCircle2 } from 'lucide-react';
import { apiService, Resident, DocumentRequest, MaternalRecord, ImmunizationRecord } from '../../services/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

interface ResidentProfileModalProps {
  residentId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ResidentProfileModal({ residentId, isOpen, onClose }: ResidentProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [resident, setResident] = useState<Resident | null>(null);
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [maternal, setMaternal] = useState<MaternalRecord[]>([]);
  const [immunizations, setImmunizations] = useState<ImmunizationRecord[]>([]);

  // SMS Form state
  const [smsType, setSmsType] = useState('Official Notification');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (residentId && isOpen) {
      setLoading(true);
      apiService.getResidentFullProfile(residentId)
        .then(data => {
          setResident(data.resident);
          setDocuments(data.documents || []);
          setMaternal(data.maternal || []);
          setImmunizations(data.immunizations || []);
        })
        .finally(() => setLoading(false));
    }
  }, [residentId, isOpen]);

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resident || !smsMessage.trim()) return;
    setSmsSending(true);
    try {
      await apiService.sendNotification({
        recipient_name: `${resident.first_name} ${resident.last_name}`,
        recipient_phone: resident.phone || '09171234567',
        type: smsType,
        message: smsMessage
      });
      toast.success(`SMS Notification sent to ${resident.first_name}!`, {
        description: `Phone: ${resident.phone || '09171234567'}`
      });
      setSmsMessage('');
    } catch (err) {
      toast.error('Failed to send SMS notification');
    } finally {
      setSmsSending(false);
    }
  };

  if (!isOpen) return null;

  const residentFullName = resident ? `${resident.first_name} ${resident.middle_name ? resident.middle_name + ' ' : ''}${resident.last_name}` : 'Resident Profile';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl sm:max-w-2xl bg-white p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">
                {resident ? `${resident.first_name[0]}${resident.last_name[0]}` : <User size={24} />}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  {residentFullName}
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300">
                    <ShieldCheck size={12} className="mr-1" />
                    Verified Resident
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                  <span className="flex items-center gap-1"><MapPin size={12} /> {resident?.address || 'Zone 1'}</span>
                  <span className="flex items-center gap-1 font-mono"><Phone size={12} /> {resident?.phone || '09171234567'}</span>
                </DialogDescription>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setActiveTab('sms')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-3 gap-1.5 shrink-0"
            >
              <MessageSquare size={14} />
              Send Direct SMS
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading full resident record...</div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid grid-cols-4 bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="overview" className="text-xs">Civil Info</TabsTrigger>
              <TabsTrigger value="maternal" className="text-xs">Maternal Care</TabsTrigger>
              <TabsTrigger value="immunization" className="text-xs">Child Vaccines</TabsTrigger>
              <TabsTrigger value="sms" className="text-xs font-semibold text-indigo-700">Send SMS</TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW & CLEARANCE HISTORY */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Full Name:</span>
                  <p className="font-semibold text-slate-900">{residentFullName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Gender / Status:</span>
                  <p className="font-semibold text-slate-900">{resident?.gender} • {resident?.civil_status || 'Single'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Date of Birth (Birthday):</span>
                  <p className="font-semibold text-indigo-700">{resident?.date_of_birth || '2000-01-01'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Contact Number:</span>
                  <p className="font-mono text-slate-800">{resident?.phone || '09171234567'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <FileText size={15} className="text-indigo-600" />
                  Barangay Document Clearance History ({documents.length})
                </h4>
                {documents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-lg">No document requests on file.</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map(doc => (
                      <div key={doc.id} className="p-3 bg-white border rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <span className="font-mono font-semibold text-indigo-600 block">{doc.request_code}</span>
                          <span className="font-medium text-slate-800">{doc.document_type}</span>
                        </div>
                        <Badge className={doc.status === 'Completed' ? 'bg-emerald-600' : 'bg-amber-500'}>
                          {doc.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: MATERNAL CARE */}
            <TabsContent value="maternal" className="space-y-3 mt-4">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Heart size={15} className="text-pink-600" />
                Maternal Healthcare Records ({maternal.length})
              </h4>
              {maternal.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-lg">No maternal care records registered for this resident.</p>
              ) : (
                maternal.map(m => (
                  <div key={m.id} className="p-4 bg-pink-50/50 border border-pink-200 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-pink-900">{m.pregnancy_status}</span>
                      <Badge className="bg-pink-600">Risk: {m.risk_level || 'Low'}</Badge>
                    </div>
                    <p className="text-slate-600">{m.notes}</p>
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono pt-1">
                      <span>Last Visit: {m.last_visit}</span>
                      <span className="text-pink-700 font-bold">Next Checkup: {m.next_visit}</span>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* TAB 3: IMMUNIZATION */}
            <TabsContent value="immunization" className="space-y-3 mt-4">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Syringe size={15} className="text-blue-600" />
                Linked Child Immunization Records ({immunizations.length})
              </h4>
              {immunizations.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-lg">No infant immunization records linked to this household.</p>
              ) : (
                immunizations.map(i => (
                  <div key={i.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-slate-900 block">{i.child_name}</span>
                      <span className="text-slate-500">{i.vaccine_name} (Dose #{i.dose_number})</span>
                    </div>
                    <Badge className={i.status === 'Completed' ? 'bg-emerald-600' : 'bg-red-600'}>
                      {i.status}
                    </Badge>
                  </div>
                ))
              )}
            </TabsContent>

            {/* TAB 4: SEND DIRECT SMS */}
            <TabsContent value="sms" className="space-y-4 mt-4">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
                <MessageSquare size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Send SMS Notification to {resident?.first_name}</p>
                  <p className="text-[11px] text-indigo-700">Recipient Phone: <span className="font-mono font-bold">{resident?.phone || '09171234567'}</span></p>
                </div>
              </div>

              <form onSubmit={handleSendSms} className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold">Notification Category</Label>
                  <Select value={smsType} onValueChange={setSmsType}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Official Notification">Barangay Official Notice</SelectItem>
                      <SelectItem value="Clearance Update">Clearance Ready for Pickup</SelectItem>
                      <SelectItem value="Immunization Reminder">Vaccination / Health Reminder</SelectItem>
                      <SelectItem value="Maternal Checkup">Maternal Checkup Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">SMS Message Content</Label>
                  <textarea
                    rows={4}
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    required
                    placeholder={`Magandang araw ${resident?.first_name}, paki-claim ang inyong clearance sa Barangay Hall...`}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={smsSending || !smsMessage.trim()}
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md gap-1.5"
                >
                  <Send size={15} />
                  {smsSending ? 'Sending SMS...' : `Send SMS to ${resident?.phone || 'Resident'}`}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
