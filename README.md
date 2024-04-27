# promptflowx

[![NPM version](https://img.shields.io/npm/v/promptflowx.svg?style=flat)](https://npmjs.com/package/promptflowx)

---

Like [promptflow](https://github.com/microsoft/promptflow), but this is the Typescript version.

## Usage

To use promptflowx, install the package via NPM:

```bash
npm i promptflowx
```

## **YAML Writing Guide**

Welcome to PromptFlowX! This guide is designed to assist you in crafting PromptFlow YAML documents accurately to define your PromptFlow processes. Please adhere to the guidelines below:

### 1. Describe the Agent

Begin the YAML file with a description of your Agent. This description will be displayed on the game map when hovering over the Agent.

```yaml
desc: 'Description of the Agent'
```

### 2. Define Node Outputs

Specify the final output node of the PromptFlow process. This node represents the endpoint of the entire process, typically reflecting the final output after user interaction with the Agent.

```yaml
outputs:
  reference: ${FinalOutputNodeName}
```

### 3. Define Nodes

Create an entry for each node, detailing the node's name, source (the path to the corresponding Prompt or function for that node), and input parameters if applicable.

```yaml
nodes:
  - name: NodeName
    source:
      path: PathToNodesPromptOrFunction
    inputs:
      input_text: ${inputs.input_text} # Input parameter example
      intro: 'xxx' # Input parameter example
```

* `name`: The name of the node, serving as its unique identifier.
* `source.path`: The path to the Prompt or function corresponding to the node.
* `inputs`: Optionally, define input parameters for the node. Specify input parameters for the node as needed, utilizing placeholders for parameter names and values, such as `${inputs.input_text}`.

### 4. Considerations

* Ensure node names are unique and do not conflict with other node names in the process.
* Configure input and output parameters for nodes according to your specific requirements.

### Example

Below is a concise example of a PromptFlow YAML file:

```yaml
desc: 'Welcome to PromptFlow'
outputs:
  reference: ${FinalOutputNodeName}

nodes:
  - name: Node1
    source:
      path: PathToNode1sPromptOrFunction
    inputs:
      input_text: ${inputs.input_text}
      intro: 'This is the introduction for Node 1'

  - name: FinalOutputNodeName
    source:
      path: PathToNode2sPromptOrFunction
    inputs:
      input_text: ${inputs.input_text}
      option: 'Option 1'

  # Definitions for other nodes...
```

Please adapt the example above to suit your specific requirements and create your own PromptFlow YAML file.

## Contributing

If you would like to contribute to this project, follow these steps:

1. Fork the repository.
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request 😄

## Author

**promptflowx** is authored and maintained by [10cl](https://github.com/10cl) and released under the [MIT License](./LICENSE). Special thanks to all the contributors ([list](https://github.com/10cl/promptflowx/contributors)) who have helped improve this
