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
import { WalletKit, IWalletKit } from "../src";
import {
  disconnect,
  TEST_CORE_OPTIONS,
  TEST_ETHEREUM_CHAIN,
  TEST_NAMESPACES,
  TEST_REQUIRED_NAMESPACES,
  TEST_UPDATED_NAMESPACES,
} from "./shared";

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
    await wallet
      .canFulfil({
        transaction: { to: "0x1234", from: "12", value: "12", chainId: "1" },
      })
      .catch((error) => {
        expect(error).to.be.exist;
        expect(error.message).to.be.eq(`canFulfilHandler not found for environment: 'node'`);
      });
  });
  it("should reject fulfilmentStatus in node", async () => {
    await wallet
      .fulfilmentStatus({
        fulfilmentId: "1234",
      })
      .catch((error) => {
        expect(error).to.be.exist;
        expect(error.message).to.be.eq(`fulfilmentStatusHandler not found for environment: 'node'`);
      });
  });
});
