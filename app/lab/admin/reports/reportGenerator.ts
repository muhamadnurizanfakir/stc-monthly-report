import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TestResult {
  parameter_name: string;
  unit: string | null;
  measured_value: string | null;
  specification: string | null;
  result: string;
  remarks: string | null;
}

interface TestExecution {
  test_number: string;
  test_name: string;
  test_type: string;
  status: string;
  equipment_used: string | null;
  test_conditions: string | null;
  actual_start: string | null;
  actual_end: string | null;
  outsourced_ref: string | null;
  lab_test_results?: TestResult[];
  lab_outsourced_labs?: { lab_name: string } | null;
  lab_samples?: { sample_number: string; sample_description: string } | null;
}

interface ReportData {
  report_number: string;
  report_title: string;
  report_type: string;
  revision: string;
  status: string;
  summary: string | null;
  conclusion: string | null;
  prepared_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  issued_at: string | null;
  reviewer_notes: string | null;
  approver_notes: string | null;
  lab_projects?: {
    project_number: string;
    project_name: string;
    lab_companies?: { company_name: string } | null;
  } | null;
  prepared_by_user?: { name: string; designation: string | null } | null;
  reviewed_by_user?: { name: string; designation: string | null } | null;
  approved_by_user?: { name: string; designation: string | null } | null;
}

