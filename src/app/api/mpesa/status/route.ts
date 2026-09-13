import { NextRequest, NextResponse } from "next/server"
import { mpesaTransactions, mpesaLogs } from "@/lib/mpesa-db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const checkoutRequestId = searchParams.get("checkoutRequestId");

    if (checkoutRequestId) {
      const tx = mpesaTransactions.get(checkoutRequestId);
      if (!tx) {
        return NextResponse.json({ error: `Transaction ${checkoutRequestId} not found.` }, { status: 404 });
      }
      return NextResponse.json(tx);
    }

    // Otherwise, return all transactions and logs (useful for Developer Diagnostic Dashboards)
    const list = Array.from(mpesaTransactions.values());
    return NextResponse.json({
      status: "online",
      transactions: list,
      logs: mpesaLogs
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || error }, { status: 500 });
  }
}
