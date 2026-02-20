
const API_URL = import.meta.env.VITE_API_URL;

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'An error occurred' }));
        throw new Error(error.message || response.statusText);
    }
    return response.json();
};

export const adminService = {
    // Users
    getUsers: async () => {
        const response = await fetch(`${API_URL}/api/v1/users`, {
            headers: getHeaders()
        });
        return handleResponse(response);
    },
    updateUserRole: async (userId, role) => {
        const response = await fetch(`${API_URL}/api/v1/users/${userId}/role`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ role })
        });
        return handleResponse(response);
    },

    // Games
    getGames: async () => {
        const response = await fetch(`${API_URL}/api/v1/games`, {
            headers: getHeaders() // Though public, admins might see disabled games later
        });
        return handleResponse(response);
    },
    createGame: async (gameData) => {
        const response = await fetch(`${API_URL}/api/v1/games`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(gameData)
        });
        return handleResponse(response);
    },
    updateGame: async (gameId, gameData) => {
        const response = await fetch(`${API_URL}/api/v1/games/${gameId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(gameData)
        });
        return handleResponse(response);
    },
    deleteGame: async (gameId) => {
        const response = await fetch(`${API_URL}/api/v1/games/${gameId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return handleResponse(response);
    },

    // Seasons
    getSeasons: async () => {
        const response = await fetch(`${API_URL}/api/v1/seasons`, {
            headers: getHeaders()
        });
        return handleResponse(response);
    },
    createSeason: async (seasonData) => {
        const response = await fetch(`${API_URL}/api/v1/seasons`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(seasonData)
        });
        return handleResponse(response);
    },
    updateSeason: async (seasonId, seasonData) => {
        const response = await fetch(`${API_URL}/api/v1/seasons/${seasonId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(seasonData)
        });
        return handleResponse(response);
    },
    deleteSeason: async (seasonId) => {
        const response = await fetch(`${API_URL}/api/v1/seasons/${seasonId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return handleResponse(response);
    }
};
