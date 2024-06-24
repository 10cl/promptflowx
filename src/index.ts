import * as yamlParser from 'js-yaml';
import fs from 'fs';
import { getEvalInstance } from './promptflowx.eval';
import { Interpreter } from 'promptflow-eval';
// Callback function type for handling individual prompt flow nodes
export type PromptNodeCallback = (promptNode: PromptFlowNode) => void;
export type refCallBack = (inputKey: string, inputValue: any) => void


// Type for asynchronous API requests
export type PromptNodeRequest = (dagNode: PromptFlowNode, prompt: string) => Promise<any>;

// Type representing a prompt node, which can be either an inputs node, an outputs node, or a flow node
export type PromptNode = PromptOutputsNode | PromptInputsNode | PromptFlowNode;

// Constants defining the names of the start and end nodes in the prompt flow
export const PROMPT_START_NODE_NAME = "inputs";
export const PROMPT_END_NODE_NAME = "outputs";
export const SOURCE_REFERENCE_NODE_LIST = ["embedding", "doc"];

// Interface for the PromptFlowRequester, responsible for managing the execution and library building of prompt flows
export interface PromptFlowRequester {
  // Method to set the context for the prompt flow execution
  setContext: (context: any) => void;
  // Method to execute a prompt flow using the provided YAML, prompt library, and asynchronous request function
  execute: (yaml: string, promptLib: PromptLib, asyncRequest: PromptNodeRequest, callback: PromptNodeCallback, prompt?: string) => Promise<void>;
  // Method to build the prompt library based on the provided YAML and library folder
  buildLib: (yaml: string, libFolder: string) => Promise<PromptLib>;
  // Method to build the prompt fow path based on the provided YAML and library folder
  buildPath: (yaml: string, promptLib: PromptLib) => Promise<PromptFlowNode[]>;
}

// Interface representing a check on whether each node in the prompt flow has been visited
export interface PromptNodeCheck {
  [key: string]: boolean;
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

// Interface representing a node in the prompt flow
export interface PromptFlowNode {
  name: string;
  type?: string;
  role?: Role | string;
  source: PromptChildSourceNode;
  doc: PromptChildDocNode;
  embedding: PromptChildEmbeddingNode;
  inputs?: PromptChildInputsNode;
  output: any; // Default variable set for the chat return.
  [key: string]: any; // Additional properties can be added dynamically
}

// Interface representing the source of a prompt flow node
export interface PromptChildDocNode {
  url?: string;
  path?: string;
  [key: string]: any; // Additional properties can be added dynamically
}

// Interface representing the source of a prompt flow node
export interface PromptChildEmbeddingNode {
  doc?: any;
  query?: string;
  [key: string]: any; // Additional properties can be added dynamically
}

// Interface representing the source of a prompt flow node
export interface PromptChildSourceNode {
  code?: string;
  path?: string;
  func?: string;
  doc?: PromptChildDocNode;
  embedding?: PromptChildEmbeddingNode;
  [key: string]: any; // Additional properties can be added dynamically
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


declare var window: any;

export class PromptFlowX {
  private readonly prompt: string | undefined;
  private readonly yamlContent: string;
  private readonly funcLib: PromptLib;
  private readonly dag: PromptFlowDag;
  static context: any;
  public flowPath: PromptFlowNode[];

  constructor(prompt: string | undefined, yamlContent: string, funcLib: PromptLib) {
    this.yamlContent = yamlContent;
    this.dag = yamlParser.load(this.yamlContent) as PromptFlowDag;
    this.prompt = prompt;
    this.funcLib = funcLib;
    this.flowPath = []
  }

  private extractReference(raw: any): string | undefined {
    if (typeof raw == "string"){
      const referenceRegex = /^\$\{(\S+)\}$/;
      const match = raw.match(referenceRegex);
      return match ? match[1] : undefined;
    }
    return undefined
  }

