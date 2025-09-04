import { TEST_METADATA } from "./shared/values";
import { Core, RELAYER_EVENTS } from "@walletconnect/core";
import {
  JsonRpcPayload,
  formatJsonRpcResult,
  isJsonRpcRequest,
} from "@walletconnect/jsonrpc-utils";
import { SignClient, ENGINE_RPC_OPTS } from "@walletconnect/sign-client";
import { CoreTypes, ICore, ISignClient, SessionTypes } from "@walletconnect/types";
import {
  buildApprovedNamespaces,
  buildAuthObject,
  getSdkError,
  parseUri,
} from "@walletconnect/utils";
import { toMiliseconds } from "@walletconnect/time";
import { Wallet as CryptoWallet } from "@ethersproject/wallet";

import { expect, describe, it, beforeEach, vi, beforeAll, afterEach, fn } from "vitest";
import { POSClient, IPOSClient, POSClientTypes } from "../src";
import {
  disconnect,
  TEST_CORE_OPTIONS,
  TEST_ETHEREUM_CHAIN,
  TEST_NAMESPACES,
  TEST_REQUIRED_NAMESPACES,
  TEST_UPDATED_NAMESPACES,
} from "./shared";
import WalletKit, { IWalletKit } from "@reown/walletkit";

describe("Sign Integration", () => {
  let wallet: IWalletKit;
  let pos: IPOSClient;
  let cryptoWallet: CryptoWallet;

  const projectId = TEST_CORE_OPTIONS.projectId;
  const deviceId = "test device id";
  const merchantName = "test merchant name";
  const url = "example.com";
  const description = "test description";
  const logoIcon = "https://example.com/logo.png";

  beforeAll(async () => {
    cryptoWallet = CryptoWallet.createRandom();

    pos = await POSClient.init({
      projectId,
      deviceId,
      metadata: {
        merchantName,
        url,
        description,
        logoIcon,
      },
    });
    wallet = await WalletKit.init({
      core: new Core(TEST_CORE_OPTIONS),
      name: "wallet",
      metadata: TEST_METADATA,
    });
  });

  it("should initialize a POS client", async () => {
    expect(pos).to.be.exist;
    expect(pos.engine.signClient).to.be.exist;
    expect(pos.engine.signClient.core).to.be.exist;
    expect(pos.engine.signClient.core.projectId).to.be.equal(projectId);
    expect(pos.metadata.merchantName).to.be.equal(merchantName);
    expect(pos.metadata.url).to.be.equal(url);
    expect(pos.metadata.description).to.be.equal(description);
    expect(pos.metadata.logoIcon).to.be.equal(logoIcon);
  });

  it("should set tokens", async () => {
    const networks: Record<string, POSClientTypes.Network> = {
      ethereum: { name: "Ethereum", chainId: "eip155:1" },
      arbitrum: { name: "Arbitrum", chainId: "eip155:42161" },
      avalanche: { name: "Avalanche", chainId: "eip155:43114" },
    };
    const tokens: POSClientTypes.Token[] = [
      {
        network: networks.ethereum,
        symbol: "ETH",
        standard: "ERC20",
        address: cryptoWallet.address,
      },
      {
        network: networks.arbitrum,
        symbol: "ARB",
        standard: "ERC20",
        address: cryptoWallet.address,
      },
      {
        network: networks.avalanche,
        symbol: "AVAX",
        standard: "ERC20",
        address: cryptoWallet.address,
      },
    ];
    await pos.setTokens({ tokens });

    expect(pos.engine.tokens).to.be.exist;
    expect(pos.engine.tokens.length).to.be.equal(Object.keys(tokens).length);
    expect(pos.engine.tokens).to.deep.equal(tokens);
    expect(pos.engine.tokens[0]).to.deep.equal(tokens[0]);
    expect(pos.engine.tokens[1]).to.deep.equal(tokens[1]);
    expect(pos.engine.tokens[2]).to.deep.equal(tokens[2]);
  });

  it("should reject tokens with invalid chainId", async () => {
    const networks: Record<string, POSClientTypes.Network> = {
      ethereum: { name: "Ethereum", chainId: "eip155" },
      arbitrum: { name: "Arbitrum", chainId: "42161" },
      avalanche: { name: "Avalanche", chainId: "43114" },
    };
    const tokens: POSClientTypes.Token[] = [
      {
        network: networks.ethereum,
        symbol: "ETH",
        standard: "ERC20",
        address: cryptoWallet.address,
      },
      {
        network: networks.arbitrum,
        symbol: "ARB",
        standard: "ERC20",
        address: cryptoWallet.address,
      },
      {
        network: networks.avalanche,
        symbol: "AVAX",
        standard: "ERC20",
        address: cryptoWallet.address,
      },
    ];
    await expect(pos.setTokens({ tokens })).rejects.toThrow();
  });

  it("should reject tokens with unsupported namespace", async () => {
    const network: POSClientTypes.Network = { name: "something", chainId: "something" };
    const token: POSClientTypes.Token = {
      network,
      symbol: "SOL",
      standard: "SOL",
      address: cryptoWallet.address,
    };
    await expect(pos.setTokens({ tokens: [token] })).rejects.toThrow();
  });

  it("should create a payment intent", async () => {
    const network: POSClientTypes.Network = { name: "Ethereum", chainId: "eip155:1" };
    const token: POSClientTypes.Token = {
      network,
      symbol: "ETH",
      standard: "ERC20",
      address: cryptoWallet.address,
    };

    const paymentIntents: POSClientTypes.PaymentIntent[] = [
      {
        token,
        amount: "1",
        recipient: cryptoWallet.address,
      },
    ];

    await Promise.all([
      new Promise<void>((resolve) => {
        pos.once("qr_ready", ({ uri }) => {
          // validate the uri
          parseUri(uri);
          resolve();
        });
      }),
      pos.createPaymentIntent({ paymentIntents }),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it("should reject payment intents with invalid amount", async () => {
    const network: POSClientTypes.Network = { name: "Ethereum", chainId: "eip155" };
    const token: POSClientTypes.Token = {
      network,
      symbol: "ETH",
      standard: "ERC20",
      address: cryptoWallet.address,
    };

    const paymentIntents: POSClientTypes.PaymentIntent[] = [
      {
        token,
        amount: "",
        recipient: cryptoWallet.address,
      },
    ];
    await expect(pos.createPaymentIntent({ paymentIntents })).rejects.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it("should establish a session, prepare transaction, send to wallet, receive response and await confirmation", async () => {
    const tokenChainId = "eip155:8453";

    const paymentIntents: POSClientTypes.PaymentIntent[] = [
      {
        token: {
          network: { name: "Ethereum", chainId: tokenChainId },
          symbol: "USDC",
          standard: "ERC20",
          address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`,
        },
        amount: "1",
        recipient: `${tokenChainId}:0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52`,
      },
    ];

    await Promise.all([
      new Promise<void>((resolve) => {
        pos.once("payment_successful", () => {
          console.log("payment_successful");
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        pos.once("payment_requested", () => {
          console.log("payment_requested");
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        pos.once("payment_broadcasted", ({ result }) => {
          console.log("payment_broadcasted", JSON.stringify(result, null, 2));
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        wallet.once("session_request", async (sessionRequest) => {
          console.log("session_request", JSON.stringify(sessionRequest, null, 2));
          await wallet.respondSessionRequest({
            topic: sessionRequest.topic,
            response: formatJsonRpcResult(
              sessionRequest.id,
              "0xff16b7197277088039a45f9e23ccbb32077ebeec1e56e49b24b2f3731e1bd452",
            ),
          });
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        wallet.once("session_proposal", async (sessionProposal) => {
          console.log("session_proposal", JSON.stringify(sessionProposal, null, 2));
          await wallet.approveSession({
            id: sessionProposal.id,
            namespaces: {
              eip155: {
                ...sessionProposal.params.optionalNamespaces.eip155,
                accounts: [`${tokenChainId}:0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52`],
              },
            },
          });
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        pos.once("connected", () => {
          console.log("connected");
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        pos.once("qr_ready", async ({ uri }) => {
          console.log("qr_ready", uri);
          await wallet.pair({ uri });
          resolve();
        });
      }),
      pos.createPaymentIntent({ paymentIntents }),
    ]);
  });
});
