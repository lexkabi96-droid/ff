import { NextRequest, NextResponse } from "next/server"
import { mpesaTransactions, addMpesaLog } from "@/lib/mpesa-db"

export async function POST(req: NextRequest) {
  try {
    const { checkoutRequestId, status, reason } = await req.json();

    if (!checkoutRequestId) {
      return NextResponse.json({ error: "Missing checkoutRequestId in simulation payload." }, { status: 400 });
    }

    const tx = mpesaTransactions.get(checkoutRequestId);
    if (!tx) {
      return NextResponse.json({ error: `Transaction ${checkoutRequestId} not found to simulate.` }, { status: 404 });
    }

    // Construct a realistic Safaricom Daraja STK callback payload
    const isSuccess = status === "Completed";
    const resultCode = isSuccess ? 0 : (reason === "Cancelled" ? 1032 : 1);
    const resultDesc = isSuccess
      ? "The service request is processed successfully."
      : (reason || "Request cancelled by user");

    const receiptNumber = isSuccess 
      ? "MP" + Math.random().toString(36).substring(2, 10).toUpperCase() 
      : "";

    const timestampVal = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);

    const callbackPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: tx.merchantRequestId,
          CheckoutRequestID: checkoutRequestId,
          ResultCode: resultCode,
          ResultDesc: resultDesc,
          CallbackMetadata: isSuccess ? {
            Item: [
              { Name: "Amount", Value: parseFloat(tx.amount.replace(/[^0-9.]/g, "")) },
              { Name: "MpesaReceiptNumber", Value: receiptNumber },
              { Name: "TransactionDate", Value: parseInt(timestampVal) },
              { Name: "PhoneNumber", Value: parseInt(tx.phone.replace(/[^0-9]/g, "")) }
            ]
          } : undefined
        }
      }
    };

    addMpesaLog("SIMULATOR_TRIGGERED_CALLBACK", {
      checkoutRequestId,
      targetSuccess: isSuccess,
      payload: callbackPayload
    });

    // Directly call callback processing logic internally to stay reliable in server container
    tx.status = isSuccess ? "Completed" : "Failed";
    tx.resultCode = resultCode;
    tx.resultDesc = resultDesc;
    tx.mpesaReceiptNumber = receiptNumber || undefined;
    tx.updatedAt = new Date().toISOString();

    mpesaTransactions.set(checkoutRequestId, tx);

    addMpesaLog("SIMULATED_SUCCESSFUL_STATE_PERSISTENCE", {
      checkoutRequestId,
      status: tx.status,
      receipt: receiptNumber
    });

    return NextResponse.json({
      success: true,
      message: `Triggered simulation callback for ${checkoutRequestId} as ${status}`,
      payload: callbackPayload
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || error }, { status: 500 });
  }
}
