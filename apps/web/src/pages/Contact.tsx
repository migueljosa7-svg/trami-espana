import { useState } from 'react';
import { Mail, AlertTriangle, ExternalLink } from 'lucide-react';
import { LEGAL_EMAIL_CONTACT, LEGAL_EMAIL_UNVERIFIED_NOTICE } from '@trami-espana/shared';

export default function Contact() {
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name || !formData.email || !formData.message) {
            setError('Por favor, completa todos los campos.');
            return;
        }

        if (formData.message.length < 10) {
            setError('El mensaje debe tener al menos 10 caracteres.');
            return;
        }

        // Creamos un enlace mailto con los datos del formulario. Así se abre el
        // cliente de correo del usuario sin necesidad de un backend de mensajería.
        const subject = encodeURIComponent(`Contacto desde Trami España — ${formData.name}`);
        const body = encodeURIComponent(
            `Nombre: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`
        );
        window.location.href = `mailto:${LEGAL_EMAIL_CONTACT}?subject=${subject}&body=${body}`;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Contacto
                </h1>
                <p className="text-sm text-gray-500 mb-8">
                    ¿Tienes preguntas, sugerencias o necesitas ayuda? Estamos aquí para ayudarte.
                </p>

                <div className="card p-8">
                    <div className="mb-8 space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600 flex-shrink-0">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Correo de contacto</p>
                                <a
                                    href={`mailto:${LEGAL_EMAIL_CONTACT}`}
                                    className="text-blue-700 hover:underline text-sm inline-flex items-center gap-1"
                                >
                                    {LEGAL_EMAIL_CONTACT}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800">
                                {LEGAL_EMAIL_UNVERIFIED_NOTICE}
                            </p>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Envíanos un mensaje
                        </h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Rellena el formulario y se abrirá tu aplicación de correo con el mensaje
                            preparado. Te responderemos en cuanto podamos.
                        </p>

                        {error && (
                            <div className="p-4 rounded-lg mb-6 bg-red-50 border border-red-200 text-red-800">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="label">Nombre</label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    className="input"
                                    placeholder="Tu nombre"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="label">Email</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    className="input"
                                    placeholder="tu@email.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="label">Mensaje</label>
                                <textarea
                                    id="message"
                                    name="message"
                                    className="input min-h-[120px]"
                                    placeholder="Tu mensaje..."
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    minLength={10}
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn-primary btn-md"
                            >
                                Abrir mi correo con el mensaje
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

