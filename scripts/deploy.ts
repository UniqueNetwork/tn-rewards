import { ethers } from "hardhat";

async function main() {
  const minClaimAmount = ethers.parseEther("1");
  const Factory = await ethers.getContractFactory("RewardManager");

  const rm = await Factory.deploy(minClaimAmount);
  await rm.deploymentTransaction()!.wait();

  console.log("RewardManager deployed at:", rm.target);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
