import { NextRequest, NextResponse } from "next/server"
import { pesapalTransactions, addPesapalLog } from "@/lib/pesapal-db"

export async function GET() {
  const list = Array.from(pesapalTransactions.values());
  return NextResponse.json({
    status: "online",
    gateway: "Pesapal 3.0 Multi-Option Gateway",
    environment: process.env.PESAPAL_ENVIRONMENT || "sandbox",
    transactions: list
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      orderId, 
      amount, 
      customerName = "Customer", 
      customerEmail = "customer@example.com", 
      customerPhone = "0712345678", 
      description = "Laundry Service Order",
      paymentMethod = "Multi-Option (M-Pesa, Card, Airtel)"
    } = body;

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: "Missing required parameters: orderId and amount are required." },
        { status: 400 }
      );
    }

    const numericAmount = Math.round(parseFloat(String(amount).replace(/[^0-9.]/g, ""))) || 100;
    
    // Check Pesapal credentials
    const env = process.env.PESAPAL_ENVIRONMENT || "sandbox";
    const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
    const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
    const ipnId = process.env.PESAPAL_IPN_ID;
    const callbackUrl = process.env.PESAPAL_CALLBACK_URL || "https://your-domain.com/api/pesapal/callback";

    const isSimulationMode = !consumerKey || !consumerSecret || 
      consumerKey.includes("your_pesapal") || consumerKey.includes("key_here");

    const merchantReference = orderId;
    const orderTrackingId = `pp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    addPesapalLog("ORDER_REQUEST_RECEIVED", {
      orderId,
      customerName,
      customerPhone,
      numericAmount,
      isSimulationMode,
      paymentMethod
    });

    if (isSimulationMode) {
      // In-sandbox simulation mode
      const tx = {
        orderTrackingId,
        merchantReference,
        orderId,
        amount: numericAmount,
        currency: "KES",
        description: description || `Payment for Laundry Order ${orderId}`,
        customerName,
        customerEmail,
        customerPhone,
        paymentMethod,
        status: "Pending" as const,
        redirectUrl: `https://cybqa.pesapal.com/pesapalv3/Express/Index?OrderTrackingId=${orderTrackingId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      pesapalTransactions.set(orderTrackingId, tx);

      addPesapalLog("SIMULATED_ORDER_REGISTERED", {
        orderTrackingId,
        merchantReference,
        amount: numericAmount,
        customerName
      });

      return NextResponse.json({
        order_tracking_id: orderTrackingId,
        merchant_reference: merchantReference,
        redirect_url: tx.redirectUrl,
        status: "200",
        simulated: true,
        amount: numericAmount,
        currency: "KES",
        message: "Pesapal order created successfully (Sandbox Simulation Mode)"
      });
    }

    // REAL PESAPAL V3 INTEGRATION
    const baseUrl = env === "production"
      ? "https://pay.pesapal.com/v3"
      : "https://cybqa.pesapal.com/pesapalv3";

    // 1. Get Auth Token
    addPesapalLog("REQUESTING_PESAPAL_AUTH_TOKEN", { endpoint: `${baseUrl}/api/Auth/RequestToken` });

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

    if (!authRes.ok) {
      const errText = await authRes.text();
      addPesapalLog("PESAPAL_AUTH_FAILED", { status: authRes.status, error: errText });
      throw new Error(`Pesapal Authentication failed (${authRes.status}): ${errText}`);
    }

    const authData = await authRes.json();
    const token = authData.token;

    // Split customer name into first and last
    const nameParts = customerName.trim().split(" ");
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "Client";

    // 2. Submit Order Request
    const orderPayload = {
      id: merchantReference,
      currency: "KES",
      amount: numericAmount,
      description: description || `Payment for Laundry ${orderId}`,
      callback_url: callbackUrl,
      notification_id: ipnId || "",
      billing_address: {
        email_address: customerEmail,
        phone_number: customerPhone.replace(/[^0-9+]/g, ""),
        country_code: "KE",
        first_name: firstName,
        last_name: lastName
      }
    };

    addPesapalLog("SUBMITTING_ORDER_TO_PESAPAL", { orderPayload });

    const orderRes = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(orderPayload)
    });

    const orderData = await orderRes.json();

    if (orderRes.ok && orderData.status === "200") {
      const realTrackingId = orderData.order_tracking_id;
      const redirectUrl = orderData.redirect_url;

      pesapalTransactions.set(realTrackingId, {
        orderTrackingId: realTrackingId,
        merchantReference,
        orderId,
        amount: numericAmount,
        currency: "KES",
        description,
        customerName,
        customerEmail,
        customerPhone,
        paymentMethod,
        status: "Pending",
        redirectUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      addPesapalLog("PESAPAL_ORDER_SUBMITTED_SUCCESS", {
        orderTrackingId: realTrackingId,
        redirectUrl
      });

      return NextResponse.json({
        order_tracking_id: realTrackingId,
        merchant_reference: merchantReference,
        redirect_url: redirectUrl,
        status: "200",
        simulated: false,
        amount: numericAmount,
        currency: "KES"
      });
    } else {
      addPesapalLog("PESAPAL_ORDER_SUBMISSION_FAILED", { response: orderData });
      return NextResponse.json(
        { error: "Pesapal rejected order request", details: orderData },
        { status: 502 }
      );
    }
  } catch (error: any) {
    addPesapalLog("PESAPAL_ORDER_CRASHED", { error: error.message || error });
    return NextResponse.json(
      { error: "Failed to initialize Pesapal payment session", message: error.message || error },
      { status: 500 }
    );
  }
}
