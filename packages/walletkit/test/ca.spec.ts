import { TEST_METADATA } from "./shared/values";
import { Core, RELAYER_EVENTS } from "@walletconnect/core";
import {
  JsonRpcPayload,
  formatJsonRpcResult,
  isJsonRpcRequest,
} from "@walletconnect/jsonrpc-utils";
import { SignClient, ENGINE_RPC_OPTS } from "@walletconnect/sign-client";
import { CoreTypes, ICore, ISignClient, SessionTypes } from "@walletconnect/types";
import { buildApprovedNamespaces, buildAuthObject, getSdkError } from "@walletconnect/utils";
import { toMiliseconds } from "@walletconnect/time";
import { Wallet as CryptoWallet } from "@ethersproject/wallet";

import { expect, describe, it, beforeEach, vi, beforeAll, afterEach } from "vitest";
import {
  WalletKit,
  IWalletKit,
  ChainAbstractionTypes,
  FULFILMENT_STATUS,
  CAN_FULFIL_STATUS,
} from "../src";
import {
  disconnect,
  TEST_CORE_OPTIONS,
  TEST_ETHEREUM_CHAIN,
  TEST_NAMESPACES,
  TEST_REQUIRED_NAMESPACES,
  TEST_UPDATED_NAMESPACES,
} from "./shared";

let routeResponse = {
  status: CAN_FULFIL_STATUS.available,
  data: {
    routes: {
      transactions: [
        {
          to: "0x1cBd3fE73bC46a896e3eDd39E54c482798bB3D58",
          from: "0x1cBd3fE73bC46a896e3eDd39E54c482798bB3D58",
          value: "0x",
          chainId: "eip155:1",
        },
      ],
      metadata: {
        fundingFrom: [
          {
            tokenContract: "0x1cBd3fE73bC46a896e3eDd39E54c482798bB3D58",
            amount: "0x",
            chainId: "eip155:1",
            symbol: "ETH",
          },
        ],
      },
      orchestratorId: "1234",
      checkIn: 3000,
    },
    routesDetails: {
      localTotal: {},
    },
  },
};

let statusResponse = {
  status: FULFILMENT_STATUS.pending,
  createdAt: new Date().getTime(),
  checkIn: 300,
};

const setRouteResponse = (response: any) => {
  routeResponse = response;
};

const setStatusResponse = (response: any) => {
  statusResponse = response;
};

global.yttrium = {
  checkStatus: (params) => {
    console.log("status", params);
    return Promise.resolve(statusResponse);
  },
  checkRoute: (params) => {
    console.log("route", params);
    return Promise.resolve(routeResponse);
  },
};

describe("Chain Abstraction", () => {
  let core: ICore;
  let wallet: IWalletKit;
  let dapp: ISignClient;
  let uriString: string;
  let sessionApproval: () => Promise<any>;
  let session: SessionTypes.Struct;
  let cryptoWallet: CryptoWallet;

  beforeAll(() => {
    cryptoWallet = CryptoWallet.createRandom();
  });

  afterEach(async () => {
    await disconnect(wallet.core);
    await disconnect(dapp.core);
  });

  beforeEach(async () => {
    core = new Core(TEST_CORE_OPTIONS);
    dapp = await SignClient.init({ ...TEST_CORE_OPTIONS, name: "Dapp", metadata: TEST_METADATA });
    const { uri, approval } = await dapp.connect({
      requiredNamespaces: TEST_REQUIRED_NAMESPACES,
    });
    uriString = uri || "";
    sessionApproval = approval;
    const signConfig = { disableRequestQueue: true };
    wallet = await WalletKit.init({
      core,
      name: "wallet",
      metadata: TEST_METADATA,
      signConfig,
    });
    expect(wallet).to.be.exist;
    expect(dapp).to.be.exist;
    expect(core).to.be.exist;
    expect(wallet.metadata.redirect).to.not.exist;
    expect(dapp.metadata.redirect).to.not.exist;
    expect(wallet.engine.signClient.signConfig).to.toMatchObject(signConfig);
  });

  it("should reject canFulfil in node", async () => {
    await wallet.canFulfil({
      transaction: {
        to: "0x1cBd3fE73bC46a896e3eDd39E54c482798bB3D58",
        from: "0x1cBd3fE73bC46a896e3eDd39E54c482798bB3D58",
        value: "0x",
        chainId: "eip155:1",
      },
    });
  });
  it("should get fulfilmentStatus", async () => {
    const result = await wallet.fulfilmentStatus({
      fulfilmentId: "1234",
    });

    expect(result).to.be.exist;
    expect(result.status).to.be.eq(FULFILMENT_STATUS.pending);
    expect(result.createdAt).to.be.exist;
    if (result.status === FULFILMENT_STATUS.pending) {
      expect(result.checkIn).to.be.a("number");
    }
  });
});
