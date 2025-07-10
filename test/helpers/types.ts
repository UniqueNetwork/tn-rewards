import { TransactionReceipt, WalletClient, PublicClient, Account, Hex, Address } from 'viem';

export interface Config {
  walletClient: WalletClient;
  publicClient: PublicClient;
  accounts: {
    owner: Account;
    admin: Account;
    other: Account;
    user1: Account;
    user2: Account;
    user3: Account;
  };
}

export interface RewardBatchItem {
  substratePublicKey: Hex;
  gameLabel: string;
  amount: bigint;
}

export interface DeployContractParams {
  minClaimAmount: bigint;
}

export interface ContractWriteParams {
  address: Hex;
  gas?: bigint;
}

export interface AddAdminParams extends ContractWriteParams {
  adminAddress: Address;
}

export interface RemoveAdminParams extends ContractWriteParams {
  adminAddress: Address;
}

export interface AddRewardTypeParams extends ContractWriteParams {
  rewardType: `0x${string}`;
}

export interface RemoveRewardTypeParams extends ContractWriteParams {
  rewardType: `0x${string}`;
}

export interface AddRewardBatchParams extends ContractWriteParams {
  batch: RewardBatchItem[] | RewardBatchItem;
  rewardType: `0x${string}`;
}

export interface ClaimRewardsParams extends ContractWriteParams {}

export interface GetRewardBalanceParams {
  address: Address;
  account: Hex;
}

export interface WithdrawAllParams extends ContractWriteParams {
  recipient: Address;
}

export interface PauseParams extends ContractWriteParams {}

export interface UnpauseParams extends ContractWriteParams {}

export interface FundContractParams {
  contractAddress: Address;
  amount: bigint;
}

export interface DeploymentResult {
  contractAddress: Address;
  receipt: TransactionReceipt;
}