import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import dotenv from "dotenv";
dotenv.config();

import "./tasks/deploy";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    unique: {
      url: "https://ws.unique.network",
      chainId: 8880,
      accounts: [process.env.PRODUCTION_PRIVATE_KEY!],
    },
    devnode: {
      url: "https://rpc.web.uniquenetwork.dev",
      chainId: 8882,
      accounts: [process.env.PRODUCTION_PRIVATE_KEY!],
      ignition: {
        // gasPrice: 10000000n, // 10 Gwei
      }
    }
  },
  ignition:{
    disableFeeBumping: true,               // отключает автоматическое увеличение цены газа
  }
};

export default config;
