import { expect } from "chai";
import { Hex, parseEther, stringToHex } from "viem";
import config from "../utils/config";
import { setSponsoring } from "../utils/sponsoring";
import { Sr25519Account } from "@unique-nft/sr25519";
import { UniqueChain } from "@unique-nft/sdk";
import { Address } from "@unique-nft/utils";
import env from "../utils/env";
import {abi as rewardManagerAbi} from "../artifacts/contracts/Rewards.sol/RewardManager.json";

let REWARDS_ADDRESS: `0x${string}`;
const { owner } = config.accounts;
const { txHelper } = config;
const MIN_CLAIM = parseEther("1");
const CONTRACT_BALANCE = parseEther("10");
const REWARD_AMOUNT = parseEther("1");

const XYZ = stringToHex("XYZ", { size: 3 }) as `0x${string}`; // 0x58595a

describe("RewardManager", function () {
  it("The full e2e scenario", async () => {
    // This is a substrate account without any UNQ tokens
    const RANDOM_USER_SUBSTRATE_ACCOUNT = Sr25519Account.fromUri(
      Sr25519Account.generateMnemonic()
    );

    // We get the random user's Public key__ to add a reward for them
    const RANDOM_USER_SUBSTRATE_PUBLIC_KEY =
      Address.extract.substratePublicKey(
        RANDOM_USER_SUBSTRATE_ACCOUNT.address
      ) as Hex;

    // 0. Deploy Rawards contract
    const receipt = await txHelper.deployRewardManager({
      minClaimAmount: MIN_CLAIM,
    });

    REWARDS_ADDRESS = receipt.contractAddress;

    // 1. Fund Rawards contract to allow for claims
    await txHelper.fundContract({
      contractAddress: REWARDS_ADDRESS,
      amount: CONTRACT_BALANCE,
    });

    // 2. Add reward type to the contract
    await txHelper.addRewardType({
      address: REWARDS_ADDRESS,
      rewardType: XYZ,
    });

    // 3. Set sponsoring to allow gasless claims
    await setSponsoring(REWARDS_ADDRESS, owner);

    // 4. The contract owner adds a reward for the random user
    await txHelper.addRewardBatch({
      address: REWARDS_ADDRESS,
      rewardType: XYZ,
      batch: [
        {
          substratePublicKey: RANDOM_USER_SUBSTRATE_PUBLIC_KEY,
          amount: REWARD_AMOUNT,
          gameLabel: XYZ,
        },
      ],
    });

    const userReward = await txHelper.getRewardBalance({
      address: REWARDS_ADDRESS,
      account: RANDOM_USER_SUBSTRATE_PUBLIC_KEY,
    });

    expect(userReward).to.eq(REWARD_AMOUNT);

    // 5. The random user claims the reward using it's substrate public key
    const sdk = UniqueChain({baseUrl: env.UNIQUE_SDK_URL, account: RANDOM_USER_SUBSTRATE_ACCOUNT});

    const tx = await sdk.evm.send({
        contract: {
            address: REWARDS_ADDRESS,
            abi: rewardManagerAbi,
        },
        functionName: "claimRewardsAll",
        functionArgs: [RANDOM_USER_SUBSTRATE_PUBLIC_KEY],
        gasLimit: 1_000_000n,
    });

    expect(tx.result.isSuccessful).to.be.true;

    // USER balance increased
    const balance = await sdk.balance.get(RANDOM_USER_SUBSTRATE_ACCOUNT)
    expect(BigInt(balance.available)).to.eql(REWARD_AMOUNT);

    // claim resets total balance
    const userRewardAfterClaim = await txHelper.getRewardBalance({
      address: REWARDS_ADDRESS,
      account: RANDOM_USER_SUBSTRATE_PUBLIC_KEY,
    });
    expect(userRewardAfterClaim).to.eq(0n);
  });
});
