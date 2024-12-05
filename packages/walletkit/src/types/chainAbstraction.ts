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
}

export abstract class IChainAbstraction {
  public abstract canFulfil(params: {
    transaction: ChainAbstractionTypes.Transaction;
  }): Promise<boolean>;

  public abstract fulfilmentStatus(params: { fulfilmentId: string }): Promise<boolean>;
}
