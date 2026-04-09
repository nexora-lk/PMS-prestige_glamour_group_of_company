import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { ENV } from '../config/env';

async function corsPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.register(cors, {
    origin: [...ENV.ALLOWED_ORIGINS, `http://localhost:${ENV.PORT}`],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}

export default fp(corsPlugin, { name: 'cors' });
