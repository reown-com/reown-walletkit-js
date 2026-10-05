---
"@reown/walletkit": minor
---

WalletKit now reports its own name and version (`sdk_name: "walletkit"`, `sdk_version`) in the core events `INIT` event, alongside the core version it already sent. Requires `@walletconnect/core` with `eventClient.init({ sdk })` support.
