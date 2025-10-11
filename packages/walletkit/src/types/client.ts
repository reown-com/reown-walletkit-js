import EventEmmiter, { EventEmitter } from "events";
import { ICore, CoreTypes, SignClientTypes } from "@walletconnect/types";
import { Logger } from "@walletconnect/logger";
import { JsonRpcPayload } from "@walletconnect/jsonrpc-utils";
import { IWalletKitEngine } from "./engine.js";

export declare namespace WalletKitTypes {
  type Event =
    | "session_proposal"
    | "session_request"
    | "session_delete"
    | "proposal_expire"
    | "session_request_expire"
    | "session_authenticate";

  interface BaseEventArgs<T = unknown> {
    id: number;
    topic: string;
    params: T;
  }

  type SessionRequest = SignClientTypes.EventArguments["session_request"];

  type SessionProposal = SignClientTypes.EventArguments["session_proposal"];

  type SessionDelete = Omit<BaseEventArgs, "params">;

  type ProposalExpire = { id: number };

  type SessionRequestExpire = { id: number };

  type SessionAuthenticate = SignClientTypes.EventArguments["session_authenticate"];

  type SignConfig = SignClientTypes.Options["signConfig"];

  interface EventArguments {
    session_proposal: SessionProposal;
    session_request: SessionRequest;
    session_delete: Omit<BaseEventArgs, "params">;
    proposal_expire: ProposalExpire;
    session_request_expire: SessionRequestExpire;
    session_authenticate: SessionAuthenticate;
  }

  interface Options {
    core: ICore;
    metadata: Metadata;
    name?: string;
    signConfig?: SignConfig;
  }

  type Metadata = CoreTypes.Metadata;

  interface INotifications {
    decryptMessage: (params: {
      topic: string;
      encryptedMessage: string;
      storageOptions?: CoreTypes.Options["storageOptions"];
      storage?: CoreTypes.Options["storage"];
    }) => Promise<JsonRpcPayload>;
    getMetadata: (params: {
      topic: string;
      storageOptions?: CoreTypes.Options["storageOptions"];
      storage?: CoreTypes.Options["storage"];
    }) => Promise<CoreTypes.Metadata>;
  }
}

export abstract class IWalletKitEvents extends EventEmmiter {
  constructor() {
    super();
  }

  public abstract emit: <E extends WalletKitTypes.Event>(
    event: E,
    args: WalletKitTypes.EventArguments[E],
  ) => boolean;

  public abstract on: <E extends WalletKitTypes.Event>(
    event: E,
    listener: (args: WalletKitTypes.EventArguments[E]) => any,
  ) => this;

  public abstract once: <E extends WalletKitTypes.Event>(
    event: E,
    listener: (args: WalletKitTypes.EventArguments[E]) => any,
  ) => this;

  public abstract off: <E extends WalletKitTypes.Event>(
    event: E,
    listener: (args: WalletKitTypes.EventArguments[E]) => any,
  ) => this;

  public abstract removeListener: <E extends WalletKitTypes.Event>(
    event: E,
    listener: (args: WalletKitTypes.EventArguments[E]) => any,
  ) => this;
}

export abstract class IWalletKit {
  public abstract readonly name: string;
  public abstract engine: IWalletKitEngine;
  public abstract events: EventEmitter;
  public abstract logger: Logger;
  public abstract core: ICore;
  public abstract metadata: WalletKitTypes.Metadata;
  public abstract signConfig?: WalletKitTypes.SignConfig;

  constructor(public opts: WalletKitTypes.Options) {}

  // ---------- Public Methods ----------------------------------------------- //

  public abstract pair: IWalletKitEngine["pair"];

  // sign //
  public abstract approveSession: IWalletKitEngine["approveSession"];
  public abstract rejectSession: IWalletKitEngine["rejectSession"];
  public abstract updateSession: IWalletKitEngine["updateSession"];
  public abstract extendSession: IWalletKitEngine["extendSession"];
  public abstract respondSessionRequest: IWalletKitEngine["respondSessionRequest"];
  public abstract disconnectSession: IWalletKitEngine["disconnectSession"];
  public abstract emitSessionEvent: IWalletKitEngine["emitSessionEvent"];
  public abstract getActiveSessions: IWalletKitEngine["getActiveSessions"];
  public abstract getPendingSessionProposals: IWalletKitEngine["getPendingSessionProposals"];
  public abstract getPendingSessionRequests: IWalletKitEngine["getPendingSessionRequests"];
  // push
  public abstract registerDeviceToken: IWalletKitEngine["registerDeviceToken"];
  // multi chain auth //
  public abstract approveSessionAuthenticate: IWalletKitEngine["approveSessionAuthenticate"];
  public abstract formatAuthMessage: IWalletKitEngine["formatAuthMessage"];
  public abstract rejectSessionAuthenticate: IWalletKitEngine["rejectSessionAuthenticate"];

  // ---------- Event Handlers ----------------------------------------------- //
  public abstract on: <E extends WalletKitTypes.Event>(
    event: E,
    listener: (args: WalletKitTypes.EventArguments[E]) => void,
  ) => EventEmitter;

  public abstract once: <E extends WalletKitTypes.Event>(
    event: E,
    listener: (args: WalletKitTypes.EventArguments[E]) => void,
  ) => EventEmitter;

  public abstract off: <E extends WalletKitTypes.Event>(
    event: E,
    listener: (args: WalletKitTypes.EventArguments[E]) => void,
  ) => EventEmitter;

  public abstract removeListener: <E extends WalletKitTypes.Event>(
    event: E,
    listener: (args: WalletKitTypes.EventArguments[E]) => void,
  ) => EventEmitter;
}
