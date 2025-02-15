import { PrismaClient } from '@prisma/client';

export const addOrganizationUser = async (
  id: string,
  userId: string,
  orgId: string,
  role: string
) => {
  const prisma = new PrismaClient();
  return await prisma.organizationUser.create({
    data: {
      id,
      user: { connect: { id: userId } },
      organization: { connect: { id: orgId } },
      role,
    },
  });
};
