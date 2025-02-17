/* tslint:disable */
/* eslint-disable */
export enum Currency {
  Usd = 0,
  Eur = 1,
  Gbp = 2,
  Aud = 3,
  Cad = 4,
  Inr = 5,
  Jpy = 6,
  Btc = 7,
  Eth = 8,
}
export interface Transaction {
    chainId: string;
    from: Address;
    to: Address;
    value: U256;
    input: Bytes;
    gasLimit: U64;
    nonce: U64;
}

export interface FeeEstimatedTransaction {
    chainId: string;
    from: Address;
    to: Address;
    value: U256;
    input: Bytes;
    gasLimit: U64;
    nonce: U64;
    maxFeePerGas: U128;
    maxPriorityFeePerGas: U128;
}

export type StatusResponse = ({ status: "PENDING" } & StatusResponsePendingObject) | ({ status: "COMPLETED" } & StatusResponseCompleted) | ({ status: "ERROR" } & StatusResponseError);

export interface StatusResponseError {
    createdAt: number;
    error: string;
}

export interface StatusResponseCompleted {
    createdAt: number;
}

export interface StatusResponsePendingObject {
    createdAt: number;
    /**
     * Polling interval in ms for the client
     */
    checkIn: number;
}

export type PrepareDetailedResponseSuccess = { available: UiFields } | { notRequired: PrepareResponseNotRequired };

export type PrepareDetailedResponse = { success: PrepareDetailedResponseSuccess } | { error: PrepareResponseError };

export interface Call {
    to: Address;
    value: U256;
    input: Bytes;
}

export interface Metadata {
    fundingFrom: FundingMetadata[];
    initialTransaction: InitialTransactionMetadata;
    /**
     * The number of milliseconds to delay before calling `/status` after getting successful transaction receipts from all sent transactions.
     * Not switching to Duration yet because Kotlin maps this to a native `duration` type but this requires API version 26 but we support 23.
     * https://reown-inc.slack.com/archives/C07HQ8RCGD8/p1738740204879269
     */
    checkIn: number;
}

export interface InitialTransactionMetadata {
    transferTo: Address;
    amount: U256;
    tokenContract: Address;
    symbol: string;
    decimals: number;
}

export interface FundingMetadata {
    chainId: string;
    tokenContract: Address;
    symbol: string;
    amount: U256;
    bridgingFee: U256;
    decimals: number;
}

export interface PrepareResponseAvailable {
    orchestrationId: string;
    initialTransaction: Transaction;
    transactions: Transaction[];
    metadata: Metadata;
}

export interface PrepareResponseNotRequired {
    initialTransaction: Transaction;
    transactions: Transaction[];
}

export type PrepareResponseSuccess = PrepareResponseAvailable | PrepareResponseNotRequired;

/**
 * Bridging check error response that should be returned as a normal HTTP 200
 * response
 */
export interface PrepareResponseError {
    error: BridgingError;
}

export type BridgingError = "NO_ROUTES_AVAILABLE" | "INSUFFICIENT_FUNDS" | "INSUFFICIENT_GAS_FUNDS";

export type PrepareResponse = PrepareResponseSuccess | PrepareResponseError;

export type Hex = `0x${string}`;
export type Address = Hex;
export type Bytes = Hex;
export type U64 = Hex;
export type U128 = Hex;
export type U256 = Hex;
export type B256 = Hex;
export type Url = string;
export type TransactionReceipt = {};


export interface TransactionFee {
    fee: Amount;
    localFee: Amount;
}

export interface TxnDetails {
    transaction: FeeEstimatedTransaction;
    transactionHashToSign: B256;
    fee: TransactionFee;
}

export interface UiFields {
    routeResponse: PrepareResponseAvailable;
    route: TxnDetails[];
    localRouteTotal: Amount;
    bridge: TransactionFee[];
    localBridgeTotal: Amount;
    initial: TxnDetails;
    localTotal: Amount;
}

export interface PulseMetadata {
    url: Url | undefined;
    bundleId: string | undefined;
    packageName: string | undefined;
    sdkVersion: string;
    sdkPlatform: string;
}

export interface Amount {
    symbol: string;
    amount: U256;
    unit: number;
    formatted: string;
    /**
     * Special case that assumes the currency is USD and `unit` is at least 2 decimals
     */
    formattedAlt: string;
}

export interface ExecuteDetails {
    initialTxnReceipt: TransactionReceipt;
    initialTxnHash: B256;
}

