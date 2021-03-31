import { User } from "../entities/User";
import { MyContext } from "../types";
import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import argon2 from 'argon2';

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;

  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field?: string;
  @Field()
  message?: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {

  @Query(() => User, { nullable: true })
  async me(
    @Ctx() { req, em }: MyContext
  ) {
    if (req.session.userId === null) {
      return null;
    }

    const user = await em.findOne(User, { id: req.session.userId })
    console.log(user);
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options', () => UsernamePasswordInput) options: UsernamePasswordInput,
    @Ctx() { req, em }: MyContext
  ): Promise<UserResponse> {
    if (options.username.length <= 2) {
      return {
        errors: [{
          field: "username",
          message: "username must be greater than 2 characters",
        }]
      }
    }

    if (options.password.length <= 3) {
      return {
        errors: [{
          field: "password",
          message: "password must be greater than 2 characters",
        }]
      }
    }

    const userExists = await em.findOne(User, { username: options.username });
    if (userExists) {
      return {
        errors: [{
          field: "username",
          message: "username already taken",
        }]
      }
    }

    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, { 
      username: options.username, 
      password: hashedPassword 
    })

    await em.persistAndFlush(user);

    req.session.userId = user.id; 

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('options', () => UsernamePasswordInput) options: UsernamePasswordInput,
    @Ctx() { req, em }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { username: options.username });

    if (!user) {
      return {
        errors: [
          {
            field: "username",
            message: "that username doesn't exist"
          }
        ]
      };
    } 

    const valid = await argon2.verify(user.password, options.password);
    if (!valid) {
      return {
        errors: [{
            field: "password",
            message: "incorrect password"
          }
        ]
      };
    }

    req.session.userId = user.id; 

    return { user };
  }
}