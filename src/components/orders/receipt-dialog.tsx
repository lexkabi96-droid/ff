"use client"

import * as React from "react"
import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Printer, 
  CheckCircle,
  Copy,
  Receipt as ReceiptIcon
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Order, Payment } from "@/context/store-context"

interface ReceiptDialogProps {
  order: Order
  payment?: Payment
  trigger?: React.ReactNode
}

export function ReceiptDialog({ order, payment, trigger }: ReceiptDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Itemize products from order description
  const itemsList = React.useMemo(() => {
    if (!order.items) return [{ name: "Laundry Services", qty: 1, price: order.amount, total: order.amount }]
    
    // Parse things like "5x Shirts, 2x Trousers" or "1x Duvet"
    try {
      const parts = order.items.split(",")
      return parts.map(part => {
        const trimmed = part.trim()
        const match = trimmed.match(/^(\d+)x\s+(.+)$/)
        if (match) {
          const qty = parseInt(match[1])
          const name = match[2]
          // Estimate price based on total amount grouped
          const numericTotal = parseFloat(order.amount.replace(/[^0-9.]/g, "")) || 1000
          const unitPrice = Math.round(numericTotal / qty / parts.length)
          return {
            name,
            qty,
            price: `KES ${unitPrice.toLocaleString()}`,
            total: `KES ${(unitPrice * qty).toLocaleString()}`
          }
        }
        return {
          name: trimmed,
          qty: 1,
          price: order.amount,
          total: order.amount
        }
      })
    } catch {
      return [{ name: order.items, qty: 1, price: order.amount, total: order.amount }]
    }
  }, [order])

  const subtotal = order.amount
  const tax = "KES 0"
  const total = order.amount

  const handleCopyRef = () => {
    const ref = payment?.transactionRef || "N/A"
    navigator.clipboard.writeText(ref)
    toast({
      title: "Copied!",
      description: `Transaction reference ${ref} copied to clipboard.`
    })
  }

  // Generate JPEG receipt using Canvas
  const downloadJPEG = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set high-DPI scaling
    canvas.width = 450
    canvas.height = 650

    // White background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Border
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 4
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20)

    // Header Branding
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    ctx.fillStyle = "#2563eb" // primary accent
    ctx.textAlign = "center"
    ctx.fillText("LaunderSync", canvas.width / 2, 50)

    ctx.font = "italic 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    ctx.fillStyle = "#4b5563"
    ctx.fillText("Effortless Laundry Care & Logistics", canvas.width / 2, 70)

    // Separator
    ctx.font = "14px monospace"
    ctx.fillStyle = "#9ca3af"
    ctx.fillText("- - - - - - - - - - - - - - - - - - - - - - - - -", canvas.width / 2, 95)

    // Receipt details (Left-aligned)
    ctx.textAlign = "left"
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, sans-serif"
    ctx.fillStyle = "#111827"
    ctx.fillText("RECEIPT / INVOICE SCHEDULE", 40, 120)

    ctx.font = "13px -apple-system, BlinkMacSystemFont, sans-serif"
    ctx.fillStyle = "#4b5563"
    ctx.fillText(`Receipt ID: ${order.id}`, 40, 145)
    ctx.fillText(`Date: June 15, 2026`, 40, 165)
    ctx.fillText(`Customer: ${order.customerName}`, 40, 185)
    ctx.fillText(`Phone: ${order.customerPhone || "N/A"}`, 40, 205)

    // Reference
    if (payment) {
      ctx.font = "bold 13px monospace"
      ctx.fillStyle = "#10b981"
      ctx.fillText(`REF: ${payment.transactionRef} [${payment.method}]`, 40, 230)
    }

    // Separator
    ctx.textAlign = "center"
    ctx.font = "14px monospace"
    ctx.fillStyle = "#9ca3af"
    ctx.fillText("- - - - - - - - - - - - - - - - - - - - - - - - -", canvas.width / 2, 255)

    // Table Headers
    ctx.textAlign = "left"
    ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, sans-serif"
    ctx.fillStyle = "#374151"
    ctx.fillText("Item Description", 40, 280)
    ctx.textAlign = "right"
    ctx.fillText("Qty", 260, 280)
    ctx.fillText("Rate", 340, 280)
    ctx.fillText("Amount", 410, 280)

    // Separator line
    ctx.textAlign = "center"
    ctx.fillText("___________________________________________________", canvas.width / 2, 290)

    // Table Rows
    let currentY = 320
    ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif"
    ctx.fillStyle = "#4b5563"
    itemsList.forEach((item) => {
      ctx.textAlign = "left"
      let itemName = item.name
      if (itemName.length > 22) itemName = itemName.substring(0, 20) + ".."
      ctx.fillText(itemName, 40, currentY)
      ctx.textAlign = "right"
      ctx.fillText(item.qty.toString(), 260, currentY)
      ctx.fillText(item.price, 340, currentY)
      ctx.fillText(item.total, 410, currentY)
      currentY += 24
    })

    // Separator line
    ctx.textAlign = "center"
    ctx.font = "14px monospace"
    ctx.fillStyle = "#9ca3af"
    ctx.fillText("- - - - - - - - - - - - - - - - - - - - - - - - -", canvas.width / 2, currentY + 10)

    // Summary block (Right aligned)
    currentY += 35
    ctx.textAlign = "right"
    ctx.font = "13px -apple-system, BlinkMacSystemFont, sans-serif"
    ctx.fillStyle = "#4b5563"
    ctx.fillText("Subtotal:", 300, currentY)
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, sans-serif"
    ctx.fillStyle = "#111827"
    ctx.fillText(subtotal, 410, currentY)

    currentY += 20
    ctx.textAlign = "right"
    ctx.font = "13px -apple-system, BlinkMacSystemFont, sans-serif"
    ctx.fillStyle = "#4b5563"
    ctx.fillText("VAT (0%):", 300, currentY)
    ctx.fillText("KES 0", 410, currentY)

    currentY += 25
    ctx.fillStyle = "#2563eb"
    ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, sans-serif"
    ctx.fillText("TOTAL PAID:", 300, currentY)
    ctx.fillText(total, 410, currentY)

    // Draw barcode/QR code placeholder
    currentY += 45
    ctx.strokeStyle = "#374151"
    ctx.lineWidth = 1
    ctx.strokeRect(canvas.width / 2 - 80, currentY, 160, 4)
    ctx.strokeRect(canvas.width / 2 - 80, currentY + 8, 160, 6)
    ctx.strokeRect(canvas.width / 2 - 80, currentY + 18, 160, 4)

    // Footer lines
    currentY += 45
    ctx.textAlign = "center"
    ctx.fillStyle = "#10b981"
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, sans-serif"
    ctx.fillText("★ PAID / COMPLETED ★", canvas.width / 2, currentY)

    currentY += 20
    ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif"
    ctx.fillStyle = "#6b7280"
    ctx.fillText("Thank you for using LaunderSync!", canvas.width / 2, currentY)

    // Trigger download
    const image = canvas.toDataURL("image/jpeg", 0.95)
    const link = document.createElement("a")
    link.href = image
    link.download = `LaunderSync_Receipt_${order.id}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Success",
      description: "JPEG Receipt downloaded successfully."
    })
  }

  // Pure Vector Print PDF
  const downloadPDF = () => {
    // We create a custom styled window for printing the receipt isolated from layout, which saves perfect Vector PDF!
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast({
        title: "Print Blocked",
        description: "Please allow popups to save/print recipes.",
        variant: "destructive"
      })
      return
    }

    const receiptHTML = `
      <html>
        <head>
          <title>LaunderSync Receipt - ${order.id}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1f2937;
              padding: 40px;
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .receipt-container {
              border: 1px solid #e5e7eb;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            }
            .header {
              text-align: center;
              margin-bottom: 300px;
              border-bottom: 2px dashed #9ca3af;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #2563eb;
              margin: 0 0 5px 0;
              font-size: 28px;
            }
            .header p {
              color: #4b5563;
              margin: 0;
              font-style: italic;
              font-size: 14px;
            }
            .meta-section {
              margin: 20px 0;
              line-height: 1.6;
              font-size: 14px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .meta-label {
              color: #6b7280;
            }
            .meta-value {
              font-weight: 500;
            }
            .table-container {
              margin: 30px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 14px;
            }
            th {
              border-bottom: 2px solid #111827;
              text-align: left;
              padding: 10px 0;
              font-weight: bold;
              color: #374151;
            }
            td {
              padding: 12px 0;
              border-bottom: 1px solid #f3f4f6;
              color: #4b5563;
            }
            .text-right {
              text-align: right;
            }
            .summary {
              margin-top: 20px;
              font-size: 15px;
              line-height: 1.8;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
            }
            .total-row {
              font-size: 18px;
              font-weight: bold;
              color: #2563eb;
              border-top: 2px solid #e5e7eb;
              padding-top: 10px;
              margin-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px dashed #e5e7eb;
              font-size: 12px;
              color: #6b7280;
            }
            .status-badge {
              display: inline-block;
              background-color: #d1fae5;
              color: #065f46;
              font-weight: bold;
              padding: 6px 16px;
              border-radius: 9999px;
              font-size: 12px;
              text-transform: uppercase;
              margin-top: 15px;
            }
            @media print {
              body {
                padding: 0;
                background-color: transparent;
              }
              .receipt-container {
                border: none;
                box-shadow: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <h1>LaunderSync</h1>
              <p>Effortless Laundry Care & Logistics</p>
              <div class="status-badge">Paid & Completed</div>
            </div>
            
            <div class="meta-section">
              <div class="meta-row">
                <span class="meta-label">Receipt ID</span>
                <span class="meta-value">${order.id}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Date Generated</span>
                <span class="meta-value">June 15, 2026</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Customer Name</span>
                <span class="meta-value">${order.customerName}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Phone Reference</span>
                <span class="meta-value">${order.customerPhone || "N/A"}</span>
              </div>
              ${payment ? `
                <div class="meta-row" style="margin-top: 12px; font-family: monospace; color: #10b981;">
                  <span class="meta-label">Payment Channel</span>
                  <span class="meta-value">${payment.method} (${payment.transactionRef})</span>
                </div>
              ` : ''}
            </div>

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Rate</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList.map(item => `
                    <tr>
                      <td>${item.name}</td>
                      <td class="text-right">${item.qty}</td>
                      <td class="text-right">${item.price}</td>
                      <td class="text-right">${item.total}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>

            <div class="summary">
              <div class="summary-row">
                <span class="meta-label">Subtotal</span>
                <span class="meta-value">${subtotal}</span>
              </div>
              <div class="summary-row">
                <span class="meta-label">VAT & Tax (0%)</span>
                <span class="meta-value">${tax}</span>
              </div>
              <div class="summary-row total-row">
                <span>Amount Paid</span>
                <span>${total}</span>
              </div>
            </div>

            <div class="footer">
              <p>For support contact support@laundersync.co.ke</p>
              <p>&copy; 2026 LaunderSync Inc. Thank you for your business!</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(receiptHTML)
    printWindow.document.close()

    toast({
      title: "Success",
      description: "PDF Print prompt initiated successfully!"
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <ReceiptIcon className="h-4 w-4" />
            Receipt
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-headline">
            <ReceiptIcon className="h-5 w-5" />
            Invoice Receipt Details
          </DialogTitle>
          <DialogDescription>
            Official digital receipt for order reference {order.id}.
          </DialogDescription>
        </DialogHeader>

        {/* Visual Receipt Card mimicking dynamic invoice ticket */}
        <div className="border border-border rounded-xl p-5 bg-stone-50/50 space-y-4 shadow-sm text-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-blue-100 flex items-center justify-center -mr-5 -mt-5 rotate-45 text-blue-800 font-bold uppercase text-[10px] tracking-wide">
            Paid
          </div>

          <div className="text-center space-y-1">
            <h3 className="font-bold text-xl text-primary font-headline tracking-tight">LaunderSync</h3>
            <p className="text-xs text-muted-foreground italic">Effortless Laundry Care & Logistics</p>
            <div className="border-b border-dashed border-gray-300 my-2 pt-2" />
          </div>

          <div className="grid grid-cols-2 gap-y-1.5 text-xs">
            <span className="text-muted-foreground">Receipt ID:</span>
            <span className="text-right font-medium">{order.id}</span>

            <span className="text-muted-foreground">Date Completed:</span>
            <span className="text-right font-medium">June 15, 2026</span>

            <span className="text-muted-foreground">Customer:</span>
            <span className="text-right font-medium">{order.customerName}</span>

            <span className="text-muted-foreground">Phone Reference:</span>
            <span className="text-right font-medium">{order.customerPhone || "N/A"}</span>
          </div>

          {payment && (
            <div className="flex justify-between items-center bg-green-50/50 border border-green-100/50 p-2.5 rounded-lg text-xs mt-2 text-green-700">
              <span className="font-semibold">M-Pesa ID: <span className="font-mono">{payment.transactionRef}</span></span>
              <Button size="icon" variant="ghost" className="h-5 w-5 text-green-700 hover:text-green-800 hover:bg-green-100" onClick={handleCopyRef}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}

          <div className="border-b border-dashed border-gray-300 my-2 pt-2" />

          {/* Itemized Table */}
          <div className="space-y-2">
            <div className="grid grid-cols-4 font-bold text-xs text-muted-foreground uppercase">
              <span className="col-span-2">Item</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Total</span>
            </div>
            <div className="space-y-1.5 divide-y divide-gray-100">
              {itemsList.map((item, index) => (
                <div key={index} className="grid grid-cols-4 text-xs pt-1.5 font-medium">
                  <span className="col-span-2 text-foreground truncate">{item.name}</span>
                  <span className="text-center text-muted-foreground">{item.qty}</span>
                  <span className="text-right text-foreground">{item.total}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-b border-dashed border-gray-300 my-2 pt-2" />

          {/* Subtotal and Summary */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT / Tax</span>
              <span>{tax}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-primary pt-1 border-t border-gray-100 mt-1">
              <span>Grand Total</span>
              <span>{total}</span>
            </div>
          </div>

          {/* Clean Mock Barcode decorations */}
          <div className="pt-3 flex flex-col items-center space-y-1">
            <div className="h-7 w-2/3 border border-gray-300 bg-gray-100 flex items-center justify-around overflow-hidden p-0.5 opacity-80">
              {[...Array(24)].map((_, i) => (
                <div key={i} className="bg-gray-800 h-full" style={{ width: `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2)}px` }} />
              ))}
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">LAUNDERSYNC-TRACKING-ID</span>
          </div>
        </div>

        {/* Hidden system Canvas for JPEG generation */}
        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter className="sm:justify-between gap-4 mt-2">
          <Button variant="outline" size="sm" onClick={downloadJPEG} className="gap-2 flex-1">
            <ImageIcon className="h-4 w-4" />
            Download JPEG Image
          </Button>
          <Button variant="default" size="sm" onClick={downloadPDF} className="gap-2 flex-1 bg-primary">
            <Printer className="h-4 w-4" />
            Save / Print PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
