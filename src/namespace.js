import invariant from "invariant";

// lowercase the first
function lowerCaseFirst(str) {
    if (str === null) {
        return '';
    }

    str = String(str);

    return str.charAt(0).toLowerCase() + str.substr(1);
}

export default function namespace(...args) {

    invariant(args.length === 1, '@namespace can only be used with class');

    if (typeof args[0] === 'string') {
        return function (target) {
            target.prototype.namespace = args[0];
        }
    } else if (typeof args[0] === 'function' && args[0].prototype && args[0].prototype.constructor) {
        const {name} = args[0].prototype.constructor;
        args[0].prototype.namespace = lowerCaseFirst(name);
    } else {
        invariant(false, '@namespace can only be used with class and argument must be string');
    }

    return args[0];
}