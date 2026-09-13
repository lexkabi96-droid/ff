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
  Truck, 
  MapPin, 
  Calendar, 
  Clock, 
  Filter,
  Search,
  CheckCircle,
  MoreVertical,
  Plus,
  Phone,
  Backpack,
  AlertCircle
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PickupMessageDialog } from "@/components/orders/pickup-message-dialog"
import { MpesaDialog } from "@/components/orders/mpesa-dialog"
import { useStore, Pickup } from "@/context/store-context"
import { useToast } from "@/hooks/use-toast"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function PickupsPage() {
  const { pickups, addPickup, updatePickupStatus } = useStore()
  const { toast } = useToast()
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // New Pickup Dialog state
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [newCustomer, setNewCustomer] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [newDate, setNewDate] = useState("Today")
  const [newTime, setNewTime] = useState("09:00 AM - 10:30 AM")
  const [newItems, setNewItems] = useState("1 Bag (Medium)")
  const [newAmount, setNewAmount] = useState("KES 800")

  // Filter pickups
  const filteredPickups = pickups.filter(p => {
    const matchesSearch = p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.customerPhone.includes(searchQuery)
    const matchesStatus = statusFilter === "all" || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleSubmitPickup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustomer || !newPhone || !newAddress) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    addPickup({
      customerName: newCustomer,
      customerPhone: newPhone,
      location: newAddress,
      date: newDate,
      time: newTime,
      items: newItems,
      amount: newAmount
    })

    toast({
      title: "Pickup Scheduled",
      description: `Pickup request created successfully for ${newCustomer}.`
    })

    // Reset fields
    setNewCustomer("")
    setNewPhone("")
    setNewAddress("")
    setIsNewDialogOpen(false)
  }

  const handleConfirmPickup = (pickupId: string, name: string) => {
    updatePickupStatus(pickupId, "Completed")
    toast({
      title: "Pickup Completed",
      description: `Pickup for ${name} confirmed. An active cleaning order has been created!`,
    })
  }

  const handleCancelPickup = (pickupId: string, name: string) => {
    updatePickupStatus(pickupId, "Cancelled")
    toast({
      title: "Pickup Cancelled",
      description: `Pickup for ${name} was cancelled.`,
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Pickup Management</h2>
            <p className="text-muted-foreground">Efficiently schedule and track incoming collection requests.</p>
          </div>
          
          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground gap-2 hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                New Pickup Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmitPickup}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 font-headline">
                    <Truck className="h-5 w-5 text-primary" />
                    Schedule Pickup
                  </DialogTitle>
                  <DialogDescription>
                    Fill in customer details to book a new laundry pick up service.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cust-name" className="text-right">Customer *</Label>
                    <Input 
                      id="cust-name" 
                      placeholder="Jane Doe" 
                      value={newCustomer} 
                      onChange={(e) => setNewCustomer(e.target.value)} 
                      className="col-span-3" 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cust-phone" className="text-right">Phone *</Label>
                    <Input 
                      id="cust-phone" 
                      placeholder="+254 712 345 678" 
                      value={newPhone} 
                      onChange={(e) => setNewPhone(e.target.value)} 
                      className="col-span-3" 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cust-addr" className="text-right">Address *</Label>
                    <Input 
                      id="cust-addr" 
                      placeholder="Kilimani, Galana Rd" 
                      value={newAddress} 
                      onChange={(e) => setNewAddress(e.target.value)} 
                      className="col-span-3" 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cust-date" className="text-right">Date</Label>
                    <Select value={newDate} onValueChange={setNewDate}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Today">Today</SelectItem>
                        <SelectItem value="Tomorrow">Tomorrow</SelectItem>
                        <SelectItem value="Wednesday, June 17">Wednesday, June 17</SelectItem>
                        <SelectItem value="Thursday, June 18">Thursday, June 18</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cust-time" className="text-right">Time Window</Label>
                    <Select value={newTime} onValueChange={setNewTime}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select hour slot" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:00 AM - 10:30 AM">Morning (09:00 AM - 10:30 AM)</SelectItem>
                        <SelectItem value="11:30 AM - 01:00 PM">Noon (11:30 AM - 01:00 PM)</SelectItem>
                        <SelectItem value="02:00 PM - 03:30 PM">Afternoon (02:00 PM - 03:30 PM)</SelectItem>
                        <SelectItem value="04:00 PM - 05:30 PM">Evening (04:00 PM - 05:30 PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cust-items" className="text-right">Est. Items</Label>
                    <Input 
                      id="cust-items" 
                      placeholder="2 Bags (Large)" 
                      value={newItems} 
                      onChange={(e) => setNewItems(e.target.value)} 
                      className="col-span-3" 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cust-amt" className="text-right">Est. Price</Label>
                    <Select value={newAmount} onValueChange={setNewAmount}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select estimate" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KES 600">Minor Load (KES 600)</SelectItem>
                        <SelectItem value="KES 1,200">Standard Load (KES 1,200)</SelectItem>
                        <SelectItem value="KES 2,000">Heavy Load (KES 2,000)</SelectItem>
                        <SelectItem value="KES 3,200">Premium / Bulky (KES 3,200)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsNewDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/95">Book Pickup Slot</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Toolbar */}
        <Card className="bg-muted/30 border-none shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search customers, phones or locations..." 
                className="pl-9 bg-white" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[160px] bg-white text-sm">
                  <span className="flex items-center gap-1.5"><Filter className="h-3.5 w-3.5" /> Filter Status</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Awaiting Confirmation">Awaiting Confirmation</SelectItem>
                  <SelectItem value="Requested">Requested</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Schedule Grid */}
        {filteredPickups.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed flex flex-col items-center justify-center p-6">
            <AlertCircle className="h-10 w-10 text-muted-foreground opacity-35 mb-3" />
            <h3 className="font-semibold text-lg">No pickup records found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">No bookings fit your active text filter criteria. Try creating a new request!</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
            {filteredPickups.map((pickup) => (
              <Card 
                key={pickup.id} 
                className={`group hover:shadow-md transition-all duration-300 border-l-4 ${
                  pickup.status === 'Completed' ? 'border-l-green-500 bg-green-50/10' :
                  pickup.status === 'Cancelled' ? 'border-l-stone-300 opacity-60' : 'border-l-primary bg-white'
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-headline">{pickup.customerName}</CardTitle>
                      <Badge variant={
                        pickup.status === 'Completed' ? 'outline' : 
                        pickup.status === 'Scheduled' ? 'default' : 'secondary'
                      } className={pickup.status === 'Completed' ? "bg-green-100/50 text-green-700 border-green-200" : ""}>
                        {pickup.status}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1.5 text-xs">
                      <MapPin className="h-3 w-3 text-red-500" />
                      {pickup.location}
                    </CardDescription>
                  </div>
                  <div className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground mr-1">
                    {pickup.id}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 my-3 p-3 rounded-lg bg-accent/5">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Time Window</span>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Clock className="h-4 w-4 text-primary" />
                        {pickup.time} ({pickup.date})
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Estimate Value</span>
                      <span className="text-sm font-extrabold text-primary">{pickup.amount}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-dashed">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Backpack className="h-3.5 w-3.5 text-muted-foreground" />
                      Cargo: <span className="font-semibold text-foreground">{pickup.items}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pickup.status !== "Completed" && pickup.status !== "Cancelled" ? (
                        <>
                          <MpesaDialog 
                            customerName={pickup.customerName} 
                            amount={pickup.amount} 
                            phone={pickup.customerPhone} 
                          />
                          <PickupMessageDialog 
                            customerName={pickup.customerName} 
                            location={pickup.location} 
                          />
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => handleConfirmPickup(pickup.id, pickup.customerName)}
                            className="bg-primary hover:bg-primary/95 text-white gap-1.5 text-xs"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Confirm Collection
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          {pickup.status === 'Completed' ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              Synced with Active Orders List
                            </>
                          ) : 'Terminated'}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
