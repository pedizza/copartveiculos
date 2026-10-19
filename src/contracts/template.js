import {COMPANY} from '../../public/shared/company.js';

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const formatDateLong = (value) => {
  if (!value) {
    return "";
  }

  const stringValue = String(value).trim();
  const normalizedValue = /^\d{4}-\d{2}-\d{2}/.test(stringValue)
    ? `${stringValue.slice(0, 10)}T12:00:00`
    : value;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo"
  }).format(date);
};

const buildSignatureText = (fullName, style = "cursive") => {
  const name = String(fullName || "").trim();
  const parts = name.split(/\s+/).filter(Boolean);

  if (style === "abbrev-cursive") {
    if (parts.length <= 1) {
      return name;
    }

    const [firstName, ...rest] = parts;
    const initials = rest.map((part) => `${part[0].toUpperCase()}.`).join(" ");
    return `${firstName} ${initials}`.trim();
  }

  return name;
};

const formatCompanySignatureText = (value) => {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  return text;
};

const getSignatureClass = (style = "cursive") => {
  if (style === "hand") {
    return "signature-style-hand";
  }

  if (style === "abbrev-cursive") {
    return "signature-style-abbrev-cursive";
  }

  return "signature-style-cursive";
};

const formatSignatureHash = (value, fallback) => escapeHtml(String(value || fallback || "-"));

