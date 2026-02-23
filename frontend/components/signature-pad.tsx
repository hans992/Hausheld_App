"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Loader2, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (signatureBase64: string) => void;
  loading?: boolean;
  title?: string;
  submitLabel?: string;
}

export function SignaturePad({
  open,
  onClose,
  onSubmit,
  loading = false,
  title = "Unterschrift zur Schichtbeendigung",
  submitLabel = "Schicht beenden",
}: SignaturePadProps) {
  const canvasRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    canvasRef.current?.clear();
    setIsEmpty(true);
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    const dataUrl = canvas.toDataURL("image/png");
    // Strip data URL prefix to send raw base64 if backend expects it; otherwise send full data URL
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;
    onSubmit(base64);
  };

  const handleEnd = () => {
    setIsEmpty(canvasRef.current?.isEmpty() ?? true);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signature-pad-title"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 id="signature-pad-title" className="text-lg font-semibold">
          {title}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">
          Bitte unterschreiben Sie unten zur Bestätigung der erbrachten Leistung.
        </p>
        <div className="relative flex-1 overflow-hidden rounded-xl border bg-muted/30">
          <SignatureCanvas
            ref={canvasRef}
            canvasProps={{
              className: cn(
                "absolute left-0 top-0 h-full w-full touch-none rounded-xl",
                "min-h-[200px]"
              ),
            }}
            onEnd={handleEnd}
            backgroundColor="rgb(255, 255, 255)"
            penColor="rgb(0, 0, 0)"
          />
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleClear}
            disabled={isEmpty}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Löschen
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleSubmit}
            disabled={isEmpty || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
