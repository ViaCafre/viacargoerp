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

// Helper to draw header
const drawHeader = (doc: jsPDF, pageWidth: number, title: string, orderId: string, logoData: string | null) => {
    doc.setFillColor(SECONDARY_COLOR);
    doc.rect(0, 0, pageWidth, 40, "F");

    // Logo - Positioned Top Left, properly sized
    if (logoData) {
        try {
            doc.addImage(logoData, 'PNG', 10, 5, 30, 30, undefined, 'FAST');
        } catch (e) {
            // Fallback if image fails
        }
    }

    // Company Text (Centered/Right shifted slightly due to Logo)
    doc.setTextColor("#FFFFFF");
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("VIACARGO TRANSPORTADORA", 50, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(PRIMARY_COLOR);
    doc.text("SOLUÇÕES EM LOGÍSTICA", 50, 26);

    // Meta Info (Right)
    doc.setTextColor("#FFFFFF");
    doc.setFontSize(10);
    doc.text(`OS: ${orderId}`, pageWidth - 20, 18, { align: "right" });
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 20, 24, { align: "right" });

    // Title Bar
    doc.setFillColor(PRIMARY_COLOR);
    doc.roundedRect(20, 35, pageWidth - 40, 14, 2, 2, "F");

    doc.setTextColor("#FFFFFF");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), pageWidth / 2, 43, { align: "center" });
};

