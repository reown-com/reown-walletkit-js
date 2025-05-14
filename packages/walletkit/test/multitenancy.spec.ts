import { TEST_METADATA } from "./shared/values";
import { Core } from "@walletconnect/core";
import { formatJsonRpcResult } from "@walletconnect/jsonrpc-utils";
import { SignClient } from "@walletconnect/sign-client";
import { ICore, ISignClient, SessionTypes } from "@walletconnect/types";
import { parseUri } from "@walletconnect/utils";
import { KeyValueStorage } from "@walletconnect/keyvaluestorage";
import { Wallet as CryptoWallet } from "@ethersproject/wallet";

import { expect, describe, it, beforeAll } from "vitest";
import { WalletKit, IWalletKit } from "../src";
import {
  TEST_CORE_OPTIONS,
  TEST_ETHEREUM_CHAIN,
  TEST_NAMESPACES,
  TEST_REQUIRED_NAMESPACES,
} from "./shared";

interface IClientInstance {
  clientId: number;
  core: ICore;
  wallet: IWalletKit;
  cryptoWallet: CryptoWallet;
  sessionTopic: string;
}

describe("Multitenancy", () => {
  // enable global core - its disabled in tests by default
  process.env.DISABLE_GLOBAL_CORE = "false";
  // create 5 walletkit clients
  const walletKitClientsToCreate = process.env.WALLETKIT_CLIENTS_TO_CREATE
    ? parseInt(process.env.WALLETKIT_CLIENTS_TO_CREATE, 10)
    : 5;

  expect(walletKitClientsToCreate).to.be.a("number");
  expect(walletKitClientsToCreate).to.be.greaterThan(0);

  // send 5 session requests to the clients
  const sessionRequestsToSend = process.env.SESSION_REQUESTS_TO_SEND
    ? parseInt(process.env.SESSION_REQUESTS_TO_SEND, 10)
    : 5;

  expect(sessionRequestsToSend).to.be.a("number");
  expect(sessionRequestsToSend).to.be.greaterThan(0);

  // force all clients to use the same storage
  const walletKitStorage = new KeyValueStorage({
    database: "./test/tmp/walletkit-core-db",
  });

  // map of the number of proposals received by each WalletKit client
  const proposalsReceived = new Map<number, number>();
  // map of the number of proposals responded by each WalletKit client
  const proposalsResponded = new Map<number, number>();

  // map of the number of session requests received by each WalletKit client
  const sessionRequestsReceived = new Map<
    number,
    {
      instanceId: number;
      count: number;
      payload: string;
    }
  >();
  // map of the number of session requests responded by each WalletKit client
  const sessionRequestsResponded = new Map<
    number,
    {
      instanceId: number;
      count: number;
      payload: string;
    }
  >();

  let core: ICore;
  let dapp: ISignClient;

  // map of walletkit clients, one client for each session
  const walletKitClients = new Map<string, IClientInstance>();
  const walletKitIdToSessionTopic = new Map<number, string>();
  // map of dapp sessions, one session with each client
  const dappSessions = new Map<string, SessionTypes.Struct>();

  const createWalletKitClient = async (id: number, isRestarting = false) => {
    const core = new Core({
      ...TEST_CORE_OPTIONS,
      storage: walletKitStorage,
    });
    const wallet = await WalletKit.init({
      core,
      name: "wallet",
      metadata: TEST_METADATA,
      signConfig: {
        disableRequestQueue: true,
      },
    });
    if (isRestarting) {
      // each walletKit client will load the sessions of the previous client instances because of the same storage they all use
      expect(Object.keys(wallet.getActiveSessions()).length).to.be.eq(walletKitClientsToCreate);
    }

    const clientInstance: IClientInstance = {
      clientId: id,
      wallet,
      core: wallet.core,
      cryptoWallet: CryptoWallet.createRandom(),
      sessionTopic: "", // will be set after session is approved or after restarting the wallet
    };
    return clientInstance;
  };

  const pairWalletKitClient = async (walletInstance: IClientInstance, uri: string) => {
    const wallet = walletInstance.wallet;
    const { topic: pairingTopic } = parseUri(uri);

    await Promise.all([
      new Promise((resolve) => {
        wallet.on("session_proposal", async (sessionProposal) => {
          // count the number of proposals received for each client
          proposalsReceived.set(
            walletInstance.clientId,
            (proposalsReceived.get(walletInstance.clientId) || 0) + 1,
          );

          if (sessionProposal.params.pairingTopic !== pairingTopic) {
            console.warn("Session proposal not intended for this client, skipping...");
            return;
          }

          proposalsResponded.set(
            walletInstance.clientId,
            (proposalsResponded.get(walletInstance.clientId) || 0) + 1,
          );

          const session = await wallet.approveSession({
            id: sessionProposal.id,
            namespaces: TEST_NAMESPACES,
          });
          walletInstance.sessionTopic = session.topic;
          resolve(session);
        });
      }),
      wallet.pair({ uri }),
    ]);

    // map the walletkit instance id to the session topic
    walletKitIdToSessionTopic.set(walletInstance.clientId, walletInstance.sessionTopic);

    expect(walletInstance.sessionTopic).to.be.exist;
    expect(walletInstance.sessionTopic).to.be.not.empty;
    expect(walletInstance.sessionTopic).to.be.a("string");
    expect(walletInstance.sessionTopic).to.not.eql("");

    expect(walletInstance.core).to.be.exist;
    expect(walletInstance.wallet).to.be.exist;
    expect(walletInstance.cryptoWallet).to.be.exist;

    return walletInstance.sessionTopic;
  };

  beforeAll(async () => {
    core = new Core({
      ...TEST_CORE_OPTIONS,
      // isolate dapp storage from walletkit clients
      customStoragePrefix: "dapp-storage",
    });
    dapp = await SignClient.init({
      core,
      ...TEST_CORE_OPTIONS,
      name: "Dapp",
      metadata: TEST_METADATA,
    });
  });

  it("should establish sessions to multiple WalletKit clients", async () => {
    for (let i = 0; i < walletKitClientsToCreate; i++) {
      const { uri, approval } = await dapp.connect({
        requiredNamespaces: TEST_REQUIRED_NAMESPACES,
      });
      if (!uri) {
        throw new Error(`URI is not defined for client ${i}`);
      }
      const walletKitInstanceId = i + 1;
      // 1. create new WalletKit client for each session
      // 2. pair the WalletKit client with the dapp
      // 3. store the paired WalletKit client in the walletKitClients map
      // 4. store the session in the dappSessions map
      const walletInstance = await createWalletKitClient(walletKitInstanceId);
      await Promise.all([
        new Promise<void>(async (resolve) => {
          const session = await approval();
          dappSessions.set(session.topic, session);
          resolve();
        }),
        new Promise<void>(async (resolve) => {
          const sessionTopic = await pairWalletKitClient(walletInstance, uri);
          walletKitClients.set(sessionTopic, walletInstance);
          resolve();
        }),
      ]);
    }
    // verify that the number of sessions in the dappSessions map is equal to the number of WalletKit clients
    expect(dappSessions.size).to.be.eq(walletKitClientsToCreate);
    // verify that the number of WalletKit clients is equal to the number of sessions in the dappSessions map
    expect(walletKitClients.size).to.be.eq(walletKitClientsToCreate);

    // verify that each WalletKit client has a session that matches the session in the dappSessions map
    for (const [topic] of dappSessions.entries()) {
      const walletKitClient = walletKitClients.get(topic);

      if (!walletKitClient) {
        throw new Error(`WalletKit client not found for session topic ${topic}`);
      }
      expect(walletKitClient).to.be.exist;
      expect(walletKitClient.sessionTopic).to.be.eq(topic);
    }
  });

  it("should restart walletkit clients", async () => {
    // close all transports
    for (const client of walletKitClients.values()) {
      expect(client).to.be.exist;
      await client.core.relayer.transportClose();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    // clear the global Core - as if the instance was restarted
    globalThis._walletConnectCore_ = undefined;
    // clear the walletkit clients map
    walletKitClients.clear();

    expect(walletKitClients.size).to.be.eq(0);

    // reinitialize the walletkit clients
    for (let i = 0; i < walletKitClientsToCreate; i++) {
      const walletInstance = await createWalletKitClient(i + 1, true);

      const sessionTopic = walletKitIdToSessionTopic.get(walletInstance.clientId);
      if (!sessionTopic) {
        throw new Error(`Session topic not found for wallet instance ${walletInstance.clientId}`);
      }
      walletInstance.sessionTopic = sessionTopic;
      walletKitClients.set(sessionTopic, walletInstance);
    }

    // verify that the number of WalletKit clients is equal to the number of sessions in the dappSessions map
    expect(walletKitClients.size).to.be.eq(dappSessions.size);
    expect(walletKitClients.size).to.be.eq(walletKitClientsToCreate);

    // verify that each WalletKit client has a session that matches the session in the dappSessions map
    for (const session of dappSessions.values()) {
      const walletKitClient = walletKitClients.get(session.topic);
      if (!walletKitClient) {
        throw new Error(`WalletKit client not found for session topic ${session.topic}`);
      }
      expect(walletKitClient).to.be.exist;
      expect(walletKitClient.sessionTopic).to.be.eq(session.topic);
    }

    // verify that each WalletKit client has correctly loaded its session
    for (const walletKitClient of walletKitClients.values()) {
      const sessionTopic = walletKitClient.sessionTopic;
      const session = walletKitClient.wallet.getActiveSessions()[sessionTopic];
      expect(session).to.be.exist;
      expect(session.topic).to.be.eq(sessionTopic);
    }
  });

  it("should receive session requests", async () => {
    const onSessionRequest = (walletKitClient: IClientInstance) => {
      walletKitClient.wallet.on("session_request", async (sessionRequest) => {
        const { id, topic: requestTopic } = sessionRequest;
        // count the number of session requests received by this client
        sessionRequestsReceived.set(walletKitClient.clientId, {
          instanceId: walletKitClient.clientId,
          count: (sessionRequestsReceived.get(walletKitClient.clientId)?.count || 0) + 1,
          payload: sessionRequest.params.request.params[0],
        });
        if (requestTopic !== walletKitClient.sessionTopic) {
          console.warn("session_request not intended for this client, skipping...");
          return;
        }

        // count the number of session requests responded by this client
        sessionRequestsResponded.set(walletKitClient.clientId, {
          instanceId: walletKitClient.clientId,
          count: (sessionRequestsResponded.get(walletKitClient.clientId)?.count || 0) + 1,
          payload: sessionRequest.params.request.params[0],
        });

        await walletKitClient.wallet.respondSessionRequest({
          topic: requestTopic,
          response: formatJsonRpcResult(id, `0x_${walletKitClient.clientId}`),
        });
      });
    };

    for (const walletKitClient of walletKitClients.values()) {
      onSessionRequest(walletKitClient);
    }

    const dappSessionsArray = [...dappSessions.values()];

    for (let i = 0; i < sessionRequestsToSend; i++) {
      const sessionToSendRequestTo = dappSessionsArray[i];

      if (!sessionToSendRequestTo) {
        throw new Error(`Dapp session not found for random request: ${i + 1}`);
      }
      // i+1 is the intended clientId for this request
      const requestPayload = `request_for_client_${i + 1}`;
      const result = await dapp.request({
        topic: sessionToSendRequestTo.topic,
        request: {
          method: "eth_signTransaction",
          params: [requestPayload, "0x"],
        },
        chainId: TEST_ETHEREUM_CHAIN,
      });
      expect(result).to.be.exist;
      expect(result).to.be.a("string");
      // verify that this request was responded by the correct WalletKit client - clientId = i+1
      expect(result).to.be.eq(`0x_${i + 1}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("sessionRequestsReceived", sessionRequestsReceived.values());
    console.log("sessionRequestsResponded", sessionRequestsResponded.values());
    // verify that each WalletKit client received every session request at least once
    for (const requestReceived of sessionRequestsReceived.values()) {
      expect(requestReceived.count).to.be.greaterThan(1);
    }

    // verify that each WalletKit client responded to its intended request
    for (const requestResponded of sessionRequestsResponded.values()) {
      expect(requestResponded.count).to.be.eq(1);
      expect(requestResponded.payload).to.be.eq(
        `request_for_client_${requestResponded.instanceId}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  });
});
