let output = node.output
const task = output.split("<INFO>")[output.split("<INFO>").length - 1].toLowerCase().replace(/\./g, "").trim();
output = task;

node.test = 'test';
