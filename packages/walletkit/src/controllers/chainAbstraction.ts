/* eslint-disable no-console */
import { ENV_MAP, getEnvironment } from "@walletconnect/utils";
import { ChainAbstractionTypes, IChainAbstraction, IWalletKitEngine } from "../types";

import initWasm, { Client, Currency } from "./../libs/yttrium";

// @ts-expect-error
import * as compressed from "./../libs/yttrium/yttrium-compressed.js";
import { decompressData } from "../utils";

export class ChainAbstraction extends IChainAbstraction {
  private prepareHandler?: IChainAbstraction["prepare"];
  private statusHandler?: IChainAbstraction["status"];
  private getERC20BalanceHandler?: IChainAbstraction["getERC20Balance"];
  private getPrepareDetailsHandler?: IChainAbstraction["getPrepareDetails"];
  private prepareDetailedHandler?: IChainAbstraction["prepareDetailed"];
  private executeHandler?: IChainAbstraction["execute"];

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

  public prepare: IChainAbstraction["prepare"] = async (params) => {
    await this.toInitPromise();
    if (!this.prepareHandler) {
      throw new Error(`prepareFulfilmentHandler not found for environment: '${getEnvironment()}'`);
    }
    return this.prepareHandler(params);
  };

  public prepareDetailed: IWalletKitEngine["prepareDetailed"] = async (params) => {
    await this.toInitPromise();
    if (!this.prepareDetailedHandler) {
      throw new Error(`prepareDetailedHandler not found for environment: '${getEnvironment()}'`);
    }
    return this.prepareDetailedHandler(params);
  };

  public status: IChainAbstraction["status"] = async (params) => {
    await this.toInitPromise();
    if (!this.statusHandler) {
      throw new Error(`statusHandler not found for environment: '${getEnvironment()}'`);
    }
    return this.statusHandler(params);
  };

  public getERC20Balance: IChainAbstraction["getERC20Balance"] = async (params) => {
    await this.toInitPromise();
    if (!this.getERC20BalanceHandler) {
      throw new Error(`getERC20BalanceHandler not found for environment: '${getEnvironment()}'`);
    }
    return this.getERC20BalanceHandler(params);
  };

  public getPrepareDetails: IChainAbstraction["getPrepareDetails"] = async (params) => {
    await this.toInitPromise();
    if (!this.getPrepareDetailsHandler) {
      throw new Error(`getPrepareDetailsHandler not found for environment: '${getEnvironment()}'`);
    }
    return this.getPrepareDetailsHandler(params);
  };

