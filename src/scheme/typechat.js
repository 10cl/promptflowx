"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJsonTranslator = void 0;
var result_1 = require("./result");
/**
 * Creates an object that can translate natural language requests into JSON objects of the given type.
 * The specified type argument `T` must be the same type as `typeName` in the given `schema`. The function
 * creates a `TypeChatJsonValidator<T>` and stores it in the `validator` property of the returned instance.
 * @param model The language model to use for translating requests into JSON.
 * @param validator A string containing the TypeScript source code for the JSON schema.
 * @returns A `TypeChatJsonTranslator<T>` instance.
 */
function createJsonTranslator(model, validator) {
    var typeChat = {
        model: model,
        validator: validator,
        attemptRepair: true,
        stripNulls: false,
        createRequestPrompt: createRequestPrompt,
        createRepairPrompt: createRepairPrompt,
        validateInstance: result_1.success,
        translate: translate
    };
    return typeChat;
    function createRequestPrompt(request) {
        return request;
        // return `You are a service that translates user requests into JSON objects of type "${validator.getTypeName()}" according to the following TypeScript definitions:\n` +
        //     `\`\`\`\n${validator.getSchemaText()}\`\`\`\n` +
        //     `The following is a user request:\n` +
        //     `"""\n${request}\n"""\n` +
        //     `The following is the user request translated into a JSON object with 2 spaces of indentation and no properties with the value undefined:\n`;
    }
    function createRepairPrompt(validationError) {
        return "The JSON object is invalid for the following reason:\n" +
            "\"\"\"\n".concat(validationError, "\n\"\"\"\n") +
            "The following is a revised JSON object:\n";
    }
    function translate(request, promptPreamble) {
        return __awaiter(this, void 0, void 0, function () {
            var preamble, prompt, attemptRepair, response, responseText, startIndex, endIndex, jsonText, jsonObject, schemaValidation, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        preamble = typeof promptPreamble === "string" ? [{ role: "user", content: promptPreamble }] : promptPreamble !== null && promptPreamble !== void 0 ? promptPreamble : [];
                        prompt = __spreadArray(__spreadArray([], preamble, true), [{ role: "user", content: typeChat.createRequestPrompt(request) }], false);
                        attemptRepair = typeChat.attemptRepair;
                        _a.label = 1;
                    case 1:
                        if (!true) return [3 /*break*/, 3];
                        return [4 /*yield*/, model.complete(prompt)];
                    case 2:
                        response = _a.sent();
                        if (!response.success) {
                            return [2 /*return*/, response];
                        }
                        responseText = response.data;
                        startIndex = responseText.indexOf("{");
                        endIndex = responseText.lastIndexOf("}");
                        if (!(startIndex >= 0 && endIndex > startIndex)) {
                            return [2 /*return*/, (0, result_1.error)("Response is not JSON:\n".concat(responseText))];
                        }
                        jsonText = responseText.slice(startIndex, endIndex + 1);
                        jsonObject = void 0;
                        try {
                            jsonObject = JSON.parse(jsonText);
                        }
                        catch (e) {
                            return [2 /*return*/, (0, result_1.error)(e instanceof SyntaxError ? e.message : "JSON parse error")];
                        }
                        if (typeChat.stripNulls) {
                            stripNulls(jsonObject);
                        }
                        schemaValidation = validator.validate(jsonObject);
                        validation = schemaValidation.success ? typeChat.validateInstance(schemaValidation.data) : schemaValidation;
                        if (validation.success) {
                            return [2 /*return*/, validation];
                        }
                        if (!attemptRepair) {
                            return [2 /*return*/, (0, result_1.error)("JSON validation failed: ".concat(validation.message, "\n").concat(jsonText))];
                        }
                        prompt.push({ role: "assistant", content: responseText });
                        prompt.push({ role: "user", content: responseText + "\n" + typeChat.createRepairPrompt(validation.message) });
                        attemptRepair = false;
                        sleep(1000);
                        return [3 /*break*/, 1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    }
}
exports.createJsonTranslator = createJsonTranslator;
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
/**
 * Recursively delete properties with null values from the given object. This function assumes there are no
 * circular references in the object.
 * @param obj The object in which to strip null valued properties.
 */
function stripNulls(obj) {
    var keysToDelete;
    for (var k in obj) {
        var value = obj[k];
        if (value === null) {
            (keysToDelete !== null && keysToDelete !== void 0 ? keysToDelete : (keysToDelete = [])).push(k);
        }
        else {
            if (Array.isArray(value)) {
                if (value.some(function (x) { return x === null; })) {
                    obj[k] = value.filter(function (x) { return x !== null; });
                }
            }
            if (typeof value === "object") {
                stripNulls(value);
            }
        }
    }
    if (keysToDelete) {
        for (var _i = 0, keysToDelete_1 = keysToDelete; _i < keysToDelete_1.length; _i++) {
            var k = keysToDelete_1[_i];
            delete obj[k];
        }
    }
}
