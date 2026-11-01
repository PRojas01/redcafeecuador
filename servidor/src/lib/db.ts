import { PrismaClient, Prisma } from "@prisma/client";

export const db = new PrismaClient();
export type Tx = Prisma.TransactionClient;
export { Prisma };
