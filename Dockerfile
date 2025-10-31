FROM openjdk:17-jdk-slim
WORKDIR /app
COPY target/hello-cicd-1.0-SNAPSHOT.jar hello-cicd-1.0-SNAPSHOT.jar
ENTRYPOINT ["java", "-jar", "hello-cicd-1.0-SNAPSHOT.jar"]
