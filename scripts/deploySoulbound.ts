import hre from 'hardhat';
import {formatUnits, parseUnits} from 'viem/utils';

const contractName = 'SoulboundLevels' as const;

async function main() {
    const [deployer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    const balance = await publicClient.getBalance({address: deployer.account.address});

    console.log(`Deployer Address: ${deployer.account.address} - Balance: ${formatUnits(balance, 18)}`);

    const soulboundCollectionMinter = await hre.viem.deployContract(contractName, [], {
        gas: 3_000_000n,
        value: parseUnits('2', 18), // Collection creation costs 2 UNQ
    });

    // Display contract info
    console.log("\n📋 Contract Information:");
    console.log("========================");
    console.log(`Contract: ${contractName}`);
    console.log(`Address: ${soulboundCollectionMinter.address}`);
    console.log(`Network: ${await publicClient.getChainId()}`);

    const collectionAddress = await soulboundCollectionMinter.read.collectionAddress();
    const collectionId = parseInt(`0x${collectionAddress.slice(-8)}`)

    console.log(`Collection Address: ${collectionAddress}, Collection ID: ${collectionId}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
