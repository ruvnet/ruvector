/**
 * @ruvector/agentic-payments
 *
 * WASM App Store payment integration with agentic-payments.
 * Provides both AP2 (Agent Payments Protocol) and ACP (Agentic Commerce Protocol).
 *
 * @example
 * ```typescript
 * import { AppStorePayments, PurchaseType } from '@ruvector/agentic-payments';
 *
 * const payments = new AppStorePayments();
 * const receipt = payments.processPurchase({
 *   appId: 'my-chip-app',
 *   buyerId: 'user-123',
 *   purchaseType: PurchaseType.PayPerUse,
 *   paymentMethod: 'auto'
 * }, 10); // 10 cents
 * ```
 */

// Re-export core agentic-payments functionality
export * from 'agentic-payments';

// App Store specific types
export interface AppPurchaseRequest {
  appId: string;
  buyerId: string;
  purchaseType: PurchaseType;
  paymentMethod: PaymentMethodPreference;
}

export enum PurchaseType {
  OneTime = 'one_time',
  PayPerUse = 'pay_per_use',
  Subscription = 'subscription'
}

export type PaymentMethodPreference = 'ap2' | 'acp' | 'auto';

export interface AppTransaction {
  id: string;
  appId: string;
  buyerId: string;
  purchaseType: PurchaseType;
  totalAmount: number;
  developerAmount: number;
  platformAmount: number;
  status: TransactionStatus;
  protocol: string;
  timestamp: Date;
}

export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface PaymentConfig {
  ap2Enabled: boolean;
  acpEnabled: boolean;
  developerShare: number;
  platformFee: number;
  minTransaction: number;
  maxMicropayment: number;
}

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  ap2Enabled: true,
  acpEnabled: true,
  developerShare: 0.70,
  platformFee: 0.30,
  minTransaction: 1,
  maxMicropayment: 100
};

/**
 * Thread-safe App Store Payment Processor
 *
 * Integrates with the agentic-payments package for AP2/ACP protocol support.
 * Optimized for high-throughput micropayment processing.
 */
export class AppStorePayments {
  private config: PaymentConfig;
  private transactions: Map<string, AppTransaction> = new Map();
  private appTransactionIndex: Map<string, string[]> = new Map();
  private txCounter = 0;
  private totalVolume = 0;

  constructor(config: Partial<PaymentConfig> = {}) {
    this.config = { ...DEFAULT_PAYMENT_CONFIG, ...config };
  }

  /**
   * Create with chip-app optimized configuration (80% developer share)
   */
  static chipAppConfig(): AppStorePayments {
    return new AppStorePayments({
      developerShare: 0.80,
      platformFee: 0.20,
      maxMicropayment: 10
    });
  }

  /**
   * Create with enterprise configuration (85% developer share)
   */
  static enterpriseConfig(): AppStorePayments {
    return new AppStorePayments({
      developerShare: 0.85,
      platformFee: 0.15,
      maxMicropayment: 1000
    });
  }

  /**
   * Process an app purchase
   */
  processPurchase(request: AppPurchaseRequest, priceCents: number): AppTransaction {
    if (priceCents < this.config.minTransaction) {
      throw new Error(`Amount ${priceCents} cents is below minimum ${this.config.minTransaction} cents`);
    }

    // Validate protocol
    if (request.paymentMethod === 'ap2' && !this.config.ap2Enabled) {
      throw new Error('AP2 protocol is disabled');
    }
    if (request.paymentMethod === 'acp' && !this.config.acpEnabled) {
      throw new Error('ACP protocol is disabled');
    }

    const developerAmount = Math.floor(priceCents * this.config.developerShare);
    const platformAmount = priceCents - developerAmount;

    const seq = this.txCounter++;
    const id = `txn_${seq.toString(16).padStart(8, '0')}_${Date.now().toString(36)}`;

    const transaction: AppTransaction = {
      id,
      appId: request.appId,
      buyerId: request.buyerId,
      purchaseType: request.purchaseType,
      totalAmount: priceCents,
      developerAmount,
      platformAmount,
      status: 'completed',
      protocol: request.paymentMethod.toUpperCase(),
      timestamp: new Date()
    };

    // Store transaction
    this.transactions.set(id, transaction);

    // Update app index
    const appTxns = this.appTransactionIndex.get(request.appId) || [];
    appTxns.push(id);
    this.appTransactionIndex.set(request.appId, appTxns);

    // Update total volume
    this.totalVolume += priceCents;

    return transaction;
  }

  /**
   * Process a micropayment (pay-per-use) - optimized for chip apps
   */
  processMicropayment(appId: string, userId: string, amountCents: number): AppTransaction {
    if (amountCents > this.config.maxMicropayment) {
      throw new Error(`Amount ${amountCents} cents exceeds micropayment limit of ${this.config.maxMicropayment} cents`);
    }

    return this.processPurchase({
      appId,
      buyerId: userId,
      purchaseType: PurchaseType.PayPerUse,
      paymentMethod: 'auto'
    }, amountCents);
  }

