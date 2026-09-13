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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  PackageCheck, 
  Clock, 
  Loader2, 
  CheckCircle2, 
  Truck,
  RotateCw,
  CreditCard,
  MessageSquare,
  AlertCircle,
  FileCheck,
  CheckCircle,
  DollarSign
} from "lucide-react"
import { useStore, Order } from "@/context/store-context"
import { useToast } from "@/hooks/use-toast"
import { ReadyMessageDialog } from "@/components/orders/ready-message-dialog"
import { MpesaDialog } from "@/components/orders/mpesa-dialog"
import { PesapalDialog } from "@/components/orders/pesapal-dialog"
import { ReceiptDialog } from "@/components/orders/receipt-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

const statuses = [
  { id: 'all', label: 'All Orders', icon: PackageCheck },
  { id: 'picked', label: 'Picked Up', icon: Truck },
  { id: 'cleaning', label: 'Cleaning', icon: Loader2 },
  { id: 'ready', label: 'Ready for Collection', icon: CheckCircle2 },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle },
]

export default function OrdersPage() {
  const { orders, updateOrderStatus, addPayment } = useStore()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("all")
  
  // Custom states for direct Payment Dialog trigger
  const [selectedOrderForPay, setSelectedOrderForPay] = useState<Order | null>(null)
  const [cardName, setCardName] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")
  const [isPayingCard, setIsPayingCard] = useState(false)
  const [paymentChoice, setPaymentChoice] = useState<'none' | 'pesapal' | 'mpesa' | 'card'>('none')

  const cycleStatus = (orderId: string, currentStatus: Order['status']) => {
    let nextStatus: Order['status'] = 'picked'
    if (currentStatus === 'picked') nextStatus = 'cleaning'
    else if (currentStatus === 'cleaning') nextStatus = 'ready'
    else if (currentStatus === 'ready') nextStatus = 'delivered'
    else if (currentStatus === 'delivered') {
      toast({
        title: "Order Already Delivered",
        description: "This order is already in its final lifecycle state.",
      })
      return
    }

    updateOrderStatus(orderId, nextStatus)
    toast({
      title: "Status Updated",
      description: `Order ${orderId} moved to '${nextStatus}' state.`,
    })
  }

  const handleCardPaySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrderForPay) return

    setIsPayingCard(true)

    // Simulate merchant credit card authorizer
    setTimeout(() => {
      addPayment({
        orderId: selectedOrderForPay.id,
        customerName: selectedOrderForPay.customerName,
        amount: selectedOrderForPay.amount,
        phone: selectedOrderForPay.customerPhone || "+254 700 000 000",
        method: "Card"
      })

      toast({
        title: "Payment Accepted",
        description: `Successfully processed Card payment of ${selectedOrderForPay.amount}! Receipt is now printable.`
      })

      setIsPayingCard(false)
      setSelectedOrderForPay(null)
      setPaymentChoice('none')
      setCardName("")
      setCardNumber("")
      setCardExpiry("")
      setCardCvv("")
    }, 2500)
  }

  // Filter orders based on tabs
  const filteredOrders = orders.filter(o => activeTab === 'all' || o.status === activeTab)

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Order Lifecycle Tracking</h2>
            <p className="text-muted-foreground">Monitor and update the status of laundry orders from pickup to delivery.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            toast({
              title: "Refreshing Board",
              description: "Latest laundry pipeline synchronized.",
            })
          }} className="gap-2">
            <RotateCw className="h-4 w-4" />
            Sync State
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto p-1 bg-muted/60">
            {statuses.map((s) => (
              <TabsTrigger key={s.id} value={s.id} className="gap-2 py-2.5 text-xs font-semibold">
                <s.icon className={`h-4 w-4 ${s.id === 'cleaning' && 'animate-spin'}`} />
                <span>{s.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-6">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed flex flex-col items-center justify-center p-6 mt-2">
                <AlertCircle className="h-10 w-10 text-muted-foreground opacity-35 mb-3" />
                <h3 className="font-semibold text-lg">No orders in pipeline</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">No bookings fit this status tab. Confirmed pickups automatically load here.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden hover:border-primary/50 transition-all duration-200 border bg-white flex flex-col justify-between">
                    <CardHeader className="p-4 flex flex-row items-start justify-between space-y-0 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-headline font-semibold">{order.id}</CardTitle>
                          <Badge 
                            variant={order.paid ? "default" : "secondary"} 
                            className={order.paid 
                              ? (order.paymentMethod === 'Pesapal' 
                                  ? "bg-sky-50 hover:bg-sky-50 text-[#007EA7] border-sky-200 font-semibold" 
                                  : "bg-green-100 hover:bg-green-100 border-green-200 text-green-700 font-semibold") 
                              : "bg-red-50 text-red-700 border-red-100"
                            }
                          >
                            {order.paid ? `Paid${order.paymentMethod ? ` • ${order.paymentMethod}` : ''}` : "Unpaid"}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground mt-1">{order.date}</CardDescription>
                      </div>
                      <Badge variant={
                        order.status === 'ready' ? 'default' :
                        order.status === 'cleaning' ? 'outline' : 'secondary'
                      } className="capitalize font-semibold text-xs py-0.5">
                        {order.status === 'ready' ? 'Ready' : order.status}
                      </Badge>
                    </CardHeader>
                    
                    <CardContent className="p-4 pt-0 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-1 bg-stone-50/50 p-3 rounded-lg border">
                        <div className="font-semibold text-sm text-foreground">{order.customerName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{order.items}</div>
                        <div className="text-xs text-primary font-bold mt-1.5">{order.amount}</div>
                      </div>

                      <div className="space-y-2 pt-2">
                        {/* Interactive operations row */}
                        <div className="flex justify-between items-center gap-2">
                          {/* Ready notification Alert dialog */}
                          {order.status === 'ready' && (
                            <ReadyMessageDialog 
                              customerName={order.customerName} 
                              orderId={order.id} 
                              items={order.items} 
                            />
                          )}
                          
                          {/* Payment handler */}
                          {!order.paid ? (
                            <Dialog open={selectedOrderForPay?.id === order.id} onOpenChange={(val) => {
                              if (!val) {
                                setSelectedOrderForPay(null)
                                setPaymentChoice('none')
                              } else {
                                setSelectedOrderForPay(order)
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 text-xs font-semibold gap-1 ml-auto">
                                  <CreditCard className="h-3.5 w-3.5" />
                                  Collect Payment
                                </Button>
                              </DialogTrigger>
                              <DialogContent className={paymentChoice === 'pesapal' ? "sm:max-w-[490px] p-0 overflow-hidden border-0 bg-transparent shadow-2xl" : "sm:max-w-[440px]"}>
                                {paymentChoice !== 'pesapal' && (
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 font-headline text-lg">
                                      <DollarSign className="h-5 w-5 text-green-600" />
                                      Bespoke Payment Portal
                                    </DialogTitle>
                                    <DialogDescription>
                                      Accept cashless payments for Laundry order {order.id} ({order.amount}).
                                    </DialogDescription>
                                  </DialogHeader>
                                )}

                                {paymentChoice === 'none' && (
                                  <div className="grid gap-3 py-4">
                                    {/* Pesapal 3.0 Multi-Gateway */}
                                    <Button 
                                      type="button" 
                                      onClick={() => setPaymentChoice('pesapal')}
                                      className="py-5 bg-[#007EA7] hover:bg-[#006687] text-white flex items-center justify-between px-4 font-headline text-sm font-bold shadow rounded-xl text-left"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="h-7 w-7 rounded-lg bg-white text-[#007EA7] flex items-center justify-center font-black text-sm font-mono shadow-sm shrink-0">P</span>
                                        <div>
                                          <div className="leading-tight font-bold">Pesapal 3.0 Gateway</div>
                                          <div className="text-[10px] text-sky-100 font-normal font-sans">M-Pesa, Airtel, Cards, Bank Transfer</div>
                                        </div>
                                      </div>
                                      <Badge className="bg-white/20 text-white border-0 text-[10px] px-2 font-normal shrink-0">Unified</Badge>
                                    </Button>

                                    {/* Direct Safaricom STK Push */}
                                    <Button 
                                      type="button" 
                                      onClick={() => setPaymentChoice('mpesa')}
                                      className="py-5 bg-[#3FB13F] hover:bg-[#369936] text-white flex items-center justify-between px-4 font-headline text-sm font-bold shadow rounded-xl text-left"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="h-7 w-7 rounded-lg bg-white text-[#3FB13F] flex items-center justify-center font-black text-xs font-mono shrink-0">STK</span>
                                        <div>
                                          <div className="leading-tight font-bold">Direct Safaricom STK Push</div>
                                          <div className="text-[10px] text-green-100 font-normal font-sans">Lipa Na M-Pesa Instant Prompt</div>
                                        </div>
                                      </div>
                                      <span className="text-xs text-green-100 font-normal">→</span>
                                    </Button>

                                    {/* Process Card */}
                                    <Button 
                                      type="button" 
                                      onClick={() => setPaymentChoice('card')}
                                      className="py-5 bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-between px-4 font-headline text-sm font-semibold shadow rounded-xl text-left"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="h-7 w-7 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0">
                                          <CreditCard className="h-4 w-4" />
                                        </div>
                                        <div>
                                          <div className="leading-tight font-bold">Direct POS / Card Terminal</div>
                                          <div className="text-[10px] text-slate-300 font-normal font-sans">Visa, Mastercard, Debit Card</div>
                                        </div>
                                      </div>
                                      <span className="text-xs text-slate-400 font-normal">→</span>
                                    </Button>
                                  </div>
                                )}

                                {paymentChoice === 'pesapal' && (
                                  <div className="space-y-3 p-1">
                                    <PesapalDialog
                                      embedded={true}
                                      customerName={order.customerName}
                                      amount={order.amount}
                                      phone={order.customerPhone || "0722 000 111"}
                                      orderId={order.id}
                                      onSuccess={() => {
                                        setSelectedOrderForPay(null)
                                        setPaymentChoice('none')
                                      }}
                                      onClose={() => {
                                        setSelectedOrderForPay(null)
                                        setPaymentChoice('none')
                                      }}
                                    />
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="w-full text-xs text-muted-foreground hover:text-foreground" 
                                      onClick={() => setPaymentChoice('none')}
                                    >
                                      ← Choose another payment option
                                    </Button>
                                  </div>
                                )}

                                {paymentChoice === 'mpesa' && (
                                  <div className="py-2">
                                    {/* Embed dynamic Mpesa widget */}
                                    <div className="space-y-4">
                                      <div className="p-3 bg-green-50 rounded-lg text-xs leading-relaxed text-green-800 border border-green-100">
                                        Sends an instant Safaricom M-Pesa STK Push PIN prompt request directly to the customer's hand device.
                                      </div>
                                      <MpesaDialog 
                                        customerName={order.customerName} 
                                        amount={order.amount} 
                                        phone={order.customerPhone || "0722 000 111"} 
                                        orderId={order.id}
                                      />
                                      <Button variant="ghost" className="w-full text-xs" onClick={() => setPaymentChoice('none')}>
                                        Go Back
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {paymentChoice === 'card' && (
                                  <form onSubmit={handleCardPaySubmit} className="space-y-4 pt-2">
                                    {/* Graphical Card visualization mockup */}
                                    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-xl p-4 shadow-md aspect-[1.6/1] flex flex-col justify-between relative overflow-hidden">
                                      {/* chip */}
                                      <div className="flex justify-between items-start">
                                        <div className="h-8 w-11 bg-amber-300/35 rounded-md border border-amber-300/20" />
                                        <div className="text-xs italic tracking-widest font-extrabold text-indigo-200">LaunderSync Pay</div>
                                      </div>
                                      
                                      <div className="space-y-3">
                                        {/* number */}
                                        <div className="text-base font-mono tracking-[0.2em] font-medium text-center">
                                          {cardNumber || "••••  ••••  ••••  ••••"}
                                        </div>
                                        
                                        <div className="flex justify-between items-end text-[10px] font-mono leading-none">
                                          <div>
                                            <div className="text-[7px] text-indigo-300/70 uppercase mb-0.5">Card Holder</div>
                                            <div className="font-semibold uppercase truncate max-w-[150px]">{cardName || "CARD OWNER NAME"}</div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-[7px] text-indigo-300/70 uppercase mb-0.5">Expires</div>
                                            <div className="font-semibold">{cardExpiry || "MM/YY"}</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Interactive input rows */}
                                    <div className="space-y-3">
                                      <div>
                                        <Label htmlFor="c-name" className="text-xs text-muted-foreground">Cardholder Name</Label>
                                        <Input 
                                          id="c-name" 
                                          placeholder="Jane Elizabeth Doe" 
                                          value={cardName} 
                                          onChange={(e) => setCardName(e.target.value)} 
                                          className="text-xs bg-stone-50 h-8"
                                          required
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="c-number" className="text-xs text-muted-foreground">Debit Card Number</Label>
                                        <Input 
                                          id="c-number" 
                                          placeholder="4000 1234 5678 9010" 
                                          value={cardNumber} 
                                          onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())} 
                                          maxLength={19}
                                          className="text-xs bg-stone-50 h-8 font-mono"
                                          required
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <Label htmlFor="c-expiry" className="text-xs text-muted-foreground">Expiration Date</Label>
                                          <Input 
                                            id="c-expiry" 
                                            placeholder="MM/YY" 
                                            value={cardExpiry} 
                                            onChange={(e) => setCardExpiry(e.target.value)} 
                                            maxLength={5}
                                            className="text-xs bg-stone-50 h-8 font-mono"
                                            required
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="c-cvv" className="text-xs text-muted-foreground">CVV Security Code</Label>
                                          <Input 
                                            id="c-cvv" 
                                            placeholder="123" 
                                            type="password"
                                            value={cardCvv} 
                                            onChange={(e) => setCardCvv(e.target.value)} 
                                            maxLength={3}
                                            className="text-xs bg-stone-50 h-8 font-mono"
                                            required
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <DialogFooter className="sm:justify-between gap-2 mt-4">
                                      <Button type="button" variant="ghost" size="sm" onClick={() => setPaymentChoice('none')}>
                                        Back
                                      </Button>
                                      <Button type="submit" size="sm" disabled={isPayingCard} className="bg-primary hover:bg-primary/95 flex-1 gap-1">
                                        {isPayingCard ? (
                                          <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Authorizing...
                                          </>
                                        ) : `Pay ${order.amount}`}
                                      </Button>
                                    </DialogFooter>
                                  </form>
                                )}
                              </DialogContent>
                            </Dialog>
                          ) : (
                            // Render receipt trigger if PAID
                            <ReceiptDialog order={order} />
                          )}
                        </div>

                        {/* Pipeline workflow engine */}
                        <div className="flex gap-2 pt-1 border-t border-dashed mt-2.5">
                          <Button variant="outline" size="xs" className="flex-1 text-[11px] h-7 bg-white hover:bg-stone-50">
                            Inspect Specs
                          </Button>
                          {order.status !== 'delivered' && (
                            <Button 
                              variant="default" 
                              size="xs" 
                              onClick={() => cycleStatus(order.id, order.status)}
                              className="flex-1 bg-primary text-white text-[11px] h-7 hover:bg-primary/90 gap-1"
                            >
                              <RotateCw className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} />
                              Move status
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
