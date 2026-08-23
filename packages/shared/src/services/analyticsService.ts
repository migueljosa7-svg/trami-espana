export interface AnalyticsEvent {
    name: string;
    properties?: Record<string, unknown>;
    timestamp: string;
}

export class AnalyticsService {
    private enabled: boolean = true;
    private events: AnalyticsEvent[] = [];

    constructor() {
        // En un entorno de producción real, aquí se inicializaría
        // un proveedor de analítica respetuoso con la privacidad (ej. Plausible, Matomo, PostHog auto-alojado)
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    public trackEvent(name: string, properties?: Record<string, unknown>): void {
        if (!this.enabled) return;

        const event: AnalyticsEvent = {
            name,
            properties,
            timestamp: new Date().toISOString()
        };

        this.events.push(event);

        // En producción no se deben emitir logs a consola.
        // La integración real con un proveedor de analítica (p.ej. Plausible,
        // Matomo, PostHog auto-alojado) quedará pendiente para la fase de
        // instrumentación real. No usar console.log como analytics.
    }

    public trackPageView(path: string, title?: string): void {
        this.trackEvent('page_view', { path, title });
    }

    public trackProcedureView(procedureSlug: string, procedureTitle: string): void {
        this.trackEvent('procedure_view', { procedureSlug, procedureTitle });
    }

    public trackSearch(query: string, resultCount: number): void {
        this.trackEvent('search', { query, resultCount });
    }

    public trackAssistantQuery(query: string): void {
        this.trackEvent('assistant_query', { queryLength: query.length });
    }

    public trackFavoriteToggle(procedureSlug: string, isFavorite: boolean): void {
        this.trackEvent('favorite_toggle', { procedureSlug, isFavorite });
    }

    public trackReminderCreated(procedureSlug: string, reminderType: string): void {
        this.trackEvent('reminder_created', { procedureSlug, reminderType });
    }

    public getRecordedEvents(): AnalyticsEvent[] {
        return [...this.events];
    }
}

export const analyticsService = new AnalyticsService();



