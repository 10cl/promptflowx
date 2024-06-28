import jsyaml from 'js-yaml';
import fs from 'fs';

// Callback function type for handling individual prompt flow nodes
import {Document} from "@langchain/core/documents";
import {loadDocuments, loadTextBySplitter, retrieveEmbedding} from "./loader";
import {Interpreter} from "promptflow-eval";
import {getEvalInstance} from "./promptflowx.eval";
import {createJsonPrintAgent} from "./scheme/scheme";
import {type} from "os";

// Type for asynchronous API requests
export type PromptNodeRequest = (dagNode: PromptFlowNode, prompt: string) => Promise<any>;
export type PromptNodeEmbeddingRequest = (text: string) => Promise<number[]>;
export type PromptNodeCallback = (promptNode: PromptFlowNode) => void;
export type refCallBack = (inputKey: string, taskNode: any, type: string) => void

// Type representing a prompt node, which can be either an inputs node, an outputs node, or a flow node
export type PromptNode = PromptOutputsNode | PromptInputsNode | PromptFlowNode;

// Constants defining the names of the start and end nodes in the prompt flow
export const PROMPT_START_NODE_NAME = "inputs";
export const PROMPT_END_NODE_NAME = "outputs";
export const SOURCE_REFERENCE_NODE_LIST = ["embedding", "doc"];

// Interface for the PromptFlowRequester, responsible for managing the execution and library building of prompt flows
export interface PromptFlowRequester {
  // Method to execute a prompt flow using the provided YAML, prompt library, and asynchronous request function
  execute: (context: Context, yaml: string, prompt?: string) => Promise<void>;
  // Method to build the prompt library based on the provided YAML and library folder
  buildLib: (yaml: string, libFolder: string) => Promise<PromptLib>;
  // Method to build the prompt fow path based on the provided YAML and library folder
  buildPath: (context: Context, yaml: string) => Promise<PromptFlowNode[]>;
}

// Interface representing a check on whether each node in the prompt flow has been visited
export interface Context {
  promptflowx: PromptFlowContext;

  [key: string]: any;
}

// Interface representing a check on whether each node in the prompt flow has been visited
export interface PromptFlowContext {
  /*llm api request defined*/
  request?: PromptNodeRequest;

  /*embedding support.*/
  embeddingRequest?: PromptNodeEmbeddingRequest;

  /* prompt libs*/
  libs?: PromptLib;

  /* node handle callback */
  callback?: PromptNodeCallback;

  [key: string]: any;
}

// Interface representing the outputs node in the prompt flow
export interface PromptOutputsNode {
  name: "outputs";
  reference: string;

  [key: string]: any; // Additional properties can be added dynamically
}

// Interface representing the inputs node in the prompt flow
export interface PromptInputsNode {
  name: "inputs";
  input_text?: string;
}

export type PromptFlowNode = PromptFlowPromptNode | PromptFlowSchemeNode | PromptFlowDocNode | PromptFlowRetrieveNode;
export type PromptChildDocNode = PromptChildDocPathNode | PromptChildDocUrlNode | PromptChildDocReferenceNode;

// Interface representing a node in the prompt flow
export interface PromptFlowPromptNode {
  name: string;
  type?: "prompt";
  role?: Role | string;
  source: {
    code: string;
    func?: string;
  } | {
    path: string;
    func?: string;
  }
  inputs?: PromptChildInputsNode;
  output: any; // Default variable set for the chat return.
  [key: string]: any; // Additional properties can be added dynamically
}

// Interface representing a node in the prompt flow
export interface PromptFlowSchemeNode {
  name: string;
  type: "scheme";
  role?: Role | string;
  source: {
    scheme: PromptChildSchemePathNode | PromptChildSchemeCodeNode;
    code: string;
    func?: string;
  } | {
    scheme: PromptChildSchemePathNode | PromptChildSchemeCodeNode;
    path: string;
    func?: string;
  }
  inputs?: PromptChildInputsNode;
  output: any; // Default variable set for the chat return.
  [key: string]: any; // Additional properties can be added dynamically
}

// Interface representing a node in the prompt flow
export interface PromptFlowDocNode {
  name: string;
  type: "doc";
  source: {
    doc: PromptChildDocNode;
    func?: string
  }
  inputs?: PromptChildInputsNode;
  output: Document[]; // Default variable set for the chat return.
  [key: string]: any; // Additional properties can be added dynamically
}

