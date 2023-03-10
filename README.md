# GQLPrismaSelect

### Preconditions

- You have to use Prisma as your ORM
  - https://www.prisma.io/
- Use NestJS or any other framework for backend
  - https://nestjs.com/ - NestJS
  - https://docs.nestjs.com/recipes/prisma#prisma - NestJS Prisma recipe
- You have to use Apollo Server
  - https://www.apollographql.com/docs/apollo-server/ - Apollo Server
  - https://docs.nestjs.com/graphql/quick-start - NestJS Apollo Server recipe

## Description

This package allow you to parse your GraphQL request and convert it to Prisma include and select objects

You can have one request and get any nested data you want

## Installation

```bash
  npm i @nazariistrohush/gql-prisma-select
```

## Types

### Arguments of `new GQLPrismaSelect(info, options)` constructor

- `info` - `GraphQLResolveInfo` object
- `options` - `object` with options
  - `options.get` - `string | string[]` String split by `.` or an array to get custom path of selection (similar to lodash.get)
  - `options.exclude` - `string[]` Fields to exclude from selection
    - `__typename` excluded by default (because not exists in prisma model)

### Results of `new GQLPrismaSelect(info, options)`

- `include` - `object` with include object for Prisma
- `select` - `object` with select object for Prisma
- `originalInclude` - `object` with original include object (same as `include` in case `get` option is not used)
- `originalSelect` - `object` with original select object (same as `select` in case `get` option is not used)

### Static methods

- `GQLPrismaSelect.get(selection, path)` - get some specific selections by path
  - `selection` - `object` with selection ({ include, select } result of `new GQLPrismaSelect(info, options)` constructor)
  - `path` - `string | string[]` String split by `.` or an array
    - Used to get specific selection from select/include object

E.g. get different selections from one GQLPrismaSelect constructor call

```ts
const includeSelect = new GQLPrismaSelect(info);
const { include, select } = GQLPrismaSelect.get(
  includeSelect,
  'collection.User'
);
const { include: includePosts, select: selectPosts } = GQLPrismaSelect.get(
  includeSelect,
  'collection.Post'
);
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

```ts
import {
  GQLPrismaSelect,
  GraphQLResolveInfo,
} from '@nazariistrohush/gql-prisma-select';

export default {
  Query: {
    user: async (parent, args, context, info: GraphQLResolveInfo) => {
      const { include, select } = new GQLPrismaSelect(info);
      // return userService.findOne({ where: { id }, include, select });
      return prisma.user.findUnique({
        where: { id: args.id },
        include,
        select,
      });
    },
  },
};
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
