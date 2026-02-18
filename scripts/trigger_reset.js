// Hit the temporary debug route to reset admin
const fetch = require('node-fetch').default || require('node-fetch'); // Handle ESM/CJS if needed locally, but pure node fetch native in 18+

async function triggerReset() {
    try {
        console.log('Triggering admin reset...');
        const response = await fetch('http://localhost:5000/api/v1/users/reset-admin-debug');
        const data = await response.json();
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Check native fetch availability (Node 18+)
if (typeof fetch === 'undefined') {
    import('node-fetch').then(({ default: fetch }) => {
        global.fetch = fetch;
        triggerReset();
    }).catch(err => console.log('You need node 18+ or node-fetch installed. Trying basic http...'));
} else {
    triggerReset();
}
