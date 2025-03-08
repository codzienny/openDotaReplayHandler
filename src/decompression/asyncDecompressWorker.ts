import { decompress } from './bz2.js';

self.onmessage = (event) => {
    const result = decompress(event.data);
    self.postMessage(result);
};

export {};