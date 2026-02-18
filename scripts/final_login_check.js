const fetch = global.fetch || require('node-fetch');

async function testLogin() {
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
        console.log('Status Code:', response.status);
        if (response.ok) {
            console.log('Login Successful');
            console.log('Token:', data.token ? 'Present' : 'Missing');
        } else {
            console.log('Login Failed:', data.message);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testLogin();
