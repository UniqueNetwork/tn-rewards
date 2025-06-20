import { Address } from "@unique-nft/utils";
import config from "./config";
import { ethers } from "ethers";

export const logBalances = async (owner: typeof config.accounts.owner, other: typeof config.accounts.other, admin: typeof config.accounts.admin) => {
    const [ownerBalance, otherBalance, adminBalance] = await Promise.all([
        config.publicClient.getBalance({ address: owner.address }),
        config.publicClient.getBalance({ address: other.address }),
        config.publicClient.getBalance({ address: admin.address }),
    ]);

    const ownerMirror = Address.mirror.ethereumToSubstrate(owner.address);
    const otherMirror = Address.mirror.ethereumToSubstrate(other.address);
    const adminMirror = Address.mirror.ethereumToSubstrate(admin.address);

    console.log(`Deployer ${owner.address} (${ownerMirror}): ${ethers.formatEther(ownerBalance)} UNQ`);
    console.log(`Other ${other.address} (${otherMirror}): ${ethers.formatEther(otherBalance)} UNQ`);
    console.log(`Admin ${admin.address} (${adminMirror}): ${ethers.formatEther(adminBalance)} UNQ`);

    if (ownerBalance < ethers.parseEther("10")) {
        throw new Error("Owner has less than 10 UNQ");
    }

    if (otherBalance < ethers.parseEther("10")) {
        throw new Error("Other has less than 10 UNQ");
    }

    if (adminBalance < ethers.parseEther("10")) {
        throw new Error("Admin has less than 10 UNQ");
    }
}
