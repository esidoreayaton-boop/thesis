/**
 * Exports JSON array data into downloadable CSV format
 */
export function exportToCsv(filename: string, rows: object[]) {
  if (!rows || !rows.length) {
    alert('No data available to export');
    return;
  }

  const separator = ',';
  const keys = Object.keys(rows[0]);
  
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map(row => {
        return keys
          .map(k => {
            let cell = (row as any)[k] === null || (row as any)[k] === undefined ? '' : (row as any)[k];
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Opens a clean, official printable report window formatted for Barangay Pianing, Butuan City
 */
export function printOfficialReport({
  title,
  subtitle,
  department = 'Office of the Barangay Captain',
  preparedBy = 'Admin Juan Dela Cruz',
  preparedByTitle = 'Barangay Administrator',
  stats = [],
  tables = []
}: {
  title: string;
  subtitle: string;
  department?: string;
  preparedBy?: string;
  preparedByTitle?: string;
  stats?: { label: string; value: string | number; color?: string }[];
  tables?: { title: string; headers: string[]; rows: (string | number)[][] }[];
}) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate printable reports.');
    return;
  }

  const statsHtml = stats.length > 0 ? `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 25px;">
      ${stats.map(s => `
        <div style="border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 9pt; color: #64748b; text-transform: uppercase; font-weight: 600;">${s.label}</div>
          <div style="font-size: 18pt; font-weight: bold; color: ${s.color || '#1e3a8a'}; margin-top: 4px;">${s.value}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const tablesHtml = tables.map(t => `
    <div style="margin-bottom: 30px;">
      <h3 style="font-size: 12pt; font-weight: bold; color: #0f172a; text-transform: uppercase; border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; margin-bottom: 10px;">
        ${t.title}
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 10pt; text-align: left;">
        <thead>
          <tr style="background: #f1f5f9; border-bottom: 2px solid #94a3b8;">
            ${t.headers.map(h => `<th style="padding: 8px 10px; font-weight: bold; color: #1e293b;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${t.rows.length === 0 ? `
            <tr><td colspan="${t.headers.length}" style="text-align: center; padding: 15px; color: #94a3b8;">No records found.</td></tr>
          ` : t.rows.map((row, i) => `
            <tr style="border-bottom: 1px solid #e2e8f0; ${i % 2 === 1 ? 'background: #f8fafc;' : ''}">
              ${row.map(cell => `<td style="padding: 7px 10px; color: #334155;">${cell}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - Barangay Pianing, Butuan City</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 15px; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .header h4 { margin: 0; font-size: 10pt; text-transform: uppercase; font-weight: normal; color: #475569; letter-spacing: 1px; }
          .header h3 { margin: 2px 0; font-size: 11pt; font-weight: 600; color: #334155; }
          .header h2 { margin: 4px 0; font-size: 13pt; font-weight: bold; color: #0f172a; text-transform: uppercase; }
          .header h1 { margin: 6px 0 0 0; font-size: 20pt; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; color: #1e3a8a; }
          .header p { margin: 3px 0 0 0; font-size: 9pt; color: #64748b; }
          .report-meta { display: flex; justify-content: space-between; font-size: 9pt; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; margin-bottom: 20px; }
          .signatures { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
          .sig-block { text-align: center; width: 220px; }
          .sig-line { border-top: 1px solid #0f172a; margin-top: 40px; padding-top: 4px; font-weight: bold; font-size: 10pt; text-transform: uppercase; }
          .sig-title { font-size: 9pt; color: #64748b; font-style: italic; }
          .seal { width: 80px; height: 80px; border-radius: 50%; border: 2px double #1e3a8a; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7pt; font-weight: bold; color: #1e3a8a; margin: 0 auto; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header">
          <h4>Republic of the Philippines</h4>
          <h3>Province of Agusan del Norte • City of Butuan</h3>
          <h2>${department}</h2>
          <h1>BARANGAY PIANING</h1>
          <p>Barangay Pianing, Butuan City, Agusan del Norte, Philippines 8600</p>
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 16pt; font-weight: bold; text-transform: uppercase; color: #0f172a; margin: 0;">${title}</h2>
          <p style="font-size: 10pt; color: #64748b; margin: 4px 0 0 0;">${subtitle}</p>
        </div>

        <div class="report-meta">
          <div><strong>Generated On:</strong> ${new Date().toLocaleString()}</div>
          <div><strong>Prepared By:</strong> ${preparedBy} (${preparedByTitle})</div>
          <div><strong>Status:</strong> Official Confidential Report</div>
        </div>

        ${statsHtml}
        ${tablesHtml}

        <div class="signatures">
          <div class="seal">
            OFFICIAL SEAL<br/>BARANGAY PIANING<br/>BUTUAN CITY
          </div>
          <div class="sig-block">
            <div class="sig-line">${preparedBy}</div>
            <div class="sig-title">${preparedByTitle}</div>
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
}
