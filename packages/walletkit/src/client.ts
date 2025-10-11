import EventEmitter from "events";
import { CLIENT_CONTEXT } from "./constants/index.js";
import { Engine } from "./controllers/index.js";
import { IWalletKit, WalletKitTypes } from "./types/index.js";
import { Notifications } from "./utils/index.js";

export class WalletKit extends IWalletKit {
  public name: IWalletKit["name"];
  public core: IWalletKit["core"];
  public logger: IWalletKit["logger"];
  public events: IWalletKit["events"] = new EventEmitter();
  public engine: IWalletKit["engine"];
  public metadata: IWalletKit["metadata"];
  public static notifications: WalletKitTypes.INotifications = Notifications;
  public signConfig: IWalletKit["signConfig"];

  static async init(opts: WalletKitTypes.Options) {
    const client = new WalletKit(opts);
    await client.initialize();

    return client;
  }

  constructor(opts: WalletKitTypes.Options) {
    super(opts);
    this.metadata = opts.metadata;
    this.name = opts.name || CLIENT_CONTEXT;
    this.signConfig = opts.signConfig;
    this.core = opts.core;
    this.logger = this.core.logger;
    this.engine = new Engine(this);
  }

  // ---------- Events ----------------------------------------------- //

  public on: IWalletKit["on"] = (name, listener) => {
    return this.engine.on(name, listener);
  };

  public once: IWalletKit["once"] = (name, listener) => {
    return this.engine.once(name, listener);
  };

  public off: IWalletKit["off"] = (name, listener) => {
    return this.engine.off(name, listener);
  };

  public removeListener: IWalletKit["removeListener"] = (name, listener) => {
    return this.engine.removeListener(name, listener);
  };

  // ---------- Engine ----------------------------------------------- //

  public pair: IWalletKit["pair"] = async (params) => {
    try {
      return await this.engine.pair(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public approveSession: IWalletKit["approveSession"] = async (params) => {
    try {
      return await this.engine.approveSession(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public rejectSession: IWalletKit["rejectSession"] = async (params) => {
    try {
      return await this.engine.rejectSession(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public updateSession: IWalletKit["updateSession"] = async (params) => {
    try {
      return await this.engine.updateSession(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public extendSession: IWalletKit["extendSession"] = async (params) => {
    try {
      return await this.engine.extendSession(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public respondSessionRequest: IWalletKit["respondSessionRequest"] = async (params) => {
    try {
      return await this.engine.respondSessionRequest(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public disconnectSession: IWalletKit["disconnectSession"] = async (params) => {
    try {
      return await this.engine.disconnectSession(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public emitSessionEvent: IWalletKit["emitSessionEvent"] = async (params) => {
    try {
      return await this.engine.emitSessionEvent(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public getActiveSessions: IWalletKit["getActiveSessions"] = () => {
    try {
      return this.engine.getActiveSessions();
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public getPendingSessionProposals: IWalletKit["getPendingSessionProposals"] = () => {
    try {
      return this.engine.getPendingSessionProposals();
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public getPendingSessionRequests: IWalletKit["getPendingSessionRequests"] = () => {
    try {
      return this.engine.getPendingSessionRequests();
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public registerDeviceToken: IWalletKit["registerDeviceToken"] = (params) => {
    try {
      return this.engine.registerDeviceToken(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public approveSessionAuthenticate: IWalletKit["approveSessionAuthenticate"] = (params) => {
    try {
      return this.engine.approveSessionAuthenticate(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public rejectSessionAuthenticate: IWalletKit["rejectSessionAuthenticate"] = (params) => {
    try {
      return this.engine.rejectSessionAuthenticate(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public formatAuthMessage: IWalletKit["formatAuthMessage"] = (params) => {
    try {
      return this.engine.formatAuthMessage(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  // ---------- Private ----------------------------------------------- //

  private async initialize() {
    this.logger.trace(`Initialized`);
    try {
      await this.engine.init();
      this.logger.info(`WalletKit Initialization Success`);
    } catch (error: any) {
      this.logger.info(`WalletKit Initialization Failure`);
      this.logger.error(error.message);
      throw error;
    }
  }
}