// Interface representing a node in the prompt flow
export interface PromptFlowRetrieveNode {
  name: string;
  type: "retrieve";
  source: {
    embedding: PromptChildEmbeddingNode;
    func?: string
  }
  inputs?: PromptChildInputsNode;
  output: Document[]; // Default variable set for the chat return.
  [key: string]: any; // Additional properties can be added dynamically
}

// Interface representing the source of a prompt flow node
export interface PromptChildSplitterNode {
  name: "character" | "recursive" | "token" | "html" | "markdown" | "code"
  separator?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
  encodingName?: "gpt2" | "r50k_base" | "p50k_base" | "p50k_edit" | "cl100k_base" | "o200k_base";
  language?: "cpp" | "go" | "java" | "js" | "php" | "proto" | "python" | "rst" | "ruby" | "rust" | "scala" | "swift" | "markdown" | "latex" | "html" | "sol";
  [key: string]: any; // Additional properties can be added dynamically
}

// Interface representing the source of a prompt flow node
export interface PromptChildEmbeddingNode {
  doc: Document[];
  query: string;
}

// Interface representing the source of a prompt flow node
export interface PromptChildDocPathNode {
  path: string;
  splitter?: PromptChildSplitterNode;
}

// Interface representing the source of a prompt flow node
export interface PromptChildDocUrlNode {
  url: string;
  splitter?: PromptChildSplitterNode;
}

// Interface representing the source of a prompt flow node
export interface PromptChildDocReferenceNode {
  reference: string | Document[];
  splitter?: PromptChildSplitterNode;
}


// Interface representing the source of a prompt flow node
export interface PromptChildSchemePathNode {
  scheme: string;
  scheme_type: string;
}

// Interface representing the source of a prompt flow node
export interface PromptChildSchemeCodeNode {
  scheme: string;
  scheme_type: string;
}

// Interface representing the inputs of a prompt flow node
export interface PromptChildInputsNode {
  [key: string]: string;
}

// Interface representing an edge in the prompt flow graph
export interface PromptFlowEdge {
  source: string;
  target: string;
}

// Interface representing a role in the prompt flow
export interface Role {
  name: string;
  npc?: string;
  source: RoleChildSourceNode;
}

// Interface representing the source of a role node
export interface RoleChildSourceNode {
  code?: string;
  path?: string;
}

// Interface representing the entire Directed Acyclic Graph (DAG) structure of the prompt flow
export interface PromptFlowDag {
  inputs?: PromptInputsNode;
  outputs: PromptOutputsNode;
  nodes: PromptFlowNode[];
  roles?: Role[]; // Optional roles associated with the prompt flow
  tips?: string[]; // Optional tips or additional information
  desc?: string; // Description of the prompt flow
}

// Interface representing the prompt library, mapping function paths to their corresponding code
export interface PromptLib {
  [key: string]: string;
}

class PromptFlowX {
  private readonly prompt?: string;
  private readonly yamlContent: string;
  private readonly funcLib: PromptLib;
  private readonly dag: PromptFlowDag;
  private readonly context: Context;
  public referenceCache: {[key: string]: string}

  constructor(context: Context, yamlContent: string, prompt?: string) {
    this.context = context;
    this.yamlContent = yamlContent;
    this.dag = jsyaml.load(this.yamlContent) as PromptFlowDag;
    this.prompt = prompt;
    this.funcLib = context.promptflowx.libs ? context.promptflowx.libs : {};
    this.referenceCache = {}
  }

  private extractReference(raw: any): string | undefined {
    if (typeof raw == "string") {
      const referenceRegex = /^\$\{(\S+)\}$/;
      const match = raw.match(referenceRegex);
      return match ? match[1] : undefined;
    }
    return undefined
  }

  private addEdgeByInputValue(node: PromptFlowNode, inputValue: string, edges: PromptFlowEdge[]) {
    const valueRef = this.extractReference(inputValue);
    if (valueRef == undefined) {
      return;
    }
    const [prevNodeName, prevNodeValue] = valueRef.split(".");
    if (prevNodeName === node.name) {
      return;
    }
    if (prevNodeName && !this.isContextVariable(prevNodeName, prevNodeValue)) {
      const currentEdge = {
        source: prevNodeName,
        target: node.name
      } as PromptFlowEdge;

      if (!edges.some((edge) => (edge.source === currentEdge.source && edge.target === currentEdge.target))) {
        edges.push(currentEdge);
      }
    }
  }

