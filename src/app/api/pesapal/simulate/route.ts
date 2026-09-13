import { NextRequest, NextResponse } from "next/server"
import { pesapalTransactions, addPesapalLog } from "@/lib/pesapal-db"

export async function POST(req: NextRequest) {
  try {
    const { orderTrackingId, status = "Completed", paymentMethod = "M-Pesa (Pesapal)", failureReason } = await req.json();

    if (!orderTrackingId) {
      return NextResponse.json({ error: "Missing orderTrackingId parameter" }, { status: 400 });
    }

    const tx = pesapalTransactions.get(orderTrackingId);
    if (!tx) {
      return NextResponse.json({ error: `Pesapal transaction ${orderTrackingId} not found` }, { status: 404 });
    }

    const isSuccess = status === "Completed";
    const confirmationCode = isSuccess 
      ? "PESA-" + Math.random().toString(36).substring(2, 8).toUpperCase() + "-KE"
      : undefined;

    tx.status = isSuccess ? "Completed" : "Failed";
    tx.paymentMethod = paymentMethod;
    tx.confirmationCode = confirmationCode;
    tx.statusCode = isSuccess ? 1 : 2;
    tx.updatedAt = new Date().toISOString();

    pesapalTransactions.set(orderTrackingId, tx);

    addPesapalLog("PESAPAL_SIMULATED_OUTCOME", {
      orderTrackingId,
      status: tx.status,
      paymentMethod,
      confirmationCode,
      failureReason: isSuccess ? null : (failureReason || "Payment declined or timed out")
    });

    return NextResponse.json({
      success: true,
      orderTrackingId,
      status: tx.status,
      confirmationCode,
      paymentMethod,
      message: `Successfully simulated Pesapal outcome as ${status}`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || error }, { status: 500 });
  }
}