export class Client {
  free(): void;
  constructor(project_id: string, pulse_metadata: PulseMetadata);
  prepare(chain_id: string, from: string, call: Call): Promise<PrepareResponse>;
  get_ui_fields(prepare_response: PrepareResponseAvailable, local_currency: Currency): Promise<UiFields>;
  prepare_detailed(chain_id: string, from: string, call: Call, local_currency: Currency): Promise<PrepareDetailedResponse>;
  status(orchestration_id: string): Promise<StatusResponse>;
  wait_for_success(orchestration_id: string, check_in_ms: bigint): Promise<StatusResponseCompleted>;
  wait_for_success_with_timeout(orchestration_id: string, check_in_ms: bigint, timeout_ms: bigint): Promise<StatusResponseCompleted>;
  execute(ui_fields: UiFields, route_txn_sigs: string[], initial_txn_sig: string): Promise<ExecuteDetails>;
  erc20_token_balance(chain_id: string, token: string, owner: string): Promise<string>;
}
export class Config {
  private constructor();
  free(): void;
  static local(): Config;
  static pimlico(): Config;
  endpoints: Endpoints;
}
export class Endpoint {
  free(): void;
  constructor(base_url: string, api_key: string);
  static local_rpc(): Endpoint;
  static local_bundler(): Endpoint;
  static local_paymaster(): Endpoint;
  base_url: string;
  api_key: string;
}
export class Endpoints {
  free(): void;
  constructor(rpc: Endpoint, bundler: Endpoint, paymaster: Endpoint);
  static live(): Endpoints;
  static local(): Endpoints;
  static pimlico(): Endpoints;
  rpc: Endpoint;
  bundler: Endpoint;
  paymaster: Endpoint;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_config_free: (a: number, b: number) => void;
  readonly __wbg_get_config_endpoints: (a: number) => number;
  readonly __wbg_set_config_endpoints: (a: number, b: number) => void;
  readonly config_local: () => number;
  readonly config_pimlico: () => number;
  readonly __wbg_endpoints_free: (a: number, b: number) => void;
  readonly __wbg_get_endpoints_rpc: (a: number) => number;
  readonly __wbg_set_endpoints_rpc: (a: number, b: number) => void;
  readonly __wbg_get_endpoints_bundler: (a: number) => number;
  readonly __wbg_set_endpoints_bundler: (a: number, b: number) => void;
  readonly __wbg_get_endpoints_paymaster: (a: number) => number;
  readonly __wbg_set_endpoints_paymaster: (a: number, b: number) => void;
  readonly endpoints_new: (a: number, b: number, c: number) => number;
  readonly endpoints_live: () => number;
  readonly endpoints_local: () => number;
  readonly endpoints_pimlico: () => number;
  readonly __wbg_endpoint_free: (a: number, b: number) => void;
  readonly __wbg_get_endpoint_base_url: (a: number) => [number, number];
  readonly __wbg_set_endpoint_base_url: (a: number, b: number, c: number) => void;
  readonly __wbg_get_endpoint_api_key: (a: number) => [number, number];
  readonly __wbg_set_endpoint_api_key: (a: number, b: number, c: number) => void;
  readonly endpoint_new: (a: number, b: number, c: number, d: number) => number;
  readonly endpoint_local_rpc: () => number;
  readonly endpoint_local_bundler: () => number;
  readonly endpoint_local_paymaster: () => number;
  readonly __wbg_client_free: (a: number, b: number) => void;
  readonly client_new: (a: number, b: number, c: any) => number;
  readonly client_prepare: (a: number, b: number, c: number, d: number, e: number, f: any) => any;
  readonly client_get_ui_fields: (a: number, b: any, c: number) => any;
  readonly client_prepare_detailed: (a: number, b: number, c: number, d: number, e: number, f: any, g: number) => any;
  readonly client_status: (a: number, b: number, c: number) => any;
  readonly client_wait_for_success: (a: number, b: number, c: number, d: bigint) => any;
  readonly client_wait_for_success_with_timeout: (a: number, b: number, c: number, d: bigint, e: bigint) => any;
  readonly client_execute: (a: number, b: any, c: number, d: number, e: number, f: number) => any;
  readonly client_erc20_token_balance: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => any;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_4: WebAssembly.Table;
  readonly __wbindgen_export_5: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly _dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__heb3f862823f1d1fd: (a: number, b: number) => void;
  readonly closure777_externref_shim: (a: number, b: number, c: any) => void;
  readonly closure1016_externref_shim: (a: number, b: number, c: any, d: any) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
