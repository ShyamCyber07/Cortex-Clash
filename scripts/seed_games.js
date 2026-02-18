async function seedGames() {
    try {
        console.log('Seeding games...');
        await fetch('http://localhost:5000/api/v1/games/seed', { method: 'POST' });
        console.log('Games seeded successfully!');
    } catch (error) {
        console.error('Error seeding games:', error.message);
    }
}

seedGames();
