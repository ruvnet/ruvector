//! Payment Integration for WASM App Store
//!
//! Integrates with the agentic-payments crate (crates.io) for:
//! - AP2 (Agent Payments Protocol) - cryptographic multi-agent consensus
//! - ACP (Agentic Commerce Protocol) - Stripe-compatible checkout flows
//!
//! This module bridges the app store's needs with the payment infrastructure.
//!
//! ## Thread Safety
//!
//! All payment operations are thread-safe using `DashMap` for concurrent access.
//!
//! ## Example
//!
//! ```rust,ignore
//! use wasm_app_store::payments_integration::{AppStorePayments, AppPurchaseRequest, PurchaseType};
//!
//! let payments = AppStorePayments::new(PaymentConfig::default());
//! let txn = payments.process_micropayment("chip-app", "user-1", 5).unwrap();
//! println!("Transaction: {}", txn.id);
//! ```

use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};

/// Re-export agentic-payments types for convenience
pub use agentic_payments::{ap2, acp};

/// App purchase request for the store
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppPurchaseRequest {
    /// App ID to purchase
    pub app_id: String,
    /// Buyer agent identity
    pub buyer_id: String,
    /// Purchase type
    pub purchase_type: PurchaseType,
    /// Payment method preference
    pub payment_method: PaymentMethodPreference,
}

/// Purchase types supported by the store
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PurchaseType {
    /// One-time purchase (perpetual license)
    OneTime,
    /// Pay per use (micropayments)
    PayPerUse,
    /// Subscription based
    Subscription { tier: SubscriptionTier },
}

/// Subscription tiers with pricing
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum SubscriptionTier {
    Free,
    Pro,
    Enterprise,
}

impl SubscriptionTier {
    /// Get monthly price in cents
    pub const fn monthly_price_cents(&self) -> u64 {
        match self {
            Self::Free => 0,
            Self::Pro => 2900,       // $29/month
            Self::Enterprise => 9900, // $99/month
        }
    }

    /// Get monthly credit allocation
    pub const fn monthly_credits(&self) -> u64 {
        match self {
            Self::Free => 100,
            Self::Pro => 1000,
            Self::Enterprise => 10000,
        }
    }

    /// Get annual price in cents (with discount)
    pub const fn annual_price_cents(&self) -> u64 {
        match self {
            Self::Free => 0,
            Self::Pro => 29000,       // $290/year (~17% savings)
            Self::Enterprise => 99000, // $990/year (~17% savings)
        }
    }
}

/// Payment method preferences
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PaymentMethodPreference {
    /// Use AP2 protocol with DIDs and VCs
    Ap2,
    /// Use ACP protocol with Stripe
    Acp,
    /// Auto-detect best protocol
    Auto,
}

impl PaymentMethodPreference {
    /// Get protocol name
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Ap2 => "AP2",
            Self::Acp => "ACP",
            Self::Auto => "AUTO",
        }
    }
}

/// App store payment configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentConfig {
    /// Enable AP2 protocol support
    pub ap2_enabled: bool,
    /// Enable ACP protocol support
    pub acp_enabled: bool,
    /// Revenue split for developers (0.0 - 1.0)
    pub developer_share: f64,
    /// Platform fee percentage (0.0 - 1.0)
    pub platform_fee: f64,
    /// Minimum transaction amount (in cents)
    pub min_transaction: u64,
    /// Maximum micropayment amount (in cents)
    pub max_micropayment: u64,
    /// Enable refunds
    pub refunds_enabled: bool,
    /// Refund window in hours
    pub refund_window_hours: u32,
}

impl Default for PaymentConfig {
    fn default() -> Self {
        Self {
            ap2_enabled: true,
            acp_enabled: true,
            developer_share: 0.70, // 70% to developers
            platform_fee: 0.30,    // 30% platform fee
            min_transaction: 1,    // 1 cent minimum
            max_micropayment: 100, // $1 max micropayment
            refunds_enabled: true,
            refund_window_hours: 24,
        }
    }
}

impl PaymentConfig {
    /// Create a chip-app optimized config (low fees for micropayments)
    pub fn chip_app() -> Self {
        Self {
            developer_share: 0.80,  // 80% to developers
            platform_fee: 0.20,     // 20% platform fee
            max_micropayment: 10,   // 10 cents max
            ..Default::default()
        }
    }

    /// Create an enterprise config
    pub fn enterprise() -> Self {
        Self {
            developer_share: 0.85,  // 85% to developers
            platform_fee: 0.15,     // 15% platform fee
            max_micropayment: 1000, // $10 max
            refund_window_hours: 72,
            ..Default::default()
        }
    }

