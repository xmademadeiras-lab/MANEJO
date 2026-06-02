/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NfeImportResult, NfeItem } from "../types";

/**
 * Extracts a text list of elements by tag name or returns a default
 */
function getTagText(element: Document | Element, tagName: string, defaultValue = ""): string {
  const list = element.getElementsByTagName(tagName);
  if (list && list.length > 0) {
    return list[0].textContent || defaultValue;
  }
  return defaultValue;
}

/**
 * Parses XML text of standard Brazilian NF-e or a custom representation
 */
export function parseNfeXml(xmlText: string): NfeImportResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  // Check for parsing errors
  const parserError = xmlDoc.getElementsByTagName("parsererror");
  if (parserError.length > 0) {
    throw new Error("Formato de XML inválido ou corrompido.");
  }

  // 1. Get NF Number
  let numeroNfe = getTagText(xmlDoc, "nNF");
  if (!numeroNfe) {
    numeroNfe = getTagText(xmlDoc, "numero"); // fallback
  }
  if (!numeroNfe) {
    throw new Error("Não foi possível localizar o número da NF-e (tag <nNF> ou <numero>).");
  }

  // 2. Access key (Chave de acesso)
  let chaveAcesso = "";
  const infNfe = xmlDoc.getElementsByTagName("infNfe")[0];
  if (infNfe) {
    chaveAcesso = infNfe.getAttribute("Id")?.replace("NFe", "") || "";
  }
  if (!chaveAcesso) {
    chaveAcesso = getTagText(xmlDoc, "chNFe");
  }

  // 3. Emission Date
  let dataEmissao = getTagText(xmlDoc, "dhEmi");
  if (!dataEmissao) {
    dataEmissao = getTagText(xmlDoc, "dEmi");
  }
  if (!dataEmissao) {
    dataEmissao = getTagText(xmlDoc, "data");
  }
  if (!dataEmissao) {
    dataEmissao = new Date().toISOString().split("T")[0]; // fallback to today
  } else {
    // Keep just the date if it has time
    if (dataEmissao.includes("T")) {
      dataEmissao = dataEmissao.split("T")[0];
    }
  }

  // 4. Issuer (Emitente) & Recipient (Destinatário)
  let emitenteNome = "";
  const emitEl = xmlDoc.getElementsByTagName("emit")[0];
  if (emitEl) {
    emitenteNome = getTagText(emitEl, "xNome") || getTagText(emitEl, "razao");
  } else {
    emitenteNome = getTagText(xmlDoc, "emitente");
  }

  let destinatarioNome = "";
  const destEl = xmlDoc.getElementsByTagName("dest")[0];
  if (destEl) {
    destinatarioNome = getTagText(destEl, "xNome") || getTagText(destEl, "razao");
  } else {
    destinatarioNome = getTagText(xmlDoc, "destinatario");
  }

  if (!emitenteNome) emitenteNome = "Emitente Desconhecido";
  if (!destinatarioNome) destinatarioNome = "Destinatário Desconhecido";

  // 5. Invoice Items (<det>)
  const detList = xmlDoc.getElementsByTagName("det");
  const items: NfeItem[] = [];

  if (detList && detList.length > 0) {
    for (let i = 0; i < detList.length; i++) {
      const det = detList[i];
      const prod = det.getElementsByTagName("prod")[0];
      if (prod) {
        const xProd = getTagText(prod, "xProd") || "Espécie não identificada";
        const qComStr = getTagText(prod, "qCom") || getTagText(prod, "qTrib") || "0";
        const volume = parseFloat(qComStr);

        // Detect species name based on common brazilian wood structures
        const especie = cleanSpeciesName(xProd);

        items.push({
          especie,
          volume: isNaN(volume) ? 0 : volume,
          dono: "", // will match or select later
          valido: volume > 0,
        });
      }
    }
  } else {
    // Maybe checking a simplified custom structure or general <item> tag
    const itemElements = xmlDoc.getElementsByTagName("item");
    if (itemElements && itemElements.length > 0) {
      for (let i = 0; i < itemElements.length; i++) {
        const itemEl = itemElements[i];
        const especie = getTagText(itemEl, "especie") || getTagText(itemEl, "nome") || "Madeira";
        const volumeStr = getTagText(itemEl, "volume") || getTagText(itemEl, "quantidade") || "0";
        const volume = parseFloat(volumeStr);
        const dono = getTagText(itemEl, "dono") || "";

        items.push({
          especie,
          volume: isNaN(volume) ? 0 : volume,
          dono,
          valido: volume > 0,
        });
      }
    }
  }

  if (items.length === 0) {
    throw new Error("Nenhum item de madeira ou volume foi localizado na NF-e.");
  }

  return {
    numeroNfe,
    chaveAcesso,
    dataEmissao,
    emitenteNome,
    destinatarioNome,
    items,
  };
}

/**
 * Clears product descriptions to map to possible forest species
 */
