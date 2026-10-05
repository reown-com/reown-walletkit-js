import { Core } from "@walletconnect/core";
import { expect, describe, it, vi, afterEach } from "vitest";
import { WalletKit, IWalletKit } from "../src";
import { SDK_NAME, SDK_VERSION } from "../src/constants";
import { disconnect, TEST_CORE_OPTIONS } from "./shared";
import { TEST_METADATA } from "./shared/values";
import packageJson from "../package.json";

describe("Init", () => {
  let wallet: IWalletKit;

  afterEach(async () => {
    if (wallet) await disconnect(wallet.core);
  });

  it("SDK_VERSION should match package.json version", () => {
    expect(SDK_VERSION).to.eql(packageJson.version);
  });

  it("should send its sdk name and version in the core INIT event", async () => {
    const core = new Core({
      ...TEST_CORE_OPTIONS,
      customStoragePrefix: Math.random().toString(36).substring(2, 15),
    });
    const initSpy = vi.spyOn(core.eventClient, "init");
    wallet = await WalletKit.init({ core, name: "wallet", metadata: TEST_METADATA });
    expect(initSpy).toHaveBeenCalledWith({ sdk: { name: SDK_NAME, version: SDK_VERSION } });
  });
});
