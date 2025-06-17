import { ethers } from "hardhat";
import { UniqueChain } from "@unique-nft/sdk";
import { Keyring } from "@polkadot/keyring";
import { Address } from "@unique-nft/utils";
import { RewardManager } from "../typechain-types";
import "dotenv/config"; // Убедитесь, что dotenv установлен и настроен
import { mnemonicGenerate } from "@polkadot/util-crypto";
import { ContractHelpersFactory } from "@unique-nft/solidity-interfaces";

async function main() {
  // --- 1. acoounts set up ---
  const [admin] = await ethers.getSigners();

  const contractHelpers = await ContractHelpersFactory(admin);

  console.log(`Admin (Deployer) EVM Address: ${admin.address}`);
  const userMnemonic = mnemonicGenerate();

  const keyring = new Keyring({ type: "sr25519" });
  const userAccount = keyring.addFromMnemonic(userMnemonic);
  console.log(`Using User Substrate Address: ${userAccount.address}`);

  const userMirroredAddress = Address.mirror.substrateToEthereum(
    userAccount.address
  );
  console.log(`User's Mirrored EVM Address: ${userMirroredAddress}`);

  // --- 2. Contract deploy ---

  console.log("\nDeploying RewardManager contract...");
  const minClaim = ethers.parseEther("1");
  const Factory = await ethers.getContractFactory("RewardManager", admin);
  const rewardManagerAbiString = Factory.interface.formatJson();

  const rm = (await Factory.deploy(minClaim)) as RewardManager;
  await rm.waitForDeployment();
  const contractAddress = await rm.getAddress();
  console.log(`Contract deployed to: ${contractAddress}`);

  (await contractHelpers.selfSponsoredEnable(await rm.getAddress())).wait();

  const hasSponsor = await contractHelpers.hasSponsor(rm.getAddress());
  console.log("Self sponsoring enabled: ", hasSponsor); // true

  const rewardAmount = ethers.parseEther("1");
  const feeData = await ethers.provider.getFeeData();

  const rewardId = "0x414141";
  await rm.addRewardType(rewardId);

  console.log(userMirroredAddress, "userMirroredAddress");

  await (
    await rm.connect(admin).addRewardBatch([
      {
        rewardId,
        user: userMirroredAddress,
        gameLabel: "test",
        amount: rewardAmount,
      },
    ])
  ).wait();
  console.log("Reward successfully added.");

  // --- 3. call Unique-SDK
  const baseUrl = "https://rest.unique.network/v2/unique/";

  const userSdk = UniqueChain({ baseUrl, signer: userAccount });
  console.log("\nUser is calling claimRewardsAll...");

  const claimResult = await userSdk.evm.call({
    functionName: "claimRewardsAll",
    functionArgs: [],
    contract: {
      address: contractAddress,
      abi: JSON.parse(rewardManagerAbiString),
    },
    senderAddress: userMirroredAddress,
  });

  console.log("Claim extrinsic successful!", claimResult);

  // --- 4. Final ---

  console.log("\n✅ E2E Test Passed Successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
