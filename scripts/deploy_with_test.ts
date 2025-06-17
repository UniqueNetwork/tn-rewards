import { ethers } from "hardhat";

async function main() {
  const [deployer, other] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Other   :", other.address);

  const minClaim = ethers.parseEther("1");
  const Factory = await ethers.getContractFactory("RewardManager", deployer);
  const rm = await Factory.deploy(minClaim);

  await rm.deploymentTransaction()!.wait();
  const REWARD_ID = "0x414141";

  console.log("initial actualRewards:", await rm.actualRewards(REWARD_ID));

  console.log("calling addRewardType...");
  let tx = await rm.addRewardType(REWARD_ID);
  await tx.wait();
  console.log("after add, actualRewards:", await rm.actualRewards(REWARD_ID));

  // remove
  console.log("calling removeRewardType...");
  tx = await rm.removeRewardType(REWARD_ID);
  await tx.wait();
  console.log(
    "after remove, actualRewards:",
    await rm.actualRewards(REWARD_ID)
  );
  await expectRevert(
    () => rm.connect(other).addRewardType(REWARD_ID),
    "other.addRewardType"
  );
  await expectRevert(
    () => rm.connect(other).removeRewardType(REWARD_ID),
    "other.removeRewardType"
  );
}

async function expectRevert(fn: () => Promise<any>, label: string) {
  try {
    await fn();
    console.error(`✗ ${label} did NOT revert`);
  } catch (err: any) {
    console.log(
      `✓ ${label} reverted as expected: ${err.message.split("\n")[0]}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
