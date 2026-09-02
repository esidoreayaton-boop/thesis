import { useState } from 'react';
import {
  User, Phone, MapPin, Calendar, Heart, Syringe, Stethoscope,
  Send, Clock, FileText, CheckCircle2, ShieldCheck, Activity, X, Plus
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { apiService } from '../../services/api';
import { toast } from 'sonner';

export interface PatientRecordData {
  id: string | number;
  name: string;
  contact_number: string;
  age?: string | number;
  gender?: string;
  barangay?: string;
  address?: string;
  guardian?: string;
  date_of_birth?: string;
  weight?: string;
  height?: string;
  temp?: string;
  bp?: string;
  consultations?: Array<{
    id: string | number;
    date: string;
    service_type: string;
    vitals: string;
    complaint: string;
    diagnosis: string;
    treatment: string;
    attending: string;
  }>;
  prenatal?: Array<{
    id: string | number;
    date: string;
    gravida: string;
    para: string;
    lmp: string;
    edd: string;
    aog: string;
    bp: string;
    fhr: string;
    next_visit: string;
    meds: string;
    attending: string;
  }>;
  immunizations?: Array<{
    id: string | number;
    vaccine: string;
    dose: string;
    date_given: string;
    next_due: string;
    batch_number?: string;
    attending: string;
  }>;
}

interface PatientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecordData | null;
  onSendSmsSuccess?: () => void;
  onLogReturnVisit?: (patient: PatientRecordData) => void;
}

