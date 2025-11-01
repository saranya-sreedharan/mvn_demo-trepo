import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as cpactions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codedeploy from "aws-cdk-lib/aws-codedeploy";
import * as iam from "aws-cdk-lib/aws-iam";

export class EcsCicdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const accountId = "047750374992";
    const region = "eu-north-1";
    const githubOwner = "saranya-sreedharan";
    const githubRepo = "mvn_demo-trepo";
    const githubBranch = "main";

    // 🔹 VPC
    const vpc = new ec2.Vpc(this, "EcsVpc", {
      maxAzs: 2,
    });

    // 🔹 ECS Cluster
    const cluster = new ecs.Cluster(this, "EcsCluster", {
      vpc,
      clusterName: "CICDCluster",
    });

    // 🔹 ECR Repository
    const repository = new ecr.Repository(this, "EcrRepo", {
      repositoryName: "hello-cicd-repo",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 🔹 ECS Task Definition
    const taskDef = new ecs.FargateTaskDefinition(this, "AppTaskDef", {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    const container = taskDef.addContainer("AppContainer", {
      image: ecs.ContainerImage.fromRegistry("nginx"),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "ecs" }),
    });

    container.addPortMappings({ containerPort: 80 });

    // 🔹 Fargate Service
    const ecsService = new ecs.FargateService(this, "FargateService", {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      assignPublicIp: true,
      deploymentController: {
      type: ecs.DeploymentControllerType.CODE_DEPLOY,
     },
    });

    // 🔹 Load Balancer
    const lb = new elbv2.ApplicationLoadBalancer(this, "LB", {
      vpc,
      internetFacing: true,
    });

    const listener = lb.addListener("Listener", {
      port: 80,
      open: true,
    });

    listener.addTargets("ECS", {
      port: 80,
      targets: [ecsService],
      healthCheck: { path: "/" },
    });

    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: lb.loadBalancerDnsName,
    });

    // 🔹 CodeBuild project
    const codeBuildProject = new codebuild.PipelineProject(this, "BuildProject", {
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
        privileged: true,
      },
      environmentVariables: {
        ACCOUNT_ID: { value: accountId },
        AWS_REGION: { value: region },
        REPOSITORY_URI: {
          value: `${accountId}.dkr.ecr.${region}.amazonaws.com/hello-cicd-repo`,
        },
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yml"),
    });

    // 🔹 CodePipeline Artifacts
    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact("BuildOutput");

    // 🔹 Source (GitHub via CodeStar Connection)
    // 👉 Replace this ARN after you create the connection in AWS Console
    const codeStarConnectionArn =
      "arn:aws:codeconnections:eu-north-1:047750374992:connection/dda83f2c-1c47-4d24-b5ca-488d8bf7b075"

    const sourceAction = new cpactions.CodeStarConnectionsSourceAction({
      actionName: "GitHub_Source",
      owner: githubOwner,
      repo: githubRepo,
      branch: githubBranch,
      connectionArn: codeStarConnectionArn,
      output: sourceOutput,
    });

    const buildAction = new cpactions.CodeBuildAction({
      actionName: "CodeBuild",
      project: codeBuildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    // 🔹 CodeDeploy ECS Application
    const codedeployApp = new codedeploy.EcsApplication(this, "EcsCodeDeployApp", {
      applicationName: "ecs-bluegreen-app",
    });

    // 🔹 Target Groups
    const targetGroupBlue = new elbv2.ApplicationTargetGroup(this, "BlueTG", {
      vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: { path: "/" },
    });

    const targetGroupGreen = new elbv2.ApplicationTargetGroup(this, "GreenTG", {
      vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: { path: "/" },
    });

    listener.addTargetGroups("BlueGreenTG", {
      targetGroups: [targetGroupBlue],
    });

     // ECS Deployment Group (Blue/Green)
  const deploymentGroup = new codedeploy.EcsDeploymentGroup(this, "EcsBlueGreenDG", {
  service: ecsService,
  blueGreenDeploymentConfig: {
    blueTargetGroup: targetGroupBlue,
    greenTargetGroup: targetGroupGreen,
    listener: listener,
  },
  deploymentConfig: codedeploy.EcsDeploymentConfig.ALL_AT_ONCE,
  autoRollback: {
    stoppedDeployment: true,
    failedDeployment: true,
  },
});
        

    // 🔹 ECS Deploy Action
    const deployAction = new cpactions.CodeDeployEcsDeployAction({
      actionName: "ECSBlueGreenDeploy",
      deploymentGroup,
      appSpecTemplateFile: buildOutput.atPath("appspec.yaml"),
      taskDefinitionTemplateFile: buildOutput.atPath("taskdef.json"),
      containerImageInputs: [
        {
          input: buildOutput,
          taskDefinitionPlaceholder: "IMAGE1_NAME",
        },
      ],
    });

    // 🔹 Pipeline
    new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: "EcsCicdBlueGreenPipeline",
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
        },
        {
          stageName: "Build",
          actions: [buildAction],
        },
        {
          stageName: "Deploy",
          actions: [deployAction],
        },
      ],
    });

    // Grant CodeBuild permission to push to ECR
    repository.grantPullPush(codeBuildProject.role!);
  }
}
