// Callback function type for handling individual prompt flow nodes
export type PromptNodeCallback = (promptNode: PromptFlowNode) => void;

// Type for asynchronous API requests
export type PromptNodeRequest = (dagNode: PromptFlowNode, prompt: string) => Promise<any>;

// Type representing a prompt node, which can be either an inputs node, an outputs node, or a flow node
export type PromptNode = PromptOutputsNode | PromptInputsNode | PromptFlowNode;

// Constants defining the names of the start and end nodes in the prompt flow
export const PROMPT_START_NODE_NAME = "inputs";
export const PROMPT_END_NODE_NAME = "outputs";

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
  role?: Role | string;
  source: PromptChildSourceNode;
  inputs?: PromptChildInputsNode;
  output: string; // Default variable set for the chat return.
  [key: string]: any; // Additional properties can be added dynamically
}

// Interface representing the source of a prompt flow node
export interface PromptChildSourceNode {
  code?: string;
  path?: string;
  func?: string;
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
