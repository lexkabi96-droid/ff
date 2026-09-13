"use client"

import * as React from "react"
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
  Package, 
  CheckCircle, 
  Clock, 
  ArrowUpRight, 
  MoreHorizontal,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Sparkles
} from "lucide-react"
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
import { useStore } from "@/context/store-context"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const { orders, pickups, payments } = useStore()
  const router = useRouter()

  // Dynamic statistics
  const pendingPickupsCount = pickups.filter(p => p.status === 'Scheduled' || p.status === 'Awaiting Confirmation' || p.status === 'Requested').length
  const inProgressCount = orders.filter(o => o.status === 'cleaning' || o.status === 'picked').length
  const readyCount = orders.filter(o => o.status === 'ready').length
  const completedCount = orders.filter(o => o.status === 'delivered').length

  const stats = [
    {
      title: "Pending Pickups",
      value: pendingPickupsCount.toString(),
      icon: Truck,
      description: "Scheduled for collection",
      color: "text-blue-600",
      bg: "bg-blue-100/50 border-blue-200"
    },
    {
      title: "In Progress",
      value: inProgressCount.toString(),
      icon: Clock,
      description: "Active washing channels",
      color: "text-amber-600",
      bg: "bg-amber-100/50 border-amber-200"
    },
    {
      title: "Ready for Delivery",
      value: readyCount.toString(),
      icon: Package,
      description: "Finished & pressed items",
      color: "text-emerald-600",
      bg: "bg-emerald-100/50 border-emerald-200"
    },
    {
      title: "Completed Orders",
      value: completedCount.toString(),
      icon: CheckCircle,
      description: "Archived deliveries",
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20"
    }
  ]

  // Slice top 5 recent orders
  const recentOrders = orders.slice(0, 5)

  // Slice upcoming pickups
  const activePickups = pickups.filter(p => p.status !== 'Completed' && p.status !== 'Cancelled').slice(0, 3)

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in text-sm text-foreground">
        
        {/* Dynamic Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="hover:shadow bg-white transition-all border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bg} p-2 rounded-lg border`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold font-headline">{stat.value}</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium bg-stone-50 px-2 py-0.5 rounded border inline-block">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Panel Quick access */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 p-6 rounded-2xl text-white shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border relative overflow-hidden">
          {/* subtle background pattern design */}
          <div className="absolute top-0 right-0 h-40 w-40 bg-white/5 rounded-full blur-2xl z-0" />
          
          <div className="space-y-1.5 z-10 max-w-lg">
            <h3 className="font-extrabold text-lg tracking-tight font-headline flex items-center gap-1.5 text-indigo-100">
              <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" /> Self-Service Customer Booking Portal
            </h3>
            <p className="text-xs text-indigo-200 leading-relaxed font-sans">
              Provide your walk-in clients with their private portal to arrange laundry collections. New orders pop up instantly on your system overview.
            </p>
          </div>
          <div className="z-10 shrink-0">
            <Link href="/booking">
              <Button size="sm" className="bg-white hover:bg-stone-100 text-indigo-950 font-bold font-headline select-none flex items-center gap-1">
                Launcer customer portal
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Split grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4 border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-headline font-semibold">Live Pipeline Feed</CardTitle>
                <CardDescription>Track the latest order activities active right now.</CardDescription>
              </div>
              <Link href="/orders">
                <Button variant="outline" size="xs" className="text-xs font-semibold">View Full Board</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No orders active.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs font-bold">{order.id}</TableCell>
                        <TableCell className="font-medium">{order.customerName}</TableCell>
                        <TableCell>
                          <Badge variant={
                            order.status === 'ready' ? 'default' :
                            order.status === 'cleaning' ? 'outline' : 'secondary'
                          } className="capitalize py-0 text-[10px] font-semibold">
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-primary">{order.amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 border bg-white">
            <CardHeader>
              <CardTitle className="text-base font-headline font-semibold">Active Pickup Schedule</CardTitle>
              <CardDescription>Scheduled house collection bookings.</CardDescription>
            </CardHeader>
            <CardContent>
              {activePickups.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                  <Truck className="h-8 w-8 text-stone-200" />
                  <p className="text-xs">No pending collections for today.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {activePickups.map((pickup, index) => (
                    <div key={pickup.id} className="flex items-center gap-3 p-3 rounded-xl border bg-stone-50/50 hover:bg-stone-50 transition-all">
                      <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-extrabold text-sm border border-primary/10">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="font-semibold text-foreground truncate">{pickup.customerName}</div>
                        <div className="text-[10px] text-muted-foreground font-medium font-mono truncate">{pickup.time} ({pickup.date})</div>
                      </div>
                      <Link href="/pickups">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <ArrowUpRight className="h-4 w-4 text-primary" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                  <Link href="/pickups" className="block mt-2">
                    <Button className="w-full text-xs" variant="outline">
                      Manage All Collections
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
