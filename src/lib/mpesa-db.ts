// Safaricom M-Pesa In-Memory Ledger Database
// Since this runs in a cloud run sandbox environment, we persist transactions 
// on globalThis to survive server route instances.

export interface MpesaTransaction {
  checkoutRequestId: string;
  merchantRequestId: string;
  orderId: string;
  amount: string;
  phone: string;
  status: 'Pending' | 'Completed' | 'Failed';
  resultCode?: number;
  resultDesc?: string;
  mpesaReceiptNumber?: string;
  createdAt: string;
  updatedAt: string;
}

const globalForMpesa = globalThis as unknown as {
  mpesaTransactions: Map<string, MpesaTransaction>;
  mpesaLogs: Array<{ timestamp: string; type: string; details: any }>;
};

if (!globalForMpesa.mpesaTransactions) {
  globalForMpesa.mpesaTransactions = new Map();
}

if (!globalForMpesa.mpesaLogs) {
  globalForMpesa.mpesaLogs = [];
}

export const mpesaTransactions = globalForMpesa.mpesaTransactions;
export const mpesaLogs = globalForMpesa.mpesaLogs;

export function addMpesaLog(type: string, details: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    details
  };
  mpesaLogs.unshift(logEntry);
  // Cap at 100 entries
  if (mpesaLogs.length > 100) {
    mpesaLogs.pop();
  }
}
