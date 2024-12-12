/* eslint-disable no-console */
import { ENV_MAP, getEnvironment } from "@walletconnect/utils";
import { ChainAbstractionTypes, IChainAbstraction, IWalletKitEngine } from "../types";
import { FULFILMENT_STATUS, CAN_FULFIL_STATUS } from "../constants";

export class ChainAbstraction extends IChainAbstraction {
  private canFulfilHandler: any;
  private fulfilmentStatusHandler: any;
  private projectId: string;

  constructor(public engine: IWalletKitEngine) {
    super(engine);
    this.loadHandlers();
    this.projectId = this.engine.client.core.projectId || "";
  }

  public canFulfil: IChainAbstraction["canFulfil"] = async (params) => {
    console.log("canFulfil", params);
    if (!this.canFulfilHandler) {
      throw new Error(`canFulfilHandler not found for environment: '${getEnvironment()}'`);
    }

    const { transaction } = params;

    const result = (await this.canFulfilHandler({
      transaction,
      projectId: this.projectId,
    })) as ChainAbstractionTypes.CanFulfilHandlerResult;
    console.log("canFulfil processing result..", result);
    switch (result.status) {
      case CAN_FULFIL_STATUS.error:
        return { status: CAN_FULFIL_STATUS.error, reason: result.reason };
      case CAN_FULFIL_STATUS.not_required:
        return { status: CAN_FULFIL_STATUS.not_required };
      case CAN_FULFIL_STATUS.available:
        return {
          status: CAN_FULFIL_STATUS.available,
          data: {
            fulfilmentId: result.data.orchestrationId,
            checkIn: result.data.checkIn,
            transactions: result.data.transactions,
            funding: result.data.metadata.fundingFrom,
          },
        };
      default:
        throw new Error(`Invalid canFulfil status: ${JSON.stringify(result)}`);
    }
  };

  public fulfilmentStatus: IChainAbstraction["fulfilmentStatus"] = async (params) => {
    if (!this.fulfilmentStatusHandler) {
      throw new Error(`fulfilmentStatusHandler not found for environment: '${getEnvironment()}'`);
    }

    const { fulfilmentId } = params;

    console.log("fulfilmentStatus", params);
    const result = (await this.fulfilmentStatusHandler({
      orchestrationId: fulfilmentId,
      projectId: this.projectId,
    })) as ChainAbstractionTypes.FulfilmentStatusHandlerResponse;

    if (result.status === FULFILMENT_STATUS.error) {
      throw new Error(result.reason);
    }
    console.log("fulfilmentStatus result", result);
    return result;
  };

  private loadHandlers = () => {
    const env = getEnvironment();
    switch (env) {
      case ENV_MAP.reactNative:
        return this.ReactNative();
      case ENV_MAP.browser:
        return this.Browser();
      case ENV_MAP.node:
        return this.Node();
    }
  };

  private ReactNative = () => {
    const yttrium = (global as any)?.yttrium;
    if (!yttrium) {
      console.warn("React Native Yttrium not found in global scope");
      return;
    }
    this.canFulfilHandler = yttrium.checkRoute;
    this.fulfilmentStatusHandler = yttrium.checkStatus;
  };

  private Browser = () => {
    console.warn("Yttrium not available in browser environment");
  };

  private Node = () => {
    const yttrium = (global as any)?.yttrium;
    if (!yttrium) {
      console.warn("Yttrium not available in node environment");
    }
    this.canFulfilHandler = yttrium.checkRoute;
    this.fulfilmentStatusHandler = yttrium.checkStatus;
  };
}
