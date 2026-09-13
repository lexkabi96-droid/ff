import { NextRequest, NextResponse } from "next/server"
import { mpesaTransactions, addMpesaLog } from "@/lib/mpesa-db"

// Health-check / list transactions on GET
export async function GET() {
  const list = Array.from(mpesaTransactions.values());
  return NextResponse.json({
    status: "online",
    transactions: list,
    environment: process.env.MPESA_ENVIRONMENT || "sandbox"
  });
}

export async function POST(req: NextRequest) {
  try {
    const { amount, phone, orderId, customerName } = await req.json();

    if (!amount || !phone || !orderId) {
      return NextResponse.json(
        { error: "Missing required parameters: amount, phone, and orderId are required." },
        { status: 400 }
      );
    }

    // Format phone number to Safaricom standard (2547xxxxxxxx or 2541xxxxxxxx)
    let sanitizedPhone = phone.replace(/[^0-9]/g, "");
    if (sanitizedPhone.startsWith("0")) {
      sanitizedPhone = "254" + sanitizedPhone.substring(1);
    } else if (sanitizedPhone.startsWith("7") || sanitizedPhone.startsWith("1")) {
      sanitizedPhone = "254" + sanitizedPhone;
    } else if (!sanitizedPhone.startsWith("254")) {
      // Fallback fallback standard sandbox number if not valid
      sanitizedPhone = "254700000000";
    }

    // Strip amount to pure numeric float string
    const sanitizedAmount = Math.round(parseFloat(amount.replace(/[^0-9.]/g, ""))) || 1;

    // Fetch config keys (fall back to sandbox credentials if not specified)
    const env = process.env.MPESA_ENVIRONMENT || "sandbox";
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortCode = process.env.MPESA_SHORTCODE || "174379";
    const passKey = process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
    const suppliedCallbackUrl = process.env.MPESA_CALLBACK_URL || "https://your-domain.com/api/mpesa/callback";

    const isSimulationMode = !consumerKey || !consumerSecret || consumerKey.includes("key_here") || consumerKey.includes("consumer");

    const checkoutRequestId = `ws_CO_${new Date().getTime()}_${Math.floor(Math.random() * 100000)}`;
    const merchantRequestId = `MR-${Math.floor(100000 + Math.random() * 900000)}`;

    addMpesaLog("API_TRIGGERED", {
      orderId,
      customerName,
      phone: sanitizedPhone,
      amount: sanitizedAmount,
      isSimulationMode,
      timestamp: new Date().toISOString()
    });

    if (isSimulationMode) {
      // Mock flow simulation
      const mockTx: any = {
        checkoutRequestId,
        merchantRequestId,
        orderId,
        amount: `KES ${sanitizedAmount.toLocaleString()}`,
        phone: "+" + sanitizedPhone,
        status: "Pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mpesaTransactions.set(checkoutRequestId, mockTx);

      addMpesaLog("STK_PUSH_SIMULATED", {
        checkoutRequestId,
        merchantRequestId,
        orderId,
        amount: sanitizedAmount,
        phone: sanitizedPhone,
        status: "STK Push Initiated (Simulation)"
      });

      return NextResponse.json({
        ResponseCode: "0",
        ResponseDescription: "Success. Request accepted for processing",
        MerchantRequestID: merchantRequestId,
        CheckoutRequestID: checkoutRequestId,
        CustomerMessage: "Success. Request accepted for processing",
        simulated: true,
        sanitizedPhone,
        sanitizedAmount
      });
    }

    // REAL DARAJA API EXECUTION
    const baseUrl = env === "production" 
      ? "https://api.safaricom.co.ke" 
      : "https://sandbox.safaricom.co.ke";

    // 1. Fetch OAuth Access Token
    const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    
    addMpesaLog("DARAJA_FETCH_TOKEN_START", { url: `${baseUrl}/oauth/v1/generate` });

    const authRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${authHeader}`
      }
    });

    if (!authRes.ok) {
      const errorText = await authRes.text();
      addMpesaLog("DARAJA_TOKEN_FAIL", { status: authRes.status, error: errorText });
      throw new Error(`Daraja Authentication failed: ${errorText}`);
    }

    const { access_token } = await authRes.json();
    addMpesaLog("DARAJA_TOKEN_SUCCESS", { token_trimmed: access_token.substring(0, 8) + "..." });

    // 2. Generate M-Pesa password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14); // YYYYMMDDHHmmss
    const password = Buffer.from(`${shortCode}${passKey}${timestamp}`).toString("base64");

    const payload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: sanitizedAmount,
      PartyA: sanitizedPhone,
      PartyB: shortCode,
      PhoneNumber: sanitizedPhone,
      CallBackURL: suppliedCallbackUrl,
      AccountReference: orderId,
      TransactionDesc: `Cleaning Charge ${orderId}`
    };

    addMpesaLog("DARAJA_STK_PUSH_START", { payload });

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const stkData = await stkRes.json();

    if (stkRes.ok && stkData.ResponseCode === "0") {
      // Record transaction
      const tx: any = {
        checkoutRequestId: stkData.CheckoutRequestID,
        merchantRequestId: stkData.MerchantRequestID,
        orderId,
        amount: `KES ${sanitizedAmount.toLocaleString()}`,
        phone: "+" + sanitizedPhone,
        status: "Pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mpesaTransactions.set(stkData.CheckoutRequestID, tx);

      addMpesaLog("DARAJA_STK_PUSH_SUCCESS", {
        checkoutRequestId: stkData.CheckoutRequestID,
        merchantRequestId: stkData.MerchantRequestID,
        responseDesc: stkData.ResponseDescription
      });

      return NextResponse.json({
        ResponseCode: "0",
        ResponseDescription: stkData.ResponseDescription,
        MerchantRequestID: stkData.MerchantRequestID,
        CheckoutRequestID: stkData.CheckoutRequestID,
        CustomerMessage: stkData.CustomerMessage,
        simulated: false,
        sanitizedPhone,
        sanitizedAmount
      });
    } else {
      addMpesaLog("DARAJA_STK_PUSH_FAIL", { status: stkRes.status, response: stkData });
      return NextResponse.json(
        { 
          error: "Safaricom response failure", 
          details: stkData 
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    addMpesaLog("API_CRASHED", { error: error.message || error });
    return NextResponse.json(
      { 
        error: "Internal Server Error executing M-Pesa push", 
        message: error.message || error 
      },
      { status: 500 }
    );
  }
}
