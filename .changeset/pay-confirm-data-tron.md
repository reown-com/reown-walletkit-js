---
"@reown/walletkit": minor
---

Bump @walletconnect/pay to 1.1.0: `walletKit.pay.confirmPayment` now takes `data`, whose elements may be plain signature strings or JSON objects/arrays (e.g. TRON's `{raw_data_hex, signature}` confirm payload). `signatures` is deprecated and used as a fallback when `data` is omitted. Align @walletconnect/core, sign-client, types and utils to 2.25.0 (pay 1.1.0 pins utils 2.25.0) so a single @walletconnect version set ships.
