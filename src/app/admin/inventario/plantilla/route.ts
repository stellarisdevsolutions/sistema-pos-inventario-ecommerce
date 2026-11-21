import { requireRole } from "@/lib/auth/session";
import { makeCatalogWorkbook } from "@/lib/catalog-workbook";

export async function GET() {
  try {
    await requireRole(["admin", "manager", "warehouse"]);
  } catch {
    return new Response(null, { status: 403 });
  }

  return new Response(new Uint8Array(await makeCatalogWorkbook()), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-productos.xlsx"',
      "Cache-Control": "private, no-store",
    },
  });
}
