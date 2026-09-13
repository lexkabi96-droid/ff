import { NextRequest, NextResponse } from "next/server"
import { pesapalTransactions, pesapalLogs, addPesapalLog, PesapalTransaction } from "@/lib/pesapal-db"

export async function POST(req: NextRequest) {
  try {
    let orderTrackingId: string | undefined
    let reason = "Manual Operator Trigger"

    try {
      const body = await req.json()
      if (body) {
        orderTrackingId = body.orderTrackingId
        if (body.reason) reason = body.reason
      }
    } catch {
      // Body may be empty
    }

    // If orderTrackingId not specified, find the most relevant failed transaction
    let targetTx: PesapalTransaction | undefined
    if (orderTrackingId) {
      targetTx = pesapalTransactions.get(orderTrackingId)
    }

    if (!targetTx) {
      // Find the first failed transaction from existing transactions
      const txs = Array.from(pesapalTransactions.values())
      targetTx = txs.find(t => t.status === "Failed") || txs[0]
    }

    // If still no transaction exists, create a simulated failed one to retry
    if (!targetTx) {
      const fallbackTrackingId = `track-${Date.now().toString(36)}`
      targetTx = {
        orderTrackingId: fallbackTrackingId,
        merchantReference: `ORD-${Math.floor(100 + Math.random() * 900)}`,
        orderId: `ORD-${Math.floor(100 + Math.random() * 900)}`,
        amount: 1500,
        currency: "KES",
        description: "Laundry Service - Recovered IPN",
        customerName: "Recovered Customer",
        customerEmail: "customer@example.com",
        customerPhone: "0722 000 111",
        status: "Failed",
        statusCode: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      pesapalTransactions.set(fallbackTrackingId, targetTx)
    }

    const trackingId = targetTx.orderTrackingId
    const previousStatus = targetTx.status

    // 1. Log manual retry initiation in audit trail
    addPesapalLog("IPN_RETRY_INITIATED", {
      orderTrackingId: trackingId,
      merchantReference: targetTx.merchantReference,
      previousStatus,
      triggerReason: reason,
      endpoint: "/api/pesapal/ipn",
      timestamp: new Date().toISOString()
    })

    // 2. Simulate re-delivery of IPN callback from Pesapal server
    const confirmationCode = targetTx.confirmationCode && !targetTx.confirmationCode.includes("FAIL")
      ? targetTx.confirmationCode
      : `PESA-RETRY-${Math.floor(1000 + Math.random() * 9000)}-OK`

    targetTx.status = "Completed"
    targetTx.statusCode = 1
    targetTx.confirmationCode = confirmationCode
    if (!targetTx.paymentMethod || targetTx.paymentMethod === "Unknown") {
      targetTx.paymentMethod = "M-Pesa (Pesapal)"
    }
    targetTx.updatedAt = new Date().toISOString()
    pesapalTransactions.set(trackingId, targetTx)

    // 3. Log successful retry acknowledgment in audit trail
    addPesapalLog("IPN_RETRY_SUCCESS", {
      orderTrackingId: trackingId,
      merchantReference: targetTx.merchantReference,
      status: "Completed",
      confirmationCode,
      httpStatus: 200,
      note: "IPN webhook re-delivery accepted. Ledger and order updated."
    })

    return NextResponse.json({
      success: true,
      message: `IPN webhook notification successfully retried for order ${targetTx.merchantReference}. Status updated to Completed.`,
      orderTrackingId: trackingId,
      transaction: targetTx
    })
  } catch (error: any) {
    addPesapalLog("IPN_RETRY_FAILED", { error: error.message || error })
    return NextResponse.json({ error: error.message || error }, { status: 500 })
  }
}
