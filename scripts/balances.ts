import hre from 'hardhat';
import {formatEther} from 'viem/utils';

async function main() {
    const [deployer] = await hre.viem.getWalletClients();
    const accounts = await hre.viem.getWalletClients();

    const publicClient = await hre.viem.getPublicClient();

    let counter = 0;
    for (const account of accounts) {
        const isDeployer = account.account.address === deployer.account.address;
        const role = isDeployer ? 'Deployer' : '   Other';

        const balance = await publicClient.getBalance({address: account.account.address});
        const balanceFormatted = formatEther(balance);

        const index = (counter++).toString().padStart(3, " ");
        console.log(`${index}. ${role} Account: ${account.account.address}, Balance: ${balance} wei (${balanceFormatted} ETH)`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
