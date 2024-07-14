import { useState, useEffect } from "react";
import { Web3 } from "web3";
import PropTypes from "prop-types";
import { forwardRef } from "react";
import { useImperativeHandle } from "react";

const abi = [
  { inputs: [], name: "NotEnoughETH", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "maxETH", type: "uint256" },
    ],
    name: "SwapNativeToToken",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];
const contract = "0x2cB51840A095B25ab7Bf2c06A13cF96eCEfF3172";
const web3 = new Web3("https://rpc2.sepolia.org");
export const SwapCallForm = forwardRef(
  ({ props: { Eth, senderAddress, loading } }, ref) => {
    const [amountToSwap, setAmountToSwap] = useState(0.0001);
    const [tokenAddress, setTokenAddress] = useState("");

    const [contractAddr, setContractAddr] = useState("");

    useImperativeHandle(ref, () => ({
      async createPayload() {
        const data = Eth.createTransactionData(
          contract,
          abi,
          "SwapNativeToToken",
          [tokenAddress, BigInt(web3.utils.toWei(amountToSwap, "ether"))]
        );
        const { transaction, payload } = await Eth.createPayload(
          senderAddress,
          contract,
          amountToSwap,
          data
        );
        return { transaction, payload };
      },

      async afterRelay() {},
    }));

    return (
      <>
        <div className="row mb-3">
          <div className="form-text">Contract address</div>
          <div className="col-sm-10">
            <input
              type="text"
              className="form-control form-control-sm"
              value={contractAddr}
              onChange={(e) => setContractAddr(e.target.value)}
            />
          </div>
        </div>
        <div className="row mb-3">
          <div className="row mb-3">
            <div className="form-text">Token Address to swap</div>
          </div>

          <div className="col-sm-10">
            <input
              type="text"
              className="form-control form-control-sm"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              //   step="1"
              //   disabled={loading}
            />
          </div>

          <div className="row mb-3">
            <div className="form-text">Min amount of ETH</div>
          </div>
          <div className="col-sm-10">
            <input
              type="number"
              className="form-control form-control-sm"
              value={amountToSwap}
              onChange={(e) => setAmountToSwap(e.target.value)}
              //   step="1"
              //   disabled={loading}
            />
          </div>
        </div>
      </>
    );
  }
);

SwapCallForm.propTypes = {
  props: PropTypes.shape({
    senderAddress: PropTypes.string.isRequired,
    loading: PropTypes.bool.isRequired,
    Eth: PropTypes.shape({
      createPayload: PropTypes.func.isRequired,
      createTransactionData: PropTypes.func.isRequired,
      getContractViewFunction: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
};

SwapCallForm.displayName = "SwapContractView";
