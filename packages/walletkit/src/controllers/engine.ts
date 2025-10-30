import { SignClient } from "@walletconnect/sign-client";
import { ISignClient, SessionTypes } from "@walletconnect/types";
import { IWalletKitEngine, WalletKitTypes } from "../types/index.js";

export class Engine extends IWalletKitEngine {
  public signClient: ISignClient;

  constructor(client: IWalletKitEngine["client"]) {
    super(client);
    // initialized in init()
    this.signClient = {} as any;
  }

  public init = async () => {
    this.signClient = await SignClient.init({
      core: this.client.core,
      metadata: this.client.metadata,
      signConfig: this.client.signConfig,
    });
    this.signClient.core.eventClient.init().catch((error) => {
      this.client.logger.warn(error);
    });
  };

  public pair: IWalletKitEngine["pair"] = async (params) => {
    await this.client.core.pairing.pair(params);
  };

  // Sign //
  public approveSession: IWalletKitEngine["approveSession"] = async (sessionProposal) => {
    const { topic, acknowledged } = await this.signClient.approve({
      ...sessionProposal,
      id: sessionProposal.id,
      namespaces: sessionProposal.namespaces,
      sessionProperties: sessionProposal.sessionProperties,
      scopedProperties: sessionProposal.scopedProperties,
      sessionConfig: sessionProposal.sessionConfig,
      proposalRequestsResponses: sessionProposal?.proposalRequestsResponses,
    });
    await acknowledged();
    return this.signClient.session.get(topic);
  };

  public rejectSession: IWalletKitEngine["rejectSession"] = async (params) => {
    return await this.signClient.reject(params);
  };

  public updateSession: IWalletKitEngine["updateSession"] = async (params) => {
    return await this.signClient.update(params);
  };

  public extendSession: IWalletKitEngine["extendSession"] = async (params) => {
    return await this.signClient.extend(params);
  };

  public respondSessionRequest: IWalletKitEngine["respondSessionRequest"] = async (params) => {
    const result = await this.signClient.respond(params);
    return result;
  };

  public disconnectSession: IWalletKitEngine["disconnectSession"] = async (params) => {
    return await this.signClient.disconnect(params);
  };

  public emitSessionEvent: IWalletKitEngine["emitSessionEvent"] = async (params) => {
    return await this.signClient.emit(params);
  };

  public getActiveSessions: IWalletKitEngine["getActiveSessions"] = () => {
    const sessions = this.signClient.session.getAll();
    return sessions.reduce((sessions: Record<string, SessionTypes.Struct>, session) => {
      sessions[session.topic] = session;
      return sessions;
    }, {});
  };

  public getPendingSessionProposals: IWalletKitEngine["getPendingSessionProposals"] = () => {
    return this.signClient.proposal.getAll();
  };

  public getPendingSessionRequests: IWalletKitEngine["getPendingSessionRequests"] = () => {
    return this.signClient.getPendingSessionRequests();
  };

  // Multi chain Auth //
  public approveSessionAuthenticate: IWalletKitEngine["approveSessionAuthenticate"] = async (
    params,
  ) => {
    return await this.signClient.approveSessionAuthenticate(params);
  };

  public rejectSessionAuthenticate: IWalletKitEngine["rejectSessionAuthenticate"] = async (
    params,
  ) => {
    return await this.signClient.rejectSessionAuthenticate(params);
  };

  public formatAuthMessage: IWalletKitEngine["formatAuthMessage"] = (params) => {
    return this.signClient.formatAuthMessage(params);
  };

  // Push //
  public registerDeviceToken: IWalletKitEngine["registerDeviceToken"] = (params) => {
    return this.client.core.echoClient.registerDeviceToken(params);
  };

  // ---------- public events ----------------------------------------------- //
  public on: IWalletKitEngine["on"] = (name, listener) => {
    this.setEvent(name, "off");
    this.setEvent(name, "on");
    return this.client.events.on(name, listener);
  };

  public once: IWalletKitEngine["once"] = (name, listener) => {
    this.setEvent(name, "off");
    this.setEvent(name, "once");
    return this.client.events.once(name, listener);
  };

  public off: IWalletKitEngine["off"] = (name, listener) => {
    this.setEvent(name, "off");
    return this.client.events.off(name, listener);
  };

  public removeListener: IWalletKitEngine["removeListener"] = (name, listener) => {
    this.setEvent(name, "removeListener");
    return this.client.events.removeListener(name, listener);
  };

  // ---------- Private ----------------------------------------------- //

  private onSessionRequest = (event: WalletKitTypes.SessionRequest) => {
    this.client.events.emit("session_request", event);
  };

  private onSessionProposal = (event: WalletKitTypes.SessionProposal) => {
    this.client.events.emit("session_proposal", event);
  };

  private onSessionDelete = (event: WalletKitTypes.SessionDelete) => {
    this.client.events.emit("session_delete", event);
  };

  private onProposalExpire = (event: WalletKitTypes.ProposalExpire) => {
    this.client.events.emit("proposal_expire", event);
  };

  private onSessionRequestExpire = (event: WalletKitTypes.SessionRequestExpire) => {
    this.client.events.emit("session_request_expire", event);
  };

  private onSessionRequestAuthenticate = (event: WalletKitTypes.SessionAuthenticate) => {
    this.client.events.emit("session_authenticate", event);
  };

  private setEvent = (
    event: WalletKitTypes.Event,
    action: "on" | "off" | "once" | "removeListener",
  ) => {
    switch (event) {
      case "session_request":
        this.signClient.events[action]("session_request", this.onSessionRequest);
        break;
      case "session_proposal":
        this.signClient.events[action]("session_proposal", this.onSessionProposal);
        break;
      case "session_delete":
        this.signClient.events[action]("session_delete", this.onSessionDelete);
        break;
      case "proposal_expire":
        this.signClient.events[action]("proposal_expire", this.onProposalExpire);
        break;
      case "session_request_expire":
        this.signClient.events[action]("session_request_expire", this.onSessionRequestExpire);
        break;
      case "session_authenticate":
        this.signClient.events[action]("session_authenticate", this.onSessionRequestAuthenticate);
        break;
    }
  };
}
