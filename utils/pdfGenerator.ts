import { jsPDF } from "jspdf";
import { ServiceOrder, formatCurrency, DriverData, TeamOrderData } from "../types";

export type PdfRoleTarget = 'motorista' | 'ajudante' | 'montador' | 'embalador' | 'geral';

const cleanPhone = (phone: string) => phone.replace(/\D/g, '');

// Professional ABNT-compliant colors
const PRIMARY_COLOR = "#1e3a8a"; // Professional Blue
const SECONDARY_COLOR = "#1f2937"; // Dark Gray
const TEXT_DARK = "#374151";
const TEXT_LIGHT = "#6b7280";

// Helper to fetch Logo safely using Image object to avoid fetch/CORS errors
const getLogoBase64 = (): Promise<string | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = "https://a.imagem.app/BEfcEJ.png";

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                try {
                    const dataURL = canvas.toDataURL('image/png');
                    resolve(dataURL);
                } catch (e) {
                    // If canvas is tainted by CORS, resolve null to prevent crash
                    console.warn("Logo blocked by CORS");
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        };

        img.onerror = () => {
            console.warn("Failed to load logo image");
            resolve(null);
        };
    });
};

// Helper to fetch Signature safely
const getSignatureBase64 = (): Promise<string | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = '/signature.png'; // Local file in public folder

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                try {
                    const dataURL = canvas.toDataURL('image/png');
                    resolve(dataURL);
                } catch (e) {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        };

        img.onerror = () => resolve(null);
    });
};



