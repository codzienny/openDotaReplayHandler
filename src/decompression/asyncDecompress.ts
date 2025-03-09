import DecompressWorker from './asyncDecompressWorker?worker';

function asyncDecompress(
    bytes: Uint8Array,
    progressUpdate: (percent: number) => void
):  Promise<Uint8Array> {
    const worker = new DecompressWorker();

    return new Promise((resolve, reject) => {
        worker.onmessage = (event) => {
            switch (event.data.type) {
                case 'progress':
                    progressUpdate(event.data.progress);
                    break;
                case 'result':
                    progressUpdate(1.0);
                    resolve(event.data.result);
                    worker.terminate();
                    break;
            }
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