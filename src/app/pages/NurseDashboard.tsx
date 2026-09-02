import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Stethoscope, Heart, Baby, Activity, CalendarCheck, Clock,
  CheckCircle2, PlusCircle, RefreshCcw, LogOut, MapPin, Pill,
  Syringe, Calendar, Check, X, Menu, Phone, Edit2, Trash2, Bell,
  AlertTriangle, Send, Package, ClipboardList, UserPlus, Save, Archive, Eye, User
} from 'lucide-react';
import {
  apiService, ImmunizationRecord, MaternalRecord,
  HealthAppointment, ClinicSchedule, Resident
} from '../../services/api';
import PatientDetailModal, { PatientRecordData } from '../components/PatientDetailModal';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

// ── Interfaces ─────────────────────────────────────────────────────────────

interface ClinicalConsultation {
  id: number | string;
  patient_name: string;
  contact_number: string;
  age: number | string;
  gender: string;
  barangay: string;
  service_type: string;
  bp: string; temp: string; weight: string; heart_rate: string;
  chief_complaint: string; diagnosis: string; treatment: string;
  attending_nurse: string; consultation_date: string;
  status?: string;
}

interface InventoryItem {
  id: number | string;
  item_name: string;
  category: string;
  stock: number;
  unit: string;
  expiry_date: string;
  status: string;
}

interface PrenatalRecord {
  id: number | string;
  patient_name: string;
  contact_number: string;
  age: number | string;
  barangay: string;
  gravida: string; para: string;
  lmp: string; edd: string; aog_weeks: string;
  bp: string; weight: string; temp: string;
  fetal_heart_rate: string; fundic_height: string;
  next_visit_date: string; next_visit_note: string;
  prescribed_meds: string; attending_nurse: string;
  visit_date: string; visit_number: number;
  sms_sent: boolean;
}

interface ImmunRecord {
  id: number | string;
  child_name: string;
  contact_number: string;
  age_months: string;
  gender?: string;
  guardian: string;
  barangay: string;
  weight?: string;
  height?: string;
  temp?: string;
  vaccine_given: string;
  dose_number: string;
  batch_number?: string;
  date_given: string;
  next_due_date: string;
  remarks?: string;
  attending_nurse: string;
  sms_sent: boolean;
}

interface WeeklySchedule {
  id: number | string;
  title: string;
  service_type: string;
  day: string;
  time_slot: string;
  location: string;
  assigned_to: string;
  posted_date: string;
}

