export const SUPPORTED_NAMESPACES = ["eip155", "solana"];

export const NAMESPACE_TO_TRANSACTION_METHOD = {
  eip155: "eth_sendTransaction",
  solana: "solana_sendTransaction",
};
