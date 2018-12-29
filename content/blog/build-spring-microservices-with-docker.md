---
layout: blog_post
title: "Build Spring Microservices and Dockerize them for Production"
author: raphaeldovale
date: 2018-12-28T00:00:00Z
description: ""
tags: [java, spring-security, spring-boot, spring framework, docker, microservices, Eureka]
tweets:
  - "Learn how to use Spring Boot with Oauth 2.0, Cloud Config, Eureka and Docker!"
  - "Modern microservice architecture, learn how to create a complete project!"
---

In this article, we will talk about [Microservices](https://www.martinfowler.com/microservices/) architecture and how to implement it using Spring Boot. After creating some projects with the technique, we will deploy the artifacts as Docker containers and will simulate a _Container Orchestrator_ (such as Kubernetes) using _Docker Compose_ for simplification. The icing on the cake will be authentication integration using Spring Profiles so we will only enable it on production profile.

Let's talk about Microservices.

## Microservice Architecture

Microservices, instead Monolith architecture, dictates you have to divide your application into small, logically related, pieces. These pieces are independent software that communicates with other pieces using HTTP or messages, for example. 

There is some discussion of what size _micro_ is. Some say a Microservice is a software that can be made on a single sprint; others say Microservices can have bigger size if it is logically related (you can't mix apples and oranges, or sales with stock =) ). I am stuck with [Martin Flower](https://martinfowler.com/articles/microservices.html) and think the size doesn't matter that much, and it's more related to the style.

There are many advantages:

* No high coupling risk - since every code lives into a different process, it is impossible to use internal classes that should not be touch. If it is a must, you will need to create a new interface for it.
* Easy scaling - As already know, every service is an independent piece of software. As such, it can be scaled up or down on demand. Moreover, since the code is _smaller_ than a monolith, it probably will startup faster.
* Multiple stacks - You can use the best stack for every service. No more need to use Java when, say, Python is better and something you are working on, for example.
* Less merges and code conflicts: as every service is a different repository, it is easier to handle and review commits.

However, there are some drawbacks:

* You have a new enemy - Network issues? Is the service up? What to do if the service is down?
* Complex deployment process - Ok CI/CD is here, but know you have one workflow for each service. If they use different stacks, it is possible you can't even replicate a workflow for then.
* More complex and hard-to-understand architecture - It vastly depends on how you design it, but think about it: once, if you have any doubt about what a method is doing you need to read its code (and with a good IDE it is even more comfortable). In a Microservice architecture, this method can be in another project that you may even haven't the code.

Nowadays, after the hype, it is a common sense you should [avoid Microservice architecture at first](https://martinfowler.com/bliki/MonolithFirst.html). After some iterations, the code division will become clearer and demands too. It is too expensive to handle Microservices into a development team to start into small projects.

## The tutorial

This tutorial starts with two projects: one service (_school-service_) provides persistent layer and business logic. The other project (_school-ui_) provides the graphical user interface. Both naturally connects with minor configuration.

After the initial setup, discovery and configuration services will be presented and discussed. Both services are an essential part for any massively distributed architecture. To prove our point, we will integrate it with Oauth2 and use the configuration project to set the Oauth2 keys.

Finally, each project will be transformed into a Docker image. Docker compose will be used to simulate a _container orchestrator_ as every container will be managed by compose with an internal network between the services.

Lastly, Spring profiles will be introduced to change configuration based on the environment currently appropriately assigned. That way, we will have two Oauth2 environments: one for development, and other for production.

Fewer words, more code! Clone the tutorial's **repository** and go to the branch `start`.

```bash
> git clone -b start XXXX 
```

The root `pom.xml` file is not a requirement. It is here to help to manage multiple projects at once. Let's look inside:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.okta.developer.docker_microservices</groupId>
    <artifactId>parent-pom</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <packaging>pom</packaging>
    <name>parent-project</name>
    <modules>
        <module>school-service</module>
        <module>school-ui</module>    
    </modules>
</project>

```

It is called _Aggregate Project_ and is useful to apply the same command to all declared modules. The modules do not need to use the root module as a parent.

Next, check the two modules available:

## School-Service

`School-Service` is a Spring boot project that acts as the project's persistence layer and business rules. In a more complex scenario, it would have more services like this. The project was created using the always excellent [_Spring Initialzr_](https://start.spring.io/) with the following configuration:
<img src="/img/blog/build-spring-microservices-with-docker/initializr-service.png" alt="School Service" width="800" class="center-image">

You can get more details about this project on (**Ref to Spring boot POSTGRESQL post!**) if you need more details about how it works. Briefly, it has the entities `TeachingClass`, `Course,` `Student` and uses `TeachingClassServiceDB` and `TeachingClassController` to expose some data through a REST API. To test it, run the command below:

```bash
./mvnw clean spring-boot:run
```
The application will start on port `8081` (as defined in file `school-service/src/main/resources/application.properties`), and you should be able to browse to http://localhost:8081 and see the returned data.

```bash
> curl http://localhost:8081
[{"classId":13,"teacherName":"Profesor Jirafales","teacherId":1,"courseName":"Mathematics","courseId":3,"numberOfStudents":2,"year":1988},{"classId":14,"teacherName":"Profesor Jirafales","teacherId":1,"courseName":"Spanish","courseId":4,"numberOfStudents":2,"year":1988},{"classId":15,"teacherName":"Professor X","teacherId":2,"courseName":"Dealing with unknown","courseId":5,"numberOfStudents":2,"year":1995},{"classId":16,"teacherName":"Professor X","teacherId":2,"courseName":"Dealing with unknown","courseId":5,"numberOfStudents":1,"year":1996}]
```


## School-ui

The school UI is, as the name says, the user interface that uses School Service as the Business service of the application. It was created using, again, Spring Initializr with the following configurations:

* Group - com.okta.developer.docker_microservices
* Artifact - school-ui
* Dependencies - Web,  Hateoas, Thymeleaf, Lombok

The UI is a single web page that lists the classes available on the database. To get the information, it connects with the _school-service_ through a configuration in file `school-ui/src/main/resources/applicaction.properties` 

```properties
service.host=localhost:8081
```

The class `com.okta.developer.microservicedockerspring.ui.controller.SchoolController` has all the logic to query the service:

```java
package com.okta.developer.microservicedockerspring.ui.controller;


import com.okta.developer.microservicedockerspring.ui.dto.TeachingClassDto;
import org.springframework.beans.factory.annotation.*;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.ModelAndView;
import java.util.List;

@Controller
@RequestMapping("/")
public class SchoolController {
    private final RestTemplate restTemplate;
    private final String serviceHost;

    @Autowired
    public SchoolController(RestTemplate restTemplate, @Value("${service.host}") String serviceHost) {
        this.restTemplate = restTemplate;
        this.serviceHost = serviceHost;
    }
    @RequestMapping("")
    public ModelAndView index(){
        return new ModelAndView("index");
    }
    @GetMapping("/classes")
    public ResponseEntity<List<TeachingClassDto>> listClasses(){

        return restTemplate
                .exchange("http://"+ serviceHost +"/class", HttpMethod.GET, null,
                        new ParameterizedTypeReference<List<TeachingClassDto>>() {});
    }
}
```

As you can see, there is some hard-coded location for the service. You can change the property setting an environment variable like this `-Dservice.host=localhost:9090`. Still, it has to be manually defined. How about having many instances of _school-service_ application? Impossible at the current stage.

With _school-service_ turned on, start this one and test on a browser (http://localhost:8080):

```bash
./mvnw clean spring-boot:run
```

<img src="/img/blog/build-spring-microservices-with-docker/school-ui.png" alt="School Service" width="400" class="center-image">


## Discovery Server

Now we have a working application that uses two services to provide the information to end-user. What is wrong with it? In modern applications, it is not familiar to a developer (or operations) know in what machine and what port an application is deployed. The deployment should be such an automated no one _cares_ about server names and physical location (unless you work inside a datacenter. If you do, I hope you care!).

Nonetheless, it is essential to have a tool that helps the services to discover its parts. There are many solutions available, and for this tutorial, we are going to use _Eureka_ from Netflix as it has outstanding Spring support.

Go back to [Spring Initialzr](http://start.spring.com) and create a new project as follows:

* Group: com.okta.developer.docker_microservices
* Artifact: discovery
* Dependencies: Web, Eureka Server

> Note: if you are using JDK 10 or above, you probably will need to add the dependencies below. These libraries are part of Java EE and were embedded into JDK until version 10.

```xml
<dependency>
    <groupId>javax.xml.bind</groupId>
    <artifactId>jaxb-api</artifactId>
    <version>2.2.11</version>
</dependency>
<dependency>
    <groupId>com.sun.xml.bind</groupId>
    <artifactId>jaxb-core</artifactId>
    <version>2.2.11</version>
</dependency>
<dependency>
    <groupId>com.sun.xml.bind</groupId>
    <artifactId>jaxb-impl</artifactId>
    <version>2.2.11</version>
</dependency>
<dependency>
    <groupId>javax.activation</groupId>
    <artifactId>activation</artifactId>
    <version>1.1.1</version>
</dependency>
```

Now, edit the main class () to add `@EnableEurekaServer` annotation:

```java
package com.okta.developer.dockermicroservices.discovery;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

@SpringBootApplication
@EnableEurekaServer
public class DiscoveryApplication {
    public static void main(String[] args) {
        SpringApplication.run(DiscoveryApplication.class, args);
    }
}
```

Finally, we just need to update `application.properties` file:

```properties
spring.application.name=discovery-server
server.port=8761
eureka.client.register-with-eureka=false
eureka.client.fetch-registry=false
```

These are the meaning of each key:

* spring.application.name - the name of the application, also use to discovery service _discover_ a service. You'll see that every other application should have an application name to be found.
* server.port - the port the server is running. `8761` is the default port for Eureka server.
* eureka.client.register-with-eureka - Tells spring not to register itself into the discovery service
* eureka.client .fetch-registry - indicates this instance should fetch discovery information from the server

Now, runs it and access http://localhost:8761.

```bash
> ./mvnw spring-boot:run
```
<img src="/img/blog/build-spring-microservices-with-docker/eureka-empty.png" alt="Empty Eureka Service" width="800" class="center-image">

The screen above shows the Eureka server ready to register new services. Now, it is time to change _school-service_ and _school-ui_ to use it.

### Changes in services

First, it is important to add the required dependencies. Add the following to both pom.xml (_school-service_, and _school-ui_ projects):

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
```
Also, this module is part of Spring Cloud initiative and, as such, needs a new dependency management node as follows (don't forget to add to both projects):

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>Greenwich.M3</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

Ok, now we need to configure both applications.

On `application.properties` file of both, add the following lines:

```properties
eureka.client.service-url.default-zone=${EUREKA_SERVER:http://localhost:8761/eureka}
spring.application.name=school-service
```

Don't forget to change _school-service_ to _school-ui_ in the _school-ui_ project. Notice we have a new kind of parameter on the first line: `{EUREKA_SERVER:http://localhost:8761/eureka}`. It means "if environment variable EUREKA_SERVER exists, use its value, if not, take here a default value." It will be useful on future steps ;)

You know what? Both applications are ready to register themselves into the discovery service. You don't need to do anything more. Our primary objective is that _school-ui_ project does not need to know _where_ _school-service_ is. As such, we need to change a few things on _school-ui_, and only.

`SchoolController.java`
```java
package com.okta.developer.microservicedockerspring.ui.controller;

import com.okta.developer.microservicedockerspring.ui.dto.TeachingClassDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.ModelAndView;
import java.util.List;

@Controller
@RequestMapping("/")
public class SchoolController {
    private final RestTemplate restTemplate;
    @Autowired
    public SchoolController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
    @RequestMapping("")
    public ModelAndView index(){
        return new ModelAndView("index");
    }
    @GetMapping("/classes")
    public ResponseEntity<List<TeachingClassDto>> listClasses(){

        return restTemplate
                .exchange("http://school-service/class", HttpMethod.GET, null,
                        new ParameterizedTypeReference<List<TeachingClassDto>>() {});
    }
}

```

Before Eureka, we had a configuration pointing-out where _school-service_ was. Now, we change our calls to precisely the name used by the other service: no ports, no hostname. The service you need is somewhere, and you don't need to know. 

_School-service_ may have multiple instances of and it would be a good idea to load balance the calls between the instances. Thankfully, Spring has a simple solution: on `RestTemplate` bean creation, add `@LoadBalanced` annotation as follows. Spring will manage multiple instance calls each time you ask something to the server.

```java
package com.okta.developer.microservicedockerspring.ui;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.*;

@SpringBootApplication
public class UIWebApplication implements WebMvcConfigurer {
    public static void main(String[] args) {
        SpringApplication.run(UIWebApplication.class, args);
    }
    @Bean
    @LoadBalanced
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        if(!registry.hasMappingForPattern("/static/**")) {
            registry
                    .addResourceHandler("/static/**")
                    .addResourceLocations("classpath:/static/", "classpath:/static/js/");
        }
    }
}

```

Now, starts both _school-service_ and _school-ui_ (and keep Discovery service up) with the command `./mvnw clean spring-boot:run`. Have a quick lood on Discovery service again:

<img src="/img/blog/build-spring-microservices-with-docker/eureka-filled.png" alt="Filled Eureka Service" width="800" class="center-image">

Now your services are sharing info with the Discovery server. You can test the application again and see that it work as always. Just type on your browser http://localhost:8080 to check it out.

**TIP** You can check the code result from now on branch `discovery-server.`

## Global Configuration

Our goal is to remove any trace of configuration values in the project source. First, configuration URL was removed from the project and became managed by a service. Now, we can do a similar thing for every configuration on the project using [_Spring Cloud Config_](https://spring.io/projects/spring-cloud-config).

First, create the configuration project using [Spring Initialzr] (http://start.spring.com) and the following parameters:

* Group: com.okta.developer.docker_microservices
* Artifact: config
* Dependencies: Config Server, Eureka Discovery

In the main class, add `@EnableConfigServer`:

```java
package com.okta.developer.dockermicroservices.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.config.server.EnableConfigServer;

@SpringBootApplication
@EnableConfigServer
public class ConfigApplication {

    public static void main(String[] args) {
        SpringApplication.run(ConfigApplication.class, args);
    }

}
```

And on project's application.properties:

```
spring.application.name=CONFIGSERVER
server.port=8888
spring.profiles.active=native
spring.cloud.config.server.native.searchLocations=${config-address}
eureka.client.serviceUrl.defaultZone=${EUREKA_SERVER:http://localhost:8761/eureka}
```

Some explanation about the properties:

* spring.profiles.active=native - Indicates Spring Cloud Config must use the native file system to obtain the configuration. Normally GIT repositories are used, but we are going to stick with native filesystem for simplicity sake.
* spring.cloud.config.server.native.searchLocations - The path containing the configuration files. Choose an empty folder on your computer.

Now, we need something to configure and apply to our example. How about Okta's configuration? Let's put our _school-ui_ behind an authorization layer and use the configuration provided in the configuration project.

You can register for a [free-forever developer account](https://developer.okta.com/signup/) that will enable you to create as many user and applications you need to use in our tutorial! After created, please create a new Web Application on Okta's dashboard:

<img src="/img/blog/build-spring-microservices-with-docker/okta-new-web-application.png" alt="New web application" width="800" class="center-image">

And fill the next form with the following values:

<img src="/img/blog/build-spring-microservices-with-docker/okta-new-web-application-step2.png" alt="New web application, Step 2" width="800" class="center-image">

The page will return you an application ID and an secret key. Keep then safe and create a file called `school-ui.properties` on the root configuration folder (a folder in our file system that will be pointed out in _application.properties_ file) with the following content. Do not forget to fill the variables values:

```properties
okta.oauth2.issuer=https://${DOMAIN}/oauth2/default
okta.oauth2.clientId=${CLIENT_ID}
okta.oauth2.clientSecret=${CLIENT_SECRET}
```

Now, run the configuration project and check if its getting the configuration data propertly:

```bash
> ./mvnw clean spring-boot:run
> curl http://localhost:8888/school-ui.properties
okta.oauth2.clientId: YOUR_CLIENT_ID
okta.oauth2.clientSecret: YOUR_CLIENT_SECRET
okta.oauth2.issuer: https://YOUR_DOMAIN/oauth2/default
```

### Changes in School-ui to use Spring Cloud config and Oauth 2.0
Now we need to change the _school-ui_ project a little bit.

First, we need to change `school-ui/pom.xml` and add some new dependencies:

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-config</artifactId>
</dependency>
<dependency>
    <groupId>com.okta.spring</groupId>
    <artifactId>okta-spring-boot-starter</artifactId>
    <version>0.6.1</version>
</dependency>
<dependency>
    <groupId>org.springframework.security.oauth.boot</groupId>
    <artifactId>spring-security-oauth2-autoconfigure</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.security.oauth</groupId>
    <artifactId>spring-security-oauth2</artifactId>
    <version>2.2.0.RELEASE</version>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>org.thymeleaf.extras</groupId>
    <artifactId>thymeleaf-extras-springsecurity5</artifactId>
</dependency>
```

On the same file, you should add Spring Milestone repository so maven will download _Sring Cloud_ dependencies:

```xml
<repositories>
    <repository>
        <id>spring-milestones</id>
        <name>Spring Milestones</name>
        <url>https://repo.spring.io/milestone</url>
        <snapshots>
            <enabled>false</enabled>
        </snapshots>
    </repository>
</repositories>
```

Create a new class for security configuration

`com.okta.developer.microservicedockerspring.ui.config.SpringSecurityConfiguration`
```java
package com.okta.developer.microservicedockerspring.ui.config;

import org.springframework.boot.autoconfigure.security.oauth2.client.*;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.expression.method.MethodSecurityExpressionHandler;
import org.springframework.security.config.annotation.method.configuration.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.provider.expression.OAuth2MethodSecurityExpressionHandler;

@Configuration
@EnableOAuth2Sso
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class SpringSecurityConfiguration extends OAuth2SsoDefaultConfiguration {

    protected static class GlobalSecurityConfiguration extends GlobalMethodSecurityConfiguration {
        @Override
        protected MethodSecurityExpressionHandler createExpressionHandler() {
            return new OAuth2MethodSecurityExpressionHandler();
        }
    }

    public SpringSecurityConfiguration(ApplicationContext applicationContext) {
        super(applicationContext);
    }

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.authorizeRequests().antMatchers("/").permitAll();
        super.configure(http);
        http.logout().logoutSuccessUrl("/");
    }
}

```
Change your `com.okta.developer.microservicedockerspring.ui.controller.SchoolController` so only users with scope `profile` will be allowed (every logged user have it)

```java
@GetMapping("/classes")
@PreAuthorize("#oauth2.hasAnyScope('profile')")
public ResponseEntity<List<TeachingClassDto>> listClasses(){
    return restTemplate
        .exchange("http://school-service/class", HttpMethod.GET, null,
                new ParameterizedTypeReference<List<TeachingClassDto>>() {});
}
```

Some configurations need to be defined at project boot time. Spring had a clever solution to locate properly and extract configuration data _before_ context startup. You need to create a file `src/main/resources/bootstrap.yml` like this:

```yml
eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_SERVER:http://localhost:8761/eureka}
spring:
  application:
    name: school-ui
  cloud:
    config:
      discovery:
        enabled: true
        service-id: CONFIGSERVER
```

The bootstrap file creates a pre-boot Spring Application Context responsible to extract configuration before the real application starts. You need to move all properties from `application.properties` to this file as Spring needs to know where _Eureka Server_ is located and how it should search for configuration. In the example above, we enabled configuration over discovery service (`spring.cloud.config.discovery.enabled`) and what is the Configuration service-id.

The `application.properties` file will be like this (only some OAuth 2.0 properties): 

```properties
security.oauth2.sso.login-path=/authorization-code/callback
security.oauth2.client.client-authentication-scheme=header
```

`src/main/resources/templates/index.hml` is our last file to modify. We will show a _login_ button if the user is logged off and the result plus the _logoff_ if the user is logged in.

```html
<!doctype html>
<html lang="en" xmlns:th="http://www.thymeleaf.org">
<head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css" integrity="sha384-MCw98/SFnGE8fJT3GXwEOngsV7Zt27NXFoaoApmYm81iuXoPkFOJwJ8ERdknLPMO" crossorigin="anonymous">

    <title>Hello, world!</title>
</head>
<body>
<nav class="nvbar nvbar-default">
    <form method="post" th:action="@{/logout}" th:if="${#authorization.expression('isAuthenticated()')}" class="navbar-form navbar-right">
        <input type="hidden" th:name="${_csrf.parameterName}" th:value="${_csrf.token}" />
        <button id="logout-button" type="submit" class="btn btn-danger">Logout</button>
    </form>
    <form method="get" th:action="@{/authorization-code/callback}" th:unless="${#authorization.expression('isAuthenticated()')}">
        <button id="login-button" class="btn btn-primary" type="submit">Login</button>
    </form>
</nav>

<div id="content" th:if="${#authorization.expression('isAuthenticated()')}">
    <h1>School classes</h1>

    <table id="classes">
        <thead>
        <tr>
            <th>Course</th>
            <th>Teacher</th>
            <th>Year</th>
            <th>Number of studends</th>
        </tr>
        </thead>
        <tbody>

        </tbody>
    </table>

    <!-- Optional JavaScript -->
    <!-- jQuery first, then Popper.js, then Bootstrap JS -->

    <script src="http://code.jquery.com/jquery-3.3.1.min.js" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.3/umd/popper.min.js" integrity="sha384-ZMP7rVo3mIykV+2+9J3UJ46jBk0WLaUAdn689aCwoqbBJiSnjAK/l8WvCWPIPm49" crossorigin="anonymous"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/js/bootstrap.min.js" integrity="sha384-ChfqqxuZUCnJSK3+MXmPNIyE6ZbWh2IMqE241rYiqJxyMiZ6OW/JmZQ5stwEULTy" crossorigin="anonymous"></script>
    <script src="static/js/school_classes.js"></script>
</div>

</body>
</html>
```

We have some nice Thymeleaf properties here:

* `@{/logout}` - returns the logout URL defined on the backend
* `th:if="${#authorization.expression('isAuthenticated()')}"` - only print the HTML if the user is **logged in**
* `@{/authorization-code/callback}` - returns the authenticated URL callback
* `th:unless="${#authorization.expression('isAuthenticated()')}"` - only print the HTML inside the node if the user is **logged off**

Now start configuration project and school-ui again. By typing `http://localhost:8080` you should see the following screen:

<img src="/img/blog/build-spring-microservices-with-docker/school-ui-loggedin.png" alt="Log in" width="400" class="center-image">

After logged in, the screen should appears like this one:

<img src="/img/blog/build-spring-microservices-with-docker/school-ui-loggedoff.png" alt="Log off" width="400" class="center-image">

Now we have an application using Spring Cloud config and Eureka for service discovery. Now, we are going one step further and will Dockerize every service.

**TIP** You can check the code result from now on branch `configuration.`

## Dockerizing

[Docker](https://www.docker.com/) is a marvelous technology that allows creating system images similar to _Virtual Machines_ but that shares the same Kernel of the host operating system. This feature increases system performance and startup time. Also, Docker provided an ingenious built system that guarantee once an image is created; it won't be changed, ever. In other words: no more "it works on my machine"!

**TIP** Need more Docker background? Have a look at this [article](https://developer.okta.com/blog/2017/05/10/developers-guide-to-docker-part-1)

You'll create one image for each project we created until now. They'll have the same Maven configuration and `Dockerfile` content in the root folder of each project (eg.: `school-ui/Dockerfile`).

**For each project pom, add**
```xml
(...)
<plugins>
(...)
    <plugin>
        <groupId>com.spotify</groupId>
        <artifactId>dockerfile-maven-plugin</artifactId>
        <version>1.4.9</version>
        <executions>
            <execution>
                <id>default</id>
                <goals>
                    <goal>build</goal>
                    <goal>push</goal>
                </goals>
            </execution>
        </executions>
        <configuration>
            <repository>developer.okta.com/microservice-docker-${artifactId}</repository>
            <tag>${project.version}</tag>
            <buildArgs>
                <JAR_FILE>${project.build.finalName}.jar</JAR_FILE>
            </buildArgs>
        </configuration>
    </plugin>
</plugins>
(...)
```

These will configure _dockerfile-maven-plugin_ to build a Docker image every time you run `./mvnw install`. Each image will be created with the name `developer.okta.com/microservice-docker-${artifactId}` where `artifactId` vary by project.

**DockerFile**
```Dockerfile
FROM openjdk:8-jdk-alpine
VOLUME /tmp
ADD target/*.jar app.jar
ENV JAVA_OPTS=""
ENTRYPOINT [ "sh", "-c", "java $JAVA_OPTS -Djava.security.egd=file:/dev/./urandom -jar /app.jar" ]
```

The `Dockerfile` follows what is recommended by [Spring](https://spring.io/guides/gs/spring-boot-docker/).

Now, let's change `school-ui/src/main/resources/bootstrap.yml` and add a new configuration:

```yml
eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_SERVER:http://localhost:8761/eureka}
spring:
  application:
    name: school-ui
  cloud:
    config:
      discovery:
        enabled: true
        serviceId: CONFIGSERVER
      failFast: true
```

`spring.cloud.failFast` Tells Spring Cloud Config to terminate the application as soon as it can't find the configuration server. This will be useful for the next step.


### Docker Compose

Now, you'll create a new file called `docker-compose.yml` which will define how each project will start:

```yml
version: '3'
services:
  discovery:
    image: developer.okta.com/microservice-docker-discovery:0.0.1-SNAPSHOT
    ports:
      - 8761:8761
  config:
    image: developer.okta.com/microservice-docker-config:0.0.1-SNAPSHOT
    volumes:
      - ./config-data:/var/config-data
    environment:
      - JAVA_OPTS=
         -DEUREKA_SERVER=http://discovery:8761/eureka
         -Dspring.cloud.config.server.native.searchLocations=/var/config-data
    depends_on:
      - discovery
    ports:
      - 8888:8888
  school-service:
    image: developer.okta.com/microservice-docker-school-service:0.0.1-SNAPSHOT
    environment:
      - JAVA_OPTS=
        -DEUREKA_SERVER=http://discovery:8761/eureka
    depends_on:
      - discovery
      - config
  school-ui:
    image: developer.okta.com/microservice-docker-school-ui:0.0.1-SNAPSHOT
    environment:
      - JAVA_OPTS=
        -DEUREKA_SERVER=http://discovery:8761/eureka
    restart: on-failure
    depends_on:
      - discovery
      - config
    ports:
      - 8080:8080
```

As you can see, each project is now a declared service in Docker compose the file. It'll have its ports exposed and some other properties.

* All projects besides _Discovery_ will have a variable value `-DEUREKA_SERVER=http://discovery:8761/eureka`. This will tell where to find the Discovery server. Docker Compose creates a virtual network between the services and the DNS name used for each service is its name: that's why it is possible to use `discovery` as the hostname.
* Config service will have a volume going to configuration files. This volume will be mapped to `/var/config-data` inside the docker container. Also, the property `spring.cloud.config.server.native.searchLocations` will be overwritten to the same value.
* _School-ui_ project will have the property `restart: on-failure`. This set Docker Compose to restart the application as soon as it fails. Using together with `failFast` property allows the application keep trying to start until the _Discovery_ and _Config_ projects are completely ready.

And that's it! Now, just build the images (each command on the root folder):

```bash
cd school-ui && ./mvnw clean install
cd school-service && ./mvnw clean install
cd config && ./mvnw clean install
cd discovery && ./mvnw clean install
```

Now, run the docker compose (run it on the same folder `docker-compose.yml` is stored).

```bash
docker-compose up -d
Starting okta-microservice-docker-post-final_discovery_1 ... done
Starting okta-microservice-docker-post-final_config_1    ... done
Starting okta-microservice-docker-post-final_school-ui_1      ... done
Starting okta-microservice-docker-post-final_school-service_1 ... done
```

Now you need to browse the application as in the previous section.

**TIP** You can check the code result from now on branch `docker.`

## Using profiles

Now we reach the last stage on our journey through microservices. [Spring Profiles](https://docs.spring.io/spring-boot/docs/current/reference/html/boot-features-profiles.html) is a powerful tool. Using profiles, it is possible to modify program behavior by injecting different dependencies or configurations completely.

Imagine you have a well-architected software that has its persistence layer separated from business logic. You also provide support for MySQL and Postgres, for example. It is possible to have different data access classes for each database that will be only loaded by the defined profile.

Another application is through configuration: different profiles will have a different configuration. An application would be authentication: will your test environment have authentication? If it does, it shouldn't use the same production's user directory.

Now you will change your configuration project to have two Oauth 2.0 client id: one default, for development and other for production. Create a new application on Okta website and name it as "okta-docker-production." Save the new client id.

Now, on your configuration repository, create a new file called `school-ui-production.properties`. You already have `school-ui.properties`, which will be used by every _School UI_ instance. When adding the environment at the end of the file, Spring will merge both files and take precedence over the most specific file. Save the file just with the clientID property, like this:

**school-ui-production.properties**

```properties
okta.oauth2.clientId=${YOUR_PRODUCTION_CLIENTID}
```

Now, run the configuration project using Maven, and run two _curl_ commands:

```bash
> ./mvnw spring-boot:run
> curl http://localhost:8888/school-ui.properties
okta.oauth2.clientId: ==YOUR DEVELOP CLIENT ID HERE==
okta.oauth2.issuer: https://dev-940480.oktapreview.com/oauth2/default
> curl http://localhost:8888/school-ui-production.properties
okta.oauth2.clientId: ==YOUR PRODUCTION CLIENT ID HERE==
okta.oauth2.issuer: https://dev-940480.oktapreview.com/oauth2/default
```

As you can see, even with the file `school-ui-production` having only one property, the _config
_ project displays two as the configurations are merged.

Now, you have to change the `school-ui` service on the docker-file to use the production profile:

So that's, it! Now you have your application running with a production profile!


## Summary

In this post, you learned more about Microservices and how to deploy them. There are many other ways to deploy and maintain a Microservice architecture, and in this post, you'll learn:

* What is a Microservice
* How services should discover its dependencies without previously knowing where they are located.
* How to maintain distributed configuration with a central point of information. The configuration can manage one or more applications and environments.
* How to configure OAuth 2.0 using Spring Cloud Config
* How to deploy microservices using Docker and Docker-compose
* Using Spring Profiles to deploy on a production environment.

There plenty of information about Microservices. You may want to check these:

* [Build and Secure Microservices with Spring Boot 2.0 and OAuth 2.0](https://developer.okta.com/blog/2018/05/17/microservices-spring-boot-2-oauth)
* [https://developer.okta.com/blog/2018/03/01/develop-microservices-jhipster-oauth](https://developer.okta.com/blog/2018/03/01/develop-microservices-jhipster-oauth)
* [Build a Microservices Architecture for Microbrews with Spring Boot ](https://developer.okta.com/blog/2017/06/15/build-microservices-architecture-spring-boot)


If you have any questions about this post, please leave a comment below. You can also post to [Stack Overflow with the okta tag](https://stackoverflow.com/questions/tagged/okta) or use our [developer forums](https://devforum.okta.com/).

[Follow @OktaDev on Twitter](https://twitter.com/oktadev) for more awesome content!