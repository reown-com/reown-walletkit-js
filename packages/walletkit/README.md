# @reown/walletkit

## Description

The WalletKit SDK streamlines the integration process, making it easier for wallet developers to include the authentication and transaction signing features necessary for their users to connect and interact with all sorts of apps — now and in the future.

## Getting Started

### Install

```
npm install @reown/walletkit
```

### Wallet Usage

1. Initialization

```javascript
import { Core } from "@walletconnect/core";
import { WalletKit } from "@reown/walletkit";

const core = new Core({
  projectId: process.env.PROJECT_ID,
});

const walletkit = await WalletKit.init({
  core, // <- pass the shared `core` instance
  metadata: {
    name: "Demo app",
    description: "Demo Client as Wallet/Peer",
    url: "www.walletconnect.com",
    icons: [],
  },
});
```

2. Sign Session Approval

```javascript
walletkit.on("session_proposal", async (proposal) => {
  const session = await walletkit.approveSession({
    id: proposal.id,
    namespaces,
  });
});
await walletkit.pair({ uri });
```

3. Sign Session Rejection

```javascript
walletkit.on("session_proposal", async (proposal) => {
  const session = await walletkit.rejectSession({
    id: proposal.id,
    reason: getSdkError("USER_REJECTED_METHODS"),
  });
});
```

4. Sign Session Disconnect

```javascript
await walletkit.disconnectSession({
  topic,
  reason: getSdkError("USER_DISCONNECTED"),
});
```

5. Responding to Sign Session Requests

```javascript
walletkit.on("session_request", async (event) => {
  const { id, method, params } = event.request;
  await walletkit.respondSessionRequest({ id, result: response });
});
```

6. Updating a Sign Session

```javascript
await walletkit.updateSession({ topic, namespaces: newNs });
```

7. Updating a Sign Session

```javascript
await walletkit.extendSession({ topic });
```

8. Emit Sign Session Events

```javascript
await walletkit.emitSessionEvent({
  topic,
  event: {
    name: "accountsChanged",
    data: ["0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb"],
  },
  chainId: "eip155:1",
});
```

9. Handle Sign Events

```javascript
walletkit.on("session_proposal", handler);
walletkit.on("session_request", handler);
walletkit.on("session_delete", handler);
```

### WalletConnect Pay

WalletKit includes built-in support for WalletConnect Pay, enabling wallets to handle payment requests.

1. Detecting Payment Links

```javascript
import { isPaymentLink } from "@reown/walletkit";

// Use when handling a scanned QR code or deep link
if (isPaymentLink(uri)) {
  // Handle as payment (see below)
} else {
  // Handle as WalletConnect pairing
  await walletkit.pair({ uri });
}
```

2. Getting Payment Options

```javascript
const options = await walletkit.pay.getPaymentOptions({
  paymentLink: "https://pay.walletconnect.com/...",
  accounts: ["eip155:1:0x...", "eip155:8453:0x..."],
  includePaymentInfo: true,
});

// options.paymentId - unique payment identifier
// options.options - array of payment options (different tokens/chains)
// options.info - payment details (amount, merchant, expiry)
```

3. Getting Required Actions

```javascript
const actions = await walletkit.pay.getRequiredPaymentActions({
  paymentId: options.paymentId,
  optionId: options.options[0].id,
});

// actions - array of wallet RPC calls to sign
// Each action contains: { walletRpc: { chainId, method, params } }
```

4. Confirming Payment

```javascript
// Sign the required actions and collect signatures
const signatures = await signActions(actions);

const result = await walletkit.pay.confirmPayment({
  paymentId: options.paymentId,
  optionId: options.options[0].id,
  signatures,
});

// result.status - "succeeded" | "processing" | "failed" | "expired"
// result.isFinal - whether the payment is complete
// result.pollInMs - if not final, poll again after this delay
```