  /**
   * Process a batch of micropayments efficiently
   */
  processMicropaymentBatch(payments: Array<{ appId: string; userId: string; amount: number }>): Array<AppTransaction | Error> {
    return payments.map(({ appId, userId, amount }) => {
      try {
        return this.processMicropayment(appId, userId, amount);
      } catch (e) {
        return e as Error;
      }
    });
  }

  /**
   * Get transaction by ID
   */
  getTransaction(id: string): AppTransaction | undefined {
    return this.transactions.get(id);
  }

  /**
   * Get all transactions for an app (optimized using index)
   */
  getAppTransactions(appId: string): AppTransaction[] {
    const ids = this.appTransactionIndex.get(appId) || [];
    return ids
      .map(id => this.transactions.get(id))
      .filter((t): t is AppTransaction => t !== undefined && t.status === 'completed');
  }

  /**
   * Get total revenue for an app (developer share only)
   */
  getAppRevenue(appId: string): number {
    return this.getAppTransactions(appId).reduce((sum, t) => sum + t.developerAmount, 0);
  }

  /**
   * Get total platform fees for an app
   */
  getAppPlatformFees(appId: string): number {
    return this.getAppTransactions(appId).reduce((sum, t) => sum + t.platformAmount, 0);
  }

  /**
   * Get payment statistics
   */
  getStats(): { totalTransactions: number; totalVolumeCents: number; uniqueApps: number } {
    return {
      totalTransactions: this.transactions.size,
      totalVolumeCents: this.totalVolume,
      uniqueApps: this.appTransactionIndex.size
    };
  }

  /**
   * Get configuration
   */
  getConfig(): PaymentConfig {
    return { ...this.config };
  }
}

// App size categories and pricing
export const APP_SIZE_PRICING = {
  chip: { maxBytes: 8 * 1024, basePriceCents: 1 },      // 8KB, 1 cent
  micro: { maxBytes: 64 * 1024, basePriceCents: 5 },    // 64KB, 5 cents
  small: { maxBytes: 512 * 1024, basePriceCents: 10 },  // 512KB, 10 cents
  medium: { maxBytes: 2 * 1024 * 1024, basePriceCents: 25 }, // 2MB, 25 cents
  large: { maxBytes: 10 * 1024 * 1024, basePriceCents: 50 }, // 10MB, 50 cents
  full: { maxBytes: Infinity, basePriceCents: 100 },    // >10MB, $1
} as const;

export type AppSizeCategory = keyof typeof APP_SIZE_PRICING;

export function getAppSizeCategory(bytes: number): AppSizeCategory {
  if (bytes <= APP_SIZE_PRICING.chip.maxBytes) return 'chip';
  if (bytes <= APP_SIZE_PRICING.micro.maxBytes) return 'micro';
  if (bytes <= APP_SIZE_PRICING.small.maxBytes) return 'small';
  if (bytes <= APP_SIZE_PRICING.medium.maxBytes) return 'medium';
  if (bytes <= APP_SIZE_PRICING.large.maxBytes) return 'large';
  return 'full';
}

export function getBasePrice(bytes: number): number {
  const category = getAppSizeCategory(bytes);
  return APP_SIZE_PRICING[category].basePriceCents;
}

// Subscription tiers
export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  monthlyCredits: number;
  features: string[];
  isPopular: boolean;
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out chip apps',
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    monthlyCredits: 100,
    features: [
      '100 credits/month',
      '10 free chip app uses/day',
      'Community support',
      'Basic analytics',
    ],
    isPopular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For developers and power users',
    monthlyPriceCents: 2900,
    annualPriceCents: 29000,
    monthlyCredits: 1000,
    features: [
      '1,000 credits/month',
      'Unlimited chip app uses',
      'Priority support',
      'Advanced analytics',
      '5 concurrent executions',
      'Revenue sharing for published apps',
    ],
    isPopular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For teams and organizations',
    monthlyPriceCents: 9900,
    annualPriceCents: 99000,
    monthlyCredits: 10000,
    features: [
      '10,000 credits/month',
      'Unlimited everything',
      'Dedicated support',
      'Custom analytics',
      '50 concurrent executions',
      'Higher revenue share',
      'SLA guarantee',
      'Custom integrations',
    ],
    isPopular: false,
  },
];

// Utility functions
export function formatCredits(credits: number): string {
  if (credits >= 1000000) {
    return `${(credits / 1000000).toFixed(1)}M`;
  }
  if (credits >= 1000) {
    return `${(credits / 1000).toFixed(1)}K`;
  }
  return credits.toString();
}

export function creditsToDollars(credits: number): number {
  return credits / 100;
}

export function dollarsToCredits(dollars: number): number {
  return dollars * 100;
}
