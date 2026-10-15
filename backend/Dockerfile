FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

COPY . .
RUN chmod +x mvnw 2>/dev/null || true
RUN if [ -f mvnw ]; then ./mvnw clean package -DskipTests; else apt-get update && apt-get install -y maven && mvn clean package -DskipTests; fi

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]