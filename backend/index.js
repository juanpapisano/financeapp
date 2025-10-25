import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.create({
    data: {
      name: "Juan",
      email: "juan@test.com",
      password: "hashedpassword123"
    }
  })
  console.log("Usuario creado:", user)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())

