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
  CheckCircle2
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
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Full name cannot be empty');
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
      // verify current password
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
      <DialogContent className="max-w-md bg-white p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
              Account Security
            </span>
          </div>
          <DialogTitle className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
            <UserCircle className="text-indigo-600" size={18} />
            Profile Settings &amp; Security
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Manage your official health worker credentials and login password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          {/* Identity Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Official Full Name <span className="text-red-500">*</span></Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your official name"
                required
                className="h-9 text-xs mt-1 bg-white"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Contact Mobile Phone</Label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="09XXXXXXXXX"
                maxLength={11}
                className="h-9 text-xs font-mono mt-1 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Assigned Barangay</Label>
              <div className="h-9 px-2.5 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-600 font-semibold flex items-center justify-between mt-1">
                <span>{user?.barangay || 'Pianing'}</span>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded font-mono">Locked</span>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">System Role</Label>
              <div className="h-9 px-2.5 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-600 font-semibold flex items-center justify-between mt-1">
                <span>{(user?.role || 'Staff').toUpperCase()}</span>
                <Badge variant="outline" className="text-[9px] py-0 px-1 border-slate-300">Authorized</Badge>
              </div>
            </div>
          </div>

          {/* Password Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
              <KeyRound size={12} className="text-indigo-600" />
              Change Login Password (Optional)
            </p>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Current Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password to change"
                  className="h-9 text-xs pr-8 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(p => !p)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">New Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="h-9 text-xs pr-8 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(p => !p)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Confirm New</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new"
                  className="h-9 text-xs mt-1 bg-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold w-full h-9 shadow-xs cursor-pointer"
            >
              {saving ? 'Saving Settings...' : 'Save Profile Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
