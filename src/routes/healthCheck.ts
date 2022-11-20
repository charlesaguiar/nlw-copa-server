import { FastifyInstance } from "fastify";

export async function healthCheckRoutes(fastify: FastifyInstance) {
  fastify.get("/health-check", (_, reply) => {
    return reply.status(200).send({ message: "Server up and running" });
  });
}
