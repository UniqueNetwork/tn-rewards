import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    unique: {
      url: process.env.UNIQUE_RPC_URL || "https://rpc.unique.network",
      chainId: 8880,
      accounts: [`0x${process.env.DEPLOYER_KEY}`, `0x${process.env.OTHER_KEY!}`],
    },
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6"
  }
};

export default config;
