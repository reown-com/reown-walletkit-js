let wasm;

let WASM_VECTOR_LEN = 0;

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

const cachedTextEncoder = (typeof TextEncoder !== "undefined" ? new TextEncoder("utf-8") : { encode: () => { throw Error("TextEncoder not available"); } });

const encodeString = (typeof cachedTextEncoder.encodeInto === "function"
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length,
    };
});

function passStringToWasm0(arg, malloc, realloc) {
    if (typeof (arg) !== "string") throw new Error(`expected a string argument, found ${typeof (arg)}`);

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);
        if (ret.read !== arg.length) throw new Error("failed to pass whole string");
        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function logError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const error = (function () {
            try {
                return e instanceof Error ? `${e.message}\n\nStack:\n${e.stack}` : e.toString();
            } catch (_) {
                return "<failed to stringify thrown value>";
            }
        }());
        console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", error);
        throw e;
    }
}

const cachedTextDecoder = () => {
    return { decode: (args) => { console.error("TextDecoder", args); } };
};

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_export_4.set(idx, obj);
    return idx;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function _assertBoolean(n) {
    if (typeof (n) !== "boolean") {
        throw new Error(`expected a boolean argument, found ${typeof (n)}`);
    }
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

function _assertNum(n) {
    if (typeof (n) !== "number") throw new Error(`expected a number argument, found ${typeof (n)}`);
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function _assertBigInt(n) {
    if (typeof (n) !== "bigint") throw new Error(`expected a bigint argument, found ${typeof (n)}`);
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === "undefined")
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => {
    wasm.__wbindgen_export_5.get(state.dtor)(state.a, state.b);
});

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_5.get(state.dtor)(a, state.b);
                CLOSURE_DTORS.unregister(state);
            } else {
                state.a = a;
            }
        }
    };
    real.original = state;
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == "number" || type == "boolean" || val == null) {
        return `${val}`;
    }
    if (type == "string") {
        return `"${val}"`;
    }
    if (type == "symbol") {
        const description = val.description;
        if (description == null) {
            return "Symbol";
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == "function") {
        const name = val.name;
        if (typeof name === "string" && name.length > 0) {
            return `Function(${name})`;
        } else {
            return "Function";
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = "[";
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for (let i = 1; i < length; i++) {
            debug += ", " + debugString(val[i]);
        }
        debug += "]";
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == "Object") {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return "Object(" + JSON.stringify(val) + ")";
        } catch (_) {
            return "Object";
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}
function __wbg_adapter_52(arg0, arg1) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__heb3f862823f1d1fd(arg0, arg1);
}

function __wbg_adapter_55(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.closure779_externref_shim(arg0, arg1, arg2);
}

function __wbg_adapter_189(arg0, arg1, arg2, arg3) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.closure1018_externref_shim(arg0, arg1, arg2, arg3);
}

/**
 * @enum {0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}
 */
export const Currency = Object.freeze({
    Usd: 0,
0: "Usd",
    Eur: 1,
1: "Eur",
    Gbp: 2,
2: "Gbp",
    Aud: 3,
3: "Aud",
    Cad: 4,
4: "Cad",
    Inr: 5,
5: "Inr",
    Jpy: 6,
6: "Jpy",
    Btc: 7,
7: "Btc",
    Eth: 8,
8: "Eth",
});

const __wbindgen_enum_RequestCredentials = ["omit", "same-origin", "include"];

const __wbindgen_enum_RequestMode = ["same-origin", "no-cors", "cors", "navigate"];

const ClientFinalization = (typeof FinalizationRegistry === "undefined")
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_client_free(ptr >>> 0, 1));