// --- DRIVER PDF GENERATOR ---
export const generateDriverPDF = async (order: ServiceOrder, driver: DriverData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const logoData = await getLogoBase64();

    // 1. Header
    drawHeader(doc, pageWidth, "Ordem de Serviço de Transporte (OS)", order.id, logoData);

    let cursorY = 60;

    // 2. Driver Data Grid
    doc.setFontSize(10);
    doc.setTextColor(SECONDARY_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO MOTORISTA", 20, cursorY);
    doc.setDrawColor(200);
    doc.line(20, cursorY + 2, pageWidth - 20, cursorY + 2);
    cursorY += 8;

    // Driver Fields (2 Columns)
    const col1 = 20;
    const col2 = 110;
    const rowH = 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(TEXT_DARK);

    // Row 1
    doc.text(`Nome: ${driver.fullName}`, col1, cursorY);
    doc.text(`CPF: ${driver.cpf}`, col2, cursorY);
    cursorY += rowH;

    // Row 2
    doc.text(`CNH: ${driver.cnh}`, col1, cursorY);
    doc.text(`Categoria: ${driver.category}`, col2, cursorY);
    cursorY += rowH;

    // Row 3
    doc.text(`Validade CNH: ${new Date(driver.validity).toLocaleDateString('pt-BR')}`, col1, cursorY);
    doc.text(`Telefone: ${driver.phone}`, col2, cursorY);
    cursorY += rowH;

    // Row 4
    doc.text(`Veículo: ${driver.vehicle}`, col1, cursorY);
    doc.text(`Placa: ${driver.plate} (${driver.uf})`, col2, cursorY);
    cursorY += rowH;

    // Row 5
    doc.text(`RNTRC: ${driver.ntrc}`, col1, cursorY);
    cursorY += 12;

    // 3. Client & Operation Data (CLICKABLE LINKS ADDED)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(SECONDARY_COLOR);
    doc.text("DADOS DA OPERAÇÃO", 20, cursorY);
    doc.line(20, cursorY + 2, pageWidth - 20, cursorY + 2);
    cursorY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(TEXT_DARK);

    // Client Name
    doc.text(`Cliente: ${order.clientName}`, col1, cursorY);

    // WhatsApp (Clickable)
    if (order.whatsapp) {
        const waLabel = "WhatsApp: ";
        doc.text(waLabel, col2, cursorY);
        const waLabelWidth = doc.getTextWidth(waLabel);

        doc.setTextColor(PRIMARY_COLOR);
        doc.text(order.whatsapp, col2 + waLabelWidth, cursorY);
        const phoneWidth = doc.getTextWidth(order.whatsapp);
        doc.link(col2 + waLabelWidth, cursorY - 3, phoneWidth, 4, { url: `https://wa.me/55${cleanPhone(order.whatsapp)}` });

        doc.setTextColor(TEXT_DARK); // Reset
    }
    cursorY += rowH;

    // Origin (Clickable)
    const originLabel = "Origem: ";
    doc.text(originLabel, col1, cursorY);
    const originLabelWidth = doc.getTextWidth(originLabel);

    // Truncate if too long to keep link clean, or multiline (keeping simple for PDF)
    doc.setTextColor(0, 0, 255); // Blue link style hint
    doc.text(order.origin, col1 + originLabelWidth, cursorY);
    const originWidth = doc.getTextWidth(order.origin);
    doc.link(col1 + originLabelWidth, cursorY - 3, originWidth, 4, { url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.origin)}` });

    doc.setTextColor(TEXT_DARK);
    doc.text(`Data Coleta: ${new Date(order.pickupDate).toLocaleDateString('pt-BR')}`, col2, cursorY); // Moved to right to avoid overlap
    cursorY += rowH + 2;

    // Destination (Clickable)
    const destLabel = "Destino: ";
    doc.text(destLabel, col1, cursorY);
    const destLabelWidth = doc.getTextWidth(destLabel);

    doc.setTextColor(0, 0, 255);
    doc.text(order.destination, col1 + destLabelWidth, cursorY);
    const destWidth = doc.getTextWidth(order.destination);
    doc.link(col1 + destLabelWidth, cursorY - 3, destWidth, 4, { url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.destination)}` });

    doc.setTextColor(TEXT_DARK);
    doc.text(`Prev. Entrega: ${new Date(order.deliveryForecast).toLocaleDateString('pt-BR')}`, col2, cursorY);
    cursorY += 12;

    // 4. Inventory List (Optional)
    if (driver.inventoryList && driver.inventoryList.trim().length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(SECONDARY_COLOR);
        doc.text("LISTA DE ITENS", 20, cursorY);
        doc.line(20, cursorY + 2, pageWidth - 20, cursorY + 2);
        cursorY += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(TEXT_DARK);

        const splitItems = doc.splitTextToSize(driver.inventoryList, pageWidth - 40);
        doc.text(splitItems, 20, cursorY);

        // REDUCED SPACING HERE
        cursorY += (splitItems.length * 3.5) + 6;
    }

    // --- PAGINATION LOGIC FOR TERMO ---
    // Ensure we have enough space for the legal term (approx 130 units with spacing)
    // If not, add page.
    if (cursorY + 120 > pageHeight - 20) {
        doc.addPage();
        cursorY = 30; // Reset top margin
    }

    // 5. Termo de Responsabilidade (Improved Spacing)
    const termHeight = 110;
    doc.setFillColor(248, 250, 252); // Lighter background
    doc.rect(20, cursorY, pageWidth - 40, termHeight, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(20, cursorY, pageWidth - 40, termHeight, "S"); // Border

    let textY = cursorY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor("#000");
    doc.text("TERMO DE RESPONSABILIDADE DO MOTORISTA AUTÔNOMO", pageWidth / 2, textY, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8); // Slightly smaller to allow more line height
    textY += 10;

    const legalText = `Eu, ${driver.fullName}, portador da CNH nº ${driver.cnh}, CPF ${driver.cpf}, e RNTRC ${driver.ntrc}, declaro que:

1. Fui contratado pela empresa VIACARGO INTERMEDIAÇÃO LOGÍSTICA E TRANSPORTES LTDA, inscrita no CNPJ 54.826.258/0001-70, para realizar o transporte de bens móveis conforme ordem de serviço anexa.

2. Estou ciente de que a VIACARGO atua apenas como intermediadora logística, não sendo responsável pela execução direta do transporte, sendo este de minha inteira responsabilidade.

3. Assumo a responsabilidade integral pela carga desde o momento da coleta até a entrega, comprometendo-me com:
   a. Acondicionamento adequado dos bens;
   b. Condução segura e conforme a legislação vigente;
   c. Preservação dos itens transportados;
   d. Cumprimento do roteiro e do cronograma informado.

4. Comprometo-me a arcar com eventuais danos, extravios, perdas ou prejuízos decorrentes de conduta negligente, imprudente ou imperita durante a execução do transporte.

5. Reconheço que eventuais sinistros deverão ser imediatamente comunicados à VIACARGO, bem como à autoridade policial competente, caso aplicável.

6. Estou ciente de que imagens e registros fotográficos poderão ser solicitados antes, durante e após a prestação do serviço para fins de controle e segurança da operação.

7. Afirmo que meus documentos estão válidos e regulares, e que possuo plenas condições técnicas e legais para a realização da atividade.

Por ser verdade, firmo o presente termo para que produza seus efeitos legais.`;

    const splitLegal = doc.splitTextToSize(legalText, pageWidth - 50);
    // Manual text loop to control line height (leading)
    splitLegal.forEach((line: string) => {
        doc.text(line, 25, textY);
        textY += 4.5; // More spacing between lines
    });

    // 6. Signatures (Placed after Termo)
    cursorY += termHeight + 20;

    // -- DATE / LOCAL (More Space as requested) --
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Local e data: ___________________________________________________________`, 25, cursorY);
    cursorY += 30; // Increased spacing so signatures are not cramped

    // -- SIGNATURES ROW --
    const signatureLineY = cursorY;

    // Left: Driver (Manual)
    doc.setDrawColor(0);
    doc.line(25, signatureLineY, 90, signatureLineY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Assinatura do Motorista (Presencial)", 25, signatureLineY + 5);

    // Right: Via Cargo (Digital or Manual)
    doc.line(110, signatureLineY, 175, signatureLineY);
    doc.text("Via Cargo (Emissor)", 110, signatureLineY + 5);

    // Insert Digital Signature for Via Cargo if exists
    if (driver.issuerSignature) {
        try {
            // Place it slightly above the line
            // Assuming PNG for upload generally works with addImage default detection or forced type if simple
            doc.addImage(driver.issuerSignature, 'PNG', 115, signatureLineY - 20, 40, 18);
        } catch (e) {
            // Ignore
        }
    }

    // 7. CNH Image Page
    if (driver.cnhImage) {
        doc.addPage();
        drawHeader(doc, pageWidth, "ANEXO - CNH DIGITAL", order.id, logoData);

        try {
            // Fit image to page maintaining aspect ratio approx
            const imgProps = doc.getImageProperties(driver.cnhImage);
            const pdfWidth = pageWidth - 40;
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            doc.addImage(driver.cnhImage, 'JPEG', 20, 60, pdfWidth, pdfHeight);
        } catch (e) {
            doc.text("Erro ao renderizar imagem da CNH.", 20, 60);
        }
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(TEXT_LIGHT);
        doc.text("CNPJ: 54.826.258/0001-70   |   Contato: (41) 8747-1778", pageWidth / 2, pageHeight - 10, { align: "center" });
    }

    doc.save(`OS-${order.id}-Motorista.pdf`);
};

// --- GENERIC TEAM PDF GENERATOR ---
export const generateTeamPDF = async (order: ServiceOrder, targetRole: PdfRoleTarget, targetName: string, customMessage?: string, teamOrderData?: TeamOrderData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const logoData = await getLogoBase64();

    // 1. Header with Logo
    drawHeader(doc, pageWidth, `ORDEM DE SERVIÇO - ${targetRole.toUpperCase()}`, order.id, logoData);

    let cursorY = 65;

    // 1. CLIENTE INFO
    doc.setFontSize(10);
    doc.setTextColor(SECONDARY_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO CLIENTE", 20, cursorY);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, cursorY + 2, pageWidth - 20, cursorY + 2);
    cursorY += 10;

    doc.setTextColor(TEXT_DARK);
    doc.setFont("helvetica", "bold");
    doc.text(order.clientName, 20, cursorY);

    if (order.whatsapp) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(PRIMARY_COLOR);
        const whatsappText = `WhatsApp: ${order.whatsapp}`;
        const whatsappX = pageWidth - 20;
        doc.text(whatsappText, whatsappX, cursorY, { align: "right" });
        const textWidth = doc.getTextWidth(whatsappText);
        doc.link(whatsappX - textWidth, cursorY - 3, textWidth, 5, { url: `https://wa.me/55${cleanPhone(order.whatsapp)}` });
    }

    cursorY += 15;

    // 2. TEAM ORDER DETAILS (Quantity & Time)
    if (teamOrderData) {
        doc.setFillColor(241, 245, 249); // Light gray background
        doc.roundedRect(20, cursorY, pageWidth - 40, 28, 2, 2, "F");
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(20, cursorY, pageWidth - 40, 28, 2, 2, "S");

        doc.setFontSize(9);
        doc.setTextColor(TEXT_DARK);
        doc.setFont("helvetica", "bold");
        doc.text("DETALHES DA EQUIPE", 25, cursorY + 8);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(TEXT_LIGHT);

        const col1 = 25;
        const col2 = 110;

        doc.text(`Quantidade de Profissionais: ${teamOrderData.quantity}`, col1, cursorY + 15);
        doc.text(`Horário no Local: ${teamOrderData.scheduledTime}`, col2, cursorY + 15);

        doc.text(`Valor Unitário: ${formatCurrency(teamOrderData.unitCost)}`, col1, cursorY + 21);
        doc.text(`Valor Total: ${formatCurrency(teamOrderData.calculatedCost)}`, col2, cursorY + 21);

        cursorY += 38;
    }

    // 3. ROTA E LOGÍSTICA
    doc.setFontSize(10);
    doc.setTextColor(SECONDARY_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text("ROTA E CRONOGRAMA (Clique para abrir no Maps)", 20, cursorY);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, cursorY + 2, pageWidth - 20, cursorY + 2);
    cursorY += 15;

    // ORIGIN
    doc.setDrawColor(30, 58, 138); // Professional blue
    doc.setLineWidth(0.5);
    doc.circle(24, cursorY - 2, 2);

    doc.setTextColor(TEXT_LIGHT);
    doc.setFontSize(8);
    doc.text("ORIGEM / COLETA", 30, cursorY - 4);

    doc.setTextColor(TEXT_DARK);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(order.origin, 30, cursorY + 1);
    const originWidth = doc.getTextWidth(order.origin);
    doc.link(30, cursorY - 4, originWidth, 6, { url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.origin)}` });

    doc.setTextColor(TEXT_DARK);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(order.pickupDate).toLocaleDateString('pt-BR'), pageWidth - 20, cursorY, { align: "right" });

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(24, cursorY + 5, 24, cursorY + 20);

    cursorY += 25;

    // DESTINATION
    doc.setDrawColor(30, 58, 138);
    doc.circle(24, cursorY - 2, 2);

    doc.setTextColor(TEXT_LIGHT);
    doc.setFontSize(8);
    doc.text("DESTINO / ENTREGA", 30, cursorY - 4);

    doc.setTextColor(TEXT_DARK);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(order.destination, 30, cursorY + 1);
    const destWidth = doc.getTextWidth(order.destination);
    doc.link(30, cursorY - 4, destWidth, 6, { url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.destination)}` });

    doc.setTextColor(TEXT_DARK);
    doc.text(`Prev. Entrega: ${new Date(order.deliveryForecast).toLocaleDateString('pt-BR')}`, 110, cursorY);
    cursorY += 20;

    // 4. OBSERVAÇÕES
    if (customMessage && customMessage.trim().length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(SECONDARY_COLOR);
        doc.setFont("helvetica", "bold");
        doc.text("INSTRUÇÕES DA EQUIPE", 20, cursorY);
        doc.setDrawColor(200, 200, 200);
        doc.line(20, cursorY + 2, pageWidth - 20, cursorY + 2);
        cursorY += 10;

        const splitNotes = doc.splitTextToSize(customMessage, pageWidth - 50);
        const boxHeight = (splitNotes.length * 5) + 12;
        doc.setFillColor(254, 242, 242); // Light red background for important notes
        doc.roundedRect(20, cursorY - 4, pageWidth - 40, boxHeight, 2, 2, "F");
        doc.setTextColor("#dc2626"); // Red for important instructions
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(splitNotes, 25, cursorY + 4);
        cursorY += boxHeight + 10;
    } else {
        cursorY += 10;
    }

    // 5. FINANCIALS
    let paymentAmount = 0;
    let paymentLabel = "";

    if (teamOrderData) {
        // Use the calculated cost from team order data
        paymentAmount = teamOrderData.calculatedCost;
        paymentLabel = `SERVIÇOS (${targetName.toUpperCase()})`;
    } else {
        // Fallback to original calculation
        if (targetRole === 'motorista') {
            paymentAmount = order.financials.driverCost;
            paymentLabel = "FRETE (MOTORISTA)";
        } else {
            const extras = order.financials.extras.filter(e => {
                if (targetRole === 'geral') return true;
                if (targetRole === 'ajudante' && e.type === 'helper') return true;
                if (targetRole === 'montador' && e.type === 'assembler') return true;
                if (targetRole === 'embalador' && e.type === 'packer') return true;
                return false;
            });
            paymentAmount = extras.reduce((acc, curr) => acc + (curr.qty * curr.cost), 0);
            paymentLabel = `SERVIÇOS (${targetName.toUpperCase()})`;
        }
    }

    const boxY = cursorY + 5;
    if (boxY > 220) {
        doc.addPage();
        cursorY = 20;
    }

    // Professional payment box with ABNT styling
    doc.setFillColor(SECONDARY_COLOR);
    doc.roundedRect(20, boxY, pageWidth - 40, 30, 3, 3, "F");

    doc.setTextColor("#9ca3af"); // Light gray
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("VALOR A RECEBER / PAGAMENTO", 30, boxY + 10);

    doc.setTextColor("#FFFFFF");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(paymentLabel, 30, boxY + 18);

    doc.setTextColor(PRIMARY_COLOR);
    doc.setFontSize(20);
    doc.text(formatCurrency(paymentAmount), pageWidth - 30, boxY + 18, { align: "right" });

    // 6. SIGNATURE (TEAM/GENERIC)
    const signatureY = boxY + 55;
    doc.setDrawColor(TEXT_DARK);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 50, signatureY, pageWidth / 2 + 50, signatureY);

    doc.setTextColor(TEXT_DARK);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("RESPONSÁVEL OPERACIONAL", pageWidth / 2, signatureY + 5, { align: "center" });

    doc.setTextColor(SECONDARY_COLOR);
    doc.setFont("times", "italic");
    doc.setFontSize(18);
    doc.text("Viacargo Transportadora LTDA", pageWidth / 2, signatureY - 4, { align: "center" });

    // Footer with ABNT compliance
    doc.setTextColor(TEXT_LIGHT);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Este documento serve como ordem de execução de serviço. Endereços contêm links para mapas.", pageWidth / 2, pageHeight - 15, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("CNPJ: 54.826.258/0001-70   |   Contato: (41) 8747-1778", pageWidth / 2, pageHeight - 10, { align: "center" });

    doc.save(`OS-${order.id}-${targetRole.toUpperCase()}.pdf`);
};