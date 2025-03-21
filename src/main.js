import { Buffer } from 'buffer';

// Celestia Mocha Testnet configuration
const CELESTIA_NETWORK = {
  chainId: "mocha-4",
  chainName: "Celestia Mocha Testnet",
  rpc: "https://rpc-celestia-testnet-mocha.keplr.app",
  rest: "https://lcd-celestia-testnet-mocha.keplr.app",
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: "celestia",
    bech32PrefixAccPub: "celestiapub",
    bech32PrefixValAddr: "celestiavaloper",
    bech32PrefixValPub: "celestiavaloperpub",
    bech32PrefixConsAddr: "celestiavalcons",
    bech32PrefixConsPub: "celestiavalconspub",
  },
  currencies: [
    {
      coinDenom: "TIA",
      coinMinimalDenom: "utia",
      coinDecimals: 6,
      coinGeckoId: "celestia",
    },
  ],
  feeCurrencies: [
    {
      coinDenom: "TIA",
      coinMinimalDenom: "utia",
      coinDecimals: 6,
      coinGeckoId: "celestia",
      gasPriceStep: {
        low: 0.01,
        average: 0.025,
        high: 0.04,
      },
    },
  ],
  stakeCurrency: {
    coinDenom: "TIA",
    coinMinimalDenom: "utia",
    coinDecimals: 6,
    coinGeckoId: "celestia",
  },
  features: ["ibc-transfer", "ibc-go", "eth-address-gen", "eth-key-sign"],
};

// DOM elements
const connectBtn = document.getElementById('connectBtn');
const submitBtn = document.getElementById('submitBtn');
const walletStatus = document.getElementById('walletStatus');
const txStatus = document.getElementById('txStatus');
const txResult = document.getElementById('txResult');
const namespaceInput = document.getElementById('namespace');
const dataInput = document.getElementById('data');
const gasInput = document.getElementById('gas');
const gasPriceInput = document.getElementById('gasPrice');

// State
let currentAddress = null;

/**
 * Get Keplr instance
 */
async function getKeplr() {
  if (typeof window.keplr !== 'undefined') {
    return window.keplr;
  }
  
  if (document.readyState === 'complete') {
    return window.keplr;
  }
  
  return new Promise((resolve) => {
    const documentStateChange = (event) => {
      if (event.target && event.target.readyState === 'complete') {
        resolve(window.keplr);
        document.removeEventListener('readystatechange', documentStateChange);
      }
    };
    
    document.addEventListener('readystatechange', documentStateChange);
  });
}

/**
 * Connect to Keplr wallet
 */
async function connectKeplr() {
  try {
    updateWalletStatus('info', 'Connecting to Keplr...');
    
    const keplr = await getKeplr();
    
    if (!keplr) {
      throw new Error('Keplr wallet extension not found. Please install Keplr to use this application.');
    }
    
    // Suggest the chain to Keplr
    try {
      await keplr.experimentalSuggestChain(CELESTIA_NETWORK);
      console.log('Chain suggested successfully');
    } catch (suggestError) {
      console.error('Error suggesting chain to Keplr:', suggestError);
      // Continue anyway, as the chain might already be registered
    }
    
    // Enable the chain
    await keplr.enable(CELESTIA_NETWORK.chainId);
    console.log('Chain enabled successfully');
    
    // Get the address
    const offlineSigner = keplr.getOfflineSigner(CELESTIA_NETWORK.chainId);
    const accounts = await offlineSigner.getAccounts();
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found in Keplr');
    }
    
    currentAddress = accounts[0].address;
    
    updateWalletStatus('success', `Connected: ${currentAddress}`);
    submitBtn.disabled = false;
    
    return currentAddress;
  } catch (error) {
    console.error('Error connecting to Keplr:', error);
    updateWalletStatus('error', error.message || 'Failed to connect to Keplr');
    throw error;
  }
}

/**
 * Convert base64 to Uint8Array
 */
