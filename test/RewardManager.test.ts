import { expect } from "chai";
import { ethers } from "hardhat";
import type { RewardManager } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("RewardManager", function () {
  let rm: RewardManager;
  let owner: HardhatEthersSigner, admin: HardhatEthersSigner, user1: HardhatEthersSigner, user2: HardhatEthersSigner, other: HardhatEthersSigner;
  const MIN_CLAIM = 1_000_000_000_000_000_000n; // 1 ETH

  const AAA = ethers.encodeBytes32String("AAA").slice(0, 8); // 0x414141
  const XYZ = ethers.encodeBytes32String("XYZ").slice(0, 8); // 0x58595a
  const ZZZ = ethers.encodeBytes32String("ZZZ").slice(0, 8); // 0x5a5a5a

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
    // The `addAdmin` function correctly remains `onlyOwner` for security.
    await expect(rm.connect(other).addAdmin(other.address)).to.be.revertedWithCustomError(rm, "OwnableUnauthorizedAccount");
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
      { user: user1.address, gameLabel: "g1", amount: 5n },
      { user: user2.address, gameLabel: "g2", amount: 7n },
    ];

    const tx = await rm.connect(admin).addRewardBatch(batch, XYZ);
    const receipt = await tx.wait();
    console.log(`\tGas for addRewardBatch (New, 2 items): ${receipt?.gasUsed.toString()}`);

    expect(await rm.totalRewardBalance(user1.address)).to.equal(5n);
    expect(await rm.totalRewardBalance(user2.address)).to.equal(7n);
  });

  it("claim resets total balance", async function () {
    await rm.connect(owner).addAdmin(admin.address);
    await rm.connect(admin).addRewardType(ZZZ);

    // Fund contract to allow for claims
    await owner.sendTransaction({ to: await rm.getAddress(), value: MIN_CLAIM });

    // Assign exactly MIN_CLAIM to user1 using the updated batch function
    await rm.connect(admin).addRewardBatch(
      [{ user: user1.address, gameLabel: "g", amount: MIN_CLAIM }],
      ZZZ
    );
    
    const claimTx = await rm.connect(user1).claimRewardsAll();
    const receipt = await claimTx.wait();
    
    console.log(`\tGas for claimRewardsAll: ${receipt?.gasUsed.toString()}`);

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
    await rm.connect(owner).pause();
    expect(await rm.paused()).to.be.true;
    await rm.connect(owner).unpause();
    expect(await rm.paused()).to.be.false;
  });

  it("withdrawAll sets contract balance to zero", async function () {
    const amount = 2_000_000_000_000_000_000n; // 2 ETH
    await owner.sendTransaction({ to: await rm.getAddress(), value: amount });
    const otherInitialBalance = await ethers.provider.getBalance(other.address);
    await rm.connect(owner).withdrawAll(other.address);
    expect(await ethers.provider.getBalance(await rm.getAddress())).to.equal(0n);
    expect(await ethers.provider.getBalance(other.address)).to.equal(otherInitialBalance + amount);
  });
});