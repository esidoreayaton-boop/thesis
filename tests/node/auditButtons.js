import fs from 'fs';
import path from 'path';

const files = [
  'src/app/pages/AdminDashboard.tsx',
  'src/app/pages/NurseDashboard.tsx',
  'src/app/pages/BhwDashboard.tsx',
  'src/app/pages/BarangayPortal.tsx',
  'src/app/pages/HealthCenterPortal.tsx',
  'src/app/pages/ResidentPortal.tsx',
  'src/app/pages/LoginPage.tsx',
  'src/app/pages/LandingPage.tsx',
  'src/app/components/PendingApplicantReviewModal.tsx',
  'src/app/components/ResidentProfileModal.tsx',
  'src/app/components/ProfileSettingsView.tsx',
  'src/app/components/PatientDetailModal.tsx',
  'src/app/components/SmartClinicalIntakeModal.tsx',
  'src/app/components/DocumentInfoModal.tsx',
  'src/app/components/DocumentPrintModal.tsx',
  'src/app/components/BatchSmsReminderModal.tsx',
  'src/app/components/SystemMessenger.tsx'
];

let totalButtons = 0;
let buttonsWithoutHandler = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  // Match <button or <Button tags (handling multiline attributes)
  const matches = [...content.matchAll(/<(?:button|Button)\b([^>]*?)(\/?>)/gs)];
  let fileTotal = 0;
  let fileWithout = 0;

  for (const m of matches) {
    fileTotal++;
    totalButtons++;
    const attrs = m[1];
    const hasClick = /onClick\s*=/.test(attrs);
    const hasSubmit = /type\s*=\s*['"]submit['"]/.test(attrs);
    const isAsChild = /asChild/.test(attrs);
    const hasForm = /form\s*=/.test(attrs);
    const hasDialogTrigger = /DialogTrigger/.test(attrs);

    // Check if the button tag is directly preceded by a DialogTrigger asChild
    const beforeSnippet = content.slice(Math.max(0, m.index - 120), m.index);
    const isInsideDialogTrigger = /<DialogTrigger[^>]*asChild[^>]*>\s*$/s.test(beforeSnippet);

    if (!hasClick && !hasSubmit && !isAsChild && !hasForm && !hasDialogTrigger && !isInsideDialogTrigger) {
      fileWithout++;
      buttonsWithoutHandler++;
      const snippet = m[0].replace(/\s+/g, ' ').substring(0, 100);
      console.log(`  [POTENTIAL DEAD BUTTON in ${path.basename(file)}]: ${snippet}`);
    }
  }
  console.log(`✓ ${path.basename(file)}: ${fileTotal} buttons audited (${fileWithout} unhandled)`);
}

console.log(`\nAudit Complete: Total ${totalButtons} buttons checked, ${buttonsWithoutHandler} unhandled.\n`);
