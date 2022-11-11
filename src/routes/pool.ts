import { FastifyInstance } from "fastify";
import { z } from "zod";
import ShortUniqueId from "short-unique-id";

import { prisma } from "../lib/prisma";
import { authenticate } from "../plugins/authenticate";

export async function poolRoutes(fastify: FastifyInstance) {
  fastify.get("/pools/count", async () => {
    const count = await prisma.pool.count();
    return { count };
  });

  fastify.post("/pools", async (request, reply) => {
    const createPoolBody = z.object({
      title: z.string(),
    });

    try {
      const { title } = createPoolBody.parse(request.body);
      const generate = new ShortUniqueId({ length: 6 });
      const code = String(generate()).toUpperCase();

      try {
        await request.jwtVerify();
        await prisma.pool.create({
          data: {
            title,
            code,
            ownerId: request.user.sub,
            participants: {
              create: {
                userId: request.user.sub,
              },
            },
          },
        });
      } catch {
        await prisma.pool.create({
          data: {
            title,
            code,
          },
        });
      }

      return reply.status(201).send({ code });
    } catch (e) {
      return reply.status(400).send({
        message: "Failed to create pool",
        error: (e as Error).message,
      });
    }
  });

  fastify.post(
    "/pools/join",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const joinPoolBody = z.object({
        code: z.string(),
      });

      const { code } = joinPoolBody.parse(request.body);

      const pool = await prisma.pool.findUnique({
        where: { code },
        include: { participants: { where: { userId: request.user.sub } } },
      });

      if (!pool) {
        return reply.code(400).send({ message: "Pool not found." });
      }

      if (pool.participants.length > 0) {
        return reply
          .code(400)
          .send({ message: "You already joined this pool." });
      }

      /* TODO: medida paliativa, primeiro usuário que entra no bolão vira o dono, se o bolão ainda não tiver dono (feito pela web) */
      /* SOLUÇÃO: implementar autenticação na web e deixar o usuário criar o bolão somente se estiver logado */
      if (!pool.ownerId) {
        await prisma.pool.update({
          where: { id: pool.id },
          data: { ownerId: request.user.sub },
        });
      }

      await prisma.participant.create({
        data: {
          poolId: pool.id,
          userId: request.user.sub,
        },
      });

      return reply.code(201).send();
    }
  );

  fastify.get("/pools", { onRequest: [authenticate] }, async (request) => {
    const loggedUserId = request.user.sub;

    const poolsLoogedUserJoined = await prisma.pool.findMany({
      where: { participants: { some: { userId: loggedUserId } } },
      include: {
        _count: { select: { participants: true } },
        participants: {
          select: { id: true, user: { select: { avatarUrl: true } } },
          take: 4,
        },
        owner: { select: { name: true, id: true } },
      },
    });

    return { pools: poolsLoogedUserJoined };
  });

  /* Pool details */
  /* Must be one of the pools logged user has joined */
  fastify.get("/pools/:id", { onRequest: [authenticate] }, async (request) => {
    const getPoolParams = z.object({ id: z.string() });
    const { id } = getPoolParams.parse(request.params);

    const pool = await prisma.pool.findUnique({
      where: { id },
      include: {
        _count: { select: { participants: true } },
        participants: {
          select: { id: true, user: { select: { avatarUrl: true } } },
          take: 4,
        },
        owner: { select: { name: true, id: true } },
      },
    });

    return { pool };
  });
}
