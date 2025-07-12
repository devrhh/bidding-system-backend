import { AppDataSource } from '../src/data-source';
import { User } from '../src/modules/users/users.entity';

async function seedUsers() {
  await AppDataSource.initialize();
  const userRepository = AppDataSource.getRepository(User);

  const existingUsers = await userRepository.count();
  if (existingUsers === 0) {
    const users = [];
    for (let i = 1; i <= 100; i++) {
      users.push(userRepository.create({
        username: `user${i}`,
        email: `user${i}@example.com`,
        firstName: `User${i}`,
        lastName: `Smith${i}`,
        isActive: true,
      }));
    }
    await userRepository.save(users);
  } else {
    console.log('Users already exist, skipping seed.');
  }
  await AppDataSource.destroy();
}

seedUsers().catch((err) => {
  console.error(err);
  process.exit(1);
}); 