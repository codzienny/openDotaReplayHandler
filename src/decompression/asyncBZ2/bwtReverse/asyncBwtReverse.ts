// @ts-nocheck

function bwtReverse(src, primary) {
    // const startPerf = performance.now();

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

    // const end = performance.now();
    // console.log('BWT reverse done in', end - startPerf, 'ms');

    return ret;
}

export { bwtReverse };