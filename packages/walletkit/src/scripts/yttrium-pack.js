/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { compress } = require("brotli");

function compressWasmAndConvertToBase64(wasmFilePath, outputTsFilePath) {
    try {
        const wasmBuffer = fs.readFileSync(wasmFilePath);

        const compressedWasm = compress(wasmBuffer);

        const base64Wasm = Buffer.from(compressedWasm).toString("base64");

        const tsContent = `export const yttrium = "${base64Wasm}";\n`;

        fs.writeFileSync(outputTsFilePath, tsContent);

        console.log(`Compressed and saved Base64 wasm to ${outputTsFilePath}`);
    } catch (error) {
        console.error("Error during compression:", error);
    }
}

const wasmFilePath = path.resolve(__dirname, "./../libs/yttrium/yttrium_bg.wasm");
const outputTsFilePath = path.resolve(__dirname, "./../libs/yttrium/yttrium-compressed.ts");

compressWasmAndConvertToBase64(wasmFilePath, outputTsFilePath);
