import { useState, useEffect } from "react";

import PropTypes from "prop-types";
import { forwardRef } from "react";
import { useImperativeHandle } from "react";

// let abi;
// let contract;

export const ArbitraryCallForm = forwardRef(
  ({ props: { Eth, senderAddress, loading } }, ref) => {
    const [abi, setAbi] = useState("");
    const [contractAddr, setContractAddr] = useState("");
    const [contractMethods, setContractMethods] = useState([]);
    const [selectedMethod, setSelectedMethod] = useState("");
    const [input, setInput] = useState([]);
    const [userInput, setUserInput] = useState([]);

    useImperativeHandle(ref, () => ({
      async createPayload() {
        const data = Eth.createTransactionData(
          contractAddr,
          abi,
          selectedMethod,
          userInput
        );
        const { transaction, payload } = await Eth.createPayload(
          senderAddress,
          contractAddr,
          0,
          data
        );
        return { transaction, payload };
      },

      async afterRelay() {},
    }));
    function getMethods(abi) {
      console.log("get Methods called ", abi);
      let parsedAbi = JSON.parse(abi);
      console.log(parsedAbi);

      try {
        parsedAbi = JSON.parse(abi);
        console.log("parsedABI ", parsedAbi);
      } catch {
        return { methods: [] };
      }

      if (!Array.isArray(parsedAbi)) {
        console.log("not array");
        return { methods: [] };
      }

      const methods = parsedAbi
        .filter((e) => {
          if (Object.keys(e).length === 0) {
            return false;
          }

          if (["pure", "view"].includes(e.stateMutability)) {
            return false;
          }

          if (e.type === "fallback" && e.stateMutability === "nonpayable") {
            return false;
          }

          if (e?.type?.toLowerCase() === "event") {
            return false;
          }

          return !e.constant;
        })
        .filter((m) => m.type !== "constructor")
        .map((m) => {
          return {
            inputs: m.inputs || [],
            name: m.name || (m.type === "fallback" ? "fallback" : "receive"),
            payable: (m) => m.payable || m.stateMutability === "payable",
          };
        });
      console.log("methods ", methods);
      return methods;
    }
    function getParameters(methods, methodName) {
      console.log("get parameters");
      const methodToGet = methods.find((obj) => obj.name === methodName);
      console.log(methodToGet.inputs);
      if (methodToGet) setInput(methodToGet.inputs);
    }
    async function onFilterMethods() {
      if (abi.length != 0) {
        setContractMethods(getMethods(abi));
        console.log("Set contract methods ", contractMethods);
      } else {
        console.log("Empty methods");
      }
    }
    async function handleChangeOrClick(value) {
      setSelectedMethod(value);
      console.log("selected ", value);
      getParameters(contractMethods, value);
    }

    return (
      <>
        <div className="row mb-3">
          <div className="form-text">Contract address</div>
          <input onChange={(e) => setContractAddr(e.target.value)}></input>
          <div className="form-text">Input Contract ABI:</div>
          <div className="col-sm-10">
            <input
              type="text"
              className="form-control form-control-sm"
              value={abi}
              onChange={(e) => setAbi(e.target.value)}
              //   disabled
            />
            <button
              style={{
                "border-radius": "8px",
                backgroundColor: "#0080FF",
                color: "white",
                marginTop: "10px",
                marginBottom: "10px",
              }}
              onClick={onFilterMethods}>
              Filter contract methods
            </button>

            {contractMethods.length !== 0 ? (
              <select
                className="form-select"
                aria-describedby="method"
                value={selectedMethod}
                onChange={(e) => {
                  handleChangeOrClick(e.target.value);
                }}
                onClick={(e) => handleChangeOrClick(e.target.value)}>
                {contractMethods.map((method, index) => (
                  <option key={index} value={method.name}>
                    {method.name}
                  </option>
                ))}
              </select>
            ) : (
              <p>No methods</p>
            )}

            {input.length != 0 ? (
              input.map((inp, index) => {
                console.log("inp ", inp.name, "index ", index);
                return (
                  <input
                    key={index}
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={inp.type + " " + inp.name}
                    value={userInput[index] || ""}
                    onChange={(e) => {
                      const newInputs = [...userInput];
                      newInputs[index] = e.target.value;
                      setUserInput(newInputs);
                      console.log("user input ", newInputs);
                    }}
                    //   onChange={(e) => {
                    //     setUserInput((prevInput) => [...prevInput, e.target.value]);
                    //     console.log("user input ", userInput);
                    //   }}
                  />
                );
              })
            ) : (
              <></>
            )}
          </div>
        </div>
      </>
    );
  }
);

ArbitraryCallForm.propTypes = {
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

ArbitraryCallForm.displayName = "ArbitraryContractView";
