const User = require('./models/User');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
    try {
        const email = 'admin@cortexclash.com';
        const password = 'password123';

        const userExists = await User.findOne({ email });

        if (!userExists) {
            console.log('Seed: Admin user not found. Creating...');
            // The User model hashes the password in pre-save hook
            await User.create({
                username: 'admin',
                email: email,
                password: password,
                role: 'admin'
            });
            console.log('Seed: Admin user created successfully.');
            console.log(`Seed: Login with ${email} / ${password}`);
        } else {
            console.log('Seed: Admin user already exists.');
            // Optionally verify role
            if (userExists.role !== 'admin') {
                userExists.role = 'admin';
                await userExists.save();
                console.log('Seed: User role updated to admin.');
            }
        }
    } catch (error) {
        console.error('Seed: Error seeding admin user:', error.message);
    }
};

module.exports = seedAdmin;
