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

  beforeAll(() => {
    cryptoWallet = CryptoWallet.createRandom();
  });

  afterEach(async () => {
    await disconnect(wallet.core);
    await disconnect(dapp.core);
  });

  it("should approve session proposal with 1CA requests", async () => {
    core = new Core(TEST_CORE_OPTIONS);
    dapp = await SignClient.init({ ...TEST_CORE_OPTIONS, name: "Dapp", metadata: TEST_METADATA });

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
    wallet = await WalletKit.init({
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
            proposalRequestsResponses: auths,
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
  });
});
