import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Session {
  date: string;
  clock_in: string;
  clock_out: string | null;
  hours_worked: number | null;
  notes: string | null;
  factory_code?: string;
  ts_users?: { name: string; employee_id: string | null; designation: string | null; hourly_rate: number | null };
  ts_factories?: { name: string };
}

interface Factory {
  code: string; name: string; address: string | null; registration_no: string | null;
  phone: string | null; email: string | null; bank_name: string | null;
  bank_account: string | null; bank_account_name: string | null;
  sst_rate: number | null; payment_terms: string | null;
}

interface User {
  name: string; employee_id: string | null; designation: string | null; hourly_rate: number | null;
}

function getInvoiceNo(prefix: string, period: string) {
  const [y, m] = period.split('-');
  return `${prefix}-${y}${m}-${Math.floor(Math.random() * 900 + 100)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dtStr: string) {
  return new Date(dtStr).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
}

export async function generateFactoryInvoice(stc: Factory, factory: Factory, sessions: Session[], period: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;

  // Load SIB logo
  try {
    const img = new Image();
    img.src = '/SIB_Logo.png';
    await new Promise(r => { img.onload = r; img.onerror = r; });
    doc.addImage(img, 'PNG', margin, 10, 30, 20);
  } catch {}

  // Header - STC info
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  const headerX = margin + 33;
  const maxW = pageW - headerX - margin;
  doc.setFont('helvetica', 'bold');
  doc.text('Sapura Technical Centre Sdn. Bhd (' + (stc?.registration_no ?? '277264-H') + ')', headerX, 13);
  doc.setFont('helvetica', 'normal');
  const addr = stc?.address ?? 'No. 11, Jalan P/1, Seksyen 13, Kawasan Perindustrian Bangi, 43650 Bandar Baru Bangi, Selangor Darul Ehsan Malaysia';
  const addrLines = doc.splitTextToSize(addr, maxW);
  doc.text(addrLines, headerX, 17);
  const afterAddr = 17 + addrLines.length * 4;
  doc.text('Tel: ' + (stc?.phone ?? '+603 8926 3610') + '  |  Website: www.sapuraindustrial.com.my', headerX, afterAddr);

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 33, pageW - margin, 33);

  // INVOICE title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('INVOICE', margin, 42);

  // Invoice details box
  const invNo = getInvoiceNo('INV', period);
  const [y, m] = period.split('-');
  const monthName = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('en-MY', { month: 'long', year: 'numeric' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  // TO box
  doc.setFont('helvetica', 'bold');
  doc.text('TO:', margin, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(factory.name + (factory.registration_no ? ' (' + factory.registration_no + ')' : ''), margin, 57);
  if (factory.address) {
    const addrLines = doc.splitTextToSize(factory.address, 80);
    doc.text(addrLines, margin, 61);
  }
  if (factory.phone) doc.text('Tel: ' + factory.phone, margin, 72);

  // Invoice info right side
  const rightX = 130;
  const infoData = [
    ['Invoice No', ': ' + invNo],
    ['Invoice Date', ': ' + new Date().toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })],
    ['Period', ': ' + monthName],
    ['Payment Terms', ': ' + (stc?.payment_terms ?? '30 days')],
  ];
  let ry = 52;
  doc.setFont('helvetica', 'bold');
  infoData.forEach(([label, val]) => {
    doc.text(label, rightX, ry);
    doc.setFont('helvetica', 'normal');
    doc.text(val, rightX + 28, ry);
    doc.setFont('helvetica', 'bold');
    ry += 5;
  });

  // Sessions table
  const tableData = sessions.map(s => {
    const user = s.ts_users;
    const rate = user?.hourly_rate ?? 0;
    const hrs = s.hours_worked ?? 0;
    const charge = hrs * rate;
    return [
      formatDate(s.date),
      user?.name ?? '—',
      user?.designation ?? '—',
      formatTime(s.clock_in) + ' - ' + (s.clock_out ? formatTime(s.clock_out) : '—'),
      hrs.toFixed(2),
      'RM ' + rate.toFixed(2),
      'RM ' + charge.toFixed(2),
    ];
  });

  autoTable(doc, {
    startY: 82,
    head: [['Date', 'Engineer', 'Designation', 'Time', 'Hours', 'Rate/hr', 'Amount (RM)']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 22 }, 1: { cellWidth: 35 }, 2: { cellWidth: 28 },
      3: { cellWidth: 30 }, 4: { cellWidth: 15, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' }, 6: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  // Totals
  const subtotal = sessions.reduce((a, s) => a + (s.hours_worked ?? 0) * (s.ts_users?.hourly_rate ?? 0), 0);
  const sstRate = stc?.sst_rate ?? 0;
  const sstAmt = subtotal * (sstRate / 100);
  const total = subtotal + sstAmt;
  const finalY = (doc as unknown as {lastAutoTable: {finalY: number}}).lastAutoTable.finalY + 5;

  doc.setFontSize(8);
  const totX = pageW - margin - 60;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totX, finalY);
  doc.text('RM ' + subtotal.toFixed(2), pageW - margin, finalY, { align: 'right' });
  doc.text('SST (' + sstRate + '%):', totX, finalY + 5);
  doc.text('RM ' + sstAmt.toFixed(2), pageW - margin, finalY + 5, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text('TOTAL:', totX, finalY + 12);
  doc.text('RM ' + total.toFixed(2), pageW - margin, finalY + 12, { align: 'right' });

  // Bank details
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const bankY = finalY + 22;
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Details:', margin, bankY);
  doc.setFont('helvetica', 'normal');
  doc.text('Bank: ' + (stc?.bank_name ?? '—'), margin, bankY + 5);
  doc.text('Account No: ' + (stc?.bank_account ?? '—'), margin, bankY + 9);
  doc.text('Account Name: ' + (stc?.bank_account_name ?? '—'), margin, bankY + 13);

  // Footer
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 275, pageW - margin, 275);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('This is a computer generated invoice. ' + stc?.name + ' (' + (stc?.registration_no ?? '') + ')', pageW / 2, 279, { align: 'center' });

  doc.save('Invoice_' + factory.code + '_' + period + '.pdf');
  return invNo;
}

export async function generateIndividualReport(stc: Factory, user: User & { id: string }, sessions: Session[], period: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;

  // Logo
  try {
    const img = new Image();
    img.src = '/SIB_Logo.png';
    await new Promise(r => { img.onload = r; img.onerror = r; });
    doc.addImage(img, 'PNG', margin, 10, 30, 20);
  } catch {}

  // Header
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  const headerX2 = margin + 33;
  const maxW2 = pageW - headerX2 - margin;
  doc.setFont('helvetica', 'bold');
  doc.text('Sapura Technical Centre Sdn. Bhd (' + (stc?.registration_no ?? '277264-H') + ')', headerX2, 13);
  doc.setFont('helvetica', 'normal');
  const addr2 = stc?.address ?? 'No. 11, Jalan P/1, Seksyen 13, Kawasan Perindustrian Bangi, 43650 Bandar Baru Bangi, Selangor Darul Ehsan Malaysia';
  const addrLines2 = doc.splitTextToSize(addr2, maxW2);
  doc.text(addrLines2, headerX2, 17);

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 33, pageW - margin, 33);

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('CONTRIBUTION REPORT', margin, 42);

  const [y, m] = period.split('-');
  const monthName = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('en-MY', { month: 'long', year: 'numeric' });

  // Engineer info
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('Engineer:', margin, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(user.name + (user.employee_id ? ' (' + user.employee_id + ')' : ''), margin + 22, 52);
  doc.setFont('helvetica', 'bold');
  doc.text('Designation:', margin, 57);
  doc.setFont('helvetica', 'normal');
  doc.text(user.designation ?? '—', margin + 22, 57);
  doc.setFont('helvetica', 'bold');
  doc.text('Period:', margin, 62);
  doc.setFont('helvetica', 'normal');
  doc.text(monthName, margin + 22, 62);
  doc.setFont('helvetica', 'bold');
  doc.text('Hourly Rate:', margin, 67);
  doc.setFont('helvetica', 'normal');
  doc.text('RM ' + (user.hourly_rate?.toFixed(2) ?? '0.00') + '/hr', margin + 22, 67);

  // Sessions table
  const tableData = sessions.map(s => {
    const fac = (s.ts_factories as {name:string}|undefined)?.name ?? s.factory_code ?? '—';
    const hrs = s.hours_worked ?? 0;
    const rate = user.hourly_rate ?? 0;
    const charge = hrs * rate;
    return [
      formatDate(s.date),
      s.factory_code ?? '—',
      fac,
      formatTime(s.clock_in) + ' - ' + (s.clock_out ? formatTime(s.clock_out) : '—'),
      hrs.toFixed(2),
      'RM ' + rate.toFixed(2),
      'RM ' + charge.toFixed(2),
    ];
  });

  autoTable(doc, {
    startY: 75,
    head: [['Date', 'Code', 'Factory', 'Time', 'Hours', 'Rate/hr', 'Amount (RM)']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 22 }, 1: { cellWidth: 15 }, 2: { cellWidth: 40 },
      3: { cellWidth: 30 }, 4: { cellWidth: 15, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' }, 6: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  // Summary by factory
  const byFactory: Record<string, { hrs: number; charge: number }> = {};
  sessions.forEach(s => {
    const code = s.factory_code ?? 'UNKNOWN';
    if (!byFactory[code]) byFactory[code] = { hrs: 0, charge: 0 };
    byFactory[code].hrs += s.hours_worked ?? 0;
    byFactory[code].charge += (s.hours_worked ?? 0) * (user.hourly_rate ?? 0);
  });

  const summaryY = (doc as unknown as {lastAutoTable: {finalY: number}}).lastAutoTable.finalY + 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('Summary by Factory', margin, summaryY);

  autoTable(doc, {
    startY: summaryY + 3,
    head: [['Factory Code', 'Total Hours', 'Total Contribution (RM)']],
    body: Object.entries(byFactory).map(([code, { hrs, charge }]) => [code, hrs.toFixed(2) + 'h', 'RM ' + charge.toFixed(2)]),
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    margin: { left: margin, right: margin },
    tableWidth: 100,
  });

  // Total
  const totalH = sessions.reduce((a, s) => a + (s.hours_worked ?? 0), 0);
  const totalCharge = totalH * (user.hourly_rate ?? 0);
  const tot2Y = (doc as unknown as {lastAutoTable: {finalY: number}}).lastAutoTable.finalY + 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  const totX = pageW - margin - 60;
  doc.text('Total Hours:', totX, tot2Y);
  doc.text(totalH.toFixed(2) + 'h', pageW - margin, tot2Y, { align: 'right' });
  doc.text('Total Contribution:', totX, tot2Y + 6);
  doc.text('RM ' + totalCharge.toFixed(2), pageW - margin, tot2Y + 6, { align: 'right' });

  // Footer
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 275, pageW - margin, 275);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.setFont('helvetica', 'normal');
  doc.text('Generated on ' + new Date().toLocaleDateString('en-MY') + ' · Sapura Technical Centre Sdn. Bhd', pageW / 2, 279, { align: 'center' });

  doc.save('Contribution_' + user.name.replace(/ /g, '_') + '_' + period + '.pdf');
}
