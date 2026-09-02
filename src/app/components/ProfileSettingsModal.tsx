import React, { useState, useEffect, useRef } from 'react';
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
import { User, Phone, Lock, MapPin, Mail, Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle, Calendar, Upload, FileText, ImageIcon, X } from 'lucide-react';
import { apiService } from '../../services/api';
import { validatePasswordComplexity } from '../../utils/passwordValidation';
import { BUTUAN_BARANGAYS } from '../../utils/barangays';
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
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [civilStatus, setCivilStatus] = useState<'Single' | 'Married' | 'Widowed' | 'Separated'>('Single');
  const [phone, setPhone] = useState('');
  const [purok, setPurok] = useState('Purok 1');
  const [residentBarangay, setResidentBarangay] = useState('Pianing');
  const [address, setAddress] = useState('');
  const [residencyYears, setResidencyYears] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [newIdPreview, setNewIdPreview] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Helper to calculate age from birth date string
  const calculateAge = (dobStr?: string, ageNum?: number | string): string => {
    if (ageNum !== undefined && ageNum !== null && ageNum !== '' && !isNaN(Number(ageNum))) {
      return `${ageNum} years old`;
    }
    if (!dobStr) return '—';
    try {
      const dob = new Date(dobStr);
      if (isNaN(dob.getTime())) return '—';
      const diff = Date.now() - dob.getTime();
      const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      return isNaN(age) || age < 0 ? '—' : `${age} years old`;
    } catch {
      return '—';
    }
  };

  // Track previous open state so we only reset fields when modal transitions closed → open
  const wasOpenRef = React.useRef(false);

  // Reload fields from user object only when the modal opens (not on every user prop update)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current && user) {
      const uFirst = user.first_name || (user.name ? user.name.split(' ')[0] : '') || '';
      const uLast = user.last_name || (user.name ? user.name.split(' ').slice(1).join(' ') : '') || '';
      const uMiddle = user.middle_name || '';
      setFirstName(uFirst);
      setMiddleName(uMiddle);
      setLastName(uLast);
      setDateOfBirth(user.date_of_birth || user.birth_date || user.birthdate || '');
      setGender(user.gender === 'Female' ? 'Female' : 'Male');
      setCivilStatus((user.civil_status || user.civilStatus || 'Single') as 'Single' | 'Married' | 'Widowed' | 'Separated');
      setPhone(user.phone || '');
      const rawAddress = user.address || '';
      const rawPurok = user.purok || (rawAddress ? rawAddress.split(',')[0].trim() : 'Purok 1');
      const rawBrgy = user.barangay || 'Pianing';
      setPurok(rawPurok);
      setResidentBarangay(rawBrgy);
      setAddress(rawAddress || `${rawPurok}, Barangay ${rawBrgy}, Butuan City`);
      setResidencyYears(user.years_of_residency || user.residency_years || '');
      setSubmittedId(user.submitted_id || null);
      setNewIdPreview(null);
      setPhotoRemoved(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, or PDF scan).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setNewIdPreview(base64);
      setSubmittedId(base64);
      setPhotoRemoved(false);
      toast.success('ID photo selected! Save your profile to submit it for re-verification.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setSubmittedId(null);
    setNewIdPreview(null);
    setPhotoRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.info('ID photo removed. Click "Save Changes" to apply.');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!lastName.trim()) {
      toast.error('Last name is required');
      return;
    }

    // Validate phone format — strictly 09XXXXXXXXX (11 digits)
    const cleanPhone = phone.replace(/\s+/g, '');
    if (!cleanPhone) {
      toast.error('Contact Number is required.');
      return;
    }
    if (!/^09\d{9}$/.test(cleanPhone)) {
      toast.error('Invalid contact number format', {
        description: 'Must be exactly 11 digits starting with 09 (e.g. 09171234567)'
      });
      return;
    }

    // Password change requires current password
    if (newPassword) {
      if (!currentPassword) {
        toast.error('Current password required', {
          description: 'You must enter your current password to set a new one.'
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('Passwords do not match', {
          description: 'Please ensure both new password fields are identical.'
        });
        return;
      }
      const passCheck = validatePasswordComplexity(newPassword);
      if (!passCheck.isValid) {
        toast.error('New password does not meet security requirements', {
          description: passCheck.error || 'Must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.'
        });
        return;
      }
    }

    const cleanFirst = firstName.trim();
    const cleanMiddle = middleName.trim();
    const cleanLast = lastName.trim();
    const computedFullName = `${cleanFirst} ${cleanMiddle ? cleanMiddle + ' ' : ''}${cleanLast}`.trim();
    const calculatedNumericAge = dateOfBirth ? (() => {
      try {
        const d = new Date(dateOfBirth);
        if (!isNaN(d.getTime())) {
          return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        }
      } catch {}
      return undefined;
    })() : undefined;

    setLoading(true);
    try {
      // If changing password, verify current password first via login
      if (newPassword && currentPassword) {
        const verifyRes = await apiService.login(user.email, currentPassword);
        if (!verifyRes?.success) {
          toast.error('Incorrect current password', {
            description: 'The current password you entered does not match our records.'
          });
          setLoading(false);
          return;
        }
      }

      const finalAddress = `${purok.trim() || 'Purok 1'}, Barangay ${residentBarangay.trim()}, Butuan City`;

      // If a new ID is uploaded or updated, also send resubmit verification
      if (newIdPreview) {
        try {
          await apiService.resubmitVerification({
            email: user?.email,
            id: user?.id,
            submitted_id: newIdPreview,
            first_name: cleanFirst,
            middle_name: cleanMiddle,
            last_name: cleanLast,
            address: finalAddress,
            phone: cleanPhone
          });
        } catch (resubmitErr) {
          console.warn('Resubmit ID error:', resubmitErr);
        }
      }

      const finalSubmittedId = photoRemoved && !newIdPreview ? null : (submittedId || user?.submitted_id || null);

      // Build payload — only include submitted_id when it has actually changed
      const idChanged = newIdPreview !== null || photoRemoved;
      const profilePayload: any = {
        id: user?.id,
        email: user?.email,
        name: computedFullName,
        first_name: cleanFirst,
        middle_name: cleanMiddle,
        last_name: cleanLast,
        date_of_birth: dateOfBirth || undefined,
        gender: gender || 'Male',
        civil_status: civilStatus || 'Single',
        phone: cleanPhone || undefined,
        address: finalAddress,
        barangay: residentBarangay.trim(),
        password: newPassword || undefined,
      };
      // Only touch submitted_id on the backend when user explicitly changed it
      if (idChanged) {
        profilePayload.submitted_id = finalSubmittedId;
      }
      await apiService.updateProfile(profilePayload);

      const updatedUser = {
        ...user,
        name: computedFullName,
        first_name: cleanFirst,
        middle_name: cleanMiddle,
        last_name: cleanLast,
        date_of_birth: dateOfBirth,
        gender: gender || 'Male',
        civil_status: civilStatus || 'Single',
        age: calculatedNumericAge !== undefined ? calculatedNumericAge : user?.age,
        phone: cleanPhone,
        address: finalAddress,
        purok: purok.trim() || 'Purok 1',
        barangay: residentBarangay.trim(),
        city: 'Butuan City',
        // Always preserve submitted_id; only override when explicitly changed
        submitted_id: idChanged ? finalSubmittedId : (user?.submitted_id ?? null),
        years_of_residency: residencyYears.trim(),
        verification_status: idChanged
          ? 'Pending_Review'
          : user?.verification_status
      };

      localStorage.setItem('barangay_user', JSON.stringify(updatedUser));
      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }

      toast.success('Profile updated successfully!', {
        description: newIdPreview
          ? 'Details saved and updated Government ID submitted for Barangay verification.'
          : newPassword
          ? 'Name, birthday, contact, address, and password saved.'
          : 'Name, birthday, contact number, and address saved.'
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

  const RequiredStar = () => <span className="text-red-500 ml-0.5">*</span>;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white text-base font-bold">
            <User className="text-teal-600" size={20} />
            Profile Settings
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Update your contact details, birthday, and password. Email cannot be changed here.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-1">

          {/* Account Status Badge */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Mail size={13} />
              {user?.email || 'N/A'}
            </div>
            <Badge className={user?.verification_status === 'Verified' ? 'bg-emerald-600 text-[10px]' : 'bg-amber-500 text-[10px]'}>
              {user?.verification_status === 'Verified' ? (
                <><CheckCircle2 size={10} className="mr-1" />Verified</>
              ) : (
                <><AlertCircle size={10} className="mr-1" />Pending</>
              )}
            </Badge>
          </div>

          {/* Editable: First Name, Middle Name, Last Name */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <User size={13} className="text-teal-600" />
                  First Name <RequiredStar />
                </Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Juan"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Middle Name
                </Label>
                <Input
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="e.g. Santos"
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <User size={13} className="text-teal-600" />
                Last Name <RequiredStar />
              </Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Dela Cruz"
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Editable: Date of Birth, Live Calculated Age, and Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar size={13} className="text-teal-600" />
                Date of Birth <RequiredStar />
              </Label>
              <Input
                type="date"
                value={dateOfBirth ? dateOfBirth.split('T')[0] : ''}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Age
              </Label>
              <div className="h-9 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                <User size={13} />
                {calculateAge(dateOfBirth, user?.age)}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Gender <RequiredStar />
              </Label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                className="w-full h-9 px-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          {/* Civil Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Civil Status <RequiredStar />
            </Label>
            <select
              value={civilStatus}
              onChange={(e) => setCivilStatus(e.target.value as 'Single' | 'Married' | 'Widowed' | 'Separated')}
              className="w-full h-9 px-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Widowed">Widowed</option>
              <option value="Separated">Separated</option>
            </select>
          </div>

          {/* Editable: Contact Number */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Phone size={13} className="text-teal-600" />
              Contact Number <RequiredStar />
            </Label>
            <Input
              value={phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                setPhone(digits);
              }}
              placeholder="09XXXXXXXXX (11 digits)"
              className="h-9 text-xs font-mono"
              maxLength={11}
              inputMode="numeric"
              pattern="09[0-9]{9}"
              title="Must be an 11-digit PH mobile number starting with 09"
              required
            />
            <p className="text-[10px] text-slate-400">PH format: 09XXXXXXXXX (11 digits). Used for SMS alerts &amp; official updates.</p>
          </div>

          {/* Separated Address: Purok, Barangay, City */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin size={13} className="text-teal-600" />
              Residential Address <RequiredStar />
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">Purok / Street <RequiredStar /></span>
                <Input
                  value={purok}
                  onChange={(e) => setPurok(e.target.value)}
                  placeholder="e.g. Purok 1"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">Barangay</span>
                <div className="h-9 px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center select-none shadow-xs">
                  Barangay {residentBarangay || 'Pianing'}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">City / Municipality</span>
                <div className="h-9 px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center select-none shadow-xs">
                  Butuan City
                </div>
              </div>
            </div>
          </div>

          {/* Editable: Years of Residency in Barangay */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin size={13} className="text-teal-600" />
              Years of Residency in Barangay
              <span className="font-normal text-[10px] text-slate-400">(for Certificate of Residency)</span>
            </Label>
            <Input
              value={residencyYears}
              onChange={(e) => setResidencyYears(e.target.value)}
              placeholder="e.g. 5 years   or   since 2019"
              className="h-9 text-xs"
            />
          </div>

          {/* Identification Document & Verification Upload Section */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileText size={14} className="text-teal-600" />
                Government ID / Verification Document
              </Label>
              {user?.verification_status === 'Verified' ? (
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold">Verified</Badge>
              ) : user?.verification_status === 'Rejected' ? (
                <Badge className="bg-red-100 text-red-800 text-[10px] font-semibold">Rejected / Resubmission Required</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 text-[10px] font-semibold">Review Needed</Badge>
              )}
            </div>

            {/* Persistent Resubmit ID Warning for Rejected / Needs_Resubmission */}
            {user?.verification_status === 'Rejected' && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="text-red-600 shrink-0" />
                  <span className="font-bold text-xs text-red-900 dark:text-red-200">ID Verification Rejected</span>
                </div>
                <p className="text-[11px] text-red-800 dark:text-red-300 leading-relaxed">
                  <strong>Reason:</strong> {user?.rejection_reason || 'Submitted ID photo was unclear or illegible.'}
                </p>
                <p className="text-[11px] text-red-700 dark:text-red-400 font-medium">
                  Please contact the Barangay Office or use the official ID resubmission form if required.
                </p>
              </div>
            )}
            
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Submitted Philippine Government ID on record.
              </p>

              {/* Display-Only ID Image with X button to remove */}
              {(!photoRemoved && (newIdPreview || submittedId)) ? (
                <div className="relative border border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden max-h-56 bg-slate-950 flex items-center justify-center p-2 shadow-inner group">
                  <img
                    src={newIdPreview || submittedId || ''}
                    alt="Submitted Government ID"
                    className="max-h-52 object-contain rounded-lg shadow-sm"
                  />
                  {/* Top-Right X Button to remove photo */}
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-2.5 right-2.5 w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105"
                    title="Remove Government ID"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="py-6 px-4 text-center border border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 bg-white dark:bg-slate-900/40 rounded-xl cursor-pointer transition-all group"
                >
                  <Upload size={24} className="mx-auto mb-1.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600">Click to upload valid Government ID</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, or JPEG up to 5MB for verification</p>
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

          {/* Divider: Password Change */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <KeyRound size={14} className="text-teal-600" />
              Change Password <span className="font-normal text-slate-400">(optional)</span>
            </div>

            {/* Current Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Lock size={12} className="text-slate-400" /> Current Password
              </Label>
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="h-9 text-xs pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">New Password</Label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="h-9 text-xs pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password - only show when typing new password */}
            {newPassword && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className={`h-9 text-xs pr-9 ${confirmPassword && confirmPassword !== newPassword ? 'border-red-400 focus:ring-red-400' : ''}`}
                    required={!!newPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle size={10} /> Passwords do not match</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 gap-2">
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
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
