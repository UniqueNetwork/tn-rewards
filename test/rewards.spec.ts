import { expect } from "chai";
import { parseEther, stringToHex } from "viem";
import config from "../utils/config";
import { setSponsoring } from "../utils/sponsoring";
import { logBalances } from "../utils/logBalances";

let rmAddress: `0x${string}`;
const { owner, admin, other, user1, user2, user3 } = config.accounts;
const { txHelper, publicClient } = config;
const MIN_CLAIM = parseEther("1");
const CONTRACT_BALANCE = parseEther("10");

const XYZ = stringToHex("XYZ", { size: 3 }) as `0x${string}`; // 0x58595a
const XXX = stringToHex("XXX", { size: 3 }) as `0x${string}`; // 0x585858

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

describe("RewardManager", function () {
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
    const batch = [
      { user: user1.address, gameLabel: "g1", amount: 5n },
      { user: user2.address, gameLabel: "g2", amount: 7n },
    ];

    const receipt = await txHelper.addRewardBatch({
      address: rmAddress,
      rewardType: XYZ,
      batch: batch,
    });

    expect(await txHelper.totalRewardBalance(user1, rmAddress)).to.equal(5n);

    expect(await txHelper.totalRewardBalance(user2, rmAddress)).to.equal(7n);
  });

  it("claim resets total balance", async () => {
    const randomUser = await txHelper.getRandomAccount();
    // Assign exactly MIN_CLAIM to user1 using the updated batch function
    await txHelper.addRewardBatch({
      address: rmAddress,
      rewardType: XYZ,
      batch: [{ user: randomUser.address, gameLabel: "g", amount: MIN_CLAIM }],
    });

    const claimTx = await txHelper.connect(randomUser).claimRewardsAll({
      address: rmAddress,
    });

    // Check for event emission
    const logs = await publicClient.getLogs({
      address: rmAddress,
      event: {
        type: "event",
        name: "RewardsClaimed",
        inputs: [
          { type: "address", name: "user", indexed: true },
          { type: "uint256", name: "amount", indexed: false },
        ],
      },
      fromBlock: claimTx.blockNumber,
      toBlock: claimTx.blockNumber,
    });

    expect(logs.length).to.be.greaterThan(0);
    expect(logs[0].args.user).to.equal(randomUser.address);
    expect(logs[0].args.amount).to.equal(MIN_CLAIM);

    expect(await txHelper.totalRewardBalance(randomUser, rmAddress)).to.equal(
      0n
    );
  });

  it("cannot claim below minClaimAmount", async () => {
    await expect(
      txHelper.claimRewardsAll({
        address: rmAddress,
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
    expect(await txHelper.isPaused(rmAddress)).to.be.false;

    // Add reward to user2 to allow for claims
    await txHelper.addRewardBatch({
      address: rmAddress,
      rewardType: XYZ,
      batch: [{ user: user2.address, gameLabel: "g", amount: MIN_CLAIM }],
    });

    // Pause contract
    await txHelper.pauseContract({
      address: rmAddress,
    });

    expect(await txHelper.isPaused(rmAddress)).to.be.true;

    // User cannot claim until unpaused
    await expect(
      txHelper.connect(user2).claimRewardsAll({
        address: rmAddress,
      })
    ).to.be.rejectedWith("EnforcedPause");

    // Unpause contract
    await txHelper.unpauseContract({
      address: rmAddress,
    });

    expect(await txHelper.isPaused(rmAddress)).to.be.false;

    // User can claim after unpausing
    await txHelper.connect(user2).claimRewardsAll({
      address: rmAddress,
    });
  });
});
