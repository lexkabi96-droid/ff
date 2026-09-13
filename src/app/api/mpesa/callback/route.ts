import { NextRequest, NextResponse } from "next/server"
import { mpesaTransactions, addMpesaLog } from "@/lib/mpesa-db"

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();

    addMpesaLog("CALLBACK_RECEIVED", {
      headers: Object.fromEntries(req.headers.entries()),
      body: rawBody
    });

    const stkCallback = rawBody?.Body?.stkCallback;
    if (!stkCallback) {
      return NextResponse.json({ error: "Invalid M-Pesa Callback format" }, { status: 400 });
    }

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    const existingTx = mpesaTransactions.get(checkoutRequestId);

    let mpesaReceiptNumber = "";
    const items = stkCallback.CallbackMetadata?.Item || [];
    for (const item of items) {
      if (item.Name === "MpesaReceiptNumber") {
        mpesaReceiptNumber = item.Value;
      }
    }

    if (existingTx) {
      existingTx.status = resultCode === 0 ? "Completed" : "Failed";
      existingTx.resultCode = resultCode;
      existingTx.resultDesc = resultDesc;
      existingTx.mpesaReceiptNumber = mpesaReceiptNumber || undefined;
      existingTx.updatedAt = new Date().toISOString();
      
      mpesaTransactions.set(checkoutRequestId, existingTx);

      addMpesaLog("TRANSACTION_UPDATED_FROM_CALLBACK", {
        checkoutRequestId,
        status: existingTx.status,
        resultDesc,
        receipt: mpesaReceiptNumber
      });
    } else {
      // Create a fallback record if checkoutRequestId isn't found
      const fallbackTx: any = {
        checkoutRequestId,
        merchantRequestId: stkCallback.MerchantRequestID || "N/A",
        orderId: `ORD-UNKNOWN`,
        amount: "KES Unknown",
        phone: "Unknown",
        status: resultCode === 0 ? "Completed" : "Failed",
        resultCode,
        resultDesc,
        mpesaReceiptNumber: mpesaReceiptNumber || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      mpesaTransactions.set(checkoutRequestId, fallbackTx);
      addMpesaLog("DARAJA_ORPHAN_CALLBACK", { checkoutRequestId, resultCode, resultDesc });
    }

    return NextResponse.json({ ResponseCode: "0", ResponseDescription: "Callback received and recorded successfully." });
  } catch (error: any) {
    addMpesaLog("CALLBACK_CRASHED", { error: error.message || error });
    return NextResponse.json({ error: "Internal Error in Callback processing" }, { status: 500 });
  }
}
