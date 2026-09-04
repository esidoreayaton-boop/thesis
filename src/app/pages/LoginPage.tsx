import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Shield,
  UserCircle,
  Lock,
  ArrowRight,
  UserCheck,
  AlertCircle,
  Building2,
  Heart,
  Phone,
  MapPin,
  CreditCard,
  CheckCircle2,
  Calendar,
  X,
  Camera,
  Mail,
  Home,
  Eye,
  EyeOff
} from 'lucide-react';
import { apiService } from '../../services/api';
import { validatePasswordComplexity } from '../../utils/passwordValidation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { FloatingInput, FloatingSelect } from '../components/ui/floating-input';
import { BUTUAN_BARANGAYS } from '../../utils/barangays';
import { toast } from 'sonner';

const ID_TYPES = [
  'Philippine National ID (PhilSys)',
  "Driver's License",
  'SSS / UMID Card',
  'PhilHealth ID',
  'TIN ID',
  "Voter's ID / Certificate",
  'Postal ID',
  'Barangay ID',
  'Philippine Passport',
  'Senior Citizen ID',
  'PRC License',
  'Student ID',
  'PWD ID',
  'Other Official Government ID'
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Tab State (allows /login?tab=register)
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'register') {
      setActiveTab('register');
    } else {
      setActiveTab('login');
    }
  }, [location.search]);

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Dynamic Register State
  const [regFirstName, setRegFirstName] = useState('');
  const [regMiddleName, setRegMiddleName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regGender, setRegGender] = useState<'Male' | 'Female' | ''>('');
  const [regCivilStatus, setRegCivilStatus] = useState<'Single' | 'Married' | 'Widowed' | 'Separated' | ''>('');
  const [regResidencyYears, setRegResidencyYears] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPurok, setRegPurok] = useState('');
  const [regBarangay, setRegBarangay] = useState('Pianing');
  const [regCity, setRegCity] = useState('Butuan City');
  const [regEmployment, setRegEmployment] = useState('Employed');
  const [regIdType, setRegIdType] = useState('');
  const [regIdPhoto, setRegIdPhoto] = useState<string | null>(null);
  const [regIdFileName, setRegIdFileName] = useState<string>('');
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setRegFirstName('');
    setRegMiddleName('');
    setRegLastName('');
    setRegDob('');
    setRegGender('');
    setRegCivilStatus('');
    setRegEmployment('Employed');
    setRegResidencyYears('');
    setRegEmail('');
    setRegPassword('');
    setRegPhone('');
    setRegPurok('');
    setRegBarangay('Pianing');
    setRegCity('Butuan City');
    setRegIdType('');
    setRegIdPhoto(null);
    setRegIdFileName('');
    setRegStep(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTabChange = (val: 'login' | 'register') => {
    setActiveTab(val);
    clearForm();
  };

  const handleNextStep = () => {
    if (!regFirstName.trim() || !regLastName.trim()) {
      toast.error('Name required', { description: 'Please enter your first and last name.' });
      return;
    }
    if (!regEmail.trim()) {
      toast.error('Email required', { description: 'Please enter a valid email address.' });
      return;
    }
    if (!validatePassword(regPassword)) {
      toast.error('Password too weak', {
        description: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.'
      });
      return;
    }
    if (!regDob) {
      toast.error('Date of birth required', { description: 'Please enter your birthday.' });
      return;
    }
    if (!regGender) {
      toast.error('Gender required', { description: 'Please select your gender.' });
      return;
    }
    if (!regCivilStatus) {
      toast.error('Civil status required', { description: 'Please select your civil status.' });
      return;
    }
    setRegStep(2);
  };

  const getDynamicAge = (dobString: string): number | null => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', { description: 'Please upload an image (PNG, JPG, JPEG).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', { description: 'Max image size is 5MB.' });
      return;
    }

    setRegIdFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setRegIdPhoto(reader.result as string);
      toast.success('ID image attached', { description: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleClearIdPhoto = () => {
    setRegIdPhoto(null);
    setRegIdFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Missing credentials', { description: 'Please enter both email and password.' });
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.login(email.trim(), password);
      if (response && response.user) {
        const u = response.user;
        localStorage.setItem('barangay_user', JSON.stringify(u));
        toast.success(`Welcome back, ${u.name}!`);

        if (u.role === 'superadmin' || u.role === 'admin') {
          navigate('/admin');
        } else if (u.role === 'nurse') {
          navigate('/nurse');
        } else if (u.role === 'bhw') {
          navigate('/bhw');
        } else {
          setIsChoiceModalOpen(true);
        }
      } else {
        toast.error('Authentication failed', { description: 'Invalid email or password.' });
      }
    } catch (err: any) {
      toast.error('Login error', { description: err.message || 'Could not connect to authentication server.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Resident Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regFirstName.trim() || !regLastName.trim()) {
      toast.error('Name required', { description: 'Please provide your First Name and Last Name.' });
      return;
    }

    if (!regEmail.trim()) {
      toast.error('Email required', { description: 'Please enter a valid email address.' });
      return;
    }

    const passCheck = validatePasswordComplexity(regPassword);
    if (!passCheck.isValid) {
      toast.error('Weak Password', { description: passCheck.message });
      return;
    }

    const cleanPhone = regPhone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('09') || cleanPhone.length !== 11) {
      toast.error('Invalid Contact Number', { description: 'Philippine mobile number must be exactly 11 digits starting with 09 (e.g. 09171234567).' });
      return;
    }

    if (!regDob) {
      toast.error('Birthday required', { description: 'Please specify your date of birth.' });
      return;
    }

    const calculatedAge = getDynamicAge(regDob);
    if (calculatedAge === null || calculatedAge < 0) {
      toast.error('Invalid Birthday', { description: 'Please enter a valid past date of birth.' });
      return;
    }

    if (!regGender) {
      toast.error('Gender required', { description: 'Please select your gender.' });
      return;
    }

    if (!regCivilStatus) {
      toast.error('Civil Status required', { description: 'Please select your civil status.' });
      return;
    }

    if (!regPurok.trim()) {
      toast.error('Purok / Street required', { description: 'Please indicate your purok or street.' });
      return;
    }

    if (!regIdType) {
      toast.error('Government ID Type Required', { description: 'Please select a valid Government ID type to continue registration.' });
      return;
    }

    if (!regIdPhoto) {
      toast.error('Valid ID Photo Required', { description: 'You cannot proceed without uploading a valid Government ID photo.' });
      return;
    }

    const fullAddress = `${regPurok.trim()}, Barangay ${regBarangay.trim()}, Butuan City`;
    const fullName = `${regFirstName.trim()}${regMiddleName.trim() ? ' ' + regMiddleName.trim() : ''} ${regLastName.trim()}`;

    setLoading(true);
    try {
      await apiService.register({
        first_name: regFirstName.trim(),
        middle_name: regMiddleName.trim(),
        last_name: regLastName.trim(),
        date_of_birth: regDob,
        gender: regGender,
        civil_status: regCivilStatus,
        employment_status: regEmployment,
        years_of_residency: regResidencyYears.trim() || undefined,
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        phone: cleanPhone,
        address: fullAddress,
        role: 'resident',
        submitted_id: regIdPhoto,
        id_type: regIdType,
        barangay: regBarangay.trim()
      });

      const user = {
        name: fullName,
        first_name: regFirstName.trim(),
        middle_name: regMiddleName.trim(),
        last_name: regLastName.trim(),
        date_of_birth: regDob,
        age: calculatedAge,
        gender: regGender,
        civil_status: regCivilStatus,
        employment_status: regEmployment,
        email: regEmail.trim().toLowerCase(),
        phone: cleanPhone,
        address: fullAddress,
        barangay: regBarangay.trim(),
        city: 'Butuan City',
        purok: regPurok.trim(),
        role: 'resident',
        verification_status: 'Pending_Review',
        submitted_id: regIdPhoto,
        id_type: regIdType,
        years_of_residency: regResidencyYears.trim() || undefined
      };

      localStorage.setItem('barangay_user', JSON.stringify(user));

      toast.warning('Account Created (ID Under Review)', {
        description: 'Your resident account and ID have been submitted! Please wait for Admin approval to unlock official clearance requests.'
      });

      clearForm();
      setIsChoiceModalOpen(true);
    } catch (err: any) {
      toast.error('Registration failed', { description: err.message || 'Please try again with a different email.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Ensure all credentials and inputs initialize completely empty with no autofill
    setEmail('');
    setPassword('');
    setRegEmail('');
    setRegPassword('');
  }, []);

  return (
    <div className="min-h-screen bg-white sm:bg-[#FAFAFA] flex flex-col justify-between font-sans">
      {/* Top Viewport Header: Pinned directly to far Top-Left */}
      <header className="w-full px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-xs border border-slate-200 shrink-0">
            <img src="/assets/pianing-logo.png" alt="Barangay Pianing Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">Barangay Pianing</h1>
            <p className="text-xs text-slate-500 font-medium">Smart Public Health &amp; Admin Portal</p>
          </div>
        </div>
      </header>

      {/* Centered Main Login / Signup Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-4 sm:py-6">
        <div className={`w-full bg-white border border-slate-200 shadow-sm rounded-2xl p-6 sm:p-7 transition-all ${activeTab === 'register' ? 'max-w-xl' : 'max-w-[420px]'}`}>
          {/* Card Header matching Screenshot with Logo */}
          <div className="text-center pb-4">
            <div className="mx-auto w-11 h-11 rounded-full overflow-hidden bg-white shadow-xs border border-slate-200 flex items-center justify-center mb-2.5">
              <img src="/assets/pianing-logo.png" alt="Barangay Pianing Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">Smart Barangay Portal</h2>
            <p className="text-slate-500 text-xs mt-1">
              Access Barangay Admin, BHW Health Portal, or Resident Services
            </p>
          </div>

          {/* Tab Switcher Capsule */}
          <div className="flex justify-center mb-5">
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => handleTabChange('login')}
                className={`px-5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('register')}
                className={`px-5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* ── TAB 1: LOGIN ─────────────────────────────────── */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3" autoComplete="off" method="post" action="#">
              <input type="text" name="fake_username_fill" className="hidden" tabIndex={-1} autoComplete="off" />
              <input type="password" name="fake_password_fill" className="hidden" tabIndex={-1} autoComplete="new-password" />

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Email Address <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="email"
                  name="login_user_email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@email.com"
                  required
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Password <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    name="login_user_password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-9 px-3 pr-9 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showLoginPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all rounded-lg mt-2 cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
                <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </form>
          )}

          {/* ── TAB 2: REGISTER (Minimalist, Compact, No Placeholders) ─────────── */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3" autoComplete="off" method="post" action="#">
              <input type="text" name="fake_reg_username_fill" className="hidden" tabIndex={-1} autoComplete="off" />
              <input type="password" name="fake_reg_password_fill" className="hidden" tabIndex={-1} autoComplete="new-password" />

              {/* Amber Alert Callout from Screenshot */}
              <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  New accounts start as <strong>Unverified</strong>. Online document requests are unlocked after Barangay Admin verification.
                </span>
              </div>

              {/* Row 1: First Name, Middle Name, Last Name (3 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    First Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    placeholder="e.g. Maria"
                    required
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Middle Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={regMiddleName}
                    onChange={(e) => setRegMiddleName(e.target.value)}
                    placeholder="e.g. Clara"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Last Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    placeholder="e.g. Santos"
                    required
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Row 2: Email Address, Password (2 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Email Address <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="email"
                    name="reg_email_field"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. maria@email.com"
                    required
                    autoComplete="off"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Password <span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      name="reg_pwd_field"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      className="w-full h-9 px-3 pr-9 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: Contact Number, Birthday, Gender (3 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Contact Number <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="09XXXXXXXXX"
                    required
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Birthday <span className="text-red-500 font-bold">*</span>
                    </label>
                    {getDynamicAge(regDob) !== null && (
                      <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                        {getDynamicAge(regDob)} yrs
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={regDob}
                    onChange={(e) => setRegDob(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Gender <span className="text-red-500 font-bold">*</span>
                  </label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as any)}
                    required
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all cursor-pointer"
                  >
                    <option value="" disabled hidden>Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other / Non-Binary</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Civil Status & Employment Status (2 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Civil Status <span className="text-red-500 font-bold">*</span>
                  </label>
                  <select
                    value={regCivilStatus}
                    onChange={(e) => setRegCivilStatus(e.target.value as any)}
                    required
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all cursor-pointer"
                  >
                    <option value="" disabled hidden>Select Civil Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                    <option value="Live-In">Live-In / Common Law</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Employment Status <span className="text-red-500 font-bold">*</span>
                  </label>
                  <select
                    value={regEmployment}
                    onChange={(e) => setRegEmployment(e.target.value)}
                    required
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all cursor-pointer font-medium"
                  >
                    <option value="Employed">Employed (Have Work)</option>
                    <option value="Self-Employed">Self-Employed / Business Owner</option>
                    <option value="Unemployed">Unemployed (Looking for work)</option>
                    <option value="Student">Student / In School</option>
                    <option value="Retired">Retired / Pensioner</option>
                    <option value="Minor">Dependent Minor</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Years of Residency in the Barangay (1 col) */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Years of Residency in the Barangay <span className="text-slate-400 font-normal">(for Certificate of Residency)</span>
                </label>
                <input
                  type="text"
                  value={regResidencyYears}
                  onChange={(e) => setRegResidencyYears(e.target.value)}
                  placeholder="e.g. 5 years or since 2018"
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Used for official Barangay Certificates &amp; Residency verification.</p>
              </div>

              {/* Row 6: Residential Address (Section with 3 separated cols) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700 block">
                  Residential Address <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Purok / Street <span className="text-red-500">*</span></span>
                    <input
                      type="text"
                      value={regPurok}
                      onChange={(e) => setRegPurok(e.target.value)}
                      list="reg-purok-suggestions"
                      placeholder="e.g. Purok 1"
                      required
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                    />
                    <datalist id="reg-purok-suggestions">
                      <option value="Purok 1" />
                      <option value="Purok 2" />
                      <option value="Purok 3" />
                      <option value="Purok 4" />
                      <option value="Purok 5" />
                      <option value="Purok 6" />
                      <option value="Purok 7" />
                    </datalist>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Barangay <span className="text-red-500">*</span></span>
                    <select
                      value={regBarangay}
                      onChange={(e) => setRegBarangay(e.target.value)}
                      required
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all cursor-pointer font-medium"
                    >
                      {BUTUAN_BARANGAYS.map((b) => (
                        <option key={b} value={b}>Barangay {b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">City / Municipality</span>
                    <div className="w-full h-9 px-3 bg-slate-100/90 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center select-none shadow-xs">
                      Butuan City
                    </div>
                  </div>
                </div>
                <div className="px-2.5 py-1 bg-blue-50/70 border border-blue-200/60 rounded-md flex items-center gap-1.5 text-[10px] text-blue-700">
                  <MapPin size={11} className="shrink-0 text-blue-600" />
                  <span className="font-semibold">Registered Jurisdiction:</span>
                  <span className="truncate">{regPurok.trim() || 'Purok'}, Barangay {regBarangay}, Butuan City</span>
                </div>
              </div>

              {/* Row 7: Valid Government ID Type & Upload */}
              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Valid Government ID Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={regIdType}
                    onChange={(e) => setRegIdType(e.target.value)}
                    required
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all cursor-pointer"
                  >
                    <option value="">Select Government ID Type *</option>
                    {ID_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* ID Photo Upload Area */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Government ID Photo <span className="text-red-500">*</span>
                  </label>
                  {!regIdPhoto ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-red-300 hover:border-red-500 bg-red-50/15 hover:bg-red-50/30 rounded-xl p-3 text-center cursor-pointer transition-all group"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-1 group-hover:scale-105 transition-transform">
                        <Camera size={16} />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">Click to choose or capture valid ID photo <span className="text-red-500">*</span></p>
                      <p className="text-[9px] text-slate-500 mt-0.5">PNG, JPG, or JPEG up to 5MB (Strictly Required)</p>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={regIdPhoto}
                          alt="ID Preview"
                          className="w-12 h-9 object-cover rounded-lg border border-blue-300 shadow-2xs shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-blue-950 truncate">
                            {regIdFileName || `${regIdType || 'Government ID'}`}
                          </p>
                          <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-emerald-600" /> Valid ID Photo Attached
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearIdPhoto}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full cursor-pointer transition-colors"
                        title="Remove photo"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  {/* Strict Requirement Notice Banner */}
                  <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <span className="text-amber-600 text-xs mt-0.5 shrink-0">🔒</span>
                    <p className="text-[10.5px] text-amber-900 leading-tight">
                      <strong>Strictly Required:</strong> A clear photo of your valid Government ID is required to register. You cannot proceed without uploading a valid ID.
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all rounded-lg mt-3 cursor-pointer"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          )}

          <div className="pt-3 text-center border-t border-slate-100 mt-5">
            <button
              onClick={() => navigate('/')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              &larr; Back to Homepage
            </button>
          </div>
        </div>
      </main>

      {/* Portal Choice Modal - Residents Only */}
      <Dialog open={isChoiceModalOpen} onOpenChange={setIsChoiceModalOpen}>
        <DialogContent className="bg-white max-w-sm sm:max-w-md rounded-3xl p-6">
          <DialogHeader className="text-center">
            <DialogTitle className="text-slate-900 font-bold text-center text-lg">Welcome to the Portal!</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 text-center mt-1">
              Select which portal you would like to open:
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3">
            <Button
              onClick={() => { setIsChoiceModalOpen(false); navigate('/resident/barangay'); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex flex-col gap-2.5 py-6 h-auto rounded-2xl shadow-md cursor-pointer"
            >
              <Building2 size={26} />
              <div className="text-center">
                <span className="font-bold text-sm block">Barangay Portal</span>
                <span className="text-[10px] text-indigo-100 font-normal">Clearances, Permits &amp; IDs</span>
              </div>
            </Button>
            <Button
              onClick={() => { setIsChoiceModalOpen(false); navigate('/resident/health'); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex flex-col gap-2.5 py-6 h-auto rounded-2xl shadow-md cursor-pointer"
            >
              <Heart size={26} />
              <div className="text-center">
                <span className="font-bold text-sm block">Health Center Portal</span>
                <span className="text-[10px] text-emerald-100 font-normal">Medical &amp; Vaccine Records</span>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 dark:text-slate-500 py-2">
        &copy; 2026 Smart Barangay Administrative &amp; Health Management Ecosystem.
      </footer>
    </div>
  );
}
