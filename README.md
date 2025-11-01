>AWS CDK ECS CI/CD Project (Blue/Green Deployment)

This project sets up a complete CI/CD pipeline on AWS using the AWS CDK (TypeScript).
It deploys a Dockerized web application to Amazon ECS (Fargate) with Blue/Green deployment through AWS CodePipeline, CodeBuild, and CodeDeploy.
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
>requirements :

1. Ubuntu 22.04 (or later)
2. An IAM Role or Access Key/Secret Key with Administrator or full CDK permissions
(CloudFormation, ECS, ECR, CodePipeline, CodeBuild, CodeDeploy, IAM, S3)
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
>Install required tools : 

# Update system
sudo apt update -y

# Install Node.js (LTS)
sudo apt install -y nodejs npm
node -v
npm -v

# Install AWS CLI
sudo apt update -y
sudo apt install -y unzip curl
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install


# Configure AWS credentials
aws configure

# Install AWS CDK globally
sudo npm install -g aws-cdk
cdk --version

# Install Git (optional for cloning)
sudo apt install -y git
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
>project_folder/
│
├── bin/
│   └── app.ts                # CDK app entry point
│
├── lib/
│   └── ecs-cicd-stack.ts     # Main CDK stack (ECR, ECS, CodePipeline, etc.)
│
├── cdk.json                  # CDK configuration
├── cdk.context.json          # Context values (auto-generated)
├── package.json              # Node project dependencies
├── package-lock.json         # Dependency lock file
├── README.md                 # Project documentation (this file)
└── cdk.out/                  # CDK output folder (auto-generated)

-------------------------------------------------------------------------------------------------------------------------------------------------------------------
>cd project_folder
npm install

> Bootstrap CDK
cdk bootstrap aws://<ACCOUNT_ID>/<REGION>

cdk synth
cdk deploy
Do you wish to deploy these changes (y/n)? y

> Destroy All Resources (Cleanup)
cdk destroy
Are you sure you want to delete: EcsCicdStack (y/n)? y



