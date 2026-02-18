const path = require('path');
const mongoose = require(path.resolve(__dirname, '../server/node_modules/mongoose'));
const dotenv = require(path.resolve(__dirname, '../server/node_modules/dotenv'));
const User = require(path.resolve(__dirname, '../server/models/User'));

// Load environment variables from server/.env
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const resetAdmin = async () => {
    try {
        console.log('Using MONGO_URI:', process.env.MONGO_URI);

        // Ensure connection to 127.0.0.1 (fixes typical localhost lookup issues)
        const uri = process.env.MONGO_URI.replace('localhost', '127.0.0.1');

        console.log('Connecting to MongoDB at:', uri);
        await mongoose.connect(uri);
        console.log('MongoDB Connected Successfully');

        const adminEmail = 'admin@cortexclash.com';
        const newPassword = 'adminpassword123';

        // Find existing admin user
        let admin = await User.findOne({ email: adminEmail });

        if (admin) {
            console.log('Existing admin user found. Updating password...');
            // Directly set password to trigger pre-save hook
            admin.password = newPassword;
            // Ensure other fields are correct
            admin.role = 'admin';
            admin.username = 'SystemAdmin';

            await admin.save();
            console.log('Admin user updated.');
        } else {
            console.log('Admin user not found. Creating new admin...');
            admin = await User.create({
                username: 'SystemAdmin',
                email: adminEmail,
                password: newPassword,
                role: 'admin',
                bio: 'System Administrator'
            });
            console.log('Admin user created.');
        }

        // Verification step
        console.log('Verifying password...');
        const verifyUser = await User.findOne({ email: adminEmail });
        if (verifyUser) {
            console.log('Stored Password Hash:', verifyUser.password);
            const isMatch = await verifyUser.matchPassword(newPassword);
            console.log(`Password match result for '${newPassword}':`, isMatch);

            if (isMatch) {
                console.log('SUCCESS: Admin password reset and verified.');
            } else {
                console.error('FAILURE: Password mismatch after reset! Hashing issue likely.');
            }
        } else {
            console.error('FAILURE: Admin user not found after creation!');
            process.exit(1);
        }

    } catch (err) {
        console.error('Error during admin reset:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Database disconnected.');
        process.exit(0);
    }
};

resetAdmin();