  public execute: IChainAbstraction["execute"] = async (params) => {
    await this.toInitPromise();
    if (!this.executeHandler) {
      throw new Error(`executeHandler not found for environment: '${getEnvironment()}'`);
    }
    return this.executeHandler(params);
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
      this.prepareHandler = async (params: any) =>
        this.parseResult(await yttrium.prepare({ ...params, projectId: this.projectId }));
      this.statusHandler = async (params: any) =>
        this.parseResult(await yttrium.status({ ...params, projectId: this.projectId }));
      this.getERC20BalanceHandler = async (params: any) =>
        this.parseResult(await yttrium.getERC20Balance({ ...params, projectId: this.projectId }));
      this.getPrepareDetailsHandler = async (params: any) =>
        this.parseResult(await yttrium.getBridgeDetails({ ...params, projectId: this.projectId }));
      this.prepareDetailedHandler = async (params: any) =>
        this.parseResult(
          await yttrium.getPrepareDetailed({ ...params, projectId: this.projectId }),
        );
    } catch (error) {
      console.error("React Native Yttrium init error", error);
    }
  };

  private Browser = async () => {
    try {
      const handlers = await this.initializeInjectedYttrium();

      this.prepareHandler = async (params: any) => this.parseResult(await handlers.prepare(params));
      this.statusHandler = async (params: any) => this.parseResult(await handlers.status(params));
      this.getERC20BalanceHandler = async (params: any) =>
        this.parseResult(await handlers.getERC20Balance(params));
      this.getPrepareDetailsHandler = async (params: any) =>
        this.parseResult(await handlers.getBridgeDetails(params));
      this.prepareDetailedHandler = async (params: any) =>
        this.parseResult(await handlers.getPrepareDetailed(params));
      this.executeHandler = async (params: any) => this.parseResult(await handlers.execute(params));
    } catch (error) {
      console.error("Browser Yttrium init error", error);
    }
  };

  private Node = async () => {
    console.log("Node Yttrium init");
    try {
      const handlers = await this.initializeInjectedYttrium();

      this.prepareHandler = async (params: any) => this.parseResult(await handlers.prepare(params));
      this.statusHandler = async (params: any) => this.parseResult(await handlers.status(params));
      this.getERC20BalanceHandler = async (params: any) =>
        this.parseResult(await handlers.getERC20Balance(params));
      this.getPrepareDetailsHandler = async (params: any) =>
        this.parseResult(await handlers.getBridgeDetails(params));
      this.prepareDetailedHandler = async (params: any) =>
        this.parseResult(await handlers.getPrepareDetailed(params));
      this.executeHandler = async (params: any) => this.parseResult(await handlers.execute(params));
    } catch (error) {
      console.error("Node Yttrium init error", error);
    }
    console.log("Node handlers loaded");
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
    console.log("initializeInjectedYttrium");
    await initWasm(wasmBuffer).catch((error) => {
      console.error("initializeInjectedYttrium error", error);
    });

    console.log("initializeInjectedYttrium done");

    const handlers = {
      prepareResponseCache: {} as Record<string, ChainAbstractionTypes.PrepareResponseAvailable>,
      uiFieldsCache: {} as Record<string, ChainAbstractionTypes.UiFields>,
      client: new Client(this.projectId, {
        url: "https://api.yttrium.io",
        sdkVersion: "1.0.0",
        sdkPlatform: "desktop",
        bundleId: undefined,
      }),
      prepare: async (params: Parameters<IChainAbstraction["prepare"]>[0]) => {
        const { chainId, from, to, value, input } = params.transaction;
        console.log("prepare called", params);
        const result = await handlers.client
          .prepare(chainId, from, {
            to,
            value: value || "0x",
            input,
          })
          .catch((error) => {
            console.error("prepare error", error);
            return { error: error.message };
          });

        if ("orchestrationId" in result) {
          handlers.prepareResponseCache[result.orchestrationId] = result;
        }

        console.log("prepare called result", result);
        return result;
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
      getPrepareDetailed: async (params: Parameters<IChainAbstraction["prepareDetailed"]>[0]) => {
        console.log("getPrepareDetailed called", params);
        const { chainId, from, to, value, input } = params.transaction;

        const result = await handlers.client.prepare_detailed(
          chainId,
          from,
          {
            to,
            value: value || "0x",
            input,
          },
          Currency.Usd,
        );

        if ("error" in result) {
          throw new Error(result.error.error);
        }

        if ("notRequired" in result.success) {
          return result;
        }

        const orchestrationId = result.success.available.routeResponse.orchestrationId;
        handlers.uiFieldsCache[orchestrationId] = result.success.available;
        return result;
      },
      execute: (params: Parameters<IChainAbstraction["execute"]>[0]) => {
        console.log("execute called", params);
        const { orchestrationId, bridgeSignedTransactions, initialSignedTransaction } = params;
        const uiFields = handlers.uiFieldsCache[orchestrationId];

        if (!uiFields) {
          throw new Error(`No uiFields found for orchestrationId: ${orchestrationId}`);
        }
        console.log("execute called uiFields found:", uiFields);

        return handlers.client.execute(
          uiFields,
          bridgeSignedTransactions,
          initialSignedTransaction,
        );
      },
    };
    return handlers;
  };

  private async toInitPromise() {
    if (this.initPromise) {
      await this.initPromise;
    }
  }
}
