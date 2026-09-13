
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
import { MessageSquare, Sparkles, Loader2, Send } from "lucide-react"
import { generateCustomerPickupMessage } from "@/ai/flows/generate-customer-pickup-message"
import { useToast } from "@/hooks/use-toast"

interface PickupMessageDialogProps {
  customerName: string
  location: string
}

export function PickupMessageDialog({ customerName, location }: PickupMessageDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [generatedMessage, setGeneratedMessage] = useState("")
  
  const [pickupDate, setPickupDate] = useState("Tomorrow, May 16th")
  const [pickupTime, setPickupTime] = useState("between 9 AM and 11 AM")
  const { toast } = useToast()

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const result = await generateCustomerPickupMessage({
        customerName,
        pickupDate,
        pickupTime,
        pickupLocation: location,
        messagePurpose: "schedule",
        additionalDetails: "Please ensure clothes are bagged separately."
      })
      setGeneratedMessage(result.message)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate message. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => {
    toast({
      title: "Success",
      description: `Message sent to ${customerName}!`,
    })
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Message Drafter
          </DialogTitle>
          <DialogDescription>
            Generate a personalized pickup notification for {customerName}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">Date</Label>
            <Input 
              id="date" 
              value={pickupDate} 
              onChange={(e) => setPickupDate(e.target.value)} 
              className="col-span-3" 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time" className="text-right">Time</Label>
            <Input 
              id="time" 
              value={pickupTime} 
              onChange={(e) => setPickupTime(e.target.value)} 
              className="col-span-3" 
            />
          </div>
          
          <div className="mt-2">
            <Button 
              onClick={handleGenerate} 
              disabled={loading} 
              className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Draft
            </Button>
          </div>

          {generatedMessage && (
            <div className="space-y-2">
              <Label>Draft Message</Label>
              <Textarea 
                value={generatedMessage} 
                onChange={(e) => setGeneratedMessage(e.target.value)}
                className="min-h-[120px] bg-muted/30"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={!generatedMessage} className="gap-2">
            <Send className="h-4 w-4" />
            Send via SMS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
