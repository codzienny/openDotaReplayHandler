// @ts-nocheck

const masks = [
    0x00000000, 0x00000001, 0x00000003, 0x00000007,
    0x0000000f, 0x0000001f, 0x0000003f, 0x0000007f,
    0x000000ff, 0x000001ff, 0x000003ff, 0x000007ff,
    0x00000fff, 0x00001fff, 0x00003fff, 0x00007fff,
    0x0000ffff, 0x0001ffff, 0x0003ffff, 0x0007ffff,
    0x000fffff, 0x001fffff, 0x003fffff, 0x007fffff,
    0x00ffffff, 0x01ffffff, 0x03ffffff, 0x07ffffff,
    0x0fffffff, 0x1fffffff, 0x3fffffff, -0x80000000,
];

function createOrderedHuffmanTable(lengths) {
    const z = [];
    for (let i = 0; i < lengths.length; i += 1) {
        z.push([i, lengths[i]]);
    }
    z.push([lengths.length, -1]);
    const table = [];
    let start = z[0][0];
    let bits = z[0][1];
    for (let i = 0; i < z.length; i += 1) {
        const finish = z[i][0];
        const endbits = z[i][1];
        if (bits) {
            for (let code = start; code < finish; code += 1) {
                table.push({ code, bits, symbol: undefined });
            }
        }
        start = finish;
        bits = endbits;
        if (endbits === -1) {
            break;
        }
    }
    table.sort((a, b) => ((a.bits - b.bits) || (a.code - b.code)));
    let tempBits = 0;
    let symbol = -1;
    const fastAccess = [];
    let current;
    for (let i = 0; i < table.length; i += 1) {
        const t = table[i];
        symbol += 1;
        if (t.bits !== tempBits) {
            symbol <<= t.bits - tempBits;
            tempBits = t.bits;
            current = fastAccess[tempBits] = {};
        }
        t.symbol = symbol;
        current[symbol] = t;
    }
    return {
        table,
        fastAccess,
    };
}

function bwtReverse(src, primary) {
    if (primary < 0 || primary >= src.length) {
        throw RangeError('Out of bound');
    }
    const unsorted = src.slice();
    src.sort((a, b) => a - b);
    const start = {};
    for (let i = src.length - 1; i >= 0; i -= 1) {
        start[src[i]] = i;
    }
    const links = [];
    for (let i = 0; i < src.length; i += 1) {
        links.push(start[unsorted[i]]++); // eslint-disable-line no-plusplus
    }
    let i;
    const first = src[i = primary];
    const ret = [];
    for (let j = 1; j < src.length; j += 1) {
        const x = src[i = links[i]];
        if (x === undefined) {
            ret.push(255);
        } else {
            ret.push(x);
        }
    }
    ret.push(first);
    ret.reverse();
    return ret;
}

