import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { User, Phone, Lock, CheckCircle2, Shield, KeyRound, AlertCircle } from 'lucide-react';
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
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setPhone(user.phone || '');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [user, isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Passwords do not match', {
        description: 'Please ensure both password fields are identical.'
      });
      return;
    }

    if (newPassword && newPassword.length < 3) {
      toast.error('Password too short', {
        description: 'Password must be at least 3 characters long.'
      });
      return;
    }

    setLoading(true);
    try {
      await apiService.updateProfile({
        id: user?.id,
        email: user?.email,
        phone: phone.trim(),
        password: newPassword ? newPassword : undefined
      });

      const updatedUser = {
        ...user,
        phone: phone.trim()
      };

      localStorage.setItem('barangay_user', JSON.stringify(updatedUser));
      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }

      toast.success('Profile settings updated successfully!', {
        description: newPassword ? 'Contact number and password updated.' : 'Contact number updated.'
      });
      onClose();
    } catch (err) {
      toast.error('Failed to update profile', {
        description: 'Please check your connection and try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white text-base font-bold">
            <User className="text-teal-600" size={20} />
            Resident Profile & Security Settings
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            You can update your contact number and password. Official name and address modifications require Barangay Hall verification.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          {/* Read-only Identity Overview */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Resident Name:</span>
              <span className="font-bold text-slate-900 dark:text-white">{user?.name || 'Resident'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Email Address:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{user?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Barangay Address:</span>
              <span className="text-slate-700 dark:text-slate-300 text-right max-w-[200px] truncate">{user?.address || 'Barangay Pianing, Butuan City'}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 font-medium">Account Status:</span>
              <Badge className={user?.verification_status === 'Verified' ? 'bg-emerald-600' : 'bg-amber-500'}>
                {user?.verification_status === 'Verified' ? 'Verified Resident' : 'Pending Verification'}
              </Badge>
            </div>
          </div>

          {/* Editable Field 1: Contact Number */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Phone size={13} className="text-teal-600" />
              Contact Number (Mobile Phone)
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 09171234567"
              className="h-9 text-xs"
              required
            />
            <p className="text-[10px] text-slate-400">Used for SMS health reminders and clearance ready alerts.</p>
          </div>

          {/* Editable Field 2: Change Password */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <KeyRound size={14} className="text-teal-600" />
              Change Password (Optional)
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="h-9 text-xs"
              />
            </div>

            {newPassword && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="h-9 text-xs"
                  required={!!newPassword}
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              {loading ? 'Saving Changes...' : 'Save Settings'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