  generateNodes(): PromptNode[] {
    const dag = this.dag as PromptFlowDag;
    const nodes = (dag.nodes || []) as PromptFlowNode[];

    const allNodes: PromptNode[] = [];
    if (dag.inputs) {
      allNodes.push(dag.inputs);
    }
    allNodes.push(dag.outputs || ({} as PromptOutputsNode));

    nodes.forEach((dagNode) => {
      if (typeof dagNode.role == "string") {
        const roleName = dagNode.role
        dagNode.role = this.getRoleByName(roleName)
      }
      allNodes.push(dagNode);
    });

    return allNodes;
  }

  getRoleByName(roleName: String) {
    const roles = this.dag.roles || [];
    let roleDefine = undefined
    roles.forEach((role) => {
      if (role.name == roleName) {
        roleDefine = role
      }
    })
    if (roleDefine == undefined) {
      throw new Error(`${roleName} Not Found`);
    }
    return roleDefine
  }


  async executePath(flowPath: PromptFlowNode[], asyncRequest: PromptNodeRequest, callback?: PromptNodeCallback) {
    for (const dagNode of flowPath) {
      let prompt = this.generatePromptQuery(dagNode, true)
      switch (dagNode.type) {
        case "scheme":
          const schemeNode = dagNode as PromptFlowSchemeNode;
          const schemeType = schemeNode.source.scheme.scheme_type
          const schemePath = schemeNode.source.scheme.scheme
          const schema = this.funcLib[schemePath]

          prompt = prompt.replace("{scheme}", schema);
          prompt = prompt.replace("{scheme_type}", schemeType);

          const agent = createJsonPrintAgent(this.context, dagNode, schema, schemeType);

          const response = await agent.handleMessage(prompt);
          if (!response.success) {
            throw new Error("Scheme Translation Failed ❌")
          }
          dagNode.output = response.data
          break
        case "doc":
          await asyncRequest(dagNode, prompt);

          const docNode = dagNode as PromptFlowDocNode
          const docOutput = [] as Document[]
          const docChildNode = docNode.source.doc
          let noSplitterDocs = "" as Document[] | string;
          let mark = ""
          if ("url" in docChildNode) {
            mark = docChildNode.url
            noSplitterDocs = await loadDocuments(this.context, docChildNode.url, docChildNode)
          } else if ("path" in docChildNode) {
            mark = docChildNode.path
            noSplitterDocs = this.funcLib[docChildNode.path]
          }else if ("reference" in docChildNode){
            if (typeof docChildNode.reference != "string"){
              noSplitterDocs = docChildNode.reference;
              if (noSplitterDocs.length > 0){
                mark = noSplitterDocs[0].metadata.mark
              }
            }
          }

          const splitterDocs = await loadTextBySplitter(noSplitterDocs, docChildNode)

          if (splitterDocs.length == 0){
            throw Error("`" + docNode.name + "` no document here.")
          }

          for (let i = 0; i < splitterDocs.length; i++) {
           splitterDocs[i].metadata.mark = mark;
          }

          docNode.output = splitterDocs
          break
        case "retrieve":
          await asyncRequest(dagNode, prompt);

          const promptFlowRetrieveNode = dagNode as PromptFlowRetrieveNode
          const embeddingNode = promptFlowRetrieveNode.source.embedding
          dagNode.output = await retrieveEmbedding(this.context, embeddingNode)
          break
        default:
          dagNode.type = "prompt"
          const promptNode = dagNode as PromptFlowPromptNode
          promptNode.output = await asyncRequest(dagNode, this.template(prompt, promptNode));
          break
      }
      if (dagNode.source.func !== undefined) {
        await this.evalExecute(dagNode, dagNode.source.func)
      }
      if (callback) {
        callback(dagNode);
      }
    }
  }

  async evalExecute(dagNode: PromptFlowNode, func: string) {
    this.context.node = dagNode;
    Interpreter.global = this.context;
    const evalFunc = getEvalInstance(this.context);
    evalFunc(this.getFunctionCode(func));
  }

  isContextVariable(nodeName: string, nodeValue: string) {
    if (this.context && this.context[nodeName]) {
      return true
    }
    return false
  }

