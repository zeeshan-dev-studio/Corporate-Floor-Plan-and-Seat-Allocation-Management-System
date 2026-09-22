import jsPDF from 'jspdf';
import { ProgramDTO } from '@/types/floorplan';

export interface PDFExportOptions {
  paperSize: 'a4' | 'a3' | 'a2' | 'a1';
  orientation: 'landscape' | 'portrait';
  title: string;
  buildingName: string;
  floorName: string;
  viewMode: 'operational' | 'architectural';
  programs: ProgramDTO[];
  includeLegend: boolean;
  includeTitleBlock: boolean;
  scaleText?: string;
  notes?: string;
}

export async function exportFloorPlanToPDF(
  svgElement: SVGSVGElement,
  options: PDFExportOptions
): Promise<void> {
  const {
    paperSize = 'a3',
    orientation = 'landscape',
    title,
    buildingName,
    floorName,
    viewMode,
    programs,
    includeLegend = true,
    includeTitleBlock = true,
    scaleText = 'Scale: 1:100 @ CAD Grid',
    notes = 'Corporate Real Estate & Facility Planning Division. Unauthorized reproduction prohibited.',
  } = options;

  // Initialize jsPDF with specified paper size & orientation
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: paperSize,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Margins
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  // Render SVG to image data URL via Canvas
  const svgString = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  // Calculate layout bounds: leave room for Title Block at bottom if enabled
  const titleBlockHeight = includeTitleBlock ? 28 : 0;
  const legendWidth = includeLegend ? 55 : 0;

  const canvasWidth = contentWidth - legendWidth - 5;
  const canvasHeight = contentHeight - titleBlockHeight - 5;

  // Fit image while maintaining aspect ratio
  const imgAspect = img.width / img.height;
  const areaAspect = canvasWidth / canvasHeight;

  let renderW = canvasWidth;
  let renderH = canvasHeight;
  let renderX = margin;
  let renderY = margin;

  if (imgAspect > areaAspect) {
    renderH = canvasWidth / imgAspect;
    renderY = margin + (canvasHeight - renderH) / 2;
  } else {
    renderW = canvasHeight * imgAspect;
    renderX = margin + (canvasWidth - renderW) / 2;
  }

  // Draw CAD Drawing Border
  pdf.setDrawColor(51, 65, 85); // Slate-700
  pdf.setLineWidth(0.5);
  pdf.rect(margin, margin, contentWidth, contentHeight);

  // Convert SVG image to canvas to draw into PDF
  const canvas = document.createElement('canvas');
  canvas.width = img.width * 2; // 2x supersampling for high vector clarity
  canvas.height = img.height * 2;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#181b22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', renderX, renderY, renderW, renderH);
  }

  URL.revokeObjectURL(url);

  // ==========================================
  // SIDE PANEL: LEGEND & METADATA
  // ==========================================
  if (includeLegend) {
    const legX = margin + canvasWidth + 5;
    const legY = margin;
    const legW = legendWidth;
    const legH = canvasHeight;

    pdf.setFillColor(30, 41, 59);
    pdf.rect(legX, legY, legW, legH, 'F');
    pdf.setDrawColor(71, 85, 105);
    pdf.rect(legX, legY, legW, legH, 'S');

    // Legend Header
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('PLAN LEGEND', legX + 5, legY + 8);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      viewMode === 'operational' ? 'Program Allocations & Status' : 'Architectural Features',
      legX + 5,
      legY + 13
    );

    let curY = legY + 22;

    if (viewMode === 'operational') {
      // Program keys
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(226, 232, 240);
      pdf.text('PROGRAMS:', legX + 5, curY);
      curY += 6;

      programs.forEach((p) => {
        // Hex to RGB
        const hex = p.color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) || 100;
        const g = parseInt(hex.substring(2, 4), 16) || 100;
        const b = parseInt(hex.substring(4, 6), 16) || 100;

        pdf.setFillColor(r, g, b);
        pdf.circle(legX + 8, curY - 1, 2.5, 'F');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(241, 245, 249);
        pdf.text(`${p.name} (${p.allocatedCount})`, legX + 14, curY);
        curY += 6;
      });

      curY += 4;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(226, 232, 240);
      pdf.text('STATUS KEY:', legX + 5, curY);
      curY += 6;

      // Status rows
      const statusItems = [
        { label: 'Unallocated / Vacant', r: 100, g: 116, b: 139 },
        { label: 'Blocked (Maintenance/IT)', r: 239, g: 68, b: 68 },
        { label: 'Reserved', r: 245, g: 158, b: 11 },
      ];

      statusItems.forEach((st) => {
        pdf.setFillColor(st.r, st.g, st.b);
        pdf.circle(legX + 8, curY - 1, 2.5, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(203, 213, 225);
        pdf.text(st.label, legX + 14, curY);
        curY += 5.5;
      });
    } else {
      // Architectural items
      const archItems = [
        { label: 'Perimeter Wall (200mm)', r: 71, g: 85, b: 105 },
        { label: 'Glass Partition', r: 56, g: 189, b: 248 },
        { label: 'Workstation / Bay', r: 30, g: 41, b: 59 },
        { label: 'Passenger Elevator', r: 15, g: 23, b: 42 },
        { label: 'Fire Emergency Exit', r: 239, g: 68, b: 68 },
      ];

      archItems.forEach((ai) => {
        pdf.setFillColor(ai.r, ai.g, ai.b);
        pdf.rect(legX + 6, curY - 3, 5, 4, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(203, 213, 225);
        pdf.text(ai.label, legX + 14, curY);
        curY += 6;
      });
    }

    // North Arrow Compass
    const northY = legY + legH - 22;
    pdf.setDrawColor(148, 163, 184);
    pdf.setLineWidth(0.4);
    pdf.circle(legX + legW / 2, northY, 8);
    pdf.setFillColor(239, 68, 68);
    // Draw top arrow
    pdf.triangle(
      legX + legW / 2 - 3,
      northY,
      legX + legW / 2 + 3,
      northY,
      legX + legW / 2,
      northY - 7,
      'F'
    );
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text('N', legX + legW / 2 - 1.5, northY - 8.5);
  }

  // ==========================================
  // BOTTOM TITLE BLOCK (CAD STANDARD)
  // ==========================================
  if (includeTitleBlock) {
    const tbX = margin;
    const tbY = pageHeight - margin - titleBlockHeight;
    const tbW = contentWidth;
    const tbH = titleBlockHeight;

    pdf.setFillColor(15, 23, 42); // Slate-900
    pdf.rect(tbX, tbY, tbW, tbH, 'F');
    pdf.setDrawColor(51, 65, 85);
    pdf.rect(tbX, tbY, tbW, tbH, 'S');

    // Dividers
    pdf.line(tbX + 80, tbY, tbX + 80, tbY + tbH);
    pdf.line(tbX + 180, tbY, tbX + 180, tbY + tbH);
    pdf.line(tbX + tbW - 75, tbY, tbX + tbW - 75, tbY + tbH);

    // Box 1: Organization & Logo
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(56, 189, 248);
    pdf.text('GLOBAL CORPORATE REAL ESTATE', tbX + 5, tbY + 8);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Facility & Seat Allocation System', tbX + 5, tbY + 14);
    pdf.text('Internal & Confidential', tbX + 5, tbY + 20);

    // Box 2: Project / Location
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(241, 245, 249);
    pdf.text(`${buildingName} — ${floorName}`, tbX + 85, tbY + 8);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Drawing: ${title}`, tbX + 85, tbY + 14);
    pdf.text(`Mode: ${viewMode === 'operational' ? 'Operational Allocation Plan' : 'Architectural Floor Plan'}`, tbX + 85, tbY + 20);

    // Box 3: Specifications & Scale
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(203, 213, 225);
    pdf.text(scaleText, tbX + 185, tbY + 8);
    pdf.text(`Date Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, tbX + 185, tbY + 14);
    pdf.text(notes.substring(0, 50), tbX + 185, tbY + 20);

    // Box 4: Sheet / Approval Stamp
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`SHEET: ${paperSize.toUpperCase()}-01`, tbX + tbW - 70, tbY + 8);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(148, 163, 184);
    pdf.text('STATUS: APPROVED / ISSUED', tbX + tbW - 70, tbY + 14);
    pdf.text(`REV: 2.4 | ${orientation.toUpperCase()}`, tbX + tbW - 70, tbY + 20);
  }

  // Save / trigger download
  const filename = `${buildingName}_${floorName}_${viewMode}_${paperSize.toUpperCase()}.pdf`.replace(
    /\s+/g,
    '_'
  );
  pdf.save(filename);
}

export function downloadSVG(svgElement: SVGSVGElement, filename: string): void {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  // Add namespaces if missing
  if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}

export async function downloadPNG(
  svgElement: SVGSVGElement,
  filename: string,
  scale = 2
): Promise<void> {
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svgElement);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#181b22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const a = document.createElement('a');
    a.download = filename;
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  URL.revokeObjectURL(url);
}
