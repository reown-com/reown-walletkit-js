import { TEST_METADATA } from "./shared/values";
import { Core } from "@walletconnect/core";
import { SignClient } from "@walletconnect/sign-client";
import { ICore, ISignClient, SessionTypes } from "@walletconnect/types";
import { Wallet as CryptoWallet } from "@ethersproject/wallet";

import { expect, describe, it, beforeEach, vi, beforeAll, afterEach } from "vitest";
import { WalletKit, IWalletKit, CAN_FULFIL_STATUS } from "../src";
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

  it("should get not_required", async () => {
    const result = await wallet.prepareFulfilment({
      transaction: {
        to: "0x1cBd3fE73bC46a896e3eDd39E54c482798bB3D58",
        from: "0x1cBd3fE73bC46a896e3eDd39E54c482798bB3D58",
        data: "0x",
        value: "0x",
        chainId: "eip155:1",
      },
    });
    expect(result).to.be.exist;
    expect(result.status).to.be.eq(CAN_FULFIL_STATUS.not_required);
  });

  it("should get routes", async () => {
    const result = await wallet.prepareFulfilment({
      transaction: {
        chainId: "eip155:42161",
        data: "0xa9059cbb00000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c5200000000000000000000000000000000000000000000000000000000003d0900",
        from: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
        to: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        value: "0x0",
      },
    });
    expect(result).to.be.exist;
    expect(result.status).to.be.eq(CAN_FULFIL_STATUS.available);
    if (result.status === CAN_FULFIL_STATUS.available) {
      expect(result.data).to.be.exist;
      expect(result.data.fulfilmentId).to.be.exist;
      expect(result.data.funding).to.be.exist;
      expect(result.data.transactions).to.be.exist;
      expect(result.data.initialTransactionMetadata).to.be.exist;
    }
  });

  it("should get routes details", async () => {
    const initialTx = {
      chainId: "eip155:42161",
      data: "0xa9059cbb00000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c5200000000000000000000000000000000000000000000000000000000003d0900",
      from: "0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52",
      to: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      value: "0x0",
    };
    const prepareResult = await wallet.prepareFulfilment({
      transaction: initialTx,
    });

    const result = await wallet.getFulfilmentDetails({
      fulfilmentId: prepareResult.status === "available" ? prepareResult.data.fulfilmentId : "",
    });

    expect(result.bridgeDetails).to.be.exist;
    expect(result.initialTransactionDetails).to.be.exist;
    expect(result.routeDetails).to.be.exist;
    expect(result.totalFee).to.be.exist;
    expect(result.initialTransactionDetails.transaction.chainId).to.be.eq(initialTx.chainId);
    expect(result.initialTransactionDetails.transaction.input).to.be.eq(initialTx.data);
    expect(result.initialTransactionDetails.transaction.from.toLowerCase()).to.be.eq(
      initialTx.from.toLowerCase(),
    );
    expect(result.initialTransactionDetails.transaction.to.toLowerCase()).to.be.eq(
      initialTx.to.toLowerCase(),
    );
    expect(result.initialTransactionDetails.transaction.value).to.be.eq(initialTx.value);
  });
});