  async traversePath(edges: PromptFlowEdge[]) {
    const paths: string[][] = []; // All paths
    const flowPath = [] as PromptFlowNode[]
    const validPath = await this.findPath(edges, PROMPT_START_NODE_NAME, PROMPT_END_NODE_NAME, new Set(), [], paths);
    if (validPath) {
      return await this.processPath(flowPath, validPath);
    } else {
      for (const edge of edges) {
        if (edge.source == PROMPT_START_NODE_NAME) {
          const checkPath = [PROMPT_START_NODE_NAME, edge.target]
          if (this.checkPath(checkPath)) {
            for (let i = 0; i < paths.length; i++) {
              if (paths[i].indexOf(edge.target) == -1 && paths[i].indexOf(PROMPT_START_NODE_NAME) !== -1) {
                paths[i].shift()
                const newValidPath = [...checkPath, ...paths[i]]
                if (this.checkPath(newValidPath)) {
                  return await this.processPath(flowPath, newValidPath);
                }
              }
            }
          }
        }
      }
    }
    return [] as PromptFlowNode[]
  }

  checkPath(path: string[]) {
    const currentPath = [...path];

    const nodeCheck = {} as { [key: string]: boolean };
    nodeCheck[PROMPT_START_NODE_NAME] = true;
    nodeCheck[PROMPT_END_NODE_NAME] = false;
    this.dag.nodes?.forEach((node) => {
      nodeCheck[node.name] = false;
    });

    let preNodeName = "";
    while (currentPath.length > 0) {
      const nodeName = currentPath[0];

      if (preNodeName === nodeName) {
        break;
      }

      preNodeName = nodeName;

      const dagNode = this.dag.nodes.find((node) => node.name === nodeName);

      if (nodeName === PROMPT_START_NODE_NAME || nodeName === PROMPT_END_NODE_NAME) {
        currentPath.shift();
        continue;
      }

      if (dagNode === undefined) {
        throw new Error(`${nodeName} Node Not Found`);
      }

      let isRefDone = true;

      this.traversalRefNodes(dagNode, (inputKey, taskNode) => {
        const inputValue = taskNode[inputKey];
        const valueRef = this.extractReference(inputValue);
        if (valueRef) {
          const [prevNodeName, prevNodeValue] = valueRef.split(".");
          if (prevNodeName !== nodeName && (!nodeCheck[prevNodeName] && !this.isContextVariable(prevNodeName, prevNodeValue))) {
            isRefDone = false;
          }
        }
      })

      if (isRefDone) {
        currentPath.shift();
        nodeCheck[nodeName] = true;
      }
    }

    return currentPath.length <= 0;
  }

  async findPath(graph: PromptFlowEdge[], currentNodeId: string, endNodeId: string, visited: Set<string>, path: string[], paths: string[][]): Promise<undefined | string[]> {
    visited.add(currentNodeId);
    path.push(currentNodeId);

    if (currentNodeId === endNodeId) {
      if (this.checkPath(path)) {
        return path
      }
      paths.push([...path]);
    } else {
      const outgoingEdges = graph.filter((edge) => edge.source === currentNodeId);

      for (const edge of outgoingEdges) {
        const neighborNodeId = edge.target;
        if (!visited.has(neighborNodeId)) {
          const findPath = await this.findPath(graph, neighborNodeId, endNodeId, visited, path, paths);
          if (findPath) {
            return findPath
          }
        }
      }
    }

    visited.delete(currentNodeId);
    path.pop();
    return undefined
  }

  async processPath(flowPath: PromptFlowNode[], path: string[]) {
    for (const nodeName of path) {
      const dagNode = this.findNodeByName(nodeName);
      if (dagNode !== undefined) {
        this.generatePromptQuery(dagNode, false)

        // mock llm output for check next node.
        switch (dagNode.type){
          case "prompt":
          case "scheme":
            dagNode.output = ""
            break
          case "doc":
            let splitterDocs = [] as Document[]
            dagNode.output = splitterDocs
            break
          case "retrieve":
            dagNode.output = [] as Document[]
            break
          default:
            dagNode.output = ""
        }

        if (dagNode.source.func !== undefined) {
          await this.evalExecute(dagNode, dagNode.source.func)
        }

        flowPath.push(dagNode)
      }
    }
    return flowPath
  }

  findNodeByName(nodeName: string) {
    return this.dag.nodes?.find((node) => node.name === nodeName);
  }

  getNodeValue(nodeName: string, value: string) {
    const dagNode = this.findNodeByName(nodeName);
    if (dagNode !== undefined && dagNode[value] != undefined) {
      return dagNode[value]
    }
    if (nodeName === PROMPT_START_NODE_NAME) {
      if (value === "input_text") {
        return this.prompt ? this.prompt : "";
      }
    }
    if (this.isContextVariable(nodeName, value)) {
      if (this.context[nodeName][value] == undefined){
        throw Error(dagNode?.name + " ${" + nodeName + "." +  value + "} is not defined.")
      }
      return this.context[nodeName][value]
    }
    throw new Error(`${nodeName}.${value} Node Not Found`);
  }

