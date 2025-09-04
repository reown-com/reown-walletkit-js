import EventEmitter from "events";
import { CLIENT_CONTEXT } from "./constants";
import { Engine } from "./controllers";
import { IPOSClient, POSClientTypes } from "./types";

export class POSClient extends IPOSClient {
  public name: IPOSClient["name"];
  public events: IPOSClient["events"] = new EventEmitter();
  public engine: IPOSClient["engine"];
  public metadata: IPOSClient["metadata"];

  static async init(opts: POSClientTypes.Options) {
    const client = new POSClient(opts);
    await client.initialize();

    return client;
  }

  constructor(opts: POSClientTypes.Options) {
    super(opts);
    this.metadata = opts.metadata;
    this.name = CLIENT_CONTEXT;
    this.engine = new Engine(this);
  }

  // ---------- Events ----------------------------------------------- //

  public on: IPOSClient["on"] = (name, listener) => {
    return this.engine.on(name, listener);
  };

  public once: IPOSClient["once"] = (name, listener) => {
    return this.engine.once(name, listener);
  };

  public off: IPOSClient["off"] = (name, listener) => {
    return this.engine.off(name, listener);
  };

  public removeListener: IPOSClient["removeListener"] = (name, listener) => {
    return this.engine.removeListener(name, listener);
  };

  // ---------- Engine ----------------------------------------------- //

  public setTokens: IPOSClient["setTokens"] = async (params) => {
    try {
      return await this.engine.setTokens(params);
    } catch (error: any) {
      this.engine.signClient.logger.error(error.message);
      throw error;
    }
  };

  public createPaymentIntent: IPOSClient["createPaymentIntent"] = async (params) => {
    try {
      return await this.engine.createPaymentIntent(params);
    } catch (error: any) {
      this.engine.signClient.logger.error(error.message);
      throw error;
    }
  };

  public restart: IPOSClient["restart"] = async (params) => {
    try {
      return await this.engine.restart(params);
    } catch (error: any) {
      this.engine.signClient.logger.error(error.message);
      throw error;
    }
  };

  // ---------- Private ----------------------------------------------- //

  private async initialize() {
    try {
      await this.engine.init();
      this.engine.signClient.logger.info(`POSClient Initialization Success`);
    } catch (error: any) {
      this.engine.signClient.logger.info(`POSClient Initialization Failure`);
      this.engine.signClient.logger.error(error.message);
      throw error;
    }
  }
}
