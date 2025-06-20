import { task, types } from "hardhat/config";
import { parseEther } from "viem";

task("deploy", "Deploy RewardManager contract")
  .addParam("minclaim", "Minimum claim amount in ETH", "0.01")
  .addOptionalParam("verify", "Verify contract on block explorer", false, types.boolean)
  .setAction(async (taskArgs, { viem }) => {
    const publicClient = await viem.getPublicClient();
    const [deployer] = await viem.getWalletClients();

    console.log("Deploying RewardManager contract...");
    console.log("Deployer address:", deployer.account.address);
    console.log("Network:", await publicClient.getChainId());

    // Convert minClaimAmount from ETH to wei
    const minClaimAmountWei = parseEther(taskArgs.minClaimAmount);
    console.log(`Minimum claim amount: ${taskArgs.minClaimAmount} ETH (${minClaimAmountWei} wei)`);

    // Check deployer balance
    const balance = await publicClient.getBalance({ 
      address: deployer.account.address 
    });
    console.log(`Deployer balance: ${balance} wei`);

    try {
      // Deploy the contract
      const rewardManager = await viem.deployContract("RewardManager", [
        minClaimAmountWei
      ]);

      console.log("✅ RewardManager deployed successfully!");
      console.log("Contract address:", rewardManager.address);


      // Display contract info
      console.log("\n📋 Contract Information:");
      console.log("========================");
      console.log(`Contract: RewardManager`);
      console.log(`Address: ${rewardManager.address}`);
      console.log(`Owner: ${deployer.account.address}`);
      console.log(`Min Claim Amount: ${taskArgs.minClaimAmount} UNQ`);
      console.log(`Network: ${await publicClient.getChainId()}`);

      return {
        address: rewardManager.address,
      };

    } catch (error) {
      console.error("❌ Deployment failed:", error);
      throw error;
    }
  });