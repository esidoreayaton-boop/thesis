import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import {
  UserCheck,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  ZoomIn,
  Send,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
  RotateCw,
  Download,
  Maximize2
} from 'lucide-react';
import { PendingResident } from '../../services/api';
import ImageViewerModal from './ImageViewerModal';

interface PendingApplicantReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: PendingResident | null;
  onApprove: (id: number) => void;
  onRejectWithReason: (id: number, reason: string) => void;
  onPurge?: (id: number) => void;
  approving?: boolean;
}

const CORRECTION_OPTIONS = [
  {
    key: 'blurry_id',
    label: '📸 Blurry / Invalid ID Photo',
    description: 'ID photo is unclear, low resolution, or illegible',
    defaultMsg: 'Your submitted Government ID photo is blurry or illegible. Please retake the photo in good lighting and ensure the ID details (name, birthdate, ID number) are clearly readable.'
  },
  {
    key: 'name_mismatch',
    label: '🏷️ Name Mismatch',
    description: 'Name on ID does not match your registration',
    defaultMsg: 'The name on your submitted Government ID does not match the name you registered with. Please check that your First Name, Middle Name, and Last Name match your official government ID exactly.'
  },
  {
    key: 'birthday_mismatch',
    label: '🎂 Birthday Mismatch',
    description: 'Date of Birth does not match ID or records',
    defaultMsg: 'The Date of Birth you provided does not match your submitted Government ID. Please correct your birthdate to match your official ID or birth certificate.'
  },
  {
    key: 'address_issue',
    label: '📍 Address Outside Barangay',
    description: 'Registered address is outside our barangay',
    defaultMsg: 'Your registered address could not be verified as a resident of this barangay. Please ensure you are registering in the correct barangay, and bring proof of residency (utility bill, lease contract, or barangay certificate).'
  },
  {
    key: 'expired_id',
    label: '⌛ Expired Government ID',
    description: 'Submitted ID is expired or no longer valid',
    defaultMsg: 'The Government ID you submitted appears to be expired. Please resubmit using a currently valid government-issued ID (PhilSys, Passport, Driver\'s License, UMID, Voter\'s ID, etc.).'
  },
  {
    key: 'missing_back',
    label: '📋 Incomplete ID (Missing Back)',
    description: 'Back side of the ID was not submitted',
    defaultMsg: 'The back side of your Government ID is missing. Please resubmit showing both the front and back of your ID in a single clear photo.'
  },
  {
    key: 'wrong_id_type',
    label: '🪪 Invalid ID Type',
    description: 'Submitted ID is not an accepted government ID',
    defaultMsg: 'The document you submitted is not an accepted Government ID. Please use a PhilSys National ID, Passport, Driver\'s License, UMID, SSS ID, Voter\'s ID, or PRC ID.'
  },
  {
    key: 'gender_mismatch',
    label: '⚥ Gender Discrepancy',
    description: 'Gender on record does not match ID',
    defaultMsg: 'The gender listed in your registration does not match your submitted Government ID. Please correct this before resubmitting.'
  },
  {
    key: 'custom',
    label: '✏️ Custom / Other Reason',
    description: 'Specify a specific or unique issue',
    defaultMsg: ''
  }
];