interface EncounterArchive {
  id: number | string;
  patient_name: string;
  contact_number: string;
  encounter_type: string;
  details: string;
  date: string;
  attending: string;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function NurseDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'consultations' | 'maternal' | 'immunizations' | 'schedule' | 'inventory' | 'archives' | 'sms'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // User session
  const [user] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('barangay_user') || 'null'); } catch { return null; }
  });
  const nurseBarangay = user?.barangay || 'Pianing';
  const nurseName = user?.name || 'Health Center Nurse';

  // Auth guard
  useEffect(() => {
    const stored = localStorage.getItem('barangay_user');
    if (!stored) { navigate('/login'); return; }
    try {
      const role = (JSON.parse(stored)?.role || '').toLowerCase().trim();
      if (role !== 'nurse') navigate('/login');
    } catch { navigate('/login'); }
  }, [navigate]);

  // API Data States
  const [appointments, setAppointments] = useState<HealthAppointment[]>([]);

  // 360 Patient Modal
  const [selectedPatientModal, setSelectedPatientModal] = useState<PatientRecordData | null>(null);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);

  // Clinical Consultations State
  const [consultations, setConsultations] = useState<ClinicalConsultation[]>([
    { id: 1, patient_name: 'Elena Ramos-Santos', contact_number: '09171234567', age: 28, gender: 'Female', barangay: nurseBarangay, service_type: 'Prenatal Care', bp: '118/76 mmHg', temp: '36.5 °C', weight: '56.4 kg', heart_rate: '78 bpm', chief_complaint: 'Routine 2nd Trimester follow-up', diagnosis: 'IUP 22 Weeks AOG, Normal', treatment: 'FeSO4 + Folic Acid 400mcg daily', attending_nurse: nurseName, consultation_date: new Date().toISOString().split('T')[0], status: 'Completed' },
    { id: 2, patient_name: 'Roberto Manalo', contact_number: '09289876543', age: 58, gender: 'Male', barangay: nurseBarangay, service_type: 'General Consultation', bp: '135/85 mmHg', temp: '36.7 °C', weight: '68.0 kg', heart_rate: '82 bpm', chief_complaint: 'Headache, BP monitoring', diagnosis: 'Stage 1 Hypertension, well-controlled', treatment: 'Amlodipine 5mg OD, low sodium diet', attending_nurse: nurseName, consultation_date: new Date().toISOString().split('T')[0], status: 'Completed' },
  ]);

  // Prenatal Records State
  const [prenatalRecords, setPrenatalRecords] = useState<PrenatalRecord[]>([
    { id: 1, patient_name: 'Elena Ramos-Santos', contact_number: '09171234567', age: 28, barangay: nurseBarangay, gravida: 'G2', para: 'P1', lmp: '2025-02-10', edd: '2025-11-17', aog_weeks: '22', bp: '118/76', weight: '56.4', temp: '36.5', fetal_heart_rate: '148 bpm', fundic_height: '22 cm', next_visit_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], next_visit_note: '3rd Trimester Check-up', prescribed_meds: 'FeSO4 60mg + Folic Acid 400mcg', attending_nurse: nurseName, visit_date: new Date().toISOString().split('T')[0], visit_number: 2, sms_sent: false },
  ]);

  // Immunization Records State (Standard DOH Fields)
  const [immunRecords, setImmunRecords] = useState<ImmunRecord[]>([
    { id: 1, child_name: 'Baby Liam Kenneth Diaz', contact_number: '09151234567', age_months: '6', gender: 'Male', guardian: 'Maria Diaz', barangay: nurseBarangay, weight: '7.8 kg', height: '66 cm', temp: '36.6 °C', vaccine_given: 'Pentavalent (DPT-HepB-Hib)', dose_number: 'Dose 3', batch_number: 'LOT-2026-X9', date_given: new Date().toISOString().split('T')[0], next_due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], remarks: 'Tolerated well, no adverse reactions', attending_nurse: nurseName, sms_sent: false },
    { id: 2, child_name: 'Baby Sofia Grace Reyes', contact_number: '09281234567', age_months: '2', gender: 'Female', guardian: 'Lyn Reyes', barangay: nurseBarangay, weight: '4.5 kg', height: '54 cm', temp: '36.5 °C', vaccine_given: 'BCG', dose_number: 'Single Dose', batch_number: 'LOT-2026-BCG1', date_given: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0], next_due_date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0], remarks: 'Scar forming on left arm', attending_nurse: nurseName, sms_sent: false },
  ]);

  // Inventory State (NO cold_chain)
  const [inventory, setInventory] = useState<InventoryItem[]>([
    { id: 1, item_name: 'Pentavalent Vaccine (DPT-HepB-Hib)', category: 'Vaccine (EPI)', stock: 45, unit: 'vials', expiry_date: '2026-06-30', status: 'In Stock' },
    { id: 2, item_name: 'PCV 13 (Pneumococcal Conjugate)', category: 'Vaccine (EPI)', stock: 32, unit: 'vials', expiry_date: '2026-09-30', status: 'In Stock' },
    { id: 3, item_name: 'Measles-Rubella (MR) Vaccine', category: 'Vaccine (EPI)', stock: 8, unit: 'vials', expiry_date: '2026-03-15', status: 'Low Stock' },
    { id: 4, item_name: 'Ferrous Sulfate + Folic Acid', category: 'Maternal Vitamin', stock: 1200, unit: 'tablets', expiry_date: '2027-01-01', status: 'In Stock' },
    { id: 5, item_name: 'Calcium Carbonate 500mg', category: 'Maternal Vitamin', stock: 850, unit: 'tablets', expiry_date: '2026-12-31', status: 'In Stock' },
    { id: 6, item_name: 'Paracetamol 500mg Tablet', category: 'Essential Medicine', stock: 600, unit: 'tablets', expiry_date: '2027-06-30', status: 'In Stock' },
    { id: 7, item_name: 'Oral Rehydration Salts (ORS)', category: 'Pediatric Supply', stock: 0, unit: 'packets', expiry_date: '2026-08-01', status: 'Out of Stock' },
  ]);

  // Weekly Schedule State (NO slots, operating hours only)
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([
    { id: 1, title: 'Prenatal & Maternal Care Clinic', service_type: 'Prenatal Care', day: 'Every Monday & Thursday', time_slot: '8:00 AM – 12:00 PM & 1:00 PM – 4:00 PM', location: `Barangay ${nurseBarangay} Health Center`, assigned_to: nurseName, posted_date: new Date().toISOString().split('T')[0] },
    { id: 2, title: 'EPI Child Immunization Day', service_type: 'Child Immunization', day: 'Every Wednesday', time_slot: '8:00 AM – 12:00 PM', location: `Barangay ${nurseBarangay} Health Center`, assigned_to: nurseName, posted_date: new Date().toISOString().split('T')[0] },
    { id: 3, title: 'General Medical Consultation', service_type: 'General Consultation', day: 'Every Tuesday & Friday', time_slot: '8:00 AM – 12:00 PM & 1:00 PM – 4:00 PM', location: `Barangay ${nurseBarangay} Health Center`, assigned_to: nurseName, posted_date: new Date().toISOString().split('T')[0] },
  ]);

  // Encounters Archive Log
  const [archives, setArchives] = useState<EncounterArchive[]>([
    { id: 1, patient_name: 'Elena Ramos-Santos', contact_number: '09171234567', encounter_type: 'Prenatal Consultation', details: 'AOG 22 Wks. FeSO4 prescribed.', date: new Date().toISOString().split('T')[0], attending: nurseName },
    { id: 2, patient_name: 'Baby Liam Kenneth Diaz', contact_number: '09151234567', encounter_type: 'Immunization (Pentavalent-3)', details: 'Dose 3 administered successfully.', date: new Date().toISOString().split('T')[0], attending: nurseName },
  ]);

  // Modals state
  const [isNewConsultOpen, setIsNewConsultOpen] = useState(false);
  const [isNewPrenatalOpen, setIsNewPrenatalOpen] = useState(false);
  const [isNewImmunOpen, setIsNewImmunOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isEditInventoryOpen, setIsEditInventoryOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WeeklySchedule | null>(null);

  // Consult Form State
  const [cName, setCName] = useState(''); const [cPhone, setCPhone] = useState('');
  const [cAge, setCAge] = useState(''); const [cGender, setCGender] = useState<'Male'|'Female'>('Female');
  const [cService, setCService] = useState('General Consultation');
  const [cBp, setCBp] = useState('120/80'); const [cTemp, setCTemp] = useState('36.5');
  const [cWeight, setCWeight] = useState(''); const [cHR, setCHR] = useState('75');
  const [cComplaint, setCComplaint] = useState(''); const [cDiagnosis, setCDiagnosis] = useState('');
  const [cTreatment, setCTreatment] = useState('');

  // Prenatal Form State
  const [pName, setPName] = useState(''); const [pPhone, setPPhone] = useState('');
  const [pAge, setPAge] = useState(''); const [pGravida, setPGravida] = useState('G1');
  const [pPara, setPPara] = useState('P0'); const [pLmp, setPLmp] = useState('');
  const [pEdd, setPEdd] = useState(''); const [pAog, setPAog] = useState('');
  const [pBp, setPBp] = useState('120/80'); const [pWeight, setPWeight] = useState('');
  const [pTemp, setPTemp] = useState('36.5'); const [pFhr, setPFhr] = useState('');
  const [pFh, setPFh] = useState(''); const [pNextDate, setPNextDate] = useState('');
  const [pNextNote, setPNextNote] = useState(''); const [pMeds, setPMeds] = useState('FeSO4 + Folic Acid');

  // Immunization Form State (Full DOH Barangay Health Center Standard)
  const [iChild, setIChild] = useState(''); const [iPhone, setIPhone] = useState('');
  const [iAge, setIAge] = useState(''); const [iGender, setIGender] = useState('Male');
  const [iGuardian, setIGuardian] = useState(''); const [iWeight, setIWeight] = useState('');
  const [iHeight, setIHeight] = useState(''); const [iTemp, setITemp] = useState('36.5');
  const [iVaccine, setIVaccine] = useState('Pentavalent (DPT-HepB-Hib)'); const [iDose, setIDose] = useState('Dose 1');
  const [iBatch, setIBatch] = useState(''); const [iDateGiven, setIDateGiven] = useState(new Date().toISOString().split('T')[0]);
  const [iNextDue, setINextDue] = useState(''); const [iRemarks, setIRemarks] = useState('Cleared for routine vaccination');

  // Inventory Form State
  const [invName, setInvName] = useState(''); const [invCat, setInvCat] = useState('Vaccine (EPI)');
  const [invStock, setInvStock] = useState(''); const [invUnit, setInvUnit] = useState('vials');
  const [invExpiry, setInvExpiry] = useState('');

  // Schedule Form State
  const [sTitle, setSTitle] = useState(''); const [sService, setSService] = useState('Prenatal Care');
  const [sDay, setSDay] = useState('Every Monday'); const [sTime, setSTime] = useState('8:00 AM – 12:00 PM & 1:00 PM – 4:00 PM');
  const [sLocation, setSLocation] = useState(`Barangay ${nurseBarangay} Health Center`);

  // Load API data
  const loadData = async () => {
    setLoading(true);
    try {
      const [apts, schedules] = await Promise.all([
        apiService.getAppointments({ barangay: nurseBarangay }).catch(() => []),
        apiService.getClinicSchedules(nurseBarangay).catch(() => [])
      ]);
      setAppointments(apts);
      if (schedules && schedules.length > 0) {
        setWeeklySchedules(schedules.map((s: any) => ({
          id: s.id,
          title: s.title,
          service_type: s.service_type,
          day: s.day_of_week || s.day,
          time_slot: s.time_slot,
          location: s.location || `Barangay ${nurseBarangay} Health Center`,
          assigned_to: s.bhw_in_charge || s.assigned_to || nurseName,
          posted_date: s.posted_date || new Date().toISOString().split('T')[0]
        })));
      }
    } catch { toast.error('Failed to refresh records'); } finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, []);

  // Due alerts calculation
  const overduePrenatal = useMemo(() =>
    prenatalRecords.filter(r => r.next_visit_date && new Date(r.next_visit_date) <= new Date()), [prenatalRecords]);

  const overdueImmun = useMemo(() =>
    immunRecords.filter(r => r.next_due_date && new Date(r.next_due_date) <= new Date()), [immunRecords]);

  const upcomingPrenatal = useMemo(() =>
    prenatalRecords.filter(r => {
      if (!r.next_visit_date) return false;
      const diff = (new Date(r.next_visit_date).getTime() - Date.now()) / 86400000;
      return diff > 0 && diff <= 7;
    }), [prenatalRecords]);

  const upcomingImmun = useMemo(() =>
    immunRecords.filter(r => {
      if (!r.next_due_date) return false;
      const diff = (new Date(r.next_due_date).getTime() - Date.now()) / 86400000;
      return diff > 0 && diff <= 7;
    }), [immunRecords]);

  // Open 360 Patient Profile Modal
  const openPatient360 = (name: string, phone: string, barangay?: string) => {
    const patientCons = consultations.filter(c => c.patient_name.toLowerCase() === name.toLowerCase()).map(c => ({
      id: c.id, date: c.consultation_date, service_type: c.service_type, vitals: `BP: ${c.bp}, Temp: ${c.temp}`,
      complaint: c.chief_complaint, diagnosis: c.diagnosis, treatment: c.treatment, attending: c.attending_nurse
    }));

    const patientPrenatal = prenatalRecords.filter(p => p.patient_name.toLowerCase() === name.toLowerCase()).map(p => ({
      id: p.id, date: p.visit_date, gravida: p.gravida, para: p.para, lmp: p.lmp, edd: p.edd, aog: p.aog_weeks,
      bp: p.bp, fhr: p.fetal_heart_rate, next_visit: p.next_visit_date, meds: p.prescribed_meds, attending: p.attending_nurse
    }));

    const patientImmun = immunRecords.filter(i => i.child_name.toLowerCase() === name.toLowerCase()).map(i => ({
      id: i.id, vaccine: i.vaccine_given, dose: i.dose_number, date_given: i.date_given, next_due: i.next_due_date,
      batch_number: i.batch_number, attending: i.attending_nurse
    }));

    setSelectedPatientModal({
      id: Date.now(),
      name,
      contact_number: phone,
      barangay: barangay || nurseBarangay,
      consultations: patientCons,
      prenatal: patientPrenatal,
      immunizations: patientImmun
    });
    setIsPatientModalOpen(true);
  };

  const handleLogReturnVisitFromModal = (pData: PatientRecordData) => {
    setCName(pData.name);
    setCPhone(pData.contact_number || '');
    setCAge(pData.age ? String(pData.age) : '');
    setCGender((pData.gender as any) || 'Female');
    setCService('General Consultation');
    setCBp(pData.bp || '120/80');
    setCTemp(pData.temp || '36.5');
    setCWeight(pData.weight ? String(pData.weight) : '');
    setCHR('78');
    setCComplaint('Follow-up Checkup / Return Visit');
    setCDiagnosis('');
    setCTreatment('');
    setIsPatientModalOpen(false);
    setIsNewConsultOpen(true);
    toast.info(`Pre-filled return visit consultation for ${pData.name}`);
  };

  // Handlers
  const handleCreateConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) { toast.error('Patient name is required'); return; }
    const newConsult: ClinicalConsultation = {
      id: Date.now(), patient_name: cName.trim(), contact_number: cPhone.trim(),
      age: cAge || '—', gender: cGender, barangay: nurseBarangay, service_type: cService,
      bp: cBp ? `${cBp} mmHg` : 'N/A', temp: cTemp ? `${cTemp} °C` : 'N/A',
      weight: cWeight ? `${cWeight} kg` : 'N/A', heart_rate: cHR ? `${cHR} bpm` : 'N/A',
      chief_complaint: cComplaint || 'Routine Health Visit',
      diagnosis: cDiagnosis || 'Assessment Complete',
      treatment: cTreatment || 'Health counseling advised.',
      attending_nurse: nurseName, consultation_date: new Date().toISOString().split('T')[0], status: 'Completed'
    };

    setConsultations(prev => [newConsult, ...prev]);

    // Auto-archive encounter
    setArchives(prev => [{
      id: Date.now(),
      patient_name: cName.trim(),
      contact_number: cPhone.trim(),
      encounter_type: `Consultation (${cService})`,
      details: `Diagnosis: ${cDiagnosis || 'Assessment Complete'}. Treatment: ${cTreatment || 'Counseling'}`,
      date: new Date().toISOString().split('T')[0],
      attending: nurseName
    }, ...prev]);

    toast.success('Consultation recorded & saved to Patient Archives!');
    setIsNewConsultOpen(false);
    setCName(''); setCPhone(''); setCAge(''); setCComplaint(''); setCDiagnosis(''); setCTreatment('');
  };

  const handleCreatePrenatal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) { toast.error('Patient name is required'); return; }
    if (!pPhone.trim()) { toast.error('Contact number is required for SMS reminders'); return; }
    if (!pLmp) { toast.error('Last Menstrual Period (LMP) is required'); return; }
    if (!pNextDate) { toast.error('Next visit date is required'); return; }
    const rec: PrenatalRecord = {
      id: Date.now(), patient_name: pName.trim(), contact_number: pPhone.trim(),
      age: pAge || '—', barangay: nurseBarangay, gravida: pGravida, para: pPara,
      lmp: pLmp, edd: pEdd, aog_weeks: pAog, bp: pBp, weight: pWeight,
      temp: pTemp, fetal_heart_rate: pFhr, fundic_height: pFh,
      next_visit_date: pNextDate, next_visit_note: pNextNote,
      prescribed_meds: pMeds, attending_nurse: nurseName,
      visit_date: new Date().toISOString().split('T')[0],
      visit_number: prenatalRecords.filter(r => r.patient_name === pName.trim()).length + 1,
      sms_sent: false
    };

    setPrenatalRecords(prev => [rec, ...prev]);

    // Auto-archive
    setArchives(prev => [{
      id: Date.now(),
      patient_name: pName.trim(),
      contact_number: pPhone.trim(),
      encounter_type: 'Prenatal Care Visit',
      details: `AOG: ${pAog} wks. Next visit: ${pNextDate}. Meds: ${pMeds}`,
      date: new Date().toISOString().split('T')[0],
      attending: nurseName
    }, ...prev]);

    toast.success(`Prenatal record for ${pName} saved & archived!`);
    setIsNewPrenatalOpen(false);
    setPName(''); setPPhone(''); setPAge(''); setPLmp(''); setPEdd(''); setPAog('');
    setPBp('120/80'); setPWeight(''); setPTemp('36.5'); setPFhr(''); setPFh('');
    setPNextDate(''); setPNextNote(''); setPMeds('FeSO4 + Folic Acid');
  };

  const handleCreateImmun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!iChild.trim()) { toast.error('Child name is required'); return; }
    if (!iPhone.trim()) { toast.error('Contact number is required for SMS reminders'); return; }
    if (!iGuardian.trim()) { toast.error('Guardian name is required'); return; }
    const rec: ImmunRecord = {
      id: Date.now(), child_name: iChild.trim(), contact_number: iPhone.trim(),
      age_months: iAge, gender: iGender, guardian: iGuardian.trim(), barangay: nurseBarangay,
      weight: iWeight, height: iHeight, temp: iTemp,
      vaccine_given: iVaccine, dose_number: iDose, batch_number: iBatch || `LOT-${new Date().getFullYear()}-EPI`,
      date_given: iDateGiven, next_due_date: iNextDue, remarks: iRemarks,
      attending_nurse: nurseName, sms_sent: false
    };

    setImmunRecords(prev => [rec, ...prev]);

    // Auto-archive
    setArchives(prev => [{
      id: Date.now(),
      patient_name: `${iChild.trim()} (Guardian: ${iGuardian.trim()})`,
      contact_number: iPhone.trim(),
      encounter_type: `Immunization (${iVaccine})`,
      details: `Dose: ${iDose}. Batch #: ${iBatch || 'EPI-Standard'}. Remarks: ${iRemarks}`,
      date: iDateGiven,
      attending: nurseName
    }, ...prev]);

    toast.success(`Immunization for ${iChild} recorded & archived!`);
    setIsNewImmunOpen(false);
    setIChild(''); setIPhone(''); setIAge(''); setIGuardian(''); setIVaccine('Pentavalent (DPT-HepB-Hib)');
    setIDose('Dose 1'); setIBatch(''); setINextDue(''); setIRemarks('Cleared for routine vaccination');
  };

  const handleAddInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName.trim()) { toast.error('Item name is required'); return; }
    const qty = parseInt(invStock) || 0;
    setInventory(prev => [{
      id: Date.now(), item_name: invName.trim(), category: invCat,
      stock: qty, unit: invUnit, expiry_date: invExpiry,
      status: qty === 0 ? 'Out of Stock' : qty < 10 ? 'Low Stock' : 'In Stock'
    }, ...prev]);
    toast.success(`${invName} added to inventory!`);
    setIsInventoryOpen(false);
    setInvName(''); setInvCat('Vaccine (EPI)'); setInvStock(''); setInvUnit('vials'); setInvExpiry('');
  };

  const handleUpdateInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const qty = editingItem.stock;
    setInventory(prev => prev.map(i => i.id === editingItem.id ? {
      ...editingItem,
      status: qty === 0 ? 'Out of Stock' : qty < 10 ? 'Low Stock' : 'In Stock'
    } : i));
    toast.success('Inventory item updated!');
    setIsEditInventoryOpen(false); setEditingItem(null);
  };

  const handleDeleteInventory = (id: number | string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
    toast.success('Item removed from inventory');
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sTitle.trim()) { toast.error('Schedule title is required'); return; }
    const newSch: WeeklySchedule = {
      id: Date.now(), title: sTitle.trim(), service_type: sService,
      day: sDay, time_slot: sTime, location: sLocation,
      assigned_to: nurseName, posted_date: new Date().toISOString().split('T')[0]
    };
    setWeeklySchedules(prev => [newSch, ...prev]);
    try {
      const created = await apiService.createClinicSchedule({
        title: sTitle.trim(),
        service_type: sService,
        day_of_week: sDay,
        time_slot: sTime,
        location: sLocation,
        bhw_in_charge: nurseName,
        barangay: nurseBarangay,
        created_by: nurseName
      });
      if (created && created.id) {
        setWeeklySchedules(prev => prev.map(s => s.id === newSch.id ? { ...s, id: created.id } : s));
      }
    } catch {
      // Local state is already updated as fallback
    }
    toast.success('Weekly clinic schedule posted!');
    setIsScheduleOpen(false);
    setSTitle(''); setSService('Prenatal Care'); setSDay('Every Monday');
    setSTime('8:00 AM – 12:00 PM & 1:00 PM – 4:00 PM');
  };

  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;
    setWeeklySchedules(prev => prev.map(s => s.id === editingSchedule.id ? editingSchedule : s));
    try {
      if (typeof editingSchedule.id === 'number') {
        await apiService.updateClinicSchedule(editingSchedule.id, {
          title: editingSchedule.title,
          service_type: editingSchedule.service_type,
          day_of_week: editingSchedule.day,
          time_slot: editingSchedule.time_slot,
          location: editingSchedule.location,
          bhw_in_charge: editingSchedule.assigned_to,
          barangay: nurseBarangay
        });
      }
    } catch {}
    toast.success('Schedule updated!');
    setIsEditScheduleOpen(false); setEditingSchedule(null);
  };

  const handleDeleteSchedule = async (id: number | string) => {
    setWeeklySchedules(prev => prev.filter(s => s.id !== id));
    try {
      if (typeof id === 'number') {
        await apiService.deleteClinicSchedule(id);
      }
    } catch {}
    toast.success('Schedule removed');
  };

  const handleSendSmsReminder = async (name: string, phone: string, message: string, type: string) => {
    try {
      await apiService.sendSmsNotification({ recipient_name: name, recipient_phone: phone, type, message });
      toast.success(`SMS reminder sent to ${name} (${phone})`);
    } catch {
      toast.info(`SMS queued for ${name}. Content: "${message.substring(0, 50)}..."`);
    }
  };

  const handleSendDueSmsAll = () => {
    let sent = 0;
    overduePrenatal.forEach(r => {
      if (r.contact_number) {
        handleSendSmsReminder(r.patient_name, r.contact_number,
          `Reminder: Your prenatal check-up was due on ${r.next_visit_date}. Please visit ${nurseBarangay} Health Center. — ${nurseName}`,
          'Prenatal Visit Due');
        setPrenatalRecords(prev => prev.map(p => p.id === r.id ? { ...p, sms_sent: true } : p));
        sent++;
      }
    });
    overdueImmun.forEach(r => {
      if (r.contact_number) {
        handleSendSmsReminder(r.child_name, r.contact_number,
          `Reminder: ${r.child_name}'s ${r.vaccine_given} (${r.dose_number}) was due on ${r.next_due_date}. Please visit ${nurseBarangay} Health Center. — ${nurseName}`,
          'Immunization Due');
        setImmunRecords(prev => prev.map(i => i.id === r.id ? { ...i, sms_sent: true } : i));
        sent++;
      }
    });
    if (sent === 0) toast.info('No overdue records with contact numbers found');
    else toast.success(`Sent ${sent} SMS reminders!`);
  };

  const handleApproveAppointment = async (appt: HealthAppointment) => {
    try {
      await apiService.updateAppointment(appt.id, { status: 'Approved', attending_bhw: nurseName, bhw_notes: 'Confirmed by Nurse. Please arrive on time with Health Card.' });
      toast.success(`Appointment for ${appt.resident_name} approved!`);
      loadData();
    } catch { toast.error('Failed to approve appointment'); }
  };

  const menuItems = [
    { id: 'overview', label: 'Clinical Overview', icon: Activity },
    { id: 'consultations', label: 'Patient Consultations', icon: Stethoscope },
    { id: 'maternal', label: 'Prenatal & Maternal', icon: Heart },
    { id: 'immunizations', label: 'EPI Immunizations', icon: Baby },
    { id: 'schedule', label: 'Weekly Schedule', icon: CalendarCheck },
    { id: 'inventory', label: 'Vaccines & Medicine Supply', icon: Pill },
    { id: 'archives', label: 'Encounters Archive', icon: Archive },
    { id: 'sms', label: 'SMS Notifications', icon: Bell },
  ];

  const totalAlerts = overduePrenatal.length + overdueImmun.length + upcomingPrenatal.length + upcomingImmun.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-teal-100 border-2 border-teal-300 flex items-center justify-center">
                <Stethoscope size={20} className="text-teal-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold text-slate-900">Barangay {nurseBarangay} Health Center</h1>
                  <Badge className="bg-teal-600 text-white text-[10px] font-bold px-1.5">Nurse Portal</Badge>
                </div>
                <span className="text-xs text-teal-700 font-medium">Primary Health Center Clinical Management</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              {nurseName}
            </span>
            <Button variant="outline" size="sm" onClick={loadData} className="text-xs gap-1.5 border-slate-200 cursor-pointer">
              <RefreshCcw size={13} className={loading ? 'animate-spin text-teal-600' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => { localStorage.removeItem('barangay_user'); navigate('/login'); }} className="text-xs gap-1 bg-red-600 hover:bg-red-700 cursor-pointer">
              <LogOut size={13} /> <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Mobile Drawer Backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
            aria-hidden="true"
          />
        )}

        {/* Responsive Drawer & Desktop Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-all duration-300 flex flex-col py-4 shadow-2xl lg:shadow-none
            lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)] lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-16'}
            ${sidebarOpen ? 'lg:w-60' : 'lg:w-16'}
          `}
        >
          {/* Mobile Drawer Header with Close Button */}
          <div className="flex items-center justify-between px-4 pb-3 mb-2 border-b border-slate-100 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white shadow-xs border border-slate-200 flex items-center justify-center">
                <img src="/assets/pianing-logo.png" alt="Barangay Pianing" className="w-full h-full object-contain" />
              </div>
              <span className="text-xs font-bold text-slate-900">Clinical Navigation</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
            {menuItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#EBF5FF] text-[#2563EB] shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={17} className={`shrink-0 ${isActive ? 'text-[#2563EB]' : 'text-slate-500'}`} />
                    {(sidebarOpen || (typeof window !== 'undefined' && window.innerWidth < 1024)) && <span>{item.label}</span>}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Fixed Bottom Logout */}
          <div className="mt-auto pt-3 px-3 border-t border-slate-200/90">
            <button
              onClick={() => { localStorage.removeItem('barangay_user'); navigate('/login'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer group"
              title="Sign out of account"
            >
              <LogOut size={18} className="shrink-0 text-rose-500 group-hover:text-rose-700" />
              {(sidebarOpen || (typeof window !== 'undefined' && window.innerWidth < 1024)) && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">

          {/* ═══ OVERVIEW ═══════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Stethoscope className="text-teal-700" size={22} />
                    Barangay {nurseBarangay} — Clinical Command
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time health center overview, patient encounters, and due alerts</p>
                </div>
                <Button onClick={() => setIsNewConsultOpen(true)} className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold gap-1.5 cursor-pointer">
                  <PlusCircle size={14} /> New Consultation
                </Button>
              </div>

              {/* Alerts Banner */}
              {(overduePrenatal.length > 0 || overdueImmun.length > 0) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-bold text-red-800">⚠ Overdue Patient Alerts</p>
                      <p className="text-xs text-red-600">
                        {overduePrenatal.length > 0 && `${overduePrenatal.length} prenatal visit(s) overdue. `}
                        {overdueImmun.length > 0 && `${overdueImmun.length} immunization(s) overdue.`}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={handleSendDueSmsAll} className="bg-red-600 hover:bg-red-700 text-white text-xs gap-1.5 shrink-0 cursor-pointer">
                    <Send size={13} /> Send SMS Reminders
                  </Button>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Consultations Recorded', value: consultations.length, icon: Stethoscope, color: 'teal', action: () => setActiveTab('consultations') },
                  { label: 'Prenatal Patients', value: prenatalRecords.length, icon: Heart, color: 'pink', action: () => setActiveTab('maternal') },
                  { label: 'Immunization Records', value: immunRecords.length, icon: Syringe, color: 'blue', action: () => setActiveTab('immunizations') },
                  { label: 'Archived Encounters', value: archives.length, icon: Archive, color: 'violet', action: () => setActiveTab('archives') },
                ].map((s, i) => (
                  <Card key={i} className="bg-white border border-slate-200 cursor-pointer hover:shadow-md transition-shadow" onClick={s.action}>
                    <CardContent className="p-4 flex items-start justify-between">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{s.label}</p>
                        <h3 className="text-3xl font-black mt-1 text-slate-900">{s.value}</h3>
                      </div>
                      <div className={`w-10 h-10 rounded-xl bg-${s.color}-100 text-${s.color}-700 flex items-center justify-center`}>
                        <s.icon size={20} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'New Prenatal Record', icon: Heart, color: 'pink', action: () => { setActiveTab('maternal'); setIsNewPrenatalOpen(true); } },
                  { label: 'Record Immunization', icon: Syringe, color: 'blue', action: () => { setActiveTab('immunizations'); setIsNewImmunOpen(true); } },
                  { label: 'Post Weekly Schedule', icon: CalendarCheck, color: 'violet', action: () => { setActiveTab('schedule'); setIsScheduleOpen(true); } },
                  { label: 'Add to Inventory', icon: Package, color: 'emerald', action: () => { setActiveTab('inventory'); setIsInventoryOpen(true); } },
                  { label: 'Send SMS Alerts', icon: Send, color: 'amber', action: handleSendDueSmsAll },
                  { label: 'View Encounters Log', icon: Archive, color: 'teal', action: () => setActiveTab('archives') },
                ].map((q, i) => (
                  <button key={i} onClick={q.action}
                    className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-teal-200 transition-all cursor-pointer text-left">
                    <div className={`w-9 h-9 rounded-lg bg-${q.color}-100 text-${q.color}-700 flex items-center justify-center shrink-0`}>
                      <q.icon size={16} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{q.label}</span>
                  </button>
                ))}
              </div>

              {/* Due This Week */}
              {(upcomingPrenatal.length > 0 || upcomingImmun.length > 0) && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                      <Clock size={16} /> Patients Due Within 7 Days
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {upcomingPrenatal.map(r => (
                      <div key={r.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">
                        <div>
                          <p className="text-xs font-bold text-slate-800 cursor-pointer hover:text-teal-700" onClick={() => openPatient360(r.patient_name, r.contact_number)}>{r.patient_name}</p>
                          <p className="text-[11px] text-slate-500">Prenatal visit due: {r.next_visit_date} — {r.contact_number}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleSendSmsReminder(r.patient_name, r.contact_number, `Reminder: Your prenatal visit is scheduled on ${r.next_visit_date} at ${nurseBarangay} Health Center. — ${nurseName}`, 'Prenatal Reminder')} className="text-[10px] gap-1 h-7 border-amber-300 text-amber-700 hover:bg-amber-50 cursor-pointer">
                          <Send size={11} /> SMS
                        </Button>
                      </div>
                    ))}
                    {upcomingImmun.map(r => (
                      <div key={r.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">
                        <div>
                          <p className="text-xs font-bold text-slate-800 cursor-pointer hover:text-teal-700" onClick={() => openPatient360(r.child_name, r.contact_number)}>{r.child_name}</p>
                          <p className="text-[11px] text-slate-500">Vaccine due: {r.next_due_date} — {r.contact_number}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleSendSmsReminder(r.child_name, r.contact_number, `Reminder: ${r.child_name}'s ${r.vaccine_given} (${r.dose_number}) is due on ${r.next_due_date}. Please visit ${nurseBarangay} Health Center. — ${nurseName}`, 'Immunization Reminder')} className="text-[10px] gap-1 h-7 border-amber-300 text-amber-700 hover:bg-amber-50 cursor-pointer">
                          <Send size={11} /> SMS
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ═══ CONSULTATIONS ══════════════════════════════════════════════ */}
          {activeTab === 'consultations' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Stethoscope className="text-teal-700" size={20} /> Patient Consultations</h2>
                <Button onClick={() => setIsNewConsultOpen(true)} className="bg-teal-700 hover:bg-teal-800 text-white text-xs gap-1.5 cursor-pointer">
                  <PlusCircle size={14} /> New Consultation
                </Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Patient Name (Click for 360° Profile)</TableHead>
                        <TableHead className="text-xs">Contact Number</TableHead>
                        <TableHead className="text-xs">Service</TableHead>
                        <TableHead className="text-xs">Vitals</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consultations.filter(c => !search || c.patient_name.toLowerCase().includes(search.toLowerCase())).map((c, idx) => (
                        <TableRow key={`cons-${c.id}-${idx}`} className="text-xs hover:bg-teal-50/30">
                          <TableCell>
                            <button
                              onClick={() => openPatient360(c.patient_name, c.contact_number, c.barangay)}
                              className="font-bold text-teal-800 hover:underline text-left cursor-pointer flex items-center gap-1.5"
                            >
                              <User size={13} className="text-teal-600" />
                              {c.patient_name}
                            </button>
                            <span className="text-[10px] text-slate-400 block ml-4.5">{c.age} / {c.gender}</span>
                          </TableCell>
                          <TableCell><span className="flex items-center gap-1 text-slate-700 font-mono"><Phone size={11} className="text-teal-600" />{c.contact_number || '—'}</span></TableCell>
                          <TableCell><Badge className="bg-teal-100 text-teal-800 text-[10px] font-medium border-0">{c.service_type}</Badge></TableCell>
                          <TableCell className="text-slate-500 text-[10px]">BP: {c.bp}<br />Temp: {c.temp} | Wt: {c.weight}</TableCell>
                          <TableCell className="text-slate-400">{c.consultation_date}</TableCell>
                          <TableCell>
                            {c.contact_number && (
                              <Button size="sm" variant="outline" onClick={() => handleSendSmsReminder(c.patient_name, c.contact_number, `Dear ${c.patient_name}, follow up check-up recommended at ${nurseBarangay} Health Center. — ${nurseName}`, 'Follow-up')} className="text-[10px] h-6 gap-1 border-teal-200 text-teal-700 cursor-pointer">
                                <Send size={10} /> SMS
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {consultations.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-xs py-8 text-slate-400">No consultations recorded yet</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ PRENATAL / MATERNAL ════════════════════════════════════════ */}
          {activeTab === 'maternal' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Heart className="text-pink-600" size={20} /> Prenatal & Maternal Care Records</h2>
                <div className="flex gap-2">
                  <Button onClick={handleSendDueSmsAll} variant="outline" className="text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 cursor-pointer">
                    <Send size={13} /> Send All Due SMS
                  </Button>
                  <Button onClick={() => setIsNewPrenatalOpen(true)} className="bg-pink-600 hover:bg-pink-700 text-white text-xs gap-1.5 cursor-pointer">
                    <PlusCircle size={14} /> New Prenatal Record
                  </Button>
                </div>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-pink-50/50">
                        <TableHead className="text-xs">Mother Patient (Click for 360° Profile)</TableHead>
                        <TableHead className="text-xs">Contact Number</TableHead>
                        <TableHead className="text-xs">AOG / EDD</TableHead>
                        <TableHead className="text-xs">Vitals & FHR</TableHead>
                        <TableHead className="text-xs">Next Visit Date</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">SMS Alert</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prenatalRecords.map((r, idx) => {
                        const isOverdue = r.next_visit_date && new Date(r.next_visit_date) < new Date();
                        const isDueSoon = r.next_visit_date && !isOverdue && (new Date(r.next_visit_date).getTime() - Date.now()) / 86400000 <= 7;
                        return (
                          <TableRow key={`prn-${r.id}-${idx}`} className={`text-xs ${isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-amber-50' : ''}`}>
                            <TableCell>
                              <button
                                onClick={() => openPatient360(r.patient_name, r.contact_number, r.barangay)}
                                className="font-bold text-pink-900 hover:underline text-left cursor-pointer flex items-center gap-1.5"
                              >
                                <Heart size={13} className="text-pink-600" />
                                {r.patient_name}
                              </button>
                              <span className="text-[10px] text-slate-400 block ml-4.5">{r.gravida} {r.para} · Visit #{r.visit_number}</span>
                            </TableCell>
                            <TableCell><span className="flex items-center gap-1 text-slate-700 font-mono"><Phone size={11} className="text-pink-600" />{r.contact_number}</span></TableCell>
                            <TableCell className="text-[10px]">{r.aog_weeks} wks AOG<br />EDD: {r.edd || '—'}</TableCell>
                            <TableCell className="text-[10px] text-slate-500">BP: {r.bp}<br />Wt: {r.weight} kg · FHR: {r.fetal_heart_rate}</TableCell>
                            <TableCell className="text-[10px]">
                              <span className={`font-semibold ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-slate-700'}`}>{r.next_visit_date}</span>
                              <br /><span className="text-slate-400">{r.next_visit_note}</span>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] border-0 ${isOverdue ? 'bg-red-100 text-red-700' : isDueSoon ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                {isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : 'On Track'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {r.contact_number && (
                                <Button size="sm" variant="outline" onClick={() => handleSendSmsReminder(r.patient_name, r.contact_number, `Dear ${r.patient_name}, your prenatal check-up visit${isOverdue ? ' was due on' : ' is scheduled for'} ${r.next_visit_date}. Please visit ${nurseBarangay} Health Center. — ${nurseName}`, 'Prenatal Reminder')}
                                  className={`text-[10px] h-6 gap-1 cursor-pointer ${isOverdue ? 'border-red-200 text-red-700' : 'border-teal-200 text-teal-700'}`}>
                                  <Send size={10} /> {r.sms_sent ? '✓ Sent' : 'Send SMS'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {prenatalRecords.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-xs py-8 text-slate-400">No prenatal records registered yet.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ IMMUNIZATIONS (Standard DOH Fields) ════════════════════════ */}
          {activeTab === 'immunizations' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Syringe className="text-blue-600" size={20} /> EPI Child Immunization Records (DOH Standard)</h2>
                <div className="flex gap-2">
                  <Button onClick={handleSendDueSmsAll} variant="outline" className="text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 cursor-pointer">
                    <Send size={13} /> Send Due SMS
                  </Button>
                  <Button onClick={() => setIsNewImmunOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 cursor-pointer">
                    <PlusCircle size={14} /> Record Child Vaccination
                  </Button>
                </div>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-50/50">
                        <TableHead className="text-xs">Child Patient (Click for 360° Profile)</TableHead>
                        <TableHead className="text-xs">Guardian Contact</TableHead>
                        <TableHead className="text-xs">Vaccine & Batch #</TableHead>
                        <TableHead className="text-xs">Growth & Vitals</TableHead>
                        <TableHead className="text-xs">Date Administered</TableHead>
                        <TableHead className="text-xs">Next Due Date</TableHead>
                        <TableHead className="text-xs">SMS Reminder</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {immunRecords.map((r, idx) => {
                        const isOverdue = r.next_due_date && new Date(r.next_due_date) < new Date();
                        const isDueSoon = r.next_due_date && !isOverdue && (new Date(r.next_due_date).getTime() - Date.now()) / 86400000 <= 7;
                        return (
                          <TableRow key={`imm-${r.id}-${idx}`} className={`text-xs ${isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-amber-50' : ''}`}>
                            <TableCell>
                              <button
                                onClick={() => openPatient360(r.child_name, r.contact_number, r.barangay)}
                                className="font-bold text-blue-900 hover:underline text-left cursor-pointer flex items-center gap-1.5"
                              >
                                <Baby size={13} className="text-blue-600" />
                                {r.child_name}
                              </button>
                              <span className="text-[10px] text-slate-400 block ml-4.5">{r.age_months} mos · Guardian: {r.guardian}</span>
                            </TableCell>
                            <TableCell><span className="flex items-center gap-1 text-slate-700 font-mono"><Phone size={11} className="text-blue-600" />{r.contact_number}</span></TableCell>
                            <TableCell>
                              <Badge className="bg-blue-100 text-blue-800 text-[10px] border-0">{r.vaccine_given}</Badge>
                              <br />
                              <span className="text-[10px] text-slate-500 font-mono">{r.dose_number} · Batch: {r.batch_number || 'N/A'}</span>
                            </TableCell>
                            <TableCell className="text-[10px] text-slate-500">Wt: {r.weight || '—'} · Ht: {r.height || '—'}<br />Temp: {r.temp || '—'}</TableCell>
                            <TableCell className="text-slate-500 text-[10px]">{r.date_given}</TableCell>
                            <TableCell>
                              <span className={`text-xs font-semibold ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-slate-700'}`}>
                                {r.next_due_date || 'Complete'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {r.contact_number && r.next_due_date && (
                                <Button size="sm" variant="outline" onClick={() => handleSendSmsReminder(r.child_name, r.contact_number, `Reminder: ${r.child_name}'s ${r.vaccine_given} (${r.dose_number}) is${isOverdue ? ' overdue since' : ' due on'} ${r.next_due_date}. Please visit ${nurseBarangay} Health Center. — ${nurseName}`, 'Immunization Reminder')}
                                  className={`text-[10px] h-6 gap-1 cursor-pointer ${isOverdue ? 'border-red-200 text-red-700' : 'border-teal-200 text-teal-700'}`}>
                                  <Send size={10} /> {r.sms_sent ? '✓ Sent' : 'Send SMS'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {immunRecords.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-xs py-8 text-slate-400">No immunization records yet.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ WEEKLY SCHEDULE (NO SLOTS - OPERATING HOURS ONLY) ═════════ */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><CalendarCheck className="text-violet-600" size={20} /> Weekly Clinic Schedule & Operating Hours</h2>
                  <p className="text-xs text-slate-500">Post and edit official health center consultation hours (no slot limits)</p>
                </div>
                <Button onClick={() => setIsScheduleOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1.5 cursor-pointer">
                  <PlusCircle size={14} /> Post Weekly Schedule
                </Button>
              </div>

              {/* Posted Schedules Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {weeklySchedules.map((s, idx) => (
                  <Card key={`sch-${s.id}-${idx}`} className="border border-violet-200 bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{s.title}</p>
                          <Badge className="bg-violet-100 text-violet-800 text-[10px] border-0 mt-1">{s.service_type}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingSchedule(s); setIsEditScheduleOpen(true); }} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg cursor-pointer">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDeleteSchedule(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2 font-semibold text-slate-800"><Calendar size={13} className="text-violet-600" />{s.day}</div>
                        <div className="flex items-center gap-2 text-violet-700 font-mono"><Clock size={13} className="text-violet-600" />{s.time_slot}</div>
                        <div className="flex items-center gap-2"><MapPin size={13} className="text-violet-600" />{s.location}</div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500"><UserPlus size={13} className="text-violet-600" />Attending: {s.assigned_to}</div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100">Posted date: {s.posted_date}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ═══ INVENTORY (NO COLD CHAIN) ═════════════════════════════════ */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Package className="text-emerald-600" size={20} /> Vaccines & Medicine Supply</h2>
                  <p className="text-xs text-slate-500">Track stock levels and expiration dates for essential health center supplies</p>
                </div>
                <Button onClick={() => setIsInventoryOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer">
                  <PlusCircle size={14} /> Add Medicine / Vaccine
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-emerald-50/50">
                        <TableHead className="text-xs">Item Name</TableHead>
                        <TableHead className="text-xs">Category</TableHead>
                        <TableHead className="text-xs">Stock Level</TableHead>
                        <TableHead className="text-xs">Expiry Date</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item, idx) => (
                        <TableRow key={`inv-${item.id}-${idx}`} className="text-xs hover:bg-emerald-50/30">
                          <TableCell className="font-semibold text-slate-800">{item.item_name}</TableCell>
                          <TableCell><Badge className="bg-slate-100 text-slate-700 text-[10px] border-0">{item.category}</Badge></TableCell>
                          <TableCell className="font-bold text-slate-800">{item.stock} <span className="text-slate-400 font-normal">{item.unit}</span></TableCell>
                          <TableCell className="text-[11px] text-slate-500">{item.expiry_date || '—'}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] border-0 ${item.status === 'In Stock' ? 'bg-emerald-100 text-emerald-700' : item.status === 'Low Stock' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{item.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => { setEditingItem({ ...item }); setIsEditInventoryOpen(true); }} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"><Edit2 size={13} /></button>
                              <button onClick={() => handleDeleteInventory(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 size={13} /></button>
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

          {/* ═══ HISTORICAL ARCHIVES ═════════════════════════════════════════ */}
          {activeTab === 'archives' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Archive className="text-teal-700" size={20} /> Clinical Encounters & Historical Archives</h2>
                  <p className="text-xs text-slate-500">Permanent transaction history of all completed consultations, vaccinations, and maternal visits</p>
                </div>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Patient Name</TableHead>
                        <TableHead className="text-xs">Contact</TableHead>
                        <TableHead className="text-xs">Encounter Type</TableHead>
                        <TableHead className="text-xs">Clinical Summary</TableHead>
                        <TableHead className="text-xs">Encounter Date</TableHead>
                        <TableHead className="text-xs">Attending Staff</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archives.map((a, idx) => (
                        <TableRow key={`arch-${a.id}-${idx}`} className="text-xs">
                          <TableCell className="font-bold text-slate-800">{a.patient_name}</TableCell>
                          <TableCell className="font-mono text-slate-600">{a.contact_number}</TableCell>
                          <TableCell><Badge className="bg-teal-100 text-teal-800 border-0 text-[10px]">{a.encounter_type}</Badge></TableCell>
                          <TableCell className="text-slate-600 text-[11px]">{a.details}</TableCell>
                          <TableCell className="text-slate-400">{a.date}</TableCell>
                          <TableCell className="text-slate-500">{a.attending}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ SMS NOTIFICATIONS ══════════════════════════════════════════ */}
          {activeTab === 'sms' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Bell className="text-amber-500" size={20} /> Automated SMS Reminders & Alerts</h2>
                <Button onClick={handleSendDueSmsAll} className="bg-amber-500 hover:bg-amber-600 text-white text-xs gap-1.5 cursor-pointer">
                  <Send size={14} /> Send All Due SMS Reminders
                </Button>
              </div>

              {overduePrenatal.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-red-800 flex items-center gap-2"><AlertTriangle size={16} />Overdue Prenatal Check-ups ({overduePrenatal.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {overduePrenatal.map((r, idx) => (
                      <div key={`od-p-${idx}`} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2.5 border border-red-200">
                        <div>
                          <p className="text-xs font-bold text-slate-800 cursor-pointer hover:underline" onClick={() => openPatient360(r.patient_name, r.contact_number)}>{r.patient_name}</p>
                          <p className="text-[11px] text-red-600">Due: {r.next_visit_date} · Contact: {r.contact_number}</p>
                        </div>
                        <Button size="sm" onClick={() => handleSendSmsReminder(r.patient_name, r.contact_number, `URGENT: Dear ${r.patient_name}, your prenatal visit was due on ${r.next_visit_date}. Please visit ${nurseBarangay} Health Center. — ${nurseName}`, 'Prenatal Overdue')} className="bg-red-600 hover:bg-red-700 text-white text-[10px] gap-1 cursor-pointer">
                          <Send size={10} /> Send SMS
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {overdueImmun.length > 0 && (
                <Card className="border-orange-200">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-orange-800 flex items-center gap-2"><Syringe size={16} />Overdue Child Immunizations ({overdueImmun.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {overdueImmun.map((r, idx) => (
                      <div key={`od-i-${idx}`} className="flex items-center justify-between bg-orange-50 rounded-lg px-3 py-2.5 border border-orange-200">
                        <div>
                          <p className="text-xs font-bold text-slate-800 cursor-pointer hover:underline" onClick={() => openPatient360(r.child_name, r.contact_number)}>{r.child_name}</p>
                          <p className="text-[11px] text-orange-600">{r.vaccine_given} ({r.dose_number}) due: {r.next_due_date} · Contact: {r.contact_number}</p>
                        </div>
                        <Button size="sm" onClick={() => handleSendSmsReminder(r.child_name, r.contact_number, `Reminder: ${r.child_name}'s ${r.vaccine_given} was due on ${r.next_due_date}. Please visit ${nurseBarangay} Health Center. — ${nurseName}`, 'Immunization Overdue')} className="bg-orange-600 hover:bg-orange-700 text-white text-[10px] gap-1 cursor-pointer">
                          <Send size={10} /> Send SMS
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ─── MODALS ──────────────────────────────────────────────────────────── */}

      {/* 360 Patient Details Modal */}
      <PatientDetailModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        patient={selectedPatientModal}
      />

      {/* New Consultation Modal */}
      <Dialog open={isNewConsultOpen} onOpenChange={setIsNewConsultOpen}>
        <DialogContent className="bg-white max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900"><Stethoscope className="text-teal-600" size={18} /> Record Patient Consultation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateConsultation} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2"><Label className="text-xs font-semibold">Patient Name <span className="text-red-500">*</span></Label><Input value={cName} onChange={e => setCName(e.target.value)} placeholder="Full name" required className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-semibold">Contact Number <span className="text-red-500">*</span></Label><Input value={cPhone} onChange={e => setCPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="09XXXXXXXXX" required className="h-9 text-xs font-mono mt-1" /></div>
              <div><Label className="text-xs font-semibold">Age</Label><Input value={cAge} onChange={e => setCAge(e.target.value)} placeholder="e.g. 28" className="h-9 text-xs mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs font-semibold">Gender</Label>
                <Select value={cGender} onValueChange={v => setCGender(v as any)}>
                  <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Female">Female</SelectItem><SelectItem value="Male">Male</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold">Service Type</Label>
                <Select value={cService} onValueChange={setCService}>
                  <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['General Consultation', 'Prenatal Care', 'Child Immunization', 'Family Planning', 'BP/Diabetes Monitoring', 'Wound Care', 'TB-DOTS'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
              <p className="text-[11px] font-bold text-teal-900 mb-2">Vital Signs</p>
              <div className="grid grid-cols-4 gap-2">
                <div><Label className="text-[10px]">BP (mmHg)</Label><Input value={cBp} onChange={e => setCBp(e.target.value)} placeholder="120/80" className="h-8 text-xs bg-white" /></div>
                <div><Label className="text-[10px]">Temp (°C)</Label><Input value={cTemp} onChange={e => setCTemp(e.target.value)} placeholder="36.5" className="h-8 text-xs bg-white" /></div>
                <div><Label className="text-[10px]">Weight (kg)</Label><Input value={cWeight} onChange={e => setCWeight(e.target.value)} placeholder="54" className="h-8 text-xs bg-white" /></div>
                <div><Label className="text-[10px]">HR (bpm)</Label><Input value={cHR} onChange={e => setCHR(e.target.value)} placeholder="76" className="h-8 text-xs bg-white" /></div>
              </div>
            </div>
            <div><Label className="text-xs font-semibold">Chief Complaint</Label><Input value={cComplaint} onChange={e => setCComplaint(e.target.value)} placeholder="e.g. Mild fever for 2 days" className="h-9 text-xs mt-1" /></div>
            <div><Label className="text-xs font-semibold">Diagnosis</Label><Input value={cDiagnosis} onChange={e => setCDiagnosis(e.target.value)} placeholder="e.g. URTI" className="h-9 text-xs mt-1" /></div>
            <div><Label className="text-xs font-semibold">Treatment / Prescription</Label><textarea value={cTreatment} onChange={e => setCTreatment(e.target.value)} placeholder="e.g. Paracetamol 500mg..." rows={2} className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none mt-1" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewConsultOpen(false)} className="text-xs">Cancel</Button>
              <Button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white text-xs gap-1 cursor-pointer"><Check size={13} /> Save Consultation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Prenatal Modal */}
      <Dialog open={isNewPrenatalOpen} onOpenChange={setIsNewPrenatalOpen}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900"><Heart className="text-pink-600" size={18} /> New Prenatal / Maternal Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePrenatal} className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><Label className="text-xs font-semibold">Patient Name <span className="text-red-500">*</span></Label><Input value={pName} onChange={e => setPName(e.target.value)} placeholder="Full name" required className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-semibold">Age</Label><Input value={pAge} onChange={e => setPAge(e.target.value)} placeholder="e.g. 28" className="h-9 text-xs mt-1" /></div>
            </div>
            <div><Label className="text-xs font-semibold">Contact Number <span className="text-red-500">*</span></Label><Input value={pPhone} onChange={e => setPPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="09XXXXXXXXX" required className="h-9 text-xs font-mono mt-1" /></div>
            <div className="grid grid-cols-4 gap-2">
              <div><Label className="text-xs font-semibold">Gravida</Label><Input value={pGravida} onChange={e => setPGravida(e.target.value)} placeholder="G1" className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-semibold">Para</Label><Input value={pPara} onChange={e => setPPara(e.target.value)} placeholder="P0" className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-semibold">LMP <span className="text-red-500">*</span></Label><Input type="date" value={pLmp} onChange={e => setPLmp(e.target.value)} required className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-semibold">EDD</Label><Input type="date" value={pEdd} onChange={e => setPEdd(e.target.value)} className="h-9 text-xs mt-1" /></div>
            </div>
            <div><Label className="text-xs font-semibold">AOG (weeks)</Label><Input value={pAog} onChange={e => setPAog(e.target.value)} placeholder="e.g. 22" className="h-9 text-xs mt-1 w-40" /></div>
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-3">
              <p className="text-[11px] font-bold text-pink-900 mb-2">Vitals & Fetal Measurements</p>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-[10px]">BP (mmHg)</Label><Input value={pBp} onChange={e => setPBp(e.target.value)} placeholder="120/80" className="h-8 text-xs bg-white mt-0.5" /></div>
                <div><Label className="text-[10px]">Weight (kg)</Label><Input value={pWeight} onChange={e => setPWeight(e.target.value)} placeholder="56.5" className="h-8 text-xs bg-white mt-0.5" /></div>
                <div><Label className="text-[10px]">Temp (°C)</Label><Input value={pTemp} onChange={e => setPTemp(e.target.value)} placeholder="36.5" className="h-8 text-xs bg-white mt-0.5" /></div>
                <div><Label className="text-[10px]">Fetal Heart Rate</Label><Input value={pFhr} onChange={e => setPFhr(e.target.value)} placeholder="148 bpm" className="h-8 text-xs bg-white mt-0.5" /></div>
                <div><Label className="text-[10px]">Fundic Height</Label><Input value={pFh} onChange={e => setPFh(e.target.value)} placeholder="22 cm" className="h-8 text-xs bg-white mt-0.5" /></div>
              </div>
            </div>
            <div><Label className="text-xs font-semibold">Prescribed Medicines</Label><Input value={pMeds} onChange={e => setPMeds(e.target.value)} placeholder="e.g. FeSO4 + Folic Acid" className="h-9 text-xs mt-1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs font-semibold">Next Visit Date <span className="text-red-500">*</span></Label><Input type="date" value={pNextDate} onChange={e => setPNextDate(e.target.value)} required className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-semibold">Visit Note</Label><Input value={pNextNote} onChange={e => setPNextNote(e.target.value)} placeholder="e.g. 3rd Trimester Check-up" className="h-9 text-xs mt-1" /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewPrenatalOpen(false)} className="text-xs">Cancel</Button>
              <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white text-xs gap-1 cursor-pointer"><Save size={13} /> Save Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Child Immunization Modal (DOH Barangay Standard) */}
      <Dialog open={isNewImmunOpen} onOpenChange={setIsNewImmunOpen}>
        <DialogContent className="bg-white max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900"><Baby className="text-blue-600" size={18} /> Record Child Immunization (DOH Standard)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateImmun} className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><Label className="text-xs font-semibold">Child's Full Name <span className="text-red-500">*</span></Label><Input value={iChild} onChange={e => setIChild(e.target.value)} placeholder="Full name of child" required className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-semibold">Sex</Label>
                <Select value={iGender} onValueChange={setIGender}>
                  <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs font-semibold">Guardian Name <span className="text-red-500">*</span></Label><Input value={iGuardian} onChange={e => setIGuardian(e.target.value)} placeholder="Parent/Guardian" required className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-semibold">Guardian Phone Number <span className="text-red-500">*</span></Label><Input value={iPhone} onChange={e => setIPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="09XXXXXXXXX" required className="h-9 text-xs font-mono mt-1" /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs font-semibold">Age (months)</Label><Input value={iAge} onChange={e => setIAge(e.target.value)} placeholder="e.g. 6" className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-semibold">Weight (kg)</Label><Input value={iWeight} onChange={e => setIWeight(e.target.value)} placeholder="e.g. 7.8" className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-semibold">Height (cm)</Label><Input value={iHeight} onChange={e => setIHeight(e.target.value)} placeholder="e.g. 66" className="h-9 text-xs mt-1" /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs font-semibold">Vaccine Type</Label>
                <Select value={iVaccine} onValueChange={setIVaccine}>
                  <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['BCG', 'Hepatitis B', 'Pentavalent (DPT-HepB-Hib)', 'OPV (Oral Polio)', 'IPV (Inactivated Polio)', 'PCV13', 'MMR (Measles-Mumps-Rubella)', 'Measles-Rubella (MR)', 'Vitamin A'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold">Dose Number</Label>
                <Select value={iDose} onValueChange={setIDose}>
                  <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Dose 1', 'Dose 2', 'Dose 3', 'Booster 1', 'Booster 2', 'Single Dose'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold">Batch / Lot Number</Label><Input value={iBatch} onChange={e => setIBatch(e.target.value)} placeholder="e.g. LOT-2026-X9" className="h-9 text-xs font-mono mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs font-semibold">Date Given</Label><Input type="date" value={iDateGiven} onChange={e => setIDateGiven(e.target.value)} className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-semibold">Next Due Date</Label><Input type="date" value={iNextDue} onChange={e => setINextDue(e.target.value)} className="h-9 text-xs mt-1" /></div>
            </div>
            <div><Label className="text-xs font-semibold">Remarks / Adverse Effects Observation</Label><Input value={iRemarks} onChange={e => setIRemarks(e.target.value)} placeholder="e.g. Tolerated well, no post-vaccine reaction" className="h-9 text-xs mt-1" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewImmunOpen(false)} className="text-xs">Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1 cursor-pointer"><Check size={13} /> Save Immunization Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Inventory Modal (NO cold_chain) */}
      <Dialog open={isInventoryOpen} onOpenChange={setIsInventoryOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900"><Package className="text-emerald-600" size={18} /> Add Inventory Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddInventory} className="space-y-3 py-2">
            <div><Label className="text-xs font-semibold">Item Name <span className="text-red-500">*</span></Label><Input value={invName} onChange={e => setInvName(e.target.value)} placeholder="e.g. Pentavalent Vaccine" required className="h-9 text-xs mt-1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs font-semibold">Category</Label>
                <Select value={invCat} onValueChange={setInvCat}>
                  <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Vaccine (EPI)', 'Maternal Vitamin', 'Essential Medicine', 'Pediatric Supply', 'Family Planning', 'TB-DOTS Supply', 'Contraceptive', 'Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold">Unit</Label>
                <Select value={invUnit} onValueChange={setInvUnit}>
                  <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['vials', 'tablets', 'capsules', 'packets', 'bottles', 'ampoules', 'units', 'pieces'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs font-semibold">Stock Quantity <span className="text-red-500">*</span></Label><Input type="number" min="0" value={invStock} onChange={e => setInvStock(e.target.value)} placeholder="e.g. 45" required className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-semibold">Expiry Date</Label><Input type="date" value={invExpiry} onChange={e => setInvExpiry(e.target.value)} className="h-9 text-xs mt-1" /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInventoryOpen(false)} className="text-xs">Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 cursor-pointer"><PlusCircle size={13} /> Add Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Inventory Modal (NO cold_chain) */}
      <Dialog open={isEditInventoryOpen} onOpenChange={setIsEditInventoryOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900"><Edit2 className="text-emerald-600" size={18} /> Edit Inventory Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={handleUpdateInventory} className="space-y-3 py-2">
              <div><Label className="text-xs font-semibold">Item Name</Label><Input value={editingItem.item_name} onChange={e => setEditingItem({ ...editingItem, item_name: e.target.value })} className="h-9 text-xs mt-1" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs font-semibold">Stock Level</Label><Input type="number" min="0" value={editingItem.stock} onChange={e => setEditingItem({ ...editingItem, stock: parseInt(e.target.value) || 0 })} className="h-9 text-xs mt-1" /></div>
                <div><Label className="text-xs font-semibold">Unit</Label><Input value={editingItem.unit} onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })} className="h-9 text-xs mt-1" /></div>
              </div>
              <div><Label className="text-xs font-semibold">Expiry Date</Label><Input type="date" value={editingItem.expiry_date} onChange={e => setEditingItem({ ...editingItem, expiry_date: e.target.value })} className="h-9 text-xs mt-1" /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditInventoryOpen(false)} className="text-xs">Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 cursor-pointer"><Save size={13} /> Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Post Schedule Modal (NO SLOTS - OPERATING HOURS ONLY) */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900"><CalendarCheck className="text-violet-600" size={18} /> Post Weekly Clinic Schedule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSchedule} className="space-y-3 py-2">
            <div><Label className="text-xs font-semibold">Schedule Title <span className="text-red-500">*</span></Label><Input value={sTitle} onChange={e => setSTitle(e.target.value)} placeholder="e.g. Prenatal & Maternal Care Clinic" required className="h-9 text-xs mt-1" /></div>
            <div><Label className="text-xs font-semibold">Service Type</Label>
              <Select value={sService} onValueChange={setSService}>
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Prenatal Care', 'Child Immunization', 'Family Planning', 'General Consultation', 'TB-DOTS', 'BP/Diabetes Monitoring', 'Nutrition Program', 'Dental Health'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold">Day / Days of Week</Label>
              <Select value={sDay} onValueChange={setSDay}>
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Every Monday', 'Every Tuesday', 'Every Wednesday', 'Every Thursday', 'Every Friday', 'Every Monday & Thursday', 'Every Tuesday & Friday', '1st & 3rd Wednesday', 'Every Day (Mon-Fri)'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold">Operating Hours / Time Slot <span className="text-red-500">*</span></Label><Input value={sTime} onChange={e => setSTime(e.target.value)} placeholder="e.g. 8:00 AM – 12:00 PM & 1:00 PM – 4:00 PM" required className="h-9 text-xs mt-1" /></div>
            <div><Label className="text-xs font-semibold">Location</Label><Input value={sLocation} onChange={e => setSLocation(e.target.value)} placeholder={`Barangay ${nurseBarangay} Health Center`} className="h-9 text-xs mt-1" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsScheduleOpen(false)} className="text-xs">Cancel</Button>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1 cursor-pointer"><Save size={13} /> Post Schedule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Modal (NO SLOTS) */}
      <Dialog open={isEditScheduleOpen} onOpenChange={setIsEditScheduleOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900"><Edit2 className="text-violet-600" size={18} /> Edit Clinic Operating Hours</DialogTitle>
          </DialogHeader>
          {editingSchedule && (
            <form onSubmit={handleUpdateSchedule} className="space-y-3 py-2">
              <div><Label className="text-xs font-semibold">Title</Label><Input value={editingSchedule.title} onChange={e => setEditingSchedule({ ...editingSchedule, title: e.target.value })} className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-semibold">Day</Label><Input value={editingSchedule.day} onChange={e => setEditingSchedule({ ...editingSchedule, day: e.target.value })} className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-semibold">Operating Hours / Time Slot</Label><Input value={editingSchedule.time_slot} onChange={e => setEditingSchedule({ ...editingSchedule, time_slot: e.target.value })} className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-semibold">Location</Label><Input value={editingSchedule.location} onChange={e => setEditingSchedule({ ...editingSchedule, location: e.target.value })} className="h-9 text-xs mt-1" /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditScheduleOpen(false)} className="text-xs">Cancel</Button>
                <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1 cursor-pointer"><Save size={13} /> Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 360 Patient Detail Modal */}
      <PatientDetailModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        patient={selectedPatientModal}
        onSendSmsSuccess={() => toast.success('SMS notification sent to patient')}
        onLogReturnVisit={handleLogReturnVisitFromModal}
      />

    </div>
  );
}