export class Client {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ClientFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_client_free(ptr, 0);
    }

    /**
     * @param {string} project_id
     * @param {PulseMetadata} pulse_metadata
     */
    constructor(project_id, pulse_metadata) {
        const ptr0 = passStringToWasm0(project_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.client_new(ptr0, len0, pulse_metadata);
        this.__wbg_ptr = ret >>> 0;
        ClientFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }

    /**
     * @param {string} chain_id
     * @param {string} from
     * @param {Call} call
     * @returns {Promise<PrepareResponse>}
     */
    prepare(chain_id, from, call) {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        const ptr0 = passStringToWasm0(chain_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(from, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.client_prepare(this.__wbg_ptr, ptr0, len0, ptr1, len1, call);
        return ret;
    }

    /**
     * @param {PrepareResponseAvailable} prepare_response
     * @param {Currency} local_currency
     * @returns {Promise<UiFields>}
     */
    get_ui_fields(prepare_response, local_currency) {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        _assertNum(local_currency);
        const ret = wasm.client_get_ui_fields(this.__wbg_ptr, prepare_response, local_currency);
        return ret;
    }

    /**
     * @param {string} chain_id
     * @param {string} from
     * @param {Call} call
     * @param {Currency} local_currency
     * @returns {Promise<PrepareDetailedResponse>}
     */
    prepare_detailed(chain_id, from, call, local_currency) {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        const ptr0 = passStringToWasm0(chain_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(from, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        _assertNum(local_currency);
        const ret = wasm.client_prepare_detailed(this.__wbg_ptr, ptr0, len0, ptr1, len1, call, local_currency);
        return ret;
    }

    /**
     * @param {string} orchestration_id
     * @returns {Promise<StatusResponse>}
     */
    status(orchestration_id) {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        const ptr0 = passStringToWasm0(orchestration_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.client_status(this.__wbg_ptr, ptr0, len0);
        return ret;
    }

    /**
     * @param {string} orchestration_id
     * @param {bigint} check_in_ms
     * @returns {Promise<StatusResponseCompleted>}
     */
    wait_for_success(orchestration_id, check_in_ms) {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        const ptr0 = passStringToWasm0(orchestration_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertBigInt(check_in_ms);
        const ret = wasm.client_wait_for_success(this.__wbg_ptr, ptr0, len0, check_in_ms);
        return ret;
    }

    /**
     * @param {string} orchestration_id
     * @param {bigint} check_in_ms
     * @param {bigint} timeout_ms
     * @returns {Promise<StatusResponseCompleted>}
     */
    wait_for_success_with_timeout(orchestration_id, check_in_ms, timeout_ms) {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        const ptr0 = passStringToWasm0(orchestration_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertBigInt(check_in_ms);
        _assertBigInt(timeout_ms);
        const ret = wasm.client_wait_for_success_with_timeout(this.__wbg_ptr, ptr0, len0, check_in_ms, timeout_ms);
        return ret;
    }

    /**
     * @param {UiFields} ui_fields
     * @param {string[]} route_txn_sigs
     * @param {string} initial_txn_sig
     * @returns {Promise<ExecuteDetails>}
     */
    execute(ui_fields, route_txn_sigs, initial_txn_sig) {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        const ptr0 = passArrayJsValueToWasm0(route_txn_sigs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(initial_txn_sig, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.client_execute(this.__wbg_ptr, ui_fields, ptr0, len0, ptr1, len1);
        return ret;
    }

    /**
     * @param {string} chain_id
     * @param {string} token
     * @param {string} owner
     * @returns {Promise<string>}
     */
    erc20_token_balance(chain_id, token, owner) {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        const ptr0 = passStringToWasm0(chain_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(owner, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.client_erc20_token_balance(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        return ret;
    }
}

const ConfigFinalization = (typeof FinalizationRegistry === "undefined")
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_config_free(ptr >>> 0, 1));

export class Config {
    constructor() {
        throw new Error("cannot invoke `new` directly");
    }

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Config.prototype);
        obj.__wbg_ptr = ptr;
        ConfigFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_config_free(ptr, 0);
    }

    /**
     * @returns {Endpoints}
     */
    get endpoints() {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        const ret = wasm.__wbg_get_config_endpoints(this.__wbg_ptr);
        return Endpoints.__wrap(ret);
    }

    /**
     * @param {Endpoints} arg0
     */
    set endpoints(arg0) {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        _assertClass(arg0, Endpoints);
        if (arg0.__wbg_ptr === 0) {
            throw new Error("Attempt to use a moved value");
        }
        const ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_config_endpoints(this.__wbg_ptr, ptr0);
    }

    /**
     * @returns {Config}
     */
    static local() {
        const ret = wasm.config_local();
        return Config.__wrap(ret);
    }

    /**
     * @returns {Config}
     */
    static pimlico() {
        const ret = wasm.config_pimlico();
        return Config.__wrap(ret);
    }
}

const EndpointFinalization = (typeof FinalizationRegistry === "undefined")
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_endpoint_free(ptr >>> 0, 1));

export class Endpoint {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Endpoint.prototype);
        obj.__wbg_ptr = ptr;
        EndpointFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        EndpointFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_endpoint_free(ptr, 0);
    }

    /**
     * @returns {string}
     */
    get base_url() {
        let deferred1_0;
        let deferred1_1;
        try {
            if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
            _assertNum(this.__wbg_ptr);
            const ret = wasm.__wbg_get_endpoint_base_url(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }

    /**
     * @param {string} arg0
     */
    set base_url(arg0) {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_endpoint_base_url(this.__wbg_ptr, ptr0, len0);
    }

    /**
     * @returns {string}
     */
    get api_key() {
        let deferred1_0;
        let deferred1_1;
        try {
            if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
            _assertNum(this.__wbg_ptr);
            const ret = wasm.__wbg_get_endpoint_api_key(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }

    /**
     * @param {string} arg0
     */
    set api_key(arg0) {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_endpoint_api_key(this.__wbg_ptr, ptr0, len0);
    }

    /**
     * @param {string} base_url
     * @param {string} api_key
     */
    constructor(base_url, api_key) {
        const ptr0 = passStringToWasm0(base_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(api_key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.endpoint_new(ptr0, len0, ptr1, len1);
        this.__wbg_ptr = ret >>> 0;
        EndpointFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }

    /**
     * @returns {Endpoint}
     */
    static local_rpc() {
        const ret = wasm.endpoint_local_rpc();
        return Endpoint.__wrap(ret);
    }

    /**
     * @returns {Endpoint}
     */
    static local_bundler() {
        const ret = wasm.endpoint_local_bundler();
        return Endpoint.__wrap(ret);
    }

    /**
     * @returns {Endpoint}
     */
    static local_paymaster() {
        const ret = wasm.endpoint_local_paymaster();
        return Endpoint.__wrap(ret);
    }
}

const EndpointsFinalization = (typeof FinalizationRegistry === "undefined")
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_endpoints_free(ptr >>> 0, 1));

export class Endpoints {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Endpoints.prototype);
        obj.__wbg_ptr = ptr;
        EndpointsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        EndpointsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_endpoints_free(ptr, 0);
    }

    /**
     * @returns {Endpoint}
     */
    get rpc() {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        const ret = wasm.__wbg_get_endpoints_rpc(this.__wbg_ptr);
        return Endpoint.__wrap(ret);
    }

    /**
     * @param {Endpoint} arg0
     */
    set rpc(arg0) {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        _assertClass(arg0, Endpoint);
        if (arg0.__wbg_ptr === 0) {
            throw new Error("Attempt to use a moved value");
        }
        const ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_endpoints_rpc(this.__wbg_ptr, ptr0);
    }

    /**
     * @returns {Endpoint}
     */
    get bundler() {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        const ret = wasm.__wbg_get_endpoints_bundler(this.__wbg_ptr);
        return Endpoint.__wrap(ret);
    }

    /**
     * @param {Endpoint} arg0
     */
    set bundler(arg0) {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        _assertClass(arg0, Endpoint);
        if (arg0.__wbg_ptr === 0) {
            throw new Error("Attempt to use a moved value");
        }
        const ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_endpoints_bundler(this.__wbg_ptr, ptr0);
    }

    /**
     * @returns {Endpoint}
     */
    get paymaster() {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        const ret = wasm.__wbg_get_endpoints_paymaster(this.__wbg_ptr);
        return Endpoint.__wrap(ret);
    }

    /**
     * @param {Endpoint} arg0
     */
    set paymaster(arg0) {
        if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
        _assertNum(this.__wbg_ptr);
        _assertClass(arg0, Endpoint);
        if (arg0.__wbg_ptr === 0) {
            throw new Error("Attempt to use a moved value");
        }
        const ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_endpoints_paymaster(this.__wbg_ptr, ptr0);
    }

    /**
     * @param {Endpoint} rpc
     * @param {Endpoint} bundler
     * @param {Endpoint} paymaster
     */
    constructor(rpc, bundler, paymaster) {
        _assertClass(rpc, Endpoint);
        if (rpc.__wbg_ptr === 0) {
            throw new Error("Attempt to use a moved value");
        }
        const ptr0 = rpc.__destroy_into_raw();
        _assertClass(bundler, Endpoint);
        if (bundler.__wbg_ptr === 0) {
            throw new Error("Attempt to use a moved value");
        }
        const ptr1 = bundler.__destroy_into_raw();
        _assertClass(paymaster, Endpoint);
        if (paymaster.__wbg_ptr === 0) {
            throw new Error("Attempt to use a moved value");
        }
        const ptr2 = paymaster.__destroy_into_raw();
        const ret = wasm.endpoints_new(ptr0, ptr1, ptr2);
        this.__wbg_ptr = ret >>> 0;
        EndpointsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }

    /**
     * @returns {Endpoints}
     */
    static live() {
        const ret = wasm.endpoints_live();
        return Endpoints.__wrap(ret);
    }

    /**
     * @returns {Endpoints}
     */
    static local() {
        const ret = wasm.endpoints_local();
        return Endpoints.__wrap(ret);
    }

    /**
     * @returns {Endpoints}
     */
    static pimlico() {
        const ret = wasm.endpoints_pimlico();
        return Endpoints.__wrap(ret);
    }
}

async function __wbg_load(module, imports) {
    if (typeof Response === "function" && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === "function") {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                if (module.headers.get("Content-Type") != "application/wasm") {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_String_8f0eb39a4a4c2f66 = function() {
 return logError(function (arg0, arg1) {
        const ret = String(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    }, arguments);
};
    imports.wbg.__wbg_abort_775ef1d17fc65868 = function() {
 return logError(function (arg0) {
        arg0.abort();
    }, arguments);
};
    imports.wbg.__wbg_append_8c7dd8d641a5f01b = function() {
 return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        arg0.append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    }, arguments);
};
    imports.wbg.__wbg_arrayBuffer_d1b44c4390db422f = function() {
 return handleError(function (arg0) {
        const ret = arg0.arrayBuffer();
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_buffer_609cc3eee51ed158 = function() {
 return logError(function (arg0) {
        const ret = arg0.buffer;
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_call_672a4d21634d4a24 = function() {
 return handleError(function (arg0, arg1) {
        const ret = arg0.call(arg1);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_call_7cccdd69e0791ae2 = function() {
 return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.call(arg1, arg2);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_done_769e5ede4b31c67b = function() {
 return logError(function (arg0) {
        const ret = arg0.done;
        _assertBoolean(ret);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_entries_3265d4158b33e5dc = function() {
 return logError(function (arg0) {
        const ret = Object.entries(arg0);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_fetch_4465c2b10f21a927 = function() {
 return logError(function (arg0) {
        const ret = fetch(arg0);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_fetch_509096533071c657 = function() {
 return logError(function (arg0, arg1) {
        const ret = arg0.fetch(arg1);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_from_2a5d3e218e67aa85 = function() {
 return logError(function (arg0) {
        const ret = Array.from(arg0);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_getRandomValues_78e016fdd1d721cf = function() {
 return handleError(function (arg0, arg1) {
        globalThis.crypto.getRandomValues(getArrayU8FromWasm0(arg0, arg1));
    }, arguments);
};
    imports.wbg.__wbg_get_67b2ba62fc30de12 = function() {
 return handleError(function (arg0, arg1) {
        const ret = Reflect.get(arg0, arg1);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_get_b9b93047fe3cf45b = function() {
 return logError(function (arg0, arg1) {
        const ret = arg0[arg1 >>> 0];
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_getwithrefkey_1dc361bd10053bfe = function() {
 return logError(function (arg0, arg1) {
        const ret = arg0[arg1];
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_has_a5ea9117f258a0ec = function() {
 return handleError(function (arg0, arg1) {
        const ret = Reflect.has(arg0, arg1);
        _assertBoolean(ret);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_headers_9cb51cfd2ac780a4 = function() {
 return logError(function (arg0) {
        const ret = arg0.headers;
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_instanceof_ArrayBuffer_e14585432e3737fc = function() {
 return logError(function (arg0) {
        let result;
        try {
            result = arg0 instanceof ArrayBuffer;
        } catch (_) {
            result = false;
        }
        const ret = result;
        _assertBoolean(ret);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_instanceof_Map_f3469ce2244d2430 = function() {
 return logError(function (arg0) {
        let result;
        try {
            result = arg0 instanceof Map;
        } catch (_) {
            result = false;
        }
        const ret = result;
        _assertBoolean(ret);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_instanceof_Response_f2cc20d9f7dfd644 = function() {
 return logError(function (arg0) {
        let result;
        try {
            result = arg0 instanceof Response;
        } catch (_) {
            result = false;
        }
        const ret = result;
        _assertBoolean(ret);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_instanceof_Uint8Array_17156bcf118086a9 = function() {
 return logError(function (arg0) {
        let result;
        try {
            result = arg0 instanceof Uint8Array;
        } catch (_) {
            result = false;
        }
        const ret = result;
        _assertBoolean(ret);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_isArray_a1eab7e0d067391b = function() {
 return logError(function (arg0) {
        const ret = Array.isArray(arg0);
        _assertBoolean(ret);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_isSafeInteger_343e2beeeece1bb0 = function() {
 return logError(function (arg0) {
        const ret = Number.isSafeInteger(arg0);
        _assertBoolean(ret);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_iterator_9a24c88df860dc65 = function() {
 return logError(function () {
        const ret = Symbol.iterator;
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_length_a446193dc22c12f8 = function() {
 return logError(function (arg0) {
        const ret = arg0.length;
        _assertNum(ret);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_length_e2d2a49132c1b256 = function() {
 return logError(function (arg0) {
        const ret = arg0.length;
        _assertNum(ret);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_new_018dcc2d6c8c2f6a = function() {
 return handleError(function () {
        const ret = new Headers();
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_new_23a2665fac83c611 = function() {
 return logError(function (arg0, arg1) {
        try {
            var state0 = { a: arg0, b: arg1 };
            const cb0 = (arg0, arg1) => {
                const a = state0.a;
                state0.a = 0;
                try {
                    return __wbg_adapter_189(a, state0.b, arg0, arg1);
                } finally {
                    state0.a = a;
                }
            };
            const ret = new Promise(cb0);
            return ret;
        } finally {
            state0.a = state0.b = 0;
        }
    }, arguments);
};
    imports.wbg.__wbg_new_405e22f390576ce2 = function() {
 return logError(function () {
        const ret = new Object();
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_new_5e0be73521bc8c17 = function() {
 return logError(function () {
        const ret = new Map();
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_new_78feb108b6472713 = function() {
 return logError(function () {
        const ret = [];
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_new_a12002a7f91c75be = function() {
 return logError(function (arg0) {
        const ret = new Uint8Array(arg0);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_new_e25e5aab09ff45db = function() {
 return handleError(function () {
        const ret = new AbortController();
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_newnoargs_105ed471475aaf50 = function() {
 return logError(function (arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_newwithbyteoffsetandlength_d97e637ebe145a9a = function() {
 return logError(function (arg0, arg1, arg2) {
        const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_newwithstrandinit_06c535e0a867c635 = function() {
 return handleError(function (arg0, arg1, arg2) {
        const ret = new Request(getStringFromWasm0(arg0, arg1), arg2);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_next_25feadfc0913fea9 = function() {
 return logError(function (arg0) {
        const ret = arg0.next;
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_next_6574e1a8a62d1055 = function() {
 return handleError(function (arg0) {
        const ret = arg0.next();
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_now_807e54c39636c349 = function() {
 return logError(function () {
        const ret = Date.now();
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_now_fb0466b5460cff09 = function() {
 return logError(function (arg0) {
        const ret = arg0.now();
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_performance_71b063e177862740 = function() {
 return logError(function (arg0) {
        const ret = arg0.performance;
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_queueMicrotask_97d92b4fcc8a61c5 = function() {
 return logError(function (arg0) {
        queueMicrotask(arg0);
    }, arguments);
};
    imports.wbg.__wbg_queueMicrotask_d3219def82552485 = function() {
 return logError(function (arg0) {
        const ret = arg0.queueMicrotask;
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_resolve_4851785c9c5f573d = function() {
 return logError(function (arg0) {
        const ret = Promise.resolve(arg0);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_setTimeout_25eabdb2fc442ea2 = function() {
 return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.setTimeout(arg1, arg2);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_set_37837023f3d740e8 = function() {
 return logError(function (arg0, arg1, arg2) {
        arg0[arg1 >>> 0] = arg2;
    }, arguments);
};
    imports.wbg.__wbg_set_3f1d0b984ed272ed = function() {
 return logError(function (arg0, arg1, arg2) {
        arg0[arg1] = arg2;
    }, arguments);
};
    imports.wbg.__wbg_set_65595bdd868b3009 = function() {
 return logError(function (arg0, arg1, arg2) {
        arg0.set(arg1, arg2 >>> 0);
    }, arguments);
};
    imports.wbg.__wbg_set_8fc6bf8a5b1071d1 = function() {
 return logError(function (arg0, arg1, arg2) {
        const ret = arg0.set(arg1, arg2);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_setbody_5923b78a95eedf29 = function() {
 return logError(function (arg0, arg1) {
        arg0.body = arg1;
    }, arguments);
};
    imports.wbg.__wbg_setcredentials_c3a22f1cd105a2c6 = function() {
 return logError(function (arg0, arg1) {
        arg0.credentials = __wbindgen_enum_RequestCredentials[arg1];
    }, arguments);
};
    imports.wbg.__wbg_setheaders_834c0bdb6a8949ad = function() {
 return logError(function (arg0, arg1) {
        arg0.headers = arg1;
    }, arguments);
};
    imports.wbg.__wbg_setmethod_3c5280fe5d890842 = function() {
 return logError(function (arg0, arg1, arg2) {
        arg0.method = getStringFromWasm0(arg1, arg2);
    }, arguments);
};
    imports.wbg.__wbg_setmode_5dc300b865044b65 = function() {
 return logError(function (arg0, arg1) {
        arg0.mode = __wbindgen_enum_RequestMode[arg1];
    }, arguments);
};
    imports.wbg.__wbg_setsignal_75b21ef3a81de905 = function() {
 return logError(function (arg0, arg1) {
        arg0.signal = arg1;
    }, arguments);
};
    imports.wbg.__wbg_signal_aaf9ad74119f20a4 = function() {
 return logError(function (arg0) {
        const ret = arg0.signal;
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_static_accessor_GLOBAL_88a902d13a557d07 = function() {
 return logError(function () {
        const ret = typeof global === "undefined" ? null : global;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    }, arguments);
};
    imports.wbg.__wbg_static_accessor_GLOBAL_THIS_56578be7e9f832b0 = function() {
 return logError(function () {
        const ret = typeof globalThis === "undefined" ? null : globalThis;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    }, arguments);
};
    imports.wbg.__wbg_static_accessor_SELF_37c5d418e4bf5819 = function() {
 return logError(function () {
        const ret = typeof self === "undefined" ? null : self;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    }, arguments);
};
    imports.wbg.__wbg_static_accessor_WINDOW_5de37043a91a9c40 = function() {
 return logError(function () {
        const ret = typeof window === "undefined" ? null : window;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    }, arguments);
};
    imports.wbg.__wbg_status_f6360336ca686bf0 = function() {
 return logError(function (arg0) {
        const ret = arg0.status;
        _assertNum(ret);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_stringify_f7ed6987935b4a24 = function() {
 return handleError(function (arg0) {
        const ret = JSON.stringify(arg0);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_text_7805bea50de2af49 = function() {
 return handleError(function (arg0) {
        const ret = arg0.text();
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_then_44b73946d2fb3e7d = function() {
 return logError(function (arg0, arg1) {
        const ret = arg0.then(arg1);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_then_48b406749878a531 = function() {
 return logError(function (arg0, arg1, arg2) {
        const ret = arg0.then(arg1, arg2);
        return ret;
    }, arguments);
};
    imports.wbg.__wbg_url_ae10c34ca209681d = function() {
 return logError(function (arg0, arg1) {
        const ret = arg1.url;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    }, arguments);
};
    imports.wbg.__wbg_value_cd1ffa7b1ab794f1 = function() {
 return logError(function (arg0) {
        const ret = arg0.value;
        return ret;
    }, arguments);
};
    imports.wbg.__wbindgen_as_number = function(arg0) {
        const ret = +arg0;
        return ret;
    };
    imports.wbg.__wbindgen_bigint_from_i64 = function(arg0) {
        const ret = arg0;
        return ret;
    };
    imports.wbg.__wbindgen_bigint_from_u64 = function(arg0) {
        const ret = BigInt.asUintN(64, arg0);
        return ret;
    };
    imports.wbg.__wbindgen_bigint_get_as_i64 = function(arg0, arg1) {
        const v = arg1;
        const ret = typeof (v) === "bigint" ? v : undefined;
        if (!isLikeNone(ret)) {
            _assertBigInt(ret);
        }
        getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbindgen_boolean_get = function(arg0) {
        const v = arg0;
        const ret = typeof (v) === "boolean" ? (v ? 1 : 0) : 2;
        _assertNum(ret);
        return ret;
    };
    imports.wbg.__wbindgen_cb_drop = function(arg0) {
        const obj = arg0.original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        const ret = false;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_closure_wrapper13003 = function() {
 return logError(function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 720, __wbg_adapter_52);
        return ret;
    }, arguments);
};
    imports.wbg.__wbindgen_closure_wrapper13872 = function() {
 return logError(function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 780, __wbg_adapter_55);
        return ret;
    }, arguments);
};
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        const ret = debugString(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbindgen_in = function(arg0, arg1) {
        const ret = arg0 in arg1;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_export_4;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
    };
    imports.wbg.__wbindgen_is_bigint = function(arg0) {
        const ret = typeof (arg0) === "bigint";
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_is_function = function(arg0) {
        const ret = typeof (arg0) === "function";
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_is_object = function(arg0) {
        const val = arg0;
        const ret = typeof (val) === "object" && val !== null;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_is_string = function(arg0) {
        const ret = typeof (arg0) === "string";
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        const ret = arg0 === undefined;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_jsval_eq = function(arg0, arg1) {
        const ret = arg0 === arg1;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_jsval_loose_eq = function(arg0, arg1) {
        const ret = arg0 == arg1;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_memory = function() {
        const ret = wasm.memory;
        return ret;
    };
    imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
        const obj = arg1;
        const ret = typeof (obj) === "number" ? obj : undefined;
        if (!isLikeNone(ret)) {
            _assertNum(ret);
        }
        getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbindgen_number_new = function(arg0) {
        const ret = arg0;
        return ret;
    };
    imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
        const obj = arg1;
        const ret = typeof (obj) === "string" ? obj : undefined;
        const ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };

    return imports;
}

function __wbg_init_memory(imports, memory) {

}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;

    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;

    if (typeof module !== "undefined") {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({ module } = module);
        } else {
            console.warn("using deprecated parameters for `initSync()`; pass a single object instead");
        }
    }

    const imports = __wbg_get_imports();

    __wbg_init_memory(imports);

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;

    if (typeof module_or_path !== "undefined") {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({ module_or_path } = module_or_path);
        } else {
            console.warn("using deprecated parameters for the initialization function; pass a single object instead");
        }
    }

    if (typeof module_or_path === "undefined") {
        module_or_path = new URL("yttrium_bg.wasm", import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === "string" || (typeof Request === "function" && module_or_path instanceof Request) || (typeof URL === "function" && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    __wbg_init_memory(imports);

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
