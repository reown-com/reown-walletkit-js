import { isValidChainId, parseChainId } from "@walletconnect/utils";
import { POSClientTypes } from "../types";
import { SUPPORTED_NAMESPACES } from "../constants/chains";

export const isValidToken = (token: POSClientTypes.Token) => {
  const { network, symbol, standard, address } = token;
  if (!network || !symbol || !standard || !address || !isValidChainId(network?.chainId)) {
    return false;
  }

  const { namespace } = parseChainId(network.chainId);

  if (!SUPPORTED_NAMESPACES.includes(namespace)) {
    throw new Error(`Unsupported token namespace: ${namespace}`);
  }

  return true;
};

export const isValidPaymentIntent = (paymentIntent: POSClientTypes.PaymentIntent) => {
  const { token, amount, recipient } = paymentIntent;
  if (!token || !amount || !recipient || !isValidToken(token)) {
    return false;
  }
  return true;
};
