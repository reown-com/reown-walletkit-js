import { IWalletKitEngine } from "./engine";

export declare namespace ChainAbstractionTypes {
  type Transaction = {
    from: string;
    to: string;
    value: string;
    chainId: string;
    gas?: string;
    gasPrice?: string;
    data?: string;
    nonce?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };

  type FulfilmentStatusResponse = {
    createdAt: number;
  } & (
    | {
        status: "completed";
      }
    | { status: "pending"; checkIn: number }
  );

  type FulfilmentStatusHandlerResponse = {
    createdAt: number;
  } & (
    | {
        status: "completed";
      }
    | { status: "pending"; checkIn: number }
    | { status: "error"; reason: string }
  );

  type CanFulfilResponse =
    | {
        status: "not_required";
      }
    | {
        status: "available";
        data: {
          routes: {
            fulfilmentId: string;
            checkIn: number;
            transactions: ChainAbstractionTypes.Transaction[];
            funding: FundingFrom[];
            initialTransaction: ChainAbstractionTypes.Transaction;
          };
          routesDetails: {
            totalFees: {
              amount: string;
              formatted: string;
              formattedAlt: string;
              symbol: string;
              unit: number;
            };
          };
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

  type CanFulfilHandlerResult =
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
          routes: {
            orchestrationId: string;
            checkIn: number;
            metadata: {
              fundingFrom: FundingFrom[];
            };
            transactions: ChainAbstractionTypes.Transaction[];
            initialTransaction: ChainAbstractionTypes.Transaction;
          };
          routesDetails: {
            localTotal: {
              amount: string;
              formatted: string;
              formattedAlt: string;
              symbol: string;
              unit: number;
            };
          };
        };
      };
}
export abstract class IChainAbstraction {
  constructor(public engine: IWalletKitEngine) {}

  public abstract canFulfil(params: {
    transaction: ChainAbstractionTypes.Transaction;
  }): Promise<ChainAbstractionTypes.CanFulfilResponse>;

  public abstract fulfilmentStatus(params: {
    fulfilmentId: string;
  }): Promise<ChainAbstractionTypes.FulfilmentStatusResponse>;
}
