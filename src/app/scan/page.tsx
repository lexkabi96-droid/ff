'use client'

import * as React from 'react'
import Link from 'next/link'
import { useStore } from '@/context/store-context'
import { parseQrPayload } from '@/lib/qr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ScanLine,
  Camera,
  Keyboard,
  CheckCircle2,
  PackageCheck,
  ArrowLeft,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'

type ScanTarget =
  | { type: 'pickup'; id: string }
  | { type: 'order'; id: string }
  | { type: 'unknown'; id: string }

// Staff-facing QR scanner: verify pickups at the customer's door and
// drop-offs at handover. Scans FF:// payloads or plain order ids.
export default function ScanPage() {
  const { pickups, orders, updatePickupStatus, updateOrderStatus } = useStore()

  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const timerRef = React.useRef<number | null>(null)
  const handledRef = React.useRef(false)

  const [cameraActive, setCameraActive] = React.useState(false)
  const [cameraError, setCameraError] = React.useState('')
  const [manualCode, setManualCode] = React.useState('')
  const [target, setTarget] = React.useState<ScanTarget | null>(null)
  const [actionDone, setActionDone] = React.useState('')

  const stopCamera = React.useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(function (t) {
        t.stop()
      })
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  React.useEffect(() => stopCamera, [stopCamera])

  const handleCode = React.useCallback(
    (raw: string) => {
      if (handledRef.current) return
      const parsed = parseQrPayload(raw)
      if (!parsed) return
      handledRef.current = true
      stopCamera()
      if (parsed.kind === 'PICKUP') {
        setTarget(
          pickups.some((p) => p.id === parsed.id)
            ? { type: 'pickup', id: parsed.id }
            : { type: 'unknown', id: parsed.id }
        )
      } else {
        setTarget(
          orders.some((o) => o.id === parsed.id)
            ? { type: 'order', id: parsed.id }
            : { type: 'unknown', id: parsed.id }
        )
      }
    },
    [pickups, orders, stopCamera]
  )

  const startCamera = async () => {
    setCameraError('')
    setTarget(null)
    setActionDone('')
    handledRef.current = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      setCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      const Detector = (window as any).BarcodeDetector
      if (!Detector) {
        setCameraError(
          'Live scanning is not supported in this browser. Use the manual code box below.'
        )
        return
      }
      const detector = new Detector({ formats: ['qr_code'] })
      timerRef.current = window.setInterval(async () => {
        if (!videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes && codes.length > 0) {
            handleCode(codes[0].rawValue)
          }
        } catch {
          // frame not readable yet, keep trying
        }
      }, 350)
    } catch (err: any) {
      setCameraError(
        err && err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Enable it in browser settings or use the manual code box.'
          : 'Could not start the camera. Use the manual code box below.'
      )
      setCameraActive(false)
    }
  }

  const pickup =
    target && target.type === 'pickup' ? pickups.find((p) => p.id === target.id) : undefined
  const order =
    target && target.type === 'order' ? orders.find((o) => o.id === target.id) : undefined

  const confirmPickup = () => {
    if (!pickup) return
    updatePickupStatus(pickup.id, 'Completed')
    setActionDone('Pickup confirmed. An order was created and is now in progress.')
  }

  const markReady = () => {
    if (!order) return
    updateOrderStatus(order.id, 'ready')
    setActionDone('Order marked as ready for drop-off.')
  }

  const confirmDropOff = () => {
    if (!order) return
    updateOrderStatus(order.id, 'delivered')
    setActionDone('Drop-off confirmed. Order completed.')
  }

  const reset = () => {
    handledRef.current = false
    setTarget(null)
    setActionDone('')
    setManualCode('')
  }

  return (
    <div className="min-h-screen bg-stone-50 text-foreground py-10 px-4 md:px-6">
      <header className="max-w-xl mx-auto w-full text-center mb-6">
        <div className="flex justify-center items-center gap-2 mb-2">
          <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-md shadow-blue-500/10">
            <ScanLine className="h-6 w-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-primary font-headline">
            QR Verification
          </span>
        </div>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
          Scan at pickup and drop-off to confirm handover
        </p>
      </header>

      <main className="max-w-xl mx-auto w-full space-y-4">
        {!target && (
          <Card className="shadow-lg border bg-white/80 backdrop-blur-md rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold font-headline flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" /> Scan a code
              </CardTitle>
              <CardDescription>
                Point the camera at the customer&apos;s QR label, or type the booking code manually.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative rounded-xl overflow-hidden border bg-stone-900 aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  className={cameraActive ? 'h-full w-full object-cover' : 'hidden'}
                  playsInline
                  muted
                />
                {!cameraActive && (
                  <div className="text-stone-400 text-sm flex flex-col items-center gap-2">
                    <ScanLine className="h-8 w-8" />
                    Camera preview appears here
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 p-2.5 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>{cameraError}</span>
                </div>
              )}

              <Button
                onClick={cameraActive ? stopCamera : startCamera}
                className="w-full py-5 rounded-xl font-headline font-semibold gap-2"
              >
                {cameraActive ? 'Stop camera' : 'Start camera'}
              </Button>

              <div className="pt-2 border-t">
                <Label htmlFor="manual-code" className="flex items-center gap-1.5 mb-1.5">
                  <Keyboard className="h-4 w-4 text-muted-foreground" /> Manual entry
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="manual-code"
                    placeholder="PK-1001 or ORD-7301"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="bg-stone-50/50 font-mono"
                  />
                  <Button variant="outline" onClick={() => handleCode(manualCode)}>
                    Verify
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {target && target.type === 'unknown' && (
          <Card className="shadow-lg border bg-white rounded-2xl text-center py-8">
            <CardContent className="space-y-4">
              <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-200">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-extrabold font-headline">Code not recognised</h3>
              <p className="text-sm text-muted-foreground">
                No pickup or order matches <span className="font-mono font-semibold">{target.id}</span>.
              </p>
              <Button onClick={reset} variant="outline" className="rounded-xl gap-2">
                <RotateCcw className="h-4 w-4" /> Scan again
              </Button>
            </CardContent>
          </Card>
        )}

        {target && target.type === 'pickup' && pickup && (
          <Card className="shadow-lg border bg-white rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold font-headline flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-primary" /> Pickup verification
              </CardTitle>
              <CardDescription>Confirm collection at the customer&apos;s location.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-stone-50 border p-4 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking</span>
                  <span className="font-mono font-bold text-primary">{pickup.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-semibold">{pickup.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-semibold text-right max-w-[60%] truncate">{pickup.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slot</span>
                  <span className="font-semibold">{pickup.time} ({pickup.date})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="py-0 text-[10px]">{pickup.status}</Badge>
                </div>
              </div>
              {actionDone ? (
                <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{actionDone}</span>
                </div>
              ) : (
                <Button onClick={confirmPickup} className="w-full py-5 rounded-xl font-headline font-semibold gap-2">
                  <CheckCircle2 className="h-5 w-5" /> Confirm pickup collected
                </Button>
              )}
              <Button onClick={reset} variant="outline" className="w-full rounded-xl gap-2">
                <RotateCcw className="h-4 w-4" /> Scan next code
              </Button>
            </CardContent>
          </Card>
        )}

        {target && target.type === 'order' && order && (
          <Card className="shadow-lg border bg-white rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold font-headline flex items-center gap-2">
                <ScanLine className="h-5 w-5 text-primary" /> Drop-off verification
              </CardTitle>
              <CardDescription>Confirm the handover back to the customer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-stone-50 border p-4 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order</span>
                  <span className="font-mono font-bold text-primary">{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-semibold">{order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span className="font-semibold text-right max-w-[60%] truncate">{order.items}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-primary">{order.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <Badge variant={order.paid ? 'default' : 'outline'} className="py-0 text-[10px]">
                    {order.paid ? 'Paid' : 'Unpaid'}
                  </Badge>
                </div>
              </div>
              {actionDone ? (
                <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{actionDone}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button onClick={confirmDropOff} className="w-full py-5 rounded-xl font-headline font-semibold gap-2">
                    <CheckCircle2 className="h-5 w-5" /> Confirm drop-off delivered
                  </Button>
                  {order.status !== 'ready' && (
                    <Button onClick={markReady} variant="outline" className="w-full rounded-xl">
                      Mark as ready first
                    </Button>
                  )}
                </div>
              )}
              <Button onClick={reset} variant="outline" className="w-full rounded-xl gap-2">
                <RotateCcw className="h-4 w-4" /> Scan next code
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}