// --- PROFESSIONAL DRIVER PDF GENERATOR (Nano Banana 2 - Final Polish) ---
export const generateDriverPDF = async (order: ServiceOrder, driver: DriverData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- LAYOUT CONSTANTS ---
    const MARGIN = 15;
    const CONTENT_WIDTH = pageWidth - (MARGIN * 2);
    const HEADER_COLOR: [number, number, number] = [30, 41, 59]; // Dark Navy (#1e293b)
    const TEXT_PRIMARY: [number, number, number] = [30, 41, 59]; // Dark Slate
    const TEXT_VALUE: [number, number, number] = [51, 65, 85]; // Very Dark Gray for Values (#334155)
    const BORDER_COLOR: [number, number, number] = [200, 200, 200];

    // --- HELPERS (FORMATTING) ---
    const formatCPF = (val: string) => val.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    const formatPhone = (val: string) => {
        const d = val.replace(/\D/g, '');
        if (d.length > 10)
            return `+55 (${d.substring(0, 2)}) ${d.substring(2, 7)}-${d.substring(7, 11)}`;
        return val;
    };
    const formatMoney = (val: string | undefined) => {
        if (!val) return 'R$ 0,00';
        let numVal = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.'));
        if (isNaN(numVal)) {
            // try just parsing raw
            numVal = parseFloat(val);
        }
        if (isNaN(numVal)) return val;
        return numVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const [logoData, signatureData] = await Promise.all([getLogoBase64(), getSignatureBase64()]);

    // 1. Background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    let cursorY = 20;

    // --- DRAWING PRIMITIVES ---
    const drawSectionHeader = (title: string, y: number): number => {
        doc.setFillColor(...HEADER_COLOR);
        doc.rect(MARGIN, y, CONTENT_WIDTH, 9, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(title.toUpperCase(), MARGIN + 4, y + 6);
        return y + 9;
    };

    const drawBoxOutline = (y: number, h: number) => {
        doc.setDrawColor(...BORDER_COLOR);
        doc.setLineWidth(0.4);
        doc.rect(MARGIN, y, CONTENT_WIDTH, h);
    };

    // Refined Field Drawer for Grid
    const drawGridField = (label: string, value: string, x: number, y: number, maxWidth?: number) => {
        doc.setFontSize(9);
        doc.setTextColor(...TEXT_PRIMARY); // Label Color
        doc.setFont("helvetica", "bold");
        const labelWidth = doc.getTextWidth(label + " ");
        doc.text(label, x, y);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(20, 20, 20); // Darker values as requested (#333 approx)

        if (maxWidth) {
            const lines = doc.splitTextToSize(value, maxWidth);
            doc.text(lines, x + labelWidth, y);
            return lines.length * 4;
        } else {
            doc.text(value, x + labelWidth, y);
            return 4;
        }
    };

    const drawDividerLine = (y: number) => {
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.line(MARGIN, y, pageWidth - MARGIN, y);
    }

    // ===== HEADER =====
    const drawHeader = (subTitle: string) => {
        if (logoData) {
            try { doc.addImage(logoData, 'PNG', MARGIN, 15, 25, 25, undefined, 'FAST'); } catch (e) { }
        }
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(20, 20, 20);
        doc.text("Viacargo Soluções em logística".toUpperCase(), pageWidth / 2, 35, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`O.S. Nº: ${order.id}`, pageWidth - MARGIN, 20, { align: "right" });
        doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - MARGIN, 25, { align: "right" });
    };

    drawHeader("ORDEM DE SERVIÇO DE TRANSPORTE");
    cursorY = 55;

    // ===== SECTION 1: DADOS DO MOTORISTA (STRICT GRID) =====
    const sec1Y = cursorY;
    let currentY = drawSectionHeader("DADOS DO MOTORISTA", sec1Y) + 7;

    // Grid definitions
    const ROW_H = 8;
    const X_COL1 = MARGIN + 5;
    const X_COL2 = MARGIN + 70; // 30% mark approx
    const X_COL3 = MARGIN + 120;

    // Row 1: Nome (70%) | CPF (30%)
    drawGridField("Nome:", driver.fullName, X_COL1, currentY);
    drawGridField("CPF:", formatCPF(driver.cpf), pageWidth - 60, currentY);
    currentY += ROW_H; drawDividerLine(currentY - 4);

    // Row 2: CNH | Categoria | Validade CNH
    drawGridField("CNH:", driver.cnh, X_COL1, currentY);
    drawGridField("Cat:", driver.category, X_COL2, currentY);
    drawGridField("Validade:", new Date(driver.validity).toLocaleDateString('pt-BR'), X_COL3, currentY);
    currentY += ROW_H; drawDividerLine(currentY - 4);

    // Row 3: Veículo | Placa | RNTRC
    drawGridField("Veículo:", driver.vehicle, X_COL1, currentY);
    drawGridField("Placa:", `${driver.plate.toUpperCase()} (${driver.uf.toUpperCase()})`, X_COL2, currentY);
    drawGridField("RNTRC:", driver.ntrc, X_COL3, currentY);
    currentY += ROW_H; drawDividerLine(currentY - 4);

    // Row 4: Telefone
    drawGridField("Telefone:", formatPhone(driver.phone), X_COL1, currentY);
    currentY += 4;

    // Box it
    drawBoxOutline(sec1Y + 9, currentY - (sec1Y + 9));
    cursorY = currentY + 12;

    // ===== CNH IMAGE SECTION (NEW) =====
    if (driver.cnhImage) {
        // Safe check for valid base64
        try {
            const imgHeight = 80; // Fixed height for CNH
            const imgWidth = 120; // Max width approximate
            const xPos = (pageWidth - imgWidth) / 2; // Center it

            // Draw Label
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(100, 100, 100);
            doc.text("ANEXO: CNH DO MOTORISTA", MARGIN, cursorY - 2);

            // Draw Image
            doc.addImage(driver.cnhImage, 'JPEG', xPos, cursorY, imgWidth, imgHeight, undefined, 'FAST');

            // Advance cursor
            cursorY += imgHeight + 10;
        } catch (err) {
            console.error("Error rendering CNH image", err);
            // Fallback text if image fails
            doc.setFontSize(8);
            doc.setTextColor(255, 0, 0);
            doc.text("[Erro ao renderizar imagem da CNH]", MARGIN, cursorY + 5);
            cursorY += 10;
        }
    }

    // ===== SECTION 2: DADOS DA OPERAÇÃO =====
    const sec2Y = cursorY;
    currentY = drawSectionHeader("DADOS DA OPERAÇÃO", sec2Y) + 7;

    // Row 1: Client Name | Client Phone
    drawGridField("CLIENTE:", order.clientName, X_COL1, currentY, 90);
    // Explicit phone label on right
    doc.setFont("helvetica", "bold"); doc.setTextColor(...TEXT_PRIMARY);
    doc.text("Telefone do Cliente:", pageWidth - 65, currentY);
    doc.setFont("helvetica", "normal"); doc.setTextColor(30, 58, 138); // Blue for phone
    const clientPhone = order.whatsapp ? formatPhone(order.whatsapp) : "—";
    doc.text(clientPhone, pageWidth - 65, currentY + 5);

    currentY += 10;

    // Address Width
    const addrWidth = CONTENT_WIDTH - 40;

    // Pickup
    doc.setFont("helvetica", "bold"); doc.setTextColor(...TEXT_PRIMARY);
    doc.text("[COLETA]", X_COL1, currentY);

    // Date same line or next? Requested "Date next to address or column"
    // Let's put date slightly to right for readability
    doc.setFont("helvetica", "normal"); doc.setTextColor(20, 20, 20);
    const pDate = new Date(order.pickupDate).toLocaleDateString('pt-BR');

    // Address wrap
    const pickupAddrLines = doc.splitTextToSize(order.origin, addrWidth);
    doc.text(pickupAddrLines, X_COL1 + 20, currentY);
    // Date
    doc.setFont("helvetica", "bold");
    doc.text(`DATA: ${pDate}`, pageWidth - MARGIN - 5, currentY, { align: "right" });

    currentY += (pickupAddrLines.length * 5) + 4;

    // Delivery
    doc.setFont("helvetica", "bold"); doc.setTextColor(...TEXT_PRIMARY);
    doc.text("[ENTREGA]", X_COL1, currentY);

    const dDate = new Date(order.deliveryForecast).toLocaleDateString('pt-BR');
    const delLines = doc.splitTextToSize(order.destination, addrWidth);
    doc.setFont("helvetica", "normal"); doc.setTextColor(20, 20, 20);
    doc.text(delLines, X_COL1 + 20, currentY);

    doc.setFont("helvetica", "bold");
    doc.text(`PREVISÃO: ${dDate}`, pageWidth - MARGIN - 5, currentY, { align: "right" });

    currentY += (delLines.length * 5) + 6;

    drawDividerLine(currentY - 2);
    // Obs
    doc.setFontSize(8); doc.setTextColor(150, 150, 150);
    doc.text("Observações: O pagamento do saldo será realizado mediante envio do comprovante.", X_COL1, currentY + 3);
    currentY += 8;

    drawBoxOutline(sec2Y + 9, currentY - (sec2Y + 9));
    cursorY = currentY + 12;

    // ===== SECTION 3: VALOR DO FRETE (STRICT BRL) =====
    if (driver.freightValue) {
        doc.setDrawColor(22, 163, 74); // Green Border
        doc.setLineWidth(0.6);
        doc.setFillColor(240, 253, 244); // Light Green BG
        doc.roundedRect(MARGIN, cursorY, CONTENT_WIDTH, 14, 1, 1, 'FD');

        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(21, 128, 61);
        doc.text("VALOR TOTAL DO FRETE A RECEBER:", MARGIN + 8, cursorY + 9);

        doc.setFontSize(13); doc.setTextColor(21, 128, 61);
        const formattedMoney = formatMoney(driver.freightValue);
        doc.text(formattedMoney, pageWidth - MARGIN - 10, cursorY + 9, { align: "right" });

        cursorY += 24;
    }

    // ===== SECTION 4: ITEMS (DYNAMIC HEIGHT & GRID) =====
    if (driver.inventoryList && driver.inventoryList.trim().length > 0) {
        // Calculate needed height safely
        const rawItems = driver.inventoryList.split('\n');
        // Grid: 2 columns
        const itemsPerCol = Math.ceil(rawItems.length / 2);
        const lineHeight = 6;
        const totalBoxHeight = (itemsPerCol * lineHeight) + 20; // 20 padding

        // Check if fits current page
        if (cursorY + totalBoxHeight > pageHeight - 30) {
            doc.addPage();
            cursorY = 20;
            drawSectionHeader("ANEXO - ITENS", cursorY);
        } else {
            const listY = cursorY;
            drawSectionHeader("LISTA DE ITENS", listY);
            cursorY += 15;
        }

        // Draw items
        doc.setFontSize(9); doc.setTextColor(20, 20, 20); doc.setFont("helvetica", "normal");

        rawItems.forEach((item, i) => {
            const isCol2 = i >= itemsPerCol;
            const idx = isCol2 ? i - itemsPerCol : i;
            // Check for page break safety within the loop (naive check mainly for second column start or long lists)
            if (cursorY + (idx * lineHeight) > pageHeight - 20) {
                // Note: Ideally we would handle page breaks inside loops by resetting cursorY, 
                // but for this specific grid layout re-doing the header on a new page is complex.
                // For now, the pre-check at line 303 handles most cases. 
                // We will rely on that main check.
            }

            const xPos = isCol2 ? (pageWidth / 2 + 5) : (MARGIN + 5);
            // Protect against very long item names
            const safeItem = doc.splitTextToSize(item, (CONTENT_WIDTH / 2) - 10);

            doc.text(`• ${safeItem[0]}`, xPos, cursorY + (idx * lineHeight));
        });

        const boxOutlineY = cursorY - 15 + 9; // header bottom
        const boxOutlineH = (itemsPerCol * lineHeight) + 10;

        drawBoxOutline(boxOutlineY, boxOutlineH);

        cursorY += boxOutlineH + 15;
    }

    // ===== SECTION 5: TERMO DE RESPONSABILIDADE (LEFT ALIGN & PADDING) =====
    // Approx height needed for terms + sigs
    // Text approx 7 lines * 5 height = 35 + 40 sigs = ~80
    if (cursorY + 120 > pageHeight) {
        doc.addPage();
        cursorY = 30;
    }

    const termY = cursorY;
    drawSectionHeader("TERMO DE RESPONSABILIDADE DO MOTORISTA AUTÔNOMO", termY);
    let termContentY = termY + 14;

    const driverName = driver.fullName.toUpperCase();
    const driverCpf = formatCPF(driver.cpf);

    const legalText = `Eu, ${driverName}, portador da CNH nº ${driver.cnh}, CPF ${driverCpf} e RNTRC ${driver.ntrc}, declaro que:\n\nFui contratado pela empresa VIACARGO INTERMEDIAÇÃO LOGÍSTICA E TRANSPORTES LTDA, inscrita no CNPJ 54.826.258/0001-70, para realizar o transporte de bens móveis conforme ordem de serviço anexa.\n\nEstou ciente de que a VIACARGO atua apenas como intermediadora logística, não sendo responsável pela execução direta do transporte, sendo este de minha inteira responsabilidade.\n\nAssumo a responsabilidade integral pela carga desde o momento da coleta até a entrega, comprometendo-me com: a. Acondicionamento adequado dos bens; b. Condução segura e conforme a legislação vigente; c. Preservação dos itens transportados; d. Cumprimento do roteiro e do cronograma informado.\n\nComprometo-me a arcar com eventuais danos, extravios, perdas ou prejuízos decorrentes de conduta negligente, imprudente ou imperita durante a execução do transporte.\n\nReconheço que eventuais sinistros deverão ser imediatamente comunicados à VIACARGO, bem como à autoridade policial competente, caso aplicável. Por ser verdade, firmo o presente termo para que produza seus efeitos legais.\n\nEstou ciente de que imagens e registros fotográficos poderão ser solicitados antes, durante e após a prestação do serviço para fins de controle e segurança da operação.\n\nAfirmo que meus documentos estão válidos e regulares, e que possuo plenas condições técnicas e legais para a realização da atividade.`;

    doc.setFontSize(10); // Requested 10pt
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal");

    // Left Alignment + Padding
    // Box Width is CONTENT_WIDTH. 
    // Padding 4mm (approx 15px).
    const termTextWidth = CONTENT_WIDTH - 8; // 4mm each side
    const termLines = doc.splitTextToSize(legalText, termTextWidth);

    doc.text(termLines, MARGIN + 4, termContentY, { align: "left" });

    const textBlockHeight = termLines.length * 5; // spacing 1.15 approx with size 10

    termContentY += textBlockHeight + 15;

    // Signatures
    const sigY = termContentY + 25; // Added gap before signature line

    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5);
    // Driver Line
    doc.line(MARGIN + 10, sigY, pageWidth / 2 - 10, sigY);
    doc.setFontSize(8); doc.text("Assinatura do Motorista", MARGIN + 10, sigY + 5);

    // Issuer (Via Cargo)
    doc.text("Viacargo Soluções em logística (Emissor)", pageWidth / 2 + 20, sigY + 5);

    // Signature Image Handling
    if (signatureData) {
        try {
            // Draw ABOVE the line (Y - height - padding)
            // Assuming height 20, we draw at sigY - 25
            doc.addImage(signatureData, 'PNG', pageWidth / 2 + 25, sigY - 25, 40, 20);
        } catch (e) { }
    }

    // Outline Term
    drawBoxOutline(termY + 9, (sigY + 20) - (termY + 9));

    // Footer
    const pCount = doc.getNumberOfPages();
    for (let i = 1; i <= pCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        doc.text("VIACARGO SOLUÇÕES EM LOGÍSTICA - CNPJ: 54.826.258/0001-70", pageWidth / 2, pageHeight - 10, { align: "center" });
    }

    doc.save(`OS-${order.id}-Motorista.pdf`);
};

