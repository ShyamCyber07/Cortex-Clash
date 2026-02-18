// using native fetch

async function verifyLogin() {
    try {
        const response = await fetch('http://localhost:5000/api/v1/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@cortexclash.com',
                password: 'adminpassword123'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Login Successful!');
            console.log('Token:', data.token ? 'Received' : 'Missing');
            console.log('User Role:', data.role);
        } else {
            console.log('Login Failed:', data.message);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

verifyLogin();
