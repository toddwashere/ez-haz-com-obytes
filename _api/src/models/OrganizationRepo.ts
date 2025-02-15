import { PrismaClient } from '@prisma/client';

export const addOrganization = async (id: string, name: string) => {
  const prisma = new PrismaClient();
  return await prisma.organization.create({
    data: {
      id,
      name,
    },
  });
};