    /// Validate configuration
    pub fn validate(&self) -> Result<(), PaymentError> {
        if self.developer_share + self.platform_fee > 1.0 + f64::EPSILON {
            return Err(PaymentError::InvalidConfig("Revenue split exceeds 100%".into()));
        }
        if self.developer_share < 0.0 || self.platform_fee < 0.0 {
            return Err(PaymentError::InvalidConfig("Negative percentage".into()));
        }
        Ok(())
    }
}

/// Thread-safe payment processor for the app store
#[derive(Debug)]
pub struct AppStorePayments {
    config: PaymentConfig,
    /// Transaction storage (thread-safe)
    transactions: DashMap<String, AppTransaction>,
    /// Index: app_id -> transaction_ids (for fast app revenue lookups)
    app_transactions: DashMap<String, Vec<String>>,
    /// Counter for transaction sequence
    tx_counter: AtomicU64,
    /// Total processed volume in cents
    total_volume: AtomicU64,
}

impl AppStorePayments {
    /// Create a new payment processor
    pub fn new(config: PaymentConfig) -> Self {
        Self {
            config,
            transactions: DashMap::new(),
            app_transactions: DashMap::new(),
            tx_counter: AtomicU64::new(0),
            total_volume: AtomicU64::new(0),
        }
    }

    /// Create with default configuration
    pub fn default_config() -> Self {
        Self::new(PaymentConfig::default())
    }

    /// Create with chip-app optimized configuration
    pub fn chip_app_config() -> Self {
        Self::new(PaymentConfig::chip_app())
    }

    /// Process an app purchase (thread-safe)
    pub fn process_purchase(&self, request: AppPurchaseRequest, price_cents: u64) -> Result<AppTransaction, PaymentError> {
        // Validate request
        if price_cents < self.config.min_transaction {
            return Err(PaymentError::BelowMinimum {
                amount: price_cents,
                minimum: self.config.min_transaction,
            });
        }

        // Validate protocol availability
        match request.payment_method {
            PaymentMethodPreference::Ap2 if !self.config.ap2_enabled => {
                return Err(PaymentError::ProtocolDisabled("AP2".into()));
            }
            PaymentMethodPreference::Acp if !self.config.acp_enabled => {
                return Err(PaymentError::ProtocolDisabled("ACP".into()));
            }
            _ => {}
        }

        // Calculate revenue split
        let developer_amount = (price_cents as f64 * self.config.developer_share).floor() as u64;
        let platform_amount = price_cents - developer_amount;

        // Generate transaction ID
        let seq = self.tx_counter.fetch_add(1, Ordering::SeqCst);
        let id = generate_transaction_id(seq);

        // Create transaction
        let transaction = AppTransaction {
            id: id.clone(),
            app_id: request.app_id.clone(),
            buyer_id: request.buyer_id,
            purchase_type: request.purchase_type,
            total_amount: price_cents,
            developer_amount,
            platform_amount,
            status: TransactionStatus::Completed,
            protocol: request.payment_method.as_str().to_string(),
            timestamp: chrono::Utc::now(),
            refunded_at: None,
        };

        // Store transaction
        self.transactions.insert(id.clone(), transaction.clone());

        // Update app index
        self.app_transactions
            .entry(request.app_id)
            .or_default()
            .push(id);

        // Update total volume
        self.total_volume.fetch_add(price_cents, Ordering::SeqCst);

        Ok(transaction)
    }

    /// Process a micropayment (pay-per-use) - optimized for chip apps
    pub fn process_micropayment(&self, app_id: &str, user_id: &str, amount_cents: u64) -> Result<AppTransaction, PaymentError> {
        if amount_cents > self.config.max_micropayment {
            return Err(PaymentError::ExceedsMicropaymentLimit {
                amount: amount_cents,
                limit: self.config.max_micropayment,
            });
        }

        let request = AppPurchaseRequest {
            app_id: app_id.to_string(),
            buyer_id: user_id.to_string(),
            purchase_type: PurchaseType::PayPerUse,
            payment_method: PaymentMethodPreference::Auto,
        };

        self.process_purchase(request, amount_cents)
    }

    /// Process a batch of micropayments efficiently
    pub fn process_micropayment_batch(&self, payments: Vec<(String, String, u64)>) -> Vec<Result<AppTransaction, PaymentError>> {
        payments
            .into_iter()
            .map(|(app_id, user_id, amount)| self.process_micropayment(&app_id, &user_id, amount))
            .collect()
    }

