/* eslint-disable no-console */
import { ENV_MAP, getEnvironment } from "@walletconnect/utils";
import { THIRTY_SECONDS, toMiliseconds } from "@walletconnect/time";
import { ChainAbstractionTypes, IChainAbstraction, IWalletKitEngine } from "../types";
import { FULFILMENT_STATUS, CAN_FULFIL_STATUS } from "../constants";

import initWasm, { Client, Currency } from "./../libs/yttrium/yttrium";
import * as compressed from "./../libs/yttrium/yttrium-compressed";
import { decompressData } from "../utils";

export class ChainAbstraction extends IChainAbstraction {
  private prepareFulfilmentHandler: any;
  private fulfilmentStatusHandler: any;
  private estimateFeesHandler: any;
  private getERC20BalanceHandler: any;
  private getFulfilmentDetailsHandler: any;
  private statusPollingTimeout = THIRTY_SECONDS;
  private projectId: string;
  private initPromise?: Promise<void>;

  constructor(public engine: IWalletKitEngine) {
    super(engine);
    this.initPromise = this.loadHandlers().then(() => {
      console.log("ChainAbstraction loaded");
      this.initPromise = undefined;
    });

    this.projectId = this.engine.client.core.projectId || "";
  }

  public prepareFulfilment: IChainAbstraction["prepareFulfilment"] = async (params) => {
    await this.initPromise;
    console.log("prepareFulfilment", params, this.prepareFulfilmentHandler);
    if (!this.prepareFulfilmentHandler) {
      throw new Error(`prepareFulfilmentHandler not found for environment: '${getEnvironment()}'`);
    }

    const { transaction } = params;

    const result = (await this.prepareFulfilmentHandler({
      transaction,
      projectId: this.projectId,
    })) as ChainAbstractionTypes.PrepareFulfilmentHandlerResult;
    console.log("prepareFulfilment processing result..", result);
    switch (result.status) {
      case CAN_FULFIL_STATUS.error:
        return { status: CAN_FULFIL_STATUS.error, reason: result.reason };
      case CAN_FULFIL_STATUS.not_required:
        return { status: CAN_FULFIL_STATUS.not_required };
      case CAN_FULFIL_STATUS.available:
        // eslint-disable-next-line no-case-declarations
        const routes = result.data;
        return {
          status: CAN_FULFIL_STATUS.available,
          data: {
            fulfilmentId: routes.orchestrationId,
            checkIn: routes.checkIn,
            transactions: routes.transactions,
            funding: routes.metadata.fundingFrom,
            initialTransaction: routes.initialTransaction,
            initialTransactionMetadata: routes.metadata.initialTransaction,
          },
        };
      default:
        throw new Error(`Invalid prepareFulfilment status: ${JSON.stringify(result)}`);
    }
  };

  public fulfilmentStatus: IChainAbstraction["fulfilmentStatus"] = async (params) => {
    await this.initPromise;
    if (!this.fulfilmentStatusHandler) {
      throw new Error(`fulfilmentStatusHandler not found for environment: '${getEnvironment()}'`);
    }

    const { fulfilmentId } = params;

    const timeout = setTimeout(() => {
      throw new Error(`Fulfilment status polling timeout: ${fulfilmentId}`);
    }, toMiliseconds(this.statusPollingTimeout));

    let result;

    do {
      const statusResult = (await this.fulfilmentStatusHandler({
        orchestrationId: fulfilmentId,
        projectId: this.projectId,
      })) as ChainAbstractionTypes.FulfilmentStatusHandlerResponse;

      console.log("fulfilmentStatus result", statusResult);

      if (statusResult.status === FULFILMENT_STATUS.pending) {
        console.log("fulfilmentStatus pending retrying...", statusResult);
        await new Promise((resolve) => setTimeout(resolve, statusResult.checkIn));
        continue;
      }

      if (statusResult.status === FULFILMENT_STATUS.error) {
        clearTimeout(timeout);
        throw new Error(statusResult.reason);
      }

      clearTimeout(timeout);
      result = statusResult;
    } while (!result);

    return result;
  };

