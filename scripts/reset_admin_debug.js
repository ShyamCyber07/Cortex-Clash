const path = require('path');
const mongoose = require(path.resolve(__dirname, '../server/node_modules/mongoose'));
const dotenv = require(path.resolve(__dirname, '../server/node_modules/dotenv'));
const User = require(path.resolve(__dirname, '../server/models/User'));

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const resetAdmin = async () => {
    try {
        console.log('Connecting to MongoDB...', process.env.MONGO_URI);
        const uri = process.env.MONGO_URI.replace('localhost', '127.0.0.1');
        await mongoose.connect(uri);
        console.log('MongoDB Connected');

        const adminEmail = 'admin@cortexclash.com';
        let admin = await User.findOne({ email: adminEmail });

        if (admin) {
            console.log('Admin user found. Updating password...');
            admin.password = 'adminpassword123';
            admin.role = 'admin'; // Ensure role is correct
            await admin.save();
            console.log('Admin updated: password reset and role confirmed.');
        } else {
            console.log('Creating new admin user...');
            admin = await User.create({
                username: 'SystemAdmin',
                email: adminEmail,
                password: 'adminpassword123',
                role: 'admin',
                bio: 'System Administrator'
            });
            console.log('Admin created.');
        }

        console.log('Verifying password hash...');
        const verifyAdmin = await User.findOne({ email: adminEmail });
        const matches = await verifyAdmin.matchPassword('adminpassword123');
        console.log(`Password verification result: ${matches}`);

        await mongoose.disconnect();
        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

resetAdmin();
