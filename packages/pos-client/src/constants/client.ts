export const PROTOCOL = "wc";
export const PROTOCOL_VERSION = 2;
export const CLIENT_CONTEXT = "POSClient";

export const CLIENT_STORAGE_PREFIX = `${PROTOCOL}@${PROTOCOL_VERSION}:${CLIENT_CONTEXT}:`;

export const CLIENT_STORAGE_OPTIONS = {
  database: ":memory:",
};

export const POS_CLIENT_VERSION = "1.0.0";
