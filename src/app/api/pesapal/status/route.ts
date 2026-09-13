import { NextRequest, NextResponse } from "next/server"
import { pesapalTransactions, pesapalLogs, addPesapalLog } from "@/lib/pesapal-db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderTrackingId = searchParams.get("orderTrackingId");

    if (orderTrackingId) {
      let tx = pesapalTransactions.get(orderTrackingId);

      // If in production or configured sandbox, try live query if still pending
      const env = process.env.PESAPAL_ENVIRONMENT || "sandbox";
      const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
      const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

      const hasRealKeys = consumerKey && consumerSecret && 
        !consumerKey.includes("your_pesapal") && !consumerKey.includes("key_here");

      if (hasRealKeys && tx && tx.status === "Pending") {
        try {
          const baseUrl = env === "production"
            ? "https://pay.pesapal.com/v3"
            : "https://cybqa.pesapal.com/pesapalv3";

          const authRes = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              consumer_key: consumerKey,
              consumer_secret: consumerSecret
            })
          });

          if (authRes.ok) {
            const { token } = await authRes.json();
            const statusRes = await fetch(
              `${baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
              {
                headers: {
                  "Accept": "application/json",
                  "Authorization": `Bearer ${token}`
                }
              }
            );

            if (statusRes.ok) {
              const statusData = await statusRes.json();
              addPesapalLog("PESAPAL_STATUS_POLL_LIVE", { orderTrackingId, statusData });

              // status_code 1: COMPLETED, 2: FAILED, 0: INVALID
              let normalizedStatus: 'Pending' | 'Completed' | 'Failed' = tx.status;
              if (statusData.payment_status_description === "Completed" || statusData.status_code === 1) {
                normalizedStatus = "Completed";
              } else if (statusData.payment_status_description === "Failed" || statusData.status_code === 2) {
                normalizedStatus = "Failed";
              }

              tx.status = normalizedStatus;
              tx.paymentMethod = statusData.payment_method || tx.paymentMethod;
              tx.confirmationCode = statusData.confirmation_code || tx.confirmationCode;
              tx.paymentAccount = statusData.payment_account || tx.paymentAccount;
              tx.statusCode = statusData.status_code;
              tx.updatedAt = new Date().toISOString();
              pesapalTransactions.set(orderTrackingId, tx);
            }
          }
        } catch (pollErr: any) {
          addPesapalLog("PESAPAL_LIVE_STATUS_QUERY_ERR", { error: pollErr.message || pollErr });
        }
      }

      if (!tx) {
        return NextResponse.json(
          { error: `Pesapal transaction ${orderTrackingId} not found` },
          { status: 404 }
        );
      }

      return NextResponse.json(tx);
    }

    // Return overall state & logs
    return NextResponse.json({
      status: "online",
      gateway: "Pesapal 3.0",
      totalTransactions: pesapalTransactions.size,
      transactions: Array.from(pesapalTransactions.values()),
      logs: pesapalLogs
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || error }, { status: 500 });
  }
}