// --- PROFESSIONAL TEAM PDF GENERATOR (Refined Design) ---
export const generateTeamPDF = async (order: ServiceOrder, targetRole: PdfRoleTarget, targetName: string, customMessage?: string, teamOrderData?: TeamOrderData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Load images in parallel
    const [logoData, signatureData] = await Promise.all([
        getLogoBase64(),
        getSignatureBase64()
    ]);

    // 1. Page Background (Soft off-white for better harmony, not 100% stark white)
    doc.setFillColor(252, 252, 252);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let cursorY = 20;

    // Helper function to format phone number
    const formatPhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
        }
        return phone;
    };

    // Helper function to create bordered section (Refined)
    const createSection = (title: string, yPos: number, height: number) => {
        // Background for the section
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, yPos, contentWidth, height, 2, 2, 'FD');

        // Title background strip
        doc.setFillColor(241, 245, 249); // Slate-100 (Subtle gray-blue)
        doc.rect(margin, yPos, contentWidth, 8, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.rect(margin, yPos, contentWidth, 8, 'S'); // Border for title only

        // Title text
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(51, 65, 85); // Slate-700
        doc.text(title, pageWidth / 2, yPos + 5.5, { align: "center" });

        return yPos + 8; // Return position after title
    };

    // ===== HEADER =====
    // Logo
    if (logoData) {
        try {
            doc.addImage(logoData, 'PNG', margin, cursorY - 5, 25, 25, undefined, 'FAST');
        } catch (e) { }
    }

    // Company name
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138); // Professional blue
    doc.text("VIACARGO SOLUÇÕES EM LOGÍSTICA", margin + 30, cursorY + 5);

    // OS Number & Date (Right aligned)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text(`O.S. Nº: ${order.id}`, pageWidth - margin, cursorY, { align: "right" });

    doc.setFont("helvetica", "normal");
    const displayDate = teamOrderData?.workDate
        ? new Date(teamOrderData.workDate).toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR');
    doc.text(`Data: ${displayDate}`, pageWidth - margin, cursorY + 5, { align: "right" });

    cursorY += 35;

    // Main Title
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text("REGISTRO DE ORDEM DE SERVIÇO", pageWidth / 2, cursorY, { align: "center" });

    cursorY += 12;

    // ===== SECTION 1: DADOS DO CLIENTE =====
    const section1Height = 30; // Increased height for spacing
    const section1Y = createSection("DADOS DO CLIENTE", cursorY, section1Height);
    cursorY = section1Y + 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105); // Slate-600

    // Left column
    doc.text("Nome:", margin + 5, cursorY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(order.clientName, margin + 18, cursorY);

    // Right column - WhatsApp
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("WhatsApp:", pageWidth / 2 + 5, cursorY);
    doc.setFont("helvetica", "normal");
    const formattedPhone = formatPhone(order.whatsapp);
    doc.setTextColor(30, 58, 138); // Link color
    doc.text(formattedPhone, pageWidth / 2 + 25, cursorY);
    const phoneWidth = doc.getTextWidth(formattedPhone);
    doc.link(pageWidth / 2 + 25, cursorY - 3, phoneWidth, 4, { url: `https://wa.me/55${cleanPhone(order.whatsapp)}` });

    cursorY += 8;

    // Work location
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    const locationLabel = teamOrderData?.workLocation === 'origin' ? 'Endereço (Coleta):' : 'Endereço (Entrega):';
    const locationAddress = teamOrderData?.workLocation === 'origin' ? order.origin : order.destination;

    doc.text(locationLabel, margin + 5, cursorY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 58, 138); // Link blue
    const addressLines = doc.splitTextToSize(locationAddress, contentWidth - 45);
    doc.text(addressLines, margin + 40, cursorY);
    const addressWidth = Math.min(doc.getTextWidth(locationAddress), contentWidth - 45);
    doc.link(margin + 40, cursorY - 3, addressWidth, 4, { url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}` });

    cursorY += (addressLines.length * 4) + 12;

    // ===== SECTION 2: INFORMAÇÕES DA EQUIPE (Refined Kanban Box) =====
    if (teamOrderData) {
        // Kanban box background - softer yellow/amber
        doc.setFillColor(255, 252, 235); // Amber-50 (Very soft yellow)
        doc.setDrawColor(251, 191, 36); // Amber-400 (Border)
        doc.setLineWidth(1);
        doc.roundedRect(margin, cursorY, contentWidth, 36, 2, 2, 'FD'); // Slightly taller

        cursorY += 6;

        // Title within box
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 83, 9); // Amber-700
        doc.text("INFORMAÇÕES DA EQUIPE", pageWidth / 2, cursorY, { align: "center" });

        cursorY += 8;

        // Grid layout
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105); // Slate-600

        const col1X = margin + 8;
        const col2X = pageWidth / 2 + 8;

        // Row 1
        doc.setFont("helvetica", "bold");
        doc.text("Tipo de Serviço:", col1X, cursorY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42); // Slate-900
        doc.text(targetName.toUpperCase(), col1X + 30, cursorY);

        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "bold");
        doc.text("Quantidade:", col2X, cursorY);
        doc.setFont("helvetica", "bold"); // Bold for emphasis
        doc.setFontSize(11);
        doc.setTextColor(220, 38, 38); // Red-600
        doc.text(`${teamOrderData.quantity} profissionais`, col2X + 22, cursorY);

        cursorY += 7;

        // Row 2
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "bold");
        doc.text("Data:", col1X, cursorY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(new Date(teamOrderData.workDate).toLocaleDateString('pt-BR'), col1X + 10, cursorY);

        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "bold");
        doc.text("Horário no Local:", col2X, cursorY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(220, 38, 38); // Red-600
        doc.text(teamOrderData.scheduledTime, col2X + 32, cursorY);

        cursorY += 7;

        // Row 3 - Financials
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "bold");
        doc.text("Valor Unitário:", col1X, cursorY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(formatCurrency(teamOrderData.unitCost), col1X + 26, cursorY);

        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "bold");
        doc.text("Valor Total:", col2X, cursorY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(22, 163, 74); // Green-600
        doc.text(formatCurrency(teamOrderData.calculatedCost), col2X + 22, cursorY);

        cursorY += 15;
    }

    // ===== SECTION 3: LISTA DE ITENS / MÓVEIS (New Section) =====
    if (teamOrderData?.itemsList && teamOrderData.itemsList.trim().length > 0) {
        const items = doc.splitTextToSize(teamOrderData.itemsList, contentWidth - 15);
        const boxHeight = (items.length * 5) + 15;

        // Check page break
        if (cursorY + boxHeight > pageHeight - 40) {
            doc.addPage();
            doc.setFillColor(252, 252, 252);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            cursorY = 20;
        }

        const sectionItemsY = createSection("LISTA DE ITENS / MÓVEIS", cursorY, boxHeight);
        cursorY = sectionItemsY + 5;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text(items, margin + 5, cursorY);

        cursorY += boxHeight; // Move past the box
    }

    // ===== SECTION 4: INSTRUÇÕES ESPECIAIS (if any) =====
    if (customMessage && customMessage.trim().length > 0) {
        const splitNotes = doc.splitTextToSize(customMessage, contentWidth - 15);
        const boxHeight = (splitNotes.length * 5) + 15;

        if (cursorY + boxHeight > pageHeight - 40) {
            doc.addPage();
            doc.setFillColor(252, 252, 252);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            cursorY = 20;
        }

        const sectionNotesY = createSection("INSTRUÇÕES ESPECIAIS", cursorY, boxHeight);
        cursorY = sectionNotesY + 5;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59);
        doc.text(splitNotes, margin + 5, cursorY);

        cursorY += boxHeight;
    }

    // ===== SECTION 5: ORÇAMENTO =====
    if (cursorY + 40 > pageHeight - 40) {
        doc.addPage();
        doc.setFillColor(252, 252, 252);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        cursorY = 20;
    }

    const sectionBudgetY = createSection("ORÇAMENTO", cursorY, 25);
    cursorY = sectionBudgetY + 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);

    const paymentAmount = teamOrderData ? teamOrderData.calculatedCost : 0;

    doc.text("Valor do serviço:", margin + 5, cursorY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(paymentAmount), margin + 35, cursorY);

    cursorY += 6;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Valor total:", margin + 5, cursorY);
    doc.setFontSize(11);
    doc.setTextColor(22, 163, 74); // Green
    doc.text(formatCurrency(paymentAmount), margin + 35, cursorY);

    cursorY += 20;

    // ===== SIGNATURES =====
    // Ensure enough space for signature
    if (cursorY + 50 > pageHeight - 20) { // Increased buffer for safety
        doc.addPage();
        doc.setFillColor(252, 252, 252);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        cursorY = 40;
    } else {
        cursorY += 10;
    }

    const signatureLineY = cursorY + 30; // Increased spacing for the signature image area

    // Left signature line (Client)
    doc.setDrawColor(148, 163, 184); // Slate-400
    doc.setLineWidth(0.5);
    doc.line(margin + 10, signatureLineY, pageWidth / 2 - 10, signatureLineY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text("Assinatura Cliente", margin + 10, signatureLineY + 5);

    // Right signature line (Tech)
    doc.line(pageWidth / 2 + 10, signatureLineY, pageWidth - margin - 10, signatureLineY);
    doc.text("Assinatura Responsável Técnico", pageWidth / 2 + 10, signatureLineY + 5);

    // IMAGE SIGNATURE
    if (signatureData) {
        try {
            // Adjust dimensions as needed. Assuming landscape-ish signature.
            // Centered over the right line.
            const sigWidth = 40;
            const sigHeight = 20;
            const sigX = (pageWidth / 2 + 10) + ((pageWidth - margin - 10 - (pageWidth / 2 + 10)) / 2) - (sigWidth / 2);

            // Fixed Position ABOVE the line
            doc.addImage(signatureData, 'PNG', sigX, signatureLineY - 25, sigWidth, sigHeight, undefined, 'FAST');
        } catch (e) {
            // Fallback if image fails
            doc.setFont("times", "italic");
            doc.setFontSize(16);
            doc.setTextColor(30, 58, 138);
            doc.text("Viacargo Soluções em logística", pageWidth / 2 + 15, signatureLineY - 3);
        }
    } else {
        // Text fallback
        doc.setFont("times", "italic");
        doc.setFontSize(16);
        doc.setTextColor(30, 58, 138);
        doc.text("Viacargo Soluções em logística", pageWidth / 2 + 15, signatureLineY - 3);
    }

    // ===== FOOTER =====
    // Absolute bottom
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text("Este documento serve como ordem de execução de serviço. Endereços contêm links para mapas.", pageWidth / 2, pageHeight - 15, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text("CNPJ: 54.826.258/0001-70   |   Contato: (41) 8747-1778", pageWidth / 2, pageHeight - 10, { align: "center" });

    doc.save(`OS-${order.id}-${targetRole.toUpperCase()}.pdf`);
};