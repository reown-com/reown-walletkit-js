import { Core } from "@walletconnect/core";
import { setNativeModule, resetNativeModule } from "@walletconnect/pay";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { WalletKit, IWalletKit } from "../src";
import {
  TEST_CORE_OPTIONS,
  TEST_METADATA,
  disconnect,
  createMockNativeModule,
  createMockPaymentOptionsResponse,
  createMockPaymentOptionsWithInfo,
  createMockActions,
  createMockConfirmResponse,
} from "./shared";

describe("Pay Integration", () => {
  let wallet: IWalletKit;
  let mockModule: ReturnType<typeof createMockNativeModule>;

  beforeEach(async () => {
    // #given
    mockModule = createMockNativeModule();
    setNativeModule(mockModule);

    const core = new Core({
      ...TEST_CORE_OPTIONS,
    });

    wallet = await WalletKit.init({
      core,
      name: "wallet",
      metadata: TEST_METADATA,
    });
  });

  afterEach(async () => {
    resetNativeModule();
    await disconnect(wallet.core);
  });

  describe("initialization", () => {
    it("should initialize pay client", () => {
      // #then
      expect(wallet.pay).toBeDefined();
      expect(wallet.pay.getPaymentOptions).toBeInstanceOf(Function);
      expect(wallet.pay.getRequiredPaymentActions).toBeInstanceOf(Function);
      expect(wallet.pay.confirmPayment).toBeInstanceOf(Function);
    });
  });

  describe("getPaymentOptions", () => {
    it("should return payment options for a valid payment link", async () => {
      // #given
      const mockResponse = createMockPaymentOptionsResponse({ paymentId: "pay_test_123" });
      mockModule.setPaymentOptionsResponse("pay_test_123", mockResponse);

      // #when
      const result = await wallet.pay.getPaymentOptions({
        paymentLink: "https://pay.walletconnect.com/pay_test_123",
        accounts: ["eip155:8453:0x1234567890123456789012345678901234567890"],
      });

      // #then
      expect(result.paymentId).toBe("pay_test_123");
      expect(result.options).toHaveLength(1);
      expect(result.options[0].id).toBe("opt_1");
      expect(result.options[0].amount.display.assetSymbol).toBe("USDC");
    });

    it("should return payment options with payment info when requested", async () => {
      // #given
      const mockResponse = createMockPaymentOptionsWithInfo({ paymentId: "pay_with_info" });
      mockModule.setPaymentOptionsResponse("pay_with_info", mockResponse);

      // #when
      const result = await wallet.pay.getPaymentOptions({
        paymentLink: "pay_with_info",
        accounts: ["eip155:8453:0xabc"],
        includePaymentInfo: true,
      });

      // #then
      expect(result.info).toBeDefined();
      expect(result.info?.status).toBe("requires_action");
      expect(result.info?.merchant.name).toBe("Test Merchant");
    });

    it("should throw error for non-existent payment", async () => {
      // #when #then
      await expect(
        wallet.pay.getPaymentOptions({
          paymentLink: "pay_not_found",
          accounts: ["eip155:1:0xabc"],
        }),
      ).rejects.toThrow();
    });
  });

  describe("getRequiredPaymentActions", () => {
    it("should return actions for a valid option", async () => {
      // #given
      const mockActions = createMockActions(1);
      mockModule.setActionsResponse("pay_123", "opt_1", mockActions);

      // #when
      const result = await wallet.pay.getRequiredPaymentActions({
        paymentId: "pay_123",
        optionId: "opt_1",
      });

      // #then
      expect(result).toHaveLength(1);
      expect(result[0].walletRpc.chainId).toBe("eip155:8453");
      expect(result[0].walletRpc.method).toBe("eth_signTypedData_v4");
    });

    it("should return multiple actions when required", async () => {
      // #given
      const mockActions = createMockActions(3);
      mockModule.setActionsResponse("pay_multi", "opt_swap", mockActions);

      // #when
      const result = await wallet.pay.getRequiredPaymentActions({
        paymentId: "pay_multi",
        optionId: "opt_swap",
      });

      // #then
      expect(result).toHaveLength(3);
    });

    it("should throw error for non-existent option", async () => {
      // #when #then
      await expect(
        wallet.pay.getRequiredPaymentActions({
          paymentId: "pay_123",
          optionId: "opt_not_found",
        }),
      ).rejects.toThrow();
    });
  });

  describe("confirmPayment", () => {
    it("should confirm payment successfully", async () => {
      // #given
      const mockConfirm = createMockConfirmResponse("succeeded", true);
      mockModule.setConfirmResponse("pay_123", "opt_1", mockConfirm);

      // #when
      const result = await wallet.pay.confirmPayment({
        paymentId: "pay_123",
        optionId: "opt_1",
        signatures: ["0xsig1"],
      });

      // #then
      expect(result.status).toBe("succeeded");
      expect(result.isFinal).toBe(true);
    });

    it("should return processing status with poll time", async () => {
      // #given
      const mockConfirm = createMockConfirmResponse("processing", false);
      mockModule.setConfirmResponse("pay_processing", "opt_1", mockConfirm);

      // #when
      const result = await wallet.pay.confirmPayment({
        paymentId: "pay_processing",
        optionId: "opt_1",
        signatures: ["0xsig1"],
      });

      // #then
      expect(result.status).toBe("processing");
      expect(result.isFinal).toBe(false);
      expect(result.pollInMs).toBe(1000);
    });

    it("should pass collected data", async () => {
      // #given
      const mockConfirm = createMockConfirmResponse("succeeded", true);
      mockModule.setConfirmResponse("pay_kyc", "opt_1", mockConfirm);

      // #when
      await wallet.pay.confirmPayment({
        paymentId: "pay_kyc",
        optionId: "opt_1",
        signatures: ["0xsig1"],
        collectedData: [
          { id: "firstName", value: "John" },
          { id: "lastName", value: "Doe" },
        ],
      });

      // #then
      const call = mockModule.calls.confirmPayment[0] as { collectedData?: unknown[] };
      expect(call.collectedData).toHaveLength(2);
    });
  });

  describe("full payment flow", () => {
    it("should complete a full payment flow", async () => {
      // #given
      const paymentId = "pay_flow_123";
      const optionId = "opt_1";

      mockModule.setPaymentOptionsResponse(
        paymentId,
        createMockPaymentOptionsResponse({ paymentId }),
      );
      mockModule.setActionsResponse(paymentId, optionId, createMockActions(1));
      mockModule.setConfirmResponse(paymentId, optionId, createMockConfirmResponse("succeeded"));

      // #when - Step 1: Get payment options
      const options = await wallet.pay.getPaymentOptions({
        paymentLink: `https://pay.walletconnect.com/${paymentId}`,
        accounts: ["eip155:8453:0xUserAddress"],
      });

      expect(options.paymentId).toBe(paymentId);
      expect(options.options).toHaveLength(1);

      // #when - Step 2: Get required actions
      const actions = await wallet.pay.getRequiredPaymentActions({
        paymentId: options.paymentId,
        optionId: options.options[0].id,
      });

      expect(actions).toHaveLength(1);

      // #when - Step 3: Confirm payment (with mock signature)
      const result = await wallet.pay.confirmPayment({
        paymentId: options.paymentId,
        optionId: options.options[0].id,
        signatures: ["0xMockSignature123"],
      });

      // #then
      expect(result.status).toBe("succeeded");
      expect(result.isFinal).toBe(true);

      expect(mockModule.calls.getPaymentOptions).toHaveLength(1);
      expect(mockModule.calls.getRequiredPaymentActions).toHaveLength(1);
      expect(mockModule.calls.confirmPayment).toHaveLength(1);
    });
  });
});
