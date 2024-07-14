import { useState, useEffect } from "react";

import PropTypes from "prop-types";
import { forwardRef } from "react";
import { useImperativeHandle } from "react";

const abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_singleton",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "initializer",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "saltNonce",
        type: "uint256",
      },
    ],
    name: "createProxyWithNonce",
    outputs: [
      {
        internalType: "contract GnosisSafeProxy",
        name: "proxy",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Gnosis Safe Contract Factory
const factoryContract = "0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC";
const singletonContract = "0xfb1bffC9d739B8D520DaF37dF666da4C687191EA";
export const CreateSafeForm = forwardRef(
  ({ props: { Eth, senderAddress, loading } }, ref) => {
    const initializer =
      "0xb63e800d0000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000017062a1de2fe6b99be3d9d37841fed19f5738040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000" +
      senderAddress.slice(2) +
      "0000000000000000000000000000000000000000000000000000000000000000";
    console.log("Initializer ", initializer);

    const salt = 0;
    useImperativeHandle(ref, () => ({
      async createPayload() {
        const data = Eth.createTransactionData(
          factoryContract,
          abi,
          "createProxyWithNonce",
          [singletonContract, initializer, salt]
        );
        console.log("Encoded data", data);
        const { transaction, payload } = await Eth.createPayload(
          senderAddress,
          factoryContract,
          0,
          data
        );
        return { transaction, payload };
      },

      async afterRelay() {},
    }));
    return (
      <>
        <label className="col-sm-2 col-form-label col-form-label-sm">
          Create new Safe with {senderAddress} as owner
        </label>
      </>
    );
  }
);

CreateSafeForm.propTypes = {
  props: PropTypes.shape({
    senderAddress: PropTypes.string.isRequired,
    loading: PropTypes.bool.isRequired,
    Eth: PropTypes.shape({
      createPayload: PropTypes.func.isRequired,
      createTransactionData: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
};

CreateSafeForm.displayName = "SafeContractView";
