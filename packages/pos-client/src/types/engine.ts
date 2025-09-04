import { ISignClient, SessionTypes } from "@walletconnect/types";
import { IPOSClient, POSClientTypes } from "./client";
import EventEmitter from "events";

export declare namespace POSClientEngineTypes {
  type EngineEvents = POSClientTypes.Event | "await_approval";

  interface EventArguments extends POSClientTypes.EventArguments {
    await_approval: { approval: () => Promise<SessionTypes.Struct>; intentId: number };
  }

  type TransactionParams = {
    to: string;
    from: string;
    gas: string;
    value: string;
    data: string;
    gasPrice: string;
  };

  type Transaction = {
    method: string;
    params: TransactionParams[];
  };

  type RPCTransactions = {
    id: string;
    jsonrpc: string;
    result: {
      transactionRpc: Transaction;
      id: string;
    };
  };
}

export abstract class IPOSClientEngine {
  public abstract signClient: ISignClient;
  public abstract tokens: POSClientTypes.Token[];

  constructor(public client: IPOSClient) {}
  // ---------- Public Methods ------------------------------------------------- //
  public abstract init(): Promise<void>;

  public abstract setTokens(params: { tokens: POSClientTypes.Token[] }): Promise<void>;
  public abstract createPaymentIntent(params: {
    paymentIntents: POSClientTypes.PaymentIntent[];
  }): Promise<void>;
  public abstract restart(params?: { reinit?: boolean }): Promise<void>;

  // ---------- Event Handlers ----------------------------------------------- //
  public abstract on: <E extends POSClientEngineTypes.EngineEvents>(
    event: E,
    listener: (args: POSClientEngineTypes.EventArguments[E]) => void,
  ) => EventEmitter;

  public abstract once: <E extends POSClientEngineTypes.EngineEvents>(
    event: E,
    listener: (args: POSClientEngineTypes.EventArguments[E]) => void,
  ) => EventEmitter;

  public abstract off: <E extends POSClientTypes.Event>(
    event: E,
    listener: (args: POSClientEngineTypes.EventArguments[E]) => void,
  ) => EventEmitter;

  public abstract removeListener: <E extends POSClientEngineTypes.EngineEvents>(
    event: E,
    listener: (args: POSClientEngineTypes.EventArguments[E]) => void,
  ) => EventEmitter;

  public abstract emit: <E extends POSClientEngineTypes.EngineEvents>(
    event: E,
    args: POSClientEngineTypes.EventArguments[E],
  ) => boolean;

  // ---------- Internally used methods ----------------------------------------------- //
  public abstract prepareTransactionsFromPaymentIntents(params: {
    intentId: number;
    session: SessionTypes.Struct;
  }): Promise<POSClientEngineTypes.Transaction[]>;

  public abstract onSessionConnected(params: {
    intentId: number;
    session: SessionTypes.Struct;
  }): Promise<void>;

  public abstract sendTransactionsToWallet(params: {
    transactions: POSClientEngineTypes.Transaction[];
    session: SessionTypes.Struct;
    intentId: number;
  }): Promise<void>;

  public abstract awaitPaymentConfirmed(params: {
    intentId: number;
    result: unknown;
  }): Promise<void>;
}
