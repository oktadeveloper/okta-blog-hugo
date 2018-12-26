---
layout: blog_post
title: "Build Spring Microservices and Dockerize them for Production"
author: raphaeldovale
date: 2018-12-23T00:00:00Z
description: ""
tags: [java, spring-security, spring-boot, springframework, docker, microservices, eureka]
tweets:
  - ""
  - ""
---

In this article we will talk about [Microservices](https://www.martinfowler.com/microservices/) architecture and how to implement it using Spring Boot. After creating some projects with the technique, we will deploy the artifacts as Docker containers and will simulate a _Container Orchestrator_ (such as Kubernetes) using _Docker Compose_ for simplification. The icing on the cake will be authentication integration using Spring Profiles so we will only enable it on production profile.

Let's talk about Microservices.

## Microservice Architecture

Microservices, instead Monolith architecture, dictates you have to divide your application into small, logically related, pieces. These pieces are independent software that communicates with other pieces using HTTP or messages, for example. 

There are some discussion of what size _micro_ really is. Some say a Microservice is a software that can be made on a single sprint, others says Microservices can have bigger size if it is logically related (you can't mix apples and oranges, or sales with stock =) ). I am stick with [Martin Flower](https://martinfowler.com/articles/microservices.html) and think the size doesn't matter that much, and its more related to the style.

There are many advantages:

* No high coupling risk - since every code lives into a different process, it is impossible to use internal classes that should not be touch. If it is a must, you will need to create a new interface for it.
* Easy scaling - As already know, every service is an independent piece of software. As such, it can be scaled up or down on demand. Moreover, since the code is _smaller_ than a monolith, it probably will startup faster.
* Multiple stacks - You can use the best stack for every service. No more need to use Java when, say, Python is better and something you are working on, for example.
* Less merges and code conflicts: as every service is a different repository, it is easier to handle and review commits.

But there are some drawbacks:

* You have a new enemy - Network issues? Is the service up? What to do if the service is down?
* Complex deployment process - Ok CI/CD is here, but know you have one workflow for each service. If they use different stacks, it is possible you can't even replicate a workflow for then.
* More complex and hard-to-understand architecture - It vastly depend on how you design it, but think about it: once, if you have any doubt about what a method is doing you just need to read its code (and with a good IDE it is even easier). In a Microservice architecture, this method can be in another project that you may even haven't the code.

Nowadays, after the hype, it is a common sense you should [avoid Microservice architecture at first](https://martinfowler.com/bliki/MonolithFirst.html). After some iterations, the code division will become clearer and demands too. It is too expensive handle Microservices into a development team to start into small projects.

## The tutorial

This tutorial starts with two projects: one service (_school-service_) provides persistent layer and business logic. The other project (_school-ui_) provides the graphical user interface. Both naturally connects with minor configuration.

After initial setup, discovery and configuration services will be presented and discussed. Both services are an essential part for any heavily distributed architecture. To prove our point, we will integrate it with Oauth2 and use the configuration project to set the Oauth2 keys.

Finally, each project will be transformed into a Docker image. Docker compose will be used to simulate a _container orchestrator_ as every container will be managed by compose with an internal network between the services.

Lastly, Spring profiles will be introduced to properly change configuration based on the environment currently assigned. That way, we will have two Oauth2 environments: one for development, and other for production.

Less words, more code! Clone the tutorial's **repository** and go to the branch `start`.

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

It is called _Aggregate Project_ and is useful to apply the same command to all declared modules. The modules does not need to use the root module as parent.

Next, check the two modules available:

## School-Service

`School-Service` is a Spring boot project that acts as the project's persistence layer and business rules. In a more complex scenario, it would have more services like this. The project was created using the always excelent [_Spring Initialzr_](https://start.spring.io/) with the following configuration:
<img src="/img/blog/build-spring-microservices-with-docker/initializr-service.png" alt="School Service" width="800" class="center-image">

You can get more details about this project on (**Ref to Spring boot POSTGRESQL post!**), if you need more details about how it works. Briefly, it has the entities `TeachingClass`, `Course`, `Student` and uses `TeachingClassServiceDB` and `TeachingClassController` to expose some data throught a REST API. To test it, run the command bellow:

```bash
./mvnw clean spring-boot:run
```
The application will start on port `8081` (as defined in file `school-service/src/main/resources/application.properties`) and you should be able browse to http://localhost:8081 and see the returned data.

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

As you can see, there are some hard-coded location for the service. You can change the property setting an environment variable like this `-Dservice.host=localhost:9090`. Still, it has to be manually defined. How about having many instances of _school-service_ application? Impossible at the current stage.

With _school-service_ turned on, just start this one and test on a browser (http://localhost:8080):

```bash
./mvnw clean spring-boot:run
```

<img src="/img/blog/build-spring-microservices-with-docker/school-ui.png" alt="School Service" width="400" class="center-image">


## Discovery Server

Now we have a working application that uses two services to provide the information to end-user. What is wrong with it? In modern applications, it is not common to a developer (or operations) know in what machine and what port an application is deployed. In fact, the deployment should be so automated no one _cares_ about server names and physical location (unless you work inside a datacenter. If you do, I really hope you care!).

Nonetheless, it is important to have a tool that help the services to discover its parts. There are many solutions available and for this tutorial we are going to use _Eureka_ from Netflix as it has a very good Spring support.

Go back to [Spring Initialzr](http://start.spring.com) and create a new project as follows:

* Group: com.okta.developer.docker_microservices
* Artifact: discovery
* Dependencies: Web, Eureka Server

> Note: if you are using JDK 10 or above, you probably will need to add the dependencies bellow. These libraries are part of Java EE and were embeded into JDK until version 10.

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
* server.port - the port the server is running. `8761` is the default por for Eureka server.
* eureka.client.register-with-eureka - Tells spring to not register itself into the discovery service
* eureka.client.fetch-registry - indicates this instance should fetch discovery information from the server

Now, runs it and access http://localhost:8761

```bash
> ./mvnw spring-boot:run
```
<img src="/img/blog/build-spring-microservices-with-docker/eureka-empty.png" alt="Empty Eureka Service" width="800" class="center-image">

The screen above shows the Eureka server ready to register new services. Now, it is time to change _school-service_ and _school-ui_ to use it.

### Changes on services

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

Don't forget to change _school-service_ to _school-ui_ in the _school-ui_ project. Notice we have a new kind of parameter on the first line: `{EUREKA_SERVER:http://localhost:8761/eureka}`. It means "if environment variable EUREKA_SERVER exists, use its value, if not, take here a default value". It will be useful on future steps ;)

You know what? Both applications are ready to register themselves into the discovery service. You don't need to do anything more. Our primary objective is that _school-ui_ project does not need to know _where_ _school-service_ is. As such, wee need to change a few things on _school-ui_, and only.

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

Before Eureka, we had an configuration pointing-out where _school-service_ was. Now, we change our calls to exactly the name used by the other service. No ports, no hostname. The service you need is somewhere and you don't need to know. 

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

> You can check the code result from now on branch `discovery-server`

## Global Configuration

Our goal is to remove any trace of configuration in the project. First, configuration URL was removed from the project and became managed by a service. Now, we can do a similar thing for every configuration on the project using [_Spring Cloud Config_](https://spring.io/projects/spring-cloud-config).

First, create the configuration project:

<img src="/img/blog/build-spring-microservices-with-docker/initializr-config.png" alt="Config Service" width="800" class="center-image">

On the main class, add `@EnableConfigServer`:

```java
package net.dovale.okta.docker_microservices.config;

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
* spring.profiles.active=native - indicates Spring Cloud Config must use native filesystem to obtain the configuration. Normally GIT repositories are used but we are going to stick with native filesystem for simplification.
* spring.cloud.config.server.native.searchLocations - The path containing the configuration files. Choose an empty folder on your computer.

Now, we need something to configure and apply on our example... how about Okta's configuration?? Let's put our _school-ui_ behind an authorization layer and use the configuration provided here.

You can register for a [free-forever developer account](https://developer.okta.com/signup/) that will enable you to create as many user and applications you need to use in our tutorial! After created, please create a new Web Application on Okta's dashboard:

<img src="/img/blog/build-spring-microservices-with-docker/okta-new-web-application.png" alt="New web application" width="800" class="center-image">

And fill the next form with the following values:

<img src="/img/blog/build-spring-microservices-with-docker/okta-new-web-application-step2.png" alt="New web application, Step 2" width="800" class="center-image">

The page will return you an application ID and an secret key. Keep then safe and create a file called `school-ui.properties` on the root configuration folder with the following content. Do not forget to fill the variables values:

```properties
okta.oauth2.issuer=https://${DOMAIN}/oauth2/default
okta.oauth2.clientId=${CLIENT_ID}
okta.oauth2.clientSecret=${CLIENT_SECRET}
```

Now we need to change a thing or two on the _school-ui_ project.

## Dockerizing

## Using profiles

## Summary





----------------------------

http://cloud.spring.io/spring-cloud-static/spring-cloud-config/1.2.2.RELEASE/

Details about config been registered com discovery server on section "Spring Cloud Config Client"

## Data Service

## Web Application Service

## Spring profiles for different dependencies

## Dockerize and publish
https://spring.io/guides/gs/spring-boot-docker/
https://stackoverflow.com/questions/46057625/externalising-spring-boot-properties-when-deploying-to-docker

To get the IP
```bash
docker-machine ip
```

## Playing with Docker compose and using a real database


## Production ready

We can use [Kubernetes](https://kubernetes.io/) to orchestrate all containers created in this project.
It will help manage services down or that are needing more power: for example, you can set an container
to scale up or down by its CPU usage.

https://github.com/okta/samples-java-spring/blob/master/okta-hosted-login/pom.xml


# TODO section
## Learn More about Spring Security and OIDC

This article showed you how to implement login with OAuth 2.0 and Spring Security 5. I also showed you how to use OIDC to retrieve a user's information. The source code for the application developed in this article can be [found on GitHub](https://github.com/oktadeveloper/okta-spring-security-5-example).

These resources provide additional information about Okta and OIDC:

* [Okta Developer Documentation](/documentation/) and its [OpenID Connect API](/docs/api/resources/oidc)
* [Identity, Claims, & Tokens – An OpenID Connect Primer, Part 1 of 3](/blog/2017/07/25/oidc-primer-part-1)
* [OIDC in Action – An OpenID Connect Primer, Part 2 of 3](/blog/2017/07/25/oidc-primer-part-2)
* [What's in a Token? – An OpenID Connect Primer, Part 3 of 3](/blog/2017/08/01/oidc-primer-part-3)
* [Add Role-Based Access Control to Your App with Spring Security and Thymeleaf](/blog/2017/10/13/okta-groups-spring-security)

If you have any questions about this post, please leave a comment below. You can also post to [Stack Overflow with the okta tag](https://stackoverflow.com/questions/tagged/okta) or use our [developer forums](https://devforum.okta.com/).

[Follow @OktaDev on Twitter](https://twitter.com/oktadev) for more awesome content!