  private addEdgeByInputValue(node: PromptFlowNode, inputValue: string, edges: PromptFlowEdge[]) {
    const valueRef = this.extractReference(inputValue);
    if (valueRef == undefined){
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
    if (dag.inputs){
      allNodes.push(dag.inputs);
    }
    allNodes.push(dag.outputs || ({} as PromptOutputsNode));

    nodes.forEach((dagNode) => {
      if (typeof dagNode.role == "string"){
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
      if (role.name == roleName){
        roleDefine = role
      }
    })
    if (roleDefine == undefined){
      throw new Error(`${roleName} Not Found`);
    }
    return roleDefine
  }


  async executePath(asyncRequest: PromptNodeRequest, callback: PromptNodeCallback) {
    for (const dagNode of this.flowPath) {
      if (dagNode !== undefined) {
        dagNode.output = await asyncRequest(dagNode, this.generatePromptQuery(dagNode));
        if (dagNode.source.func !== undefined) {
          await this.evalExecute(dagNode, dagNode.source.func)
        }
        if (callback) {
          callback(dagNode);
        }
      }
    }
  }

  async evalExecute(dagNode: PromptFlowNode, func: string){
    PromptFlowX.context.node = dagNode;
    Interpreter.global = PromptFlowX.context;
    const evalFunc = getEvalInstance(PromptFlowX.context);
    evalFunc(this.getFunctionCode(func));
  }

  updateContextVariable(){
    if (PromptFlowX.context === undefined) {
      if (typeof window !== 'undefined') {
        PromptFlowX.context = window;
      } else {
        PromptFlowX.context = {} as any;
      }
    }
  }

  isContextVariable(nodeName: string, nodeValue: string){
    if (PromptFlowX.context && PromptFlowX.context[nodeName] && PromptFlowX.context[nodeName][nodeValue] != undefined){
      return true
    }
    return false
  }

  async traversePath(edges: PromptFlowEdge[]) {
    const paths: string[][] = []; // All paths
    this.flowPath = []
    const validPath = await this.findPath(edges, PROMPT_START_NODE_NAME, PROMPT_END_NODE_NAME, new Set(), [], paths);
    if (validPath){
      await this.processPath(validPath);
    }else{
      for (const edge of edges) {
        if (edge.source == PROMPT_START_NODE_NAME){
          const checkPath = [PROMPT_START_NODE_NAME, edge.target]
          if (this.checkPath(checkPath)){
            for (let i = 0; i < paths.length; i++) {
              if (paths[i].indexOf(edge.target) == -1 && paths[i].indexOf(PROMPT_START_NODE_NAME) !== -1){
                paths[i].shift()
                const newValidPath = [...checkPath, ...paths[i]]
                if (this.checkPath(newValidPath)){
                  await this.processPath(newValidPath);
                  return
                }
              }
            }
          }
        }
      }
    }

  }

  checkPath(path: string[]) {
    const currentPath = [...path];

    const nodeCheck: PromptNodeCheck = {} as PromptNodeCheck;
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

      this.traversalRefNodes(dagNode, (inputKey, taskNode)=>{
        const inputValue = taskNode[inputKey];
        const valueRef = this.extractReference(inputValue);
        if (valueRef){
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
          if (findPath){
            return findPath
          }
        }
      }
    }

    visited.delete(currentNodeId);
    path.pop();
    return undefined
  }

  async processPath(path: string[]) {
    for (const nodeName of path) {
      const dagNode = this.findNodeByName(nodeName);
      if (dagNode !== undefined) {
        // empty llm output for check nodes.
        dagNode.output = ""
        if (dagNode.source.func !== undefined) {
          await this.evalExecute(dagNode, dagNode.source.func)
        }
        this.flowPath.push(dagNode)
      }
    }
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
        return this.prompt;
      }
    }
    if (this.isContextVariable(nodeName, value)){
      return PromptFlowX.context[nodeName][value]
    }
    throw new Error(`${nodeName}.${value} Node Not Found`);
  }

  generatePromptQuery(dagNode: PromptFlowNode): string {
    let requestPrompt = "";

    if (dagNode.source === undefined) {
      throw new Error(`[${dagNode.name}] source is undefined`);
    }

    requestPrompt += this.getPromptCode(dagNode);
    try {
      this.traversalRefNodes(dagNode, (inputKey, taskNode)=> {
        let inputValue = taskNode[inputKey];
        const valueRef = this.extractReference(inputValue);
        if (valueRef !== undefined) {
          const [prevNodeName, prevNodeValue] = valueRef.split(".");
          inputValue = this.getNodeValue(prevNodeName, prevNodeValue);
          if (taskNode && taskNode[inputKey]) {
            taskNode[inputKey] = inputValue
          }
        }else{
          if (inputKey == "query" || inputKey == "url"){
            const inputsNode = dagNode.inputs;
            if (inputsNode !== undefined) {
              Object.keys(inputsNode).forEach((inputsNodeKey) => {
                taskNode[inputKey] = taskNode[inputKey].replaceAll(`{${inputsNodeKey}}`, inputsNode[inputsNodeKey]);
              });
            }
          }
        }
        requestPrompt = requestPrompt.replaceAll(`{${inputKey}}`, inputValue);
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
      this.traversalRefNodes(dagNode, (inputKey, taskNode)=>{
        if (taskNode !== undefined) {
          Object.keys(taskNode).forEach((inputKey) => {
            let inputValue = taskNode[inputKey];
            this.addEdgeByInputValue(dagNode, inputValue, promptFlowEdges);
          })
        }
      })
    });

    const outputRef = this.extractReference(dagOutputsNode.reference);
    if (!outputRef || !dagOutputsNode.reference){
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
    promptNodes.forEach((node)=>{
      if (node.name != undefined){
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
        callback(inputKey, taskNode)
      });
    }
    SOURCE_REFERENCE_NODE_LIST.forEach((referenceNodeName) => {
      const taskNode = dagNode.source[referenceNodeName];
      if (taskNode !== undefined) {
        Object.keys(taskNode).forEach((inputKey) => {
          callback(inputKey, taskNode)
        });
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

  getPromptCode(dagNode: PromptFlowNode) {
    let sourceNode = dagNode.source;

    // add role.
    let roleDefined = ""
    const role = dagNode.role as Role;
    if (role){
      if (role.source.code){
        roleDefined = role.source.code
      }else if (role.source.path){
        roleDefined = this.funcLib[role.source.path]
      }
    }

    if (sourceNode.code) {
      return roleDefined + sourceNode.code;
    }

    if (!sourceNode.path) {
      return ""
    }

    let promptLibContent = this.funcLib[sourceNode.path];
    if (promptLibContent !== undefined) {
      return roleDefined + promptLibContent;
    } else if (sourceNode.path.endsWith(".js") || sourceNode.path.endsWith(".txt")) {
      throw new Error(`${sourceNode.path} not build, you need buildLib first.`);
    } else {
      throw new Error(`${sourceNode.path} not found`);
    }
  }
}
