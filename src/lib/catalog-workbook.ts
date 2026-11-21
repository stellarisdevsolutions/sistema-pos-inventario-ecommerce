import ExcelJS from "exceljs";
import { productDbInsertSchema, productFormSchema } from "@/lib/validations/product";
import type { CatalogEntry } from "@/db/operations/catalog";

const columns = ["Grupo", "Producto", "Nombre del selector", "Variante", "Color visual", "SKU", "Código de barras",
  "Precio (Bs)", "Stock inicial", "Costo inicial (Bs)"];
const examples = [
  ["", "Cable USB", "", "", "", "", "", 35, 8, 20],
  ["REM-BASICA", "Remera básica", "Talla y color", "S / Verde", "#2E7D32", "", "", 85, 4, 50],
  ["REM-BASICA", "Remera básica", "Talla y color", "M / Negro", "#171717", "REM-M-NEG", "", 85, 2, 50],
];

export const CATALOG_FILE_LIMIT = 512_000;
const ROW_LIMIT = 500;
export const catalogIdentity = (entry: { name: string; modelCode?: string | null; variant?: string | null }) =>
  entry.modelCode ? "model:" + entry.modelCode + ":" + entry.variant?.toLowerCase()
    : "product:" + entry.name.trim().toLowerCase().replace(/\s+/g, " ");

export async function makeCatalogWorkbook() {
  const workbook = new ExcelJS.Workbook();
  for (const name of ["Carga", "Ejemplos"]) {
    const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = columns.map((header, index) => ({ header, width: index === 1 ? 28 : 22 }));
    sheet.getRow(1).font = { bold: true };
    for (let column = 1; column <= 7; column++) sheet.getColumn(column).numFmt = "@";
    if (name === "Ejemplos") sheet.addRows(examples);
  }
  const instructions = workbook.addWorksheet("Instrucciones");
  instructions.getColumn(1).width = 100;
  instructions.addRows([
    ["Completa la hoja Carga. Las filas de Ejemplos sirven de referencia."],
    ["Producto y Precio son obligatorios. El archivo admite hasta 500 filas nuevas."],
    ["Usa el mismo Grupo para todas las variantes de un modelo. Escribe el mismo Nombre del selector en el grupo."],
    ["Para productos simples, deja Grupo, Nombre del selector, Variante y Color visual en blanco."],
    ["SKU vacío se completa automáticamente. Escribe el código de barras como texto para conservar ceros."],
    ["El stock y costo iniciales crean una apertura en Kárdex. Compras, ventas y ajustes se registran en el POS."],
  ]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// Check the ordinary ZIP directory before decompressing a small user-supplied XLSX.
function checkWorkbookArchive(bytes: ArrayBuffer) {
  const zip = Buffer.from(bytes);
  let end = zip.length - 22;
  while (end >= Math.max(0, zip.length - 65557) && zip.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < Math.max(0, zip.length - 65557) || zip.readUInt16LE(end + 4) !== 0 || zip.readUInt16LE(end + 6) !== 0) {
    throw new Error("El archivo debe ser un Excel .xlsx válido.");
  }
  const entries = zip.readUInt16LE(end + 10);
  let offset = zip.readUInt32LE(end + 16);
  let expandedSize = 0;
  if (entries > 100) throw new Error("El archivo Excel contiene demasiadas hojas o recursos.");
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > end || zip.readUInt32LE(offset) !== 0x02014b50) throw new Error("El archivo Excel está dañado.");
    expandedSize += zip.readUInt32LE(offset + 24);
    offset += 46 + zip.readUInt16LE(offset + 28) + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32);
  }
  if (expandedSize > 8_000_000) throw new Error("El archivo Excel supera el tamaño admitido.");
}

export async function readCatalogWorkbook(bytes: ArrayBuffer) {
  checkWorkbookArchive(bytes);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const sheet = workbook.getWorksheet("Carga");
  if (!sheet || columns.some((name, i) => sheet.getCell(1, i + 1).value !== name)) {
    throw new Error("Las columnas de la hoja Carga deben coincidir con la plantilla.");
  }
  if (sheet.rowCount > ROW_LIMIT + 1) throw new Error("Importa hasta 500 filas por archivo.");
  const entries: { row: number; entry: CatalogEntry }[] = [];
  const errors: { row: number; message: string }[] = [];
  for (let row = 2; row <= sheet.rowCount; row++) {
    const values = columns.map((_, index) => sheet.getCell(row, index + 1).value);
    if (values.every(value => value === null || value === "")) continue;
    if (values.some(value => value !== null && typeof value !== "string" && typeof value !== "number") || typeof values[6] === "number") {
      errors.push({ row, message: "Usa valores simples y escribe el código de barras como texto. Evita fórmulas." });
      continue;
    }
    const [modelCode, name, variantSelector, variant, variantColor, sku, barcode, price, stock, cost] =
      values.map(value => String(value ?? "").trim());
    const parsed = productFormSchema.safeParse({
      modelCode, name, variantSelector, variant, variantColor, sku, barcode, price, initialStock: stock || "0", costPrice: cost || "0",
    });
    if (!parsed.success) {
      errors.push({ row, message: parsed.error.issues[0].message });
      continue;
    }
    const entry = productDbInsertSchema.parse(parsed.data);
    entries.push({ row, entry: { ...entry, variantSelector: parsed.data.variantSelector || null, importKey: catalogIdentity(entry) } });
  }
  if (!entries.length && !errors.length) errors.push({ row: 2, message: "La hoja Carga está vacía." });
  return { entries, errors };
}
