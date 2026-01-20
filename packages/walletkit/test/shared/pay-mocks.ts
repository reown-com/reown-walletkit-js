import type {
  PaymentOptionsResponse,
  ConfirmPaymentResponse,
  Action,
  PaymentStatus,
} from "@walletconnect/pay";

export function createMockPaymentOptionsResponse(
  overrides: Partial<PaymentOptionsResponse> = {},
): PaymentOptionsResponse {
  return {
    paymentId: "pay_123",
    options: [
      {
        id: "opt_1",
        account: "eip155:8453:0x1234567890123456789012345678901234567890",
        amount: {
          unit: "caip19/eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          value: "1000000",
          display: {
            assetSymbol: "USDC",
            assetName: "USD Coin",
            decimals: 6,
            iconUrl: "https://example.com/usdc.png",
            networkIconUrl: "https://example.com/base.png",
            networkName: "Base",
          },
        },
        etaS: 5,
        actions: [],
      },
    ],
    ...overrides,
  };
}

export function createMockPaymentOptionsWithInfo(
  overrides: Partial<PaymentOptionsResponse> = {},
): PaymentOptionsResponse {
  return {
    ...createMockPaymentOptionsResponse(),
    info: {
      status: "requires_action" as PaymentStatus,
      amount: {
        unit: "caip19/eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        value: "1000000",
        display: {
          assetSymbol: "USDC",
          assetName: "USD Coin",
          decimals: 6,
          iconUrl: "https://example.com/usdc.png",
          networkIconUrl: "https://example.com/base.png",
          networkName: "Base",
        },
      },
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      merchant: {
        name: "Test Merchant",
        iconUrl: "https://example.com/merchant.png",
      },
    },
    ...overrides,
  };
}

export function createMockActions(count = 1): Action[] {
  return Array.from({ length: count }, (_, i) => ({
    walletRpc: {
      chainId: "eip155:8453",
      method: "eth_signTypedData_v4",
      params: JSON.stringify([
        "0x1234567890123456789012345678901234567890",
        {
          domain: {
            name: "USD Coin",
            version: "2",
            chainId: "0x2105",
            verifyingContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          },
          types: {
            EIP712Domain: [
              { type: "string", name: "name" },
              { type: "string", name: "version" },
              { type: "uint256", name: "chainId" },
              { type: "address", name: "verifyingContract" },
            ],
            TransferWithAuthorization: [
              { type: "address", name: "from" },
              { type: "address", name: "to" },
              { type: "uint256", name: "value" },
              { type: "uint256", name: "validAfter" },
              { type: "uint256", name: "validBefore" },
              { type: "bytes32", name: "nonce" },
            ],
          },
          primaryType: "TransferWithAuthorization",
          message: {
            from: "0x1234567890123456789012345678901234567890",
            to: "0x0987654321098765432109876543210987654321",
            value: "1000000",
            validAfter: "0x0",
            validBefore: "0xffffffff",
            nonce: `0x${i.toString(16).padStart(64, "0")}`,
          },
        },
      ]),
    },
  }));
}

export function createMockConfirmResponse(
  status: PaymentStatus = "succeeded",
  isFinal = true,
): ConfirmPaymentResponse {
  return {
    status,
    isFinal,
    pollInMs: isFinal ? undefined : 1000,
  };
}

interface MockNativeModuleConfig {
  paymentOptionsResponses?: Map<string, PaymentOptionsResponse | Error>;
  actionsResponses?: Map<string, Action[] | Error>;
  confirmResponses?: Map<string, ConfirmPaymentResponse | Error>;
}

function paymentKey(paymentLink: string): string {
  if (paymentLink.includes("?")) {
    const query = paymentLink.split("?")[1];
    const pidParam = query.split("&").find((p) => p.startsWith("pid="));
    if (pidParam) return pidParam.replace("pid=", "");
  }
  const parts = paymentLink.split("/");
  return parts[parts.length - 1] || paymentLink;
}

function actionsKey(paymentId: string, optionId: string): string {
  return `${paymentId}:${optionId}`;
}

export function createMockNativeModule(config: MockNativeModuleConfig = {}) {
  const paymentOptionsResponses = config.paymentOptionsResponses ?? new Map();
  const actionsResponses = config.actionsResponses ?? new Map();
  const confirmResponses = config.confirmResponses ?? new Map();

  return {
    calls: {
      getPaymentOptions: [] as unknown[],
      getRequiredPaymentActions: [] as unknown[],
      confirmPayment: [] as unknown[],
    },

    setPaymentOptionsResponse(paymentLink: string, response: PaymentOptionsResponse | Error) {
      paymentOptionsResponses.set(paymentKey(paymentLink), response);
    },

    setActionsResponse(paymentId: string, optionId: string, response: Action[] | Error) {
      actionsResponses.set(actionsKey(paymentId, optionId), response);
    },

    setConfirmResponse(
      paymentId: string,
      optionId: string,
      response: ConfirmPaymentResponse | Error,
    ) {
      confirmResponses.set(actionsKey(paymentId, optionId), response);
    },

    resetCalls() {
      this.calls = {
        getPaymentOptions: [],
        getRequiredPaymentActions: [],
        confirmPayment: [],
      };
    },

    async getPaymentOptions(requestJson: string): Promise<string> {
      const params = JSON.parse(requestJson);
      this.calls.getPaymentOptions.push(params);

      const key = paymentKey(params.paymentLink);
      const response = paymentOptionsResponses.get(key);

      if (!response) {
        throw new Error(`Payment options error: Payment not found: ${key}`);
      }

      if (response instanceof Error) {
        throw response;
      }

      return JSON.stringify(response);
    },

    async getRequiredPaymentActions(requestJson: string): Promise<string> {
      const params = JSON.parse(requestJson);
      this.calls.getRequiredPaymentActions.push(params);

      const key = actionsKey(params.paymentId, params.optionId);
      const response = actionsResponses.get(key);

      if (!response) {
        throw new Error(`Payment request error: Actions not found for: ${key}`);
      }

      if (response instanceof Error) {
        throw response;
      }

      return JSON.stringify(response);
    },

    async confirmPayment(requestJson: string): Promise<string> {
      const params = JSON.parse(requestJson);
      this.calls.confirmPayment.push(params);

      const key = actionsKey(params.paymentId, params.optionId);
      const response = confirmResponses.get(key);

      if (!response) {
        throw new Error(`Confirm payment error: Confirm response not found for: ${key}`);
      }

      if (response instanceof Error) {
        throw response;
      }

      return JSON.stringify(response);
    },

    initialize(_configJson: string): void {},
  };
}
