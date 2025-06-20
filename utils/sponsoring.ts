import config from "./config";
import ContractHelpersArtifacts from "../artifacts/@unique-nft/solidity-interfaces/contracts/ContractHelpers.sol/ContractHelpers.json";
import { Account, Address } from "viem";

const CONTRACT_HELPERS_ABI = ContractHelpersArtifacts.abi;
const contractHelpersAddress = "0x842899ecf380553e8a4de75bf534cdf6fbf64049" as Address;

export const setSponsoring = async (
  contractAddress: Address,
  owner: typeof config.accounts.owner,
  sponsor?: Account
) => {
  const { walletClient, publicClient } = config;

  if (sponsor) {
    await setAccountSponsoring(contractAddress, owner, sponsor);
  } else {
    await setSelfSponsoring(contractAddress, owner);
  }

  // Set rate limit 0 (every tx will be sponsored)
  const rateLimitTx = await walletClient.writeContract({
    address: contractHelpersAddress,
    abi: CONTRACT_HELPERS_ABI,
    functionName: "setSponsoringRateLimit",
    args: [contractAddress, 0n],
    gas: 300_000n,
    account: owner,
    chain: config.publicClient.chain,
  });
  await publicClient.waitForTransactionReceipt({ hash: rateLimitTx });

  // Set Generous mode
  const modeTx = await walletClient.writeContract({
    address: contractHelpersAddress,
    abi: CONTRACT_HELPERS_ABI,
    functionName: "setSponsoringMode",
    args: [contractAddress, 2n],
    gas: 300_000n,
    account: owner,
    chain: config.publicClient.chain,
  });
  await publicClient.waitForTransactionReceipt({ hash: modeTx });
};

const setSelfSponsoring = async (contractAddress: Address, owner: typeof config.accounts.owner) => {
  const { walletClient, publicClient } = config;

  // Enable self-sponsoring
  const selfSponsoredTx = await walletClient.writeContract({
    address: contractHelpersAddress,
    abi: CONTRACT_HELPERS_ABI,
    functionName: "selfSponsoredEnable",
    args: [contractAddress],
    gas: 300_000n,
    account: owner,
    chain: config.publicClient.chain,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: selfSponsoredTx });

  if (receipt.status === "reverted") {
    throw new Error("Failed to enable self-sponsoring");
  }

  return receipt;
}

const setAccountSponsoring = async (contractAddress: Address, owner: Account, sponsor: Account) => {
  const { walletClient, publicClient } = config;

  // Enable self-sponsoring
  const setSponsorTx = await walletClient.writeContract({
    address: contractHelpersAddress,
    abi: CONTRACT_HELPERS_ABI,
    functionName: "setSponsor",
    args: [contractAddress, sponsor.address],
    gas: 300_000n,
    account: owner,
    chain: config.publicClient.chain,
  });

  const setSponsorReceipt = await publicClient.waitForTransactionReceipt({ hash: setSponsorTx });

  if (setSponsorReceipt.status === "reverted") {
    throw new Error("Failed to enable self-sponsoring");
  }

  const confirmSponsorTx = await walletClient.writeContract({
    address: contractHelpersAddress,
    abi: CONTRACT_HELPERS_ABI,
    functionName: "confirmSponsorship",
    args: [contractAddress],
    gas: 300_000n,
    account: sponsor,
    chain: config.publicClient.chain,
  });

  const confirmSponsorReceipt = await publicClient.waitForTransactionReceipt({ hash: confirmSponsorTx });

  if (confirmSponsorReceipt.status === "reverted") {
    throw new Error("Failed to confirm sponsorship");
  }

  return confirmSponsorReceipt;
}