function decompress(bytes) {
    let index = 0;
    let bitfield = 0;
    let bits = 0;
    const read = (n) => {
        if (n >= 32) {
            const nd = n >> 1;
            return read(nd) * (1 << nd) + read(n - nd);
        }
        while (bits < n) {
            bitfield = (bitfield << 8) + bytes[index];
            index += 1;
            bits += 8;
        }
        const m = masks[n];
        const r = (bitfield >> (bits - n)) & m;
        bits -= n;
        bitfield &= ~(m << bits);
        return r;
    };

    const magic = read(16);
    if (magic !== 0x425A) { // 'BZ'
        throw new Error('Invalid magic');
    }
    const method = read(8);
    if (method !== 0x68) { // h for huffman
        throw new Error('Invalid method');
    }

    let blocksize = read(8);
    if (blocksize >= 49 && blocksize <= 57) { // 1..9
        blocksize -= 48;
    } else {
        throw new Error('Invalid blocksize');
    }

    let out = new Uint8Array(bytes.length * 1.5);
    let outIndex = 0;
    while (true) {
        const blocktype = read(48);
        const crc = read(32) | 0;
        if (blocktype === 0x314159265359) {
            if (read(1)) {
                throw new Error('do not support randomised');
            }
            const pointer = read(24);
            const used = [];
            const usedGroups = read(16);
            for (let i = 1 << 15; i > 0; i >>= 1) {
                if (!(usedGroups & i)) {
                    for (let j = 0; j < 16; j += 1) {
                        used.push(false);
                    }
                    continue; // eslint-disable-line no-continue
                }
                const usedChars = read(16);
                for (let j = 1 << 15; j > 0; j >>= 1) {
                    used.push(!!(usedChars & j));
                }
            }
            const groups = read(3);
            if (groups < 2 || groups > 6) {
                throw new Error('Invalid number of huffman groups');
            }
            const selectorsUsed = read(15);
            const selectors = [];
            const mtf = Array.from({ length: groups }, (_, i) => i);
            for (let i = 0; i < selectorsUsed; i += 1) {
                let c = 0;
                while (read(1)) {
                    c += 1;
                    if (c >= groups) {
                        throw new Error('MTF table out of range');
                    }
                }
                const v = mtf[c];
                for (let j = c; j > 0; mtf[j] = mtf[--j]) { // eslint-disable-line no-plusplus
                    // nothing
                }
                selectors.push(v);
                mtf[0] = v;
            }
            const symbolsInUse = used.reduce((a, b) => a + b, 0) + 2;
            const tables = [];
            for (let i = 0; i < groups; i += 1) {
                let length = read(5);
                const lengths = [];
                for (let j = 0; j < symbolsInUse; j += 1) {
                    if (length < 0 || length > 20) {
                        throw new Error('Huffman group length outside range');
                    }
                    while (read(1)) {
                        length -= (read(1) * 2) - 1;
                    }
                    lengths.push(length);
                }
                tables.push(createOrderedHuffmanTable(lengths));
            }
            const favourites = [];
            for (let i = 0; i < used.length - 1; i += 1) {
                if (used[i]) {
                    favourites.push(i);
                }
            }
            let decoded = 0;
            let selectorPointer = 0;
            let t;
            let r;
            let repeat = 0;
            let repeatPower = 0;
            const buffer = [];
            while (true) {
                decoded -= 1;
                if (decoded <= 0) {
                    decoded = 50;
                    if (selectorPointer <= selectors.length) {
                        t = tables[selectors[selectorPointer]];
                        selectorPointer += 1;
                    }
                }
                for (const b in t.fastAccess) {
                    if (!Object.prototype.hasOwnProperty.call(t.fastAccess, b)) {
                        continue; // eslint-disable-line no-continue
                    }
                    if (bits < b) {
                        bitfield = (bitfield << 8) + bytes[index];
                        index += 1;
                        bits += 8;
                    }
                    r = t.fastAccess[b][bitfield >> (bits - b)];
                    if (r) {
                        bitfield &= masks[bits -= b];
                        r = r.code;
                        break;
                    }
                }
                if (r >= 0 && r <= 1) {
                    if (repeat === 0) {
                        repeatPower = 1;
                    }
                    repeat += repeatPower << r;
                    repeatPower <<= 1;
                    continue; // eslint-disable-line no-continue
                } else {
                    const v = favourites[0];
                    for (; repeat > 0; repeat -= 1) {
                        buffer.push(v);
                    }
                }
                if (r === symbolsInUse - 1) {
                    break;
                } else {
                    const v = favourites[r - 1];
                    // eslint-disable-next-line no-plusplus
                    for (let j = r - 1; j > 0; favourites[j] = favourites[--j]) {
                        // nothing
                    }
                    favourites[0] = v;
                    buffer.push(v);
                }
            }
            const nt = bwtReverse(buffer, pointer);
            let i = 0;
            while (i < nt.length) {
                const c = nt[i];
                let count = 1;
                if ((i < nt.length - 4)
                    && nt[i + 1] === c
                    && nt[i + 2] === c
                    && nt[i + 3] === c) {
                    count = nt[i + 4] + 4;
                    i += 5;
                } else {
                    i += 1;
                }
                if (outIndex + count >= out.length) {
                    const old = out;
                    out = new Uint8Array(old.length * 2);
                    out.set(old);
                }
                for (let j = 0; j < count; j += 1) {
                    out[outIndex] = c;
                    outIndex += 1;
                }
            }
        } else if (blocktype === 0x177245385090) {
            read(bits & 0x07); // pad align
            break;
        } else {
            throw new Error('Invalid bz2 blocktype');
        }
    }
    return out.subarray(0, outIndex);
}

const exports = { decompress };
export { decompress };