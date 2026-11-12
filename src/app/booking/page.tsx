'use client'

import * as React from 'react'
import { useState } from 'react'
import { useStore } from '@/context/store-context'
import { SERVICE_CATEGORY_LABELS, SERVICE_CATEGORY_KEYS } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  PackageCheck,
  Truck,
  MapPin,
  CheckCircle2,
  Phone,
  ArrowLeft,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

const serviceKeys = SERVICE_CATEGORY_KEYS
const serviceLabels = SERVICE_CATEGORY_LABELS

export default function CustomerBookingPortal() {
  const { addPickup } = useStore()
  const { toast } = useToast()

  // Form states
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [serviceParam, setServiceParam] = useState(serviceLabels.laundry)
  const [dateParam, setDateParam] = useState('Today')
  const [timeParam, setTimeParam] = useState('09:00 AM - 10:30 AM')
  const [itemsParam, setItemsParam] = useState('1 Bag (Medium)')
  const [estimateParam, setEstimateParam] = useState('KES 800')

  const [step, setStep] = useState<'form' | 'success'>('form')
  const [bookingId, setBookingId] = useState('')

  const isLaundry = serviceParam === serviceLabels.laundry

  const handleCalculateEstimate = (load: string) => {
    setItemsParam(load)
    if (load === '1 Bag (Small)') setEstimateParam('KES 600')
    else if (load === '1 Bag (Medium)') setEstimateParam('KES 800')
    else if (load === '2 Bags (Large)') setEstimateParam('KES 1,200')
    else if (load === '3 Bags (Mixed)') setEstimateParam('KES 2,400')
    else if (load === 'Curtains & Duvets') setEstimateParam('KES 3,200')
  }

  const handleServiceChange = (service: string) => {
    setServiceParam(service)
    if (service === serviceLabels.laundry) {
      setItemsParam('1 Bag (Medium)')
      setEstimateParam('KES 800')
    } else {
      setItemsParam('')
      setEstimateParam('Quoted after review')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !phone || !address || !itemsParam.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all details correctly.',
        variant: 'destructive'
      })
      return
    }

    // Insert to store
    addPickup({
      customerName: name,
      customerPhone: phone,
      location: address,
      date: dateParam,
      time: timeParam,
      items: isLaundry ? itemsParam : serviceParam + ': ' + itemsParam.trim(),
      amount: estimateParam,
      serviceType: serviceParam
    })

    const newId = 'PK-' + Math.floor(1000 + Math.random() * 9000)
    setBookingId(newId)
    setStep('success')

    toast({
      title: 'Booking Received',
      description: 'Our courier dispatcher has locked your time slot!'
    })
  }

  return (
    <div className="min-h-screen bg-stone-50 text-foreground flex flex-col justify-between py-10 px-4 md:px-6 relative overflow-hidden">
      {/* Background gradients decor */}
      <div className="absolute top-0 left-1/4 h-80 w-80 bg-blue-100 rounded-full blur-3xl opacity-30 -translate-y-20 z-0" />
      <div className="absolute bottom-0 right-1/4 h-80 w-80 bg-emerald-100 rounded-full blur-3xl opacity-30 translate-y-20 z-0" />

      <header className="max-w-2xl mx-auto w-full z-10 text-center mb-6">
        <div className="flex justify-center items-center gap-2 mb-2">
          <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-md shadow-blue-500/10">
            <PackageCheck className="h-6 w-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-primary font-headline">LaunderSync</span>
        </div>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Self-service Booking Portal</p>
      </header>

      <main className="max-w-xl mx-auto w-full z-10 flex-1 flex items-center justify-center">
        {step === 'form' ? (
          <Card className="shadow-lg border bg-white/80 backdrop-blur-md w-full rounded-2xl">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-xl font-bold font-headline">Schedule a Service</CardTitle>
              <CardDescription>
                Choose a service, share your location and pick a convenient time slot.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="cust-name">Your Full Name *</Label>
                  <Input
                    id="cust-name"
                    placeholder="Wanjiku Kamau"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-stone-50/50"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="cust-phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cust-phone"
                        placeholder="+254 712 345 678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="pl-9 bg-stone-50/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cust-service">Service Needed</Label>
                    <Select value={serviceParam} onValueChange={handleServiceChange}>
                      <SelectTrigger className="bg-stone-50/50">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceKeys.map((key) => (
                          <SelectItem key={key} value={serviceLabels[key]}>
                            {serviceLabels[key]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isLaundry ? (
                  <div className="space-y-1">
                    <Label htmlFor="cust-load">Garment Volume</Label>
                    <Select value={itemsParam} onValueChange={handleCalculateEstimate}>
                      <SelectTrigger className="bg-stone-50/50">
                        <SelectValue placeholder="Select scale load" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1 Bag (Small)">1 Bag (Small) - Regular items</SelectItem>
                        <SelectItem value="1 Bag (Medium)">1 Bag (Medium) - Standard load</SelectItem>
                        <SelectItem value="2 Bags (Large)">2 Bags (Large) - Multi-load</SelectItem>
                        <SelectItem value="3 Bags (Mixed)">3 Bags (Mixed) - Heavily bulky</SelectItem>
                        <SelectItem value="Curtains & Duvets">Dry Cleaning - Curtains/Duvets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label htmlFor="cust-desc">Describe the job *</Label>
                    <Input
                      id="cust-desc"
                      placeholder="e.g. 3-bedroom deep clean on Saturday"
                      value={itemsParam}
                      onChange={(e) => setItemsParam(e.target.value)}
                      className="bg-stone-50/50"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="cust-addr">Pickup Location Address *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-red-500" />
                    <Input
                      id="cust-addr"
                      placeholder="Kilimani Estate, Galana Rd, House Apt 14"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      className="pl-9 bg-stone-50/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="cust-day">Collection Day</Label>
                    <Select value={dateParam} onValueChange={setDateParam}>
                      <SelectTrigger className="bg-stone-50/50">
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Today">Today</SelectItem>
                        <SelectItem value="Tomorrow">Tomorrow</SelectItem>
                        <SelectItem value="In 2 days">In 2 days</SelectItem>
                        <SelectItem value="This weekend">This weekend</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="cust-slot">Time Window</Label>
                    <Select value={timeParam} onValueChange={setTimeParam}>
                      <SelectTrigger className="bg-stone-50/50">
                        <SelectValue placeholder="Select slot" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:00 AM - 10:30 AM">09:00 AM - 10:30 AM</SelectItem>
                        <SelectItem value="11:30 AM - 01:00 PM">11:30 AM - 01:00 PM</SelectItem>
                        <SelectItem value="02:00 PM - 03:30 PM">02:00 PM - 03:30 PM</SelectItem>
                        <SelectItem value="04:00 PM - 05:30 PM">04:00 PM - 05:30 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Estimate block */}
                <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100 p-3.5 rounded-xl mt-2 select-none">
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Estimated Price Quote</span>
                    <span className="text-sm font-semibold text-blue-800">{serviceParam}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-blue-600 block">{estimateParam}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full bg-primary hover:bg-primary/95 text-white py-6 rounded-xl font-headline font-semibold gap-2 shadow shadow-blue-500/10">
                  <Truck className="h-5 w-5" />
                  Confirm Booking
                </Button>
                <Link href="/" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1 transition-colors">
                  <ArrowLeft className="h-3 w-3" />
                  Go back to Dashboard Panel
                </Link>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card className="shadow-lg border bg-white/80 backdrop-blur-md w-full rounded-2xl text-center py-8">
            <CardContent className="space-y-5">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl shadow shadow-emerald-500/5 border border-emerald-200 animate-bounce">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-extrabold text-primary font-headline">Booking Registered!</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                  Excellent, {name}. Our courier has locked slot <span className="font-semibold text-gray-700">{timeParam} ({dateParam})</span>.
                </p>
              </div>

              <div className="bg-stone-50 border p-4 rounded-xl max-w-sm mx-auto space-y-2 text-xs text-left">
                <div className="flex justify-between font-bold text-gray-700">
                  <span>Booking Reference:</span>
                  <span className="font-mono text-primary text-sm">{bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service:</span>
                  <span className="font-semibold text-foreground">{serviceParam}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Job Description:</span>
                  <span className="font-semibold text-foreground">{itemsParam.trim()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Amount Due:</span>
                  <span className="font-extrabold text-primary">{estimateParam}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address Location:</span>
                  <span className="font-semibold text-foreground truncate max-w-[140px]">{address}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 max-w-xs mx-auto text-[10px] text-amber-700 bg-amber-50 border border-amber-100 p-2.5 rounded-lg text-left leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                <span>Keep your booking reference handy. A QR label will be attached to your job for verified pickup and drop-off.</span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button onClick={() => setStep('form')} variant="outline" className="w-full max-w-xs rounded-xl">
                Book Another Service
              </Button>
              <Link href="/">
                <Button variant="ghost" className="text-xs text-primary gap-1">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}
      </main>

      <footer className="max-w-md mx-auto w-full z-10 text-center text-xs text-muted-foreground select-none">
        <p>&copy; 2026 LaunderSync Inc. For immediate inquiry call +254 700 000 000</p>
      </footer>
    </div>
  )
}
