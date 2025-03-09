import { decompress } from './asyncBZ2/asyncDecompressProcess';

self.onmessage = (event) => {
    const result = decompress(
        event.data,
        (percentage) => {
            self.postMessage({
                type: 'progress',
                progress: percentage
            });
        }
    );
    self.postMessage({
        type: 'result',
        result: result
    });
};

export {};