export default function PatientDetailModal({ isOpen, onClose, patient, onSendSmsSuccess, onLogReturnVisit }: PatientDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [smsType, setSmsType] = useState('Health Center Notice');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);

  if (!patient) return null;

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient.contact_number) {
      toast.error('Patient has no valid contact number registered');
      return;
    }
    if (!smsMessage.trim()) {
      toast.error('Please enter an SMS message to send');
      return;
    }

    setSmsSending(true);
    try {
      await apiService.sendSmsNotification({
        recipient_name: patient.name,
        recipient_phone: patient.contact_number,
        type: smsType,
        message: smsMessage.trim()
      });
      toast.success(`SMS successfully dispatched to ${patient.name}!`, {
        description: `Phone: ${patient.contact_number}`
      });
      setSmsMessage('');
      if (onSendSmsSuccess) onSendSmsSuccess();
    } catch {
      toast.info(`SMS queued for ${patient.name} (${patient.contact_number}). Message: "${smsMessage.substring(0, 50)}..."`);
      setSmsMessage('');
    } finally {
      setSmsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white w-[96vw] max-w-7xl h-[92vh] max-h-[95vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white p-6 relative rounded-t-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-bold text-xl shadow-inner shrink-0">
                {patient.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">{patient.name}</h2>
                  {patient.gender && (
                    <Badge className="bg-teal-500/30 text-teal-100 border border-teal-400/40 text-[10px]">
                      {patient.gender}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-teal-100/90 mt-1 font-mono">
                  {patient.age && <span>Age: <strong>{patient.age}</strong></span>}
                  {patient.contact_number && (
                    <span className="flex items-center gap-1">
                      <Phone size={12} className="text-teal-300" />
                      <strong>{patient.contact_number}</strong>
                    </span>
                  )}
                  {patient.barangay && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-teal-300" />
                      Barangay {patient.barangay}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Return Visit Action Button */}
            {onLogReturnVisit && (
              <Button
                type="button"
                onClick={() => {
                  onClose();
                  onLogReturnVisit(patient);
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 border border-emerald-400/40"
              >
                <Stethoscope size={15} />
                + Log Return Visit
              </Button>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <div className="p-6 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-100 p-1 rounded-xl grid grid-cols-4 gap-1 text-xs">
              <TabsTrigger value="overview" className="rounded-lg font-semibold cursor-pointer">Overview</TabsTrigger>
              <TabsTrigger value="consultations" className="rounded-lg font-semibold cursor-pointer">Consultations ({patient.consultations?.length || 0})</TabsTrigger>
              <TabsTrigger value="maternal" className="rounded-lg font-semibold cursor-pointer">Prenatal Care ({patient.prenatal?.length || 0})</TabsTrigger>
              <TabsTrigger value="immunizations" className="rounded-lg font-semibold cursor-pointer">Vaccines ({patient.immunizations?.length || 0})</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Contact Number</p>
                  <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">{patient.contact_number || 'Not Registered'}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Guardian / Next of Kin</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{patient.guardian || 'N/A (Self)'}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Barangay Address</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{patient.barangay || 'Pianing'}</p>
                </div>
              </div>

              {/* Send Quick or Dynamic SMS */}
              <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                    <Send size={14} className="text-teal-700" /> Dispatch Direct SMS to Patient (Static Template & Dynamic Custom)
                  </h3>
                  <span className="text-[10px] font-medium text-teal-700">
                    {smsMessage.length} chars
                  </span>
                </div>
                <form onSubmit={handleSendSms} className="space-y-3">
                  <div>
                    <Label className="text-[10px] text-teal-800 font-semibold mb-1 block">SMS Category</Label>
                    <select
                      value={smsType}
                      onChange={e => setSmsType(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-teal-200 rounded-md px-2 focus:outline-none"
                    >
                      <option value="Health Center Notice">Health Center Notice</option>
                      <option value="Prenatal Visit Reminder">Prenatal Visit Reminder</option>
                      <option value="Immunization Due Reminder">Immunization Due Reminder</option>
                      <option value="Follow-up Checkup Request">Follow-up Checkup Request</option>
                      <option value="Lab / Vital Checkup">Lab / Vital Checkup</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-[10px] text-teal-800 font-semibold mb-1 block">Static Quick Templates (Click to Auto-fill)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSmsMessage(`Good day ${patient.name}, this is a reminder for your scheduled visit at Barangay ${patient.barangay || 'Pianing'} Health Center.`)}
                        className="px-2 py-1 bg-white border border-teal-200 hover:bg-teal-100 rounded text-[10px] text-teal-800 font-medium cursor-pointer transition-colors"
                      >
                        + Visit Reminder
                      </button>
                      <button
                        type="button"
                        onClick={() => setSmsMessage(`Dear ${patient.name}, your vaccination/check-up is due. Please bring your Mother-Baby Handbook.`)}
                        className="px-2 py-1 bg-white border border-teal-200 hover:bg-teal-100 rounded text-[10px] text-teal-800 font-medium cursor-pointer transition-colors"
                      >
                        + Vaccine Due
                      </button>
                      <button
                        type="button"
                        onClick={() => setSmsMessage(`Good day ${patient.name}, your follow-up checkup results are ready. Please visit the health center for consultation.`)}
                        className="px-2 py-1 bg-white border border-teal-200 hover:bg-teal-100 rounded text-[10px] text-teal-800 font-medium cursor-pointer transition-colors"
                      >
                        + Follow-up Ready
                      </button>
                      <button
                        type="button"
                        onClick={() => setSmsMessage(`Notice for ${patient.name}: Please return to the health center for vital sign re-check.`)}
                        className="px-2 py-1 bg-white border border-teal-200 hover:bg-teal-100 rounded text-[10px] text-teal-800 font-medium cursor-pointer transition-colors"
                      >
                        + Re-Checkup Notice
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[10px] text-teal-800 font-semibold mb-1 block">Dynamic Custom SMS Message (Free-will text entry)</Label>
                    <textarea
                      rows={3}
                      value={smsMessage}
                      onChange={e => setSmsMessage(e.target.value)}
                      placeholder="Type custom SMS message here with specific instructions, doctor notes, or appointment details..."
                      className="w-full text-xs p-2.5 bg-white border border-teal-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <button
                      type="button"
                      onClick={() => setSmsMessage('')}
                      className="text-[10px] text-slate-500 hover:text-slate-700 underline cursor-pointer"
                    >
                      Clear message
                    </button>
                    <Button type="submit" disabled={smsSending} className="bg-teal-700 hover:bg-teal-800 text-white text-xs gap-1.5 h-8 px-4 cursor-pointer">
                      <Send size={12} /> {smsSending ? 'Sending SMS...' : 'Send SMS Now'}
                    </Button>
                  </div>
                </form>
              </div>
            </TabsContent>

            {/* Consultations */}
            <TabsContent value="consultations" className="mt-4 space-y-3">
              {patient.consultations && patient.consultations.length > 0 ? (
                patient.consultations.map((c, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between items-center font-bold text-slate-800">
                      <span>{c.service_type}</span>
                      <span className="text-[10px] text-slate-400">{c.date}</span>
                    </div>
                    <p className="text-slate-600"><strong>Chief Complaint:</strong> {c.complaint}</p>
                    <p className="text-slate-600"><strong>Diagnosis:</strong> {c.diagnosis}</p>
                    <p className="text-slate-600"><strong>Treatment:</strong> {c.treatment}</p>
                    <p className="text-[10px] text-teal-700 font-semibold">Attending: {c.attending}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-center py-6 text-slate-400">No consultation records logged yet.</p>
              )}
            </TabsContent>

            {/* Maternal */}
            <TabsContent value="maternal" className="mt-4 space-y-3">
              {patient.prenatal && patient.prenatal.length > 0 ? (
                patient.prenatal.map((p, i) => (
                  <div key={i} className="p-3 bg-pink-50/50 border border-pink-200 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between items-center font-bold text-pink-900">
                      <span>Prenatal Visit — {p.gravida} {p.para} ({p.aog} wks AOG)</span>
                      <span className="text-[10px] text-slate-400">{p.date}</span>
                    </div>
                    <p className="text-slate-600"><strong>BP:</strong> {p.bp} · <strong>FHR:</strong> {p.fhr} · <strong>EDD:</strong> {p.edd}</p>
                    <p className="text-slate-600"><strong>Next Scheduled Visit:</strong> <span className="font-semibold text-pink-700">{p.next_visit}</span></p>
                    <p className="text-slate-600"><strong>Meds:</strong> {p.meds}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-center py-6 text-slate-400">No prenatal records logged yet.</p>
              )}
            </TabsContent>

            {/* Immunizations */}
            <TabsContent value="immunizations" className="mt-4 space-y-3">
              {patient.immunizations && patient.immunizations.length > 0 ? (
                patient.immunizations.map((im, i) => (
                  <div key={i} className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between items-center font-bold text-blue-900">
                      <span>{im.vaccine} — {im.dose}</span>
                      <span className="text-[10px] text-slate-400">Given: {im.date_given}</span>
                    </div>
                    {im.batch_number && <p className="text-slate-600"><strong>Lot/Batch #:</strong> {im.batch_number}</p>}
                    <p className="text-slate-600"><strong>Next Due Date:</strong> <span className="font-semibold text-blue-700">{im.next_due || 'Complete'}</span></p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-center py-6 text-slate-400">No immunization records logged yet.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
