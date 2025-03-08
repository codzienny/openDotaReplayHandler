import DecompressWorker from './asyncDecompressWorker?worker';

function asyncDecompress(
    bytes: Uint8Array
):  Promise<Uint8Array> {
    const worker = new DecompressWorker();

    return new Promise((resolve, reject) => {
        worker.onmessage = (event) => {
            resolve(event.data);
            worker.terminate();
        };
    
        worker.onerror = (e) => {
            reject(new Error(`Worker failed: ${e.message}`));
            worker.terminate();
        };
    
        worker.postMessage(bytes);
    });
}

const exports = { asyncDecompress };
export { asyncDecompress };