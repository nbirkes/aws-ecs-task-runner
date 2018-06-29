export interface Argv {
  cluster?: string;
  task?: string;
  help: boolean;
}

export function parseArgs(): Argv {
  const args = require('minimist')(process.argv.slice(2), {
    string: ['cluster', 'task'],
  });

  return {
    task: args['task'] || undefined,
    cluster: args['cluster'] || undefined,
    help: args['help'] === true,
  };
}

export function printUsage() {
  console.log(`
yarn start --task my-task --cluster my-cluster

Runs an AWS ECS task and monitors it until STOPPED.

Options:
  --cluster  - Name of the ECS cluster that contains the task definition
  --task     - Name of the task
`);
}
