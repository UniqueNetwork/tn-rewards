import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import dotenv from "dotenv";
dotenv.config();

import "./tasks/deploy";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    unique: {
      url: "https://ws.unique.network",
      chainId: 8880,
      accounts: [process.env.PRODUCTION_PRIVATE_KEY!],
    },
    devnode: {
      url: "https://rpc.unique.network",
      chainId: 8880,
      accounts: [process.env.PRODUCTION_PRIVATE_KEY!],
    }
  },
};

export default config;
