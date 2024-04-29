# promptflowx

[![NPM version](https://img.shields.io/npm/v/promptflowx.svg?style=flat)](https://npmjs.com/package/promptflowx)
[![NPM version](https://img.shields.io/npm/types/promptflowx?style=flat)](https://npmjs.com/package/promptflowx)
[![NPM version](https://img.shields.io/npm/dm/promptflowx?style=flat)](https://npmjs.com/package/promptflowx)
[![chrome-version][chrome-image]][chrome-url]

[![Doc](https://img.shields.io/badge/Doc-online-green)](https://promptflowx.toscl.com)
[![Issue](https://img.shields.io/github/issues/10cl/promptflowx)](https://github.com/10cl/promptflowx/issues/new/choose)
[![Discussions](https://img.shields.io/github/discussions/10cl/promptflowx)](https://github.com/10cl/promptflowx/issues/new/choose)
[![License: MIT](https://img.shields.io/github/license/10cl/promptflowx)](https://github.com/10cl/promptflowx/blob/main/LICENSE)
[![discord][discord-image]][discord-url]
[![chrome-user][chrome-user-image]][chrome-user-url]



[discord-image]: https://img.shields.io/discord/977885982579884082?logo=discord
[discord-url]: https://discord.gg/fdjWfgGPjb
[chrome-url]: https://chromewebstore.google.com/detail/chatdev-ide-building-your/dopllopmmfnghbahgbdejnkebfcmomej
[chrome-image]: https://img.shields.io/chrome-web-store/v/dopllopmmfnghbahgbdejnkebfcmomej
[chrome-user-url]: https://chromewebstore.google.com/detail/chatdev-ide-building-your/dopllopmmfnghbahgbdejnkebfcmomej
[chrome-user-image]: https://img.shields.io/chrome-web-store/users/dopllopmmfnghbahgbdejnkebfcmomej

---
> This is the Typescript version of [promptflow](https://github.com/10cl/promptflowx).  join us to make prompt flow better by
> participating [discussions](https://github.com/10cl/promptflowx/discussions),
> opening [issues](https://github.com/10cl/promptflowx/issues/new/choose),
> submitting [PRs](https://github.com/10cl/promptflowx/pulls).


**Prompt flow** is a suite of development tools designed to streamline the end-to-end development cycle of LLM-based AI applications, from ideation, prototyping, testing, evaluation to production deployment and monitoring. It makes prompt engineering much easier and enables you to build LLM apps with production quality.

The letter **X** denotes its support for the **Context**.  Each node will as the `Global scope` within the flow operates in JavaScript.  
>JavaScript objects exhibit remarkable flexibility;  they can encompass various entities such as functions, arrays, dates, regular expressions, and more.  This inherent flexibility empowers JavaScript objects to aptly represent data structures and logic, enabling dynamic creation and modification of their structures as necessitated.

 
With prompt flow, you will be able to:

- **Create and iteratively develop flow**
  - Create executable flows that link LLMs, prompts, JavaScript code and other together.
  - Debug and iterate your flows, especially the interaction with LLMs with ease.
- **Evaluate flow quality and performance**
  - Evaluate your flow's quality and performance with larger datasets.
- **Streamlined development cycle for production**
  - Deploy your flow to the serving platform you choose or integrate into your app's code base easily.

## Feature comparison
<table style="width: 100%;">
  <tr>
    <th align="center">Feature</th>
    <th align="center">promptflowx</th>
    <th align="center">promptflow</th>
  </tr>
  <tr>
    <td align="center">Programming Approach</td>
    <td align="center">TypeScript</td>
    <td align="center">Python Code</td>
  </tr>
  <tr>
    <td align="center">IDE</td>
    <td align="center"><a href="http://github.com/10cl/chatdev">ChatDev</a></td>
    <td align="center">VS Code</td>
  </tr>
  <tr>
    <td align="center">WorkFlow</td>
    <td align="center">✅</td>
    <td align="center">✅</td>
  </tr>
  <tr>
    <td align="center">Supported Context</td>
    <td align="center">✅</td>
    <td align="center">❌</td>
  </tr>
  <tr>
    <td align="center">One-click Deployment</td>
    <td align="center">✅</td>
    <td align="center">❌</td>
  </tr>
</table>


------

## Installation

To get started quickly, you can use a pre-built development environment. **Click the button below** to edit your promptflowx in the Extension, and then continue the readme!

<a href="https://chrome.google.com/webstore/detail/chatdev-visualize-your-ai/dopllopmmfnghbahgbdejnkebfcmomej?utm_source=github"><img src="https://github.com/10cl/promptflowx/blob/main/screenshots/chrome-logo.png" width="200" alt="Get ChatDev for Chromium"></a>
<a href="https://microsoftedge.microsoft.com/addons/detail/ceoneifbmcdiihmgfjeodiholmbpmibm?utm_source=github"><img src="https://github.com/10cl/promptflowx/blob/main/screenshots/edge-logo.png" width="160" alt="Get ChatDev for Microsoft Edge"></a>
>more detail: https://github.com/10cl/chatdev?tab=readme-ov-file#-installation

If you want to get started in your local environment, first install the packages:

Ensure you have a `node` environment.

```sh
npm install promptflowx
```

## Quick Start ⚡
**Create a chatbot with prompt flow**

creates folder named `my_chatbot` and initiate a prompt flow(`flow.dag.yaml`) from a chat template like: 
```yaml
desc: "ChatBot Template"

outputs:
  reference: ${ChatBot_Template}

nodes:
  - name: ChatBot_Template
    source:
      code: "{intro}, we are chatting. I say to you: {prompt}. what you might say?"
    inputs:
      prompt: ${inputs.input_text}
      intro: "I want you to play a text-based adventure game. I play a character in this text-based adventure game."

```

**Setup a connection for your LLM API**

For LLM request, establish a connection by your define, each node will request the api, you can change the node Context or other things here:
```ts
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
```

**Chat with your flow**

In the `my_chatbot` folder, there's a `flow.dag.yaml` file that outlines the flow, including inputs/outputs, nodes,  connection, and the LLM model, etc
Interact with your chatbot by execute the code:
```ts
export async function nodeCallback(node: PromptFlowNode) {
  console.log('=> node handled:', node);
}
const yaml = fs.readFileSync(__dirname + '/my_chatbot/flow.dag.yaml', 'utf8');
const promptLibs = await promptflowx.buildLib(yaml, __dirname + '/my_chatbot/');
await promptflowx.execute(yaml, promptLibs, nodeRequest, nodeCallback, 'Hello.');
```

Next Step! Continue with the **Tutorial**  👇 section to delve deeper into prompt flow.

## Tutorial 🏃‍♂️

Prompt flow is a tool designed to **build high quality LLM apps**, the development process in prompt flow follows these steps: develop a flow, improve the flow quality, deploy the flow to production.

### Develop your own LLM apps

#### Browser Extension

We also offer a Browser extension (a flow designer) for an interactive flow development experience with UI.

![quick_start_chatdev.png](https://github.com/10cl/promptflowx/blob/main/screenshots/quick_start_chatdev.png)

You can install it from the <a href="https://chrome.google.com/webstore/detail/chatdev-visualize-your-ai/dopllopmmfnghbahgbdejnkebfcmomej?utm_source=github">chrome store</a>.

## Contributing

If you would like to contribute to this project, follow these steps:

1. Fork the repository.
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request 😄

## Author

**promptflowx** is authored and maintained by [10cl](https://github.com/10cl) and released under the [MIT License](./LICENSE). Special thanks to all the contributors ([list](https://github.com/10cl/promptflowx/contributors)) who have helped improve this
