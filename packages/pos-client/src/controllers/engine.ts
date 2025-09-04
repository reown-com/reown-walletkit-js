import { SignClient } from "@walletconnect/sign-client";
import { ISignClient, ProposalTypes } from "@walletconnect/types";
import { payloadId } from "@walletconnect/jsonrpc-utils";
import { parseChainId } from "@walletconnect/utils";

import { IPOSClientEngine, POSClientEngineTypes, POSClientTypes } from "../types";
import { isValidPaymentIntent, isValidToken } from "../utils";
import { NAMESPACE_TO_TRANSACTION_METHOD } from "../constants/chains";
import { POS_CLIENT_VERSION } from "../constants";

export class Engine extends IPOSClientEngine {
  public signClient: ISignClient;
  public tokens: POSClientTypes.Token[] = [];

  // map to keep track of pending payment intents
  private paymentIntentsMap: Map<number, POSClientTypes.PaymentIntent[]> = new Map();
  // map to keep track of payment intents with their transaction ids
  private paymentIntentToTransactionIdMap: Map<number, string> = new Map();

  constructor(client: IPOSClientEngine["client"]) {
    super(client);
    // initialized in init()
    this.signClient = {} as any;
    this.setupEventHandlers();
  }

  public init = async () => {
    this.signClient = await SignClient.init({
      projectId: this.client.opts.projectId,
      metadata: {
        name: this.client.metadata.merchantName,
        description: this.client.metadata.description,
        url: this.client.metadata.url,
        icons: [this.client.metadata.logoIcon],
      },
      storageOptions: {
        database: this.client.opts.storageOptions?.databaseName,
      },
    });
  };

  public setTokens: IPOSClientEngine["setTokens"] = async (params) => {
    const { tokens } = params;
    tokens.forEach((token) => {
      if (!isValidToken(token)) {
        throw new Error(`Invalid token: ${JSON.stringify(token)}`);
      }
    });
    this.tokens = tokens;
  };

  public createPaymentIntent: IPOSClientEngine["createPaymentIntent"] = async (params) => {
    const { paymentIntents } = params;
    console.log("create payment intent", paymentIntents);

    if (paymentIntents.length === 0) {
      throw new Error("No payment intents provided");
    }

    paymentIntents.forEach((paymentIntent) => {
      if (!isValidPaymentIntent(paymentIntent)) {
        throw new Error(`Invalid payment intent: ${JSON.stringify(paymentIntent)}`);
      }
    });
    console.log("create payment intent validation success");
    const namespaces = this.composeNamespaces(paymentIntents);
    console.log("namespaces", namespaces);
    const { uri, approval } = await this.signClient.connect({
      optionalNamespaces: namespaces,
    });

    if (!uri) {
      this.client.events.emit("connection_failed", {
        error: {
          message: "Failed to connect to the WalletConnect network",
          code: 4001,
        },
      });
      throw new Error("Failed to connect to the WalletConnect network");
    }
    const intentId = payloadId();
    this.paymentIntentsMap.set(intentId, paymentIntents);
    this.emit("await_approval", { approval, intentId });
    this.emit("qr_ready", { uri });
  };

  public restart: IPOSClientEngine["restart"] = async (params) => {
    console.log("restart", params);
    this.paymentIntentsMap.clear();
    this.paymentIntentToTransactionIdMap.clear();
    if (params?.reinit) {
      this.tokens = [];
    }
  };

  // ---------- Event Handlers ----------------------------------------------- //

  public emit: IPOSClientEngine["emit"] = (event, args) => {
    console.log("emit", event, args);
    return this.client.events.emit(event, args);
  };

  public on: IPOSClientEngine["on"] = (event, listener) => {
    console.log("on", event, listener);
    return this.client.events.on(event, listener);
  };

  public once: IPOSClientEngine["once"] = (event, listener) => {
    console.log("once", event, listener);
    return this.client.events.once(event, listener);
  };

  public off: IPOSClientEngine["off"] = (event, listener) => {
    console.log("off", event, listener);
    return this.client.events.off(event, listener);
  };

  public removeListener: IPOSClientEngine["removeListener"] = (event, listener) => {
    console.log("removeListener", event, listener);
    return this.client.events.removeListener(event, listener);
  };

  // ---------- Private ----------------------------------------------- //

  private composeNamespaces(
    paymentIntents: POSClientTypes.PaymentIntent[],
  ): ProposalTypes.OptionalNamespaces {
    const namespaces: ProposalTypes.OptionalNamespaces = {};
    paymentIntents.forEach((paymentIntent) => {
      const {
        token: { network },
      } = paymentIntent;
      const { namespace } = parseChainId(network.chainId);

      namespaces[namespace] = {
        methods: [
          NAMESPACE_TO_TRANSACTION_METHOD[
            namespace as keyof typeof NAMESPACE_TO_TRANSACTION_METHOD
          ],
        ],
        chains: [network.chainId],
        events: [],
      };
    });
    return namespaces;
  }

