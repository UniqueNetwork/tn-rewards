import hre from 'hardhat';
import {formatUnits, parseUnits} from 'viem/utils';

async function main() {
    const [deployer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const balance = await publicClient.getBalance({address: deployer.account.address});

    console.log(`Deployer Address: ${deployer.account.address} - Balance: ${formatUnits(balance, 18)}`);

    const soulboundCollectionMinter = await hre.viem.deployContract("SoulboundCollectionMinter", [], {
        gas: 3_000_000n,
    });

    // Display contract info
    console.log("\n📋 Contract Information:");
    console.log("========================");
    console.log(`Contract: SoulboundCollectionMinter`);
    console.log(`Address: ${soulboundCollectionMinter.address}`);
    // console.log(`Owner: ${deployer.account.address}`);
    // console.log(`Min Claim Amount: ${taskArgs.minClaimAmount} UNQ`);
    console.log(`Network: ${await publicClient.getChainId()}`);

    const collectionAddress = await soulboundCollectionMinter.write.createSoulboundCollection([
        "Soulbound Collection Name", // name
        "This is sample soulbound collection", // description
        "SCN", // symbol
        "https://example.com/icon.png", // collectionCover
        [
            "https://example.com/image0.png",
            "https://example.com/image1.png",
            "https://example.com/image2.png",
        ], // lvlImages
    ], {value: parseUnits('2', 18)}); // 2 UNQ

    console.log(`\n✅ Soulbound Collection Created: ${collectionAddress}`);

    return {
        address: soulboundCollectionMinter.address,
    };

}

main().catch((error) => {
    // if (error.shortMessage) console.error(`❌ Error: ${error.shortMessage}`);
    console.error(error);
    process.exitCode = 1;
});
