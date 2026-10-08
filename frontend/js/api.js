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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, password })
            });
            const data = await response.json();
            if (!response.ok) {
                return { status: 'error', error: data.error, attempts_left: data.attempts_left, locked: data.locked };
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
                let errorData = null;
                try {
                    errorData = await response.json();
                } catch (e) { }
                throw new Error((errorData && errorData.error) ? errorData.error : 'Ocurrió un error al cargar el catálogo');
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
        Array.from(files).forEach(file => formData.append('imagenes', file));
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
    },

    async calcularDespiece(data) {
        try {
            const response = await fetch(`${API_BASE_URL}/despiece`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error('Error calculando despiece:', error);
            return { status: 'error', error: error.message };
        }
    },

    async crearSolicitud(datos) {
        try {
            const response = await fetch(`${API_BASE_URL}/solicitudes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            return await response.json();
        } catch (error) {
            console.error('Error creando solicitud:', error);
            return { status: 'error', error: error.message };
        }
    },

    async limpiarBaseDatos() {
        try {
            const response = await fetch(`${API_BASE_URL}/muebles/limpiar`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Error limpiando base de datos:', error);
            return { status: 'error', error: error.message };
        }
    },

    async getDestacados() {
        try {
            const response = await fetch(`${API_BASE_URL}/muebles/destacados`);
            if (!response.ok) {
                let errorData = null;
                try {
                    errorData = await response.json();
                } catch (e) { }
                throw new Error((errorData && errorData.error) ? errorData.error : 'Ocurrió un error al cargar los destacados');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching destacados:', error);
            return { error: true, message: error.message };
        }
    },

    // ==========================
    // MUEBLES PROPIOS
    // ==========================
    async getCategoriasPropias() {
        try {
            const response = await fetch(`${API_BASE_URL}/categorias-propias`);
            if (!response.ok) throw new Error('Error al cargar categorías');
            return await response.json();
        } catch (error) {
            console.error(error);
            return { error: true, message: error.message };
        }
    },

    async createCategoriaPropia(nombre) {
        try {
            const response = await fetch(`${API_BASE_URL}/categorias-propias`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
                body: JSON.stringify({ nombre })
            });
            return await response.json();
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    },

    async deleteCategoriaPropia(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/categorias-propias/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    },

    async getMueblesPropios(activosSolo = true) {
        try {
            const query = activosSolo ? '' : '?activos=false';
            const response = await fetch(`${API_BASE_URL}/muebles-propios${query}`, {
                headers: this.getAuthHeaders()
            });
            if (!response.ok) throw new Error('Error al cargar muebles propios');
            return await response.json();
        } catch (error) {
            console.error(error);
            return { error: true, message: error.message };
        }
    },

    async createMueblePropio(data) {
        try {
            const response = await fetch(`${API_BASE_URL}/muebles-propios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    },

    async updateMueblePropio(id, data) {
        try {
            const response = await fetch(`${API_BASE_URL}/muebles-propios/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    },

    async deleteMueblePropio(id, fisico = false) {
        try {
            const response = await fetch(`${API_BASE_URL}/muebles-propios/${id}${fisico ? '?fisico=true' : ''}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    }

};