import { Abi, Account, Address, createWalletClient, getContract, TransactionReceipt } from "viem";
import {
  DeployContractParams,
  AddAdminParams,
  RemoveAdminParams,
  AddRewardTypeParams,
  RemoveRewardTypeParams,
  AddRewardBatchParams,
  ClaimRewardsParams,
  WithdrawAllParams,
  PauseParams,
  UnpauseParams,
  FundContractParams,
  DeploymentResult,
} from "./types";
import RewardManagerArtifacts from "../../artifacts/contracts/Rewards.sol/RewardManager.json";
import { PublicClient } from "@nomicfoundation/hardhat-viem/types";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export class TransactionHelper {
  private REWARD_MANAGER_ABI = RewardManagerArtifacts.abi as Abi;
  private REWARD_MANAGER_BYTECODE =
    RewardManagerArtifacts.bytecode as `0x${string}`;

  constructor(
    private walletClient: ReturnType<typeof createWalletClient>,
    private publicClient: PublicClient,
    private account: Account
  ) {}

  connect(account: Account) {
    return new TransactionHelper(this.walletClient, this.publicClient, account);
  }

  /**
   * Deploy RewardManager contract
   */
  async deployRewardManager(
    params: DeployContractParams
  ): Promise<DeploymentResult> {
    const deployment = await this.walletClient.deployContract({
      abi: this.REWARD_MANAGER_ABI,
      bytecode: this.REWARD_MANAGER_BYTECODE,
      args: [params.minClaimAmount],
      account: this.account,
      chain: this.publicClient.chain,
      gas: 3_000_000n,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: deployment,
    });

    return {
      contractAddress: receipt.contractAddress!,
      receipt,
    };
  }

  /**
   * Fund the RewardManager contract with ETH
   */
  async fundContract(params: FundContractParams): Promise<TransactionReceipt> {
    const hash = await this.walletClient.sendTransaction({
      to: params.contractAddress,
      value: params.amount,
      account: this.account,
      chain: this.publicClient.chain,
    });

    return this.publicClient.waitForTransactionReceipt({ hash });
  }

  /**
   * Add an admin to the RewardManager contract
   */
  async addAdmin(params: AddAdminParams): Promise<TransactionReceipt> {
    const { request } = await this.publicClient.simulateContract({
      address: params.address,
      abi: this.REWARD_MANAGER_ABI,
      functionName: "addAdmin",
      args: [params.adminAddress],
      account: this.account,
      gas: params.gas || 300_000n,
    });

    const hash = await this.walletClient.writeContract(request);
    return this.publicClient.waitForTransactionReceipt({ hash });
  }

  /**
   * Remove an admin from the RewardManager contract
   */
  async removeAdmin(params: RemoveAdminParams): Promise<TransactionReceipt> {
    const { request } = await this.publicClient.simulateContract({
      address: params.address,
      abi: this.REWARD_MANAGER_ABI,
      functionName: "removeAdmin",
      args: [params.adminAddress],
      account: this.account,
      gas: params.gas || 300_000n,
    });

    const hash = await this.walletClient.writeContract(request);
    return this.publicClient.waitForTransactionReceipt({ hash });
  }

  /**
   * Add a reward type to the RewardManager contract
   */
  async addRewardType(
    params: AddRewardTypeParams
  ): Promise<TransactionReceipt> {
    const { request } = await this.publicClient.simulateContract({
      address: params.address,
      abi: this.REWARD_MANAGER_ABI,
      functionName: "addRewardType",
      args: [params.rewardType],
      account: this.account,
      gas: params.gas || 300_000n,
    });

    const hash = await this.walletClient.writeContract(request);
    return this.publicClient.waitForTransactionReceipt({ hash });
  }

  /**
   * Remove a reward type from the RewardManager contract
   */
  async removeRewardType(
    params: RemoveRewardTypeParams
  ): Promise<TransactionReceipt> {
    const { request } = await this.publicClient.simulateContract({
      address: params.address,
      abi: this.REWARD_MANAGER_ABI,
      functionName: "removeRewardType",
      args: [params.rewardType],
      account: this.account,
      gas: params.gas || 300_000n,
    });

    const hash = await this.walletClient.writeContract(request);
    return this.publicClient.waitForTransactionReceipt({ hash });
  }

  /**
   * Add rewards in batch to the RewardManager contract
   */
  async addRewardBatch(
    params: AddRewardBatchParams
  ): Promise<TransactionReceipt> {
    const { request } = await this.publicClient.simulateContract({
      address: params.address,
      abi: this.REWARD_MANAGER_ABI,
      functionName: "addRewardBatch",
      args: [params.batch, params.rewardType],
      account: this.account,
      gas: params.gas || 300_000n,
    });

    const hash = await this.walletClient.writeContract(request);
    return this.publicClient.waitForTransactionReceipt({ hash });
  }

  /**
   * Claim all rewards for a user
   */
  async claimRewardsAll(
    params: ClaimRewardsParams
  ): Promise<TransactionReceipt> {
    const { request } = await this.publicClient.simulateContract({
      address: params.address,
      abi: this.REWARD_MANAGER_ABI,
      functionName: "claimRewardsAll",
      account: this.account,
      gas: params.gas || 300_000n,
    });

    const hash = await this.walletClient.writeContract(request);
    return this.publicClient.waitForTransactionReceipt({ hash });
  }

  /**
   * Withdraw all ETH from the contract to a recipient
   */
  async withdrawAll(params: WithdrawAllParams): Promise<TransactionReceipt> {
    const { request } = await this.publicClient.simulateContract({
      address: params.address,
      abi: this.REWARD_MANAGER_ABI,
      functionName: "withdrawAll",
      args: [params.recipient],
      account: this.account,
      gas: params.gas || 300_000n,
    });

    const hash = await this.walletClient.writeContract(request);
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    return receipt;
  }

  /**
   * Pause the RewardManager contract
   */
  async pauseContract(params: PauseParams): Promise<TransactionReceipt> {
    const { request } = await this.publicClient.simulateContract({
      address: params.address,
      abi: this.REWARD_MANAGER_ABI,
      functionName: "pause",
      account: this.account,
      gas: params.gas || 300_000n,
    });

    const hash = await this.walletClient.writeContract(request);
    return this.publicClient.waitForTransactionReceipt({ hash });
  }

  /**
   * Unpause the RewardManager contract
   */
  async unpauseContract(params: UnpauseParams): Promise<TransactionReceipt> {
    const { request } = await this.publicClient.simulateContract({
      address: params.address,
      abi: this.REWARD_MANAGER_ABI,
      functionName: "unpause",
      account: this.account,
      gas: params.gas || 300_000n,
    });

    const hash = await this.walletClient.writeContract(request);
    return this.publicClient.waitForTransactionReceipt({ hash });
  }

  async isAdmin(account: Account, rewardManagerAddress: Address): Promise<boolean> {
    return this.publicClient.readContract({
      address: rewardManagerAddress,
      abi: this.REWARD_MANAGER_ABI,
      functionName: "isAdmin",
      args: [account.address],
    }) as Promise<boolean>;
  }

  async isActualReward(rewardId: `0x${string}`, rewardManagerAddress: Address): Promise<boolean> {
    return this.publicClient.readContract({
      address: rewardManagerAddress,
      abi: this.REWARD_MANAGER_ABI,
      functionName: "isActualReward",
      args: [rewardId],
    }) as Promise<boolean>;
  }

  async totalRewardBalance(account: Account, rewardManagerAddress: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: rewardManagerAddress,
      abi: this.REWARD_MANAGER_ABI,
      functionName: "totalRewardBalance",
      args: [account.address],
    }) as Promise<bigint>;
  }

  async minClaimAmount(rewardManagerAddress: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: rewardManagerAddress,
      abi: this.REWARD_MANAGER_ABI,
      functionName: "minClaimAmount",
    }) as Promise<bigint>;
  }

  async isPaused(rewardManagerAddress: Address): Promise<boolean> {
    return this.publicClient.readContract({
      address: rewardManagerAddress,
      abi: this.REWARD_MANAGER_ABI,
      functionName: "paused",
    }) as Promise<boolean>;
  }

  async getRandomAccount(): Promise<Account> {
    const account = privateKeyToAccount(generatePrivateKey());
    return account;
  }
}
