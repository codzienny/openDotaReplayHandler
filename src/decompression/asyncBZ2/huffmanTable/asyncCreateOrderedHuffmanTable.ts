// @ts-nocheck

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

export { createOrderedHuffmanTable };