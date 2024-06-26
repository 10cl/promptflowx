"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTypeScriptJsonValidator = void 0;
var typescript_1 = require("typescript");
var result_1 = require("../result");
var libText = "interface Array<T> { length: number, [n: number]: T }\ninterface Object { toString(): string }\ninterface Function { prototype: unknown }\ninterface CallableFunction extends Function {}\ninterface NewableFunction extends Function {}\ninterface String { readonly length: number }\ninterface Boolean { valueOf(): boolean }\ninterface Number { valueOf(): number }\ninterface RegExp { test(string: string): boolean }";
/**
 * Returns a JSON validator for a given TypeScript schema. Validation is performed by an in-memory instance of
 * the TypeScript compiler. The specified type argument `T` must be the same type as `typeName` in the given `schema`.
 * @param schema A string containing the TypeScript source code for the JSON schema.
 * @param typeName The name of the JSON target type in the schema.
 * @returns A `TypeChatJsonValidator<T>` instance.
 */
function createTypeScriptJsonValidator(schema, typeName) {
    var options = __assign(__assign({}, typescript_1.default.getDefaultCompilerOptions()), { strict: true, skipLibCheck: true, noLib: true, types: [] });
    var rootProgram = createProgramFromModuleText("");
    var validator = {
        getSchemaText: function () { return schema; },
        getTypeName: function () { return typeName; },
        createModuleTextFromJson: createModuleTextFromJson,
        validate: validate
    };
    return validator;
    function validate(jsonObject) {
        var moduleResult = validator.createModuleTextFromJson(jsonObject);
        if (!moduleResult.success) {
            return moduleResult;
        }
        var program = createProgramFromModuleText(moduleResult.data, rootProgram);
        var syntacticDiagnostics = program.getSyntacticDiagnostics();
        var programDiagnostics = syntacticDiagnostics.length ? syntacticDiagnostics : program.getSemanticDiagnostics();
        if (programDiagnostics.length) {
            var diagnostics = programDiagnostics.map(function (d) { return typeof d.messageText === "string" ? d.messageText : d.messageText.messageText; }).join("\n");
            return (0, result_1.error)(diagnostics);
        }
        return (0, result_1.success)(jsonObject);
    }
    function createModuleTextFromJson(jsonObject) {
        return (0, result_1.success)("import { ".concat(typeName, " } from './schema';\nconst json: ").concat(typeName, " = ").concat(JSON.stringify(jsonObject, undefined, 2), ";\n"));
    }
    function createProgramFromModuleText(moduleText, oldProgram) {
        var fileMap = new Map([
            createFileMapEntry("/lib.d.ts", libText),
            createFileMapEntry("/schema.ts", schema),
            createFileMapEntry("/json.ts", moduleText)
        ]);
        var host = {
            getSourceFile: function (fileName) { return fileMap.get(fileName); },
            getDefaultLibFileName: function () { return "lib.d.ts"; },
            writeFile: function () { },
            getCurrentDirectory: function () { return "/"; },
            getCanonicalFileName: function (fileName) { return fileName; },
            useCaseSensitiveFileNames: function () { return true; },
            getNewLine: function () { return "\n"; },
            fileExists: function (fileName) { return fileMap.has(fileName); },
            readFile: function (fileName) { return ""; },
        };
        return typescript_1.default.createProgram(Array.from(fileMap.keys()), options, host, oldProgram);
    }
    function createFileMapEntry(filePath, fileText) {
        return [filePath, typescript_1.default.createSourceFile(filePath, fileText, typescript_1.default.ScriptTarget.Latest)];
    }
}
exports.createTypeScriptJsonValidator = createTypeScriptJsonValidator;
