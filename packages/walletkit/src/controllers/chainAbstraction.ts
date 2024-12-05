import { ENV_MAP, getEnvironment } from "@walletconnect/utils";
import { IChainAbstraction } from "../types";

export class ChainAbstraction extends IChainAbstraction {
  private canFulfilHandler: any;
  private fulfilmentStatusHandler: any;

  constructor() {
    super();
    this.loadHandlers();
  }

  public canFulfil = async (params: { transaction: any }) => {
    console.log("canFulfil", params);
    if (!this.canFulfilHandler) {
      throw new Error(`canFulfilHandler not found for environment: '${getEnvironment()}'`);
    }
    return await this.canFulfilHandler(params);
  };

  public fulfilmentStatus = async (params: { fulfilmentId: string }) => {
    if (!this.fulfilmentStatusHandler) {
      throw new Error(`fulfilmentStatusHandler not found for environment: '${getEnvironment()}'`);
    }
    console.log("fulfilmentStatus", params);
    return await Promise.resolve(true);
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
    this.canFulfilHandler = yttrium.canFulfil;
    this.fulfilmentStatusHandler = yttrium.fulfilmentStatus;
  };

  private Browser = () => {
    console.warn("Yttrium not available in browser environment");
  };

  private Node = () => {
    console.warn("Yttrium not available in node environment");
  };
}
