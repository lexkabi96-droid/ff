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
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Terminal, 
  RefreshCw, 
  CheckCircle,
  HelpCircle,
  Clock,
  ExternalLink
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useStore } from "@/context/store-context"

interface MpesaDialogProps {
  customerName: string
  amount: string
  phone: string
  orderId?: string
}

export function MpesaDialog({ customerName, amount, phone, orderId }: MpesaDialogProps) {
  const { addPayment } = useStore()
  const { toast } = useToast()

  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'failed'>('form')
  
  // Active fields
  const [phoneVal, setPhoneVal] = useState(phone)
  const [amountVal, setAmountVal] = useState(amount.replace(/[^0-9.]/g, ""))

  // Transaction tracking Ref
  const [checkoutId, setCheckoutId] = useState("")
  const [statusMessage, setStatusMessage] = useState("Awaiting handshake on your device...")
  const [txRecord, setTxRecord] = useState<any>(null)
  const [simulatedMode, setSimulatedMode] = useState(true)

  // Polling ref/timer
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

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [])

  const startPolling = (checkoutRequestId: string) => {
    stopPolling()
    setStatusMessage("Safaricom push generated. Confirming checkout prompt on customer device...")

    // Polling interval check status every 2.5 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/mpesa/status?checkoutRequestId=${checkoutRequestId}`)
        if (res.ok) {
          const tx = await res.json()
          setTxRecord(tx)

          if (tx.status === "Completed") {
            stopPolling()
            setTxRecord(tx)
            
            // Mark payment as Completed in store context
            if (orderId) {
              addPayment({
                orderId: orderId,
                customerName: customerName,
                amount: `KES ${parseFloat(amountVal).toLocaleString()}`,
                phone: phoneVal,
                method: "M-Pesa"
              })
              
              toast({
                title: "Payment Credited",
                description: `Payment for Order ${orderId} received and verified successfully!`,
              })
            } else {
              toast({
                title: "Payment Received",
                description: `Safaricom confirmed receipt of KES ${parseFloat(amountVal).toLocaleString()}!`,
              })
            }
            setStep('success')
          } else if (tx.status === "Failed") {
            stopPolling()
            setStep('failed')
          }
        }
      } catch (err) {
        console.error("Polling error", err)
      }
    }, 2500)

    // Timeout polling after 90 seconds
    pollingTimeoutRef.current = setTimeout(() => {
      stopPolling()
      if (step === 'processing') {
        setStep('failed')
        setStatusMessage("The request timed out. Please try sending again.")
      }
    }, 90000)
  }

  const handleInitiate = async () => {
    setLoading(true)
    setStatusMessage("Establishing connection with Safaricom endpoints...")
    
    try {
      const res = await fetch("/api/mpesa/stk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: amountVal,
          phone: phoneVal,
          orderId: orderId || `PK-${Math.floor(1000 + Math.random() * 9000)}`,
          customerName: customerName
        })
      })

      if (!res.ok) {
        const errDetails = await res.json()
        throw new Error(errDetails.error || "Failed to trigger Daraja STK Push")
      }

      const data = await res.json()
      setCheckoutId(data.CheckoutRequestID)
      setSimulatedMode(!!data.simulated)
      setStep('processing')
      startPolling(data.CheckoutRequestID)

    } catch (error: any) {
      toast({
        title: "Daraja Connection Error",
        description: error.message || "Could not link with Safaricom node. Try using simulation mode.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Developer Simulator functions to push webhook results instantly
  const handleSimulateWebhook = async (status: 'Completed' | 'Failed', reason: string) => {
    if (!checkoutId) return
    setStatusMessage(`Broadcasting external simulated webhook: ${status}...`)

    try {
      const res = await fetch("/api/mpesa/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          checkoutRequestId: checkoutId,
          status,
          reason
        })
      })

      if (res.ok) {
        toast({
          title: "Simulator Dispatched",
          description: `Constructed standard webhook callback matching ${status} state successfully.`
        })
      }
    } catch (err: any) {
      console.error("Simulation trigger failed", err)
    }
  }

  const reset = () => {
    stopPolling()
    setIsOpen(false)
    setTimeout(() => {
      setStep('form')
      setCheckoutId("")
      setTxRecord(null)
    }, 300)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => {
      setIsOpen(val)
      if (!val) reset()
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-green-600 border-green-200 hover:bg-green-50/50 hover:text-green-700 font-semibold text-xs select-none">
          <CreditCard className="h-3.5 w-3.5 shrink-0" />
          Request M-Pesa
        </Button>
      </DialogTrigger>
      
      <DialogContent id="mpesa-modal" className="sm:max-w-[430px] rounded-2xl">
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-headline text-lg">
                <span className="h-6 w-6 rounded bg-emerald-500 text-white flex items-center justify-center font-bold text-xs font-mono">M</span>
                Lipa Na M-Pesa Connector
              </DialogTitle>
              <DialogDescription className="text-xs">
                Initiate a seamless Safaricom Lipa Na M-PESA STK Push payment prompt straight to the customer's mobile device.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="cust-phone-mpesa" className="text-xs font-semibold text-muted-foreground">Recipient Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="cust-phone-mpesa" 
                    value={phoneVal} 
                    onChange={(e) => setPhoneVal(e.target.value)} 
                    placeholder="e.g. 254712345678" 
                    className="pl-9 h-9" 
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-sans">
                  Use standard formats: <span className="font-mono">07xx...</span> or <span className="font-mono font-bold">+254...</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cust-amount-mpesa" className="text-xs font-semibold text-muted-foreground">Verification Amount (KES)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">KES</span>
                  <Input 
                    id="cust-amount-mpesa" 
                    value={amountVal} 
                    onChange={(e) => setAmountVal(e.target.value)} 
                    placeholder="e.g. 1000" 
                    className="pl-12 h-9 font-bold" 
                  />
                </div>
              </div>

              {orderId && (
                <div className="p-2.5 bg-accent/20 border rounded-lg text-xs leading-none flex justify-between select-none font-sans">
                  <span className="text-muted-foreground">Order Reference:</span>
                  <span className="font-mono font-bold text-foreground">{orderId}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                onClick={handleInitiate} 
                className="w-full bg-[#3FB13F] hover:bg-[#349234] text-white py-5 rounded-xl font-headline font-semibold flex items-center justify-center gap-2 shadow"
                disabled={loading || !phoneVal || !amountVal}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting to Daraja Node...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    Send STK PIN Push
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'processing' && (
          <div className="py-4 text-center space-y-6">
            <div className="relative inline-flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-emerald-100/50 flex items-center justify-center border border-emerald-200">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-secondary border-2 border-white flex items-center justify-center font-mono text-[9px] font-extrabold text-[#3FB13F]">
                STK
              </div>
            </div>

            <div className="space-y-1.5 max-w-xs mx-auto">
              <h3 className="font-headline font-bold text-base text-foreground">STK PIN Request Active</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {statusMessage}
              </p>
              <div className="text-[10px] font-mono text-muted-foreground bg-stone-50 p-1 rounded select-none border">
                ID: {checkoutId}
              </div>
            </div>

            {/* Simulated Live Mobile Frame Mock for intuitive PIN preview */}
            <div className="border rounded-2xl bg-slate-900 text-white p-3 max-w-[280px] mx-auto text-left shadow-lg scale-95 relative overflow-hidden font-sans">
              <div className="h-4 w-1 bg-white/10 mx-auto rounded-full mb-2" />
              <div className="bg-[#1C2C1C] border border-[#2D452D] rounded-xl p-3.5 space-y-3 relative">
                <div className="flex items-center gap-1.5 justify-between">
                  <span className="font-bold text-[10px] text-green-400 select-none uppercase tracking-wide">SIMULATED SAFARICOM STK SIM</span>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                
                <div className="space-y-1 text-xs text-slate-200">
                  <p className="font-bold leading-tight">Pay KES {parseFloat(amountVal).toLocaleString()} to LaunderSync Hub?</p>
                  <p className="text-[10px] text-slate-400 font-mono">Channel Paybill: 174379 Account: {orderId || "LaunderSync-PK"}</p>
                </div>

                <div className="flex gap-2 pt-1">
                  <div className="flex-1 bg-white/10 hover:bg-white/15 h-6 rounded flex items-center justify-center text-[10px] cursor-pointer font-bold select-none text-slate-300">
                    Cancel
                  </div>
                  <div className="flex-1 bg-green-600 hover:bg-green-700 h-6 rounded flex items-center justify-center text-[10px] text-white cursor-pointer font-bold select-none">
                    Enter PIN
                  </div>
                </div>
              </div>
            </div>

            {/* Sandbox Developer Callback Webhook simulator tool, fully accessible for local-test workflows */}
            <div className="p-3 bg-[#E8F5E9]/50 border border-emerald-100 rounded-xl space-y-2 text-left text-xs animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-green-800 flex items-center gap-1">
                  <Terminal className="h-3.5 w-3.5 text-green-700" />
                  STK sandbox web simulator
                </span>
                <span className="text-[9px] font-mono bg-green-100 px-1 border border-green-200 rounded text-green-700">DEBUG</span>
              </div>
              <p className="text-[11px] text-green-700 leading-tight">
                Simulate prompt callback outcomes to confirm successful transaction update without real credentials.
              </p>
              
              <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                <Button 
                  size="xs" 
                  variant="outline" 
                  onClick={() => handleSimulateWebhook("Completed", "Success")}
                  className="bg-white border-green-200 text-green-700 hover:bg-green-100 text-[10px] h-7 font-bold"
                >
                  Confirm (PIN OK)
                </Button>
                <Button 
                  size="xs" 
                  variant="outline" 
                  onClick={() => handleSimulateWebhook("Failed", "Cancelled")}
                  className="bg-white border-red-200 text-red-600 hover:bg-red-50 text-[10px] h-7 font-bold"
                >
                  Cancel (PIN Wrong)
                </Button>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground hover:text-foreground text-xs">
              Decline &amp; Terminate Link
            </Button>
          </div>
        )}

        {step === 'success' && (
          <div className="py-6 text-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm animate-bounce">
              <CheckCircle className="h-9 w-9" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-headline font-extrabold text-lg text-emerald-700">Receipt Authorized</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Excellent! Safaricom verified receipt of payment. Standard accounting ledgers successfully sync'ed.
              </p>
            </div>

            <div className="border rounded-xl p-3 bg-stone-50 text-xs text-left space-y-2 max-w-sm mx-auto font-sans leading-relaxed">
              <div className="flex justify-between font-bold text-gray-700 border-b border-dashed pb-2">
                <span>Receipt Ref:</span>
                <span className="font-mono text-emerald-600 text-sm">{txRecord?.mpesaReceiptNumber || "NLJ7RT7192"}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Safaricom Party A:</span>
                <span className="font-semibold text-foreground">{txRecord?.phone || phoneVal}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Amount Deposited:</span>
                <span className="font-extrabold text-primary">{txRecord?.amount || `KES ${parseFloat(amountVal).toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Timestamp:</span>
                <span className="font-semibold text-foreground truncate max-w-[140px]">{new Date().toLocaleString()}</span>
              </div>
            </div>

            <Button onClick={reset} className="w-full bg-[#3FB13F] hover:bg-[#349234] text-white py-5 rounded-xl font-headline font-semibold">
              Verify and Close
            </Button>
          </div>
        )}

        {step === 'failed' && (
          <div className="py-6 text-center space-y-5">
            <div className="h-14 w-14 rounded-full bg-red-50 text-red-500 border border-red-100 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-headline font-bold text-base text-red-800">Connection Failed</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                {txRecord?.resultDesc || "The verification transaction was cancelled, rejected, or didn't respond in time."}
              </p>
            </div>

            <div className="flex gap-2 font-sans pt-2">
              <Button onClick={() => setStep('form')} variant="outline" className="flex-1">
                Retry Attempt
              </Button>
              <Button onClick={reset} className="flex-1 bg-stone-900 hover:bg-stone-800 text-white">
                Close Panel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
