import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";

export function QrCode({
  value,
  size = 224,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCodeLib.toDataURL(value, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#101426ff", light: "#ffffffff" },
    })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => setSrc(null));
    return () => {
      active = false;
    };
  }, [value, size]);

  return (
    <div
      className={`flex items-center justify-center rounded-xl bg-white p-3 ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="QR-Code des Tickets" className="h-full w-full" />
      ) : (
        <span className="text-xs text-neutral-500">QR-Code wird erstellt …</span>
      )}
    </div>
  );
}
