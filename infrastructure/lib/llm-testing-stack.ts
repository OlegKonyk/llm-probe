import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export interface LlmTestingStackProps extends cdk.StackProps {
  /**
   * The Bedrock model ID to use (e.g., anthropic.claude-3-sonnet-20240229-v1:0)
   */
  bedrockModel?: string;

  /**
   * Whether to create a new VPC or use existing
   */
  createVpc?: boolean;

  /**
   * VPC ID if using existing VPC
   */
  vpcId?: string;

  /**
   * Desired task count for ECS service
   */
  desiredCount?: number;
}

export class LlmTestingStack extends cdk.Stack {
  public readonly service: ecs.FargateService;
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props?: LlmTestingStackProps) {
    super(scope, id, props);

    // Configuration with defaults
    const bedrockModel = props?.bedrockModel || 'anthropic.claude-3-sonnet-20240229-v1:0';
    const desiredCount = props?.desiredCount || 2;

    // VPC - Use existing or create new
    const vpc = props?.vpcId
      ? ec2.Vpc.fromLookup(this, 'ExistingVpc', { vpcId: props.vpcId })
      : new ec2.Vpc(this, 'LlmTestingVpc', {
          maxAzs: 2,
          natGateways: 1, // Cost optimization: 1 NAT gateway
          subnetConfiguration: [
            {
              name: 'Public',
              subnetType: ec2.SubnetType.PUBLIC,
              cidrMask: 24,
            },
            {
              name: 'Private',
              subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
              cidrMask: 24,
            },
          ],
        });

    // ECR Repository for backend image
    const repository = new ecr.Repository(this, 'BackendRepository', {
      repositoryName: 'llm-testing-backend',
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Keep images on stack deletion
      lifecycleRules: [
        {
          maxImageCount: 10, // Keep last 10 images
          description: 'Keep last 10 images',
        },
      ],
    });

    // Secrets Manager for API Keys
    const apiKeySecret = new secretsmanager.Secret(this, 'ApiKeySecret', {
      secretName: 'llm-test/api-keys',
      description: 'API keys for LLM Testing Framework',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ keys: [] }),
        generateStringKey: 'generated-key',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 32,
      },
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'LlmTestingCluster', {
      vpc,
      clusterName: 'llm-testing-cluster',
      containerInsights: true, // Enable CloudWatch Container Insights
    });

    // Task execution role (for pulling images, writing logs)
    const executionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Allow pulling from ECR
    repository.grantPull(executionRole);

    // Task role (for application to access AWS services)
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Grant Bedrock access
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [`arn:aws:bedrock:${this.region}::foundation-model/*`],
      })
    );

    // Grant Secrets Manager access
    apiKeySecret.grantRead(taskRole);

    // CloudWatch Logs
    const logGroup = new logs.LogGroup(this, 'BackendLogs', {
      logGroupName: '/ecs/llm-testing-backend',
      retention: logs.RetentionDays.ONE_WEEK, // Adjust as needed
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'BackendTaskDef', {
      memoryLimitMiB: 1024,
      cpu: 512,
      executionRole,
      taskRole,
    });

    // Container Definition
    const container = taskDefinition.addContainer('backend', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'backend',
        logGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        LLM_PROVIDER: 'bedrock',
        AWS_REGION: this.region,
        BEDROCK_MODEL: bedrockModel,
        API_KEY_PROVIDER: 'secrets-manager',
        API_KEY_SECRET_NAME: apiKeySecret.secretName,
        API_KEY_AUTH_ENABLED: 'true',
      },
      healthCheck: {
        command: ['CMD-SHELL', 'node -e "require(\'http\').get(\'http://localhost:3000/health\', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    container.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    // Application Load Balancer
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc,
      internetFacing: true,
      loadBalancerName: 'llm-testing-alb',
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    this.loadBalancer.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroup],
    });

    // Fargate Service
    this.service = new ecs.FargateService(this, 'BackendService', {
      cluster,
      taskDefinition,
      desiredCount,
      serviceName: 'llm-testing-backend',
      assignPublicIp: false, // Run in private subnets
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      circuitBreaker: {
        rollback: true, // Auto-rollback on deployment failure
      },
    });

    // Attach service to target group
    this.service.attachToApplicationTargetGroup(targetGroup);

    // Auto Scaling
    const scaling = this.service.autoScaleTaskCount({
      minCapacity: desiredCount,
      maxCapacity: 10,
    });

    // Scale based on CPU
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Scale based on memory
    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.loadBalancer.loadBalancerDnsName,
      description: 'Load Balancer DNS Name',
      exportName: 'LlmTestingLoadBalancerDNS',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: `http://${this.loadBalancer.loadBalancerDnsName}`,
      description: 'API Endpoint',
    });

    new cdk.CfnOutput(this, 'RepositoryUri', {
      value: repository.repositoryUri,
      description: 'ECR Repository URI',
      exportName: 'LlmTestingRepositoryUri',
    });

    new cdk.CfnOutput(this, 'SecretArn', {
      value: apiKeySecret.secretArn,
      description: 'API Key Secret ARN',
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
      description: 'ECS Cluster Name',
    });
  }
}
