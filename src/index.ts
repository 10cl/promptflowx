import * as yamlParser from 'js-yaml';
import fs from 'fs';
import {
  PromptFlowRequester,
  PromptLib,
  PromptNodeRequest,
  PromptNodeCallback,
  PromptFlowDag,
  PromptFlowNode,
} from './index.d';
import {PromptFlowX} from './promptflowx';

// Export the module's functionality
export const promptflowx: PromptFlowRequester = {
  setContext(context: any): void {
    PromptFlowX.context = context;
  },

  async buildLib(yamlContent: string, libFolder: string): Promise<PromptLib> {
    const libPath = libFolder + "/" + "flow.lib.json"
    let promptLibs = {} as PromptLib
    if(fs.existsSync(libPath)){
      promptLibs = JSON.parse(fs.readFileSync(libFolder + "/" + "flow.lib.json", 'utf8'));
    }
    const dag = yamlParser.load(yamlContent) as PromptFlowDag;
    const nodes = (dag.nodes || []) as PromptFlowNode[];
    nodes.forEach((node) => {
      if (node.source) {
        const promptPath = libFolder + "/" + node.source.path
        if (node.source.path) {
          if(fs.existsSync(promptPath)){
            promptLibs[node.source.path] = fs.readFileSync(promptPath, 'utf8');
          }
        }
        if (node.source.func && node.source.func.endsWith(".js")) {
          promptLibs[node.source.func] = fs.readFileSync(libFolder + "/" + node.source.func, 'utf8');
        }
      }
    });
    return promptLibs
  },

  async execute(yaml: string, promptLib: PromptLib, asyncRequest: PromptNodeRequest, callback: PromptNodeCallback, prompt?: string): Promise<void> {
    const graph = new PromptFlowX(prompt, yaml, promptLib);
    graph.updateContextVariable()
    const nodes = graph.generateNodes();
    const edges = graph.generateEdges(nodes);
    await graph.traversePath(edges)
    await graph.executePath(asyncRequest, callback);
  },

  async buildPath(yaml: string, promptLib: PromptLib): Promise<PromptFlowNode[]> {
    const graph = new PromptFlowX("", yaml, promptLib);
    graph.updateContextVariable()
    const nodes = graph.generateNodes();
    const edges = graph.generateEdges(nodes);
    await graph.traversePath(edges);
    return graph.flowPath
  },

};
