import { expect } from "chai";
import { parseEther, stringToHex, formatEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import config from "../utils/config";
import { setSponsoring } from "../utils/sponsoring";
import { logBalances } from "../utils/logBalances";

let rmAddress: `0x${string}`;
const { owner, admin, other } = config.accounts;
const { txHelper, publicClient } = config;
const MIN_CLAIM = parseEther("0.1"); // Lower minimum for testing
const CONTRACT_BALANCE = parseEther("300"); // Enough for 100 users * 2 ether + buffer
const REWARD_PER_USER = parseEther("1");

const XYZ = stringToHex("XYZ", { size: 3 }) as `0x${string}`; // 0x58595a
const XXX = stringToHex("XXX", { size: 3 }) as `0x${string}`; // 0x585858

// Track setup costs
let setupCost: bigint = 0n;

// Generate 100 random accounts
const generateRandomAccounts = (count: number) => {
  const accounts = [];
  for (let i = 0; i < count; i++) {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    accounts.push(account);
  }
  return accounts;
};

// Helper function to format balance in readable format
const formatBalance = (balance: bigint) => {
  return `${formatEther(balance)} ETH (${balance} wei)`;
};

before(async () => {
  console.log("\n=== BENCHMARK TEST SETUP ===");
  
  // Log initial balances
  await logBalances(owner, other, admin);
  
  const ownerInitialBalance = await publicClient.getBalance({ address: owner.address });
  console.log(`\nOwner initial balance: ${formatBalance(ownerInitialBalance)}`);

  // Deploy contract
  console.log("\n1. Deploying RewardManager contract...");
  const receipt = await txHelper.deployRewardManager({
    minClaimAmount: MIN_CLAIM,
  });
  rmAddress = receipt.contractAddress;
  console.log(`Contract deployed at: ${rmAddress}`);

  // Set sponsoring with owner as sponsor (3rd parameter)
  console.log("\n2. Setting up sponsoring with owner as sponsor...");
  await setSponsoring(rmAddress, owner, owner);

  // Add reward types
  console.log("\n3. Adding reward types...");
  await txHelper.addRewardType({
    address: rmAddress,
    rewardType: XYZ,
  });
  await txHelper.addRewardType({
    address: rmAddress,
    rewardType: XXX,
  });

  // Fund contract from owner's balance
  console.log("\n4. Funding contract...");
  await txHelper.fundContract({
    contractAddress: rmAddress,
    amount: CONTRACT_BALANCE,
  });

  // Add admin to the contract
  console.log("\n5. Adding admin...");
  await txHelper.addAdmin({
    address: rmAddress,
    adminAddress: admin.address,
  });

  const ownerBalanceAfterSetup = await publicClient.getBalance({ address: owner.address });
  const contractBalance = await publicClient.getBalance({ address: rmAddress });
  setupCost = ownerInitialBalance - ownerBalanceAfterSetup - CONTRACT_BALANCE;
  
  console.log(`\nSetup complete:`);
  console.log(`- Owner balance after setup: ${formatBalance(ownerBalanceAfterSetup)}`);
  console.log(`- Contract balance: ${formatBalance(contractBalance)}`);
  console.log(`- Setup cost (deployment + sponsoring setup): ${formatBalance(setupCost)}`);
});

describe("RewardManager Benchmark", function () {
  it("should benchmark batch operations and claims", async () => {
    console.log("\n=== BENCHMARK EXECUTION ===");
    
    // Get initial balance for spending calculation
    const ownerInitialBalanceForTest = await publicClient.getBalance({ address: owner.address });
    
    // Generate 100 random accounts
    console.log("\n1. Generating 100 random accounts...");
    const randomAccounts = generateRandomAccounts(100);
    console.log(`Generated ${randomAccounts.length} random accounts`);

    // Create batch data for first reward distribution
    const firstBatch = randomAccounts.map((account, index) => ({
      user: account.address,
      gameLabel: `game_${index + 1}`,
      amount: REWARD_PER_USER,
    }));

    // First addRewardBatch operation
    console.log("\n2. First addRewardBatch operation (100 users, 1 ether each)...");
    const ownerBalanceBeforeFirstBatch = await publicClient.getBalance({ address: owner.address });
    
    const firstBatchReceipt = await txHelper.connect(admin).addRewardBatch({
      address: rmAddress,
      rewardType: XYZ,
      batch: firstBatch,
      gas: 10_000_000n, // Higher gas limit for large batch
    });

    const ownerBalanceAfterFirstBatch = await publicClient.getBalance({ address: owner.address });
    const firstBatchSponsoringCost = ownerBalanceBeforeFirstBatch - ownerBalanceAfterFirstBatch;
    
    console.log(`First batch results:`);
    console.log(`- Gas used: ${firstBatchReceipt.gasUsed.toLocaleString()}`);
    console.log(`- Owner balance spent (sponsoring): ${formatBalance(firstBatchSponsoringCost)}`);
    console.log(`- Total rewards distributed: ${formatBalance(REWARD_PER_USER * 100n)}`);

    // Create batch data for second reward distribution
    const secondBatch = randomAccounts.map((account, index) => ({
      user: account.address,
      gameLabel: `game_${index + 101}`,
      amount: REWARD_PER_USER,
    }));

    // Second addRewardBatch operation
    console.log("\n3. Second addRewardBatch operation (100 users, 1 ether each)...");
    const ownerBalanceBeforeSecondBatch = await publicClient.getBalance({ address: owner.address });
    
    const secondBatchReceipt = await txHelper.connect(admin).addRewardBatch({
      address: rmAddress,
      rewardType: XXX,
      batch: secondBatch,
      gas: 10_000_000n, // Higher gas limit for large batch
    });

    const ownerBalanceAfterSecondBatch = await publicClient.getBalance({ address: owner.address });
    const secondBatchSponsoringCost = ownerBalanceBeforeSecondBatch - ownerBalanceAfterSecondBatch;
    
    console.log(`Second batch results:`);
    console.log(`- Gas used: ${secondBatchReceipt.gasUsed.toLocaleString()}`);
    console.log(`- Owner balance spent (sponsoring): ${formatBalance(secondBatchSponsoringCost)}`);
    console.log(`- Total rewards distributed: ${formatBalance(REWARD_PER_USER * 100n)}`);

    // Verify total balances for a few random users
    console.log("\n4. Verifying reward balances...");
    const sampleUsers = randomAccounts.slice(0, 3);
    for (const user of sampleUsers) {
      const totalBalance = await txHelper.totalRewardBalance(user, rmAddress);
      console.log(`- User ${user.address.slice(0, 10)}...: ${formatBalance(totalBalance)}`);
      expect(totalBalance).to.equal(REWARD_PER_USER * 2n); // Should have 2 ether total
    }

    // Claim rewards from one random account
    console.log("\n5. Claiming rewards from random account...");
    const randomUser = randomAccounts[Math.floor(Math.random() * randomAccounts.length)];
    const ownerBalanceBeforeClaim = await publicClient.getBalance({ address: owner.address });
    
    const claimReceipt = await txHelper.connect(randomUser).claimRewardsAll({
      address: rmAddress,
      gas: 1_000_000n,
    });

    const ownerBalanceAfterClaim = await publicClient.getBalance({ address: owner.address });
    const claimSponsoringCost = ownerBalanceBeforeClaim - ownerBalanceAfterClaim;
    
    console.log(`Claim results:`);
    console.log(`- Gas used: ${claimReceipt.gasUsed.toLocaleString()}`);
    console.log(`- Owner balance spent (sponsoring): ${formatBalance(claimSponsoringCost)}`);
    console.log(`- User claimed: ${formatBalance(REWARD_PER_USER * 2n)}`);

    // Verify the user's balance is reset
    const userBalanceAfterClaim = await txHelper.totalRewardBalance(randomUser, rmAddress);
    expect(userBalanceAfterClaim).to.equal(0n);
    console.log(`- User balance after claim: ${formatBalance(userBalanceAfterClaim)} (should be 0)`);

    // Final balance summary
    console.log("\n=== FINAL SUMMARY ===");
    const finalOwnerBalance = await publicClient.getBalance({ address: owner.address });
    const finalContractBalance = await publicClient.getBalance({ address: rmAddress });
    
    console.log(`Final balances:`);
    console.log(`- Owner balance: ${formatBalance(finalOwnerBalance)}`);
    console.log(`- Contract balance: ${formatBalance(finalContractBalance)}`);
    
    // Calculate total gas used
    const totalGasUsed = firstBatchReceipt.gasUsed + secondBatchReceipt.gasUsed + claimReceipt.gasUsed;
    console.log(`\nTotal gas used across all operations: ${totalGasUsed.toLocaleString()}`);
    
    // Calculate average gas per user in batches
    const avgGasPerUserFirstBatch = firstBatchReceipt.gasUsed / 100n;
    const avgGasPerUserSecondBatch = secondBatchReceipt.gasUsed / 100n;
    console.log(`Average gas per user (first batch): ${avgGasPerUserFirstBatch.toLocaleString()}`);
    console.log(`Average gas per user (second batch): ${avgGasPerUserSecondBatch.toLocaleString()}`);
    
    // Owner spending breakdown
    const totalOwnerSpent = ownerInitialBalanceForTest - finalOwnerBalance;
    const totalBatchSponsoringCost = firstBatchSponsoringCost + secondBatchSponsoringCost;
    
    console.log(`\n=== OWNER SPENDING BREAKDOWN ===`);
    console.log(`Total owner spending: ${formatBalance(totalOwnerSpent)}`);
    console.log(`Breakdown:`);
    console.log(`- Deployment and setup transactions: ${formatBalance(setupCost)}`);
    console.log(`- Sponsoring addRewardBatch transactions: ${formatBalance(totalBatchSponsoringCost)}`);
    console.log(`  * First batch: ${formatBalance(firstBatchSponsoringCost)}`);
    console.log(`  * Second batch: ${formatBalance(secondBatchSponsoringCost)}`);
    console.log(`- Sponsoring claim transaction: ${formatBalance(claimSponsoringCost)}`);
    
    console.log("\n=== BENCHMARK COMPLETE ===");
  });
});
