let output = node.output;
node.task = output.split("<INFO>")[output.split("<INFO>").length - 1].toLowerCase().replace(/\./g, "").trim();
node.output = node.task;

node.gui = "website";
node.ideas = ""
node.language = "html"
node.modality = "website"