  /**
   * TODO: pass projectId to yttrium handlers
   */

  public estimateFees: IChainAbstraction["estimateFees"] = async (params) => {
    await this.initPromise;
    if (!this.estimateFeesHandler) {
      throw new Error(`estimateFeesHandler not found for environment: '${getEnvironment()}'`);
    }
    const result = await this.estimateFeesHandler({
      ...params,
      projectId: this.projectId,
    });

    console.log("estimateFees result", result);
    return result;
  };

  public getERC20Balance: IChainAbstraction["getERC20Balance"] = async (params) => {
    await this.initPromise;
    if (!this.getERC20BalanceHandler) {
      throw new Error(`getERC20BalanceHandler not found for environment: '${getEnvironment()}'`);
    }
    const result = await this.getERC20BalanceHandler({
      ...params,
      projectId: this.projectId,
    });

    console.log("getERC20Balance result", result);
    return result;
  };

  public getFulfilmentDetails: IChainAbstraction["getFulfilmentDetails"] = async (params) => {
    await this.initPromise;
    if (!this.getFulfilmentDetailsHandler) {
      throw new Error(
        `getFulfilmentDetailsHandler not found for environment: '${getEnvironment()}'`,
      );
    }
    const { fulfilmentId } = params;
    const result = await this.getFulfilmentDetailsHandler({
      ...params,
      orchestrationId: fulfilmentId,
      projectId: this.projectId,
    });

    console.log("getFulfilmentDetails handler result", result);
    const bridgeDetails: ChainAbstractionTypes.TransactionFee[] = [];

    for (const fees of result.bridge) {
      bridgeDetails.push({
        fee: fees.fee,
        localFee: fees.localFee || fees.local_fee,
      });
    }

    const routeDetails: ChainAbstractionTypes.TransactionDetails[] = [];

    for (const transaction of result.route) {
      routeDetails.push({
        transaction: transaction.transaction,
        eip1559: transaction.estimate,
        transactionFee: {
          fee: transaction.fee.fee,
          localFee: transaction.fee.localFee || transaction.fee.local_fee,
        },
      });
    }

    const initialTransactionDetails: ChainAbstractionTypes.TransactionDetails = {
      transaction: result.initial.transaction,
      eip1559: result.initial.estimate,
      transactionFee: {
        fee: result.initial.fee.fee,
        localFee: result.initial.fee.localFee || result.initial.fee.local_fee,
      },
    };

    const totalFee: ChainAbstractionTypes.TotalFee = result.localTotal || result.local_total;

    console.log("getFulfilmentDetails parsed result", {
      routeDetails,
      initialTransactionDetails,
      bridgeDetails,
      totalFee,
    });

    return {
      routeDetails,
      initialTransactionDetails,
      bridgeDetails,
      totalFee,
    };
  };

  private loadHandlers = async () => {
    const env = getEnvironment();
    console.log("ChainAbstraction environment, loadHandlers", env);
    switch (env) {
      case ENV_MAP.reactNative:
        return this.ReactNative();
      case ENV_MAP.browser:
        return await this.Browser();
      case ENV_MAP.node:
        return await this.Node();
    }
  };

  private ReactNative = () => {
    try {
      const yttrium = (global as any)?.yttrium;
      if (!yttrium) {
        console.warn("React Native Yttrium not found in global scope");
        return;
      }
      this.prepareFulfilmentHandler = async (params: any) =>
        this.parseResult(await yttrium.prepare(params));
      this.fulfilmentStatusHandler = async (params: any) =>
        this.parseResult(await yttrium.status(params));
      this.estimateFeesHandler = async (params: any) =>
        this.parseResult(await yttrium.estimateFees(params));
      this.getERC20BalanceHandler = async (params: any) =>
        this.parseResult(await yttrium.getERC20Balance(params));
      this.getFulfilmentDetailsHandler = async (params: any) =>
        this.parseResult(await yttrium.getBridgeDetails(params));
    } catch (error) {
      console.error("React Native Yttrium init error", error);
    }
  };

