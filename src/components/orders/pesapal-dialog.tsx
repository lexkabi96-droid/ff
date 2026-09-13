"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { 
  CreditCard, 
  Loader2, 
  Phone, 
  Mail,
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck,
  Terminal, 
  RefreshCw, 
  CheckCircle,
  ExternalLink,
  Smartphone,
  Landmark,
  Layers,
  ArrowRight
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useStore } from "@/context/store-context"

interface PesapalDialogProps {
  customerName: string
  amount: string
  phone: string
  orderId?: string
  customerEmail?: string
  triggerVariant?: "primary" | "outline" | "compact"
  embedded?: boolean
  onSuccess?: () => void
  onClose?: () => void
}

export function PesapalDialog({ 
  customerName, 
  amount, 
  phone, 
  orderId, 
  customerEmail = "customer@example.com",
  triggerVariant = "primary",
  embedded = false,
  onSuccess,
  onClose
}: PesapalDialogProps) {
  const { addPayment } = useStore()
  const { toast } = useToast()

  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'failed'>('form')

  // Form Fields
  const [nameVal, setNameVal] = useState(customerName)
  const [phoneVal, setPhoneVal] = useState(phone)
  const [emailVal, setEmailVal] = useState(customerEmail || `${customerName.toLowerCase().replace(/\s+/g, '')}@example.com`)
  const [amountVal, setAmountVal] = useState(amount.replace(/[^0-9.]/g, ""))
  const [selectedChannel, setSelectedChannel] = useState<'pesapal-all' | 'mpesa' | 'airtel' | 'card' | 'bank'>('pesapal-all')

  // Tracking state
  const [orderTrackingId, setOrderTrackingId] = useState("")
  const [merchantRef, setMerchantRef] = useState("")
  const [redirectUrl, setRedirectUrl] = useState("")
  const [statusMessage, setStatusMessage] = useState("Initializing Pesapal 3.0 secure payment gateway...")
  const [txRecord, setTxRecord] = useState<any>(null)
  const [isSimulated, setIsSimulated] = useState(true)

  // Polling management
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }
  }

  useEffect(() => {
    return () => stopPolling()
  }, [])

  const startPolling = (trackingId: string) => {
    stopPolling()
    setStatusMessage("Pesapal checkout initialized. Waiting for customer authorization...")

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pesapal/status?orderTrackingId=${trackingId}`)
        if (res.ok) {
          const tx = await res.json()
          setTxRecord(tx)

          if (tx.status === "Completed") {
            stopPolling()
            setTxRecord(tx)

            // Register payment in store
            if (orderId) {
              addPayment({
                orderId: orderId,
                customerName: nameVal,
                amount: `KES ${parseFloat(amountVal).toLocaleString()}`,
                phone: phoneVal,
                method: "Pesapal",
                status: "Completed",
                transactionRef: tx.confirmationCode || `PESA-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
              })

              toast({
                title: "Pesapal Payment Authorized",
                description: `Received KES ${parseFloat(amountVal).toLocaleString()} via Pesapal (${tx.paymentMethod || 'Multi-Option'}). Order ${orderId} marked as Paid!`,
              })
              if (onSuccess) {
                onSuccess()
              }
            }

            setStep('success')
          } else if (tx.status === "Failed") {
            stopPolling()
            setStep('failed')
          }
        }
      } catch (err) {
        console.error("Polling error in Pesapal dialog", err)
      }
    }, 2500)

    // 2 minute timeout
    pollingTimeoutRef.current = setTimeout(() => {
      stopPolling()
      if (step === 'processing') {
        setStep('failed')
        setStatusMessage("Payment session timed out. Please retry.")
      }
    }, 120000)
  }

  const handleCreateOrder = async () => {
    setLoading(true)
    setStatusMessage("Connecting to Pesapal 3.0 API service...")

    try {
      const channelLabels: Record<string, string> = {
        'pesapal-all': 'Pesapal Multi-Gateway',
        'mpesa': 'M-Pesa (via Pesapal)',
        'airtel': 'Airtel Money (via Pesapal)',
        'card': 'Visa / Mastercard',
        'bank': 'Bank Transfer (EFT)'
      }

      const res = await fetch("/api/pesapal/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
          amount: amountVal,
          customerName: nameVal,
          customerEmail: emailVal,
          customerPhone: phoneVal,
          description: `Cleaning charge for Order ${orderId || 'Direct'}`,
          paymentMethod: channelLabels[selectedChannel] || 'Pesapal'
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to initialize Pesapal order")
      }

      const data = await res.json()
      setOrderTrackingId(data.order_tracking_id)
      setMerchantRef(data.merchant_reference)
      setRedirectUrl(data.redirect_url)
      setIsSimulated(Boolean(data.simulated))
      setStep('processing')
      startPolling(data.order_tracking_id)
    } catch (err: any) {
      toast({
        title: "Pesapal Connection Error",
        description: err.message || "Failed to initiate payment session with Pesapal",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSimulateWebhook = async (status: 'Completed' | 'Failed', method: string, reason?: string) => {
    if (!orderTrackingId) return
    setStatusMessage(`Broadcasting simulated Pesapal IPN callback: ${status}...`)

    try {
      const res = await fetch("/api/pesapal/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderTrackingId,
          status,
          paymentMethod: method,
          failureReason: reason
        })
      })

      if (res.ok) {
        toast({
          title: "Pesapal Callback Triggered",
          description: `Constructed webhook notification: ${status} via ${method}.`
        })
      }
    } catch (err) {
      console.error("Simulation failed", err)
    }
  }

  const reset = () => {
    stopPolling()
    setIsOpen(false)
    if (onClose) onClose()
    setTimeout(() => {
      setStep('form')
      setOrderTrackingId("")
      setTxRecord(null)
    }, 300)
  }

  const portalContent = (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      {/* Pesapal Brand Header */}
      <div className="bg-[#003459] text-white p-5 space-y-1 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#00A8E8] text-white flex items-center justify-center font-black text-sm font-mono shadow-sm">
              P
            </div>
            <div>
              <h2 className="font-headline font-bold text-base tracking-tight leading-none">
                Pesapal Pay 3.0
              </h2>
              <span className="text-[10px] text-sky-200 tracking-wide">East Africa Unified Payment Gateway</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-sky-200 bg-white/10 px-2 py-0.5 rounded-full">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span>PCI-DSS Verified</span>
          </div>
        </div>
      </div>

        <div className="p-5">
          {step === 'form' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Choose a preferred channel or route through Pesapal&apos;s unified multi-option hosted gateway.
                </p>
              </div>

              {/* Supported Payment Channels Grid */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Select Payment Channel</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedChannel('pesapal-all')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      selectedChannel === 'pesapal-all' 
                        ? 'border-[#007EA7] bg-[#007EA7]/10 ring-1 ring-[#007EA7]' 
                        : 'border-border hover:bg-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Layers className="h-4 w-4 text-[#007EA7]" />
                      <span className="text-[9px] bg-[#007EA7] text-white px-1 rounded font-bold">ALL</span>
                    </div>
                    <span className="text-xs font-bold text-foreground mt-2 leading-tight">Multi-Option</span>
                    <span className="text-[10px] text-muted-foreground">Customer chooses</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedChannel('mpesa')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      selectedChannel === 'mpesa' 
                        ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600' 
                        : 'border-border hover:bg-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Smartphone className="h-4 w-4 text-emerald-600" />
                      <span className="text-[9px] bg-emerald-600 text-white px-1 rounded font-bold">M-PESA</span>
                    </div>
                    <span className="text-xs font-bold text-foreground mt-2 leading-tight">M-Pesa STK</span>
                    <span className="text-[10px] text-muted-foreground">Safaricom Push</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedChannel('card')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      selectedChannel === 'card' 
                        ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' 
                        : 'border-border hover:bg-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <CreditCard className="h-4 w-4 text-indigo-600" />
                      <span className="text-[9px] bg-indigo-600 text-white px-1 rounded font-bold">CARD</span>
                    </div>
                    <span className="text-xs font-bold text-foreground mt-2 leading-tight">Visa / Master</span>
                    <span className="text-[10px] text-muted-foreground">3D-Secure</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedChannel('airtel')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      selectedChannel === 'airtel' 
                        ? 'border-red-600 bg-red-50 ring-1 ring-red-600' 
                        : 'border-border hover:bg-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Smartphone className="h-4 w-4 text-red-600" />
                      <span className="text-[9px] bg-red-600 text-white px-1 rounded font-bold">AIRTEL</span>
                    </div>
                    <span className="text-xs font-bold text-foreground mt-2 leading-tight">Airtel Money</span>
                    <span className="text-[10px] text-muted-foreground">Kenya Prompt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedChannel('bank')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all sm:col-span-2 ${
                      selectedChannel === 'bank' 
                        ? 'border-sky-700 bg-sky-50 ring-1 ring-sky-700' 
                        : 'border-border hover:bg-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Landmark className="h-4 w-4 text-sky-700" />
                      <span className="text-[9px] bg-sky-700 text-white px-1 rounded font-bold">EFT / RTGS</span>
                    </div>
                    <span className="text-xs font-bold text-foreground mt-1 leading-tight">Direct Bank Transfer</span>
                    <span className="text-[10px] text-muted-foreground">Kenyan Commercial Banks</span>
                  </button>
                </div>
              </div>

              {/* Recipient details */}
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Customer Name</Label>
                    <Input 
                      value={nameVal} 
                      onChange={(e) => setNameVal(e.target.value)} 
                      className="h-8 text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Mobile (Party A)</Label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input 
                        value={phoneVal} 
                        onChange={(e) => setPhoneVal(e.target.value)} 
                        className="pl-8 h-8 text-xs font-mono" 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Billing Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input 
                        value={emailVal} 
                        onChange={(e) => setEmailVal(e.target.value)} 
                        className="pl-8 h-8 text-xs" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Amount (KES)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-muted-foreground">KES</span>
                      <Input 
                        value={amountVal} 
                        onChange={(e) => setAmountVal(e.target.value)} 
                        className="pl-11 h-8 text-xs font-bold font-mono" 
                      />
                    </div>
                  </div>
                </div>

                {orderId && (
                  <div className="p-2 bg-slate-50 border rounded-lg text-xs flex justify-between items-center text-slate-700">
                    <span className="text-muted-foreground">Merchant Order Ref:</span>
                    <span className="font-mono font-bold">{orderId}</span>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button 
                  onClick={handleCreateOrder}
                  className="w-full bg-[#007EA7] hover:bg-[#006687] text-white py-5 rounded-xl font-headline font-semibold flex items-center justify-center gap-2 shadow"
                  disabled={loading || !amountVal || !phoneVal}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Establishing Pesapal Session...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      Launch Pesapal Gateway (KES {parseFloat(amountVal || "0").toLocaleString()})
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 'processing' && (
            <div className="space-y-5 text-center py-2">
              <div className="relative inline-flex items-center justify-center">
                <div className="h-14 w-14 rounded-full bg-sky-100 flex items-center justify-center border border-sky-200">
                  <Loader2 className="h-7 w-7 animate-spin text-[#007EA7]" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#003459] text-white border-2 border-white flex items-center justify-center font-mono text-[9px] font-bold">
                  v3
                </div>
              </div>

              <div className="space-y-1 max-w-xs mx-auto">
                <h3 className="font-headline font-bold text-base text-foreground">Pesapal Gateway Handshake Active</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {statusMessage}
                </p>
                <div className="text-[10px] font-mono text-muted-foreground bg-slate-100 p-1 rounded border">
                  Tracking ID: {orderTrackingId}
                </div>
              </div>

              {/* Realistic Pesapal Express Checkout Simulation View */}
              <div className="border border-sky-200 rounded-xl bg-white text-left p-3.5 shadow-sm space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-dashed">
                  <div className="flex items-center gap-1.5">
                    <span className="h-5 w-5 rounded bg-[#007EA7] text-white flex items-center justify-center font-bold text-[10px]">P</span>
                    <span className="font-bold text-slate-800 text-xs">Pesapal Express Pay</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                    Live Session
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Order Reference:</span>
                  <span className="font-mono font-bold text-foreground">{merchantRef || orderId}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Amount to Authorize:</span>
                  <span className="font-extrabold text-[#007EA7] text-sm font-mono">
                    KES {parseFloat(amountVal).toLocaleString()}
                  </span>
                </div>

                <div className="p-2 bg-sky-50 rounded-lg text-[11px] text-sky-800 flex items-center justify-between">
                  <span>Authorized Customer:</span>
                  <span className="font-semibold">{nameVal} ({phoneVal})</span>
                </div>
              </div>

              {/* Developer Testing / Simulation Webhook Triggers */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-left text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                    <Terminal className="h-3.5 w-3.5 text-[#007EA7]" />
                    Pesapal IPN Webhook Simulator
                  </span>
                  <span className="text-[9px] font-mono bg-sky-100 text-sky-800 px-1 border border-sky-200 rounded">SANDBOX</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Simulate instantaneous provider callback notifications across Pesapal&apos;s payment routes:
                </p>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <Button 
                    size="xs" 
                    variant="outline"
                    onClick={() => handleSimulateWebhook("Completed", "M-Pesa (via Pesapal)")}
                    className="bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-[10px] h-7 font-bold"
                  >
                    M-Pesa OK
                  </Button>
                  <Button 
                    size="xs" 
                    variant="outline"
                    onClick={() => handleSimulateWebhook("Completed", "Visa / Mastercard (3D Secure)")}
                    className="bg-white border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-[10px] h-7 font-bold"
                  >
                    Card 3D-OK
                  </Button>
                  <Button 
                    size="xs" 
                    variant="outline"
                    onClick={() => handleSimulateWebhook("Completed", "Airtel Money")}
                    className="bg-white border-red-300 text-red-700 hover:bg-red-50 text-[10px] h-7 font-bold"
                  >
                    Airtel OK
                  </Button>
                </div>

                <div className="pt-1">
                  <Button 
                    size="xs" 
                    variant="outline"
                    onClick={() => handleSimulateWebhook("Failed", "Pesapal Gateway", "User cancelled transaction in Pesapal checkout")}
                    className="w-full bg-white border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px] h-6"
                  >
                    Simulate Payment Declined
                  </Button>
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground hover:text-foreground text-xs">
                Cancel &amp; Terminate Session
              </Button>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-5 text-center py-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm animate-bounce">
                <CheckCircle className="h-9 w-9" />
              </div>

              <div className="space-y-1">
                <h3 className="font-headline font-extrabold text-lg text-emerald-800">
                  Pesapal Payment Confirmed
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  The transaction was successfully verified and registered through the Pesapal payment gateway.
                </p>
              </div>

              <div className="border rounded-xl p-3 bg-slate-50 text-xs text-left space-y-2 max-w-sm mx-auto font-sans leading-relaxed">
                <div className="flex justify-between font-bold text-slate-800 border-b border-dashed pb-2">
                  <span>Pesapal Ref:</span>
                  <span className="font-mono text-[#007EA7] text-sm">
                    {txRecord?.confirmationCode || "PESA-4921-CONF"}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Channel Processed:</span>
                  <span className="font-semibold text-foreground">{txRecord?.paymentMethod || "Multi-Option (Pesapal)"}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Total Credited:</span>
                  <span className="font-extrabold text-[#007EA7]">
                    KES {parseFloat(amountVal).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Order Ref:</span>
                  <span className="font-mono text-foreground font-semibold">{merchantRef || orderId}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Timestamp:</span>
                  <span className="text-foreground">{new Date().toLocaleString()}</span>
                </div>
              </div>

              <Button onClick={reset} className="w-full bg-[#007EA7] hover:bg-[#006687] text-white py-5 rounded-xl font-headline font-semibold shadow">
                Done &amp; Update Ledger
              </Button>
            </div>
          )}

          {step === 'failed' && (
            <div className="space-y-4 text-center py-4">
              <div className="h-14 w-14 rounded-full bg-red-50 text-red-500 border border-red-100 flex items-center justify-center mx-auto shadow-sm">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>

              <div className="space-y-1">
                <h3 className="font-headline font-bold text-base text-red-800">Payment Authorization Failed</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  {statusMessage || "The Pesapal transaction could not be completed or was cancelled."}
                </p>
              </div>

              <div className="flex gap-2 font-sans pt-2">
                <Button onClick={() => setStep('form')} variant="outline" className="flex-1">
                  Try Again
                </Button>
                <Button onClick={reset} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white">
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>
    </div>
  )

  if (embedded) {
    return portalContent
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => {
      setIsOpen(val)
      if (!val) reset()
    }}>
      <DialogTrigger asChild>
        {triggerVariant === "primary" ? (
          <Button 
            className="w-full py-5 bg-[#007EA7] hover:bg-[#006687] text-white flex items-center justify-between px-4 font-headline text-sm font-bold shadow rounded-xl"
          >
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded bg-white text-[#007EA7] flex items-center justify-center font-black text-xs font-mono">P</span>
              <span>Pesapal 3.0 Multi-Gateway</span>
            </div>
            <div className="flex items-center gap-1.5 opacity-90 text-[10px] font-sans font-normal bg-white/15 px-2 py-0.5 rounded-full">
              <span>M-Pesa</span>
              <span>•</span>
              <span>Cards</span>
              <span>•</span>
              <span>Airtel</span>
            </div>
          </Button>
        ) : triggerVariant === "compact" ? (
          <Button 
            size="xs" 
            variant="outline" 
            className="gap-1.5 text-[#007EA7] border-[#007EA7]/30 hover:bg-[#007EA7]/10 font-semibold text-xs select-none"
          >
            <span className="h-4 w-4 rounded-full bg-[#007EA7] text-white flex items-center justify-center font-bold text-[9px] font-mono">P</span>
            Pesapal Pay
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 text-[#007EA7] border-[#007EA7]/30 hover:bg-[#007EA7]/10 font-semibold text-xs select-none"
          >
            <span className="h-4 w-4 rounded-full bg-[#007EA7] text-white flex items-center justify-center font-bold text-[9px] font-mono">P</span>
            Pay via Pesapal
          </Button>
        )}
      </DialogTrigger>

      <DialogContent id="pesapal-modal" className="sm:max-w-[480px] rounded-2xl p-0 overflow-hidden">
        {portalContent}
      </DialogContent>
    </Dialog>
  )
}
