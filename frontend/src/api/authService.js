import { studioRequest } from './httpClient';

// Registrar una cuenta de Cliente.
export async function registerCustomer(customerData) {
    return studioRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(customerData)
    });
}

// Iniciar sesión como Cliente o Administrador.
export async function loginUser(email, password) {
    return studioRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email,
            password
        })
    });
}

// Consultar la información del usuario autenticado.
export async function getCurrentUser(token) {
    return studioRequest(
        '/api/auth/me',
        { method: 'GET' },
        token
    );
}

// Cambiar la contraseña del usuario autenticado.
export async function changePassword(
    token,
    currentPassword,
    newPassword
) {
    return studioRequest(
        '/api/auth/change-password',
        {
            method: 'POST',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        },
        token
    );
}