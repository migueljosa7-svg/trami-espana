import { describe, it, expect } from 'vitest';
import { AnalyticsService } from '../analyticsService';

describe('AnalyticsService', () => {
    it('debe registrar eventos cuando está habilitado', () => {
        const analytics = new AnalyticsService();
        analytics.trackPageView('/tramites', 'Listado de trámites');

        const events = analytics.getRecordedEvents();
        expect(events.length).toBe(1);
        expect(events[0].name).toBe('page_view');
        expect(events[0].properties).toEqual({ path: '/tramites', title: 'Listado de trámites' });
    });

    it('no debe registrar eventos cuando está deshabilitado', () => {
        const analytics = new AnalyticsService();
        analytics.setEnabled(false);
        analytics.trackSearch('DNI', 5);

        const events = analytics.getRecordedEvents();
        expect(events.length).toBe(0);
    });

    it('debe registrar búsquedas y vistas de trámites', () => {
        const analytics = new AnalyticsService();
        analytics.trackSearch('Empadronamiento', 3);
        analytics.trackProcedureView('renovacion-dni', 'Renovación del DNI');

        const events = analytics.getRecordedEvents();
        expect(events.length).toBe(2);
        expect(events[0].name).toBe('search');
        expect(events[1].name).toBe('procedure_view');
    });
});