export async function generateLabReportPDF(
  report: ReportData,
  tests: TestExecution[]
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ─── COLORS ───
  const DARK_BLUE = [30, 58, 138] as [number, number, number];
  const MID_BLUE  = [59, 130, 246] as [number, number, number];
  const LIGHT_BLUE = [239, 246, 255] as [number, number, number];
  const PASS_GREEN = [21, 128, 61] as [number, number, number];
  const FAIL_RED   = [185, 28, 28] as [number, number, number];
  const PENDING_GRAY = [100, 116, 139] as [number, number, number];
  const TEXT_DARK  = [30, 41, 59] as [number, number, number];
  const TEXT_MID   = [71, 85, 105] as [number, number, number];

  function addPage() {
    doc.addPage();
    y = margin;
    // Page border
    doc.setDrawColor(200, 210, 230);
    doc.setLineWidth(0.3);
    doc.rect(8, 8, pageW - 16, pageH - 16);
    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text('SAPURA TECHNICAL CENTRE SDN BHD · Laboratory Test Report · ' + report.report_number + ' Rev.' + report.revision, pageW / 2, pageH - 10, { align: 'center' });
    doc.text('Page ' + doc.getNumberOfPages(), pageW - margin, pageH - 10, { align: 'right' });
    doc.text('CONFIDENTIAL — For intended recipient only', margin, pageH - 10);
  }

  function checkPageBreak(needed: number) {
    if (y + needed > pageH - 20) { addPage(); }
  }

  // ══════════════════════════════════════════
  // PAGE 1 HEADER
  // ══════════════════════════════════════════

  // Top blue bar
  doc.setFillColor(...DARK_BLUE);
  doc.rect(0, 0, pageW, 38, 'F');

  // Logo area
  try {
    const img = new Image();
    img.src = '/SIB_Logo.png';
    await new Promise(r => { img.onload = r; img.onerror = r; });
    doc.addImage(img, 'PNG', margin, 7, 28, 18);
  } catch { /* no logo */ }

  // Company name
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('SAPURA TECHNICAL CENTRE SDN BHD', margin + 32, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 200, 255);
  doc.text('No. 11, Jalan P/1, Seksyen 13, Kawasan Perindustrian Bangi, 43650 Bandar Baru Bangi, Selangor', margin + 32, 18);
  doc.text('Tel: +603 8926 3610  |  www.sapuraindustrial.com.my  |  ISO/IEC 17025 Accredited Laboratory', margin + 32, 23);

  // Report type badge
  doc.setFillColor(...MID_BLUE);
  doc.roundedRect(margin + 32, 26, 55, 8, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  const typeLabel = report.report_type === 'test' ? 'LABORATORY TEST REPORT' : report.report_type === 'summary' ? 'SUMMARY REPORT' : 'CALIBRATION REPORT';
  doc.text(typeLabel, margin + 59.5, 31.5, { align: 'center' });

  y = 44;

  // ── DOCUMENT INFO BOX ──
  doc.setFillColor(...LIGHT_BLUE);
  doc.setDrawColor(...DARK_BLUE);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentW, 42, 2, 2, 'FD');

  // Left: Report details
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_BLUE);
  doc.text(report.report_number, margin + 4, y + 10);

  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_DARK);
  const titleLines = doc.splitTextToSize(report.report_title, contentW * 0.65);
  doc.text(titleLines, margin + 4, y + 18);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MID);
  doc.text('Project: ' + (report.lab_projects?.project_number ?? '—') + '  ·  ' + (report.lab_projects?.project_name ?? '—'), margin + 4, y + 30);
  doc.text('Customer: ' + (report.lab_projects?.lab_companies?.company_name ?? '—'), margin + 4, y + 35);
  doc.text('Revision: ' + report.revision + '  ·  Status: ' + report.status.toUpperCase().replace('_', ' '), margin + 4, y + 40);

  // Right: Status badge + dates
  const rightX = margin + contentW * 0.68;
  const statusColor = report.status === 'issued' ? PASS_GREEN : report.status === 'approved' ? MID_BLUE : PENDING_GRAY;
  doc.setFillColor(...statusColor);
  doc.roundedRect(rightX, y + 3, 42, 10, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(report.status.toUpperCase().replace('_', ' '), rightX + 21, y + 9.5, { align: 'center' });

  const infoData = [
    ['Date Prepared:', report.prepared_at ? new Date(report.prepared_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'],
    ['Date Reviewed:', report.reviewed_at ? new Date(report.reviewed_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'],
    ['Date Approved:', report.approved_at ? new Date(report.approved_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'],
    ['Date Issued:', report.issued_at ? new Date(report.issued_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'],
  ];
  let iy = y + 17;
  infoData.forEach(([label, val]) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_MID);
    doc.text(label, rightX, iy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_DARK);
    doc.text(val, rightX + 25, iy);
    iy += 5.5;
  });

  y += 48;

  // ── APPROVAL SIGNATURES TABLE ──
  checkPageBreak(30);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_BLUE);
  doc.text('APPROVAL', margin, y + 4);
  doc.setDrawColor(...DARK_BLUE);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 5.5, margin + 25, y + 5.5);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [['Role', 'Name', 'Designation', 'Signature', 'Date']],
    body: [
      ['Prepared by', report.prepared_by_user?.name ?? '—', report.prepared_by_user?.designation ?? 'Test Engineer', '', report.prepared_at ? new Date(report.prepared_at).toLocaleDateString('en-MY') : '—'],
      ['Reviewed by', report.reviewed_by_user?.name ?? '—', report.reviewed_by_user?.designation ?? 'Senior Engineer', '', report.reviewed_at ? new Date(report.reviewed_at).toLocaleDateString('en-MY') : '—'],
      ['Approved by', report.approved_by_user?.name ?? '—', report.approved_by_user?.designation ?? 'Laboratory Manager', '', report.approved_at ? new Date(report.approved_at).toLocaleDateString('en-MY') : '—'],
    ],
    theme: 'grid',
    headStyles: { fillColor: DARK_BLUE, textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, minCellHeight: 12 },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold' },
      1: { cellWidth: 42 },
      2: { cellWidth: 40 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ── SCOPE / SUMMARY ──
  if (report.summary) {
    checkPageBreak(30);
    doc.setFillColor(...DARK_BLUE);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('1.  SCOPE & SUMMARY', margin + 3, y + 5);
    y += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_DARK);
    const summaryLines = doc.splitTextToSize(report.summary, contentW - 4);
    checkPageBreak(summaryLines.length * 4.5 + 5);
    doc.text(summaryLines, margin + 2, y);
    y += summaryLines.length * 4.5 + 6;
  }

  // ══════════════════════════════════════════
  // TEST RESULTS SECTIONS
  // ══════════════════════════════════════════
  const completedTests = tests.filter(t => ['completed', 'in_progress'].includes(t.status));

  if (completedTests.length > 0) {
    checkPageBreak(15);
    doc.setFillColor(...DARK_BLUE);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('2.  TEST RESULTS', margin + 3, y + 5);
    y += 10;

    completedTests.forEach((test, idx) => {
      checkPageBreak(35);

      // Test header
      doc.setFillColor(240, 245, 255);
      doc.setDrawColor(...MID_BLUE);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentW, 16, 1, 1, 'FD');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK_BLUE);
      doc.text(`${idx + 1}.  ${test.test_number} — ${test.test_name}`, margin + 3, y + 6);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_MID);
      const testInfo = [
        'Type: ' + (test.test_type === 'inhouse' ? 'In-House' : 'Outsourced'),
        test.equipment_used ? 'Equipment: ' + test.equipment_used : null,
        test.test_conditions ? 'Conditions: ' + test.test_conditions : null,
        test.actual_start ? 'Date: ' + new Date(test.actual_start).toLocaleDateString('en-MY') : null,
      ].filter(Boolean).join('  ·  ');
      const infoLines = doc.splitTextToSize(testInfo, contentW - 6);
      doc.text(infoLines, margin + 3, y + 11);
      y += 20;

      // Sample info
      if (test.lab_samples) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_MID);
        doc.text('Sample: ' + test.lab_samples.sample_number + ' — ' + test.lab_samples.sample_description, margin + 2, y);
        y += 5;
      }

      // Outsourced info
      if (test.test_type === 'outsourced' && test.lab_outsourced_labs) {
        doc.setFontSize(7.5);
        doc.setTextColor(...TEXT_MID);
        doc.text('Outsourced to: ' + test.lab_outsourced_labs.lab_name + (test.outsourced_ref ? '  ·  Ref: ' + test.outsourced_ref : ''), margin + 2, y);
        y += 5;
      }

      // Results table
      if (test.lab_test_results && test.lab_test_results.length > 0) {
        const passCount = test.lab_test_results.filter(r => r.result === 'pass').length;
        const failCount = test.lab_test_results.filter(r => r.result === 'fail').length;
        const overallResult = failCount > 0 ? 'FAIL' : 'PASS';
        const overallColor = failCount > 0 ? FAIL_RED : PASS_GREEN;

        autoTable(doc, {
          startY: y,
          head: [['Parameter', 'Unit', 'Measured Value', 'Specification', 'Result', 'Remarks']],
          body: test.lab_test_results.map(r => [
            r.parameter_name,
            r.unit ?? '—',
            r.measured_value ?? 'Pending',
            r.specification ?? '—',
            r.result.toUpperCase(),
            r.remarks ?? '—',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 7, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7.5 },
          columnStyles: {
            0: { cellWidth: 48 },
            1: { cellWidth: 14, halign: 'center' },
            2: { cellWidth: 24, halign: 'center' },
            3: { cellWidth: 28, halign: 'center' },
            4: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
            5: { cellWidth: 40 },
          },
          didDrawCell: (data) => {
            if (data.column.index === 4 && data.section === 'body') {
              const val = data.cell.text[0];
              if (val === 'PASS') {
                doc.setTextColor(...PASS_GREEN);
              } else if (val === 'FAIL') {
                doc.setTextColor(...FAIL_RED);
              } else {
                doc.setTextColor(...PENDING_GRAY);
              }
            }
          },
          margin: { left: margin, right: margin },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

        // Overall result badge
        doc.setFillColor(...overallColor);
        doc.roundedRect(margin, y, contentW, 8, 1, 1, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`Overall Result: ${overallResult}  (${passCount} Pass / ${failCount} Fail / ${test.lab_test_results.length} Total)`, margin + 3, y + 5.5);
        y += 12;
      } else {
        doc.setFontSize(8);
        doc.setTextColor(...PENDING_GRAY);
        doc.text('No results recorded yet.', margin + 3, y + 4);
        y += 10;
      }
      y += 4;
    });
  }

  // ── CONCLUSION ──
  if (report.conclusion) {
    checkPageBreak(35);
    doc.setFillColor(...DARK_BLUE);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('3.  CONCLUSION', margin + 3, y + 5);
    y += 10;

    // Conclusion box
    const conclusionLines = doc.splitTextToSize(report.conclusion, contentW - 8);
    checkPageBreak(conclusionLines.length * 4.5 + 10);
    doc.setDrawColor(...DARK_BLUE);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin, y + conclusionLines.length * 4.5 + 6);
    doc.setLineWidth(0.3);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_DARK);
    doc.text(conclusionLines, margin + 4, y + 4);
    y += conclusionLines.length * 4.5 + 12;
  }

  // ── REVIEWER / APPROVER NOTES ──
  if (report.reviewer_notes || report.approver_notes) {
    checkPageBreak(25);
    doc.setFillColor(...DARK_BLUE);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('4.  REVIEW & APPROVAL NOTES', margin + 3, y + 5);
    y += 10;

    if (report.reviewer_notes) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXT_DARK);
      doc.text('Reviewer Notes:', margin + 2, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_MID);
      const rnLines = doc.splitTextToSize(report.reviewer_notes, contentW - 6);
      doc.text(rnLines, margin + 4, y);
      y += rnLines.length * 4.5 + 4;
    }

    if (report.approver_notes) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXT_DARK);
      doc.text('Approver Notes:', margin + 2, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_MID);
      const anLines = doc.splitTextToSize(report.approver_notes, contentW - 6);
      doc.text(anLines, margin + 4, y);
      y += anLines.length * 4.5 + 4;
    }
  }

  // ── DISCLAIMER ──
  checkPageBreak(20);
  y += 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(200, 210, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 18, 1, 1, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MID);
  doc.text('DISCLAIMER', margin + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 130, 150);
  const disclaimer = 'This report relates only to the items tested. Results are applicable to the samples as received. This report shall not be reproduced except in full without written approval from Sapura Technical Centre Sdn Bhd. This report is issued in confidence to the client and shall not be disclosed to any third party without prior consent.';
  const discLines = doc.splitTextToSize(disclaimer, contentW - 6);
  doc.text(discLines, margin + 3, y + 10);
  y += 22;

  // ── FOOTER ON PAGE 1 ──
  doc.setPage(1);
  doc.setDrawColor(200, 210, 230);
  doc.setLineWidth(0.3);
  doc.rect(8, 8, pageW - 16, pageH - 16);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('SAPURA TECHNICAL CENTRE SDN BHD · Laboratory Test Report · ' + report.report_number + ' Rev.' + report.revision, pageW / 2, pageH - 10, { align: 'center' });
  doc.text('Page 1 of ' + doc.getNumberOfPages(), pageW - margin, pageH - 10, { align: 'right' });
  doc.text('CONFIDENTIAL — For intended recipient only', margin, pageH - 10);

  // Update page numbers on other pages
  for (let i = 2; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text('Page ' + i + ' of ' + doc.getNumberOfPages(), pageW - margin, pageH - 10, { align: 'right' });
  }

  doc.save(report.report_number + '_Rev' + report.revision + '_' + (report.lab_projects?.project_number ?? 'RPT') + '.pdf');
}
