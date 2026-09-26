import { describe, it, expect } from 'vitest';
import { calcProgressPercent } from '../../utils';

/**
 * ============================================================
 * Cálculo dinámico de progreso de trámites (v1.3.1)
 * ============================================================
 * Regresión del bug reportado: "si hay N trámites y se completan todos,
 * marca 60% en lugar de 100%".
 *
 * La fórmula DEBE ser dinámica respecto a la lista activa:
 *   total > 0 ? Math.round((completados / total) * 100) : 0
 */
describe('calcProgressPercent', () => {
    describe('casos límite (requisitos funcionales)', () => {
        it('devuelve 0 cuando la lista está vacía (total = 0)', () => {
            expect(calcProgressPercent(0, 0)).toBe(0);
            expect(calcProgressPercent(5, 0)).toBe(0);
        });

        it('devuelve 0 cuando no hay nada completado', () => {
            expect(calcProgressPercent(0, 1)).toBe(0);
            expect(calcProgressPercent(0, 10)).toBe(0);
            expect(calcProgressPercent(0, 77)).toBe(0);
        });

        it('devuelve SIEMPRE 100 cuando están todos completados', () => {
            // Este es el caso exacto del bug reportado.
            for (const total of [1, 2, 3, 5, 6, 7, 10, 12, 25, 77, 100]) {
                expect(calcProgressPercent(total, total)).toBe(100);
            }
        });

        it('nunca devuelve NaN ni Infinity', () => {
            expect(calcProgressPercent(0, 0)).not.toBeNaN();
            expect(calcProgressPercent(0, 0)).not.toBe(Infinity);
            expect(Number.isFinite(calcProgressPercent(0, 0))).toBe(true);
        });
    });

    describe('valores intermedios: la proporción exacta', () => {
        it('calcula la proporción exacta sobre la lista activa', () => {
            expect(calcProgressPercent(1, 2)).toBe(50);
            expect(calcProgressPercent(1, 3)).toBe(33);
            expect(calcProgressPercent(2, 3)).toBe(67);
            expect(calcProgressPercent(3, 4)).toBe(75);
            expect(calcProgressPercent(1, 4)).toBe(25);
            expect(calcProgressPercent(6, 8)).toBe(75);
        });

        it('escala correctamente con cualquier tamaño de lista', () => {
            // El porcentaje NO depende del tamaño absoluto, solo de la proporción.
            expect(calcProgressPercent(3, 12)).toBe(calcProgressPercent(1, 4));
            expect(calcProgressPercent(30, 120)).toBe(calcProgressPercent(1, 4));
        });

        it('redondea al entero más cercano', () => {
            // 2/3 = 66.67 -> 67
            expect(calcProgressPercent(2, 3)).toBe(67);
            // 1/6 = 16.67 -> 17
            expect(calcProgressPercent(1, 6)).toBe(17);
            // 5/6 = 83.33 -> 83
            expect(calcProgressPercent(5, 6)).toBe(83);
        });
    });

    describe('robustez frente a entradas inválidas', () => {
        it('satura cuando completados supera el total', () => {
            // Evita barras de progreso rotas (p. ej. 150%).
            expect(calcProgressPercent(15, 10)).toBe(100);
            expect(calcProgressPercent(1000, 1)).toBe(100);
        });

        it('devuelve 0 con valores negativos', () => {
            expect(calcProgressPercent(-5, 10)).toBe(0);
            expect(calcProgressPercent(0, -10)).toBe(0);
            expect(calcProgressPercent(-1, -1)).toBe(0);
        });

        it('devuelve 0 con valores no finitos (NaN, Infinity)', () => {
            // Un valor no finito es entrada corrupta: se trata como
            // "desconocido" y se devuelve 0 (nunca NaN ni barra rota).
            expect(calcProgressPercent(Number.NaN, 10)).toBe(0);
            expect(calcProgressPercent(5, Number.NaN)).toBe(0);
            expect(calcProgressPercent(Number.POSITIVE_INFINITY, 10)).toBe(0);
            expect(calcProgressPercent(5, Number.POSITIVE_INFINITY)).toBe(0);
        });

        it('acepta decimales en el total sin romper el resultado', () => {
            // Un total fraccionario no debe producir 0 ni NaN.
            const result = calcProgressPercent(1, 2.5);
            expect(Number.isInteger(result)).toBe(true);
            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThanOrEqual(100);
        });
    });

    describe('escenario real: trámite con requisitos + documentos + pasos', () => {
        it('llega al 100% con la lista real de un trámite', () => {
            // Caso reportado: 4 requisitos + 4 documentos + 4 pasos = 12 ítems.
            const requisitos = 4;
            const documentos = 4;
            const pasos = 4;
            const total = requisitos + documentos + pasos;

            expect(calcProgressPercent(0, total)).toBe(0);
            expect(calcProgressPercent(6, total)).toBe(50);
            expect(calcProgressPercent(12, total)).toBe(100);
        });

        it('mantiene la proporción al añadir y quitar ítems de la lista', () => {
            // La lista cambia de tamaño entre renders: el porcentaje debe
            // seguir reflejando exactamente la proporción actual.
            expect(calcProgressPercent(1, 2)).toBe(50);
            // Se añade un requisito más sin marcarlo.
            expect(calcProgressPercent(1, 3)).toBe(33);
            // Se marca el nuevo -> vuelve al 50%.
            expect(calcProgressPercent(2, 3)).toBe(67);
            expect(calcProgressPercent(3, 3)).toBe(100);
        });
    });
});
