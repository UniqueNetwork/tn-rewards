import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  mocha: {
    timeout: 1000000,
    require: ["./utils/logBalances.ts"],
  },
  gasReporter: {
    enabled: true,
  },
};

export default config;