  private Browser = async () => {
    try {
      const handlers = await this.initializeInjectedYttrium();

      this.prepareFulfilmentHandler = async (params: any) =>
        this.parseResult(await handlers.prepare(params));
      this.fulfilmentStatusHandler = async (params: any) =>
        this.parseResult(await handlers.status(params));
      this.getERC20BalanceHandler = async (params: any) =>
        this.parseResult(await handlers.getERC20Balance(params));
      this.getFulfilmentDetailsHandler = async (params: any) =>
        this.parseResult(await handlers.getBridgeDetails(params));
    } catch (error) {
      console.error("Browser Yttrium init error", error);
    }
  };

  private Node = async () => {
    try {
      const handlers = await this.initializeInjectedYttrium();

      this.prepareFulfilmentHandler = async (params: any) =>
        this.parseResult(await handlers.prepare(params));
      this.fulfilmentStatusHandler = async (params: any) =>
        this.parseResult(await handlers.status(params));
      this.getERC20BalanceHandler = async (params: any) =>
        this.parseResult(await handlers.getERC20Balance(params));
      this.getFulfilmentDetailsHandler = async (params: any) =>
        this.parseResult(await handlers.getBridgeDetails(params));
    } catch (error) {
      console.error("Node Yttrium init error", error);
    }
    console.log("Node handlers loaded", this.prepareFulfilmentHandler);
  };

  private parseResult = (result: any) => {
    if (typeof result === "undefined") return;

    // iOS returns parsed JSON object, while Android returns stringified
    if (typeof result === "string") {
      try {
        return JSON.parse(result);
      } catch (e) {}
    }
    return result;
  };

  private initializeInjectedYttrium = async () => {
    const compressedWasm = Buffer.from(compressed.yttrium, "base64");
    const wasmBuffer = Buffer.from(await decompressData(compressedWasm));
    await initWasm(wasmBuffer);

    const handlers = {
      prepareResponseCache: {},
      client: new Client(this.projectId),
      prepare: async (params: Parameters<IChainAbstraction["prepareFulfilment"]>[0]) => {
        const { chainId, from, to, value, input, data } = params.transaction;

        const result = await handlers.client.prepare(chainId, from, {
          to,
          value: value || "0x",
          input: input || data,
        });
        console.log("prepare called", result);

        if (!result) {
          throw new Error("Empty response from yttrium's prepare");
        }

        if (result?.error) {
          return {
            status: CAN_FULFIL_STATUS.error,
            reason: result.error,
          };
        }

        if (result?.transactions?.length === 0) {
          return {
            status: CAN_FULFIL_STATUS.not_required,
          };
        }

        // @ts-ignore
        handlers.prepareResponseCache[result.orchestrationId] = result;

        return {
          status: CAN_FULFIL_STATUS.available,
          data: result,
        };
      },
      status: async (params: { orchestrationId: string }) => {
        console.log("status called", params);
        const { orchestrationId } = params;
        return await handlers.client.status(orchestrationId);
      },
      getERC20Balance: (params: Parameters<IChainAbstraction["getERC20Balance"]>[0]) => {
        console.log("getERC20Balance called", params);
        const { chainId, tokenAddress, ownerAddress } = params;
        return handlers.client.erc20_token_balance(chainId, tokenAddress, ownerAddress);
      },
      getBridgeDetails: (params: { orchestrationId: string }) => {
        console.log("getBridgeDetails called", params);
        const { orchestrationId } = params;
        // @ts-ignore
        const result = handlers.prepareResponseCache[orchestrationId];

        if (!result) {
          throw new Error(`No prepare response found for fulfilmentId: ${orchestrationId}`);
        }

        return handlers.client.get_ui_fields(result, Currency.Usd);
      },
    };
    return handlers;
  };
}
