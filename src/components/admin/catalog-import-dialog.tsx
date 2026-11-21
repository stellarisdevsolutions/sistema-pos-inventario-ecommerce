"use client";

import { useState } from "react";
import { toast } from "sonner";
import { importCatalogAction } from "@/app/admin/actions/catalog-import";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function CatalogImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => Promise<void> }) {
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof importCatalogAction>>>();

  async function run(confirm: boolean) {
    if (!file || busy) return;
    setBusy(true);
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await importCatalogAction(data, confirm);
      setResult(response);
      if (confirm && response.success) {
        toast.success(`Se crearon ${response.count} productos o variantes`);
        onClose();
        await onImported();
      }
    } catch {
      setResult({ success: false, error: "No se pudo confirmar la respuesta. Valida el archivo de nuevo antes de reintentar." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="admin-panel max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar productos</DialogTitle>
          <DialogDescription>Carga productos nuevos y su stock de apertura desde la hoja Carga de la plantilla Excel.</DialogDescription>
        </DialogHeader>
        <label className="grid gap-2 text-sm">
          Archivo Excel
          <Input type="file" accept=".xlsx" disabled={busy} onChange={event => {
            setFile(event.target.files?.[0]);
            setResult(undefined);
          }} />
        </label>
        {result?.error && <p role="alert" className="text-sm text-admin-danger">{result.error}</p>}
        {result?.issues && (
          <ul role="alert" className="max-h-48 space-y-1 overflow-y-auto text-sm text-admin-danger">
            {result.issues.map((issue, index) => <li key={index}>Fila {issue.row}. {issue.message}</li>)}
          </ul>
        )}
        {result?.success && (
          <section className="space-y-2 text-sm" aria-label="Vista previa">
            <p className="font-semibold">{result.count} productos o variantes por crear</p>
            <ul className="max-h-48 divide-y divide-admin-card-border overflow-y-auto">
              {result.rows?.map(row => (
                <li key={row.row} className="py-1">
                  Fila {row.row} · {row.name}{row.variant && " — " + row.variant} · {row.stock} u.
                </li>
              ))}
            </ul>
          </section>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>Cerrar</Button>
          <Button disabled={!file || busy} onClick={() => void run(Boolean(result?.success))}>
            {busy ? "Procesando…" : result?.success ? "Confirmar alta" : "Validar archivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
