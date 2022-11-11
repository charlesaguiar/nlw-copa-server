import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get("/users", async (_, reply) => {
    const users = await prisma.user.findMany();
    return reply.status(200).send({ data: users });
  });

  fastify.get("/users/count", async () => {
    const count = await prisma.user.count();
    return { count };
  });

  fastify.delete("/users", async (request, reply) => {
    const deleteBodySchema = z.object({ id: z.string() });
    const { id } = deleteBodySchema.parse(request.body);

    await prisma.user.delete({ where: { id } });

    return reply
      .status(201)
      .send({ message: `User ${id} deleted successfully.` });
  });
}