  prepareTransactionsFromPaymentIntents: IPOSClientEngine["prepareTransactionsFromPaymentIntents"] =
    async (params) => {
      console.log("prepareTransactionsFromPaymentIntents", params.intentId, params.session.topic);
      const { intentId, session } = params;
      const paymentIntents = this.paymentIntentsMap.get(intentId);
      if (!paymentIntents) {
        throw new Error(`Payment intents not found for id: ${intentId}`);
      }

      const transactions: POSClientEngineTypes.Transaction[] = [];
      for (const paymentIntent of paymentIntents) {
        const { token, amount, recipient } = paymentIntent;
        const { namespace } = parseChainId(token.network.chainId);
        // gets the first address that matches the token network chain id
        const account = session.namespaces[namespace].accounts.find((account) =>
          account.includes(`${token.network.chainId}:`),
        );
        if (!account) {
          throw new Error(
            `Address not found in session for chain id: ${
              token.network.chainId
            }, approved addresses: ${session.namespaces[namespace].accounts.join(", ")}`,
          );
        }
        const payload = {
          id: payloadId(),
          jsonrpc: "2.0",
          method: "reown_pos_buildTransaction",
          params: {
            asset: `${token.network.chainId}/${token.standard.toLowerCase()}:${token.address}`,
            recipient: recipient,
            amount: amount,
            sender: account,
          },
        };
        const response = await this.fetchRpcRequest(JSON.stringify(payload));
        console.log("rpcTransaction", JSON.stringify(response, null, 2));
        transactions.push(response.result.transactionRpc);
        this.paymentIntentToTransactionIdMap.set(intentId, response.result.id);
      }
      return transactions;
    };

  onSessionConnected: IPOSClientEngine["onSessionConnected"] = async (params) => {
    const { intentId, session } = params;
    console.log("onSessionConnected", intentId, session.topic);
    this.emit("connected", {});
    const transactions = await this.prepareTransactionsFromPaymentIntents({ intentId, session });
    console.log("transactions", JSON.stringify(transactions, null, 2));
    this.sendTransactionsToWallet({ transactions, session, intentId });
  };

  sendTransactionsToWallet: IPOSClientEngine["sendTransactionsToWallet"] = async (params) => {
    const { transactions, session, intentId } = params;
    console.log("sendTransactionsToWallet", transactions, session.topic);
    const paymentIntents = this.paymentIntentsMap.get(intentId);
    if (!paymentIntents) {
      throw new Error(`Payment intents not found for id: ${intentId}`);
    }
    const { token } = paymentIntents[0];
    try {
      this.emit("payment_requested", {});
      let result;
      try {
        result = await this.signClient.request({
          topic: session.topic,
          request: transactions[0],
          chainId: token.network.chainId,
        });
      } catch (error) {
        console.error("error", error);
        this.emit("payment_rejected", {
          error: {
            message: (error as Error)?.message,
            code: 4001,
          },
        });
        throw error;
      }
      this.emit("payment_broadcasted", result);
      await this.awaitPaymentConfirmed({ intentId, result });
    } catch (error) {
      console.error("error", error);
    }
  };

  awaitPaymentConfirmed: IPOSClientEngine["awaitPaymentConfirmed"] = async (params) => {
    const { intentId, result } = params;
    const paymentIntents = this.paymentIntentsMap.get(intentId);
    if (!paymentIntents) {
      throw new Error(`Payment intents not found for id: ${intentId}`);
    }
    const transactionId = this.paymentIntentToTransactionIdMap.get(intentId);
    if (!transactionId) {
      throw new Error(`Transaction id not found for intent id: ${intentId}`);
    }

    const payload = {
      id: payloadId(),
      jsonrpc: "2.0",
      method: "reown_pos_checkTransaction",
      params: {
        id: transactionId,
        sendResult: result,
      },
    };
    let transactionResult;
    while (!transactionResult) {
      if (transactionResult) {
        break;
      }

      const response = await this.fetchRpcRequest(JSON.stringify(payload));
      if (response.result.status === "CONFIRMED") {
        console.log("payment_successful", response.result);
        this.emit("payment_successful", {});
        transactionResult = response.result;
        break;
      } else if (response.result.status === "FAILED") {
        console.log("payment_failed", response.result);
        this.emit("payment_failed", {
          error: {
            message: response.result.error,
            code: 4001,
          },
        });
        transactionResult = response.result;
        break;
      } else if (response.result.status === "PENDING") {
        console.log("payment_pending", response.result);
        await new Promise((resolve) => setTimeout(resolve, response.result.checkIn || 1000));
      }
    }
    console.log("awaitPaymentConfirmed", intentId, transactionId);
  };

  private setupEventHandlers = () => {
    this.on("await_approval", async ({ approval, intentId }) => {
      try {
        console.log("await_approval", intentId);
        const session = await approval();
        this.onSessionConnected({ intentId, session });
      } catch (error) {
        console.error("error", error);
        this.emit("connection_rejected", {
          error: {
            message: (error as Error)?.message,
            code: 4001,
          },
        });
      }
    });
  };

  private fetchRpcRequest = async (payload: string) => {
    const result = await fetch(this.getRpcUrl(), {
      method: "POST",
      body: payload,
    });
    const data = await result.json();

    if (!result.ok || data.error) {
      this.emit("payment_failed", {
        error: {
          message: data.error?.message,
          code: 4001,
        },
      });
      throw new Error(`Failed to prepare transaction: ${data.error?.message}`);
    }
    return data;
  };

  private getRpcUrl = () => {
    return `https://rpc.walletconnect.org/v1/json-rpc?projectId=${this.client.opts.projectId}&st=node&sv=js-pos-${POS_CLIENT_VERSION}`;
  };
}
