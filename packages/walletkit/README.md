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
