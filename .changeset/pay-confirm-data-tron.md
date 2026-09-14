---
"@reown/walletkit": minor
---

Bump @walletconnect/pay to 1.1.0: `walletKit.pay.confirmPayment` now takes `data`, whose elements may be plain signature strings or JSON objects/arrays (e.g. TRON's `{raw_data_hex, signature}` confirm payload). `signatures` is deprecated and used as a fallback when `data` is omitted.