export function cleanSpeciesName(xProd: string): string {
  const text = xProd.toUpperCase().trim();
  
  // Quick mapping table for standard Brazilian wood species
  const commonSpecies = [
    "IPE", "IPÊ", "JATOBA", "JATOBÁ", "CEDRO", "ANGELIM", "CUMARU", 
    "SAPELE", "ROXINHO", "MARACATIARA", "MACAÚBA", "FREIJO", "FREIJÓ",
    "GARAPA", "MASSARANDUBA", "PINUS", "EUCALIPTO", "TAUARI", "ITAÚBA",
    "SUCUPIRA", "MOGNO", "CURUPIXA", "CEDRELA"
  ];

  for (const s of commonSpecies) {
    if (text.includes(s)) {
      // Return beautiful accented or formatted standard name
      if (s === "IPE") return "Ipê";
      if (s === "JATOBA") return "Jatobá";
      if (s === "FREIJO") return "Freijó";
      if (s === "MACAÚBA") return "Macaúba";
      if (s === "JATOBÁ") return "Jatobá";
      if (s === "IPÊ") return "Ipê";
      if (s === "ITAÚBA") return "Itaúba";
      
      // Default formatting: Capitalize First Letter
      const formatted = s.charAt(0) + s.slice(1).toLowerCase();
      if (formatted === "Angelim") return "Angelim-pedra"; // common fallback
      return formatted;
    }
  }

  // If no match, try to extract the second block if it is segmented by dashes or spaces
  // Or just return a clean string
  const cleanStr = xProd
    .replace(/(MADEIRA|SERRADA|EM TORA|TORAS|VIGA|PRANCHA|BLOCO|RIPAS|RIPADO|SARRAFO|PRANCHETA|M3|M³)/gi, "")
    .replace(/[^a-zA-ZÁ-ú\s-]/g, "")
    .trim();

  if (cleanStr.length > 2) {
    return cleanStr.charAt(0).toUpperCase() + cleanStr.slice(1).toLowerCase();
  }

  return xProd;
}

/**
 * Generates sample xml strings so users can simulate uploads easily
 */
export function generateSampleNfeXml(params: {
  numero: string;
  emitente: string;
  destinatario: string;
  items: { especie: string; volume: number }[];
}): string {
  const dateStr = new Date().toISOString();
  
  let itemsXml = "";
  params.items.forEach((item, index) => {
    itemsXml += `
    <det nItem="${index + 1}">
      <prod>
        <cProd>PROD-${100 + index}</cProd>
        <xProd>MADEIRA SERRADA - ${item.especie.toUpperCase()}</xProd>
        <NCM>44072990</NCM>
        <CFOP>6102</CFOP>
        <uCom>M3</uCom>
        <qCom>${item.volume.toFixed(4)}</qCom>
        <vUnCom>1850.00</vUnCom>
        <vProd>${(item.volume * 1850).toFixed(2)}</vProd>
      </prod>
    </det>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNfe Id="NFe312606012345678901235500100000${params.numero.padStart(6, "0")}1000000010" versao="4.00">
      <ide>
        <cUF>31</cUF>
        <cNF>12345678</cNF>
        <natOp>Venda de Producao do Estabelecimento</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>${params.numero}</nNF>
        <dhEmi>${dateStr}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>2</idDest>
        <cMunFG>3106200</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>0</cDV>
        <tpAmb>1</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>3.10</verProc>
      </ide>
      <emit>
        <CNPJ>12345678000199</CNPJ>
        <xNome>${params.emitente}</xNome>
        <enderEmit>
          <xLgr>Av Central</xLgr>
          <n>100</n>
          <xBairro>Centro</xBairro>
          <cMun>3106200</cMun>
          <xMun>Belo Horizonte</xMun>
          <UF>MG</UF>
        </enderEmit>
      </emit>
      <dest>
        <CNPJ>98765432000188</CNPJ>
        <xNome>${params.destinatario}</xNome>
        <enderDest>
          <xLgr>Rodovia Flora BR-163</xLgr>
          <n>KM 240</n>
          <xBairro>Distrito Industrial</xBairro>
          <cMun>1505106</cMun>
          <xMun>Santarém</xMun>
          <UF>PA</UF>
        </enderDest>
      </dest>
      ${itemsXml}
    </infNfe>
  </NFe>
</nfeProc>`;
}

/**
 * Generates sample AUTEX database JSON or mock xml for import
 */
export function generateSampleAutexXml(params: {
  numero: string;
  detentores: string[];
  items: { especie: string; volume: number; dono: string }[];
}): string {
  let xmlItems = "";
  params.items.forEach((item, idx) => {
    xmlItems += `
    <item id="${idx + 1}">
      <especie>${item.especie}</especie>
      <volumeAutorizado>${item.volume}</volumeAutorizado>
      <dono>${item.dono}</dono>
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<autex>
  <numero>${params.numero}</numero>
  <descricao>Autorizacao de Exploracao Florestal de Exemplo</descricao>
  <detentores>
    ${params.detentores.map(d => `<dono>${d}</dono>`).join("\n    ")}
  </detentores>
  <items>
    ${xmlItems}
  </items>
</autex>`;
}
