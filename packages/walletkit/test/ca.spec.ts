import { TEST_METADATA } from "./shared/values";
import { Core } from "@walletconnect/core";
import { SignClient } from "@walletconnect/sign-client";
import { ICore, ISignClient, SessionTypes } from "@walletconnect/types";
import { Wallet as CryptoWallet } from "@ethersproject/wallet";

import { expect, describe, it, beforeEach, vi, beforeAll, afterEach } from "vitest";
import { WalletKit, IWalletKit, CAN_FULFIL_STATUS, ChainAbstractionTypes } from "../src";
import { disconnect, TEST_CORE_OPTIONS, TEST_REQUIRED_NAMESPACES } from "./shared";

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

  it("should get routes detailed", async () => {
    const testTxData: ChainAbstractionTypes.Transaction = {
      chainId: "eip155:10",
      from: "0x13a2ff792037aa2cd77fe1f4b522921ac59a9c52",
      to: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
      value: "0x",
      input:
        "0xa9059cbb00000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c5200000000000000000000000000000000000000000000000000000000003d0900",
      gasLimit: "0x3b8ec",
      nonce: "0x62",
    };
    const result = await wallet.chainAbstraction.prepareDetailed({
      transaction: testTxData,
    });
    console.log("prepare detailed", JSON.stringify(result, null, 2));
    // if ("orchestrationId" in result) {
    //   console.log("orchestrationId", result.orchestrationId);
    //   const details = await wallet.chainAbstraction.getPrepareDetails({
    //     orchestrationId: result.orchestrationId,
    //   });
    //   console.log(JSON.stringify(details, null, 2));
    // }
    expect(result).to.be.exist;

    if ("error" in result) {
      throw new Error(result.error.error);
    }

    expect(result.success).to.be.exist;

    if ("notRequired" in result.success) {
      throw new Error("notRequired result not expected");
    }

    expect(result.success.available).to.be.exist;
    expect(result.success.available.bridge).to.be.exist;
    expect(result.success.available.initial).to.be.exist;
    expect(result.success.available.localBridgeTotal).to.be.exist;
    expect(result.success.available.localRouteTotal).to.be.exist;
    expect(result.success.available.localTotal).to.be.exist;
    expect(result.success.available.route).to.be.exist;
    expect(result.success.available.routeResponse).to.be.exist;
    expect(result.success.available.routeResponse.orchestrationId).to.be.exist;
    const initialTransaction = result.success.available.routeResponse.initialTransaction;
    expect(initialTransaction).to.be.exist;
    expect(initialTransaction.chainId).to.be.eq(testTxData.chainId);
    expect(initialTransaction.input).to.be.eq(testTxData.input);
    expect(initialTransaction.from.toLowerCase()).to.be.eq(testTxData.from.toLowerCase());
    expect(initialTransaction.to.toLowerCase()).to.be.eq(testTxData.to.toLowerCase());
  });

  it("should get not required", async () => {
    const result = await wallet.chainAbstraction.prepareDetailed({
      transaction: {
        to: "0x1cBd3fE73bC46a896e3eDd39E54c482798bB3D58",
        from: "0x1cBd3fE73bC46a896e3eDd39E54c482798bB3D58",
        input: "0x",
        value: "0x",
        chainId: "eip155:1",
        gasLimit: "0x3b8ec",
        nonce: "0x62",
      },
    });

    if ("error" in result) {
      throw new Error(result.error.error);
    }

    const success = result.success;

    if ("available" in success) {
      throw new Error("available result not expected");
    }

    expect(success.notRequired).to.be.exist;
  });
});
