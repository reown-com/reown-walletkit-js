import { TEST_METADATA } from "./shared/values";
import { Core, RELAYER_EVENTS } from "@walletconnect/core";
import {
  JsonRpcPayload,
  formatJsonRpcResult,
  isJsonRpcRequest,
} from "@walletconnect/jsonrpc-utils";
import { SignClient, ENGINE_RPC_OPTS } from "@walletconnect/sign-client";
import { AuthTypes, CoreTypes, ICore, ISignClient, SessionTypes } from "@walletconnect/types";
import { buildApprovedNamespaces, buildAuthObject, getSdkError } from "@walletconnect/utils";
import { toMiliseconds } from "@walletconnect/time";
import { Wallet as CryptoWallet } from "@ethersproject/wallet";

import { expect, describe, it, beforeEach, vi, beforeAll, afterEach } from "vitest";
import { WalletKit, IWalletKit, WalletKitTypes } from "../src";
import {
  disconnect,
  TEST_CORE_OPTIONS,
  TEST_ETHEREUM_CHAIN,
  TEST_NAMESPACES,
  TEST_REQUIRED_NAMESPACES,
  TEST_UPDATED_NAMESPACES,
} from "./shared";

describe("Sign Integration", () => {
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
    core = new Core({
      ...TEST_CORE_OPTIONS,
      customStoragePrefix: Math.random().toString(36).substring(2, 15),
    });
    dapp = await SignClient.init({
      ...TEST_CORE_OPTIONS,
      name: "Dapp",
      metadata: TEST_METADATA,
      customStoragePrefix: Math.random().toString(36).substring(2, 15),
    });
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

  it("should approve session proposal", async () => {
    const sessionConfig = { disableDeepLink: false };
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params, verifyContext } = sessionProposal;
          expect(verifyContext.verified.validation).to.eq("UNKNOWN");
          expect(verifyContext.verified.isScam).to.eq(undefined);
          session = await wallet.approveSession({
            id,
            namespaces: TEST_NAMESPACES,
            sessionConfig,
          });
          expect(params.optionalNamespaces).to.toMatchObject(TEST_REQUIRED_NAMESPACES);
          resolve(session);
        });
      }),
      new Promise(async (resolve) => {
        resolve(await sessionApproval());
      }),
      wallet.pair({ uri: uriString }),
    ]);
    expect(session).to.be.exist;
    expect(session.topic).to.be.exist;
    expect(session.sessionConfig).to.eql(sessionConfig);
  });
  it("should reject session proposal", async () => {
    const rejectionError = getSdkError("USER_REJECTED");
    await Promise.all([
      new Promise<void>((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { params } = sessionProposal;
          expect(params.optionalNamespaces).to.toMatchObject(TEST_REQUIRED_NAMESPACES);
          await wallet.rejectSession({
            id: params.id,
            reason: rejectionError,
          });
          resolve();
        });
      }),
      new Promise<void>(async (resolve) => {
        // catch the rejection and compare
        try {
          await sessionApproval();
        } catch (err) {
          expect(err).to.toMatchObject(rejectionError);
        }
        resolve();
      }),
      wallet.pair({ uri: uriString }),
    ]);
  });
  it("should update session", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params, verifyContext } = sessionProposal;
          expect(verifyContext.verified.validation).to.eq("UNKNOWN");
          session = await wallet.approveSession({
            id,
            namespaces: TEST_NAMESPACES,
          });
          expect(params.optionalNamespaces).to.toMatchObject(TEST_REQUIRED_NAMESPACES);
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);

    expect(TEST_NAMESPACES).not.toMatchObject(TEST_UPDATED_NAMESPACES);
    // update the session
    await Promise.all([
      new Promise((resolve) => {
        dapp.events.on("session_update", (session) => {
          const { params } = session;
          expect(params.namespaces).to.toMatchObject(TEST_UPDATED_NAMESPACES);
          resolve(session);
        });
      }),
      wallet.updateSession({ topic: session.topic, namespaces: TEST_UPDATED_NAMESPACES }),
    ]);
  });

  it("should update session while peer is offline", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params, verifyContext } = sessionProposal;
          expect(verifyContext.verified.validation).to.eq("UNKNOWN");
          session = await wallet.approveSession({
            id,
            namespaces: TEST_NAMESPACES,
          });
          expect(params.optionalNamespaces).to.toMatchObject(TEST_REQUIRED_NAMESPACES);
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);
    expect(TEST_NAMESPACES).not.toMatchObject(TEST_UPDATED_NAMESPACES);
    // close the transport to simulate peer being offline
    await dapp.core.relayer.transportClose();
    const updatedChain = "eip155:55";
    const updatedAddress = `${updatedChain}:${cryptoWallet.address}`;

    await new Promise((resolve) => setTimeout(resolve, 1000));
    // update the session
    await new Promise<void>(async (resolve) => {
      await wallet.updateSession({
        topic: session.topic,
        namespaces: {
          eip155: {
            ...TEST_UPDATED_NAMESPACES.eip155,
            accounts: [...TEST_UPDATED_NAMESPACES.eip155.accounts, updatedAddress],
          },
        },
      });
      await wallet.emitSessionEvent({
        topic: session.topic,
        event: {
          name: "chainChanged",
          data: updatedChain,
        },
        chainId: updatedChain,
      });
      await wallet.emitSessionEvent({
        topic: session.topic,
        event: {
          name: "accountsChanged",
          data: [updatedAddress],
        },
        chainId: updatedChain,
      });
      resolve();
    });
    await Promise.all([
      new Promise((resolve) => {
        dapp.events.on("session_update", (session) => {
          resolve(session);
        });
      }),
      new Promise((resolve) => {
        dapp.events.on("session_event", (event) => {
          const { params } = event;
          if (params.event.name === "chainChanged") {
            expect(params.event.data).to.equal(updatedChain);
            resolve(event);
          }
        });
      }),
      new Promise((resolve) => {
        dapp.events.on("session_event", (event) => {
          const { params } = event;
          if (params.event.name === "accountsChanged") {
            console;
            expect(params.event.data[0]).to.equal(updatedAddress);
            resolve(event);
          }
        });
      }),
      dapp.core.relayer.transportOpen(),
    ]);
  });

  it("should extend session", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            namespaces: TEST_NAMESPACES,
          });
          expect(params.optionalNamespaces).to.toMatchObject(TEST_REQUIRED_NAMESPACES);
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);

    const prevExpiry = session.expiry;
    const topic = session.topic;
    vi.useFakeTimers();
    // Fast-forward system time by 60 seconds after expiry was first set.
    vi.setSystemTime(Date.now() + 60_000);
    await wallet.extendSession({ topic });
    const updatedExpiry = wallet.engine.signClient.session.get(topic).expiry;
    expect(updatedExpiry).to.be.greaterThan(prevExpiry);
    vi.useRealTimers();
  });

  it("should respond to session request", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            namespaces: {
              eip155: {
                ...TEST_NAMESPACES.eip155,
                accounts: [`${TEST_ETHEREUM_CHAIN}:${cryptoWallet.address}`],
              },
            },
          });
          expect(params.optionalNamespaces).to.toMatchObject(TEST_REQUIRED_NAMESPACES);
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);

    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_request", async (sessionRequest) => {
          const { id, params, verifyContext } = sessionRequest;
          expect(verifyContext.verified.validation).to.eq("UNKNOWN");
          const signTransaction = params.request.params[0];
          const signature = await cryptoWallet.signTransaction(signTransaction);
          const response = await wallet.respondSessionRequest({
            topic: session.topic,
            response: formatJsonRpcResult(id, signature),
          });
          resolve(response);
        });
      }),
      new Promise<void>(async (resolve) => {
        const result = await dapp.request({
          topic: session.topic,
          request: {
            method: "eth_signTransaction",
            params: [
              {
                from: cryptoWallet.address,
                to: cryptoWallet.address,
                data: "0x",
                nonce: "0x01",
                gasPrice: "0x020a7ac094",
                gasLimit: "0x5208",
                value: "0x00",
              },
            ],
          },
          chainId: TEST_ETHEREUM_CHAIN,
        });
        expect(result).to.be.exist;
        expect(result).to.be.a("string");
        resolve();
      }),
    ]);
  });

  it("should disconnect from session", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            namespaces: {
              eip155: {
                ...TEST_NAMESPACES.eip155,
                accounts: [`${TEST_ETHEREUM_CHAIN}:${cryptoWallet.address}`],
              },
            },
          });
          expect(params.optionalNamespaces).to.toMatchObject(TEST_REQUIRED_NAMESPACES);
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);

    const reason = getSdkError("USER_DISCONNECTED");
    await Promise.all([
      new Promise<void>((resolve) => {
        dapp.events.on("session_delete", (sessionDelete) => {
          const { topic } = sessionDelete;
          expect(topic).to.be.eq(session.topic);
          resolve();
        });
      }),
      wallet.disconnectSession({ topic: session.topic, reason }),
    ]);
  });

  it("should receive session_disconnect", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            namespaces: {
              eip155: {
                ...TEST_NAMESPACES.eip155,
                accounts: [`${TEST_ETHEREUM_CHAIN}:${cryptoWallet.address}`],
              },
            },
          });
          expect(params.optionalNamespaces).to.toMatchObject(TEST_REQUIRED_NAMESPACES);
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);

    const reason = getSdkError("USER_DISCONNECTED");
    await Promise.all([
      new Promise<void>((resolve) => {
        wallet.on("session_delete", (sessionDelete) => {
          const { topic } = sessionDelete;
          expect(topic).to.be.eq(session.topic);
          resolve();
        });
      }),
      dapp.disconnect({ topic: session.topic, reason }),
    ]);
  });

  it("should emit session event", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            namespaces: {
              eip155: {
                ...TEST_NAMESPACES.eip155,
                accounts: [`${TEST_ETHEREUM_CHAIN}:${cryptoWallet.address}`],
              },
            },
          });
          expect(params.optionalNamespaces).to.toMatchObject(TEST_REQUIRED_NAMESPACES);
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);
    const sessionEvent = {
      topic: session.topic,
      event: {
        name: "chainChanged",
      },
      chainId: TEST_REQUIRED_NAMESPACES.eip155.chains[0],
    };
    await Promise.all([
      new Promise<void>((resolve) => {
        dapp.events.on("session_event", (eventPayload) => {
          const { topic, params } = eventPayload;
          expect(topic).to.be.eq(sessionEvent.topic);
          expect(params.event).to.toMatchObject(sessionEvent.event);
          resolve();
        });
      }),
      wallet.emitSessionEvent(sessionEvent),
    ]);
  });

  it("should get active sessions", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            namespaces: {
              eip155: {
                ...TEST_NAMESPACES.eip155,
                accounts: [`${TEST_ETHEREUM_CHAIN}:${cryptoWallet.address}`],
              },
            },
          });
          expect(params.optionalNamespaces).to.toMatchObject(TEST_REQUIRED_NAMESPACES);
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);

    const sessions = wallet.getActiveSessions();
    expect(sessions).to.be.exist;
    expect(Object.values(sessions).length).to.be.eq(1);
    expect(Object.keys(sessions)[0]).to.be.eq(session.topic);
  });

  it("should handle multiple session proposal listeners correctly", async () => {
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();

    await Promise.all([
      new Promise<void>((resolve) => {
        wallet.on("session_proposal", firstHandler);
        wallet.on("session_proposal", secondHandler);
        wallet.on("session_proposal", () => {
          resolve();
        });
      }),
      wallet.pair({ uri: uriString }),
    ]);

    expect(firstHandler.mock.calls).toHaveLength(1);
    expect(secondHandler.mock.calls).toHaveLength(1);
  });

  it("should get pending session proposals", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise<void>((resolve) => {
        wallet.on("session_proposal", () => {
          const proposals = wallet.getPendingSessionProposals();
          expect(proposals).to.be.exist;
          expect(Object.values(proposals).length).to.be.eq(1);
          expect(proposals[0].optionalNamespaces).to.toMatchObject(TEST_REQUIRED_NAMESPACES);
          resolve();
        });
      }),
      wallet.pair({ uri: uriString }),
    ]);
  });

  it.skip("receive proposal_expire event", async () => {
    const { uri: uriString } = await dapp.connect({ requiredNamespaces: TEST_REQUIRED_NAMESPACES });

    // first pair and approve session
    await Promise.all([
      new Promise<void>((resolve) => {
        wallet.once("session_proposal", () => {
          vi.useFakeTimers({
            shouldAdvanceTime: true,
          });
          // Fast-forward system time by 4 min 58 seconds after expiry was first set.
          vi.setSystemTime(
            Date.now() + toMiliseconds(ENGINE_RPC_OPTS.wc_sessionPropose.req.ttl - 2),
          );
        });
        wallet.on("session_proposal", async (event) => {
          const { id } = event;
          const startTimer = Date.now();
          await new Promise<void>((resolve) => {
            wallet.on("proposal_expire", (event) => {
              const { id: expiredId } = event;
              if (id === expiredId) {
                expect(startTimer).to.be.approximately(Date.now(), 5000); // 5 seconds delta for heartbeat
                resolve();
              }
            });
          });
          resolve();
        });
      }),
      wallet.pair({ uri: uriString! }),
    ]);
    vi.useRealTimers();
  });

  it("should get pending session requests", async () => {
    // first pair and approve session
    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          const { id, params } = sessionProposal;
          session = await wallet.approveSession({
            id,
            namespaces: {
              eip155: {
                ...TEST_NAMESPACES.eip155,
                accounts: [`${TEST_ETHEREUM_CHAIN}:${cryptoWallet.address}`],
              },
            },
          });
          expect(params.optionalNamespaces).to.toMatchObject(TEST_REQUIRED_NAMESPACES);
          resolve(session);
        });
      }),
      sessionApproval(),
      wallet.pair({ uri: uriString }),
    ]);

    const requestParams = {
      method: "eth_signTransaction",
      params: [
        {
          from: cryptoWallet.address,
          to: cryptoWallet.address,
          data: "0x",
          nonce: "0x01",
          gasPrice: "0x020a7ac094",
          gasLimit: "0x5208",
          value: "0x00",
        },
      ],
    };

    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_request", async () => {
          const pendingRequests = wallet.getPendingSessionRequests();
          const request = pendingRequests[0];
          const signTransaction = request.params.request.params[0];
          const signature = await cryptoWallet.signTransaction(signTransaction);
          const response = await wallet.respondSessionRequest({
            topic: session.topic,
            response: formatJsonRpcResult(request.id, signature),
          });
          resolve(response);
          resolve(pendingRequests);
        });
      }),
      new Promise<void>(async (resolve) => {
        const result = await dapp.request({
          topic: session.topic,
          request: requestParams,
          chainId: TEST_ETHEREUM_CHAIN,
        });
        expect(result).to.be.exist;
        expect(result).to.be.a("string");
        resolve();
        resolve();
      }),
    ]);
  });

  describe("Decrypted notifications", () => {
    it("should get session metadata", async () => {
      const initMetadata: CoreTypes.Metadata = {
        name: "Test Dapp",
        description: "Test Dapp Description",
        url: "https://walletconnect.com",
        icons: ["https://walletconnect.com/walletconnect-logo.png"],
      };
      const dappTable = "./test/tmp/dapp";
      const walletTable = "./test/tmp/wallet";
      const dapp = await SignClient.init({
        ...TEST_CORE_OPTIONS,
        name: "Dapp",
        metadata: initMetadata,
        storageOptions: {
          database: dappTable,
        },
      });
      const wallet = await WalletKit.init({
        core: new Core({
          ...TEST_CORE_OPTIONS,
          storageOptions: { database: walletTable },
        }),
        name: "wallet",
        metadata: initMetadata,
      });

      const { uri: uriString, approval } = await dapp.connect({});
      let session: SessionTypes.Struct;
      await Promise.all([
        new Promise((resolve) => {
          wallet.on("session_proposal", async (sessionProposal) => {
            const { id, params, verifyContext } = sessionProposal;
            expect(verifyContext.verified.validation).to.eq("UNKNOWN");
            expect(verifyContext.verified.isScam).to.eq(undefined);
            session = await wallet.approveSession({
              id,
              namespaces: TEST_NAMESPACES,
            });
            resolve(session);
          });
        }),
        new Promise(async (resolve) => {
          resolve(await approval());
        }),
        wallet.pair({ uri: uriString! }),
      ]);

      const metadata = await WalletKit.notifications.getMetadata({
        topic: session?.topic,
        storageOptions: { database: walletTable },
      });

      expect(metadata).to.be.exist;
      expect(metadata).to.be.a("object");
      expect(metadata).to.toMatchObject(initMetadata);
      await disconnect(wallet.core);
      await disconnect(dapp.core);
    });

    it("should decrypt payload with pairing topic", async () => {
      const initMetadata: CoreTypes.Metadata = {
        name: "Test Dapp",
        description: "Test Dapp Description",
        url: "https://walletconnect.com",
        icons: ["https://walletconnect.com/walletconnect-logo.png"],
      };
      const dappTable = "./test/tmp/dapp";
      const walletTable = "./test/tmp/wallet";
      const dapp = await SignClient.init({
        ...TEST_CORE_OPTIONS,
        name: "Dapp",
        metadata: initMetadata,
        storageOptions: {
          database: dappTable,
        },
      });
      const wallet = await WalletKit.init({
        core: new Core({
          ...TEST_CORE_OPTIONS,
          storageOptions: { database: walletTable },
        }),
        name: "wallet",
        metadata: initMetadata,
      });

      const { uri: uriString = "", approval } = await dapp.connect({});
      let encryptedMessage = "";
      let decryptedMessage: JsonRpcPayload = {} as any;
      let pairingTopic = "";
      await Promise.all([
        new Promise<void>((resolve) => {
          wallet.core.relayer.on(RELAYER_EVENTS.message, async (payload) => {
            const { topic, message } = payload;
            const decrypted = await wallet.core.crypto.decode(topic, message);
            expect(decrypted).to.be.exist;
            if (decrypted?.method === "wc_sessionPropose" && isJsonRpcRequest(decrypted)) {
              encryptedMessage = message;
              decryptedMessage = decrypted;
              pairingTopic = topic;
              resolve();
            }
          });
        }),
        new Promise<void>((resolve) => {
          wallet.on("session_proposal", async (sessionProposal) => {
            const { id, params, verifyContext } = sessionProposal;
            expect(verifyContext.verified.validation).to.eq("UNKNOWN");
            expect(verifyContext.verified.isScam).to.eq(undefined);
            await wallet.approveSession({
              id,
              namespaces: TEST_NAMESPACES,
            });
            resolve();
          });
        }),
        new Promise(async (resolve) => {
          resolve(await approval());
        }),
        wallet.pair({ uri: uriString }),
      ]);

      const decrypted = await WalletKit.notifications.decryptMessage({
        topic: pairingTopic,
        encryptedMessage,
        storageOptions: { database: walletTable },
      });
      expect(decrypted).to.be.exist;
      expect(decrypted).to.be.a("object");
      expect(decrypted).to.toMatchObject(decryptedMessage);
      await disconnect(wallet.core);
      await disconnect(dapp.core);
    });
    it("should decrypt payload with session topic", async () => {
      const initMetadata: CoreTypes.Metadata = {
        name: "Test Dapp",
        description: "Test Dapp Description",
        url: "https://walletconnect.com",
        icons: ["https://walletconnect.com/walletconnect-logo.png"],
      };
      const dappTable = "./test/tmp/dapp";
      const walletTable = "./test/tmp/wallet";
      const dapp = await SignClient.init({
        ...TEST_CORE_OPTIONS,
        name: "Dapp",
        metadata: initMetadata,
        storageOptions: {
          database: dappTable,
        },
      });
      const wallet = await WalletKit.init({
        core: new Core({
          ...TEST_CORE_OPTIONS,
          storageOptions: { database: walletTable },
        }),
        name: "wallet",
        metadata: initMetadata,
      });

      const { uri: uriString = "", approval } = await dapp.connect({});

      let session: SessionTypes.Struct = {} as any;
      // pair and approve session
      await Promise.all([
        new Promise<void>((resolve) => {
          wallet.on("session_proposal", async (sessionProposal) => {
            const { id, params, verifyContext } = sessionProposal;
            expect(verifyContext.verified.validation).to.eq("UNKNOWN");
            expect(verifyContext.verified.isScam).to.eq(undefined);
            session = await wallet.approveSession({
              id,
              namespaces: TEST_NAMESPACES,
            });
            resolve();
          });
        }),
        new Promise(async (resolve) => {
          resolve(await approval());
        }),
        wallet.pair({ uri: uriString }),
      ]);

      let encryptedMessage = "";
      let decryptedMessage: JsonRpcPayload = {} as any;
      await Promise.all([
        new Promise<void>((resolve) => {
          wallet.core.relayer.on(RELAYER_EVENTS.message, async (payload) => {
            const { topic, message } = payload;
            const decrypted = await wallet.core.crypto.decode(topic, message);
            expect(decrypted).to.be.exist;
            if (decrypted?.method === "wc_sessionRequest" && isJsonRpcRequest(decrypted)) {
              encryptedMessage = message;
              decryptedMessage = decrypted;
              resolve();
            }
          });
        }),
        new Promise<void>((resolve) => {
          wallet.on("session_request", async (payload) => {
            const { id, params, topic, verifyContext } = payload;
            await wallet.respondSessionRequest({
              topic,
              response: formatJsonRpcResult(id, "0x"),
            });
            resolve();
          });
        }),
        dapp.request({
          topic: session.topic,
          request: {
            method: "eth_signTransaction",
            params: [
              {
                from: cryptoWallet.address,
                to: cryptoWallet.address,
                data: "0x",
                nonce: "0x01",
                gasPrice: "0x020a7ac094",
                gasLimit: "0x5208",
                value: "0x00",
              },
            ],
          },
          chainId: TEST_ETHEREUM_CHAIN,
        }),
      ]);
      const decrypted = await WalletKit.notifications.decryptMessage({
        topic: session.topic,
        encryptedMessage,
        storageOptions: { database: walletTable },
      });
      expect(decrypted).to.be.exist;
      expect(decrypted).to.be.a("object");
      expect(decrypted).to.toMatchObject(decryptedMessage);
      await disconnect(wallet.core);
      await disconnect(dapp.core);
    });
  });

  describe("Sign 2.5", () => {
    it("should establish authenticated session", async () => {
      const dapp = await SignClient.init({
        ...TEST_CORE_OPTIONS,
        name: "Dapp",
        metadata: TEST_METADATA,
      });
      expect(dapp).to.be.exist;
      const { uri, response } = await dapp.authenticate({
        chains: ["eip155:1", "eip155:2"],
        domain: "localhost",
        nonce: "1",
        uri: "aud",
        methods: ["personal_sign"],
        resources: [],
      });
      const walletkit = await WalletKit.init({
        name: "wallet",
        core: new Core(TEST_CORE_OPTIONS),
        metadata: TEST_METADATA,
      });
      await Promise.all([
        new Promise<void>((resolve) => {
          walletkit.on("session_authenticate", async (payload) => {
            const verifyContext = payload.verifyContext;
            expect(verifyContext).to.exist;
            expect(verifyContext.verified.validation).to.eq("UNKNOWN");

            const auths: any[] = [];
            for (const chain of payload.params.authPayload.chains) {
              const message = walletkit.formatAuthMessage({
                request: payload.params.authPayload,
                iss: `${chain}:${cryptoWallet.address}`,
              });
              const sig = await cryptoWallet.signMessage(message);
              const auth = buildAuthObject(
                payload.params.authPayload,
                {
                  t: "eip191",
                  s: sig,
                },
                `${chain}:${cryptoWallet.address}`,
              );
              auths.push(auth);
            }

            const result = await walletkit.approveSessionAuthenticate({
              id: payload.id,
              auths,
            });
            const { session } = result;
            expect(session).to.exist;
            resolve();
          });
        }),
        new Promise<void>(async (resolve) => {
          await walletkit.pair({ uri });
          resolve();
        }),
      ]);
      const { session, auths } = await response();
      expect(auths).to.exist;
      expect(auths).to.be.an("array");
      const walletSessions = walletkit.getActiveSessions();
      expect(walletSessions).to.exist;
      expect(walletSessions).to.be.an("object");
      const walletSession = walletSessions[session.topic];
      // approved namespaces on both sides must be equal
      expect(JSON.stringify(session.namespaces)).to.eq(JSON.stringify(walletSession.namespaces));
      expect(session.topic).to.eq(walletSession.topic);
      await Promise.all([
        new Promise<void>((resolve) => {
          walletkit.on("session_request", async (payload) => {
            const { id, topic } = payload;
            await walletkit.respondSessionRequest({
              topic,
              response: formatJsonRpcResult(
                id,
                await cryptoWallet.signMessage(payload.params.request.params[0]),
              ),
            });
            resolve();
          });
        }),
        new Promise<void>(async (resolve) => {
          await dapp.request({
            chainId: "eip155:1",
            topic: session.topic,
            request: {
              method: "personal_sign",
              params: ["hey, sup"],
            },
          });
          resolve();
        }),
      ]);
      await disconnect(walletkit.core);
      await disconnect(dapp.core);
    });
    it("should fallback to session_proposal when no listener for `session_authenticate` exists", async () => {
      const dapp = await SignClient.init({
        ...TEST_CORE_OPTIONS,
        name: "Dapp",
        metadata: TEST_METADATA,
      });
      expect(dapp).to.be.exist;
      const { uri, response } = await dapp.authenticate({
        chains: ["eip155:1", "eip155:2"],
        domain: "localhost",
        nonce: "1",
        uri: "aud",
        methods: ["personal_sign"],
        resources: [],
      });
      const walletkit = await WalletKit.init({
        name: "wallet",
        core: new Core(TEST_CORE_OPTIONS),
        metadata: TEST_METADATA,
      });
      await Promise.all([
        new Promise<void>((resolve) => {
          walletkit.on("session_proposal", (payload) => {
            const approved = buildApprovedNamespaces({
              supportedNamespaces: {
                eip155: {
                  methods: ["personal_sign", "eth_signTransaction", "eth_signTypedData_v4"],
                  chains: ["eip155:1", "eip155:2", "eip155:3"],
                  accounts: [
                    "eip155:1:" + cryptoWallet.address,
                    "eip155:2:" + cryptoWallet.address,
                    "eip155:3:" + cryptoWallet.address,
                  ],
                  events: [],
                },
              },
              proposal: payload.params,
            });
            walletkit.approveSession({
              id: payload.id,
              namespaces: approved,
            });
            resolve();
          });
        }),
        new Promise<void>(async (resolve) => {
          await walletkit.pair({ uri });
          resolve();
        }),
      ]);
      const { session, auths } = await response();
      expect(auths).to.be.undefined;
      const walletSessions = walletkit.getActiveSessions();
      expect(walletSessions).to.exist;
      expect(walletSessions).to.be.an("object");
      const walletSession = walletSessions[session.topic];
      // approved namespaces on both sides must be equal
      expect(JSON.stringify(session.namespaces)).to.eq(JSON.stringify(walletSession.namespaces));
      expect(session.topic).to.eq(walletSession.topic);
      await Promise.all([
        new Promise<void>((resolve) => {
          walletkit.on("session_request", async (payload) => {
            const { id, topic } = payload;
            await walletkit.respondSessionRequest({
              topic,
              response: formatJsonRpcResult(
                id,
                await cryptoWallet.signMessage(payload.params.request.params[0]),
              ),
            });
            resolve();
          });
        }),
        new Promise<void>(async (resolve) => {
          await dapp.request({
            chainId: "eip155:1",
            topic: session.topic,
            request: {
              method: "personal_sign",
              params: ["hey, sup"],
            },
          });
          resolve();
        }),
      ]);
      await disconnect(walletkit.core);
      await disconnect(dapp.core);
    });
  });

  it("should send core init event when walletkit initializes", async () => {
    process.env.IS_VITEST = false as any;
    const core = new Core({ ...TEST_CORE_OPTIONS, telemetryEnabled: false });
    let initCalled = false;
    expect(initCalled).to.be.false;
    // @ts-expect-error - accessing private properties
    core.eventClient.sendEvent = async (payload: any) => {
      initCalled = true;
      expect(payload).toBeDefined();
      expect(payload.length).to.eql(1);
      expect(payload[0].props.event).to.eql("INIT");
      expect(payload[0].props.properties.client_id).to.eql(await core.crypto.getClientId());
    };
    await WalletKit.init({
      core,
      name: "wallet",
      metadata: TEST_METADATA,
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(initCalled).to.be.true;
    process.env.IS_VITEST = true as any;
  });

  describe.concurrent("1CA", () => {
    const approveAuthentication = async (
      event: WalletKitTypes.EventArguments["session_proposal"],
    ) => {
      const authenticationRequests = event.params.requests?.authentication;
      if (!authenticationRequests) return [];
      const auths: AuthTypes.Cacao[] = [];
      for (const authenticationRequest of authenticationRequests) {
        for (const chain of authenticationRequest.chains) {
          const message = wallet.formatAuthMessage({
            request: authenticationRequest,
            iss: `did:pkh:${chain}:${cryptoWallet.address}`,
          });
          const sig = await cryptoWallet.signMessage(message!);
          const authObject = buildAuthObject(
            authenticationRequest,
            {
              t: "eip191",
              s: sig,
            },
            `did:pkh:${chain}:${cryptoWallet.address}`,
          );
          auths.push(authObject);
        }
      }
      return auths;
    };

    it("should approve session proposal with 1CA requests", async () => {
      const core = new Core({
        ...TEST_CORE_OPTIONS,
        customStoragePrefix: Math.random().toString(36).substring(2, 15),
      });
      const dapp = await SignClient.init({
        ...TEST_CORE_OPTIONS,
        name: "Dapp",
        metadata: TEST_METADATA,
        customStoragePrefix: Math.random().toString(36).substring(2, 15),
      });

      const authentication = {
        uri: "https://walletconnect.com",
        domain: "walletconnect.com",
        chains: ["eip155:1", "eip155:2"],
        nonce: "1",
        ttl: 1000,
      };
      const { uri, approval } = await dapp.connect({
        requiredNamespaces: TEST_REQUIRED_NAMESPACES,
        authentication: [authentication],
      });
      uriString = uri || "";
      sessionApproval = approval;
      const signConfig = { disableRequestQueue: true };
      const wallet = await WalletKit.init({
        core,
        name: "wallet",
        metadata: TEST_METADATA,
        signConfig,
      });

      const sessionConfig = { disableDeepLink: false };
      await Promise.all([
        new Promise((resolve) => {
          wallet.on("session_proposal", async (sessionProposal) => {
            const { id, params, verifyContext } = sessionProposal;
            expect(verifyContext.verified.validation).to.eq("UNKNOWN");
            expect(verifyContext.verified.isScam).to.eq(undefined);
            const auths = await approveAuthentication(sessionProposal);
            session = await wallet.approveSession({
              id,
              namespaces: TEST_NAMESPACES,
              sessionConfig,
              proposalRequestsResponses: {
                authentication: auths,
              },
            });
            expect(params.optionalNamespaces).to.toMatchObject(TEST_REQUIRED_NAMESPACES);
            resolve(session);
          });
        }),
        new Promise(async (resolve) => {
          resolve(await sessionApproval());
        }),
        wallet.pair({ uri: uriString }),
      ]);

      expect(session).to.be.exist;
      expect(session.topic).to.be.exist;
      expect(session.sessionConfig).to.eql(sessionConfig);
      const auths = session.authentication;
      expect(auths).to.be.exist;
      expect(auths).to.be.an("array");
      expect(auths).to.have.length(2);
      expect(auths?.[0]?.p.iss).to.eq(`did:pkh:eip155:1:${cryptoWallet.address}`);
      expect(auths?.[1]?.p.iss).to.eq(`did:pkh:eip155:2:${cryptoWallet.address}`);
      const dappSession = dapp.session.get(session.topic);
      expect(dappSession).to.be.exist;
      expect(dappSession?.authentication).to.be.exist;
      expect(dappSession?.authentication).to.be.an("array");
      expect(dappSession?.authentication).to.have.length(2);
      expect(dappSession?.authentication?.[0]?.p.iss).to.eq(
        `did:pkh:eip155:1:${cryptoWallet.address}`,
      );
      expect(dappSession?.authentication?.[1]?.p.iss).to.eq(
        `did:pkh:eip155:2:${cryptoWallet.address}`,
      );
      await disconnect(wallet.core);
      await disconnect(dapp.core);
    });
  });
});
