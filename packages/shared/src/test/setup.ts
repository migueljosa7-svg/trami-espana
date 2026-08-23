// ===========================================
// TRAMI ESPAÑA - Setup de Tests
// ===========================================
// Configuración global para tests

import '@testing-library/jest-dom';
import { beforeAll, afterAll } from 'vitest';

// Mock de console.error para tests
const originalError = console.error;
beforeAll(() => {
    console.error = (...args: unknown[]) => {
        // Silenciar errores de Supabase en tests
        if (typeof args[0] === 'string' && args[0].includes('supabase')) {
            return;
        }
        originalError.call(console, ...args);
    };
});

afterAll(() => {
    console.error = originalError;
});