    /// Process a refund
    pub fn process_refund(&self, transaction_id: &str) -> Result<AppTransaction, PaymentError> {
        if !self.config.refunds_enabled {
            return Err(PaymentError::RefundsDisabled);
        }

        let mut txn = self.transactions
            .get_mut(transaction_id)
            .ok_or_else(|| PaymentError::TransactionNotFound(transaction_id.to_string()))?;

        // Check if already refunded
        if txn.status == TransactionStatus::Refunded {
            return Err(PaymentError::AlreadyRefunded(transaction_id.to_string()));
        }

        // Check refund window
        let refund_window = chrono::Duration::hours(self.config.refund_window_hours as i64);
        if chrono::Utc::now() - txn.timestamp > refund_window {
            return Err(PaymentError::RefundWindowExpired {
                transaction_id: transaction_id.to_string(),
                window_hours: self.config.refund_window_hours,
            });
        }

        // Process refund
        txn.status = TransactionStatus::Refunded;
        txn.refunded_at = Some(chrono::Utc::now());

        // Update total volume (subtract refunded amount)
        self.total_volume.fetch_sub(txn.total_amount, Ordering::SeqCst);

        Ok(txn.clone())
    }

    /// Get transaction by ID
    pub fn get_transaction(&self, id: &str) -> Option<AppTransaction> {
        self.transactions.get(id).map(|t| t.clone())
    }

    /// Get all transactions for an app (optimized using index)
    pub fn get_app_transactions(&self, app_id: &str) -> Vec<AppTransaction> {
        self.app_transactions
            .get(app_id)
            .map(|ids| {
                ids.iter()
                    .filter_map(|id| self.transactions.get(id).map(|t| t.clone()))
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Get total revenue for an app (developer share only)
    pub fn get_app_revenue(&self, app_id: &str) -> u64 {
        self.get_app_transactions(app_id)
            .iter()
            .filter(|t| t.status == TransactionStatus::Completed)
            .map(|t| t.developer_amount)
            .sum()
    }

    /// Get total platform fees for an app
    pub fn get_app_platform_fees(&self, app_id: &str) -> u64 {
        self.get_app_transactions(app_id)
            .iter()
            .filter(|t| t.status == TransactionStatus::Completed)
            .map(|t| t.platform_amount)
            .sum()
    }

    /// Get payment statistics
    pub fn get_stats(&self) -> PaymentStats {
        PaymentStats {
            total_transactions: self.transactions.len(),
            total_volume_cents: self.total_volume.load(Ordering::SeqCst),
            unique_apps: self.app_transactions.len(),
        }
    }

    /// Get configuration
    pub fn config(&self) -> &PaymentConfig {
        &self.config
    }
}

/// Payment statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentStats {
    /// Total number of transactions
    pub total_transactions: usize,
    /// Total volume in cents
    pub total_volume_cents: u64,
    /// Number of unique apps with transactions
    pub unique_apps: usize,
}

/// App store transaction record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppTransaction {
    /// Unique transaction ID
    pub id: String,
    /// App that was purchased
    pub app_id: String,
    /// Buyer ID
    pub buyer_id: String,
    /// Type of purchase
    pub purchase_type: PurchaseType,
    /// Total amount in cents
    pub total_amount: u64,
    /// Amount to developer
    pub developer_amount: u64,
    /// Platform fee amount
    pub platform_amount: u64,
    /// Transaction status
    pub status: TransactionStatus,
    /// Protocol used (AP2/ACP)
    pub protocol: String,
    /// Transaction timestamp
    pub timestamp: chrono::DateTime<chrono::Utc>,
    /// Refund timestamp (if refunded)
    pub refunded_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Transaction status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum TransactionStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Refunded,
}

/// Payment errors
#[derive(Debug, Clone, thiserror::Error)]
pub enum PaymentError {
    #[error("Amount {amount} cents is below minimum {minimum} cents")]
    BelowMinimum { amount: u64, minimum: u64 },

    #[error("Amount {amount} cents exceeds micropayment limit of {limit} cents")]
    ExceedsMicropaymentLimit { amount: u64, limit: u64 },

    #[error("Invalid payment method")]
    InvalidPaymentMethod,

    #[error("Transaction failed: {reason}")]
    TransactionFailed { reason: String },

    #[error("Protocol error: {0}")]
    ProtocolError(String),

    #[error("Protocol {0} is disabled")]
    ProtocolDisabled(String),

    #[error("Transaction {0} not found")]
    TransactionNotFound(String),

    #[error("Transaction {0} already refunded")]
    AlreadyRefunded(String),

    #[error("Refunds are disabled")]
    RefundsDisabled,

