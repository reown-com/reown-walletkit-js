import { IWalletKitEngine } from "./engine";

import type {
  InitialTransactionMetadata,
  Transaction,
  Client,
  PrepareDetailedResponseSuccess,
  PrepareResponseAvailable,
  UiFields,
  FundingMetadata,
  Hex,
} from "./../libs/yttrium";

export declare namespace ChainAbstractionTypes {
  export { Transaction };
  export { InitialTransactionMetadata };
  export { PrepareDetailedResponseSuccess };
  export { PrepareResponseAvailable };
  export { UiFields };
  export { FundingMetadata };
  export { Hex };
  export type ERC20BalanceResponse = ReturnType<Client["erc20_token_balance"]>;
  export type PrepareDetailedResponse = ReturnType<Client["prepare_detailed"]>;
  export type PrepareResponse = ReturnType<Client["prepare"]>;
  export type StatusResponse = ReturnType<Client["status"]>;
  export type UiFieldsResponse = ReturnType<Client["get_ui_fields"]>;
  export type ExecuteResult = ReturnType<Client["execute"]>;
  export type OrchestrationId = string;
  export type SignedTransaction = string;
  export type PartialTransaction = {
    from: Hex;
    to: Hex;
    input: Hex;
    chainId: string;
    value?: Hex;
  };
}
export abstract class IChainAbstraction {
  constructor(public engine: IWalletKitEngine) {}

  public abstract prepare(params: {
    transaction: ChainAbstractionTypes.PartialTransaction;
  }): ChainAbstractionTypes.PrepareResponse;

  public abstract prepareDetailed(params: {
    transaction: ChainAbstractionTypes.PartialTransaction;
  }): ChainAbstractionTypes.PrepareDetailedResponse;

  public abstract status(params: {
    orchestrationId: ChainAbstractionTypes.OrchestrationId;
  }): ChainAbstractionTypes.StatusResponse;

  public abstract getERC20Balance(params: {
    chainId: string;
    tokenAddress: string;
    ownerAddress: string;
  }): ChainAbstractionTypes.ERC20BalanceResponse;

  public abstract getPrepareDetails(params: {
    orchestrationId: ChainAbstractionTypes.OrchestrationId;
  }): ChainAbstractionTypes.UiFieldsResponse;

  public abstract execute(params: {
    orchestrationId: ChainAbstractionTypes.OrchestrationId;
    bridgeSignedTransactions: ChainAbstractionTypes.SignedTransaction[];
    initialSignedTransaction: ChainAbstractionTypes.SignedTransaction;
  }): ChainAbstractionTypes.ExecuteResult;
}
