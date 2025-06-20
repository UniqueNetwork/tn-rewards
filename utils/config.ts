import { createWalletClient, createPublicClient, http, webSocket } from 'viem';
import { privateKeyToAccount, generatePrivateKey, mnemonicToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import env from "./env";
import { TransactionHelper } from '../test/helpers/transaction';

interface Config {
  txHelper: TransactionHelper;
  accounts: {
    owner: ReturnType<typeof mnemonicToAccount>;
    other: ReturnType<typeof mnemonicToAccount>;
    admin: ReturnType<typeof mnemonicToAccount>;
    user1: ReturnType<typeof privateKeyToAccount>;
    user2: ReturnType<typeof privateKeyToAccount>;
    user3: ReturnType<typeof privateKeyToAccount>;
  };
  publicClient: ReturnType<typeof createPublicClient>;
  walletClient: ReturnType<typeof createWalletClient>;
  cleanup: () => void;
}

let configInstance: Config | null = null;

const getConfig = (): Config => {
  if (configInstance) {
    return configInstance;
  }

  const { MNEMONIC, DEV_RPC_URL, DEV_CHAIN_ID } = env;

  // Create custom chain based on environment
  const customChain = defineChain({
    id: DEV_CHAIN_ID,
    name: 'Dev Network',
    nativeCurrency: {
      decimals: 18,
      name: 'UNQ',
      symbol: 'UNQ',
    },
    rpcUrls: {
      default: {
        http: [DEV_RPC_URL.replace('wss://', 'https://')],
        webSocket: [DEV_RPC_URL],
      },
    },
  });

  // Create public client for reading from blockchain
  const publicClient = createPublicClient({
    chain: customChain,
    transport: webSocket(DEV_RPC_URL),
  });

  // Create wallet client for transactions
  const walletClient = createWalletClient({
    chain: customChain,
    transport: webSocket(DEV_RPC_URL),
  });

  // Create accounts from mnemonic
  const ownerAccount = mnemonicToAccount(MNEMONIC);
  
  // Derive other accounts from the same mnemonic
  const otherAccount = mnemonicToAccount(MNEMONIC, { path: "m/44'/60'/0'/0/1" });
  const adminAccount = mnemonicToAccount(MNEMONIC, { path: "m/44'/60'/0'/0/2" });

  // Create random accounts for testing
  const user1Account = privateKeyToAccount(generatePrivateKey());
  const user2Account = privateKeyToAccount(generatePrivateKey());
  const user3Account = privateKeyToAccount(generatePrivateKey());

  const txHelper = new TransactionHelper(walletClient, publicClient, ownerAccount);

  // Cleanup function to close socket connections
  const cleanup = () => {
    try {
      // For webSocket transports, we need to access the underlying socket
      if (publicClient.transport.type === 'webSocket') {
        const wsTransport = publicClient.transport as any;
        if (wsTransport.getSocket) {
          wsTransport.getSocket().then((socket: WebSocket) => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.close();
            }
          }).catch(() => {
            // Ignore errors during cleanup
          });
        }
      }
      if (walletClient.transport.type === 'webSocket') {
        const wsTransport = walletClient.transport as any;
        if (wsTransport.getSocket) {
          wsTransport.getSocket().then((socket: WebSocket) => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.close();
            }
          }).catch(() => {
            // Ignore errors during cleanup
          });
        }
      }
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Error during cleanup:', error);
    }
    configInstance = null;
  };

  configInstance = {
    txHelper,
    accounts: {
      owner: ownerAccount,
      other: otherAccount,
      admin: adminAccount,
      user1: user1Account,
      user2: user2Account,
      user3: user3Account,
    },
    publicClient,
    walletClient,
    cleanup,
  };

  return configInstance;
};

// Auto-cleanup on process exit
process.on('exit', () => {
  if (configInstance) {
    configInstance.cleanup();
  }
});

process.on('SIGINT', () => {
  if (configInstance) {
    configInstance.cleanup();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (configInstance) {
    configInstance.cleanup();
  }
  process.exit(0);
});

const config = getConfig();
export default config;
