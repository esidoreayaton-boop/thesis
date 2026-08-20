import { useRef } from 'react';
import { Printer, Download, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { DocumentRequest } from '../../services/api';

interface DocumentPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRequest | null;
}

export default function DocumentPrintModal({ isOpen, onClose, document }: DocumentPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!document) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print documents.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${document.document_type} - ${document.resident_name}</title>
          <style>
            @page { size: A4 portrait; margin: 20mm; }
            body { font-family: 'Times New Roman', serif; color: #1e293b; padding: 20px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 30px; }
            .header h3 { margin: 0; font-size: 13pt; text-transform: uppercase; font-weight: normal; color: #475569; }
            .header h2 { margin: 4px 0; font-size: 16pt; font-weight: bold; color: #0f172a; }
            .header h1 { margin: 8px 0 0 0; font-size: 24pt; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #1e3a8a; }
            .header p { margin: 4px 0 0 0; font-size: 10pt; color: #64748b; font-style: italic; }
            .doc-title { text-align: center; font-size: 22pt; font-weight: bold; text-transform: uppercase; text-decoration: underline; margin: 35px 0 25px 0; color: #0f172a; letter-spacing: 1.5px; }
            .content { font-size: 13pt; text-align: justify; text-indent: 40px; margin-bottom: 22px; line-height: 1.8; }
            .meta-box { border: 1px solid #cbd5e1; background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0 30px 0; font-size: 11pt; font-family: sans-serif; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .signatures { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
            .sig-block { text-align: center; width: 220px; }
            .sig-line { border-top: 1px solid #0f172a; margin-top: 45px; padding-top: 5px; font-weight: bold; font-size: 12pt; text-transform: uppercase; }
            .sig-title { font-size: 10pt; color: #64748b; font-style: italic; }
            .watermark { position: absolute; top: 35%; left: 10%; opacity: 0.04; transform: rotate(-30deg); font-size: 65pt; font-weight: bold; text-transform: uppercase; pointer-events: none; }
            .seal { width: 95px; height: 95px; border-radius: 50%; border: 3px double #1e3a8a; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 8pt; font-weight: bold; color: #1e3a8a; margin: 0 auto; text-transform: uppercase; padding: 5px; }
          </style>
        </head>
        <body>
          <div class="watermark">BARANGAY PIANING</div>
          <div class="header">
            <h3>Republic of the Philippines</h3>
            <h3>Province of Agusan del Norte • City of Butuan</h3>
            <h2>OFFICE OF THE BARANGAY CAPTAIN</h2>
            <h1>BARANGAY PIANING</h1>
            <p>Barangay Pianing, Butuan City, Agusan del Norte, Philippines 8600</p>
          </div>

          <div class="doc-title">${document.document_type}</div>

          <p class="content">
            <strong>TO WHOM IT MAY CONCERN:</strong>
          </p>

          <p class="content">
            This is to certify that <strong>${document.resident_name.toUpperCase()}</strong>, of legal age, Filipino citizen, is a bonafide resident of <strong>Barangay Pianing, Butuan City</strong>, with registered residential address on record in the barangay database.
          </p>

          <p class="content">
            This certification / clearance is issued upon the request of the above-named individual for the purpose of: <strong>${document.purpose || 'Official Documentation & Requirements'}</strong>.
          </p>

          <p class="content">
            Based on existing barangay records and administrative verification, the named applicant is known to be a person of good moral character and has no derogatory record or pending criminal case filed against them in this barangay office.
          </p>

          <p class="content">
            GIVEN this <strong>${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> at the Barangay Hall of Barangay Pianing, Butuan City.
          </p>

          <div class="meta-box">
            <div class="meta-row"><span><strong>Control Request Code:</strong> ${document.request_code}</span><span><strong>Status:</strong> ${document.status}</span></div>
            <div class="meta-row"><span><strong>Issued By:</strong> ${document.processed_by || 'Hon. Punong Barangay'}</span><span><strong>Date Processed:</strong> ${document.processed_at || new Date().toLocaleDateString()}</span></div>
          </div>

          <div class="signatures">
            <div class="seal">
              OFFICIAL SEAL<br/>BARANGAY<br/>PIANING<br/>BUTUAN CITY
            </div>
            <div class="sig-block">
              <div style="font-weight: bold; text-transform: uppercase;">Ana Reyes</div>
              <div class="sig-title">Barangay Secretary</div>
            </div>
            <div class="sig-block">
              <div class="sig-line">HON. CAPTAIN JUAN DELA CRUZ</div>
              <div class="sig-title">Punong Barangay / Captain</div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleDownloadTxt = () => {
    const textContent = `
=========================================================
REPUBLIC OF THE PHILIPPINES
PROVINCE OF AGUSAN DEL NORTE • CITY OF BUTUAN
OFFICE OF THE BARANGAY CAPTAIN - BARANGAY PIANING
Barangay Pianing, Butuan City, Agusan del Norte, 8600
=========================================================

DOCUMENT TYPE: ${document.document_type}
CONTROL CODE: ${document.request_code}
RESIDENT APPLICANT: ${document.resident_name}
ADDRESS: Barangay Pianing, Butuan City, Agusan del Norte
PURPOSE: ${document.purpose || 'Official Documentation'}
STATUS: ${document.status}
ISSUED DATE: ${new Date().toLocaleDateString()}
PROCESSED BY: ${document.processed_by || 'Barangay Office'}

This serves as an official electronic copy of the requested ${document.document_type}.
Verify authenticity at the Barangay Pianing Office, Butuan City.
=========================================================
`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.request_code}_${document.document_type.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader className="flex flex-row justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2">
            <Shield className="text-indigo-600" size={24} />
            <div>
              <DialogTitle className="text-lg font-bold">Official Barangay Document Preview</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">Barangay Pianing, Butuan City — Ready for Printing or Digital Export</DialogDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownloadTxt} variant="outline" size="sm" className="gap-1 text-xs">
              <Download size={14} /> Download File
            </Button>
            <Button onClick={handlePrint} size="sm" className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              <Printer size={14} /> Print Official Copy
            </Button>
          </div>
        </DialogHeader>

        {/* Certificate Display Area */}
        <div ref={printRef} className="bg-white text-slate-900 p-8 rounded-xl shadow-md border border-slate-200 my-4 relative font-serif leading-relaxed">
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <p className="text-xs uppercase tracking-wider text-slate-600 font-sans">Republic of the Philippines</p>
            <p className="text-xs uppercase tracking-wider text-slate-600 font-sans">Province of Agusan del Norte • City of Butuan</p>
            <h3 className="text-sm font-bold text-slate-800 font-sans uppercase mt-1">OFFICE OF THE BARANGAY CAPTAIN</h3>
            <h1 className="text-2xl font-black text-indigo-950 font-sans uppercase tracking-widest mt-1">BARANGAY PIANING</h1>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">Barangay Pianing, Butuan City, Agusan del Norte, Philippines 8600</p>
          </div>

          <div className="text-center my-6">
            <h2 className="text-xl font-bold uppercase underline tracking-wider text-slate-900">{document.document_type}</h2>
            <p className="text-xs font-mono text-indigo-600 mt-1">Control Code: {document.request_code}</p>
          </div>

          <div className="space-y-4 text-sm text-justify">
            <p><strong>TO WHOM IT MAY CONCERN:</strong></p>
            <p className="indent-8">
              THIS IS TO CERTIFY that <strong>{document.resident_name.toUpperCase()}</strong>, of legal age, Filipino citizen, is an official resident of <strong>Barangay Pianing, Butuan City</strong>, with records registered in this office.
            </p>
            <p className="indent-8">
              This certification / clearance is issued upon the request of the interested party for the following purpose: <strong>{document.purpose || 'Official Documentation Requirements'}</strong>.
            </p>
            <p className="indent-8">
              Based on official barangay records, the aforementioned applicant is known to be of good moral character and has no adverse or criminal case recorded in this office.
            </p>
            <p className="indent-8">
              GIVEN this <strong>{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> at the Barangay Hall of Barangay Pianing, Butuan City.
            </p>
          </div>

          <div className="mt-8 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-sans space-y-1">
            <div className="flex justify-between">
              <span><strong>Status:</strong> <span className="text-emerald-700 font-semibold">{document.status}</span></span>
              <span><strong>Processed By:</strong> {document.processed_by || 'Admin Juan Dela Cruz'}</span>
            </div>
          </div>

          <div className="mt-12 flex justify-between items-end text-xs font-sans pt-4 border-t border-slate-200">
            <div className="text-center w-28 p-2 border-2 border-dashed border-indigo-300 rounded-full text-[10px] text-indigo-900 font-bold uppercase">
              Official<br/>Barangay Seal<br/>Pianing, Butuan
            </div>
            <div className="text-center">
              <p className="font-bold uppercase">Ana Reyes</p>
              <p className="text-slate-500 text-[11px] italic">Barangay Secretary</p>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-900 pt-1 font-bold uppercase">HON. JUAN DELA CRUZ</div>
              <p className="text-slate-500 text-[11px] italic">Punong Barangay / Captain</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
