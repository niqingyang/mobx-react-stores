export function isHTMLElement(node) {
    return (
        typeof node === 'object' && node !== null && node.nodeType && node.nodeName
    );
}

export function isString(str) {
    return typeof str === 'string';
}

export function isFunction(func) {
    return typeof func === 'function';
}

export function isArray(arr) {
    return Array.isArray(arr);
}