  generatePromptQuery(dagNode: PromptFlowNode, updateNode: boolean): string {
    if (dagNode.source === undefined) {
      throw new Error(`[${dagNode.name}] source is undefined`);
    }

    let requestPrompt = this.getPromptCode(dagNode);
    try {
      this.traversalRefNodes(dagNode, (inputKey, taskNode, typeName) => {
        let inputValue = taskNode[inputKey];
        if(updateNode && this.referenceCache[typeName + ":" + inputKey]){
          inputValue = this.referenceCache[typeName + ":" + inputKey]
        }
        const valueRef = this.extractReference(inputValue);
        if (valueRef !== undefined) {
          const [prevNodeName, prevNodeValue] = valueRef.split(".");
          if (!updateNode){
            this.referenceCache[typeName + ":" + inputKey] = inputValue
          }
          taskNode[inputKey] = this.getNodeValue(prevNodeName, prevNodeValue)
        } else {
          if (inputKey == "query" || inputKey == "url") {
            const inputsNode = dagNode.inputs;
            if (inputsNode !== undefined) {
              Object.keys(inputsNode).forEach((inputsNodeKey) => {
                // string replace
                if (updateNode){
                  taskNode[inputKey] = taskNode[inputKey].replaceAll(`{${inputsNodeKey}}`, inputsNode[inputsNodeKey]);
                }
              });
            }
          }
        }
        if (updateNode){
          // string replace
          requestPrompt = requestPrompt.replaceAll(`{${inputKey}}`, taskNode[inputKey]);
        }
      })
    } catch (e) {
      throw new Error(`[${dagNode.name}] ${e}`);
    }
    return requestPrompt;
  }

  generateEdges(promptNodes: PromptNode[]) {
    const dag = this.dag;

    const dagOutputsNode = (dag.outputs || {}) as PromptOutputsNode;
    const nodes = (dag.nodes || {}) as PromptFlowNode[];
    const promptFlowEdges: PromptFlowEdge[] = [];

    nodes.forEach((dagNode) => {
      this.traversalRefNodes(dagNode, (inputKey, taskNode) => {
        if (taskNode !== undefined) {
          let inputValue = taskNode[inputKey];
          this.addEdgeByInputValue(dagNode, inputValue, promptFlowEdges)
        }
      })
    });

    const outputRef = this.extractReference(dagOutputsNode.reference);
    if (!outputRef || !dagOutputsNode.reference) {
      throw new Error(`outputs.reference not defined`);
    }
    const [outputRefNodeName] = outputRef.split(".");
    if (promptNodes.some((node) => node.name === outputRefNodeName)) {
      const promptFlowEdge = {
        source: outputRefNodeName,
        target: PROMPT_END_NODE_NAME
      } as PromptFlowEdge;

      if (!promptFlowEdges.some((edge) => (edge.source === promptFlowEdge.source && edge.target === promptFlowEdge.target))) {
        promptFlowEdges.push(promptFlowEdge);
      }
    }
    promptNodes.forEach((node) => {
      if (node.name != undefined) {
        const promptFlowEdge = {
          source: PROMPT_START_NODE_NAME,
          target: node.name
        } as PromptFlowEdge;
        if (!promptFlowEdges.some((edge) => (edge.target === promptFlowEdge.target))) {
          promptFlowEdges.push(promptFlowEdge);
        }
      }
    })

    return promptFlowEdges;
  }

  traversalRefNodes(dagNode: PromptFlowNode, callback: refCallBack) {
    const taskNode = dagNode.inputs;
    if (taskNode !== undefined) {
      Object.keys(taskNode).forEach((inputKey) => {
        callback(inputKey, taskNode, dagNode.name + ":inputs")
      });
    }
    SOURCE_REFERENCE_NODE_LIST.forEach((referenceNodeName) => {
      let referenceNode = {} as (PromptChildEmbeddingNode | PromptChildDocNode)
      switch (referenceNodeName) {
        case "embedding":
          const promptFlowRetrieveNode = dagNode as PromptFlowRetrieveNode
          referenceNode = promptFlowRetrieveNode.source.embedding;
          break
        case "doc":
          const docNode = dagNode as PromptFlowDocNode
          referenceNode = docNode.source.doc;
          break
      }
      if (referenceNode) {
        const referenceNodeKeys = Object.keys(referenceNode)
        if (referenceNodeKeys.length > 0) {
          referenceNodeKeys.forEach((inputKey) => {
            callback(inputKey, referenceNode, dagNode.name + ":" + referenceNodeName)
          });
        }
      }
    })
  }