export default function PendingApplicantReviewModal({
  isOpen,
  onClose,
  applicant,
  onApprove,
  onRejectWithReason,
  onPurge,
  approving = false
}: PendingApplicantReviewModalProps) {
  const [showResubmitPanel, setShowResubmitPanel] = useState(false);
  const [selectedReasonKey, setSelectedReasonKey] = useState('blurry_id');
  const [customMessage, setCustomMessage] = useState(CORRECTION_OPTIONS[0].defaultMsg);
  const [isZoomed, setIsZoomed] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  if (!applicant) return null;

  const fullName = applicant.name || `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() || 'Resident Applicant';
  const selectedOption = CORRECTION_OPTIONS.find(o => o.key === selectedReasonKey) || CORRECTION_OPTIONS[0];

  const handleReasonSelect = (key: string) => {
    setSelectedReasonKey(key);
    const opt = CORRECTION_OPTIONS.find(o => o.key === key);
    if (opt && opt.defaultMsg) {
      setCustomMessage(opt.defaultMsg);
    } else {
      setCustomMessage('');
    }
  };

  const handleSendResubmitNotice = () => {
    if (!customMessage.trim()) return;
    onRejectWithReason(applicant.id, customMessage.trim());
    setShowResubmitPanel(false);
    onClose();
  };

  const handleApproveClick = () => {
    onApprove(applicant.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 w-[96vw] max-w-7xl h-[92vh] max-h-[95vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 rounded-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <UserCheck size={22} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Resident Applicant Review & Verification
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Application ID: <span className="font-mono font-bold text-indigo-600">APP-#{applicant.id}</span> • Registered on {applicant.submitted_at ? new Date(applicant.submitted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recent'}
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-amber-500 text-white text-xs px-2.5 py-0.5 shrink-0">
              {applicant.verification_status || 'Pending Review'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Demographic Information Grid */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
              <User size={14} className="text-indigo-600" />
              Applicant Personal & Demographic Profile
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Full Name</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{fullName}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Date of Birth</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Calendar size={12} className="text-indigo-500" />
                  {applicant.date_of_birth ? new Date(applicant.date_of_birth).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Mobile Number</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Phone size={12} className="text-emerald-600" />
                  {applicant.phone || 'No mobile provided'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Email Address</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Mail size={12} className="text-blue-600" />
                  {applicant.email || 'No email'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Residential Address</span>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-md font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                    <MapPin size={11} className="text-rose-500" />
                    {applicant.address ? applicant.address.split(',')[0].trim() : 'Purok 1'}
                  </span>
                  <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-md font-semibold border border-emerald-200 dark:border-emerald-800/60">
                    Barangay Pianing
                  </span>
                  <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-md font-semibold border border-blue-200 dark:border-blue-800/60">
                    Butuan City
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submitted Government ID Inspection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText size={14} className="text-indigo-600" />
                Submitted Government Identification Document
              </Label>
              {applicant.submitted_id && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="text-[11px] text-slate-600 hover:text-indigo-600 font-semibold flex items-center gap-1 cursor-pointer bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded"
                    title="Rotate image 90 degrees"
                  >
                    <RotateCw size={12} />
                    Rotate
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsZoomed(!isZoomed)}
                    className="text-[11px] text-slate-600 hover:text-indigo-600 font-semibold flex items-center gap-1 cursor-pointer bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded"
                  >
                    <ZoomIn size={12} />
                    {isZoomed ? 'Standard' : 'Enlarge'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsViewerOpen(true)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded border border-indigo-200"
                  >
                    <Maximize2 size={12} />
                    Full Screen / Tools
                  </button>
                </div>
              )}
            </div>

            {applicant.submitted_id ? (
              <div className={`relative border border-slate-200 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center transition-all ${isZoomed ? 'h-96' : 'h-64'}`}>
                <img
                  src={applicant.submitted_id}
                  alt="Government ID"
                  style={{ transform: `rotate(${rotation}deg)` }}
                  className="max-h-full max-w-full object-contain cursor-pointer transition-transform duration-200"
                  onClick={() => setIsViewerOpen(true)}
                  title="Click to open interactive full-screen viewer"
                />
                <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1">
                  <Maximize2 size={10} /> Click to inspect with zoom & rotate tools
                </span>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-slate-400 space-y-1">
                <AlertTriangle size={24} className="mx-auto text-amber-500 opacity-80" />
                <p className="font-semibold text-slate-600">No ID photo uploaded</p>
                <p className="text-[11px]">The resident registered without attaching a digital copy of their ID.</p>
              </div>
            )}
          </div>

          <ImageViewerModal
            isOpen={isViewerOpen}
            onClose={() => setIsViewerOpen(false)}
            imageUrl={applicant.submitted_id || null}
            title={`Government ID — ${applicant.name}`}
            subtitle={`Verification Review for ${applicant.email} • Barangay ${applicant.barangay || 'Pianing'}`}
            fileName={`${applicant.name.replace(/\s+/g, '-').toLowerCase()}-submitted-id.png`}
          />

          {/* Resubmit / Correction Notice Panel */}
          {showResubmitPanel && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Panel Header */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5 text-xs">
                  <AlertTriangle size={14} className="text-amber-600" />
                  Request ID Correction / Resubmission
                </span>
                <button
                  type="button"
                  onClick={() => setShowResubmitPanel(false)}
                  className="text-amber-700 hover:text-amber-900 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {/* Correction Reason Grid */}
              <div>
                <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold block mb-2">
                  Select Correction Reason (Required):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {CORRECTION_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleReasonSelect(opt.key)}
                      className={`p-2.5 text-left rounded-lg border transition-all cursor-pointer group ${
                        selectedReasonKey === opt.key
                          ? 'bg-amber-100 border-amber-500 text-amber-950 dark:bg-amber-900/50 dark:border-amber-500 dark:text-amber-100 shadow-sm'
                          : 'bg-white/80 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200 dark:border-slate-700 text-amber-900 dark:text-slate-300'
                      }`}
                    >
                      <div className="font-semibold text-xs leading-tight">{opt.label}</div>
                      <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 opacity-80">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Message Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                    <Info size={12} />
                    Message to Resident <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[10px] text-amber-700 font-mono">{customMessage.length} chars</span>
                </div>
                <textarea
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  rows={4}
                  required
                  placeholder={selectedReasonKey === 'custom'
                    ? 'Describe the specific issue and what the resident needs to correct or resubmit...'
                    : 'Edit or add additional instructions for the resident...'}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none leading-relaxed"
                />
                <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                  This message will be shown on the resident's portal and notification center.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-1 border-t border-amber-200 dark:border-amber-800">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowResubmitPanel(false)}
                  className="h-8 text-xs border-amber-300 text-amber-900 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!customMessage.trim()}
                  onClick={handleSendResubmitNotice}
                  className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Send size={13} />
                  Send Correction Notice
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Action Buttons */}
        {!showResubmitPanel && (
          <DialogFooter className="gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            {onPurge && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm(`Permanently remove applicant account for ${fullName}?`)) {
                    onPurge(applicant.id);
                    onClose();
                  }
                }}
                className="text-red-600 hover:bg-red-50 text-xs mr-auto cursor-pointer"
                title="Delete fake / spam registration"
              >
                <XCircle size={14} className="mr-1" />
                Purge Account
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowResubmitPanel(true)}
              className="text-xs border-amber-300 hover:bg-amber-50 text-amber-800 font-semibold gap-1.5 cursor-pointer"
            >
              <RotateCcw size={14} className="text-amber-600" />
              Request Correction
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={approving}
              onClick={handleApproveClick}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm cursor-pointer"
            >
              <CheckCircle2 size={14} />
              {approving ? 'Verifying...' : 'Accept & Verify Account'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
