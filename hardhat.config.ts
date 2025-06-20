import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import env from "./utils/env";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    unique: {
      url: "https://ws.unique.network",
      chainId: 8880,
    },
  },
  mocha: {
    timeout: 1000000,
    require: ["./utils/logBalances.ts"],
  },
};

export default config;
