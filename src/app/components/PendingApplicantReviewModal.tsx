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
  RotateCcw
} from 'lucide-react';
import { PendingResident } from '../../services/api';

interface PendingApplicantReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: PendingResident | null;
  onApprove: (id: number) => void;
  onRejectWithReason: (id: number, reason: string) => void;
  onPurge?: (id: number) => void;
  approving?: boolean;
}

const COMMON_REASONS = [
  'Invalid / Blurry ID Photo – please provide a clearer copy',
  'Name discrepancy with PhilSys / Government ID',
  'Birthdate does not match registered record',
  'Address is outside Barangay jurisdiction',
  'Expired Government ID – please submit a valid unexpired ID',
  'Missing back photo of the Government ID'
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
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [customNotes, setCustomNotes] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);

  if (!applicant) return null;

  const fullName = applicant.name || `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() || 'Resident Applicant';

  const handleSendResubmitNotice = () => {
    const finalReason = customNotes.trim() ? `${selectedReason} (${customNotes.trim()})` : selectedReason;
    onRejectWithReason(applicant.id, finalReason);
    setShowResubmitPanel(false);
    onClose();
  };

  const handleApproveClick = () => {
    onApprove(applicant.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <UserCheck size={22} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Resident Applicant Review &amp; Verification
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Application ID: <span className="font-mono font-bold text-indigo-600">APP-#{applicant.id}</span> • Registered on {applicant.submitted_at ? new Date(applicant.submitted_at).toLocaleDateString() : 'Recent'}
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-amber-500 text-white text-xs px-2.5 py-0.5">
              {applicant.verification_status || 'Pending Review'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Demographic Information Grid */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
              <User size={14} className="text-indigo-600" />
              Applicant Personal &amp; Demographic Profile
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Full Name</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{fullName}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Date of Birth / Age</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {applicant.date_of_birth ? new Date(applicant.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not provided'}
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
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Residential Address</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <MapPin size={12} className="text-rose-600 shrink-0" />
                  {applicant.address || 'Barangay Pianing, Butuan City'}
                </span>
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
                <button
                  type="button"
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ZoomIn size={13} />
                  {isZoomed ? 'Standard View' : 'Enlarge / Zoom'}
                </button>
              )}
            </div>

            {applicant.submitted_id ? (
              <div className={`relative border border-slate-200 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center transition-all ${isZoomed ? 'h-96' : 'h-56'}`}>
                <img
                  src={applicant.submitted_id}
                  alt="Government ID"
                  className="max-h-full max-w-full object-contain cursor-pointer"
                  onClick={() => window.open(applicant.submitted_id!, '_blank')}
                  title="Click to view full original photo in new tab"
                />
                <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-xs">
                  Click image to open original
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

          {/* Resubmit / Rejection Reason Panel (Expandable) */}
          {showResubmitPanel && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5 text-xs">
                  <AlertTriangle size={14} className="text-amber-600" />
                  Select Reason for ID Correction / Resubmission
                </span>
                <button
                  type="button"
                  onClick={() => setShowResubmitPanel(false)}
                  className="text-amber-700 hover:text-amber-900 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-amber-800 font-semibold block">Quick Selection:</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {COMMON_REASONS.map(reason => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setSelectedReason(reason)}
                      className={`p-2 text-left rounded-lg text-xs border transition-all cursor-pointer ${
                        selectedReason === reason
                          ? 'bg-amber-100 border-amber-500 text-amber-950 font-bold shadow-2xs'
                          : 'bg-white/80 hover:bg-amber-100/50 border-amber-200 text-amber-900'
                      }`}
                    >
                      • {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-amber-900">Additional Instructions for Resident (Optional):</Label>
                <textarea
                  value={customNotes}
                  onChange={e => setCustomNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Please capture the ID under good lighting so the PhilSys barcode and birthdate are legible."
                  className="w-full mt-1 p-2 text-xs rounded-md border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowResubmitPanel(false)}
                  className="h-8 text-xs border-amber-300 text-amber-900"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendResubmitNotice}
                  className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send size={13} />
                  Send Resubmission Notice to Resident
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Buttons: Accept / Resubmit / Reject */}
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
              Request Resubmission / ID Correction
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
