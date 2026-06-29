const API_BASE_URL = 'http://localhost:5000/api';

const api = {
    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    async login(usuario, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ usuario, password })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error en el login');
            }
            return data;
        } catch (error) {
            console.error('Error en el login:', error);
            return { status: 'error', error: error.message };
        }
    },

    async getMuebles() {
        try {
            const response = await fetch(`${API_BASE_URL}/muebles`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching muebles:', error);
            return { error: true, message: error.message };
        }
    },

    async uploadExcel(file) {
        const formData = new FormData();
        formData.append('archivo', file);

        try {
            const response = await fetch(`${API_BASE_URL}/subir-excel`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Error uploading excel:', error);
            return { status: 'error', error: error.message };
        }
    },

    async subirImagenes(files) {
        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('imagenes', file);
        });

        try {
            const response = await fetch(`${API_BASE_URL}/subir-imagenes`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Error uploading images:', error);
            return { status: 'error', error: error.message };
        }
    }
};
