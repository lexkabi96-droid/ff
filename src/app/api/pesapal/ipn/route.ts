import { NextRequest, NextResponse } from "next/server"
import { pesapalTransactions, addPesapalLog } from "@/lib/pesapal-db"

// Pesapal IPN Notification Handler (supports both GET and POST IPN formats from Pesapal v3)
export async function GET(req: NextRequest) {
  return handleIpn(req);
}

export async function POST(req: NextRequest) {
  return handleIpn(req);
}

async function handleIpn(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let orderTrackingId = searchParams.get("OrderTrackingId") || searchParams.get("orderTrackingId");
    let orderMerchantReference = searchParams.get("OrderMerchantReference") || searchParams.get("merchantReference");
    let notificationType = searchParams.get("OrderNotificationType") || "IPNCHANGE";

    // Also check JSON body if POST
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body) {
          orderTrackingId = orderTrackingId || body.OrderTrackingId || body.orderTrackingId;
          orderMerchantReference = orderMerchantReference || body.OrderMerchantReference || body.merchantReference;
          notificationType = notificationType || body.OrderNotificationType || "IPNCHANGE";
        }
      } catch {
        // Body may be empty in some GET/POST setups
      }
    }

    addPesapalLog("IPN_NOTIFICATION_RECEIVED", {
      orderTrackingId,
      orderMerchantReference,
      notificationType,
      method: req.method
    });

    if (!orderTrackingId) {
      return NextResponse.json({ error: "Missing OrderTrackingId in IPN payload" }, { status: 400 });
    }

    const tx = pesapalTransactions.get(orderTrackingId);
    if (tx) {
      // By default if IPN arrives without an explicit failure, update to Completed
      if (tx.status === "Pending") {
        tx.status = "Completed";
        tx.confirmationCode = tx.confirmationCode || `PESA-${Math.floor(1000 + Math.random() * 9000)}-OK`;
        tx.updatedAt = new Date().toISOString();
        pesapalTransactions.set(orderTrackingId, tx);

        addPesapalLog("IPN_TRANSACTION_CONFIRMED", {
          orderTrackingId,
          status: "Completed",
          confirmationCode: tx.confirmationCode
        });
      }
    } else {
      // Record incoming IPN reference
      const newTx = {
        orderTrackingId,
        merchantReference: orderMerchantReference || `ORD-UNKNOWN`,
        orderId: orderMerchantReference || `ORD-UNKNOWN`,
        amount: 0,
        currency: "KES",
        description: "Pesapal IPN Order",
        customerName: "Customer",
        customerEmail: "customer@example.com",
        customerPhone: "N/A",
        status: "Completed" as const,
        confirmationCode: `PESA-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      pesapalTransactions.set(orderTrackingId, newTx);
    }

    // Pesapal expects this standard acknowledgment structure
    return NextResponse.json({
      orderNotificationType: notificationType,
      orderTrackingId: orderTrackingId,
      status: "200"
    });
  } catch (error: any) {
    addPesapalLog("IPN_PROCESSING_CRASHED", { error: error.message || error });
    return NextResponse.json({ error: "Failed to process IPN" }, { status: 500 });
  }
}