  getFunctionCode(funcPath: string) {
    let promptLibContent = this.funcLib[funcPath];
    if (promptLibContent !== undefined) {
      return promptLibContent;
    } else if (funcPath.endsWith(".js") || funcPath.endsWith(".txt")) {
      return fs.readFileSync(process.cwd() + "/" + funcPath, 'utf8');
    } else {
      throw new Error(`${funcPath} Not Found`);
    }
  }

  getPromptCode(promptNode: PromptFlowNode) {
    const sourceNode = promptNode.source
    // add role.
    let roleDefined = ""
    const role = promptNode.role as Role;
    if (role) {
      if (role.source.code) {
        roleDefined = role.source.code
      } else if (role.source.path) {
        roleDefined = this.funcLib[role.source.path]
      }
    }

    if ("code" in sourceNode && sourceNode.code) {
      return roleDefined + sourceNode.code;
    }

    if ("path" in sourceNode) {
      let promptLibContent = this.funcLib[sourceNode.path];
      if (promptLibContent !== undefined) {
        return roleDefined + promptLibContent;
      } else if (sourceNode.path.indexOf(".") !== -1) {
        throw new Error(`${sourceNode.path} not build, you need buildLib first.`);
      } else {
        throw new Error(`${sourceNode.path} not found`);
      }
    }

    return ""
  }

  private template(prompt: string, dagNode: PromptFlowNode) {
    const templateReg = /\{\{[^\}]+\}\}/g;
    const containsTemplateSyntax = templateReg.test(prompt);
    if (containsTemplateSyntax) {
      //const template = handlebars.compile(prompt);
      // prompt = template(dagNode.inputs);
      const templateExecute = require('promptflow-template');
      prompt = templateExecute.render(prompt, dagNode.inputs);
    }
    return prompt;
  }

}
// Export the module's functionality
export const promptflowx: PromptFlowRequester = {
  async buildLib(yamlContent: string, libFolder: string): Promise<PromptLib> {
    const libPath = libFolder + "/" + "flow.dag.json"
    let promptLibs = {} as PromptLib
    if (fs.existsSync(libPath)) {
      promptLibs = JSON.parse(fs.readFileSync(libFolder + "/" + "flow.dag.json", 'utf8'));
    }
    const dag = jsyaml.load(yamlContent) as PromptFlowDag;
    const nodes = (dag.nodes || []) as PromptFlowNode[];
    nodes.forEach((node) => {
      if (node.source) {
        if ("path" in node.source) {
          const promptPath = libFolder + "/" + node.source.path
          if (fs.existsSync(promptPath)) {
            promptLibs[node.source.path] = fs.readFileSync(promptPath, 'utf8');
          }
        }
        if (node.source.func && node.source.func.endsWith(".js")) {
          promptLibs[node.source.func] = fs.readFileSync(libFolder + "/" + node.source.func, 'utf8');
        }

        if ("scheme" in node.source) {
          promptLibs[node.source.scheme.scheme] = fs.readFileSync(libFolder + "/" + node.source.scheme.scheme, 'utf8');
        }

        if ("doc" in node.source && "path" in node.source.doc) {
          promptLibs[node.source.doc.path] = fs.readFileSync(libFolder + "/" + node.source.doc.path, 'utf8');
        }
      }
    });
    return promptLibs
  },

  async execute(context: Context, yaml: string, prompt?: string): Promise<void> {
    const graph = new PromptFlowX(context, yaml, prompt);
    const nodes = graph.generateNodes();
    const edges = graph.generateEdges(nodes);
    const flowPath = await graph.traversePath(edges)
    if (!context.promptflowx.request) {
      throw Error("Context promptflowx request function not defined.")
    }
    await graph.executePath(flowPath, context.promptflowx.request, context.promptflowx.callback);
  },

  async buildPath(context: Context, yaml: string): Promise<PromptFlowNode[]> {
    const graph = new PromptFlowX(context, yaml);
    const nodes = graph.generateNodes();
    const edges = graph.generateEdges(nodes);
    return await graph.traversePath(edges);
  },

};
