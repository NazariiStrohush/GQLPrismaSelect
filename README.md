# GQLPrismaSelect

## Description
This package allow you to parse your GraphQL request and convert it to Prisma include and select objects

You can have one request and get any nested data you want

## Installation

```bash
  npm i @nazariistrohush/gql-prisma-select
```

## Quick example

Get info from your request using `@nestjs/graphql`

Import `GQLPrismaSelect` and `GraphQLResolveInfo`
```ts
import {
  GQLPrismaSelect,
  GraphQLResolveInfo,
} from '@nazariistrohush/gql-prisma-select';
```

#### Code first approach
```ts
@Query(() => Result)
someResolver(@Info() info: GraphQLResolveInfo) {
  // "info" is what you need
  const { include, select } = new GQLPrismaSelect(info);
}
```

#### Schema first approach

Get forth argument in your resolver
https://www.apollographql.com/docs/apollo-server/data/resolvers/#handling-arguments

```ts
someResolver(parent, args, context, info) {
  // "info" is what you need
  const { include, select } = new GQLPrismaSelect(info);
}
```

Then use it in Prisma.findUnique/findMany/findOne/updateOne/deleteOne etc...

## Complete example

### Preconditions

- You have to use Prisma as your ORM
- You have to use Apollo Server

#### Describe your prisma model

```prisma
model User {
  id          Int          @id @unique @default(autoincrement())
  email       String       @unique
  Posts       Post[]
}

model Post {
  id        Int     @id @unique @default(autoincrement())
  content   String
  User      User    @relation(fields: [userId], references: [id])
  userId    Int
}
```

#### Describe your GraphQL schema in your resolvers

_**Make sure fields in Graphql are same named as in your prisma model**_

Describe **User** **Post** types according to your prisma model (have in separate files)

```ts
@ObjectType()
export class User {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  email: string;

  @Field(() => [Post], { nullable: true, defaultValue: [] })
  Posts?: Post[];
}

@ObjectType()
export class Post {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  content: string;

  @Field(() => Int)
  userId: number;

  @Field(() => User)
  User: User;
}
```

Or in case you are using schema first approach

```gql
type User {
  id: Int!
  email: String!
  Posts: [Post!] = []
}

type Post {
  id: Int!
  content: String!
  userId: Int!
  User: User!
}
```

Describe **User** service **findOne** method

```ts
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // findUniqueUserArgs already contains "select" and "include" which you can use to:
  // get your any nested data using include
  // filter fields of result by using select
  findOne(findUniqueUserArgs: Prisma.UserFindUniqueArgs) {
    return this.prisma.user.findUnique({
      ...findUniqueUserArgs,
    });
  }
}
```

Or use `prisma.user.findUnique()` directly in your resolver (not recommended)

### Use GQLPrismaSelect in your resolvers

#### I'm using NestJS and Code First approach, but you can use any other framework

```ts
import { Args, Info, Int, Query, Resolver } from '@nestjs/graphql';
import {
  GQLPrismaSelect,
  GraphQLResolveInfo,
} from '@nazariistrohush/gql-prisma-select';

@Resolver(() => User)
export class UserResolver {
  // Inject your service
  constructor(private readonly userService: UserService) {}

  @Query(() => User)
  async user(
    // Use this from @nestjs/graphql to get info of your request
    @Info() info: GraphQLResolveInfo,
    @Args('id', { type: () => Int }) id: number
  ) {
    // This will parse your request and return include and select objects
    const { include, select } = new GQLPrismaSelect(info);
    // Pass include and select to your service to get any requested data
    return this.userService.findOne({ where: { id }, include, select });
  }
}
```

Or in case you are using schema first approach

```gql
type Query {
  user(id: Int!): User!
}
```

#### Finally you can use your query like this

To get only id and email of user

```gql
query {
  user(id: 1) {
    id
    email
  }
}
```

To get user with all posts

```gql
query {
  user(id: 1) {
    id
    email
    Posts {
      id
      content
    }
  }
}
```

You can also describe posts query and get each user per post, or without it :)

