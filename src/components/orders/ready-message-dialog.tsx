"use client"

import * as React from "react"
import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Loader2, Send, MessageSquareCode } from "lucide-react"
import { generateCustomerPickupMessage } from "@/ai/flows/generate-customer-pickup-message"
import { useToast } from "@/hooks/use-toast"

interface ReadyMessageDialogProps {
  customerName: string
  orderId: string
  items: string
}

export function ReadyMessageDialog({ customerName, orderId, items }: ReadyMessageDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [generatedMessage, setGeneratedMessage] = useState("")
  
  const [pickupDate, setPickupDate] = useState("Today")
  const [pickupTime, setPickupTime] = useState("at your earliest convenience")
  const { toast } = useToast()

  const handleGenerate = async () => {
    setLoading(true)
    try {
      // We invoke the server-aide AI Genkit flow with "service_update" purpose
      const result = await generateCustomerPickupMessage({
        customerName,
        pickupDate,
        pickupTime,
        pickupLocation: "LaunderSync Hub Station",
        messagePurpose: "service_update",
        additionalDetails: `Order ${orderId} (${items}) is fully clean, fresh, pressed, and ready for you to pick up!`
      })
      setGeneratedMessage(result.message)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate collection alert. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => {
    toast({
      title: "Notification Dispatched",
      description: `Collection alert sent successfully to ${customerName}!`,
    })
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-primary border-primary/20 hover:bg-primary/5">
          <MessageSquareCode className="h-4 w-4" />
          Ready Alert (AI)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline">
            <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
            AI Collection Notifier
          </DialogTitle>
          <DialogDescription>
            Generate a personalized "Ready for Pickup" notification for {customerName}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="order-ref" className="text-right">Order Ref</Label>
            <Input id="order-ref" value={orderId} disabled className="col-span-3 bg-muted/30" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ready-day" className="text-right">Availability</Label>
            <Input 
              id="ready-day" 
              value={pickupDate} 
              onChange={(e) => setPickupDate(e.target.value)} 
              className="col-span-3" 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ready-hours" className="text-right">Hours</Label>
            <Input 
              id="ready-hours" 
              value={pickupTime} 
              onChange={(e) => setPickupTime(e.target.value)} 
              className="col-span-3" 
            />
          </div>
          
          <div className="mt-2">
            <Button 
              onClick={handleGenerate} 
              disabled={loading} 
              className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-primary text-white hover:from-indigo-600 hover:to-primary/95 shadow-sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Draft Delivery / Collection Message
            </Button>
          </div>

          {generatedMessage && (
            <div className="space-y-2 animate-fade-in">
              <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Generated SMS Alert</Label>
              <Textarea 
                value={generatedMessage} 
                onChange={(e) => setGeneratedMessage(e.target.value)}
                className="min-h-[140px] bg-yellow-50/20 border-yellow-100 font-sans leading-relaxed"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={!generatedMessage} className="gap-2 bg-green-600 text-white hover:bg-green-700">
            <Send className="h-4 w-4" />
            Send ready SMS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
