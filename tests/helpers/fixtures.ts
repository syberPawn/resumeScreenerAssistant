// Builds small real PDF and .docx files in memory, so extraction can be tested without sample files.

import { crc32 } from "node:zlib";

const encoder = new TextEncoder();

/** Splits text into lines short enough to stay inside the page, since text past the edge is not extracted. */
function wrap(text: string, width = 80): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** A minimal PDF with the given text on each page. */
export function buildPdf(pages: string[]): Uint8Array {
  const escape = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const objects: string[] = [];
  const pageIds: number[] = [];
  let id = 4;
  const pageObjects: string[] = [];
  for (const text of pages) {
    const pageId = id++;
    const contentId = id++;
    pageIds.push(pageId);
    const lines = wrap(text).map((line) => `(${escape(line)}) Tj T*`).join(" ");
    const stream = `BT /F1 10 Tf 12 TL 20 750 Td ${lines} ET`;
    pageObjects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
      `${contentId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    );
  }
  objects.push(
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    `2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((p) => `${p} 0 R`).join(" ")}] /Count ${pageIds.length} >>\nendobj\n`,
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    ...pageObjects,
  );

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const object of objects) {
    offsets.push(body.length);
    body += object;
  }
  const xrefStart = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return encoder.encode(body);
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
  /** Overrides the uncompressed size written in the central directory, to imitate a zip bomb. */
  declaredSize?: number;
}

/** A zip file with stored (uncompressed) entries. */
export function buildZip(entries: ZipEntry[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, entry.data.length, true);
    local.setUint32(22, entry.data.length, true);
    local.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(local.buffer), name, entry.data);

    const header = new DataView(new ArrayBuffer(46));
    header.setUint32(0, 0x02014b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, 20, true);
    header.setUint32(16, crc, true);
    header.setUint32(20, entry.data.length, true);
    header.setUint32(24, entry.declaredSize ?? entry.data.length, true);
    header.setUint16(28, name.length, true);
    header.setUint32(42, offset, true);
    central.push(new Uint8Array(header.buffer), name);

    offset += 30 + name.length + entry.data.length;
  }

  const centralSize = central.reduce((sum, c) => sum + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const result = new Uint8Array(all.reduce((sum, c) => sum + c.length, 0));
  let position = 0;
  for (const chunk of all) {
    result.set(chunk, position);
    position += chunk.length;
  }
  return result;
}

/** A minimal .docx file with one paragraph per item. */
export function buildDocx(paragraphs: string[], options: { declaredDocumentSize?: number } = {}): Uint8Array {
  const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  const document =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    paragraphs.map((p) => `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(p)}</w:t></w:r></w:p>`).join("") +
    "</w:body></w:document>";
  return buildZip([
    { name: "[Content_Types].xml", data: encoder.encode(contentTypes) },
    { name: "_rels/.rels", data: encoder.encode(rels) },
    { name: "word/document.xml", data: encoder.encode(document), declaredSize: options.declaredDocumentSize },
  ]);
}

/** A sample resume of about 70 words. */
export const SAMPLE_RESUME =
  "Priya Sharma, Senior Data Analyst, Bengaluru, India. Email priya.sharma@example.com, phone +91 98765 43210. " +
  "Six years of experience in SQL, Python, Tableau and statistical modelling. Led a team of four analysts at " +
  "Acme Retail, building weekly sales dashboards and demand forecasts that cut stock-outs by twelve percent. " +
  "Previously a business analyst at Northwind Traders. Bachelor of Technology in Computer Science. " +
  "Certified in Google Data Analytics. Skills include data cleaning, A/B testing, stakeholder communication and dbt.";

/** A sample job description of about 40 words. */
export const SAMPLE_JOB_DESCRIPTION =
  "We are hiring a Data Analyst to join our growth team. You will build dashboards, run A/B tests and work with " +
  "product managers. Required: strong SQL, Python and a visualisation tool such as Tableau or Power BI. " +
  "Preferred: experience with dbt and retail data.";
