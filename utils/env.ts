import dotenv from "dotenv";
dotenv.config();

const getEnv = () => {
  const { DEV_RPC_URL, DEV_CHAIN_ID, DEV_MNEMONIC } = process.env;

  if (!DEV_RPC_URL || !DEV_CHAIN_ID || !DEV_MNEMONIC) {
    throw new Error("Missing environment variables");
  }

  return {
    DEV_MNEMONIC,
    DEV_RPC_URL,
    DEV_CHAIN_ID: Number(DEV_CHAIN_ID),
  };
};

export default getEnv();
