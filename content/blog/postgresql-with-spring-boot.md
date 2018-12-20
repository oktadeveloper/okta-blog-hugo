---
layout: blog_post
title: "Spring Boot with PostgreSQL"
author: raphaeldovale
date: 2018-12-20T00:00:00Z
description: "This article presents how a developer can integrate Spring Boot and PostgreSQL, using some exclusive property and NoSQL column types"
tags: [PostgreSQL, SQL, NoSQL, JPA, Hibernate, java, spring boot]
tweets:
- "In doubt how to integrate Spring Boot and Hibernate? This article is for you!"
- "Use PostgreSQL as an NoSQL database with Spring Boot!"
image: blog/featured/okta-java-short-skew.jpg
---

In this tutorial, you are going to learn more about [PostgreSQL](https://www.postgresql.org/) and how to integrate it with a [Spring Boot application](https://spring.io/projects/spring-boot).

You will learn how to install a simple PostgreSQL instance using Docker and how to connect a Spring Boot application to it. After that, you'll create a simple database schema and add some data to it. Next, I'll show you how to create SQL files to deliver database changes, which are more suitable for enterprise applications. To finish, you will learn how to use PostgreSQL JSONB data structure and use PostgreSQL as a NoSQL database.

Let's dig into it!

## Relational Databases and PostgreSQL

Initially proposed in [the 70's](https://en.wikipedia.org/wiki/Relational_database), RDBMS (*Relational Database Management System*) has grown in popularity over the latest decades as the computing processing power and storage capacity increases. Other databases types such as [Graph Databases](https://en.wikipedia.org/wiki/Graph_database) or [Hierarchical Databases](https://en.wikipedia.org/wiki/Hierarchical_database_model) were introduced by the same time, but they were too complex by its time and helped Relational Databases to _win_ over the them into developers preference.

Another critical characteristic of RDBMS systems is the support for [ACID transactions](https://en.wikipedia.org/wiki/ACID_(computer_science)) (*Atomicity, Consistency, Isolation, Durability*) which guarantee data consistency even in a concurrent environment without the developer need to be fully aware.

[PostgreSQL](https://en.wikipedia.org/wiki/PostgreSQL) is one of the most famous RDBMS around. Technically speaking it is also one of the most advanced relational database system available (freely or commercial). Why is that? Postgres means *Post Ingres* or the successor of Ingres, an older database once sold and paved the way to the more famous *Microsoft SQL Server* and other products. What do they have in common? Its creator: Michael Stonebraker. If you are interested in history, Wikipedia has an [excellent article](https://en.wikipedia.org/wiki/PostgreSQL) about it.

## Prerequisites

First and foremost, you'll need to download this post's [GitHub repository](https://github.com/raphaeldovale/use_postgresql_with_spring_boot) that helps you if you have any doubts. Carefully selected branches are available to help you on each step of this article if you need any help.

You will also need PostgreSQL to run the tutorial. To install and test PostgreSQL I recommend using Docker:

```bash
1. > docker pull postgres:11
2. > docker run --name dev-postgres -p 5432:5432 -e POSTGRES_PASSWORD=mysecretpassword -d postgres:11
# CREATE db coursedb
3. > docker exec dev-postgres psql -U postgres -c"CREATE DATABASE coursedb" postgres
```

The command above should run in any Linux, Windows, or MacOS distribution that has an instance of Docker installed. The first line pulls PostgreSQL version 11, while line *2* initiates a new instance of it with the name `dev-postgres,` running on port `5432`. The latest line executes a _DDL_ command to create the database `coursedb` into the instance. Keep in mind you are not creating a volume for the storage data so once the container is deleted, all its data wil be deleted as well.

## Create Spring Boot App

**TIP:** If you’d like to skup this section, you can simply clone this post’s repo and checkout the `start` branch: `git checkout start` 

First, you need to create a new project with needed dependencies. Thankfully, Spring has the right tool for us: [Spring Initialzr](https://start.spring.io/).

<img src="/img/blog/postgresql-with-spring-boot/spring-initializr.png" 
     alt="New Spring Application" width="800" class="center-image">

Configure your project as the image above:

* **Project Type**: Maven Project
* **Group**: com.okta.developer
* **Artifact**: spring_boot_postgressql
* **Dependencies**: Web, JPA, PostgreSQL

Download the file and unzip it. Do you know you can already run this application? Simply run the command line below:

```bash
> ./mvnw spring-boot:run
```

> **Note**: depending on your operating system, you need to change `./mvnw` to `mvnw` into the command line. 

Running `mvnw` will download Maven, all dependencies, and run the application goal (`spring-boot:run`). It will likely fail because you do not have a PostgreSQL database setup. Let's fix this.

## Add Database Configuration

**TIP:** Use `git checkout database_configuration` to skip this section.

You now have a system that has database dependencies but does not know where to connect. First, create a class named `net.dovale.okta.spring_boot_postgressql.config.DatabaseConfig` to configure your database:

```java
package net.dovale.okta.spring_boot_postgressql.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EnableTransactionManagement
public class DatabaseConfig {}
```

Configuration classes in Spring allow you to set up your application using _type safe_ code. This means if something becomes inconsistent with your configuration, the configuration class will show compilation errors. The feature is a nice evolution from the older XML-based configuration Spring used to have. Previously, it was possible to get runtime errors since XML and your code was not linked.

Update `/src/main/resources/application.properties` too, to define your database connection properties:

```properties 
spring.datasource.url=jdbc:postgresql://192.168.99.100:5432/coursedb
spring.datasource.username=postgres
spring.datasource.password=mysecretpassword
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=create
```

Here's quick explanation of each property:

* `spring.datasource.url` - describes the JDBC connection URL. Each RDBMS (like PostgreSQL, MySQL, Oracle, etc.) has its format. The IP `192.168.99.100` is the assigned by Docker to the host machine in Windows or MacOS machines. If you are running on Linux, you can change to `127.0.0.1` as the Docker Host is your machine.
* `spring.datasource.username` - the username you will connect to the database. We are going to use the master user for this tutorial. For production, you should create a limited user for each application.
* `spring.datasource.password` - The password we set when creating PostgreSQL docker instance.
* `spring.jpa.properties.hibernate.dialect` - Although SQL is a standard, each database has some specific syntax that is addressed by hibernate dialect.
* `spring.jpa.hibernate.ddl-auto` - Define if Hibernate can create, delete and create, update or validate the current Database Schema. Currently, you should set this property to `create` so Hibernate can handle all Database Schema.

What happens if you start up the application again?

```bash
> ./mvnw spring-boot:run
```

Now the application starts and you should be able to open `http://localhost:8080` in your browser. Nothing nice happens as you haven't written any code for the UI yet. You may see an error stack on initialization: don’t worry, it is simply Hibernate telling the JDBC driver does not support a feature (method `createClob`).

## Create Persistent Entities and DAO's
**TIP:** use `git checkout entities` to skip this section

OK, now let's do real work.

First of all, let's look at this tutorial's schema. It has two entities:

* Teacher
  * Columns: name, picture, email
* Course
  * Columns: name, workload, rate
  * Relationship: teacher

Before changing the code, add two new dependencies in your `pom.xml` file:

```xml
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-rest</artifactId>
</dependency>
```

Project Lombok adds a series of helpful features that simplify developer's life like getter/setter and constructor autogeneration. If you are using an IDE to develop this tutorial, you must install a [plugin](https://projectlombok.org/setup/overview) to avoid compilation problems.

Spring Boot Data Rest is a handy dependency that creates an HTTP interface for your repositories. You are going to use the HTTP interface to test your code.

To help your entities, you'll create a _superclass_ that handles the primary key in the same way for every entity we create. PostgreSQL has support to UUID, so you are going to use it instead of the commonly used auto-increment integer. UUID is helpful to avoid a normal attack in which the hacker tries to increase or decrease an entity ID to discover new information.

Create the class `EntityWithUUID` in package `net.dovale.okta.spring_boot_postgressql.entities`:

```java
package net.dovale.okta.spring_boot_postgressql.entities;

import org.hibernate.annotations.Type;
import javax.persistence.Id;
import javax.persistence.MappedSuperclass;
import java.util.UUID;

@MappedSuperclass
public class EntityWithUUID {
    @Id
    @Type(type = "pg-uuid")
    private UUID id;

    public EntityWithUUID() {
        this.id = UUID.randomUUID();
    }
}
```

There are some excellent annotations here:
* `@MappedSuperclass` says to JPA this class is a superclass of an entity and should have its attributes mapped into the entity.
* `@Id` says the attribute is a primary key
* `@Type`  specifies what type is used on the database. We need to specify since PostgreSQL have its type for UUIDs: `pg-uuid`.

Now, create the two entities in the `net.dovale.okta.spring_boot_postgressql.entities` package:

**Teacher.java**
```java
package net.dovale.okta.spring_boot_postgressql.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import javax.persistence.Entity;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Teacher extends EntityWithUUID {
    private String name;
    private String pictureURL;
    private String email;
}
```

**Couse.java**

```java
package net.dovale.okta.spring_boot_postgressql.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import javax.persistence.*;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Course extends EntityWithUUID {
    private String name;
    private int workload;
    private short rate;
    @ManyToOne
    @JoinColumn(foreignKey = @ForeignKey(name = "fk_course_teacher"))
    private Teacher teacher;
}
```

The annotations have a significant influence in these classes:

* `@Data` - It's a _Lombok_ annotation and tells Lombok to create getter and setter for all attributes.
* `@AllArgsConstructor` - Tells _Lombok_ to create a constructor with all class attributes
* `@NoArgsConstructor` - Tells _Lombok_ to create another constructor with no arguments. It is useful for JPA.
* `@Entity` - Indicates this class represents a persistent entity. It is interpreted as a table by JPA, and the table should have the same class name unless you change it.
* `@ManyToOne` and `@JoinColumn` - Indicates there is a _Many to One_ relationship whose relationship uses of a _Join Column_. It is possible to set the foreign key if Hibernate is going to create the DDL.

So far, so good. Now, create a DAO (_Data Access Object_, also called as _Repository_ by Spring) class for each entity in the `net.dovale.okta.spring_boot_postgressql.dao` package:

**CourseDAO**
```java
package net.dovale.okta.spring_boot_postgressql.dao;

import net.dovale.okta.spring_boot_postgressql.entities.Course;
import org.springframework.data.repository.CrudRepository;
import java.util.UUID;

public interface CourseDAO extends CrudRepository<Course, UUID> {}

```

**TeacherDAO**
```java
package net.dovale.okta.spring_boot_postgressql.dao;

import net.dovale.okta.spring_boot_postgressql.entities.Teacher;
import org.springframework.data.repository.CrudRepository;
import java.util.UUID;

public interface TeacherDAO extends CrudRepository<Teacher, UUID> {}
```

You now  have DAOs for each entity. You may be asking where is the implementation for them? _Spring Data_ has some sweet and intelligent ways to handle this. Since your interfaces extend `CrudRepository`, automatically Spring generates the concrete class with all [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) related operations available!

To fill some data, create a new service class called `DataFillerService`. It will be responsible for inserting data in the database as soon as the application starts.

**DataFillerService.java**
```java
package net.dovale.okta.spring_boot_postgressql.service;

import net.dovale.okta.spring_boot_postgressql.dao.CourseDAO;
import net.dovale.okta.spring_boot_postgressql.dao.TeacherDAO;
import net.dovale.okta.spring_boot_postgressql.entities.Course;
import net.dovale.okta.spring_boot_postgressql.entities.Teacher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.annotation.PostConstruct;

@Service
public class DataFillerService {
    private final CourseDAO courseDAO;
    private final TeacherDAO teacherDAO;
    public DataFillerService(CourseDAO courseDAO, TeacherDAO teacherDAO) {
        this.courseDAO = courseDAO;
        this.teacherDAO = teacherDAO;
    }
    @PostConstruct
    @Transactional
    public void fillData(){
        Teacher pj = new Teacher(
                "Profesor Jirafales",
                "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Ruben2017.jpg/245px-Ruben2017.jpg",
                "jirafales@yahoo_.com"
        );
        Teacher px = new Teacher(
                "Professor X",
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9uI1Cb-nQ2uJOph4_t96KRvLSMjczAKnHLJYi1nqWXagvqWc4",
                "director@xproject_.com"

        );
        teacherDAO.save(pj);
        teacherDAO.save(px);
        // create courses
        Course mathematics = new Course("Mathematics", 20, (short) 10, pj);
        Course spanish = new Course("Spanish", 20, (short) 10, pj);
        Course dealingWithUnknown = new Course("Dealing with unknown", 10, (short) 100, pj);
        Course handlingYourMentalPower = new Course("Handling your mental power", 50, (short) 100, pj);
        Course introductionToPsychology = new Course("Introduction to psychology", 90, (short) 100, pj);
        courseDAO.save(mathematics);
        courseDAO.save(spanish);
        courseDAO.save(dealingWithUnknown);
        courseDAO.save(handlingYourMentalPower);
        courseDAO.save(introductionToPsychology);
    }
}
```

The method `fillData` is automatically called by Spring Context as soon the application context finished loading. It uses the `@Transaction` annotations to indicate the entire method must run inside a transaction. That way, if any instruction fails, the entire method will be rolled back. As you can see, `CourseDAO` and `TeacherDAO` has some CRUD methods available.

Now, you can test if your application is working: 

```bash
> ./mvnw spring-boot:run
```

The application creates several REST endpoints to access your DAO's method. Try some commands: 

```bash
> curl http://localhost:8080/courses
> curl http://localhost:8080/teachers
```

## Versioning and Securing Database Version Changes
**TIP:** use `git checkout migration` to skip this section

Hibernate DDL creation is a nice feature for PoCs or small projects. For more significant projects that have a complex deployment workflow and features like version rollback in case of a significant issue, the solution is not sufficient.

There are several tools to handle database migrations, and one of the most popular is [Flyway](https://flywaydb.org/), which works flawlessly with Spring Boot. Briefly, Flyway looks for SQL scripts on your project's resource path and runs all scripts not previously executed in a defined order. Flyway store what files were executed into a particular table called `SCHEMA_VERSION`.

First, add Flyway as a dependency in `pom.xml`. When Spring detects Flyway on the classpath, it will run it on startup:

```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
```

By default, Flyway looks at files in the format `V$X__$DESCRIPTION.sql`, where $X is the migration version name, in folder `/resource/db/migration`. Create two files: one for the DDL and another for sample data:

**V1__ddl.sql**
```sql
CREATE TABLE course
  (
     id         UUID NOT NULL,
     NAME       VARCHAR(255),
     rate       INT2 NOT NULL,
     workload   INT4 NOT NULL,
     teacher_id UUID,
     PRIMARY KEY (id)
  );

CREATE TABLE teacher
  (
     id         UUID NOT NULL,
     email      VARCHAR(255),
     NAME       VARCHAR(255),
     pictureurl VARCHAR(255),
     PRIMARY KEY (id)
  );

ALTER TABLE course
  ADD CONSTRAINT fk_course_teacher FOREIGN KEY (teacher_id) REFERENCES teacher;
```

**V2__data.sql**
```sql
INSERT INTO teacher
            (id,
             email,
             NAME, 
             pictureurl)
VALUES      ( '531e4cdd-bb78-4769-a0c7-cb948a9f1238',
              'jirafales@yahoo_.com',
              'Profesor Jirafales',
              'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Ruben2017.jpg/245px-Ruben2017.jpg');

INSERT INTO teacher 
            (id,
             email,
             NAME, 
             pictureurl)
VALUES      ('6924b3ad-a7e7-4a9a-8773-58f89ef88509',
             'director@xproject_.com',
             'Professor X', 
             'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9uI1Cb-nQ2uJOph4_t96KRvLSMjczAKnHLJYi1nqWXagvqWc4');

INSERT INTO course 
            (id,
             NAME,
             rate, 
             teacher_id, 
             workload)
VALUES      ('aeebbc96-52be-43fa-8c01-61b9fbca8fd7',
             'Mathematics',
             10,
             '531e4cdd-bb78-4769-a0c7-cb948a9f1238',
             20);

INSERT INTO course 
            (id,
             NAME,
             rate, 
             teacher_id, 
             workload)
VALUES      ('a6e54dad-a5a6-46c6-92b0-d61a78abb142',
            'Spanish',
             10, 
             '531e4cdd-bb78-4769-a0c7-cb948a9f1238',
             1)  ;

INSERT INTO course 
            (id,
             NAME,
             rate, 
             teacher_id, 
             workload)
VALUES      ('13710917-7469-4bd7-91cc-af8df36213c9',
             'Dealing with unknown',
             100, 
             '6924b3ad-a7e7-4a9a-8773-58f89ef88509',
             10) ;

INSERT INTO course 
            (id,
             NAME,
             rate, 
             teacher_id, 
             workload)
VALUES      ('c5e24451-86d3-4f20-ae06-55810c3cf350',
             'Handling your mental power',
             50, 
             '6924b3ad-a7e7-4a9a-8773-58f89ef88509',
             1000) ;

INSERT INTO course 
            (id,
             NAME,
             rate, 
             teacher_id,
             workload)
VALUES      ('d5063295-f1f6-44d3-8e3a-5ba5d8fb46eb',
             'Introduction to psychology',
             100, 
             '6924b3ad-a7e7-4a9a-8773-58f89ef88509',
             90);
```

Before starting the project again, delete the class `DataFillerService` since these SQL files will now import all data.

In `application.properties` change the `ddl-auto` configuration to `validate`:

```properties
spring.jpa.hibernate.ddl-auto = validate
```

It means Hibernate validates if the Schema matches with what was defined in Java. If no match is found, the application will not startup.

Delete and create a new PostgreSQL database instance, since the first instance was creating using JPA.

```bash
> docker rm -f dev-postgres
> docker run --name dev-postgres -p 5432:5432 -e POSTGRES_PASSWORD=mysecretpassword -d postgres:11
> docker exec dev-postgres psql -U postgres -c"CREATE DATABASE coursedb" postgres
```

Now, start Spring Boot again:

```bash
> ./mvnw spring-boot:run
```

You will see the same data exposed, but if you have a look into the logs, will notice Flyway is running database migration:

```
2018-11-25 23:50:12.941  INFO 30256 --- [           main] o.f.core.internal.command.DbValidate     : Successfully validated 2 migrations (execution time 00:00.037s)
2018-11-25 23:50:12.960  INFO 30256 --- [           main] o.f.c.i.s.JdbcTableSchemaHistory         : Creating Schema History table: "public"."flyway_schema_history"
2018-11-25 23:50:13.010  INFO 30256 --- [           main] o.f.core.internal.command.DbMigrate      : Current version of schema "public": << Empty Schema >>
2018-11-25 23:50:13.013  INFO 30256 --- [           main] o.f.core.internal.command.DbMigrate      : Migrating schema "public" to version 1 - ddl
2018-11-25 23:50:13.046  INFO 30256 --- [           main] o.f.core.internal.command.DbMigrate      : Migrating schema "public" to version 2 - data
2018-11-25 23:50:13.066  INFO 30256 --- [           main] o.f.core.internal.command.DbMigrate      : Successfully applied 2 migrations to schema "public" (execution time 00:00.109s)
```

## Scratching NoSQL Surface with Spring Boot and PostgreSQL's JSONB Data Structure
**TIP:** use `git checkout jsonb` to skip this section

[NoSQL databases](https://en.wikipedia.org/wiki/NoSQL) are, as the name says, databases that do not store their data with relationships. There are many types of NoSQL databases: graph databases, key-value stores, document, etc. Generally speaking, one of the most significant advantages of this kind of database is the lack of schema enforcement (you can mix a different kind of data), different levels of data consistency and better performance in some cases.

PostgreSQL adopted some data types to handle JSON data inside its data structures. This datatype is called JSONB, and this section shows how it is possible to use it with Spring Boot and without changing your current schema.

First, create a new migration file `V3__teacher_reviews.sql`.

```sql
ALTER TABLE teacher
  ADD COLUMN reviews jsonb
```

To properly work with this custom datatype, you need to add a dependency that correctly handles it. Edit file `pom.xml`:

```xml
<dependency>
    <groupId>com.vladmihalcea</groupId>
    <artifactId>hibernate-types-52</artifactId>
    <version>2.3.4</version>
</dependency>
```

The column `reviews` stores a JSON array with all reviews a teacher received. First, you need to change the superclass to define the new datatype correctly:

**EntityWithUUID.java**
```java
@MappedSuperclass
@TypeDefs({
        @TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
})
public class EntityWithUUID {
    @Id
    @Type(type = "pg-uuid")
    private UUID id;

    public EntityWithUUID() {
        this.id = UUID.randomUUID();
    }
}
```

Now, create a  class called `Review` in the `entities` package:

```java
package net.dovale.okta.spring_boot_postgressql.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Review implements Serializable {
    private String author;
    private String review;
    private LocalDate date;
}
```

This class needs to implement `Serializable` as it is stored in JSON format. Now, change `Teacher` class to have a _reviews_ property:

```java
@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Teacher extends EntityWithUUID {

    private String name;
    private String pictureURL;
    private String email;

    @Type(type = "jsonb")
    @Column(columnDefinition = "jsonb")
    @Basic(fetch = FetchType.LAZY)
    private List<Review> reviews;

}
```

Now you have set a list of data type `jsonb` but also added a _fetch = LAZY_ property. The property tells Hibernate to **NOT** retrieve the attribute value unless asked. Without the property, every call to a teacher instance will process JSON and create review objects. Hibernate needs a Maven plugin to work with lazy attributes properly. Edit the `pom.xml` file and add the following snippet in the `<plugins>` node.

```xml
<plugin>
    <groupId>org.hibernate.orm.tooling</groupId>
    <artifactId>hibernate-enhance-maven-plugin</artifactId>
    <executions>
        <execution>
            <configuration>
                <failOnError>true</failOnError>
                <enableLazyInitialization>true</enableLazyInitialization>
            </configuration>
            <goals>
                <goal>enhance</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

OK, you are almost there. You just need to add some methods to add reviews to a teacher. I decided to take a more MVC approach here and create a Service and a Controller.

**TeacherService.java**

```java
package net.dovale.okta.spring_boot_postgressql.service;

import net.dovale.okta.spring_boot_postgressql.entities.Review;
import javax.validation.constraints.NotNull;

public interface TeacherService {
    /**
     *
     * @param teacherID
     * @param review
     * @throws javax.persistence.EntityNotFoundException
     */
    void addReview(@NotNull String teacherID, @NotNull Review review);
}
```

**SimpleTeacherService.java**

```java
package net.dovale.okta.spring_boot_postgressql.service;

import net.dovale.okta.spring_boot_postgressql.dao.TeacherDAO;
import net.dovale.okta.spring_boot_postgressql.entities.Review;
import net.dovale.okta.spring_boot_postgressql.entities.Teacher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import javax.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Objects;
import java.util.UUID;

@Service
public class SimpleTeacherService implements TeacherService {
    private final TeacherDAO teacherDAO;
    @Autowired
    public SimpleTeacherService(TeacherDAO teacherDAO) {
        this.teacherDAO = teacherDAO;
    }
    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void addReview(String teacherID, Review review) {
        Objects.requireNonNull(teacherID);
        Objects.requireNonNull(review);
        Teacher teacher = teacherDAO
                .findById(UUID.fromString(teacherID))
                .orElseThrow(() -> new EntityNotFoundException(teacherID));
        review.setDate(LocalDate.now());
        if(teacher.getReviews() == null){
            teacher.setReviews(new ArrayList<>());
        }
        teacher.getReviews().add(review);
        teacherDAO.save(teacher);
    }
}
```

**TeacherController**

```java
package net.dovale.okta.spring_boot_postgressql.controllers;

import net.dovale.okta.spring_boot_postgressql.entities.Review;
import net.dovale.okta.spring_boot_postgressql.service.TeacherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.persistence.EntityNotFoundException;

@RestController
public class TeacherController {

    @Autowired
    private final TeacherService teacherService;
    @Autowired
    public TeacherController(TeacherService teacherService) {
        this.teacherService = teacherService;
    }
    @PostMapping("/teachers/{id}/review")
    public ResponseEntity addReview(@RequestBody Review review, @PathVariable("id") String teacherID){
        try {
            teacherService.addReview(teacherID, review);
            return ResponseEntity.ok().build();
        }
        catch (EntityNotFoundException e){
            return ResponseEntity.notFound().build();
        }
    }
}
```

In `SimpleTeacherService`, note that there  is an annotation `@Transactional(isolation = Isolation.SERIALIZABLE)`. It means every call to this method runs in the most secure transaction level. In other words, once the code reads the `reviews` JSON value, no other code can read or write on the `reviews` column (it is blocked) until the transaction finishes. Why's that? Since you are manipulating JSON content, if a concurrent transaction updates the column, one of them will have consistency problems.

You can now run

```bash
> ./mvnw spring-boot:run
```

Moreover, test the review upload by running CURL:

```bash
curl -X POST \
  http://localhost:8080/teachers/531e4cdd-bb78-4769-a0c7-cb948a9f1238/review \
  -H 'Content-Type: application/json' \
  -d '{
    "author" : "Raphael",
    "review" : "Test"
  }'
```

## Conclusion

In this tutorial, we explore the integration with Spring Boot and PostgreSQL and even used some advanced technologies. 

There is plenty of knowledge to learn about JPA, Hibernate and PostgreSQL. Please refer to the following articles if you are interested in learning more:

**


