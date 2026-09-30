import { describe, it, expect } from 'vitest';
import {
    LEGAL_EMAIL_CONTACT,
    LEGAL_CONTACT_NOTICE,
    LEGAL_EMAIL_UNVERIFIED_NOTICE,
    PRIVACY_SECTIONS,
    TERMS_SECTIONS,
} from '../../legal';

/**
 * ============================================================
 * Sincronización del correo oficial de contacto (v1.3.3)
 * ============================================================
 * El correo de contacto se sincronizó al oficial
 * (`tramiespana.app@gmail.com`) sustituyendo al provisional
 * `contacto@tramiespana.es`, cuyo dominio nunca estuvo operativo.
 *
 * Estos tests actúan como RED DE SEGURIDAD: `LEGAL_EMAIL_CONTACT` es la fuente
 * única de verdad que consumen tanto el móvil (`legal/contacto.tsx`) como la
 * web (`pages/Contact.tsx`) y los textos legales. Cualquier reintroducción de
 * una dirección vieja rompe el build antes de llegar a producción.
 */
describe('correo oficial de contacto', () => {
    it('es exactamente el correo oficial verificado', () => {
        expect(LEGAL_EMAIL_CONTACT).toBe('tramiespana.app@gmail.com');
    });

    it('no conserva ninguna dirección antigua o de prueba', () => {
        // Dominio que nunca estuvo operativo.
        expect(LEGAL_EMAIL_CONTACT).not.toContain('tramiespana.es');
        // Direcciones de desarrollo/prueba que no deben llegar a producción.
        expect(LEGAL_EMAIL_CONTACT).not.toContain('migueljosa7');
        expect(LEGAL_EMAIL_CONTACT).not.toContain('@test.com');
        expect(LEGAL_EMAIL_CONTACT).not.toContain('example.com');
    });

    it('cumple el formato de una dirección de email válida', () => {
        expect(LEGAL_EMAIL_CONTACT).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('el aviso de contacto ya no declara el correo como provisional', () => {
        // El aviso anterior decía "es provisional y debe verificarse", lo cual
        // era incorrecto para una app ya publicada en Google Play.
        expect(LEGAL_CONTACT_NOTICE).not.toContain('provisional');
        expect(LEGAL_CONTACT_NOTICE).not.toContain('verificarse antes');
        expect(LEGAL_CONTACT_NOTICE).not.toContain('dominio definitivo');
        // El alias histórico apunta al mismo texto actualizado.
        expect(LEGAL_EMAIL_UNVERIFIED_NOTICE).toBe(LEGAL_CONTACT_NOTICE);
    });

    it('los textos legales de privacidad y términos citan el correo oficial', () => {
        const privacidadContacto = PRIVACY_SECTIONS.find((s) => s.title.includes('Contacto'));
        const terminosContacto = TERMS_SECTIONS.find((s) => s.title.includes('Contacto'));

        expect(privacidadContacto).toBeDefined();
        expect(terminosContacto).toBeDefined();
        expect(privacidadContacto?.body).toContain(LEGAL_EMAIL_CONTACT);
        expect(terminosContacto?.body).toContain(LEGAL_EMAIL_CONTACT);
    });

    it('ninguna sección legal reintroduce el dominio antiguo', () => {
        const todos = [
            ...PRIVACY_SECTIONS.map((s) => s.body),
            ...TERMS_SECTIONS.map((s) => s.body),
        ];
        for (const body of todos) {
            expect(body).not.toContain('tramiespana.es');
        }
    });
});
