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
const REWARD_PER_USER = parseEther("1");

const XYZ = stringToHex("XYZ", { size: 3 }) as `0x${string}`; // 0x58595a
const XXX = stringToHex("XXX", { size: 3 }) as `0x${string}`; // 0x585858

// Track setup costs
let setupCost: bigint = 0n;

// Generate random accounts
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

// Benchmark function that accepts number of accounts
const runBenchmark = async (numAccounts: number) => {
  const CONTRACT_BALANCE = parseEther((numAccounts * 2 + 500).toString()); // Enough for accounts * 2 ether + buffer

  // Fund contract from owner's balance (enough for largest test)
  await txHelper.fundContract({
    contractAddress: rmAddress,
    amount: CONTRACT_BALANCE,
  });

  console.log(`\n=== BENCHMARK FOR ${numAccounts} ACCOUNTS ===`);

  // Get initial balance for spending calculation
  const ownerInitialBalanceForTest = await publicClient.getBalance({
    address: owner.address,
  });

  // Generate random accounts
  const randomAccounts = generateRandomAccounts(numAccounts);

  // Create batch data for first reward distribution
  const firstBatch = randomAccounts.map((account, index) => ({
    user: account.address,
    gameLabel: `game_${index + 1}`,
    amount: REWARD_PER_USER,
  }));

  // First addRewardBatch operation
  const ownerBalanceBeforeFirstBatch = await publicClient.getBalance({
    address: owner.address,
  });

  const firstBatchReceipt = await txHelper.connect(admin).addRewardBatch({
    address: rmAddress,
    rewardType: XYZ,
    batch: firstBatch,
    gas: 50_000_000n, // Much higher gas limit for large batches
  });

  const ownerBalanceAfterFirstBatch = await publicClient.getBalance({
    address: owner.address,
  });
  const firstBatchSponsoringCost =
    ownerBalanceBeforeFirstBatch - ownerBalanceAfterFirstBatch;

  // Create batch data for second reward distribution
  const secondBatch = randomAccounts.map((account, index) => ({
    user: account.address,
    gameLabel: `game_${index + numAccounts + 1}`,
    amount: REWARD_PER_USER,
  }));

  // Second addRewardBatch operation
  const ownerBalanceBeforeSecondBatch = await publicClient.getBalance({
    address: owner.address,
  });

  const secondBatchReceipt = await txHelper.connect(admin).addRewardBatch({
    address: rmAddress,
    rewardType: XXX,
    batch: secondBatch,
    gas: 50_000_000n, // Much higher gas limit for large batches
  });

  const ownerBalanceAfterSecondBatch = await publicClient.getBalance({
    address: owner.address,
  });
  const secondBatchSponsoringCost =
    ownerBalanceBeforeSecondBatch - ownerBalanceAfterSecondBatch;

  // Verify total balances for a few random users
  const sampleUsers = randomAccounts.slice(0, 3);
  for (const user of sampleUsers) {
    const totalBalance = await txHelper.totalRewardBalance(user, rmAddress);
    expect(totalBalance).to.equal(REWARD_PER_USER * 2n); // Should have 2 ether total
  }

  // Claim rewards from all accounts simultaneously
  const ownerBalanceBeforeClaims = await publicClient.getBalance({
    address: owner.address,
  });

  const claimPromises = randomAccounts.map((user) =>
    txHelper.connect(user).claimRewardsAll({
      address: rmAddress,
      gas: 1_000_000n,
    })
  );

  const claimReceipts = await Promise.all(claimPromises);
  const totalClaimGas = claimReceipts.reduce(
    (sum, receipt) => sum + receipt.gasUsed,
    0n
  );

  const ownerBalanceAfterClaims = await publicClient.getBalance({
    address: owner.address,
  });
  const claimsSponsoringCost =
    ownerBalanceBeforeClaims - ownerBalanceAfterClaims;

  // Verify all user balances are reset
  for (const user of randomAccounts) {
    const userBalanceAfterClaim = await txHelper.totalRewardBalance(
      user,
      rmAddress
    );
    expect(userBalanceAfterClaim).to.equal(0n);
  }

  // Final balance summary
  const finalOwnerBalance = await publicClient.getBalance({
    address: owner.address,
  });
  const finalContractBalance = await publicClient.getBalance({
    address: rmAddress,
  });

  // Calculate total gas used
  const totalGasUsed =
    firstBatchReceipt.gasUsed + secondBatchReceipt.gasUsed + totalClaimGas;

  // Calculate average gas per user in batches
  const avgGasPerUserFirstBatch =
    firstBatchReceipt.gasUsed / BigInt(numAccounts);
  const avgGasPerUserSecondBatch =
    secondBatchReceipt.gasUsed / BigInt(numAccounts);
  const avgGasPerClaim = totalClaimGas / BigInt(numAccounts);

  // Owner spending breakdown
  const totalOwnerSpent = ownerInitialBalanceForTest - finalOwnerBalance;
  const totalBatchSponsoringCost =
    firstBatchSponsoringCost + secondBatchSponsoringCost;

  console.log(`\n=== FINAL SUMMARY FOR ${numAccounts} ACCOUNTS ===`);
  console.log(`Final balances:`);
  console.log(`- Owner balance: ${formatBalance(finalOwnerBalance)}`);
  console.log(`- Contract balance: ${formatBalance(finalContractBalance)}`);

  console.log(`\nGas usage:`);
  console.log(`- Total gas used: ${totalGasUsed.toLocaleString()}`);
  console.log(
    `- Average gas per user (first batch): ${avgGasPerUserFirstBatch.toLocaleString()}`
  );
  console.log(
    `- Average gas per user (second batch): ${avgGasPerUserSecondBatch.toLocaleString()}`
  );
  console.log(`- Average gas per claim: ${avgGasPerClaim.toLocaleString()}`);

  console.log(`\nOwner spending breakdown:`);
  console.log(`- Total owner spending: ${formatBalance(totalOwnerSpent)}`);
  console.log(
    `- Deployment and setup transactions: ${formatBalance(setupCost)}`
  );
  console.log(
    `- Sponsoring addRewardBatch transactions: ${formatBalance(
      totalBatchSponsoringCost
    )}`
  );
  console.log(`  * First batch: ${formatBalance(firstBatchSponsoringCost)}`);
  console.log(`  * Second batch: ${formatBalance(secondBatchSponsoringCost)}`);
  console.log(
    `- Sponsoring claim transactions: ${formatBalance(claimsSponsoringCost)}`
  );
  console.log(
    `- Total rewards distributed: ${formatBalance(
      REWARD_PER_USER * 2n * BigInt(numAccounts)
    )}`
  );

  // Calculate average cost per user for each operation
  const avgCostPerUserFirstBatch = firstBatchSponsoringCost / BigInt(numAccounts);
  const avgCostPerUserSecondBatch = secondBatchSponsoringCost / BigInt(numAccounts);
  const avgCostPerUserClaim = claimsSponsoringCost / BigInt(numAccounts);

  console.log(`\nAverage cost per user:`);
  console.log(`- First batch sponsoring: ${formatBalance(avgCostPerUserFirstBatch)}`);
  console.log(`- Second batch sponsoring: ${formatBalance(avgCostPerUserSecondBatch)}`);
  console.log(`- Claim sponsoring: ${formatBalance(avgCostPerUserClaim)}`);
  console.log(`- Total average cost per user: ${formatBalance(avgCostPerUserFirstBatch + avgCostPerUserSecondBatch + avgCostPerUserClaim)}`);

  return {
    totalGasUsed,
    totalOwnerSpent,
    avgGasPerUserFirstBatch,
    avgGasPerUserSecondBatch,
    avgGasPerClaim,
    totalBatchSponsoringCost,
    claimsSponsoringCost,
  };
};

