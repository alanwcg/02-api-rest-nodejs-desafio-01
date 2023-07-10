import { FastifyRequest, FastifyReply } from 'fastify'

export async function checkUserExists(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.cookies.userId

  if (!userId) {
    return reply.status(401).send({
      message: 'Unauthorized',
    })
  }
}
