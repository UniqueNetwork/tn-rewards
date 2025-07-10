import { expect } from "chai";
import { Hex, parseEther, stringToHex } from "viem";
import config from "../utils/config";
import { setSponsoring } from "../utils/sponsoring";
import { logBalances } from "../utils/logBalances";
import { Sr25519Account } from "@unique-nft/sr25519";
import { Address } from "@unique-nft/utils";
import { UniqueChain } from "@unique-nft/sdk";
import env from "../utils/env";
import { abi as rewardManagerAbi } from "../artifacts/contracts/Rewards.sol/RewardManager.json";

let rmAddress: `0x${string}`;
const { owner, admin, other, user1, user2, user3 } = config.accounts;
const { txHelper, publicClient } = config;
const MIN_CLAIM = parseEther("1");
const CONTRACT_BALANCE = parseEther("10");

const XYZ = stringToHex("XYZ", { size: 3 }) as `0x${string}`; // 0x58595a
const XXX = stringToHex("XXX", { size: 3 }) as `0x${string}`; // 0x585858

describe("RewardManager", function () {
  before(async () => {
    await logBalances(owner, other, admin);

    // Deploy contract using configured walletClient to external chain
    const receipt = await txHelper.deployRewardManager({
      minClaimAmount: MIN_CLAIM,
    });

    rmAddress = receipt.contractAddress;

    // Fund contract to allow for claims
    await txHelper.fundContract({
      contractAddress: rmAddress,
      amount: CONTRACT_BALANCE,
    });

    // Add admin to the contract
    await txHelper.addAdmin({
      address: rmAddress,
      adminAddress: admin.address,
    });

    // Add reward type to the contract
    await txHelper.addRewardType({
      address: rmAddress,
      rewardType: XYZ,
    });
    await txHelper.addRewardType({
      address: rmAddress,
      rewardType: XXX,
    });

    // Set sponsoring
    await setSponsoring(rmAddress, owner);
  });

  it("owner is admin on deploy", async () => {
    expect(await txHelper.isAdmin(owner, rmAddress)).to.be.true;

    expect(await txHelper.minClaimAmount(rmAddress)).to.equal(MIN_CLAIM);
  });

  it("add/remove admin works", async () => {
    await txHelper.addAdmin({
      address: rmAddress,
      adminAddress: user3.address,
    });

    expect(await txHelper.isAdmin(user3, rmAddress)).to.be.true;

    await txHelper.removeAdmin({
      address: rmAddress,
      adminAddress: user3.address,
    });

    expect(await txHelper.isAdmin(user3, rmAddress)).to.be.false;
  });

  it("onlyOwner can manage admins", async () => {
    // The `addAdmin` function correctly remains `onlyOwner` for security.
    await expect(
      txHelper.connect(admin).addAdmin({
        address: rmAddress,
        adminAddress: user3.address,
      })
    ).to.be.rejectedWith("OwnableUnauthorizedAccount");
  });

  it("add/remove reward type", async () => {
    const AAA = stringToHex("AAA", { size: 3 }) as `0x${string}`; // 0x414141

    await txHelper.addRewardType({
      address: rmAddress,
      rewardType: AAA,
    });

    expect(await txHelper.isActualReward(AAA, rmAddress)).to.be.true;

    await txHelper.removeRewardType({
      address: rmAddress,
      rewardType: AAA,
    });

    expect(await txHelper.isActualReward(AAA, rmAddress)).to.be.false;
  });

  it("batch add rewards and total balances update", async () => {
    const user1 = Sr25519Account.fromUri(Sr25519Account.generateMnemonic());
    const user1SubstratePublicKey = Address.extract.substratePublicKey(
      user1.address
    ) as Hex;

    const user2 = Sr25519Account.fromUri(Sr25519Account.generateMnemonic());
    const user2SubstratePublicKey = Address.extract.substratePublicKey(
      user2.address
    ) as Hex;

    const batch = [
      {
        substratePublicKey: user1SubstratePublicKey,
        gameLabel: "g1",
        amount: 5n,
      },
      {
        substratePublicKey: user2SubstratePublicKey,
        gameLabel: "g2",
        amount: 7n,
      },
    ];

    const receipt = await txHelper.addRewardBatch({
      address: rmAddress,
      rewardType: XYZ,
      batch: batch,
    });

    expect(
      await txHelper.getRewardBalance({
        address: rmAddress,
        account: Address.extract.substratePublicKey(user1.address) as Hex,
      })
    ).to.equal(5n);

    expect(
      await txHelper.getRewardBalance({
        address: rmAddress,
        account: Address.extract.substratePublicKey(user2.address) as Hex,
      })
    ).to.equal(7n);
  });

  it("cannot claim below minClaimAmount", async () => {
    const randomUser = Sr25519Account.fromUri(
      Sr25519Account.generateMnemonic()
    );
    const randomUserSubstratePublicKey = Address.extract.substratePublicKey(
      randomUser.address
    ) as Hex;
    const sdk = UniqueChain({
      baseUrl: env.UNIQUE_SDK_URL,
      account: randomUser,
    });

    await expect(
      sdk.evm.call({
        contract: {
          address: rmAddress,
          abi: rewardManagerAbi,
        },
        functionName: "claimRewardsAll",
        functionArgs: [randomUserSubstratePublicKey],
        gasLimit: 1_000_000n,
      })
    ).to.be.rejectedWith("below minimum");
  });

  it("withdrawAll sets contract balance to zero", async () => {
    // NOTE: Deploy a new reward manager to avoid interference with the previous one
    // Also self-sponsoring makes assertions complicated because will refund fees to the contract so its balance will be slightly more than zero
    const rewardManager = await txHelper.deployRewardManager({
      minClaimAmount: MIN_CLAIM,
    });
    await txHelper.fundContract({
      contractAddress: rewardManager.contractAddress,
      amount: CONTRACT_BALANCE,
    });

    const otherInitialBalance = await publicClient.getBalance({
      address: other.address,
    });

    await txHelper.withdrawAll({
      address: rewardManager.contractAddress,
      recipient: other.address,
    });

    const contractBalanceAfter = await publicClient.getBalance({
      address: rewardManager.contractAddress,
    });
    const otherBalanceAfter = await publicClient.getBalance({
      address: other.address,
    });

    expect(contractBalanceAfter).to.equal(0n);
    expect(otherBalanceAfter).to.equal(otherInitialBalance + CONTRACT_BALANCE);
  });

  it("pause/unpause toggles paused state", async () => {
    const randomUser = Sr25519Account.fromUri(
      Sr25519Account.generateMnemonic()
    );

    const randomUserSubstratePublicKey = Address.extract.substratePublicKey(
      randomUser.address
    ) as Hex;
    const sdk = UniqueChain({
      baseUrl: env.UNIQUE_SDK_URL,
      account: randomUser,
    });

    expect(await txHelper.isPaused(rmAddress)).to.be.false;

    // Add reward to randomUser to allow for claims
    await txHelper.addRewardBatch({
      address: rmAddress,
      rewardType: XYZ,
      batch: [
        {
          substratePublicKey: randomUserSubstratePublicKey,
          gameLabel: "g",
          amount: MIN_CLAIM,
        },
      ],
    });

    // Pause contract
    await txHelper.pauseContract({
      address: rmAddress,
    });

    expect(await txHelper.isPaused(rmAddress)).to.be.true;

    // User cannot claim until unpaused
    await expect(
      sdk.evm.call({
        contract: {
          address: rmAddress,
          abi: rewardManagerAbi,
        },
        functionName: "claimRewardsAll",
        functionArgs: [randomUserSubstratePublicKey],
        gasLimit: 1_000_000n,
      })
    ).to.be.rejected;

    // Unpause contract
    await txHelper.unpauseContract({
      address: rmAddress,
    });

    expect(await txHelper.isPaused(rmAddress)).to.be.false;

    // User can claim after unpausing
    await sdk.evm.call({
      contract: {
        address: rmAddress,
        abi: rewardManagerAbi,
      },
      functionName: "claimRewardsAll",
      functionArgs: [randomUserSubstratePublicKey],
      gasLimit: 1_000_000n,
    });
  });
});
