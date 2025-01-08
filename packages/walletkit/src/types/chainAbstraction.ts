import { IWalletKitEngine } from "./engine";

export declare namespace ChainAbstractionTypes {
  type InitialTransaction = {
    from: string;
    to: string;
    data: string;
    chainId: string;
  };

  type Transaction = {
    from: string;
    to: string;
    value: string;
    chainId: string;
    gasLimit: string;
    input: string;
    nonce: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  };

  type InitialTransactionMetadata = {
    symbol: string;
    amount: string;
    decimals: number;
    tokenContract: string;
    transferTo: string;
  };

  type FulfilmentStatusResponse = {
    createdAt: number;
    status: "completed";
  };

  type FulfilmentStatusHandlerResponse = {
    createdAt: number;
  } & (
    | {
        status: "completed";
      }
    | { status: "pending"; checkIn: number }
    | { status: "error"; reason: string }
  );

  type PrepareFulfilmentResponse =
    | {
        status: "not_required";
      }
    | {
        status: "available";
        data: {
          fulfilmentId: string;
          checkIn: number;
          transactions: Transaction[];
          funding: FundingFrom[];
          initialTransaction: Transaction;
          initialTransactionMetadata: InitialTransactionMetadata;
        };
      }
    | {
        status: "error";
        reason: string;
      };

  type FundingFrom = {
    tokenContract: string;
    amount: string;
    chainId: string;
    symbol: string;
  };

  type PrepareFulfilmentHandlerResult =
    | {
        status: "error";
        reason: string;
      }
    | {
        status: "not_required";
      }
    | {
        status: "available";
        data: {
          orchestrationId: string;
          checkIn: number;
          metadata: {
            fundingFrom: FundingFrom[];
            initialTransaction: InitialTransactionMetadata;
          };
          transactions: Transaction[];
          initialTransaction: Transaction;
        };
      };

  type EstimateFeesResponse = {
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  };

  type ERC20BalanceResponse = {
    balance: string;
  };

  type TotalFee = {
    symbol: string;
    amount: string;
    unit: number;
    formatted: string;
    formattedAlt: string;
  };

  type TransactionFee = {
    fee: TotalFee;
    localFee: TotalFee;
  };

  type TransactionDetails = {
    transaction: Transaction;
    eip1559: EstimateFeesResponse;
    transactionFee: TransactionFee;
  };

  type FulfilmentDetailsResponse = {
    routeDetails: TransactionDetails[];
    initialTransactionDetails: TransactionDetails;
    bridgeDetails: TransactionFee[];
    totalFee: TotalFee;
  };
}
export abstract class IChainAbstraction {
  constructor(public engine: IWalletKitEngine) {}

  public abstract prepareFulfilment(params: {
    transaction: ChainAbstractionTypes.InitialTransaction;
  }): Promise<ChainAbstractionTypes.PrepareFulfilmentResponse>;

  public abstract fulfilmentStatus(params: {
    fulfilmentId: string;
  }): Promise<ChainAbstractionTypes.FulfilmentStatusResponse>;

  public abstract estimateFees(params: {
    chainId: string;
  }): Promise<ChainAbstractionTypes.EstimateFeesResponse>;

  public abstract getERC20Balance(params: {
    chainId: string;
    tokenAddress: string;
    ownerAddress: string;
  }): Promise<ChainAbstractionTypes.ERC20BalanceResponse>;

  public abstract getFulfilmentDetails(params: {
    fulfilmentId: string;
  }): Promise<ChainAbstractionTypes.FulfilmentDetailsResponse>;
}
