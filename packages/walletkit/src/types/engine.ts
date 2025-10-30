import EventEmitter from "events";
import { ErrorResponse, JsonRpcResponse } from "@walletconnect/jsonrpc-utils";
import {
  ISignClient,
  PendingRequestTypes,
  ProposalTypes,
  SessionTypes,
  EchoClientTypes,
  AuthTypes,
  EngineTypes,
} from "@walletconnect/types";
import { IWalletKit, WalletKitTypes } from "./client.js";

export abstract class IWalletKitEngine {
  public abstract signClient: ISignClient;

  constructor(public client: IWalletKit) {}
  // ---------- Public Methods ------------------------------------------------- //
  public abstract init(): Promise<void>;

  public abstract pair(params: { uri: string; activatePairing?: boolean }): Promise<void>;

  // ---------- Sign ------------------------------------------------- //
  // approve a session proposal (SIGN)
  public abstract approveSession(params: {
    id: number;
    namespaces: Record<string, SessionTypes.Namespace>;
    sessionProperties?: ProposalTypes.SessionProperties;
    scopedProperties?: ProposalTypes.ScopedProperties;
    sessionConfig?: SessionTypes.SessionConfig;
    relayProtocol?: string;
    proposalRequestsResponses?: EngineTypes.ApproveParams["proposalRequestsResponses"];
  }): Promise<SessionTypes.Struct>;

  // reject a session proposal (SIGN)
  public abstract rejectSession(params: {
    // proposerPublicKey: string;
    id: number;
    reason: ErrorResponse;
  }): Promise<void>;

  // update session namespaces (SIGN)
  public abstract updateSession(params: {
    topic: string;
    namespaces: SessionTypes.Namespaces;
  }): Promise<{ acknowledged: () => Promise<void> }>;

  // update session expiry (SIGN)
  public abstract extendSession(params: {
    topic: string;
  }): Promise<{ acknowledged: () => Promise<void> }>;

  // respond JSON-RPC request (SIGN)
  public abstract respondSessionRequest(params: {
    topic: string;
    response: JsonRpcResponse;
  }): Promise<void>;

  // emit session events (SIGN)
  public abstract emitSessionEvent(params: {
    topic: string;
    event: any; //SessionEvent;
    chainId: string;
  }): Promise<void>;

  // disconnect a session (SIGN)
  public abstract disconnectSession(params: {
    topic: string;
    reason: ErrorResponse;
  }): Promise<void>;

  // query all active sessions (SIGN)
  public abstract getActiveSessions(): Record<string, SessionTypes.Struct>;

  // query all pending session requests (SIGN)
  public abstract getPendingSessionProposals(): Record<number, ProposalTypes.Struct>;

  // query all pending session requests (SIGN)
  public abstract getPendingSessionRequests(): PendingRequestTypes.Struct[];

  // ---------- Multi chain Auth ------------------------------------------------- //

  public abstract approveSessionAuthenticate(
    params: AuthTypes.ApproveSessionAuthenticateParams,
  ): Promise<{ session: SessionTypes.Struct | undefined }>;

  public abstract formatAuthMessage: (params: {
    request: AuthTypes.BaseAuthRequestParams;
    iss: string;
  }) => string;

  public abstract rejectSessionAuthenticate(params: {
    id: number;
    reason: ErrorResponse;
  }): Promise<void>;

  // ---------- Push ------------------------------------------------- //
  public abstract registerDeviceToken(
    params: EchoClientTypes.RegisterDeviceTokenParams,
  ): Promise<void>;

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
