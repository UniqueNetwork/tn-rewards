import dotenv from "dotenv";
dotenv.config();

const getEnv = () => {
  const { DEV_RPC_URL, DEV_CHAIN_ID, DEV_MNEMONIC, UNIQUE_SDK_URL } = process.env;

  if (!DEV_RPC_URL || !DEV_CHAIN_ID || !DEV_MNEMONIC || !UNIQUE_SDK_URL) {
    throw new Error("Missing environment variables");
  }

  return {
    DEV_MNEMONIC,
    DEV_RPC_URL,
    DEV_CHAIN_ID: Number(DEV_CHAIN_ID),
    UNIQUE_SDK_URL,
  };
};

export default getEnv();
