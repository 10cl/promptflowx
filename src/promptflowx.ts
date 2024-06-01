import * as yamlParser from 'js-yaml';
import fs from 'fs';
import { getEvalInstance } from './promptflowx.eval';
import { Interpreter } from 'promptflow-eval';
import {
  PromptFlowEdge,
  PromptFlowDag,
  PromptInputsNode,
  PromptFlowNode,
  PromptOutputsNode,
  PromptLib,
  PromptNodeRequest,
  PromptNode,
  PROMPT_END_NODE_NAME,
  PROMPT_START_NODE_NAME,
  PromptNodeCallback,
  PromptNodeCheck, Role
} from './promptflowx.types';

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

  private extractReference(raw?: string): string | undefined {
    const referenceRegex = /^\$\{(\S+)\}$/;
    const match = raw?.match(referenceRegex);
    return match ? match[1] : undefined;
  }

  private addEdgeByInputValue(node: PromptFlowNode, inputValue: string, edges: PromptFlowEdge[]) {
    const valueRef = this.extractReference(inputValue);
    const [prevNodeName] = valueRef?.split(".") ?? [];
    if (prevNodeName === node.name) {
      return;
    }
    if (prevNodeName) {
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
    let globalObj;
    if (PromptFlowX.context !== undefined) {
      globalObj = PromptFlowX.context;
    } else if (typeof window !== 'undefined') {
      globalObj = window;
    } else {
      globalObj = {} as any;
    }
    globalObj.node = dagNode;
    Interpreter.global = globalObj;
    const evalFunc = getEvalInstance(globalObj);
    evalFunc(this.getFunctionCode(func));
  }

  async traversePath(edges: PromptFlowEdge[]) {
    const visited: Set<string> = new Set(); // Record visited nodes
    const path: string[] = []; // Current path
    const paths: string[][] = []; // All paths
    this.flowPath = []
    await this.findPath(edges, PROMPT_START_NODE_NAME, PROMPT_END_NODE_NAME, visited, path, paths);
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
      const taskNode = dagNode.inputs;
      if (taskNode !== undefined) {
        Object.keys(taskNode).forEach((inputKey) => {
          const inputValue = taskNode[inputKey];
          const valueRef = this.extractReference(inputValue);
          const [prevNodeName] = valueRef?.split(".") ?? [];
          if (prevNodeName !== undefined && prevNodeName !== nodeName && !nodeCheck[prevNodeName]) {
            isRefDone = false;
          }
        });
      }

      if (isRefDone) {
        currentPath.shift();
        nodeCheck[nodeName] = true;
      }
    }

    return currentPath.length <= 0;
  }

  async findPath(graph: PromptFlowEdge[], currentNodeId: string, endNodeId: string, visited: Set<string>, path: string[], paths: string[][]) {
    visited.add(currentNodeId);
    path.push(currentNodeId);

    if (currentNodeId === endNodeId) {
      if (this.checkPath(path)) {
        await this.processPath(path);
      }
      paths.push([...path]);
    } else {
      const outgoingEdges = graph.filter((edge) => edge.source === currentNodeId);

      for (const edge of outgoingEdges) {
        const neighborNodeId = edge.target;
        if (!visited.has(neighborNodeId)) {
          await this.findPath(graph, neighborNodeId, endNodeId, visited, path, paths);
        }
      }
    }

    visited.delete(currentNodeId);
    path.pop();
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
    if (nodeName === PROMPT_START_NODE_NAME) {
      if (value === "input_text") {
        return this.prompt;
      }
    }

    const dagNode = this.findNodeByName(nodeName);
    if (dagNode === undefined) {
      throw new Error(`${nodeName} Node Not Found`);
    }
    return dagNode[value];
  }

  generatePromptQuery(dagNode: PromptFlowNode): string {
    let requestPrompt = "";

    if (dagNode.source === undefined) {
      throw new Error(`[${dagNode.name}] source is undefined`);
    }

    requestPrompt += this.getPromptCode(dagNode);
    try {
      if (dagNode.inputs != undefined){
        Object.entries(dagNode.inputs).forEach(([inputKey, inputValue]) => {
          const valueRef = this.extractReference(inputValue);
          if (valueRef !== undefined) {
            const [prevNodeName, prevNodeValue] = valueRef.split(".") ?? [];
            inputValue = this.getNodeValue(prevNodeName, prevNodeValue);
            if (dagNode.inputs && dagNode.inputs[inputKey]){
              dagNode.inputs[inputKey] = inputValue
            }
          }
          requestPrompt = requestPrompt.replaceAll(`{${inputKey}}`, inputValue);
        });
      }
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
      Object.keys(dagNode.inputs ?? {}).forEach((inputKey) => {
        if (dagNode.inputs) {
          const inputValue = dagNode.inputs[inputKey];
          this.addEdgeByInputValue(dagNode, inputValue, promptFlowEdges);
        }
      });
    });

    const outputRef = this.extractReference(dagOutputsNode.reference);
    if (!dagOutputsNode.reference){
      throw new Error(`outputs.reference not defined`);
    }
    const [outputRefNodeName] = outputRef?.split(".") ?? [];
    if (outputRefNodeName && promptNodes.some((node) => node.name === outputRefNodeName)) {
      const promptFlowEdge = {
        source: outputRefNodeName,
        target: PROMPT_END_NODE_NAME
      } as PromptFlowEdge;

      if (!promptFlowEdges.some((edge) => (edge.source === promptFlowEdge.source && edge.target === promptFlowEdge.target))) {
        promptFlowEdges.push(promptFlowEdge);
      }
    }
    promptNodes.forEach((node)=>{
      const promptFlowEdge = {
        source: PROMPT_START_NODE_NAME,
        target: node.name
      } as PromptFlowEdge;
      if (!promptFlowEdges.some((edge) => (edge.target === promptFlowEdge.target))) {
        promptFlowEdges.push(promptFlowEdge);
      }
    })

    return promptFlowEdges;
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
      throw new Error(`${dagNode.name} source not found`);
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
