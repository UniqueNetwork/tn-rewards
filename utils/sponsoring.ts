import config from "./config";
import ContractHelpersArtifacts from "../artifacts/@unique-nft/solidity-interfaces/contracts/ContractHelpers.sol/ContractHelpers.json";

const CONTRACT_HELPERS_ABI = ContractHelpersArtifacts.abi;

export const setSponsoring = async (
  contractAddress: `0x${string}`,
  owner: typeof config.accounts.owner
) => {
  const { walletClient, publicClient } = config;

  const contractHelpersAddress =
    "0x842899ecf380553e8a4de75bf534cdf6fbf64049" as `0x${string}`;

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
  await publicClient.waitForTransactionReceipt({ hash: selfSponsoredTx });

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
