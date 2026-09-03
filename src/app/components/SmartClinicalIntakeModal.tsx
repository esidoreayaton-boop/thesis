import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Stethoscope,
  Heart,
  Baby,
  Pill,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  UserCheck,
  Calendar,
  Activity,
  User,
  MapPin,
  Phone,
  Sparkles,
  History,
  Check,
  Edit2
} from 'lucide-react';
import { apiService } from '../../services/api';
import { toast } from 'sonner';

interface SmartClinicalIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  barangay?: string;
  attendingWorker?: string;
  workerRole?: string;
}

export default function SmartClinicalIntakeModal({
  isOpen,
  onClose,
  onSuccess,
  barangay = 'Pianing',
  attendingWorker = 'Healthcare Worker',
  workerRole = 'nurse'
}: SmartClinicalIntakeModalProps) {
  // Step State
  const [step, setStep] = useState<'identify' | 'vitals' | 'program'>('identify');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [matchedPatient, setMatchedPatient] = useState<any | null>(null);
  const [isVerifiedSame, setIsVerifiedSame] = useState<boolean | null>(null);
  const [previousEncounter, setPreviousEncounter] = useState<any | null>(null);

  // Demographics
  const [patientName, setPatientName] = useState('');
  const [gender, setGender] = useState<'Female' | 'Male'>('Female');
  const [birthday, setBirthday] = useState('');
  const [age, setAge] = useState('');
  const [civilStatus, setCivilStatus] = useState('Single');
  const [purok, setPurok] = useState('Purok 1');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Vitals
  const [bpSystolic, setBpSystolic] = useState('120');
  const [bpDiastolic, setBpDiastolic] = useState('80');
  const [temp, setTemp] = useState('36.5');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [heartRate, setHeartRate] = useState('75');

  // Program Selection (1 of 4)
  const [selectedProgram, setSelectedProgram] = useState<'Consultation' | 'Prenatal' | 'Family Planning' | 'NIP Immunization'>('Consultation');

  // Consultation fields
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [prescribedMeds, setPrescribedMeds] = useState('');

  // Prenatal fields
  const [lmp, setLmp] = useState('');
  const [edd, setEdd] = useState('');
  const [aogWeeks, setAogWeeks] = useState('');
  const [gravida, setGravida] = useState('1');
  const [para, setPara] = useState('0');
  const [fetalHeartRate, setFetalHeartRate] = useState('140');
  const [fundicHeight, setFundicHeight] = useState('20');

  // Family Planning fields
  const [fpMethod, setFpMethod] = useState('DMPA Injectable (Depo)');
  const [fpClientType, setFpClientType] = useState('Current User');
  const [fpNextSupply, setFpNextSupply] = useState('');

  // NIP Immunization fields
  const [vaccineName, setVaccineName] = useState('Pentavalent (DPT-HepB-Hib)');
  const [doseNumber, setDoseNumber] = useState('1');
  const [nextDueDate, setNextDueDate] = useState('');

  // Follow-up
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-compute Age from Birthday
  useEffect(() => {
    if (birthday) {
      const birth = new Date(birthday);
      const now = new Date();
      let computed = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        computed--;
      }
      setAge(computed >= 0 ? String(computed) : '');
    }
  }, [birthday]);

  // Auto-compute EDD and AOG from LMP
  useEffect(() => {
    if (lmp) {
      const lmpDate = new Date(lmp);
      if (!isNaN(lmpDate.getTime())) {
        // Naegele's rule: LMP + 1 year - 3 months + 7 days = LMP + 280 days
        const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
        setEdd(eddDate.toISOString().split('T')[0]);

        // AOG weeks
        const diffDays = Math.floor((Date.now() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diffDays / 7);
        setAogWeeks(weeks > 0 ? `${weeks} weeks` : '1 week');
      }
    }
  }, [lmp]);

  // Search patients
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      setIsSearching(true);
      const timeout = setTimeout(() => {
        apiService.searchPatients(searchQuery)
          .then(res => setSearchResults(res.patients || []))
          .catch(() => setSearchResults([]))
          .finally(() => setIsSearching(false));
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const selectMatchedPatient = (p: any) => {
    setMatchedPatient(p);
    setPatientName(p.name);
    setGender(p.gender || 'Female');
    setBirthday(p.date_of_birth ? p.date_of_birth.split('T')[0] : '');
    setCivilStatus(p.civil_status || 'Single');
    setPurok(p.purok || 'Purok 1');
    setPhone(p.phone || '');
    setEmail(p.email || '');
    setPreviousEncounter(p.previous_encounter || null);
    setIsVerifiedSame(null); // ask verification
  };

  const handleConfirmExisting = () => {
    setIsVerifiedSame(true);
    toast.success('Patient details confirmed! Proceeding to Vitals assessment.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      toast.error('Patient name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const bpValue = `${bpSystolic}/${bpDiastolic} mmHg`;

      const payload = {
        patient_name: patientName.trim(),
        contact_number: phone.trim(),
        age: age || '—',
        gender,
        civil_status: civilStatus,
        purok,
        barangay,
        email: email.trim(),
        bp: bpValue,
        temp,
        weight,
        height,
        heart_rate: heartRate,
        program_type: selectedProgram,
        // Program specific
        chief_complaint: chiefComplaint,
        diagnosis: diagnosis,
        treatment: treatment,
        prescribed_meds: prescribedMeds,
        lmp: lmp || undefined,
        edd: edd || undefined,
        aog_weeks: aogWeeks || undefined,
        gravida,
        para,
        fetal_heart_rate: fetalHeartRate,
        fundic_height: fundicHeight,
        method_chosen: fpMethod,
        client_type: fpClientType,
        next_supply_date: fpNextSupply || nextVisitDate || undefined,
        vaccine_name: vaccineName,
        dose_number: doseNumber,
        due_date: nextDueDate || nextVisitDate || undefined,
        next_visit_date: nextVisitDate || undefined,
        attending_worker: attendingWorker
      };

      await apiService.submitClinicalIntake(payload);
      toast.success(`Clinical intake for ${patientName} saved successfully!`, {
        description: `Program: ${selectedProgram} | SMS confirmation dispatched to ${phone || 'patient'}`
      });

      if (onSuccess) onSuccess();
      handleReset();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit clinical intake');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setMatchedPatient(null);
    setIsVerifiedSame(null);
    setPreviousEncounter(null);
    setSearchQuery('');
    setPatientName('');
    setPhone('');
    setEmail('');
    setBirthday('');
    setAge('');
    setChiefComplaint('');
    setDiagnosis('');
    setTreatment('');
    setPrescribedMeds('');
    setNextVisitDate('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) { handleReset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto bg-white p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-teal-100 text-teal-800 border border-teal-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                Clinical Health Intake
              </span>
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <MapPin size={12} className="text-teal-600" /> Barangay {barangay} Health Center
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Attending: {attendingWorker}</span>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Stethoscope className="text-teal-600" size={20} />
            Patient Health Intake &amp; Program Registration
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Intake patient demographics, vital signs, and route to Consultation, Prenatal, Family Planning, or NIP.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* ═══ SECTION 1: SEARCH & RETURNING PATIENT RECALL ═══ */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Search size={14} className="text-teal-600" />
                Quick Patient Search / Returning Patient Recall
              </Label>
              <span className="text-[10px] text-slate-400">Search by Name or Mobile Phone</span>
            </div>

            <div className="relative">
              <Input
                placeholder="Type name (e.g. Maria Santos) or phone to look up existing records..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 text-xs bg-white pr-8"
              />
              {isSearching && (
                <div className="absolute right-2.5 top-2.5">
                  <span className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin block" />
                </div>
              )}
            </div>

            {/* Live Search Suggestions Dropdown */}
            {searchResults.length > 0 && !matchedPatient && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map(p => (
                  <div
                    key={p.id}
                    onClick={() => selectMatchedPatient(p)}
                    className="p-2.5 hover:bg-teal-50/70 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {p.gender} · {p.purok} · Phone: {p.phone || 'No phone'}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-teal-50 text-teal-700 text-[10px] font-semibold border-teal-200">
                      Select Patient
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* ═══ RETURNING PATIENT VERIFICATION CARD ═══ */}
            {matchedPatient && (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                    <UserCheck size={16} className="text-emerald-600" />
                    Existing Patient Found: {matchedPatient.name}
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Record Linked</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] text-emerald-800 bg-white/70 p-2 rounded-lg border border-emerald-100">
                  <div><span className="font-semibold text-slate-500">Gender/Age:</span> {gender} ({age || '—'} yrs)</div>
                  <div><span className="font-semibold text-slate-500">Purok:</span> {purok}</div>
                  <div><span className="font-semibold text-slate-500">Phone:</span> {phone || 'None'}</div>
                </div>

                {isVerifiedSame === null ? (
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60">
                    <span className="text-[11px] text-slate-600 font-medium">Are these details still accurate?</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleConfirmExisting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 gap-1 font-semibold cursor-pointer"
                      >
                        <Check size={12} /> Confirm &amp; Keep Info
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsVerifiedSame(false)}
                        className="text-xs h-7 gap-1 border-slate-300 text-slate-600 cursor-pointer"
                      >
                        <Edit2 size={12} /> Update Details
                      </Button>
                    </div>
                  </div>
                ) : isVerifiedSame === true ? (
                  <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Patient information verified. No re-typing needed!
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-700 font-medium">
                    You may edit the fields below to update the patient's record.
                  </div>
                )}
              </div>
            )}

            {/* ═══ PREVIOUS VISIT SUMMARY (CLINICAL CONTINUITY) ═══ */}
            {previousEncounter && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-1 text-xs">
                <div className="flex items-center justify-between font-bold text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <History size={14} className="text-blue-600" />
                    Previous Clinical Visit ({previousEncounter.encounter_date || 'Past Month'})
                  </span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">
                    {previousEncounter.program_type || 'Consultation'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 text-slate-700">
                  <div><span className="text-slate-400 font-semibold">Prev BP:</span> {previousEncounter.bp || '120/80'}</div>
                  <div><span className="text-slate-400 font-semibold">Prev Temp:</span> {previousEncounter.temp || '36.5'}°C</div>
                  <div><span className="text-slate-400 font-semibold">Diagnosis:</span> {previousEncounter.diagnosis || 'Upper Resp Infection'}</div>
                  <div><span className="text-slate-400 font-semibold">Rx:</span> {previousEncounter.prescribed_meds || 'Amoxicillin'}</div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ SECTION 2: PATIENT DEMOGRAPHICS ═══ */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">1. Patient Basic Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">Full Patient Name <span className="text-red-500">*</span></Label>
                <Input
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="e.g. Maria Clara Santos"
                  required
                  className="h-9 text-xs mt-1 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Gender <span className="text-red-500">*</span></Label>
                <Select value={gender} onValueChange={(v: any) => setGender(v)}>
                  <SelectTrigger className="h-9 text-xs mt-1 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <Label className="text-xs font-semibold">Birthday</Label>
                <Input
                  type="date"
                  value={birthday}
                  onChange={e => setBirthday(e.target.value)}
                  className="h-9 text-xs mt-1 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Age</Label>
                <Input
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  placeholder="Computed age"
                  className="h-9 text-xs mt-1 bg-slate-50 font-semibold"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Civil Status</Label>
                <Select value={civilStatus} onValueChange={setCivilStatus}>
                  <SelectTrigger className="h-9 text-xs mt-1 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                    <SelectItem value="Separated">Separated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Purok / Zone</Label>
                <Select value={purok} onValueChange={setPurok}>
                  <SelectTrigger className="h-9 text-xs mt-1 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6', 'Purok 7'].map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Contact Mobile Phone <span className="text-red-500">*</span></Label>
                <Input
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="09XXXXXXXXX (11 digits)"
                  required
                  maxLength={11}
                  className="h-9 text-xs font-mono mt-1 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Email Address (Optional)</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. patient@gmail.com"
                  className="h-9 text-xs mt-1 bg-white"
                />
              </div>
            </div>
          </div>

          {/* ═══ SECTION 3: TRIAGE VITAL SIGNS ═══ */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Activity size={14} className="text-rose-500" />
                2. Triage Vital Signs Assessment
              </h4>
              <span className="text-[10px] text-slate-400">Physical Health Markers</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <Label className="text-[11px] font-semibold text-slate-600 block">Blood Pressure (BP)</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    value={bpSystolic}
                    onChange={e => setBpSystolic(e.target.value)}
                    placeholder="120"
                    className="h-8 text-xs font-mono text-center bg-white"
                  />
                  <span className="text-slate-400">/</span>
                  <Input
                    value={bpDiastolic}
                    onChange={e => setBpDiastolic(e.target.value)}
                    placeholder="80"
                    className="h-8 text-xs font-mono text-center bg-white"
                  />
                  <span className="text-[10px] text-slate-400">mmHg</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <Label className="text-[11px] font-semibold text-slate-600 block">Body Temp (°C)</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    value={temp}
                    onChange={e => setTemp(e.target.value)}
                    placeholder="36.5"
                    className="h-8 text-xs font-mono text-center bg-white"
                  />
                  <span className="text-[10px] text-slate-400">°C</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <Label className="text-[11px] font-semibold text-slate-600 block">Weight (kg)</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    placeholder="54"
                    className="h-8 text-xs font-mono text-center bg-white"
                  />
                  <span className="text-[10px] text-slate-400">kg</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <Label className="text-[11px] font-semibold text-slate-600 block">Heart Rate (bpm)</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    value={heartRate}
                    onChange={e => setHeartRate(e.target.value)}
                    placeholder="75"
                    className="h-8 text-xs font-mono text-center bg-white"
                  />
                  <span className="text-[10px] text-slate-400">bpm</span>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ SECTION 4: 4 HEALTH PROGRAM SELECTOR ═══ */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              3. Purpose of Visit / Select Health Program
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'Consultation', label: 'Consultation', icon: Stethoscope, color: 'teal', desc: 'Check-up & Illness' },
                { id: 'Prenatal', label: 'Prenatal Check', icon: Heart, color: 'pink', desc: 'Maternal Care' },
                { id: 'Family Planning', label: 'Family Planning', icon: Pill, color: 'indigo', desc: 'FP Supplies & Depo' },
                { id: 'NIP Immunization', label: 'NIP Vaccine', icon: Baby, color: 'blue', desc: 'Child Immunization' }
              ].map(prog => {
                const isSelected = selectedProgram === prog.id;
                return (
                  <button
                    type="button"
                    key={prog.id}
                    onClick={() => setSelectedProgram(prog.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/80 shadow-xs ring-2 ring-teal-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <prog.icon size={18} className={isSelected ? 'text-teal-700' : 'text-slate-500'} />
                      {isSelected && <CheckCircle2 size={14} className="text-teal-600" />}
                    </div>
                    <div className="mt-2">
                      <p className={`text-xs font-bold ${isSelected ? 'text-teal-900' : 'text-slate-800'}`}>{prog.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{prog.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── PROGRAM 1: CONSULTATION EXPANDED ── */}
            {selectedProgram === 'Consultation' && (
              <div className="p-3.5 bg-teal-50/40 border border-teal-200 rounded-xl space-y-2 mt-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-teal-900">
                  <Stethoscope size={15} className="text-teal-700" />
                  General Medical Consultation Assessment
                </div>

                <div>
                  <Label className="text-xs font-semibold">Chief Complaint / Symptoms <span className="text-red-500">*</span></Label>
                  <Input
                    value={chiefComplaint}
                    onChange={e => setChiefComplaint(e.target.value)}
                    placeholder="e.g. High fever for 3 days, dry cough, headache"
                    required={selectedProgram === 'Consultation'}
                    className="h-9 text-xs mt-1 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold">Clinical Diagnosis</Label>
                    <Input
                      value={diagnosis}
                      onChange={e => setDiagnosis(e.target.value)}
                      placeholder="e.g. Acute Upper Respiratory Tract Infection"
                      className="h-9 text-xs mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Prescriptions &amp; Treatment</Label>
                    <Input
                      value={prescribedMeds}
                      onChange={e => setPrescribedMeds(e.target.value)}
                      placeholder="e.g. Paracetamol 500mg TID, Amoxicillin 500mg"
                      className="h-9 text-xs mt-1 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── PROGRAM 2: PRENATAL EXPANDED ── */}
            {selectedProgram === 'Prenatal' && (
              <div className="p-3.5 bg-pink-50/40 border border-pink-200 rounded-xl space-y-2 mt-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-pink-900">
                  <Heart size={15} className="text-pink-600" />
                  Maternal Health &amp; Prenatal Check-up Entry
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs font-semibold">LMP (Last Period) <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      value={lmp}
                      onChange={e => setLmp(e.target.value)}
                      required={selectedProgram === 'Prenatal'}
                      className="h-9 text-xs mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Estimated Due (EDD)</Label>
                    <Input
                      value={edd}
                      readOnly
                      placeholder="Auto computed"
                      className="h-9 text-xs mt-1 bg-pink-50/70 font-semibold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Gestation (AOG)</Label>
                    <Input
                      value={aogWeeks}
                      readOnly
                      placeholder="Auto computed"
                      className="h-9 text-xs mt-1 bg-pink-50/70 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs font-semibold">Gravida (G)</Label>
                    <Input value={gravida} onChange={e => setGravida(e.target.value)} className="h-9 text-xs mt-1 bg-white text-center font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Para (P)</Label>
                    <Input value={para} onChange={e => setPara(e.target.value)} className="h-9 text-xs mt-1 bg-white text-center font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Fetal Heart (bpm)</Label>
                    <Input value={fetalHeartRate} onChange={e => setFetalHeartRate(e.target.value)} placeholder="140" className="h-9 text-xs mt-1 bg-white text-center font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Fundic Ht (cm)</Label>
                    <Input value={fundicHeight} onChange={e => setFundicHeight(e.target.value)} placeholder="20" className="h-9 text-xs mt-1 bg-white text-center font-mono" />
                  </div>
                </div>
              </div>
            )}

            {/* ── PROGRAM 3: FAMILY PLANNING EXPANDED ── */}
            {selectedProgram === 'Family Planning' && (
              <div className="p-3.5 bg-indigo-50/40 border border-indigo-200 rounded-xl space-y-2 mt-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
                  <Pill size={15} className="text-indigo-600" />
                  Family Planning (FP) Service Intake
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold">FP Method Provided <span className="text-red-500">*</span></Label>
                    <Select value={fpMethod} onValueChange={setFpMethod}>
                      <SelectTrigger className="h-9 text-xs mt-1 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DMPA Injectable (Depo)">DMPA Injectable (Depo-Provera 3-Month)</SelectItem>
                        <SelectItem value="Oral Contraceptive Pills (Combined)">Oral Contraceptive Pills (Combined)</SelectItem>
                        <SelectItem value="Progestin-Only Pills (POP)">Progestin-Only Pills (POP for breastfeeding)</SelectItem>
                        <SelectItem value="Subdermal Implants (Implanon)">Subdermal Implants (3-Year Implanon)</SelectItem>
                        <SelectItem value="Intrauterine Device (IUD)">Intrauterine Device (IUD)</SelectItem>
                        <SelectItem value="Male Condoms">Male Condoms (Supply Distribution)</SelectItem>
                        <SelectItem value="Standard Days Method (Natural)">Standard Days Method (Natural FP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Client Status</Label>
                    <Select value={fpClientType} onValueChange={setFpClientType}>
                      <SelectTrigger className="h-9 text-xs mt-1 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Current User">Current User (Resupply / Routine Injection)</SelectItem>
                        <SelectItem value="New Acceptor">New Acceptor (First Time)</SelectItem>
                        <SelectItem value="Method Switch">Method Switch (Changing Contraceptive)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* ── PROGRAM 4: NIP IMMUNIZATION EXPANDED ── */}
            {selectedProgram === 'NIP Immunization' && (
              <div className="p-3.5 bg-blue-50/40 border border-blue-200 rounded-xl space-y-2 mt-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                  <Baby size={15} className="text-blue-600" />
                  National Immunization Program (NIP) Record
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold">Vaccine Administered <span className="text-red-500">*</span></Label>
                    <Select value={vaccineName} onValueChange={setVaccineName}>
                      <SelectTrigger className="h-9 text-xs mt-1 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BCG (Birth)">BCG (Tuberculosis - At Birth)</SelectItem>
                        <SelectItem value="Hepatitis B (Birth)">Hepatitis B (Birth Dose)</SelectItem>
                        <SelectItem value="Pentavalent (DPT-HepB-Hib)">Pentavalent (DPT-HepB-Hib)</SelectItem>
                        <SelectItem value="Oral Polio Vaccine (OPV)">Oral Polio Vaccine (OPV)</SelectItem>
                        <SelectItem value="Inactivated Polio (IPV)">Inactivated Polio (IPV)</SelectItem>
                        <SelectItem value="Pneumococcal Conjugate (PCV)">Pneumococcal Conjugate (PCV)</SelectItem>
                        <SelectItem value="Measles, Mumps, Rubella (MMR)">Measles, Mumps, Rubella (MMR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Dose Number</Label>
                    <Select value={doseNumber} onValueChange={setDoseNumber}>
                      <SelectTrigger className="h-9 text-xs mt-1 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Dose 1</SelectItem>
                        <SelectItem value="2">Dose 2</SelectItem>
                        <SelectItem value="3">Dose 3</SelectItem>
                        <SelectItem value="Booster">Booster Dose</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ SECTION 5: AUTOMATED FOLLOW-UP & 1-DAY SCHEDULER ═══ */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar size={14} className="text-teal-600" />
                  Next Revisit / Due Date (Automated 1-Day Scheduler)
                </Label>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded">
                  SMS &amp; Email Ready
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Input
                    type="date"
                    value={nextVisitDate}
                    onChange={e => setNextVisitDate(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <div className="text-[11px] text-slate-500 flex items-center">
                  <span>Patient will automatically receive an SMS &amp; Email reminder 1 day before this date.</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold w-full h-10 shadow-sm cursor-pointer gap-2"
            >
              {isSubmitting ? (
                <span>Recording Encounter &amp; Sending Alerts...</span>
              ) : (
                <>
                  <Send size={14} /> Complete Clinical Intake &amp; Dispatch Alerts
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
