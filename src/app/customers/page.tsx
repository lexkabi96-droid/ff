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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Mail, Phone, ExternalLink, ShieldCheck, MapPin } from "lucide-react"
import { useStore } from "@/context/store-context"
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

export default function CustomersPage() {
  const { customers, addCustomer } = useStore()
  const { toast } = useToast()
  
  // Search parameters
  const [searchQuery, setSearchQuery] = useState("")
  
  // Create state
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [status, setStatus] = useState("Active")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !phone) {
      toast({
        title: "Validation Error",
        description: "Please fill in all details.",
        variant: "destructive"
      })
      return
    }

    addCustomer({ name, email, phone, address, status })
    
    toast({
      title: "Success",
      description: `New customer ${name} has been added.`
    })

    // Reset fields
    setName("")
    setEmail("")
    setPhone("")
    setAddress("")
    setStatus("Active")
    setIsOpen(false)
  }

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  )

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Customer Management</h2>
            <p className="text-muted-foreground font-sans">View and manage your laundry customer directory.</p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary text-white hover:bg-primary/95">
                <Plus className="h-4 w-4" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 font-headline">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Register Customer
                  </DialogTitle>
                  <DialogDescription>
                    Include a new customer to the LaunderSync CRM platform directory.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 text-sm">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="c-name" className="text-right">Name *</Label>
                    <Input 
                      id="c-name" 
                      placeholder="Jane Doe" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      className="col-span-3 bg-stone-50/50" 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="c-email" className="text-right">Email *</Label>
                    <Input 
                      id="c-email" 
                      type="email"
                      placeholder="jane@example.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="col-span-3 bg-stone-50/50" 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="c-phone" className="text-right">Phone *</Label>
                    <Input 
                      id="c-phone" 
                      placeholder="+254 712 345 678" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      className="col-span-3 bg-stone-50/50" 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="c-addr" className="text-right">Address</Label>
                    <Input 
                      id="c-addr" 
                      placeholder="Kilimani, Nairobi" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      className="col-span-3 bg-stone-50/50" 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="c-status" className="text-right">Tier Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select tier status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Standard Active</SelectItem>
                        <SelectItem value="VIP">Premium VIP Tier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/95">Save Customer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, email or phone..." 
              className="pl-9 bg-white" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Card className="border">
          <CardHeader>
            <CardTitle className="text-lg font-headline">Customer Directory</CardTitle>
            <CardDescription aria-live="polite">A complete list of your current customer base.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Address</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Last Sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarImage src={`https://picsum.photos/seed/${customer.id}/100/100`} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{customer.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="font-semibold text-foreground text-sm">{customer.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                          {customer.email}
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                          {customer.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-red-400 shrink-0" />
                      {customer.address || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px] bg-stone-50 text-stone-700">
                        {customer.totalOrders} total
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.status === 'VIP' ? 'default' : 'secondary'} className={customer.status === 'VIP' ? "bg-amber-100 hover:bg-amber-100 border-amber-200 text-amber-800 font-bold" : ""}>
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-muted-foreground">
                      {customer.lastOrder}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