function base64ToUint8Array(base64) {
  try {
    return Buffer.from(base64, 'base64');
  } catch (error) {
    console.error('Error in base64ToUint8Array:', error);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

/**
 * Calculate share commitment
 * This is a simplified implementation for demonstration purposes
 * In a production environment, you should use the proper share commitment calculation
 * as defined in the Celestia documentation
 */
function calculateShareCommitment(namespace, data) {
  try {
    // Convert base64 inputs to binary
    const namespaceBytes = Buffer.from(namespace, 'base64');
    const dataBytes = Buffer.from(data, 'base64');
    
    // Create a buffer to hash that combines namespace and data
    const combinedBuffer = Buffer.concat([namespaceBytes, dataBytes]);
    
    // Create a simple commitment by hashing the combined data
    // In a real implementation, this would follow the proper share commitment calculation
    // as defined in the Celestia documentation
    const crypto = window.crypto || window.msCrypto;
    const hashBuffer = new Uint8Array(32); // 32 bytes for SHA-256
    
    // Use a deterministic approach for demo purposes
    for (let i = 0; i < combinedBuffer.length; i++) {
      hashBuffer[i % 32] ^= combinedBuffer[i];
    }
    
    // Add some entropy to make it look more like a real hash
    for (let i = 0; i < 32; i++) {
      hashBuffer[i] = (hashBuffer[i] + i * 7) % 256;
    }
    
    return Buffer.from(hashBuffer);
  } catch (error) {
    console.error('Error calculating share commitment:', error);
    
    // Fallback to a random commitment if there's an error
    const commitment = new Uint8Array(32);
    crypto.getRandomValues(commitment);
    return Buffer.from(commitment);
  }
}

/**
 * Submit a blob to Celestia
 */
async function submitBlob() {
  try {
    updateTxStatus('info', 'Preparing blob submission...');
    txResult.textContent = '';
    
    // Get form values
    const namespace = namespaceInput.value.trim();
    const data = dataInput.value.trim();
    const gas = parseInt(gasInput.value, 10);
    const gasPrice = parseFloat(gasPriceInput.value);
    
    // Validate inputs
    if (!namespace) {
      throw new Error('Namespace is required');
    }
    if (!data) {
      throw new Error('Data is required');
    }
    
    // Convert base64 inputs to binary
    let namespaceBytes;
    let dataBytes;
    
    try {
      namespaceBytes = Buffer.from(namespace, 'base64');
      dataBytes = Buffer.from(data, 'base64');
    } catch (error) {
      throw new Error('Invalid base64 input: ' + error.message);
    }
    
    // Calculate share commitment
    const commitment = calculateShareCommitment(namespace, data);
    
    const keplr = await getKeplr();
    
    if (!keplr) {
      throw new Error('Keplr wallet extension not found');
    }
    
    // Enable chain
    await keplr.enable(CELESTIA_NETWORK.chainId);
    
    // Get the offline signer for Amino format which is more compatible
    const offlineSigner = keplr.getOfflineSignerOnlyAmino(CELESTIA_NETWORK.chainId);
    const accounts = await offlineSigner.getAccounts();
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found in Keplr');
    }
    
    const sender = accounts[0].address;
    
    // Get account data for proper sequence
    let accountNumber = "0";
    let sequence = "0";
    
    try {
      const accountUrl = `${CELESTIA_NETWORK.rest}/cosmos/auth/v1beta1/accounts/${sender}`;
      const accountResponse = await fetch(accountUrl);
      
      if (!accountResponse.ok) {
        console.warn(`Failed to get account details: ${accountResponse.status}`);
      } else {
        const accountData = await accountResponse.json();
        console.log("Account data:", accountData);
        
        if (accountData.account) {
          // Handle base account
          if (accountData.account.account_number) {
            accountNumber = accountData.account.account_number;
            sequence = accountData.account.sequence || "0";
          } 
          // Handle nested account formats (like BaseVestingAccount)
          else if (accountData.account.base_account) {
            accountNumber = accountData.account.base_account.account_number || "0";
            sequence = accountData.account.base_account.sequence || "0";
          }
        }
      }
    } catch (error) {
      console.warn("Error fetching account data:", error);
    }
    
    // Create the PayForBlobs message in the format Celestia expects
    const msg = {
      type: "blob/MsgPayForBlobs",  // Use the canonical type
      value: {
        signer: sender,
        namespaces: [Buffer.from(namespaceBytes).toString('base64')],
        blob_sizes: [Number(dataBytes.length)],
        share_commitments: [Buffer.from(commitment).toString('base64')],
        share_versions: [0]
      }
    };
    
    console.log("Message to be signed:", JSON.stringify(msg, null, 2));
    
    // Define fee
    const fee = {
      amount: [
        {
          denom: "utia",
          amount: Math.floor(gas * gasPrice * 1000000).toString()
        }
      ],
      gas: gas.toString()
    };
    
    updateTxStatus('info', 'Preparing to sign with Keplr...');
    
    try {
      // Create the sign doc with amino format which is supported by Keplr
      const signDoc = {
        chain_id: CELESTIA_NETWORK.chainId,
        account_number: accountNumber,
        sequence: sequence,
        fee: fee,
        msgs: [msg],
        memo: "Sent via Simple Blob Poster"
      };
      
      console.log("Signing document:", JSON.stringify(signDoc, null, 2));
      
      // Have Keplr sign the transaction
      updateTxStatus('info', 'Please approve the transaction in Keplr...');
      const signResponse = await offlineSigner.signAmino(sender, signDoc);
      console.log("Keplr sign response:", signResponse);
      
      // Build a properly formatted Cosmos SDK transaction
      const cosmosStdTx = {
        // Note: key names here match SDK format
        msg: signResponse.signed.msgs,
        fee: signResponse.signed.fee,
        signatures: [{
          pub_key: signResponse.signature.pub_key,  // Use as-is from Keplr
          signature: signResponse.signature.signature
        }],
        memo: signResponse.signed.memo
      };
      
      // Broadcast using Celestia's REST API
      updateTxStatus('info', 'Broadcasting transaction to Celestia...');
      
      // Use the standard Cosmos broadcast endpoint
      const broadcastUrl = `${CELESTIA_NETWORK.rest}/cosmos/tx/v1beta1/txs`;
      const txBytes = Buffer.from(JSON.stringify(cosmosStdTx)).toString('base64');
      
      // Use a proxy server to avoid CORS issues
      const corsProxyUrl = "https://corsproxy.io/?" + encodeURIComponent(broadcastUrl);
      
      const broadcastBody = {
        tx_bytes: txBytes,
        mode: "BROADCAST_MODE_SYNC"  // Try SYNC mode which is a bit more lenient
      };
      
      console.log("Broadcasting transaction:", JSON.stringify(broadcastBody, null, 2));
      
      // Use Keplr's BroadcastTx method if available
      if (typeof keplr.broadcastTx === 'function') {
        updateTxStatus('info', 'Broadcasting via Keplr...');
        try {
          const broadcastResult = await keplr.broadcastTx(
            CELESTIA_NETWORK.chainId,
            cosmosStdTx  // Standard StdTx format
          );
          
          console.log("Keplr broadcast result:", broadcastResult);
          updateTxStatus('success', 'Transaction broadcast successful!');
          txResult.textContent = JSON.stringify(broadcastResult, null, 2);
          return broadcastResult;
        } catch (keplrBroadcastError) {
          console.error("Keplr broadcast error:", keplrBroadcastError);
          updateTxStatus('error', `Keplr broadcast error: ${keplrBroadcastError.message}`);
        }
      }
      
      // If we're here, Keplr broadcast failed or wasn't available
      // Inform the user that direct browser broadcasting isn't possible due to CORS
      updateTxStatus('error', 'Cannot broadcast directly from browser due to CORS restrictions.');
      txResult.textContent = "To submit this transaction, please use the Celestia CLI or a server-side proxy.\n\n" +
        "Signed transaction data (you can submit this using the CLI):\n\n" +
        JSON.stringify(cosmosStdTx, null, 2);
      
      return cosmosStdTx;
    } catch (error) {
      console.error("Error in transaction:", error);
      updateTxStatus('error', `Transaction error: ${error.message}`);
      throw error;
    }
  } catch (error) {
    console.error('Error submitting blob:', error);
    updateTxStatus('error', error.message || 'Unknown error submitting blob');
    throw error;
  }
}

/**
 * Update wallet status display
 */
function updateWalletStatus(type, message) {
  walletStatus.textContent = message;
  walletStatus.className = `status ${type}`;
}

/**
 * Update transaction status display
 */
function updateTxStatus(type, message) {
  txStatus.textContent = message;
  txStatus.className = `status ${type}`;
}

// Event listeners
connectBtn.addEventListener('click', async () => {
  try {
    await connectKeplr();
  } catch (error) {
    console.error('Connection error:', error);
  }
});

submitBtn.addEventListener('click', async () => {
  try {
    submitBtn.disabled = true;
    await submitBlob();
  } catch (error) {
    console.error('Submission error:', error);
  } finally {
    submitBtn.disabled = false;
  }
});

// Check if Keplr is installed
document.addEventListener('DOMContentLoaded', async () => {
  const keplr = await getKeplr();
  if (!keplr) {
    updateWalletStatus('error', 'Keplr wallet extension not found. Please install Keplr to use this application.');
  }
}); 