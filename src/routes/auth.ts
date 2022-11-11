import { FastifyInstance } from "fastify";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { authenticate } from "../plugins/authenticate";

export async function authRoutes(fastify: FastifyInstance) {
  // Creates an user with email/password
  fastify.post("/user", async (request, reply) => {
    const createUserBody = z.object({
      email: z.string(),
      password: z.string(),
      name: z.string(),
    });

    const { email, password, name } = createUserBody.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      return reply
        .status(400)
        .send({ message: "This e-mail is already in use by another user" });
    }

    const createdUser = await prisma.user.create({
      data: {
        email,
        name,
        password,
      },
    });

    return reply.status(201).send({ id: createdUser.id });
  });

  // Log an user in by e-mail/password and provides a token
  fastify.post("/login", async (request, reply) => {
    const loginBody = z.object({
      email: z.string(),
      password: z.string(),
    });

    const { email, password } = loginBody.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return reply.status(404).send({ message: "User not found" });
    }

    if (user.password !== password) {
      return reply.status(401).send({ message: "Wrong password" });
    }

    const token = fastify.jwt.sign(
      {
        name: user.name,
        avatarUrl: user.avatarUrl,
        email: user.email,
      },
      {
        sub: user.id,
        expiresIn: "7 days",
      }
    );

    return reply.status(200).send({ token });
  });

  fastify.get("/me", { onRequest: [authenticate] }, async (request) => {
    return { user: request.user };
  });

  fastify.post("/google-auth/user", async (request) => {
    const createUserBody = z.object({
      access_token: z.string(),
    });

    const { access_token } = createUserBody.parse(request.body);

    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const userData = await userResponse.json();

    const userInfoSchema = z.object({
      id: z.string(),
      email: z.string().email(),
      name: z.string(),
      picture: z.string().url(),
    });

    const userInfo = userInfoSchema.parse(userData);

    let user = await prisma.user.findUnique({
      where: { googleId: userInfo.id },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: userInfo.id,
          name: userInfo.name,
          email: userInfo.email,
          avatarUrl: userInfo.picture,
        },
      });
    }

    const token = fastify.jwt.sign(
      {
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      {
        sub: user.id,
        expiresIn: "7 days",
      }
    );

    return { token };
  });
}
