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
import {
  UserCircle,
  Phone,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Building,
  CheckCircle2,
  Mail,
  User,
  Sparkles,
  Lock,
  Calendar
} from 'lucide-react';
import { apiService } from '../../services/api';
import { toast } from 'sonner';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onProfileUpdated?: (updatedUser: any) => void;
}

export default function ProfileSettingsModal({
  isOpen,
  onClose,
  user,
  onProfileUpdated
}: ProfileSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveTab('profile');
    }
  }, [user, isOpen]);

  const getRoleBadgeColor = (role?: string) => {
    const r = (role || '').toLowerCase();
    if (r === 'superadmin') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (r === 'admin') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (r === 'nurse') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (r === 'bhw') return 'bg-teal-100 text-teal-800 border-teal-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  const getInitials = (nameStr?: string) => {
    if (!nameStr) return 'U';
    const parts = nameStr.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return nameStr.slice(0, 2).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Official name cannot be empty');
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        toast.error('Current password is required to change your password');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }
      if (newPassword.length < 6) {
        toast.error('New password must be at least 6 characters');
        return;
      }
      try {
        const verify = await apiService.login(user.email, currentPassword);
        if (!verify?.user) {
          toast.error('Incorrect current password');
          return;
        }
      } catch {
        toast.error('Incorrect current password or server unavailable');
        return;
      }
    }

    setSaving(true);
    try {
      await apiService.updateProfile({
        id: user?.id,
        email: user?.email,
        name: name.trim() !== user?.name ? name.trim() : undefined,
        phone: phone.trim() || undefined,
        password: newPassword || undefined
      });

      const updated = {
        ...user,
        name: name.trim() || user?.name,
        phone: phone.trim() || user?.phone
      };
      localStorage.setItem('barangay_user', JSON.stringify(updated));
      toast.success('Profile settings updated successfully!');
      if (onProfileUpdated) onProfileUpdated(updated);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg bg-white p-0 overflow-hidden shadow-2xl rounded-2xl border border-slate-200">
        {/* Clean, Soft & Eye-Friendly Header */}
        <div className="bg-white border-b border-slate-200 p-6 text-slate-900 relative">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-xl font-bold text-teal-800 tracking-wider shrink-0 shadow-xs">
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight truncate">
                  {user?.name || 'Healthcare Officer'}
                </h2>
                <Badge className={`text-[10px] font-bold px-2 py-0.5 border ${getRoleBadgeColor(user?.role)}`}>
                  {(user?.role || 'Staff').toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1.5">
                <Mail size={12} className="text-slate-400" />
                {user?.email || 'officer@barangay.gov.ph'}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Building size={11} className="text-teal-600" />
                  Brgy. {user?.barangay || 'Pianing'}
                </span>
                <span className="flex items-center gap-1 text-emerald-700">
                  <ShieldCheck size={11} />
                  Verified Account
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-5 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'profile'
                  ? 'bg-teal-50 text-teal-900 border border-teal-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <User size={13} />
              Personal Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'security'
                  ? 'bg-teal-50 text-teal-900 border border-teal-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Lock size={13} />
              Password &amp; Security
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {activeTab === 'profile' ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Official Full Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Maria Santos, RN"
                    required
                    className="pl-9 h-10 text-xs bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">This name appears on clinical charts, prescriptions, and official SMS notifications.</p>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Contact Mobile Phone
                </Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="09XXXXXXXXX"
                    maxLength={11}
                    className="pl-9 h-10 text-xs font-mono bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Used for emergency alerts and clinical consultation contact info.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Jurisdiction</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">Barangay {user?.barangay || 'Pianing'}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Managed by City LGU</span>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Access Level</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block uppercase truncate">{user?.role || 'Staff'} Access</span>
                  <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block flex items-center gap-1">
                    <CheckCircle2 size={10} /> Active Session
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex items-start gap-2.5">
                <ShieldCheck className="text-indigo-600 flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="font-bold">Protect Your Clinical Account</p>
                  <p className="text-[11px] text-indigo-700 mt-0.5">Use at least 6 characters including numbers and letters. Leave blank if you do not want to change your password.</p>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Current Password
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password to verify"
                    className="h-10 text-xs pr-9 bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(p => !p)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    New Password
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 6 chars"
                      className="h-10 text-xs pr-9 bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(p => !p)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Confirm Password
                  </Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="h-10 text-xs mt-1.5 bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-semibold h-10 px-4 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-10 px-6 rounded-xl shadow-md cursor-pointer transition-all hover:shadow-indigo-200"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
