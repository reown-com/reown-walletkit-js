/* eslint-disable no-console */
import { ENV_MAP, getEnvironment } from "@walletconnect/utils";
import { ChainAbstractionTypes, IChainAbstraction, IWalletKitEngine } from "../types";

import initWasm, {
  Amount,
  Client,
  Currency,
  Metadata,
  PrepareDetailedResponse,
  PrepareResponse,
  PrepareResponseAvailable,
  PrepareResponseNotRequired,
  TransactionFee,
  UiFields,
} from "./../libs/yttrium";

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

    this.projectId = this.engine.client.core.projectId || "";

    this.initPromise = this.loadHandlers().then(() => {
      console.log("ChainAbstraction loaded");
      this.initPromise = undefined;
    });
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
        return await this.ReactNative();
      case ENV_MAP.browser:
        return await this.Browser();
      case ENV_MAP.node:
        return await this.Node();
    }
  };

  private ReactNative = async () => {
    // const prepareAvailableResult = {
    //   v1: {
    //     v1: {
    //       initialTransaction: {
    //         chainId: "eip155:42161",
    //         from: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
    //         gasLimit: "0x4427a",
    //         input:
    //           "0xa9059cbb00000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c5200000000000000000000000000000000000000000000000000000000003d0900",
    //         nonce: "0x68",
    //         to: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    //         value: "0x0",
    //       },
    //       metadata: {
    //         checkIn: 3000,
    //         fundingFrom: [
    //           {
    //             amount: "0x1caed4",
    //             bridgingFee: "0x113e",
    //             chainId: "eip155:8453",
    //             decimals: 6,
    //             symbol: "USDC",
    //             tokenContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    //           },
    //         ],
    //         initialTransaction: {
    //           amount: "0x3d0900",
    //           decimals: 6,
    //           symbol: "USDC",
    //           tokenContract: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    //           transferTo: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
    //         },
    //       },
    //       orchestrationId: "e5ce4f77-8b58-4fe9-8368-8b8476df7a5b",
    //       transactions: [
    //         {
    //           chainId: "eip155:8453",
    //           from: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
    //           gasLimit: "0x51c42",
    //           input:
    //             "0x095ea7b30000000000000000000000003a23f943181408eac424116af7b7790c94cb97a500000000000000000000000000000000000000000000000000000000001cc012",
    //           nonce: "0x41",
    //           to: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    //           value: "0x0",
    //         },
    //         {
    //           chainId: "eip155:8453",
    //           from: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
    //           gasLimit: "0xc9b34",
    //           input:
    //             "0x0000019b792ebcb900000000000000000000000000000000000000000000000000000000001cc012000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000113e0000000000000000000000000000000000000000000000000000000000001b3b000000000000000000000000000000000000000000000000000000000000000200000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c5200000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c520000000000000000000000000000000000000000000000000000000000000002000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e5831000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000001caed4000000000000000000000000000000000000000000000000000000000000a4b100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000067c8113f0000000000000000000000000000000000000000000000000000000067c86545d00dfeeddeadbeef765753be7f7a64d5509974b0d678e1e3149b02f4",
    //           nonce: "0x42",
    //           to: "0x3a23F943181408EAC424116Af7b7790c94Cb97a5",
    //           value: "0x0",
    //         },
    //       ],
    //     },
    //   },
    // };

    // const routeError = { v1: { error: "INSUFFICIENT_FUNDS" } };

    // const prepareDetailedAvailableResult = {
    //   v1: {
    //     v1: {
    //       bridge: [
    //         {
    //           fee: {
    //             amount: "0x1ff",
    //             formatted: "0.000511 USDC",
    //             formattedAlt: "\u003c$0.01",
    //             symbol: "USDC",
    //             unit: 6,
    //           },
    //           localFee: {
    //             amount: "0xbe5cc1f00",
    //             formatted: "0.00051100000000 USD",
    //             formattedAlt: "\u003c$0.01",
    //             symbol: "USD",
    //             unit: 14,
    //           },
    //         },
    //       ],
    //       initial: {
    //         fee: {
    //           fee: {
    //             amount: "0x6503b068a",
    //             formatted: "0.000000027115849354 ETH",
    //             formattedAlt: "\u003c$0.01",
    //             symbol: "ETH",
    //             unit: 18,
    //           },
    //           localFee: {
    //             amount: "0x14974517060bcdd2c7a",
    //             formatted: "0.00006077360404192743468154 USD",
    //             formattedAlt: "\u003c$0.01",
    //             symbol: "USD",
    //             unit: 26,
    //           },
    //         },
    //         transaction: {
    //           chainId: "eip155:10",
    //           from: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
    //           gasLimit: "0x3b934",
    //           input:
    //             "0xa9059cbb00000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c5200000000000000000000000000000000000000000000000000000000001e8480",
    //           maxFeePerGas: "0x10433",
    //           maxPriorityFeePerGas: "0xc67d",
    //           nonce: "0x66",
    //           to: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    //           value: "0x0",
    //         },
    //         transactionHashToSign:
    //           "0x24ec530948248b7dbd83e656415e32cd9d40e960c2415ec74cbd01d7ef178b92",
    //       },
    //       localBridgeTotal: {
    //         amount: "0xbe5cc1f00",
    //         formatted: "0.00051100000000 USD",
    //         formattedAlt: "\u003c$0.01",
    //         symbol: "USD",
    //         unit: 14,
    //       },
    //       localRouteTotal: {
    //         amount: "0xda382141973d4473f9f4",
    //         formatted: "0.01030511307296476526541300 USD",
    //         formattedAlt: "$0.01",
    //         symbol: "USD",
    //         unit: 26,
    //       },
    //       localTotal: {
    //         amount: "0xe653b8880436be41266e",
    //         formatted: "0.01087688667700669270009454 USD",
    //         formattedAlt: "$0.01",
    //         symbol: "USD",
    //         unit: 26,
    //       },
    //       route: [
    //         {
    //           fee: {
    //             fee: {
    //               amount: "0x1353b538a88",
    //               formatted: "0.000001328140225160 ETH",
    //               formattedAlt: "\u003c$0.01",
    //               symbol: "ETH",
    //               unit: 18,
    //             },
    //             localFee: {
    //               amount: "0x3ef3e1fd22f5aabadbd0",
    //               formatted: "0.00297285564958095592578000 USD",
    //               formattedAlt: "\u003c$0.01",
    //               symbol: "USD",
    //               unit: 26,
    //             },
    //           },
    //           transaction: {
    //             chainId: "eip155:8453",
    //             from: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
    //             gasLimit: "0x51c42",
    //             input:
    //               "0x095ea7b30000000000000000000000003a23f943181408eac424116af7b7790c94cb97a500000000000000000000000000000000000000000000000000000000001e665e",
    //             maxFeePerGas: "0x3c49d7",
    //             maxPriorityFeePerGas: "0x63d3",
    //             nonce: "0x41",
    //             to: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    //             value: "0x0",
    //           },
    //           transactionHashToSign:
    //             "0xbf0c0cb357dfd1093cf69285b9c821c8964f682c2f43f1977bc93267686d3b13",
    //         },
    //         {
    //           fee: {
    //             fee: {
    //               amount: "0x2fab0982f9a",
    //               formatted: "0.000003275727843226 ETH",
    //               formattedAlt: "\u003c$0.01",
    //               symbol: "ETH",
    //               unit: 18,
    //             },
    //             localFee: {
    //               amount: "0x9b443f44744799b91e24",
    //               formatted: "0.00733225742338380933963300 USD",
    //               formattedAlt: "$0.01",
    //               symbol: "USD",
    //               unit: 26,
    //             },
    //           },
    //           transaction: {
    //             chainId: "eip155:8453",
    //             from: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
    //             gasLimit: "0xc9aec",
    //             input:
    //               "0x0000019b792ebcb900000000000000000000000000000000000000000000000000000000001e665e000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000001ff0000000000000000000000000000000000000000000000000000000000001b3b000000000000000000000000000000000000000000000000000000000000000200000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c5200000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c520000000000000000000000000000000000000000000000000000000000000002000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda029130000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff85000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000001e645f000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000067c8213b0000000000000000000000000000000000000000000000000000000067c87541d00dfeeddeadbeef765753be7f7a64d5509974b0d678e1e3149b02f4",
    //             maxFeePerGas: "0x3c49d7",
    //             maxPriorityFeePerGas: "0x63d3",
    //             nonce: "0x42",
    //             to: "0x3a23F943181408EAC424116Af7b7790c94Cb97a5",
    //             value: "0x0",
    //           },
    //           transactionHashToSign:
    //             "0x13493630a58452039009b8d8e5e10fed29fcaa08c7016e3c62cbb51e05061047",
    //         },
    //       ],
    //       routeResponse: {
    //         initialTransaction: {
    //           chainId: "eip155:10",
    //           from: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
    //           gasLimit: "0x3b934",
    //           input:
    //             "0xa9059cbb00000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c5200000000000000000000000000000000000000000000000000000000001e8480",
    //           nonce: "0x66",
    //           to: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    //           value: "0x0",
    //         },
    //         metadata: {
    //           checkIn: 3000,
    //           fundingFrom: [
    //             {
    //               amount: "0x1e645f",
    //               bridgingFee: "0x1ff",
    //               chainId: "eip155:8453",
    //               decimals: 6,
    //               symbol: "USDC",
    //               tokenContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    //             },
    //           ],
    //           initialTransaction: {
    //             amount: "0x1e8480",
    //             decimals: 6,
    //             symbol: "USDC",
    //             tokenContract: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    //             transferTo: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
    //           },
    //         },
    //         orchestrationId: "e6bd6af7-0d17-4a5c-886b-d0df6c418a8a",
    //         transactions: [
    //           {
    //             chainId: "eip155:8453",
    //             from: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
    //             gasLimit: "0x51c42",
    //             input:
    //               "0x095ea7b30000000000000000000000003a23f943181408eac424116af7b7790c94cb97a500000000000000000000000000000000000000000000000000000000001e665e",
    //             nonce: "0x41",
    //             to: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    //             value: "0x0",
    //           },
    //           {
    //             chainId: "eip155:8453",
    //             from: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
    //             gasLimit: "0xc9aec",
    //             input:
    //               "0x0000019b792ebcb900000000000000000000000000000000000000000000000000000000001e665e000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000001ff0000000000000000000000000000000000000000000000000000000000001b3b000000000000000000000000000000000000000000000000000000000000000200000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c5200000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c520000000000000000000000000000000000000000000000000000000000000002000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda029130000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff85000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000001e645f000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000067c8213b0000000000000000000000000000000000000000000000000000000067c87541d00dfeeddeadbeef765753be7f7a64d5509974b0d678e1e3149b02f4",
    //             nonce: "0x42",
    //             to: "0x3a23F943181408EAC424116Af7b7790c94Cb97a5",
    //             value: "0x0",
    //           },
    //         ],
    //       },
    //     },
    //   }
    // }

    // const prepareDetailedNotRequiredResult = {
    //   v1: {
    //     v1: {
    //       initialTransaction: {
    //         chainId: "eip155:8453",
    //         from: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
    //         gasLimit: "0x0",
    //         input:
    //           "0xa9059cbb00000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c5200000000000000000000000000000000000000000000000000000000001e8480",
    //         nonce: "0x41",
    //         to: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    //         value: "0x0",
    //       },
    //       transactions: [],
    //     },
    //   },
    // };

    try {
      const yttrium = (global as any)?.yttrium;
      if (!yttrium) {
        console.warn("React Native Yttrium not found in global scope");
        return;
      }
      console.log("initializing RN yttrium");
      await yttrium.initialize({
        projectId: this.projectId,
        url: "https://api.yttrium.io",
        sdkVersion: "1.0.0",
        sdkPlatform: "mobile",
      });
      console.log("RN yttrium initialized");
      const handlers = {
        prepareResponseCache: {} as Record<string, ChainAbstractionTypes.PrepareResponseAvailable>,
        uiFieldsCache: {} as Record<string, ChainAbstractionTypes.UiFields>,
        prepare: async (params: Parameters<IChainAbstraction["prepare"]>[0]) => {
          const result = this.parseResult(await yttrium.prepare(params));

          let routes: PrepareResponseAvailable | undefined;

          // Yttrium Kotlin
          if ("v1" in result) {
            if ("error" in result.v1) {
              throw new Error(result.v1.error);
            }

            // Yttrium returns string instead of `0x${string}` for addresses
            routes = result.v1.v1 as PrepareResponseAvailable;
          }

          if (routes && "orchestrationId" in routes) {
            handlers.prepareResponseCache[routes.orchestrationId] = routes;
          }

          console.log("prepare called result", result);
          return routes as PrepareResponse;
        },
        status: async (params: { orchestrationId: string }) => {
          console.log("status called", params);
          const result = this.parseResult(await yttrium.status(params));
          console.log("status called result", result);
          return result;
        },
        getERC20Balance: async (params: Parameters<IChainAbstraction["getERC20Balance"]>[0]) => {
          console.log("getERC20Balance called", params);
          const result = this.parseResult(await yttrium.getERC20Balance(params));
          console.log("getERC20Balance called result", result);
          return result;
        },
        getBridgeDetails: async (params: { orchestrationId: string }) => {
          console.log("getBridgeDetails called", params);
          const { orchestrationId } = params;
          // @ts-ignore
          const prepareResponse = handlers.prepareResponseCache[orchestrationId];

          if (!prepareResponse) {
            throw new Error(`No prepare response found for fulfilmentId: ${orchestrationId}`);
          }

          const result = this.parseResult(await yttrium.getBridgeDetails(params));
          console.log("getBridgeDetails called result", result);
          return result;
        },
        getPrepareDetailed: async (params: Parameters<IChainAbstraction["prepareDetailed"]>[0]) => {
          console.log("getPrepareDetailed called", params);
          const result = this.parseResult(await yttrium.prepareDetailed(params));
          console.log("getPrepareDetailed called result", result);
          let routes = {} as PrepareDetailedResponse;

          // Yttrium Kotlin
          if ("v1" in result) {
            if ("error" in result.v1) {
              throw new Error(result.v1.error);
            }

            if ("routeResponse" in result.v1.v1) {
              routes = {
                success: {
                  available: result.v1.v1 as UiFields,
                },
              };
            } else {
              routes = {
                success: {
                  notRequired: result.v1.v1 as PrepareResponseNotRequired,
                },
              };
            }
          } else {
            // Yttrium Swift
            if ("error" in result) {
              switch (result.error) {
                case "insufficientFunds":
                  throw new Error("INSUFFICIENT_FUNDS");
                case "noRoutesAvailable":
                  throw new Error("NO_ROUTES_AVAILABLE");
                case "insufficientGasFunds":
                  throw new Error("INSUFFICIENT_GAS_FUNDS");
              }
            }

            if ("orchestrationId" in result) {
              routes = {
                success: {
                  available: {
                    route: result.route,
                    localRouteTotal: result.localRouteTotal as Amount,
                    bridge: result.bridge as TransactionFee[],
                    localBridgeTotal: result.localBridgeTotal as Amount,
                    routeResponse: {
                      initialTransaction:
                        result.initialTransaction as ChainAbstractionTypes.Transaction,
                      orchestrationId: result.orchestrationId,
                      transactions: result.transactions as ChainAbstractionTypes.Transaction[],
                      metadata: result.metadata as Metadata,
                    },
                    initial: result.initial,
                    localTotal: result.localTotal,
                  },
                },
              };
            } else {
              routes = {
                success: {
                  notRequired: result as PrepareResponseNotRequired,
                },
              };
            }
          }

          if ("success" in routes && "available" in routes.success) {
            const orchestrationId = routes.success.available.routeResponse.orchestrationId;
            handlers.uiFieldsCache[orchestrationId] = routes.success.available;
          }

          return routes;
        },
        execute: async (params: Parameters<IChainAbstraction["execute"]>[0]) => {
          console.log("execute called", params);
          const { orchestrationId } = params;
          const uiFields = handlers.uiFieldsCache[orchestrationId];

          if (!uiFields) {
            throw new Error(`No uiFields found for orchestrationId: ${orchestrationId}`);
          }
          console.log("execute called uiFields found:", uiFields);

          const result = this.parseResult(await yttrium.execute(params));
          console.log("execute called result", result);
          return result;
        },
      };

      console.log("RN handlers loaded");

      this.prepareHandler = (params: any) => handlers.prepare(params);
      this.statusHandler = (params: any) => handlers.status(params);
      this.getERC20BalanceHandler = (params: any) => handlers.getERC20Balance(params);
      this.getPrepareDetailsHandler = (params: any) => handlers.getBridgeDetails(params);
      this.prepareDetailedHandler = (params: any) => handlers.getPrepareDetailed(params);
      this.executeHandler = (params: any) => handlers.execute(params);
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
