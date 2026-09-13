"use client"

import * as React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  totalOrders: number
  status: string
  lastOrder: string
}

export interface Pickup {
  id: string
  customerName: string
  customerPhone: string
  location: string
  time: string
  date: string
  items: string
  status: 'Scheduled' | 'Awaiting Confirmation' | 'Requested' | 'Completed' | 'Cancelled'
  amount: string
}

export interface Order {
  id: string
  customerName: string
  customerPhone: string
  location: string
  items: string
  status: 'picked' | 'cleaning' | 'ready' | 'delivered'
  date: string
  amount: string
  paid: boolean
  paymentMethod: 'Pesapal' | 'M-Pesa' | 'Card' | 'Unpaid'
}

export interface Payment {
  id: string
  orderId: string
  customerName: string
  amount: string
  phone: string
  method: 'Pesapal' | 'M-Pesa' | 'Card' | 'Airtel Money'
  status: 'Completed' | 'Pending' | 'Failed'
  date: string
  transactionRef: string
}

interface StoreContextType {
  customers: Customer[]
  pickups: Pickup[]
  orders: Order[]
  payments: Payment[]
  addCustomer: (customer: Omit<Customer, "id" | "totalOrders" | "lastOrder">) => void
  addPickup: (pickup: Omit<Pickup, "id" | "status">) => void
  updatePickupStatus: (id: string, status: Pickup['status']) => void
  addOrder: (order: Omit<Order, "id">) => void
  updateOrderStatus: (id: string, status: Order['status']) => void
  addPayment: (payment: Omit<Payment, "id" | "date" | "transactionRef"> & { transactionRef?: string }) => void
  resetStore: () => void
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

const initialCustomers: Customer[] = [
  {
    id: "CUST-001",
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "+254 712 345 678",
    address: "Kilimani, Galana Rd, Suite 402",
    totalOrders: 15,
    status: "Active",
    lastOrder: "2026-06-14"
  },
  {
    id: "CUST-002",
    name: "Mark Kibet",
    email: "mark@kibet.me",
    phone: "+254 722 000 111",
    address: "Westlands, Muthithi Rd",
    totalOrders: 8,
    status: "Active",
    lastOrder: "2026-06-12"
  },
  {
    id: "CUST-003",
    name: "Sarah Wanjiku",
    email: "sarah@gmail.com",
    phone: "+254 733 999 888",
    address: "Lavington, James Gichuru",
    totalOrders: 32,
    status: "VIP",
    lastOrder: "2026-06-15"
  },
  {
    id: "CUST-004",
    name: "David Otieno",
    email: "dotieno@work.com",
    phone: "+254 755 444 333",
    address: "South B, Golden Gate",
    totalOrders: 4,
    status: "Active",
    lastOrder: "2026-06-10"
  }
]

const initialPickups: Pickup[] = [
  {
    id: "PK-1001",
    customerName: "Jane Doe",
    customerPhone: "+254 712 345 678",
    location: "Kilimani, Galana Rd, Suite 402",
    time: "09:00 AM - 10:30 AM",
    date: "Today",
    items: "2 Bags (Large)",
    status: "Scheduled",
    amount: "KES 1,200"
  },
  {
    id: "PK-1002",
    customerName: "Mark Kibet",
    customerPhone: "+254 722 000 111",
    location: "Westlands, Muthithi Rd",
    time: "11:30 AM - 01:00 PM",
    date: "Today",
    items: "1 Bag (Small)",
    status: "Awaiting Confirmation",
    amount: "KES 600"
  },
  {
    id: "PK-1003",
    customerName: "Sarah Wanjiku",
    customerPhone: "+254 733 999 888",
    location: "Lavington, James Gichuru",
    time: "02:00 PM - 03:30 PM",
    date: "Today",
    items: "3 Bags (Mixed)",
    status: "Scheduled",
    amount: "KES 2,500"
  },
  {
    id: "PK-1004",
    customerName: "David Otieno",
    customerPhone: "+254 755 444 333",
    location: "South B, Golden Gate",
    time: "04:00 PM - 05:30 PM",
    date: "Tomorrow",
    items: "Curtains & Duvets",
    status: "Requested",
    amount: "KES 3,200"
  }
]

const initialOrders: Order[] = [
  {
    id: "ORD-001",
    customerName: "Jane Doe",
    customerPhone: "+254 712 345 678",
    location: "Kilimani, Galana Rd, Suite 402",
    items: "5x Shirts, 2x Trousers",
    status: "cleaning",
    date: "2 mins ago",
    amount: "KES 1,200",
    paid: false,
    paymentMethod: "Unpaid"
  },
  {
    id: "ORD-002",
    customerName: "John Smith",
    customerPhone: "+254 744 112 233",
    location: "Westlands",
    items: "1x Duvet, 2x Pillows",
    status: "ready",
    date: "1 hour ago",
    amount: "KES 2,450",
    paid: true,
    paymentMethod: "Card"
  },
  {
    id: "ORD-003",
    customerName: "Alice Wanjiku",
    customerPhone: "+254 733 444 555",
    location: "Lavington",
    items: "3 Bags Mixed",
    status: "picked",
    date: "4 hours ago",
    amount: "KES 800",
    paid: false,
    paymentMethod: "Unpaid"
  },
  {
    id: "ORD-004",
    customerName: "Bob M.",
    customerPhone: "+254 711 222 333",
    location: "South B",
    items: "Suit (Dry Clean)",
    status: "delivered",
    date: "Yesterday",
    amount: "KES 1,500",
    paid: true,
    paymentMethod: "M-Pesa"
  }
]

const initialPayments: Payment[] = [
  {
    id: "TXN-9001",
    orderId: "ORD-004",
    customerName: "Bob M.",
    amount: "KES 1,500",
    phone: "+254 711 222 333",
    method: "M-Pesa",
    status: "Completed",
    date: "2026-06-14 15:30 PM",
    transactionRef: "LSQR8X9J2K"
  },
  {
    id: "TXN-9002",
    orderId: "ORD-002",
    customerName: "John Smith",
    amount: "KES 2,450",
    phone: "+254 744 112 233",
    method: "Card",
    status: "Completed",
    date: "2026-06-15 08:15 AM",
    transactionRef: "CH4257129A"
  }
]

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [pickups, setPickups] = useState<Pickup[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [initialized, setInitialized] = useState(false)

  // Load from LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCustomers = localStorage.getItem("ls_customers")
      const savedPickups = localStorage.getItem("ls_pickups")
      const savedOrders = localStorage.getItem("ls_orders")
      const savedPayments = localStorage.getItem("ls_payments")

      setCustomers(savedCustomers ? JSON.parse(savedCustomers) : initialCustomers)
      setPickups(savedPickups ? JSON.parse(savedPickups) : initialPickups)
      setOrders(savedOrders ? JSON.parse(savedOrders) : initialOrders)
      setPayments(savedPayments ? JSON.parse(savedPayments) : initialPayments)
      setInitialized(true)
    }
  }, [])

  // Sync to LocalStorage
  useEffect(() => {
    if (initialized) {
      localStorage.setItem("ls_customers", JSON.stringify(customers))
      localStorage.setItem("ls_pickups", JSON.stringify(pickups))
      localStorage.setItem("ls_orders", JSON.stringify(orders))
      localStorage.setItem("ls_payments", JSON.stringify(payments))
    }
  }, [customers, pickups, orders, payments, initialized])

  const addCustomer = (cust: Omit<Customer, "id" | "totalOrders" | "lastOrder">) => {
    const newCust: Customer = {
      ...cust,
      id: `CUST-00${customers.length + 1}`,
      totalOrders: 0,
      lastOrder: "Never"
    }
    setCustomers(prev => [newCust, ...prev])
  }

  const addPickup = (pk: Omit<Pickup, "id" | "status">) => {
    const newPk: Pickup = {
      ...pk,
      id: `PK-${1001 + pickups.length}`,
      status: "Scheduled"
    }
    setPickups(prev => [newPk, ...prev])

    // Update customer stats if customer exists
    setCustomers(prev => prev.map(c => {
      if (c.name.toLowerCase() === pk.customerName.toLowerCase() || c.phone === pk.customerPhone) {
        return {
          ...c,
          totalOrders: c.totalOrders + 1,
          lastOrder: new Date().toISOString().split('T')[0]
        }
      }
      return c
    }))
  }

  const updatePickupStatus = (id: string, status: Pickup['status']) => {
    setPickups(prev => prev.map(p => {
      if (p.id === id) {
        // If status changes to Completed, automatically spawn an order!
        if (status === 'Completed' && p.status !== 'Completed') {
          addOrder({
            customerName: p.customerName,
            customerPhone: p.customerPhone,
            location: p.location,
            items: p.items,
            status: 'cleaning',
            date: 'Just now',
            amount: p.amount,
            paid: false,
            paymentMethod: 'Unpaid'
          })
        }
        return { ...p, status }
      }
      return p
    }))
  }

  const addOrder = (ord: Omit<Order, "id">) => {
    const newOrd: Order = {
      ...ord,
      id: `ORD-73${25 + orders.length}`
    }
    setOrders(prev => [newOrd, ...prev])
  }

  const updateOrderStatus = (id: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        return { ...o, status }
      }
      return o
    }))
  }

  const addPayment = (pay: Omit<Payment, "id" | "date" | "transactionRef"> & { transactionRef?: string }) => {
    const randomRef = pay.transactionRef || Math.random().toString(36).substring(2, 12).toUpperCase()
    const now = new Date()
    const formattedDate = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    
    const newPay: Payment = {
      ...pay,
      id: `TXN-${9001 + payments.length}`,
      date: formattedDate,
      transactionRef: randomRef
    }

    setPayments(prev => [newPay, ...prev])

    // Mark the order as paid!
    setOrders(prev => prev.map(o => {
      if (o.id === pay.orderId) {
        return {
          ...o,
          paid: true,
          paymentMethod: pay.method as any
        }
      }
      return o
    }))
  }

  const resetStore = () => {
    setCustomers(initialCustomers)
    setPickups(initialPickups)
    setOrders(initialOrders)
    setPayments(initialPayments)
  }

  return (
    <StoreContext.Provider value={{
      customers,
      pickups,
      orders,
      payments,
      addCustomer,
      addPickup,
      updatePickupStatus,
      addOrder,
      updateOrderStatus,
      addPayment,
      resetStore
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider")
  }
  return context
}
