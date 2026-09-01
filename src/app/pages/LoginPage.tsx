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
  Eye,
  EyeOff,
  CreditCard,
  CheckCircle2,
  Calendar,
  X,
  Camera,
  UploadCloud
} from 'lucide-react';
import { apiService } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
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
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Register State
  const [regFirstName, setRegFirstName] = useState('');
  const [regMiddleName, setRegMiddleName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regDob, setRegDob] = useState('2000-01-01');
  const [regGender, setRegGender] = useState<'Male' | 'Female'>('Male');
  const [regCivilStatus, setRegCivilStatus] = useState<'Single' | 'Married' | 'Widowed' | 'Separated'>('Single');
  const [regResidencyYears, setRegResidencyYears] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [regPhone, setRegPhone] = useState('');
  const [regPurok, setRegPurok] = useState('Purok 1');
  const [regBarangay, setRegBarangay] = useState('Pianing');
  const [regCity, setRegCity] = useState('Butuan City');
  const [regIdType, setRegIdType] = useState(ID_TYPES[0]);
  const [regIdPhoto, setRegIdPhoto] = useState<string | null>(null);
  const [regIdFileName, setRegIdFileName] = useState<string>('');
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large', { description: 'Please choose an image under 5MB.' });
        return;
      }
      setRegIdFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegIdPhoto(reader.result as string);
        toast.success('ID document uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearIdPhoto = () => {
    setRegIdPhoto(null);
    setRegIdFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('ID photo removed. Please select another image.');
  };

  const executeLogin = async (targetEmail: string, targetPassword?: string) => {
    const passToUse = targetPassword !== undefined ? targetPassword : password;
    setLoading(true);
    try {
      const res = await apiService.login(targetEmail, passToUse);
      if (!res || res.success === false) {
        toast.error('Invalid credentials', {
          description: res?.message || 'Please check your email and password.'
        });
        return;
      }

      const user = res.user;
      if (!user) {
        toast.error('Account not found');
        return;
      }

      localStorage.setItem('barangay_user', JSON.stringify(user));

      if (user.role === 'resident') {
        setIsChoiceModalOpen(true);
      } else {
        const portalLabel = user.role === 'superadmin' ? 'Super Admin Portal'
          : user.role === 'admin' ? 'Barangay Admin Portal'
          : user.role === 'staff' ? 'Barangay Staff Portal'
          : 'BHW Health Center Portal';
        toast.success(`Welcome back, ${user.name}!`, { description: `Opening ${portalLabel}...` });

        if (user.role === 'superadmin' || user.role === 'admin' || user.role === 'staff') {
          navigate('/admin');
        } else if (user.role === 'bhw') {
          navigate('/bhw');
        }
      }
    } catch (err) {
      toast.error('Login failed', { description: 'Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(email, password);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mandatory Field Validations
    if (!regFirstName.trim()) {
      toast.error('First Name is required');
      return;
    }
    if (!regLastName.trim()) {
      toast.error('Last Name is required');
      return;
    }
    if (!regDob) {
      toast.error('Date of Birth / Birthday is required');
      return;
    }
    if (!regEmail.trim()) {
      toast.error('Email address is required');
      return;
    }
    if (!regPassword.trim()) {
      toast.error('Password is required');
      return;
    }
    if (regPassword.length < 4) {
      toast.error('Password too short', { description: 'Please use at least 4 characters.' });
      return;
    }
    if (!regPhone.trim()) {
      toast.error('Mobile Phone Number is required', {
        description: 'Please input your active contact number (e.g. 09171234567).'
      });
      return;
    }

    const cleanPhone = regPhone.replace(/\s+/g, '');
    if (!/^(09|\+639)\d{9}$/.test(cleanPhone)) {
      toast.error('Invalid Mobile Number Format', {
        description: 'Please enter a valid format: 09171234567 or +639171234567 (11 digits).'
      });
      return;
    }

    if (!regBarangay.trim()) {
      toast.error('Barangay is required');
      return;
    }
    if (!regCity.trim()) {
      toast.error('City / Municipality is required');
      return;
    }
    if (!regPurok.trim()) {
      toast.error('Purok / Street Address is required');
      return;
    }
    if (!regIdPhoto) {
      toast.error('Government ID photo is required', {
        description: 'Please upload a photo of your valid government ID for Barangay Admin verification.'
      });
      return;
    }

    const fullName = `${regFirstName.trim()} ${regMiddleName.trim() ? regMiddleName.trim() + ' ' : ''}${regLastName.trim()}`.trim();
    const fullAddress = `${regPurok.trim()}, Barangay ${regBarangay.trim()}, ${regCity.trim()}`;

    setLoading(true);
    try {
      const res = await apiService.register({
        name: fullName,
        first_name: regFirstName.trim(),
        middle_name: regMiddleName.trim(),
        last_name: regLastName.trim(),
        date_of_birth: regDob,
        gender: regGender,
        civil_status: regCivilStatus,
        email: regEmail.trim(),
        password: regPassword,
        phone: cleanPhone,
        address: fullAddress,
        submitted_id: regIdPhoto,
        years_of_residency: regResidencyYears.trim() || undefined
      });

      const user = res.user || {
        id: Date.now(),
        name: fullName,
        first_name: regFirstName.trim(),
        middle_name: regMiddleName.trim(),
        last_name: regLastName.trim(),
        date_of_birth: regDob,
        gender: regGender,
        civil_status: regCivilStatus,
        email: regEmail.trim(),
        phone: cleanPhone,
        address: fullAddress,
        role: 'resident',
        verification_status: 'Pending_Review',
        submitted_id: regIdPhoto,
        years_of_residency: regResidencyYears.trim() || undefined
      };

      localStorage.setItem('barangay_user', JSON.stringify(user));

      toast.warning('Account Created (Under Review)', {
        description: 'Your resident account has been submitted! Please wait for Admin approval to unlock official clearance requests.'
      });

      setIsChoiceModalOpen(true);
    } catch (err) {
      toast.error('Registration failed', { description: 'Please try again with a different email.' });
    } finally {
      setLoading(false);
    }
  };

  const RequiredBadge = () => <span className="text-red-500 font-bold ml-0.5">*</span>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Top Navbar Header */}
      <header className="max-w-7xl w-full mx-auto flex justify-between items-center z-10 py-2">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-md border border-slate-200">
            <img src="/assets/pianing-logo.png" alt="Barangay Pianing Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Barangay Pianing</h1>
            <p className="text-xs text-slate-500 font-medium">Smart Public Health & Admin Portal</p>
          </div>
        </div>
      </header>

      {/* Main Login / Signup Card */}
      <main className="flex-1 flex items-center justify-center py-6 z-10">
        <Card className="w-full max-w-lg shadow-xl border-slate-200 bg-white/95 backdrop-blur-xs">
          <CardHeader className="space-y-1 text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-full overflow-hidden bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-1">
              <img src="/assets/pianing-logo.png" alt="Barangay Pianing Logo" className="w-full h-full object-contain" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Smart Barangay Portal</CardTitle>
            <CardDescription className="text-slate-500 text-xs sm:text-sm">
              Access Barangay Admin, BHW Health Portal, or Resident Services
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'login' | 'register')} className="w-full">
              <TabsList className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-4">
                <TabsTrigger value="login" className="text-xs font-semibold">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="text-xs font-semibold">Create Account</TabsTrigger>
              </TabsList>

              {/* TAB 1: LOGIN */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Email Address <RequiredBadge />
                    </Label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-2.5 text-slate-400" size={18} />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-10 bg-slate-50 border-slate-200 text-xs"
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Password <RequiredBadge />
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                      <Input
                        type={showLoginPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-10 bg-slate-50 border-slate-200 text-xs"
                        placeholder="Enter password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPass(!showLoginPass)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                        tabIndex={-1}
                      >
                        {showLoginPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all mt-2 cursor-pointer"
                  >
                    {loading ? 'Authenticating...' : 'Sign In to Portal'}
                    <ArrowRight size={15} className="ml-1.5" />
                  </Button>
                </form>
              </TabsContent>

              {/* TAB 2: RESIDENT ACCOUNT REGISTRATION */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                    <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>New accounts start as <strong>Unverified</strong>. Online document requests are unlocked after Barangay Admin verification.</span>
                  </div>

                  {/* 1. First, Middle, and Last Name (Separate Inputs) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        First Name <RequiredBadge />
                      </Label>
                      <Input
                        value={regFirstName}
                        onChange={e => setRegFirstName(e.target.value)}
                        placeholder="e.g. Maria"
                        required
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Middle Name <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </Label>
                      <Input
                        value={regMiddleName}
                        onChange={e => setRegMiddleName(e.target.value)}
                        placeholder="e.g. Clara"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Last Name <RequiredBadge />
                      </Label>
                      <Input
                        value={regLastName}
                        onChange={e => setRegLastName(e.target.value)}
                        placeholder="e.g. Santos"
                        required
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* 2. Email & Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Email Address <RequiredBadge />
                      </Label>
                      <Input
                        type="email"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        placeholder="name@domain.com"
                        required
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Password <RequiredBadge />
                      </Label>
                      <div className="relative">
                        <Input
                          type={showRegPass ? 'text' : 'password'}
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                          placeholder="Create password"
                          required
                          className="h-9 text-xs pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPass(!showRegPass)}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                          tabIndex={-1}
                        >
                          {showRegPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3. Mobile Phone Number, Date of Birth, Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Phone size={13} className="text-teal-600" />
                        Mobile Phone <RequiredBadge />
                      </Label>
                      <Input
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        placeholder="09171234567"
                        maxLength={11}
                        inputMode="numeric"
                        required
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Calendar size={13} className="text-teal-600" />
                        Birthday <RequiredBadge />
                      </Label>
                      <Input
                        type="date"
                        value={regDob}
                        onChange={e => setRegDob(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        required
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        Gender <RequiredBadge />
                      </Label>
                      <Select value={regGender} onValueChange={(val: 'Male' | 'Female') => setRegGender(val)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male" className="text-xs">Male</SelectItem>
                          <SelectItem value="Female" className="text-xs">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Civil Status */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      Civil Status <RequiredBadge />
                    </Label>
                    <Select value={regCivilStatus} onValueChange={(val: 'Single' | 'Married' | 'Widowed' | 'Separated') => setRegCivilStatus(val)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Civil Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single" className="text-xs">Single</SelectItem>
                        <SelectItem value="Married" className="text-xs">Married</SelectItem>
                        <SelectItem value="Widowed" className="text-xs">Widowed</SelectItem>
                        <SelectItem value="Separated" className="text-xs">Separated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Years of Residency in Barangay */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <MapPin size={13} className="text-teal-600" />
                      Years of Residency in the Barangay
                      <span className="ml-1 text-[10px] font-normal text-slate-400">(Optional — for Certificate of Residency)</span>
                    </Label>
                    <Input
                      value={regResidencyYears}
                      onChange={e => setRegResidencyYears(e.target.value)}
                      placeholder="e.g. 5 years   or   since 2018"
                      className="h-9 text-xs"
                    />

                    <p className="text-[10px] text-slate-400">This will be used if you request a Certificate of Residency.</p>
                  </div>

                  {/* 4. Address: Barangay, City, Purok/Street */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <MapPin size={13} className="text-teal-600" />
                      Residential Address <RequiredBadge />
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px] text-slate-500 font-medium">Barangay <RequiredBadge /></Label>
                        <Select value={regBarangay} onValueChange={setRegBarangay}>
                          <SelectTrigger className="h-8 text-xs mt-0.5">
                            <SelectValue placeholder="Select Barangay" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {BUTUAN_BARANGAYS.map(b => (
                              <SelectItem key={b} value={b} className="text-xs">Barangay {b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 font-medium">City / Municipality <RequiredBadge /></Label>
                        <Input
                          value={regCity}
                          onChange={e => setRegCity(e.target.value)}
                          placeholder="e.g. Butuan City"
                          required
                          className="h-8 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 font-medium">Purok / Street <RequiredBadge /></Label>
                        <Input
                          value={regPurok}
                          onChange={e => setRegPurok(e.target.value)}
                          placeholder="e.g. Purok 1"
                          required
                          className="h-8 text-xs mt-0.5"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Identification Document */}
                  <div className="space-y-1.5 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <CreditCard size={13} className="text-teal-600" />
                        Valid Government ID Type <RequiredBadge />
                      </Label>
                      <Select value={regIdType} onValueChange={setRegIdType}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select Valid ID Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ID_TYPES.map((idType) => (
                            <SelectItem key={idType} value={idType} className="text-xs">
                              {idType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700">
                          Upload ID Photo / Document <RequiredBadge />
                        </Label>
                        {regIdPhoto && (
                          <button
                            type="button"
                            onClick={handleClearIdPhoto}
                            className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <X size={12} /> Remove / Change
                          </button>
                        )}
                      </div>

                      {!regIdPhoto ? (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/40 rounded-xl p-3.5 text-center cursor-pointer transition-all group"
                        >
                          <div className="w-8 h-8 rounded-full bg-teal-100 group-hover:bg-teal-200 text-teal-600 flex items-center justify-center mx-auto mb-1 transition-colors">
                            <Camera size={16} />
                          </div>
                          <p className="text-xs font-semibold text-slate-700">Click to choose or take a photo of your ID</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, or JPEG up to 5MB</p>
                        </div>
                      ) : (
                        <div className="p-2 bg-teal-50/80 border border-teal-200 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={regIdPhoto}
                              alt="ID Preview"
                              className="w-12 h-10 object-cover rounded-lg border border-teal-300 shadow-2xs shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-teal-900 truncate">
                                {regIdFileName || `${regIdType}`}
                              </p>
                              <span className="text-[10px] text-teal-700 font-medium flex items-center gap-1">
                                <CheckCircle2 size={11} className="text-teal-600" /> Image attached
                              </span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearIdPhoto}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full cursor-pointer shrink-0"
                            title="Remove photo"
                          >
                            <X size={15} />
                          </Button>
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-md transition-all mt-3 cursor-pointer"
                  >
                    <UserCheck size={15} className="mr-1.5" />
                    Create Account & Proceed
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="flex justify-center border-t border-slate-100 pt-3 pb-3">
            <button
              onClick={() => navigate('/')}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              &larr; Back to Homepage
            </button>
          </CardFooter>
        </Card>
      </main>

      {/* Portal Choice Modal - Residents Only */}
      <Dialog open={isChoiceModalOpen} onOpenChange={setIsChoiceModalOpen}>
        <DialogContent className="bg-white max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-center">Welcome, Resident!</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 text-center">
              Please select which resident portal you would like to access to submit document requests:
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <Button
              onClick={() => { setIsChoiceModalOpen(false); navigate('/resident/barangay'); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex flex-col gap-2 py-5 h-auto rounded-xl shadow-md cursor-pointer"
            >
              <Building2 size={24} />
              <div className="text-center">
                <span className="font-bold text-sm block">Barangay Portal</span>
                <span className="text-[10px] text-indigo-100 font-normal">Clearances, Permits & IDs</span>
              </div>
            </Button>
            <Button
              onClick={() => { setIsChoiceModalOpen(false); navigate('/resident/health'); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex flex-col gap-2 py-5 h-auto rounded-xl shadow-md cursor-pointer"
            >
              <Heart size={24} />
              <div className="text-center">
                <span className="font-bold text-sm block">Health Center Portal</span>
                <span className="text-[10px] text-emerald-100 font-normal">Medical & Vaccine Records</span>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-2">
        &copy; 2026 Smart Barangay Administrative & Health Management Ecosystem. Connected to MySQL.
      </footer>
    </div>
  );
}
