import { Web3 } from "web3";
import { bytesToHex } from "@ethereumjs/util";
import { FeeMarketEIP1559Transaction } from "@ethereumjs/tx";
import {
  deriveChildPublicKey,
  najPublicKeyStrToUncompressedHexPoint,
  uncompressedHexPointToEvmAddress,
} from "../services/kdf";
import { Common } from "@ethereumjs/common";
import { Contract, JsonRpcProvider } from "ethers";
import "dotenv/config";

export class Ethereum {
  constructor(chain_rpc, chain_id) {
    this.web3 = new Web3(chain_rpc);
    this.provider = new JsonRpcProvider(chain_rpc);
    this.chain_id = chain_id;
    this.queryGasPrice();
  }

  async transferFromFaucet(receiverAddress) {
    const faucet = "0xc16aDE9Cc14E7D3BC7C427240a1Fa5f2EdCD66CC";
    const nonce = await this.web3.eth.getTransactionCount(faucet, "latest"); // 'latest' for the latest block
    const { maxFeePerGas, maxPriorityFeePerGas } = await this.queryGasPrice();

    const transactionData = {
      nonce,
      gasLimit: 50_000,
      maxFeePerGas,
      maxPriorityFeePerGas,
      to: receiverAddress,
      value: BigInt(this.web3.utils.toWei("0.001", "ether")),
      chain: this.chain_id,
    };
    console.log("faucet priv key ", import.meta.env.VITE_FAUCET_PRIVATE_KEY);
    const signedTx = await this.web3.eth.accounts.signTransaction(
      transactionData,
      import.meta.env.VITE_FAUCET_PRIVATE_KEY
    );
    console.log("Signed ", signedTx);
    const tx = await this.web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );
  }
  async deriveAddress(accountId, derivation_path) {
    const publicKey = await deriveChildPublicKey(
      najPublicKeyStrToUncompressedHexPoint(),
      accountId,
      derivation_path
    );
    const address = await uncompressedHexPointToEvmAddress(publicKey);
    return { publicKey: Buffer.from(publicKey, "hex"), address };
  }

  async queryGasPrice() {
    const maxFeePerGas = await this.web3.eth.getGasPrice();
    const maxPriorityFeePerGas = await this.web3.eth.getMaxPriorityFeePerGas();
    return { maxFeePerGas, maxPriorityFeePerGas };
  }

  async getBalance(accountId) {
    const balance = await this.web3.eth.getBalance(accountId);
    const ONE_ETH = 1000000000000000000n;
    return Number((balance * 100n) / ONE_ETH) / 100;
  }

  async getContractViewFunction(receiver, abi, methodName, args = []) {
    const contract = new Contract(receiver, abi, this.provider);

    return await contract[methodName](...args);
  }

  createTransactionData(receiver, abi, methodName, args = []) {
    const contract = new Contract(receiver, abi);

    return contract.interface.encodeFunctionData(methodName, args);
  }

  async createPayload(sender, receiver, amount, data) {
    const common = new Common({ chain: this.chain_id });

    // Get the nonce & gas price
    const nonce = await this.web3.eth.getTransactionCount(sender);
    const { maxFeePerGas, maxPriorityFeePerGas } = await this.queryGasPrice();

    // Construct transaction
    const transactionData = {
      nonce,
      gasLimit: 50_000,
      maxFeePerGas,
      maxPriorityFeePerGas,
      to: receiver,
      data: data,
      value: BigInt(this.web3.utils.toWei(amount, "ether")),
      chain: this.chain_id,
    };

    // Return the message hash
    const transaction = FeeMarketEIP1559Transaction.fromTxData(
      transactionData,
      { common }
    );
    const payload = transaction.getHashedMessageToSign();
    return { transaction, payload };
  }

  async requestSignatureToMPC(
    wallet,
    contractId,
    path,
    ethPayload,
    transaction,
    sender
  ) {
    // Ask the MPC to sign the payload
    const payload = Array.from(ethPayload.reverse());
    const [big_r, big_s] = await wallet.callMethod({
      contractId,
      method: "sign",
      args: { payload, path, key_version: 0 },
      gas: "250000000000000",
    });

    // reconstruct the signature
    const r = Buffer.from(big_r.substring(2), "hex");
    const s = Buffer.from(big_s, "hex");

    const candidates = [0n, 1n].map((v) => transaction.addSignature(v, r, s));
    const signature = candidates.find(
      (c) =>
        c.getSenderAddress().toString().toLowerCase() === sender.toLowerCase()
    );

    if (!signature) {
      throw new Error("Signature is not valid");
    }

    if (signature.getValidationErrors().length > 0)
      throw new Error("Transaction validation errors");
    if (!signature.verifySignature()) throw new Error("Signature is not valid");

    return signature;
  }

  // This code can be used to actually relay the transaction to the Ethereum network
  async relayTransaction(signedTransaction) {
    const serializedTx = bytesToHex(signedTransaction.serialize());
    const relayed = await this.web3.eth.sendSignedTransaction(serializedTx);
    return relayed.transactionHash;
  }
}
