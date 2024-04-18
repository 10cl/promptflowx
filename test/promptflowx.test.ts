import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import * as fs from 'fs';
import {promptflowx} from '../src';
import {PromptNodeRequest, PromptNodeCallback, PromptFlowNode} from '../src/index.d';

const mock = new MockAdapter(axios);

// Set up mock response data
mock.onGet('https://api.example.com/data').reply(200, {data: 'mocked data'});

/**
 * Fetch data from an external API based on a prompt.
 *
 * @param node
 * @param prompt The prompt to send to the API
 * @returns Promise<string> The response data from the API
 */
export async function PromptNodeRequest(node: PromptFlowNode, prompt: string): Promise<string> {
  try {
    console.log('prompt: ' + prompt);
    const response = await axios.get('https://api.example.com/data');
    return response.data.data;
  } catch (error) {
    // Handle errors that occur during fetching
    console.error('Error fetching data from external API:', error);
    throw error; // You can choose to throw the error or return a default value
  }
}

export async function callbackNode(node: PromptFlowNode) {
  console.log('=> node handled:', node);
}

export async function execute(
  yamlDesc: string,
  funcLib: any,
  asyncRequest: PromptNodeRequest,
  callback: PromptNodeCallback,
  prompt?: string,
) {
  return await promptflowx.execute(yamlDesc, funcLib, asyncRequest, callback, prompt);
}

describe('promptflowx execute with files', () => {
  it('run the agent with promptflowx files', async () => {
    const yaml = fs.readFileSync(__dirname + '/func_file/flow.dag.yaml', 'utf8');
    const promptLibs = await promptflowx.buildLib(yaml, __dirname + '/func_file/');
    await execute(yaml, promptLibs, PromptNodeRequest, callbackNode, 'develop a website to introduce promptflowx.');
  });
});

describe('promptflowx buildPath with files', () => {
  it('run the agent with promptflowx files', async () => {
    const yaml = fs.readFileSync(__dirname + '/func_file/flow.dag.yaml', 'utf8');
    const promptLibs = await promptflowx.buildLib(yaml, __dirname + '/func_file/');
    try {
      let nodes = await promptflowx.buildPath(yaml, promptLibs)
      console.log(nodes)
    }catch (e){
      console.log(e.toString())
    }
  });
});

describe('promptflowx of chat_with_ville', () => {
  it('run the agent', async () => {
    const yaml = fs.readFileSync(__dirname + '/chat_with_ville/flow.dag.yaml', 'utf8');
    const promptLibs = await promptflowx.buildLib(yaml, __dirname + '/chat_with_ville/');

    async function waitForCondition(): Promise<void> {
      while (!condition) {
        console.log("waiting...")
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    async function myAsyncFunction(): Promise<string> {
      await waitForCondition();
      console.log("xxx")
      return "xxx"
    }

    let condition: boolean = false;

    setTimeout(() => {
      condition = true;
    }, 5000);

    await execute(yaml, promptLibs, myAsyncFunction, callbackNode, 'How are you');
  });
});
