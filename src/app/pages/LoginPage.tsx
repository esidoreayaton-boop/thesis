import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Shield, UserCircle, Lock, ArrowRight, Activity, UserCheck, AlertCircle, Building2, Heart } from 'lucide-react';
import { apiService } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import DatabaseStatusBadge from '../components/DatabaseStatusBadge';
import { toast } from 'sonner';

const inferRoleFromEmail = (emailStr: string): 'superadmin' | 'admin' | 'staff' | 'bhw' | 'resident' => {
  const e = (emailStr || '').toLowerCase();
  if (e.includes('superadmin')) return 'superadmin';
  if (e.includes('admin')) return 'admin';
  if (e.includes('staff')) return 'staff';
  if (e.includes('bhw')) return 'bhw';
  return 'resident';
};

export default function LoginPage() {
  const navigate = useNavigate();
  
  // Login State
  const [email, setEmail] = useState('admin@barangay.gov');
  const [password, setPassword] = useState('123');
  const [loading, setLoading] = useState(false);

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [targetPortal, setTargetPortal] = useState('/resident');
  const [regIdPhoto, setRegIdPhoto] = useState<string | null>(null);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegIdPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const inferNameFromEmail = (emailStr: string): string => {
    const e = (emailStr || '').toLowerCase();
    if (e.includes('superadmin')) return 'Super Admin Rodrigo Lim';
    if (e.includes('admin')) return 'Captain Juan Dela Cruz (Admin)';
    if (e.includes('staff')) return 'Barangay Staff Ana Reyes';
    if (e.includes('bhw')) return 'Nurse Maria Santos (BHW)';
    if (e.includes('resident')) return 'Juan Resident Dela Cruz';
    return 'Barangay User';
  };

  const executeLogin = async (targetEmail: string, targetPassword?: string) => {
    const passToUse = targetPassword !== undefined ? targetPassword : password;
    setLoading(true);
    try {
      const res = await apiService.login(targetEmail, passToUse);
      if (!res || res.success === false) {
        toast.error('Invalid password', {
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
    if (!regName || !regEmail) return;
    setLoading(true);
    try {
      const res = await apiService.register({
        name: regName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        address: regAddress,
        submitted_id: regIdPhoto || undefined
      });

      const user = res.user || {
        id: Date.now(),
        name: regName,
        email: regEmail,
        role: 'resident',
        verification_status: 'Pending_Review',
        submitted_id: regIdPhoto
      };

      localStorage.setItem('barangay_user', JSON.stringify(user));

      toast.warning('Account Created (Under Review)', {
        description: 'Your resident account has been created! Please wait for Admin approval to unlock official clearance requests.'
      });

      setIsChoiceModalOpen(true);
    } catch (err) {
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Top Navbar Header */}
      <header className="max-w-7xl w-full mx-auto flex justify-between items-center z-10 py-2">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Shield size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Smart Barangay</h1>
            <p className="text-xs text-slate-500 font-medium">Public Health & Admin Ecosystem</p>
          </div>
        </div>
      </header>

      {/* Main Login / Signup Card */}
      <main className="flex-1 flex items-center justify-center py-8 z-10">
        <Card className="w-full max-w-md shadow-xl border-slate-200 bg-white/95 backdrop-blur-xs">
          <CardHeader className="space-y-1 text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center mb-1">
              <Shield size={26} />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Smart Barangay Portal</CardTitle>
            <CardDescription className="text-slate-500 text-xs sm:text-sm">
              Access Barangay Admin, BHW Health Portal, or Resident Services
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-4">
                <TabsTrigger value="login" className="text-xs font-semibold">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="text-xs font-semibold">Create Account</TabsTrigger>
              </TabsList>

              {/* TAB 1: LOGIN */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
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
                    <Label className="text-xs font-semibold text-slate-700">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-10 bg-slate-50 border-slate-200 text-xs"
                        placeholder="Enter password"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all mt-2"
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

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Full Name</Label>
                    <Input value={regName} onChange={e => setRegName(e.target.value)} placeholder="e.g. Maria Clara Santos" required className="h-9 text-xs" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
                    <Input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="name@domain.com" required className="h-9 text-xs" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Account Password</Label>
                    <Input
                      type="password"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Create a password (e.g. 123)"
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Mobile Phone</Label>
                      <Input value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="09171234567" className="h-9 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Purok / Address</Label>
                      <Input value={regAddress} onChange={e => setRegAddress(e.target.value)} placeholder="Purok 1, Barangay Pianing, Butuan City" className="h-9 text-xs" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Upload Government ID (Required for Verification)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      required
                      className="h-9 text-xs bg-slate-50 border-slate-200 cursor-pointer"
                    />
                    {regIdPhoto && (
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">✓ ID image loaded successfully</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-md transition-all mt-2"
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
              className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex flex-col gap-2 py-5 h-auto rounded-xl shadow-md"
            >
              <Building2 size={24} />
              <div className="text-center">
                <span className="font-bold text-sm block">Barangay Portal</span>
                <span className="text-[10px] text-indigo-100 font-normal">Clearances, Permits & IDs</span>
              </div>
            </Button>
            <Button
              onClick={() => { setIsChoiceModalOpen(false); navigate('/resident/health'); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex flex-col gap-2 py-5 h-auto rounded-xl shadow-md"
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
