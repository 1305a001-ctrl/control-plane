/**
 * Heuristic asset-class classifier from the `asset` symbol on trades.
 *
 * v0.1.0 — until migration adds a top-level `asset_class` column to
 * trades, classify by membership in known crypto symbol set + lookup.
 * Anything else under 5 chars uppercase is assumed stocks (NVDA, AAPL,
 * etc.). Forex pairs (EUR/USD) detected by the slash. Predictions are
 * separate (poly_positions table).
 */
export const CRYPTO_SYMBOLS = new Set([
  "BTC",
  "ETH",
  "SOL",
  "DOGE",
  "ADA",
  "BNB",
  "XRP",
  "DOT",
  "MATIC",
  "AVAX",
  "LINK",
  "TRX",
  "TON",
  "PEPE",
  "SHIB",
  "LTC",
  "BCH",
  "ATOM",
  "NEAR",
  "ARB",
  "OP",
  "SUI",
  "APT",
  "USDT",
  "USDC",
] as const);

export type AssetClass = "crypto" | "stocks" | "forex" | "predictions";

/**
 * Classify a trade `asset` field. Returns "predictions" only by caller
 * convention (this helper is for trades; poly_positions are handled
 * separately).
 */
export function classifyAsset(asset: string): AssetClass {
  const upper = asset.toUpperCase().trim();
  if (upper.includes("/") || upper.includes("USD") && upper.length === 6) {
    // EUR/USD or EURUSD
    return "forex";
  }
  // Strip common crypto suffixes (BTC-USDT, ETH-USDT, etc.)
  const head = upper.split(/[-_/]/)[0] ?? upper;
  if (CRYPTO_SYMBOLS.has(head as never)) return "crypto";
  return "stocks";
}
