import { ethers } from "hardhat";
import { UniqueChain } from '@unique-nft/sdk';
import { Keyring } from "@polkadot/keyring";
import { Address } from "@unique-nft/utils";
import { RewardManager } from "../typechain-types";
import "dotenv/config"; // Убедитесь, что dotenv установлен и настроен
import { mnemonicGenerate } from "@polkadot/util-crypto";
import { ContractHelpersFactory } from '@unique-nft/solidity-interfaces';


async function main() {

  //const contractAddress = "0xfe36e98644238fb5B2Bb521D4e285e9c9449a754";
  //const contractAddress = "0xC7Ac3B2E18268aAd73dF46a302Db6A33dbB5e649"
  const contractAddress = "0x62f97Ba951008E4A77D7C117f63102b9953455D1"
  
  const [admin] = await ethers.getSigners();

  const contractHelpers = await ContractHelpersFactory(admin);
    

  console.log(`Admin (Deployer) EVM Address: ${admin.address}`);

  const userMnemonic = "mercy afford cotton neck regular trigger day target audit kick tag skin"

  const keyring = new Keyring({ type: 'sr25519' });
  const userAccount = keyring.addFromMnemonic(userMnemonic);
  console.log(`Using User Substrate Address: ${userAccount.address}`);

  const userMirroredAddress = Address.mirror.substrateToEthereum(userAccount.address);
  console.log(`User's Mirrored EVM Address: ${userMirroredAddress}`);

  const Factory = await ethers.getContractFactory("RewardManager", admin);
  const rewardManagerAbiString = Factory.interface.formatJson();

  const rm = await ethers.getContractAt("RewardManager", contractAddress, admin);

  console.log(`Contract used: ${contractAddress}`);

  const rewardId = "0x414141";
  console.log(rewardId, 'ID')
  console.log(userMirroredAddress, 'userMirroredAddress')

  const network = await ethers.provider.getNetwork();
  const baseUrl = 'https://rest.unique.network/v2/unique/';
  

  const userRewardCheck = await rm.totalRewardBalance(userMirroredAddress)
  console.log(userRewardCheck, 'RES')

    const uniqueSdk = UniqueChain({ baseUrl });

    const abi =  JSON.parse(rewardManagerAbiString, 'ABI')

    const balanceBefore = await uniqueSdk.balance.get({ address: userAccount.address})
    console.log(abi)
  
    const claimResult = await uniqueSdk.evm.send.fee({
      functionName: "claimRewardsAll",
      functionArgs: [],
      contract: {
        address: contractAddress,
        abi: JSON.parse(rewardManagerAbiString),
    },

  }, {signerAddress: userMirroredAddress});


  //{ _errors: [], signerAddress: { _errors: [ 'Invalid input' ] } }
  console.log(claimResult, 'claimResult')

          const balanceAfter = await uniqueSdk.balance.get({ address: userAccount.address})

          console.log(balanceBefore, 'balanceBefore')
          console.log(balanceAfter, 'balanceAfter')


  const finalBalanceOnContract = await rm.totalRewardBalance(userMirroredAddress);
  console.log(`\nFinal balance on contract for user: ${ethers.formatEther(finalBalanceOnContract)} ETH`);
  
  if (finalBalanceOnContract.toString() !== "0") {
      throw new Error(`Verification failed. Balance on contract should be 0, but it is ${finalBalanceOnContract}`);
  }
  
  console.log("\n✅ E2E Test Passed Successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});