# Simple Blob Poster

A simple application to post blobs to Celestia using Keplr wallet.

## Overview

This application allows you to submit blobs to the Celestia blockchain using the Keplr wallet. It's a minimal implementation that demonstrates how to:

1. Connect to the Keplr wallet
2. Sign transactions using Keplr's amino signer
3. Broadcast transactions to the Celestia network

## Prerequisites

- [Keplr Wallet](https://www.keplr.app/) browser extension installed
- A Celestia account with some TIA tokens (for testnet, you can get tokens from a faucet)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/blobposter-simple.git
cd blobposter-simple
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to the URL shown in the terminal (usually http://localhost:5173).

## Usage

1. Click the "Connect Keplr" button to connect your Keplr wallet.
2. Enter your blob data:
   - **Namespace (base64)**: The namespace for your blob (must be base64 encoded)
   - **Data (base64)**: The data to be stored in the blob (must be base64 encoded)
   - **Gas**: The amount of gas to use for the transaction
   - **Gas Price**: The price of gas in TIA

3. Click the "Submit Blob" button to sign and broadcast the transaction.

## How It Works

The application uses the following process to submit blobs:

1. Connects to the Keplr wallet and gets the user's address
2. Creates a `MsgPayForBlobs` message with the provided namespace and data
3. Signs the transaction using Keplr's amino signer
4. Broadcasts the signed transaction to the Celestia network

## Base64 Encoding

Both the namespace and data must be base64 encoded. You can use online tools or the following JavaScript code to encode your data:

```javascript
// To encode a string to base64
const base64String = btoa("Your string here");

// To encode binary data to base64
const uint8Array = new Uint8Array([1, 2, 3, 4]);
const base64Binary = Buffer.from(uint8Array).toString('base64');
```

## Development

- `npm run dev`: Start the development server
- `npm run build`: Build the application for production
- `npm run preview`: Preview the production build locally

## License

APACHE 2.0
