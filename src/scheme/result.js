"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getData = exports.error = exports.success = void 0;
/**
 * Returns a `Success<T>` object.
 * @param data The value for the `data` property of the result.
 * @returns A `Success<T>` object.
 */
function success(data) {
    return { success: true, data: data };
}
exports.success = success;
/**
 * Returns an `Error` object.
 * @param message The value for the `message` property of the result.
 * @returns An `Error` object.
 */
function error(message) {
    return { success: false, message: message };
}
exports.error = error;
/**
 * Obtains the value associated with a successful `Result<T>` or throws an exception if
 * the result is an error.
 * @param result The `Result<T>` from which to obtain the `data` property.
 * @returns The value of the `data` property.
 */
function getData(result) {
    if (result.success) {
        return result.data;
    }
    throw new Error(result.message);
}
exports.getData = getData;
