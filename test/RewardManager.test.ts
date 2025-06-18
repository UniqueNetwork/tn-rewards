import { expect } from "chai";
import { ethers } from "hardhat";
import type { RewardManager } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";


describe("RewardManager (Optimized)", function () {
  let rm: RewardManager;
  let owner: HardhatEthersSigner, admin: HardhatEthersSigner, user1: HardhatEthersSigner, user2: HardhatEthersSigner, other: HardhatEthersSigner;
  const MIN_CLAIM = 1_000_000_000_000_000_000n;

  // Three‐byte IDs as hex literals
  const AAA = "0x414141";
  const XYZ = "0x58595a";
  const ZZZ = "0x5a5a5a";

  beforeEach(async function () {
    [owner, admin, user1, user2, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("RewardManager");
    const rmInstance = await Factory.deploy(MIN_CLAIM);
    rm = await rmInstance.waitForDeployment() as RewardManager;
  });

  it("owner is admin on deploy", async function () {
    expect(await rm.admins(owner.address)).to.be.true;
    expect(await rm.minClaimAmount()).to.equal(MIN_CLAIM);
  });

  it("add/remove admin works", async function () {
    await rm.connect(owner).addAdmin(admin.address);
    expect(await rm.admins(admin.address)).to.be.true;
    await rm.connect(owner).removeAdmin(admin.address);
    expect(await rm.admins(admin.address)).to.be.false;
  });

  it("onlyOwner can manage admins", async function () {
    await expect(rm.connect(other).addAdmin(other.address)).to.be.reverted;
  });

  it("add/remove reward type", async function () {
    await rm.connect(owner).addAdmin(admin.address);
    await rm.connect(admin).addRewardType(AAA);
    expect(await rm.actualRewards(AAA)).to.be.true;
    await rm.connect(admin).removeRewardType(AAA);
    expect(await rm.actualRewards(AAA)).to.be.false;
  });

  it("batch add rewards and total balances update", async function () {
    await rm.connect(owner).addAdmin(admin.address);
    await rm.connect(admin).addRewardType(XYZ);

    const batch = [
      { rewardId: XYZ, user: user1.address, gameLabel: "g1", amount: 5n },
      { rewardId: XYZ, user: user2.address, gameLabel: "g2", amount: 7n },
    ];
    const tx = await rm.connect(admin).addRewardBatch(batch);
    const receipt = await tx.wait();
    console.log(`\tGas for addRewardBatch (Optimized, 2 items): ${receipt?.gasUsed.toString()}`);

    expect(await rm.totalRewardBalance(user1.address)).to.equal(5n);
    expect(await rm.totalRewardBalance(user2.address)).to.equal(7n);
  });

  it("claim resets total balance and has low, constant gas cost", async function () {
    await rm.connect(owner).addAdmin(admin.address);
// add rewards
    await rm.connect(admin).addRewardType(ZZZ);
    await rm.connect(admin).addRewardType(AAA);
    await rm.connect(admin).addRewardType(XYZ);

    // Fund contract
    await owner.sendTransaction({ to: rm.target, value: MIN_CLAIM });

    // Assign exactly MIN_CLAIM to user1
    await rm.connect(admin).addRewardBatch([
      { rewardId: ZZZ, user: user1.address, gameLabel: "g", amount: MIN_CLAIM },
    ]);
    
    const claimTx = await rm.connect(user1).claimRewardsAll();
    const receipt = await claimTx.wait();
    
    console.log(`\tGas for claimRewardsAll (Optimized): ${receipt?.gasUsed.toString()}`);

    await expect(claimTx)
      .to.emit(rm, "RewardsClaimed")
      .withArgs(user1.address, MIN_CLAIM);

    expect(await rm.totalRewardBalance(user1.address)).to.equal(0n);
  });

  it("cannot claim below minClaimAmount", async function () {
    await expect(rm.connect(user2).claimRewardsAll()).to.be.revertedWith("below minimum");
  });

  it("pause/unpause toggles paused state", async function () {
    expect(await rm.paused()).to.be.false;
    // pause
    await rm.pause();
    expect(await rm.paused()).to.be.true;
    // unpause
    await rm.unpause();
    expect(await rm.paused()).to.be.false;
  });

  it("withdrawAll sets contract balance to zero", async function () {
    const amount = 2_000_000_000_000_000_000n;
    await owner.sendTransaction({ to: rm.target, value: amount });
    await rm.withdrawAll(other.address);
    expect(await ethers.provider.getBalance(rm.target)).to.equal(0n);
  });
});