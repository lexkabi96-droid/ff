// Pesapal v3.0 In-Memory Transaction Ledger & Log Store
// Persisted across Next.js API server routes in container via globalThis.

export interface PesapalTransaction {
  orderTrackingId: string;
  merchantReference: string;
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod?: string; // 'M-Pesa', 'Airtel Money', 'Visa / Mastercard', 'Bank Transfer'
  status: 'Pending' | 'Completed' | 'Failed';
  confirmationCode?: string;
  paymentAccount?: string;
  redirectUrl?: string;
  statusCode?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PesapalLog {
  timestamp: string;
  type: string;
  details: any;
}

const globalForPesapal = globalThis as unknown as {
  pesapalTransactions: Map<string, PesapalTransaction>;
  pesapalLogs: Array<PesapalLog>;
};

if (!globalForPesapal.pesapalTransactions) {
  globalForPesapal.pesapalTransactions = new Map();
}

if (!globalForPesapal.pesapalLogs) {
  globalForPesapal.pesapalLogs = [];
}

export const pesapalTransactions = globalForPesapal.pesapalTransactions;
export const pesapalLogs = globalForPesapal.pesapalLogs;

export function addPesapalLog(type: string, details: any) {
  const logEntry: PesapalLog = {
    timestamp: new Date().toISOString(),
    type,
    details
  };
  pesapalLogs.unshift(logEntry);
  if (pesapalLogs.length > 100) {
    pesapalLogs.pop();
  }
}