describe("RewardManager Benchmark", function () {
  before(async () => {
    console.log("\n=== BENCHMARK TEST SETUP ===");

    // Log initial balances
    await logBalances(owner, other, admin);

    const ownerInitialBalance = await publicClient.getBalance({
      address: owner.address,
    });
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

    // Add admin to the contract
    console.log("\n4. Adding admin...");
    await txHelper.addAdmin({
      address: rmAddress,
      adminAddress: admin.address,
    });

    const ownerBalanceAfterSetup = await publicClient.getBalance({
      address: owner.address,
    });
    const contractBalance = await publicClient.getBalance({ address: rmAddress });
    setupCost = ownerInitialBalance - ownerBalanceAfterSetup;

    console.log(`\nSetup complete:`);
    console.log(
        `- Owner balance after setup: ${formatBalance(ownerBalanceAfterSetup)}`
    );
    console.log(`- Contract balance: ${formatBalance(contractBalance)}`);
    console.log(
        `- Setup cost (deployment + sponsoring setup): ${formatBalance(setupCost)}`
    );
  });

  it("should benchmark 100 rewards with simultaneous claims", async () => {
    await runBenchmark(100);
  });

  it("should benchmark 300 rewards with simultaneous claims", async () => {
    await runBenchmark(300);
  });

  it("should benchmark 1000 rewards with simultaneous claims", async () => {
    await runBenchmark(1000);
  });
});
