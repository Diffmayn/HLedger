import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { cn } from '@/lib/utils'

export function QrCode({ value, size = 160, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string>('')
  useEffect(() => {
    let cancelled = false
    void QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: 'M' }).then((url) => {
      if (!cancelled) setSrc(url)
    })
    return () => {
      cancelled = true
    }
  }, [value, size])
  if (!src) return <div style={{ width: size, height: size }} className={cn('rounded-lg bg-surface-2', className)} />
  return <img src={src} width={size} height={size} alt={`QR code for ${value}`} className={cn('rounded-lg', className)} />
}
