import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import * as fs from 'fs';
import {promptflowx} from '../src';
import {PromptFlowNode} from '../src/index.d';

const mock = new MockAdapter(axios);

// Set up mock response data
mock.onGet('https://api.example.com/data').reply(200, {data: '********'});

/**
 * Fetch data from an LLM API based on a prompt.
 *
 * @param node
 * @param prompt The prompt to send to the API
 * @returns Promise<string> The response data from the API
 */
export async function nodeRequest(node: PromptFlowNode, prompt: string): Promise<string> {
  try {
    console.log('node prompt request: ' + prompt);
    const response = await axios.get('https://api.example.com/data');
    return response.data.data;
  } catch (error) {
    // Handle errors that occur during fetching
    console.error('Error fetching data from LLM API:', error);
    throw error; // You can choose to throw the error or return a default value
  }
}

export async function nodeCallback(node: PromptFlowNode) {
  console.log('=> node handled:', node);
}

describe('PromptFlowX Template: ', () => {
  it('my_chatbot', async () => {
    const yaml = fs.readFileSync(__dirname + '/func_file/flow.dag.yaml', 'utf8');
    const promptLibs = await promptflowx.buildLib(yaml, __dirname + '/func_file/');
    await promptflowx.execute(yaml, promptLibs, nodeRequest, nodeCallback, 'develop a website to introduce promptflowx.');
  });

  it('ChatDev', async () => {
    const yaml = fs.readFileSync(__dirname + '/chatdev/flow.dag.yaml', 'utf8');
    const promptLibs = await promptflowx.buildLib(yaml, __dirname + '/chatdev/');
    await promptflowx.execute(yaml, promptLibs, nodeRequest, nodeCallback, 'develop a website to introduce promptflowx.');
  });

  it('buildPath for ChatDev', async () => {
    const yaml = fs.readFileSync(__dirname + '/chatdev/flow.dag.yaml', 'utf8');
    const promptLibs = await promptflowx.buildLib(yaml, __dirname + '/chatdev/');
    let nodes = await promptflowx.buildPath(yaml, promptLibs)
    console.log(nodes)
  });
});
