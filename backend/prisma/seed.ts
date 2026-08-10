import { PrismaClient, Role, TaskPriority, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@tracker.dev' },
    update: {},
    create: {
      name: 'Ava Admin',
      email: 'admin@tracker.dev',
      passwordHash: password,
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@tracker.dev' },
    update: {},
    create: {
      name: 'Max Manager',
      email: 'manager@tracker.dev',
      passwordHash: password,
      role: Role.MANAGER,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@tracker.dev' },
    update: {},
    create: {
      name: 'Mia Member',
      email: 'member@tracker.dev',
      passwordHash: password,
      role: Role.MEMBER,
    },
  });

  const secondMember = await prisma.user.upsert({
    where: { email: 'liam@tracker.dev' },
    update: {},
    create: {
      name: 'Liam Member',
      email: 'liam@tracker.dev',
      passwordHash: password,
      role: Role.MEMBER,
    },
  });

  const existing = await prisma.project.findFirst({ where: { name: 'Website Redesign' } });
  if (existing) {
    return;
  }

  const project = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Rebuild the marketing site with a fresh brand and faster pages.',
      ownerId: manager.id,
      members: {
        create: [{ userId: member.id }, { userId: secondMember.id }],
      },
    },
  });

  const mobileApp = await prisma.project.create({
    data: {
      name: 'Mobile App Launch',
      description: 'Ship the first version of the companion mobile app.',
      ownerId: manager.id,
      members: {
        create: [{ userId: member.id }],
      },
    },
  });

  await prisma.task.createMany({
    data: [
      {
        title: 'Design new landing page',
        description: 'Wireframe and high-fidelity mockups for the hero section.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        projectId: project.id,
        assigneeId: member.id,
      },
      {
        title: 'Set up analytics',
        description: 'Add privacy-friendly analytics to every page.',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        projectId: project.id,
        assigneeId: secondMember.id,
      },
      {
        title: 'Audit page performance',
        description: 'Measure Core Web Vitals and list quick wins.',
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        projectId: project.id,
        assigneeId: null,
      },
      {
        title: 'Draft onboarding screens',
        description: 'First-run experience for new mobile users.',
        status: TaskStatus.IN_REVIEW,
        priority: TaskPriority.HIGH,
        projectId: mobileApp.id,
        assigneeId: member.id,
      },
    ],
  });

  console.log('Seed complete. Accounts (password: Password123!):');
  console.log(`  ADMIN   -> ${admin.email}`);
  console.log(`  MANAGER -> ${manager.email}`);
  console.log(`  MEMBER  -> ${member.email}`);
  console.log(`  MEMBER  -> ${secondMember.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