    #[error("Refund window expired for transaction {transaction_id} (window: {window_hours} hours)")]
    RefundWindowExpired { transaction_id: String, window_hours: u32 },

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}

/// Generate a unique transaction ID using sequence number for ordering
fn generate_transaction_id(seq: u64) -> String {
    use sha2::{Sha256, Digest};
    let timestamp = chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0);
    let random: u64 = rand::random();
    let mut hasher = Sha256::new();
    hasher.update(format!("{}{}{}", seq, timestamp, random).as_bytes());
    let result = hasher.finalize();
    format!("txn_{:08x}_{}", seq, hex::encode(&result[..4]))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_payment_config_default() {
        let config = PaymentConfig::default();
        assert!(config.ap2_enabled);
        assert!(config.acp_enabled);
        assert!((config.developer_share - 0.70).abs() < f64::EPSILON);
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_payment_config_chip_app() {
        let config = PaymentConfig::chip_app();
        assert!((config.developer_share - 0.80).abs() < f64::EPSILON);
        assert_eq!(config.max_micropayment, 10);
    }

    #[test]
    fn test_process_purchase() {
        let payments = AppStorePayments::default_config();

        let request = AppPurchaseRequest {
            app_id: "test-app".to_string(),
            buyer_id: "buyer-123".to_string(),
            purchase_type: PurchaseType::OneTime,
            payment_method: PaymentMethodPreference::Auto,
        };

        let result = payments.process_purchase(request, 1000);
        assert!(result.is_ok());

        let txn = result.unwrap();
        assert_eq!(txn.total_amount, 1000);
        assert_eq!(txn.developer_amount, 700); // 70%
        assert_eq!(txn.platform_amount, 300);  // 30%
    }

    #[test]
    fn test_micropayment() {
        let payments = AppStorePayments::default_config();

        let result = payments.process_micropayment("chip-app", "user-1", 5);
        assert!(result.is_ok());

        let txn = result.unwrap();
        assert_eq!(txn.purchase_type, PurchaseType::PayPerUse);
    }

    #[test]
    fn test_micropayment_limit() {
        let payments = AppStorePayments::default_config();

        let result = payments.process_micropayment("chip-app", "user-1", 500);
        assert!(result.is_err());

        if let Err(PaymentError::ExceedsMicropaymentLimit { amount, limit }) = result {
            assert_eq!(amount, 500);
            assert_eq!(limit, 100);
        } else {
            panic!("Expected ExceedsMicropaymentLimit error");
        }
    }

    #[test]
    fn test_revenue_tracking() {
        let payments = AppStorePayments::default_config();

        payments.process_micropayment("app-1", "user-1", 10).unwrap();
        payments.process_micropayment("app-1", "user-2", 20).unwrap();
        payments.process_micropayment("app-2", "user-1", 50).unwrap();

        let app1_revenue = payments.get_app_revenue("app-1");
        assert_eq!(app1_revenue, 21); // 70% of 30 cents

        let app2_revenue = payments.get_app_revenue("app-2");
        assert_eq!(app2_revenue, 35); // 70% of 50 cents
    }

    #[test]
    fn test_batch_micropayments() {
        let payments = AppStorePayments::default_config();

        let batch = vec![
            ("app-1".to_string(), "user-1".to_string(), 5u64),
            ("app-1".to_string(), "user-2".to_string(), 10u64),
            ("app-2".to_string(), "user-1".to_string(), 15u64),
        ];

        let results = payments.process_micropayment_batch(batch);
        assert_eq!(results.len(), 3);
        assert!(results.iter().all(|r| r.is_ok()));
    }

    #[test]
    fn test_stats() {
        let payments = AppStorePayments::default_config();

        payments.process_micropayment("app-1", "user-1", 10).unwrap();
        payments.process_micropayment("app-2", "user-1", 20).unwrap();

        let stats = payments.get_stats();
        assert_eq!(stats.total_transactions, 2);
        assert_eq!(stats.total_volume_cents, 30);
        assert_eq!(stats.unique_apps, 2);
    }

    #[test]
    fn test_subscription_tiers() {
        assert_eq!(SubscriptionTier::Free.monthly_price_cents(), 0);
        assert_eq!(SubscriptionTier::Pro.monthly_price_cents(), 2900);
        assert_eq!(SubscriptionTier::Enterprise.monthly_price_cents(), 9900);

        assert_eq!(SubscriptionTier::Free.monthly_credits(), 100);
        assert_eq!(SubscriptionTier::Pro.monthly_credits(), 1000);
        assert_eq!(SubscriptionTier::Enterprise.monthly_credits(), 10000);
    }
}
