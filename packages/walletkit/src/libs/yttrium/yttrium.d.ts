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
export interface PrepareResponseAvailable {
    orchestrationId: string;
    initialTransaction: Transaction;
    transactions: Transaction[];
    metadata: Metadata;
}

export type PrepareResponse = PrepareResponseSuccess | PrepareResponseError;

export interface Transaction {
    chainId: string;
    from: Address;
    to: Address;
    value: U256;
    input: Bytes;
    gasLimit: U64;
    nonce: U64;
}

export interface UiFields {
    route: TxnDetails[];
    local_route_total: Amount;
    bridge: TransactionFee[];
    local_bridge_total: Amount;
    initial: TxnDetails;
    local_total: Amount;
}

export type PrepareDetailedResponse = { Success: PrepareDetailedResponseSuccess } | { Error: PrepareResponseError };

export type StatusResponse = ({ status: "PENDING" } & StatusResponsePending) | ({ status: "COMPLETED" } & StatusResponseCompleted) | ({ status: "ERROR" } & StatusResponseError);

export interface StatusResponseCompleted {
    createdAt: number;
}

export interface Call {
    to: Address;
    value: U256;
    input: Bytes;
}

export class Client {
  free(): void;
  constructor(project_id: string);
  prepare(chain_id: string, from: string, call: Call): Promise<PrepareResponse>;
  get_ui_fields(prepare_response: PrepareResponseAvailable, local_currency: Currency): Promise<UiFields>;
  prepare_detailed(chain_id: string, from: string, call: Call, local_currency: Currency): Promise<PrepareDetailedResponse>;
  status(orchestration_id: string): Promise<StatusResponse>;
  wait_for_success(orchestration_id: string, check_in_ms: bigint): Promise<StatusResponseCompleted>;
  wait_for_success_with_timeout(orchestration_id: string, check_in_ms: bigint, timeout_ms: bigint): Promise<StatusResponseCompleted>;
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
  readonly __wbg_client_free: (a: number, b: number) => void;
  readonly client_new: (a: number, b: number) => number;
  readonly client_prepare: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly client_get_ui_fields: (a: number, b: number, c: number) => number;
  readonly client_prepare_detailed: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
  readonly client_status: (a: number, b: number, c: number) => number;
  readonly client_wait_for_success: (a: number, b: number, c: number, d: bigint) => number;
  readonly client_wait_for_success_with_timeout: (a: number, b: number, c: number, d: bigint, e: bigint) => number;
  readonly client_erc20_token_balance: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
  readonly __wbg_config_free: (a: number, b: number) => void;
  readonly __wbg_get_config_endpoints: (a: number) => number;
  readonly __wbg_set_config_endpoints: (a: number, b: number) => void;
  readonly config_local: () => number;
  readonly config_pimlico: () => number;
  readonly __wbg_get_endpoints_rpc: (a: number) => number;
  readonly __wbg_set_endpoints_rpc: (a: number, b: number) => void;
  readonly __wbg_get_endpoints_bundler: (a: number) => number;
  readonly __wbg_set_endpoints_bundler: (a: number, b: number) => void;
  readonly __wbg_get_endpoints_paymaster: (a: number) => number;
  readonly __wbg_set_endpoints_paymaster: (a: number, b: number) => void;
  readonly endpoints_new: (a: number, b: number, c: number) => number;
  readonly endpoints_live: () => number;
  readonly __wbg_endpoint_free: (a: number, b: number) => void;
  readonly __wbg_get_endpoint_base_url: (a: number, b: number) => void;
  readonly __wbg_set_endpoint_base_url: (a: number, b: number, c: number) => void;
  readonly __wbg_get_endpoint_api_key: (a: number, b: number) => void;
  readonly __wbg_set_endpoint_api_key: (a: number, b: number, c: number) => void;
  readonly endpoint_new: (a: number, b: number, c: number, d: number) => number;
  readonly endpoint_local_rpc: () => number;
  readonly endpoint_local_bundler: () => number;
  readonly endpoint_local_paymaster: () => number;
  readonly __wbg_endpoints_free: (a: number, b: number) => void;
  readonly endpoints_pimlico: () => number;
  readonly endpoints_local: () => number;
  readonly __wbindgen_export_0: (a: number, b: number) => number;
  readonly __wbindgen_export_1: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_2: (a: number) => void;
  readonly __wbindgen_export_3: WebAssembly.Table;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_export_4: (a: number, b: number, c: number) => void;
  readonly __wbindgen_export_5: (a: number, b: number, c: number) => void;
  readonly __wbindgen_export_6: (a: number, b: number, c: number, d: number) => void;
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