export const renderAcquisitionContractHtml = (contract) => {
  const sellerSignatureText = escapeHtml(
    formatCompanySignatureText(contract.sellerSignatureText || contract.sellerName || COMPANY.legalName)
  );
  const clientSignatureText = escapeHtml(
    contract.clientSignedAt
      ? contract.clientSignatureText ||
          buildSignatureText(contract.clientName, contract.clientSignatureStyle || "cursive")
      : "ASSINATURA DIGITAL DO CLIENTE"
  );
  const clientSignatureStyleClass = getSignatureClass(contract.clientSignatureStyle || "cursive");
  const sellerSignatureStyleClass = getSignatureClass("hand");
  const sellerSignatureHash = formatSignatureHash(contract.sellerSignatureHash, `sig_${String(contract.publicToken || "seller").slice(-8)}`);
  const clientSignatureHash = contract.clientSignedAt
    ? formatSignatureHash(contract.clientSignatureHash, `sig_${String(contract.publicToken || "client").slice(0, 8)}`)
    : "PENDENTE DE ASSINATURA";
  const documentationAmount = contract.documentationValue === null || contract.documentationValue === undefined || contract.documentationValue === ""
    ? "________________________"
    : formatCurrency(contract.documentationValue);

  return `
    <article class="contract-document">
      <header class="contract-document__header">
        <div class="contract-document__brand">
          <img src="${COMPANY.logoUrl}" alt="${COMPANY.name}" />
          <div>
            <strong>${COMPANY.name}</strong>
            <span>LEILÕES E INTERMEDIAÇÕES</span>
          </div>
        </div>

        <div class="contract-document__meta">
          <p class="contract-eyebrow">TERMO PARTICULAR COM ASSINATURA ELETRÔNICA</p>
          <h1>TERMO DE AQUISIÇÃO</h1>
        </div>

        <p class="contract-lead">
          Este termo esclarece as responsabilidades e os compromissos de ambas as partes. As partes declaram que este instrumento é válido e reconhecido para os fins a que se destina.
        </p>
      </header>

      <section class="contract-section">
        <h2>VENDEDOR</h2>
        <p><strong>${escapeHtml(contract.sellerName || COMPANY.legalName)}</strong><br />CNPJ: <strong>${COMPANY.cnpj}</strong><br />Endereço: <strong>${COMPANY.address}</strong></p>
        <p>Por meio deste instrumento, as partes identificadas celebram o presente TERMO DE AQUISIÇÃO, regido pelas cláusulas e condições a seguir.</p>
      </section>

      <section class="contract-section">
        <h2>COMPRADOR</h2>
        <p>Nome: <strong>${escapeHtml(contract.clientName || "-")}</strong> &nbsp; Telefone: <strong>${escapeHtml(contract.clientPhone || "-")}</strong><br />CPF: <strong>${escapeHtml(contract.clientCpf || "-")}</strong> &nbsp; RG: <strong>${escapeHtml(contract.clientRg || "-")}</strong><br />Endereço: <strong>${escapeHtml(contract.clientAddress || "-")}</strong><br />E-mail: <strong>${escapeHtml(contract.clientEmail || "-")}</strong></p>
        <p>As informações pessoais do comprador anexadas neste documento foram solicitadas pelo consultor e confirmadas pelo comprador, e são protegidas pela Lei Geral de Proteção de Dados (LGPD).</p>
      </section>

      <section class="contract-section">
        <h2>DO OBJETO</h2>
        <p>
          1.1. O objeto deste contrato é o veículo descrito abaixo:<br />
          Veículo: <strong>${escapeHtml([contract.vehicleName, contract.vehicleModel].filter(Boolean).join(" / ") || "-")}</strong><br />
          Ano: <strong>${escapeHtml(contract.vehicleYear || "-")}</strong><br />
          Cor: <strong>${escapeHtml(contract.vehicleColor || "-")}</strong><br />
          Placa: <strong>${escapeHtml(contract.vehiclePlate || "-")}</strong><br />
          Renavam: <strong>${escapeHtml(contract.vehicleRenavam || "-")}</strong>
        </p>
        ${contract.vehicleDescription ? `<p class="contract-vehicle-description">${escapeHtml(contract.vehicleDescription)}</p>` : ""}
      </section>

      <section class="contract-section">
        <h2>DO PRAZO E DA FORMA DE PAGAMENTO</h2>
        <p>2.1. O pagamento deverá ser realizado impreterivelmente até o vencimento da ordem gerada pelo sistema, via TED, PIX ou depósito, na forma ajustada entre as partes.</p>
        <p>VALOR TOTAL: <strong>${formatCurrency(contract.amountValue)}${contract.amountText ? ` (${escapeHtml(contract.amountText)})` : ""}</strong><br />FORMA DE PAGAMENTO: <strong>${escapeHtml(contract.paymentMethod || "-")}</strong><br />CONDIÇÕES: <strong>${escapeHtml(contract.paymentNotes || "-")}</strong></p>
      </section>

      <section class="contract-section">
        <h2>DAS OBRIGAÇÕES E PENDÊNCIAS</h2>
        <p>3.1. O VENDEDOR compromete-se a entregar ao COMPRADOR o documento de registro do veículo, devidamente assinado e com as formalidades legais, no ato da entrega do bem.</p>
        <p>3.2. A transferência da propriedade será de responsabilidade do COMPRADOR, que arcará com os custos de regularização documental. O valor das despesas de documentação e processamento administrativo será de <strong>${documentationAmount}</strong>. A taxa administrativa e afins serão apuradas proporcionalmente, observando o valor promocional vigente do veículo adquirido e os critérios internos da empresa.</p>
        <p>3.3. O veículo será entregue em perfeitas condições e possui garantia de 6 (seis) meses de motor e câmbio. O veículo corresponde às respectivas fotos e aos anúncios publicitários divulgados pela empresa.</p>
        <p>3.4. O prazo de entrega será estabelecido pelo VENDEDOR conforme a demanda da empresa.${contract.deliveryDate ? ` Previsão informada: <strong>${escapeHtml(formatDateLong(contract.deliveryDate))}</strong>.` : ""}${contract.deliveryAddress ? ` Endereço de entrega informado: <strong>${escapeHtml(contract.deliveryAddress)}</strong>.` : ""}</p>
      </section>

      <section class="contract-section">
        <h2>DA RESCISÃO, DESISTÊNCIA E MULTA</h2>
        <p>4.1. Em caso de atraso no pagamento de qualquer parcela, incidirá multa moratória de 2% (dois por cento) sobre o valor da parcela em atraso, acrescida de juros de mora de 1% (um por cento) ao mês, calculados proporcionalmente ao período de atraso, desde o vencimento até a quitação.</p>
        <p>4.2. O inadimplemento de qualquer obrigação assumida neste contrato facultará ao VENDEDOR considerá-lo rescindido de pleno direito, independentemente de notificação judicial, podendo promover a retomada do veículo, sem prejuízo da cobrança de multa compensatória de 30% (trinta por cento) sobre o valor total do contrato, além das parcelas vencidas, juros, multas e demais encargos devidos.</p>
      </section>

      <section class="contract-section">
        <h2>DAS DISPOSIÇÕES GERAIS</h2>
        <p>5.1. Em caso de falecimento de qualquer das partes, seus herdeiros deverão cumprir o contrato até sua conclusão.</p>
        <p>5.2. As partes declaram que leram e compreenderam todas as cláusulas, aceitando os termos deste instrumento.</p>
      </section>

      <section class="contract-section">
        <h2>DO FORO</h2>
        <p>6.1. Fica eleito o foro da Comarca de São Paulo/SP para dirimir dúvidas ou litígios decorrentes deste contrato, podendo o VENDEDOR optar por outro foro, caso assim deseje.</p>
      </section>

      <section class="contract-section contract-section--signatures">
        <p class="contract-place">${COMPANY.city.toUpperCase()} - ${COMPANY.state}, <strong>${escapeHtml(formatDateLong(contract.createdAt || new Date()))}</strong>.</p>

        <div class="contract-signature-grid">
          <div class="contract-signature">
            <div class="contract-signature__line ${sellerSignatureStyleClass}">
              ${sellerSignatureText}
            </div>
            <strong>${escapeHtml(contract.sellerName || COMPANY.legalName)}</strong>
            <span>VENDEDOR</span>
            <small class="contract-signature__hash">HASH DE SEGURANÇA: ${sellerSignatureHash}</small>
          </div>

          <div class="contract-signature">
            <div class="contract-signature__line ${clientSignatureStyleClass}">
              ${clientSignatureText}
            </div>
            <strong>${escapeHtml(contract.clientName || "CLIENTE")}</strong>
            <span>COMPRADOR</span>
            <small class="contract-signature__hash">HASH DE SEGURANÇA: ${clientSignatureHash}</small>
          </div>
        </div>
      </section>
    </article>
  `;
};
