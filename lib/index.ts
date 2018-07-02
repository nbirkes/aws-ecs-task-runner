import { ECS } from 'aws-sdk';
import { parseArgs, printUsage } from "./argv";

const ecs = new ECS();

main().catch(error => {
  console.error(error);
});

async function main(): Promise<void> {
  const argv = parseArgs();

  if (argv.help) {
    printUsage();
    return;
  }

  if (!argv.task) throw new Error('task is required');
  if (!argv.cluster) throw new Error('cluster is required');

  console.log('Starting task', argv.task);

  let instance = await findInstance(argv.cluster);
  let taskDefinition = await findTaskDefinition(argv.task);
  let tasks = await startTask(argv.cluster, argv.task, instance, taskDefinition, ["node", "dist/index", "--ci", "login-client"]);

  await monitorTask(argv.cluster, getTaskArn(tasks));
}

async function findInstance(cluster: string): Promise<string> {
  let resp = await ecs.listContainerInstances({
    cluster: cluster,
    status: 'ACTIVE',
  }).promise();

  if (!resp.containerInstanceArns) throw new Error('No contianer instances available');
  if (!resp.containerInstanceArns.length) throw new Error('No contianer instances available');

  return resp.containerInstanceArns[0];
}

async function findTaskDefinition(taskDefName: string): Promise<string> {
  let resp = await ecs.listTaskDefinitions({
    familyPrefix: taskDefName,
    sort: 'DESC',
    status: 'ACTIVE',
  }).promise();

  if (!resp.taskDefinitionArns) throw new Error('No task definitions available');
  if (!resp.taskDefinitionArns.length) throw new Error('No task definitions available');

  return resp.taskDefinitionArns[0];
}

function getTaskArn(resp: ECS.Types.StartTaskResponse): string {
  if (!resp.tasks) throw new Error('tasks is undefined');
  if (!resp.tasks[0]) {
    console.log(JSON.stringify(resp, null, 2));
    throw new Error('tasks[0] is undefined');
  }

  let task = resp.tasks[0];
  if (!task.taskArn) throw new Error('taskArn is undefined');

  return task.taskArn;
}

async function startTask(cluster: string, task: string, instance: string, taskDefinition: string, command?: string[]): Promise<ECS.Types.StartTaskResponse> {
  return ecs.startTask({
    containerInstances: [instance],
    taskDefinition: taskDefinition,
    cluster,
    overrides: {
      containerOverrides: [
        {
          name: task,
          command,
        },
      ],
    },
  }).promise();
}

async function monitorTask(cluster: string, taskArn: string): Promise<void> {
  let stopped = false;
  let resp;
  while (!stopped) {
    resp = await ecs.describeTasks({
      cluster,
      tasks: [taskArn],
    }).promise();

    if (!resp.tasks) throw new Error('tasks is undefined');
    let task = resp.tasks[0];
    if (!task) throw new Error('task is undefined');

    console.log('Last status', task.lastStatus, new Date());
    stopped = task.lastStatus === 'STOPPED';
  }
  console.log(JSON.stringify(resp, null, 2));
}
