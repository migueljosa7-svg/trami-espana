import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    reminderService,
    ReminderServiceError,
    procedureService,
    ProcedureServiceError
} from '@trami-espana/shared';
import type { ReminderWithProcedure, ProcedureWithDetails } from '@trami-espana/shared';

export default function Reminders() {
    const [reminders, setReminders] = useState<ReminderWithProcedure[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingReminder, setEditingReminder] = useState<ReminderWithProcedure | null>(null);
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [reminderDate, setReminderDate] = useState('');
    const [procedureId, setProcedureId] = useState('');
    const [procedures, setProcedures] = useState<ProcedureWithDetails[]>([]);

    // Redirigir si no está autenticado (esperando a que la sesión cargue
    // para no redirigir a un usuario ya autenticado que recarga la página)
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login', { state: { from: { pathname: '/recordatorios' } } });
        }
    }, [user, authLoading, navigate]);

    // Cargar recordatorios
    useEffect(() => {
        if (!user) return;

        const loadReminders = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await reminderService.getReminders();
                setReminders(data);
            } catch (err) {
                if (err instanceof ReminderServiceError) {
                    setError(err.message);
                } else {
                    setError('Error al cargar los recordatorios');
                }
            } finally {
                setLoading(false);
            }
        };

        loadReminders();
    }, [user]);

    // Cargar trámites publicados cuando se abre el formulario (para el selector)
    useEffect(() => {
        if (!showForm) return;

        const loadProcedures = async () => {
            try {
                const response = await procedureService.getProcedures({ limit: 100 });
                setProcedures(response.data || []);
            } catch (err) {
                if (err instanceof ProcedureServiceError) {
                    setError(err.message);
                }
            }
        };

        loadProcedures();
    }, [showForm]);

    // filteredProcedures se calcula a partir de procedureSearch para el selector
    // Nota: el filtrado se aplica directamente en el render del selector.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setLoading(true);

            if (editingReminder) {
                // Actualizar recordatorio existente
                const result = await reminderService.updateReminder(editingReminder.id, {
                    title,
                    description: description || undefined,
                    reminder_date: new Date(reminderDate).toISOString()
                });

                if (result) {
                    setReminders(reminders.map(r => r.id === editingReminder.id ? result : r));
                    resetForm();
                }
            } else {
                // Crear nuevo recordatorio
                const result = await reminderService.createReminder({
                    procedure_id: procedureId,
                    title,
                    description: description || undefined,
                    reminder_date: new Date(reminderDate).toISOString()
                });

                if (result) {
                    setReminders([result, ...reminders]);
                    resetForm();
                }
            }
        } catch (err) {
            setError('Error al guardar el recordatorio');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (reminder: ReminderWithProcedure) => {
        setEditingReminder(reminder);
        setTitle(reminder.title);
        setDescription(reminder.description || '');
        const date = new Date(reminder.reminder_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        setReminderDate(`${year}-${month}-${day}T${hours}:${minutes}`);
        setProcedureId(reminder.procedure_id ?? '');
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este recordatorio?')) {
            return;
        }

        try {
            const result = await reminderService.deleteReminder(id);
            if (result.success) {
                setReminders(reminders.filter(r => r.id !== id));
            } else {
                setError('Error al eliminar el recordatorio');
            }
        } catch (err) {
            setError('Error al eliminar el recordatorio');
        }
    };

    const handleComplete = async (id: string) => {
        try {
            const result = await reminderService.completeReminder(id);
            if (result.success) {
                setReminders(reminders.map(r =>
                    r.id === id ? { ...r, is_completed: true } : r
                ));
            } else {
                setError('Error al completar el recordatorio');
            }
        } catch (err) {
            setError('Error al completar el recordatorio');
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setReminderDate('');
        setProcedureId('');
        setShowForm(false);
        setEditingReminder(null);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Mis recordatorios
                    </h1>
                    <p className="text-xl text-gray-600 mb-6">
                        Gestiona tus recordatorios de trámites
                    </p>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="btn-primary btn-md"
                        >
                            + Nuevo recordatorio
                        </button>
                    )}
                </div>

                {/* Formulario */}
                {showForm && (
                    <div className="max-w-2xl mx-auto mb-12">
                        <div className="card p-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                                {editingReminder ? 'Editar recordatorio' : 'Nuevo recordatorio'}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="title" className="label">
                                        Título
                                    </label>
                                    <input
                                        id="title"
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="input"
                                        placeholder="Ej: Revisar documentación"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="description" className="label">
                                        Descripción (opcional)
                                    </label>
                                    <textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="input"
                                        rows={3}
                                        placeholder="Detalles adicionales..."
                                    />
                                </div>

                                <div>
                                    <label htmlFor="reminderDate" className="label">
                                        Fecha y hora
                                    </label>
                                    <input
                                        id="reminderDate"
                                        type="datetime-local"
                                        value={reminderDate}
                                        onChange={(e) => setReminderDate(e.target.value)}
                                        className="input"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="procedureId" className="label">
                                        Trámite relacionado
                                    </label>
                                    <select
                                        id="procedureId"
                                        value={procedureId}
                                        onChange={(e) => setProcedureId(e.target.value)}
                                        className="input"
                                        required
                                    >
                                        <option value="">Selecciona un trámite</option>
                                        {procedures.map((procedure) => (
                                            <option key={procedure.id} value={procedure.id}>
                                                {procedure.title}
                                            </option>
                                        ))}
                                    </select>
                                    {procedures.length === 0 && showForm && (
                                        <p className="text-sm text-gray-500 mt-1">
                                            No hay trámites publicados disponibles.
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary btn-md flex-1 disabled:opacity-50"
                                    >
                                        {loading ? 'Guardando...' :
                                            editingReminder ? 'Actualizar' : 'Crear recordatorio'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="btn-outline btn-md"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && !showForm && (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-primary"></div>
                        <p className="text-gray-500 mt-4">Cargando recordatorios...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                            <p className="text-red-800 mb-4">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="btn-primary btn-md"
                            >
                                Reintentar
                            </button>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && reminders.length === 0 && !showForm && (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🔔</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No tienes recordatorios
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Crea recordatorios para no olvidar tus trámites importantes
                        </p>
                    </div>
                )}

                {/* Listado de recordatorios */}
                {!loading && !error && reminders.length > 0 && !showForm && (
                    <div className="space-y-4">
                        {reminders.map((reminder) => (
                            <div
                                key={reminder.id}
                                className={`card p-6 ${reminder.is_completed ? 'opacity-60' : ''}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {reminder.title}
                                            </h3>
                                            {reminder.is_completed && (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                                    Completado
                                                </span>
                                            )}
                                        </div>

                                        {reminder.description && (
                                            <p className="text-gray-600 text-sm mb-2">
                                                {reminder.description}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span>📅 {formatDate(reminder.reminder_date)}</span>
                                            {reminder.procedure && (
                                                <Link
                                                    to={`/tramites/${reminder.procedure.slug}`}
                                                    className="text-primary hover:underline"
                                                >
                                                    {reminder.procedure.title.replace('[DEMO] ', '')}
                                                </Link>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 ml-4">
                                        {!reminder.is_completed && (
                                            <>
                                                <button
                                                    onClick={() => handleComplete(reminder.id)}
                                                    className="text-green-600 hover:text-green-700"
                                                    title="Marcar como completado"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(reminder)}
                                                    className="text-blue-600 hover:text-blue-700"
                                                    title="Editar"
                                                >
                                                    ✏️
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleDelete(reminder.id)}
                                            className="text-red-600 hover:text-red-700"
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
