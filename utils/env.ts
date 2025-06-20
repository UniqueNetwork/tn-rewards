import dotenv from "dotenv";
dotenv.config();

const getEnv = () => {
  const { DEV_RPC_URL, DEV_CHAIN_ID, MNEMONIC } = process.env;

  if (!DEV_RPC_URL || !DEV_CHAIN_ID || !MNEMONIC) {
    throw new Error("Missing environment variables");
  }

  return {
    MNEMONIC,
    DEV_RPC_URL,
    DEV_CHAIN_ID: Number(DEV_CHAIN_ID),
  };
};

export default getEnv();
