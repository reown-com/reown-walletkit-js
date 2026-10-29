export const PROTOCOL = "wc";
export const PROTOCOL_VERSION = 2;
export const CLIENT_CONTEXT = "WalletKit";

// Reported in the core events INIT payload. Kept in sync with package.json by scripts/update_sdk_version.sh
export const SDK_NAME = "walletkit";
export const SDK_VERSION = "1.6.0";

export const CLIENT_STORAGE_PREFIX = `${PROTOCOL}@${PROTOCOL_VERSION}:${CLIENT_CONTEXT}:`;

export const CLIENT_STORAGE_OPTIONS = {
  database: ":memory:",
};
