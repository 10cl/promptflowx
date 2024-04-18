const transformCode = (codeStr: string): string => {
  const {transform} = require("@babel/standalone");
  return transform(codeStr, { presets: ["env"] }).code;
}

const getEvalInstance = (obj: any): ((codeStr: string) => any) => {
  const evil = require("promptflow-eval");
  const interpreter = new evil.Interpreter(obj, {
    timeout: 1000,
  });
  return (codeStr: string): any => interpreter.evaluate(transformCode(codeStr));
};

export { getEvalInstance };
