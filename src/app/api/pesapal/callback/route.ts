import { NextRequest, NextResponse } from "next/server"
import { pesapalTransactions, addPesapalLog } from "@/lib/pesapal-db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderTrackingId = searchParams.get("OrderTrackingId") || searchParams.get("orderTrackingId");
    const orderMerchantReference = searchParams.get("OrderMerchantReference") || searchParams.get("merchantReference");

    addPesapalLog("CALLBACK_REDIRECT_TRIGGERED", {
      orderTrackingId,
      orderMerchantReference
    });

    if (orderTrackingId) {
      const tx = pesapalTransactions.get(orderTrackingId);
      if (tx && tx.status === "Pending") {
        tx.status = "Completed";
        tx.confirmationCode = tx.confirmationCode || `PESA-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        tx.updatedAt = new Date().toISOString();
        pesapalTransactions.set(orderTrackingId, tx);
      }
    }

    // Redirect to payments or orders page with query param
    return NextResponse.redirect(new URL(`/orders?pesapalPaid=${orderMerchantReference || orderTrackingId}`, req.url));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || error }, { status: 500 });
  }
}
