---
"@reown/walletkit": minor
---

Integrate WalletConnect Pay SDK

- Add `walletKit.pay` property exposing WalletConnectPay SDK methods:
  - `getPaymentOptions()` - fetch available payment options
  - `getRequiredPaymentActions()` - get wallet RPC calls to sign
  - `confirmPayment()` - submit signatures and confirm payment
- Add `isPaymentLink()` utility function to detect payment URIs
- Add optional `payConfig` to WalletKit initialization options
- Auto-configure Pay SDK with `clientId` and `appId` from WalletKit core
