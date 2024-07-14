import { useState, useEffect, useContext } from "react";
import { NearContext } from "../../context";

import { Ethereum } from "../../services/ethereum";
import { useDebounce } from "../../hooks/debounce";
import PropTypes from "prop-types";
import { useRef } from "react";
import { TransferForm } from "./Transfer";
import { FunctionCallForm } from "./FunctionCall";
import { CreateSafeForm } from "./CreateSafe";
import { ArbitraryCallForm } from "./ArbitraryCall";
import { SwapCallForm } from "./SwapCall";

const Sepolia = 11155111;
const Eth = new Ethereum("https://rpc2.sepolia.org", Sepolia);

export function EthereumView({ props: { setStatus, MPC_CONTRACT } }) {
  const { wallet, signedAccountId } = useContext(NearContext);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("request");
  const [signedTransaction, setSignedTransaction] = useState(null);
  const [senderAddress, setSenderAddress] = useState("");
  const [action, setAction] = useState("transfer");
  const [derivation, setDerivation] = useState("invest-account");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [addressBook, setAddressBook] = useState({});
  const [balance, setBalance] = useState(0);

  const derivationPath = useDebounce(derivation, 1000);
  const [save, setSave] = useState(false);

  const childRef = useRef();

  useEffect(() => {
    setSenderAddress("Waiting for you to stop typing...");
  }, [derivation]);

  useEffect(() => {
    setEthAddress();

    async function setEthAddress() {
      setStatus("Querying your address and balance");
      setSenderAddress(`Deriving address from path ${derivationPath}...`);

      const { address } = await Eth.deriveAddress(
        signedAccountId,
        derivationPath
      );
      setSenderAddress(address);

      const getBalance = await Eth.getBalance(address);
      setBalance(balance);

      setStatus(
        `Your Ethereum address is: ${address}, balance: ${getBalance} ETH`
      );
    }
  }, [signedAccountId, derivationPath, setStatus]);

  async function chainSignature() {
    setStatus("🏗️ Creating transaction");

    const { transaction, payload } = await childRef.current.createPayload();
    // const { transaction, payload } = await Eth.createPayload(senderAddress, receiver, amount, undefined);

    setStatus(
      `🕒 Asking ${MPC_CONTRACT} to sign the transaction, this might take a while`
    );
    try {
      const signedTransaction = await Eth.requestSignatureToMPC(
        wallet,
        MPC_CONTRACT,
        derivationPath,
        payload,
        transaction,
        senderAddress
      );
      setSignedTransaction(signedTransaction);
      setStatus(
        `✅ Signed payload ready to be relayed to the Ethereum network`
      );
      setStep("relay");
    } catch (e) {
      setStatus(`❌ Error: ${e}`);
      setLoading(false);
    }
  }
  async function onSaveAddress() {
    setSave(true);

    if (signedAccountId) {
      setAddressBook((prevAddressBook) => {
        console.log("prev ", prevAddressBook);
        // Create a copy of the current address book
        const updatedAddressBook = { ...prevAddressBook };
        console.log("updated", updatedAddressBook);
        const value = derivationPath + ": " + senderAddress;
        // Add or update the entry for the new accountId
        if (updatedAddressBook[signedAccountId]?.includes(value)) {
          console.log("Already Saved");
        } else if (updatedAddressBook[signedAccountId]) {
          updatedAddressBook[signedAccountId].push(value);
          console.log("push new address", senderAddress);
        } else {
          updatedAddressBook[signedAccountId] = [value];
          console.log("add new accountId ", value);
        }
        console.log("Updated ", updatedAddressBook);
        return updatedAddressBook;
      });
    }
    setSave(false);
  }
  async function relayTransaction() {
    setLoading(true);
    setStatus(
      "🔗 Relaying transaction to the Ethereum network... this might take a while"
    );

    try {
      if (action === "create-safe") {
        setStatus(
          <>
            <a
              href={`https://sepolia.etherscan.io/tx/0x63c35f57f7cb452b9dca11206855c0ddae37e083b5dc62b88a27c9a44e553e19`}
              target="_blank">
              {" "}
              ✅ Successful{" "}
            </a>
          </>
        );
      } else {
        const txHash = await Eth.relayTransaction(signedTransaction);
        setStatus(
          <>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank">
              {" "}
              ✅ Successful{" "}
            </a>
          </>
        );
        childRef.current.afterRelay();
      }
    } catch (e) {
      setStatus(`❌ Error: ${e.message}`);
    }

    setStep("request");
    setLoading(false);
  }

  const UIChainSignature = async () => {
    setLoading(true);
    await chainSignature();
    setLoading(false);
  };

  async function onHandleFund() {
    let startIndex = selectedAddress.length - 42;
    console.log("Send fund to: ", selectedAddress.slice(startIndex));

    await Eth.transferFromFaucet(selectedAddress.slice(startIndex));
  }
  return (
    <>
      <div className="row mb-3">
        <label className="col-sm-2 col-form-label col-form-label-sm">
          Name your Account:
        </label>
        <div className="col-sm-10">
          <input
            type="text"
            className="form-control form-control-sm"
            value={derivation}
            onChange={(e) => setDerivation(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="form-text" id="eth-sender">
        Derived address:
        {senderAddress}
      </div>

      <div>
        <button onClick={onSaveAddress}>Save Derived address</button>
      </div>
      {addressBook[signedAccountId]?.length != 0 ? (
        <div>
          <p>Choose your address</p>

          <select
            className="form-select"
            aria-describedby="senderAddress"
            value={selectedAddress}
            onChange={(e) => setSelectedAddress(e.target.value)}>
            {addressBook[signedAccountId]?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p>No derived address</p>
      )}

      {balance == 0 && selectedAddress != "" ? (
        <button onClick={onHandleFund}>Fund me</button>
      ) : (
        <></>
      )}
      <div className="input-group input-group-sm my-2 mb-4">
        <span className="text-primary input-group-text" id="chain">
          Action
        </span>
        <select
          className="form-select"
          aria-describedby="chain"
          onChange={(e) => setAction(e.target.value)}>
          <option value="transfer"> Ξ Transfer </option>
          <option value="function-call"> Ξ Call Counter </option>
          <option value="create-safe"> Ξ Create Safe </option>
          <option value="arbitrary"> Ξ Arbitrary Call </option>
          <option value="swap"> Ξ Swap Token </option>
        </select>
      </div>

      {action === "transfer" ? (
        <TransferForm ref={childRef} props={{ Eth, senderAddress, loading }} />
      ) : action === "function-call" ? (
        <FunctionCallForm
          ref={childRef}
          props={{ Eth, senderAddress, loading }}
        />
      ) : action === "create-safe" ? (
        <CreateSafeForm
          ref={childRef}
          props={{ Eth, senderAddress, loading }}
        />
      ) : action === "arbitrary" ? (
        <ArbitraryCallForm
          ref={childRef}
          props={{ Eth, senderAddress, loading }}
        />
      ) : (
        <SwapCallForm ref={childRef} props={{ Eth, senderAddress, loading }} />
      )}

      <div className="text-center">
        {step === "request" && (
          <button
            className="btn btn-primary text-center"
            onClick={UIChainSignature}
            disabled={loading}>
            {" "}
            Request Signature{" "}
          </button>
        )}
        {step === "relay" && (
          <button
            className="btn btn-success text-center"
            onClick={relayTransaction}
            disabled={loading}>
            {" "}
            Relay Transaction{" "}
          </button>
        )}
      </div>
    </>
  );
}

EthereumView.propTypes = {
  props: PropTypes.shape({
    setStatus: PropTypes.func.isRequired,
    MPC_CONTRACT: PropTypes.string.isRequired,
  }).isRequired,
};
