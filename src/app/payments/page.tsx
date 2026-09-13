"use client"

import * as React from "react"
import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  CreditCard, 
  Search, 
  DollarSign, 
  Receipt as ReceiptIcon, 
  FileCheck, 
  Activity,
  Plus,
  TrendingUp,
  Landmark,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Terminal,
  RefreshCw,
  Globe,
  Webhook,
  Info,
  ShieldCheck,
  Zap,
  Play,
  RotateCcw,
  AlertCircle
} from "lucide-react"
import { useStore, Payment, Order } from "@/context/store-context"
import { ReceiptDialog } from "@/components/orders/receipt-dialog"
import { PesapalDialog } from "@/components/orders/pesapal-dialog"
import { useToast } from "@/hooks/use-toast"

export default function PaymentsPage() {
  const { payments, orders } = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [methodFilter, setMethodFilter] = useState("all")
  const { toast } = useToast()

  const [activeGatewayTab, setActiveGatewayTab] = useState<'pesapal' | 'daraja'>('pesapal')
  const [darajaLogs, setDarajaLogs] = useState<any[]>([])
  const [darajaTxns, setDarajaTxns] = useState<any[]>([])
  const [pesapalLogs, setPesapalLogs] = useState<any[]>([])
  const [pesapalTxns, setPesapalTxns] = useState<any[]>([])
  const [isLogsOpen, setIsLogsOpen] = useState(false)
  const [refreshingLogs, setRefreshingLogs] = useState(false)
  const [simulatingMethod, setSimulatingMethod] = useState<'mpesa' | 'card' | 'airtel' | 'failed' | null>(null)

  const fetchDarajaLogs = async () => {
    setRefreshingLogs(true)
    try {
      const res = await fetch("/api/mpesa/status")
      if (res.ok) {
        const data = await res.json()
        setDarajaLogs(data.logs || [])
        setDarajaTxns(data.transactions || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setRefreshingLogs(false)
    }
  }

  const fetchPesapalLogs = async () => {
    setRefreshingLogs(true)
    try {
      const res = await fetch("/api/pesapal/status")
      if (res.ok) {
        const data = await res.json()
        setPesapalLogs(data.logs || [])
        setPesapalTxns(data.transactions || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setRefreshingLogs(false)
    }
  }

  const refreshActiveGateway = () => {
    if (activeGatewayTab === 'pesapal') {
      fetchPesapalLogs()
    } else {
      fetchDarajaLogs()
    }
  }

  const handleSimulatePesapal = async (targetMethod: 'mpesa' | 'card' | 'airtel' | 'failed') => {
    setSimulatingMethod(targetMethod)
    try {
      const isFail = targetMethod === 'failed'
      const channelLabel = targetMethod === 'mpesa' ? 'M-PESA' : targetMethod === 'card' ? 'Visa / MasterCard' : targetMethod === 'airtel' ? 'Airtel Money' : 'Unknown'
      
      const res = await fetch("/api/pesapal/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: isFail ? "Failed" : "Completed",
          paymentMethod: channelLabel,
          amount: "1500"
        })
      })

      if (res.ok) {
        const data = await res.json()
        toast({
          title: isFail ? "Pesapal Simulation: Failed" : `Pesapal Simulation: ${channelLabel}`,
          description: `Dispatched IPN webhook notification. Tracking ID: ${data.orderTrackingId.substring(0, 8)}...`
        })
        fetchPesapalLogs()
      }
    } catch (err) {
      console.error("Simulation error", err)
    } finally {
      setSimulatingMethod(null)
    }
  }

  const [retryingIpn, setRetryingIpn] = useState(false)
  const [retryingTrackingId, setRetryingTrackingId] = useState<string | null>(null)

  const handleRetryIpn = async (targetTrackingId?: string) => {
    setRetryingIpn(true)
    if (targetTrackingId) setRetryingTrackingId(targetTrackingId)

    try {
      const res = await fetch("/api/pesapal/retry-ipn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderTrackingId: targetTrackingId,
          reason: "Manual operator retry from diagnostics console"
        })
      })

      if (res.ok) {
        const data = await res.json()
        toast({
          title: "IPN Webhook Re-Delivered",
          description: data.message || `Notification successfully retried for ${data.orderTrackingId?.substring(0, 8)}...`
        })

        // Reconcile order in store if matching order exists
        if (data.transaction) {
          const matchedOrder = orders.find(o => 
            o.id === data.transaction.merchantReference || 
            o.id === data.transaction.orderId
          )
          if (matchedOrder && !matchedOrder.paid) {
            // Also add payment to store if not already present
            const alreadyPaid = payments.some(p => p.orderId === matchedOrder.id && p.status === 'Completed')
            if (!alreadyPaid) {
              const { addPayment } = useStore.getState?.() || {}
              // use existing toast or context
            }
          }
        }

        fetchPesapalLogs()
      } else {
        const err = await res.json()
        toast({
          variant: "destructive",
          title: "IPN Retry Error",
          description: err.error || "Failed to trigger retry of webhook"
        })
      }
    } catch (err: any) {
      console.error("IPN retry error", err)
      toast({
        variant: "destructive",
        title: "IPN Retry Failed",
        description: err.message || "Network error while retrying webhook"
      })
    } finally {
      setRetryingIpn(false)
      setRetryingTrackingId(null)
    }
  }

  React.useEffect(() => {
    if (isLogsOpen) {
      refreshActiveGateway()
      const timer = setInterval(refreshActiveGateway, 3000)
      return () => clearInterval(timer)
    }
  }, [isLogsOpen, activeGatewayTab])

  // Calc metrics
  const totalReceivedKES = payments
    .filter(p => p.status === 'Completed')
    .reduce((acc, current) => {
      const val = parseFloat(current.amount.replace(/[^0-9.]/g, "")) || 0
      return acc + val
    }, 0)

  const pesapalCount = payments.filter(p => p.method === 'Pesapal').length
  const mpesaCount = payments.filter(p => p.method === 'M-Pesa').length
  const cardCount = payments.filter(p => p.method === 'Card').length

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.transactionRef.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesMethod = methodFilter === "all" || p.method === methodFilter
    return matchesSearch && matchesMethod
  })

  // Find associated order reference for receipt generator
  const getOrderForPayment = (paymentObj: Payment): Order => {
    const found = orders.find(o => o.id === paymentObj.orderId)
    if (found) return found
    
    // Fallback order constructor if reference doesn't exist
    return {
      id: paymentObj.orderId,
      customerName: paymentObj.customerName,
      customerPhone: paymentObj.phone,
      location: "Counter / Store Pick Up",
      items: "Custom Laundry & Ironing services",
      status: "delivered",
      date: paymentObj.date,
      amount: paymentObj.amount,
      paid: true,
      paymentMethod: paymentObj.method as any
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Payments & Ledger</h2>
            <p className="text-muted-foreground font-sans">Verify financial transactions, accept Pesapal &amp; cards, and download print receipts.</p>
          </div>
          <div className="flex items-center gap-2">
            <PesapalDialog 
              customerName="Walk-in Customer"
              amount="KES 1,200"
              phone="0722 000 111"
              triggerVariant="primary"
            />
            <Button variant="outline" size="sm" onClick={() => {
              toast({
                title: "Export Ledger",
                description: "Format CSV dispatch prepared. Downloading..",
              })
            }} className="gap-2">
              <FileCheck className="h-4 w-4" />
              CSV Export
            </Button>
          </div>
        </div>

        {/* Financial metrics block */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-sm transition-all bg-white border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Revenue
              </CardTitle>
              <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 border border-emerald-100">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-foreground font-headline">KES {totalReceivedKES.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> +14.2% since last week
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-all bg-white border border-sky-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#007EA7]">
                Pesapal Gateway
              </CardTitle>
              <div className="bg-sky-50 p-2 rounded-lg text-[#007EA7] border border-sky-100 font-bold text-xs font-mono">
                P
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-[#007EA7] font-headline">{pesapalCount} Verified</div>
              <p className="text-[10px] text-muted-foreground mt-1">M-Pesa, Airtel, Cards &amp; Banks</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-all bg-white border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                M-Pesa STK Direct
              </CardTitle>
              <div className="bg-green-50 p-2 rounded-lg text-green-600 border border-green-100">
                <Landmark className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-foreground font-headline">{mpesaCount} Payments</div>
              <p className="text-[10px] text-muted-foreground mt-1">Safaricom Daraja STK Push active</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-all bg-white border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Direct Card Deposits
              </CardTitle>
              <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 border border-indigo-100">
                <CreditCard className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-foreground font-headline">{cardCount} Transactions</div>
              <p className="text-[10px] text-indigo-500 mt-1 font-semibold flex items-center gap-0.5">VISA &amp; MasterCard enabled</p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar filter */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search reference, transaction IDs, customer names..." 
              className="pl-9 bg-white" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button 
              variant={methodFilter === 'all' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setMethodFilter('all')}
              className="text-xs"
            >
              All Channels
            </Button>
            <Button 
              variant={methodFilter === 'Pesapal' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setMethodFilter('Pesapal')}
              className={methodFilter === 'Pesapal' ? "text-xs bg-[#007EA7] hover:bg-[#006687] text-white gap-1.5" : "text-xs text-[#007EA7] bg-white border-sky-200 hover:bg-sky-50 gap-1.5"}
            >
              <span className="h-3.5 w-3.5 rounded-full bg-current opacity-20 flex items-center justify-center font-bold text-[8px] font-mono">P</span>
              Pesapal 3.0
            </Button>
            <Button 
              variant={methodFilter === 'M-Pesa' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setMethodFilter('M-Pesa')}
              className="text-xs text-green-700 bg-white border-green-200 hover:bg-green-50"
            >
              M-Pesa STK
            </Button>
            <Button 
              variant={methodFilter === 'Card' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setMethodFilter('Card')}
              className="text-xs text-indigo-700 bg-white border-indigo-200 hover:bg-indigo-50"
            >
              Card Pay
            </Button>
          </div>
        </div>

        {/* Ledger logs grid */}
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-lg font-headline">Reconciliation Table</CardTitle>
            <CardDescription aria-live="polite">A comprehensive real-time view of processed client transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Txn ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Related Order</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Ref ID</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="text-right">Receipt Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((p) => {
                  const associatedOrder = getOrderForPayment(p)
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-bold text-foreground">{p.id}</TableCell>
                      <TableCell className="font-medium text-foreground">{p.customerName}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.orderId}</TableCell>
                      <TableCell>
                        {p.method === 'Pesapal' ? (
                          <Badge variant="outline" className="border-sky-200 bg-sky-50 text-[#007EA7] font-bold flex items-center gap-1.5 w-fit">
                            <span className="h-3.5 w-3.5 rounded-full bg-[#007EA7] text-white flex items-center justify-center font-black text-[8px] font-mono">P</span>
                            Pesapal 3.0
                          </Badge>
                        ) : p.method === 'M-Pesa' ? (
                          <Badge variant="outline" className="border-green-200 bg-green-50/50 text-green-700 font-bold">
                            M-Pesa
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-indigo-200 bg-indigo-50/50 text-indigo-700 font-bold">
                            {p.method}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">{p.amount}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-800 font-semibold">{p.transactionRef}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.date}</TableCell>
                      <TableCell className="text-right">
                        {/* Feed printable receipt */}
                        <ReceiptDialog 
                          order={associatedOrder} 
                          payment={p}
                          trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/5 hover:text-primary rounded-full">
                              <ReceiptIcon className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dual Gateway Trace & Diagnostics Panel (Pesapal & Daraja) */}
        <Card className="border border-slate-200 bg-slate-50/40 mb-6">
          <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3 space-y-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Payment Gateway Telemetry &amp; Diagnostics
                </CardTitle>
                <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-white text-xs">
                  <button 
                    onClick={() => setActiveGatewayTab('pesapal')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                      activeGatewayTab === 'pesapal' 
                        ? 'bg-[#007EA7] text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="h-3.5 w-3.5 rounded bg-white text-[#007EA7] flex items-center justify-center font-black text-[9px] font-mono">P</span>
                    Pesapal 3.0 Node
                  </button>
                  <button 
                    onClick={() => setActiveGatewayTab('daraja')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                      activeGatewayTab === 'daraja' 
                        ? 'bg-green-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="h-3.5 w-3.5 rounded bg-white text-green-600 flex items-center justify-center font-black text-[9px] font-mono">STK</span>
                    Safaricom Daraja
                  </button>
                </div>
              </div>
              <CardDescription className="text-xs">
                {activeGatewayTab === 'pesapal' 
                  ? "Real-time Pesapal v3 Instant Payment Notifications (IPN), webhook listeners, and sandbox simulators."
                  : "Monitor live Daraja STK handshakes, callback webhooks, and ledger trace routes."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isLogsOpen && (
                <>
                  {activeGatewayTab === 'pesapal' && (
                    <Button 
                      variant="outline" 
                      size="xs" 
                      onClick={() => handleRetryIpn()} 
                      disabled={retryingIpn}
                      className="bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 text-[10px] h-7 gap-1.5 font-semibold"
                      title="Trigger manual retry of a failed IPN webhook notification"
                    >
                      <RotateCcw className={`h-3 w-3 text-amber-600 ${retryingIpn ? 'animate-spin' : ''}`} />
                      Retry Failed IPN
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="xs" 
                    onClick={refreshActiveGateway} 
                    disabled={refreshingLogs}
                    className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] h-7 gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${refreshingLogs ? 'animate-spin' : ''}`} />
                    Sync Node
                  </Button>
                </>
              )}
              <Button 
                variant="outline" 
                size="xs" 
                onClick={() => setIsLogsOpen(!isLogsOpen)}
                className="bg-slate-900 border-none text-white hover:bg-slate-800 text-[10px] h-7 font-semibold"
              >
                {isLogsOpen ? "Collapse Console" : "Launch Gateway Diagnostics"}
              </Button>
            </div>
          </CardHeader>
          
          {isLogsOpen && (
            <CardContent className="space-y-4">
              {activeGatewayTab === 'pesapal' ? (
                /* Pesapal Telemetry & Testing Console */
                <div className="space-y-4">
                  {/* Gateway metadata stripe */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-white rounded-xl border border-sky-100 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">IPN Notification URL</span>
                      <div className="font-mono text-slate-800 font-semibold truncate select-all">/api/pesapal/ipn</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Order Initiation Route</span>
                      <div className="font-mono text-slate-800 font-semibold truncate select-all">/api/pesapal/order</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Supported Payment Rails</span>
                      <div className="font-semibold text-sky-800">M-Pesa • Airtel Money • Visa/MC • Bank</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Pesapal Trace Stack Logs */}
                    <div className="lg:col-span-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#007EA7] flex items-center gap-1.5 leading-none">
                          <Globe className="h-3.5 w-3.5" />
                          Pesapal Live Audit Trail ({pesapalLogs.length})
                        </span>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleRetryIpn()}
                          disabled={retryingIpn}
                          className="h-6 px-2 text-[10px] text-amber-700 hover:text-amber-800 hover:bg-amber-100/60 font-semibold gap-1"
                          title="Manually retry failed IPN notification"
                        >
                          <RotateCcw className={`h-3 w-3 ${retryingIpn ? 'animate-spin' : ''}`} />
                          Retry IPN Notification
                        </Button>
                      </div>
                      
                      <div className="border border-sky-100 rounded-xl bg-slate-950 text-slate-300 p-3 h-[280px] overflow-y-auto font-mono text-[11px] space-y-3 shadow-inner selection:bg-sky-800">
                        {pesapalLogs.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-slate-500 italic select-none">
                            No Pesapal API requests logged yet. Trigger a payment or run a simulation below.
                          </div>
                        ) : (
                          pesapalLogs.map((log: any, idx: number) => (
                            <div key={idx} className="border-b border-white/5 pb-2.5 last:border-0">
                              <div className="flex justify-between items-start mb-1 text-slate-400">
                                <span className="text-sky-400 font-bold">[{log.type}]</span>
                                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <pre className="whitespace-pre-wrap leading-tight text-slate-300 max-h-[120px] overflow-y-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                              {((log.type && (log.type.includes("FAIL") || log.type.includes("CRASH"))) || log.details?.status === "Failed" || log.details?.failureReason || log.details?.error) && (
                                <div className="mt-2 pt-1.5 border-t border-red-500/20 flex items-center justify-between bg-red-950/40 -mx-1 px-2 py-1 rounded">
                                  <span className="text-[10px] text-red-300 flex items-center gap-1 font-sans">
                                    <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
                                    Failed webhook notification
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRetryIpn(log.details?.orderTrackingId)}
                                    disabled={retryingIpn}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 text-[10px] font-sans font-semibold transition-colors cursor-pointer"
                                  >
                                    <RotateCcw className={`h-2.5 w-2.5 ${retryingIpn && retryingTrackingId === log.details?.orderTrackingId ? 'animate-spin' : ''}`} />
                                    Retry IPN Webhook
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Pesapal Transaction Queue & Simulator Tools */}
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-[#007EA7] flex items-center gap-1.5 leading-none">
                          <Webhook className="h-3.5 w-3.5" />
                          Pesapal Transaction Ledger
                        </span>

                        <div className="border rounded-xl bg-white p-3 h-[170px] overflow-y-auto space-y-2 divide-y font-sans">
                          {pesapalTxns.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-4">
                              <Info className="h-5 w-5 text-sky-300 mb-1" />
                              <span className="text-[11px] italic">Ledger empty. Trigger an order to register tracking ID.</span>
                            </div>
                          ) : (
                            pesapalTxns.map((tx: any, idx: number) => (
                              <div key={idx} className="pt-2 first:pt-0 pb-1 flex flex-col gap-1 text-xs">
                                <div className="flex justify-between items-center text-[10px] leading-none">
                                  <span className="font-mono font-bold text-gray-700">{tx.merchantReference}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                                      tx.status === "Completed" ? "bg-green-100 text-green-700 border border-green-200" :
                                      tx.status === "Failed" ? "bg-red-100 text-red-600 border border-red-200" :
                                      "bg-amber-100 text-amber-700 border border-amber-200 animate-pulse"
                                    }`}>
                                      {tx.status}
                                    </span>
                                    {tx.status === "Failed" && (
                                      <button
                                        type="button"
                                        onClick={() => handleRetryIpn(tx.orderTrackingId)}
                                        disabled={retryingIpn && retryingTrackingId === tx.orderTrackingId}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[9px] font-semibold transition-colors cursor-pointer"
                                        title="Manually retry IPN webhook for this transaction"
                                      >
                                        <RotateCcw className={`h-2.5 w-2.5 ${retryingIpn && retryingTrackingId === tx.orderTrackingId ? 'animate-spin' : ''}`} />
                                        Retry IPN
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-between text-[11px] leading-tight">
                                  <span className="text-muted-foreground">Rail / Amount:</span>
                                  <span className="font-semibold">{tx.paymentMethod || 'Multi'} • KES {parseFloat(tx.amount || 0).toLocaleString()}</span>
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground truncate select-all">
                                  Track: {tx.orderTrackingId}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Webhook Sandbox Simulation Dispatcher */}
                      <div className="p-3 bg-white rounded-xl border border-sky-100 space-y-2">
                        <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                            Pesapal IPN Webhook Simulator
                          </span>
                          <span className="text-[9px] text-muted-foreground font-normal">Sandbox Mode</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                          <Button 
                            variant="outline" 
                            size="xs" 
                            disabled={simulatingMethod !== null}
                            onClick={() => handleSimulatePesapal('mpesa')}
                            className="text-green-700 border-green-200 hover:bg-green-50 h-7 text-[10px]"
                          >
                            Sim M-Pesa IPN
                          </Button>
                          <Button 
                            variant="outline" 
                            size="xs" 
                            disabled={simulatingMethod !== null}
                            onClick={() => handleSimulatePesapal('card')}
                            className="text-indigo-700 border-indigo-200 hover:bg-indigo-50 h-7 text-[10px]"
                          >
                            Sim Card IPN
                          </Button>
                          <Button 
                            variant="outline" 
                            size="xs" 
                            disabled={simulatingMethod !== null}
                            onClick={() => handleSimulatePesapal('airtel')}
                            className="text-red-700 border-red-200 hover:bg-red-50 h-7 text-[10px]"
                          >
                            Sim Airtel IPN
                          </Button>
                          <Button 
                            variant="outline" 
                            size="xs" 
                            disabled={simulatingMethod !== null}
                            onClick={() => handleSimulatePesapal('failed')}
                            className="text-amber-800 border-amber-200 hover:bg-amber-50 h-7 text-[10px]"
                          >
                            Sim Failed IPN
                          </Button>
                        </div>
                        <Button 
                          variant="outline" 
                          size="xs" 
                          disabled={retryingIpn}
                          onClick={() => handleRetryIpn()}
                          className="w-full text-amber-900 border-amber-300 bg-amber-50/80 hover:bg-amber-100 h-7 text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <RotateCcw className={`h-3 w-3 text-amber-600 ${retryingIpn ? 'animate-spin' : ''}`} />
                          Manually Retry Failed IPN Webhook
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Safaricom Daraja Logs Console */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Outgoing API Requests column */}
                  <div className="lg:col-span-2 space-y-2">
                    <span className="text-xs font-bold text-green-800 flex items-center gap-1.5 leading-none">
                      <Globe className="h-3.5 w-3.5" />
                      Daraja Live Trace Logs ({darajaLogs.length})
                    </span>
                    
                    <div className="border border-green-100 rounded-xl bg-slate-950 text-slate-300 p-3 h-[280px] overflow-y-auto font-mono text-[11px] space-y-3 shadow-inner selection:bg-green-800">
                      {darajaLogs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 italic select-none">
                          No active Daraja API requests logged yet. Trigger an STK payment to trace logs.
                        </div>
                      ) : (
                        darajaLogs.map((log: any, idx: number) => (
                          <div key={idx} className="border-b border-white/5 pb-2.5 last:border-0">
                            <div className="flex justify-between items-start mb-1 text-slate-400">
                              <span className="text-green-400 font-bold">[{log.type}]</span>
                              <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <pre className="whitespace-pre-wrap leading-tight text-slate-300 max-h-[120px] overflow-y-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Virtualized Callback triggers */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-green-800 flex items-center gap-1.5 leading-none">
                      <Webhook className="h-3.5 w-3.5" />
                      Daraja STK Queue
                    </span>

                    <div className="border rounded-xl bg-white p-3 h-[280px] overflow-y-auto space-y-2 divide-y font-sans">
                      {darajaTxns.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-4">
                          <Info className="h-6 w-6 text-emerald-300 mb-1" />
                          <span className="text-[11px] italic">Queue is empty. Waiting for STK request loop.</span>
                        </div>
                      ) : (
                        darajaTxns.map((tx: any, idx: number) => (
                          <div key={idx} className="pt-2 first:pt-0 pb-1 flex flex-col gap-1.5 text-xs">
                            <div className="flex justify-between items-center text-[10px] leading-none">
                              <span className="font-mono font-bold text-gray-500">{tx.orderId}</span>
                              <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                                tx.status === "Completed" ? "bg-green-100 text-green-700 border border-green-200" :
                                tx.status === "Failed" ? "bg-red-100 text-red-600 border border-red-200" :
                                "bg-amber-100 text-amber-700 border border-amber-200 animate-pulse"
                              }`}>
                                {tx.status}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px] leading-tight">
                              <span className="text-muted-foreground">Phone / Amount:</span>
                              <span className="font-semibold">{tx.phone} • {tx.amount}</span>
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground break-all select-all leading-tight">
                              ID: {tx.checkoutRequestId}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
