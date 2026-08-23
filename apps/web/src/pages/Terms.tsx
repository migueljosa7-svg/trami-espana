import { APP_NAME, LEGAL_DISCLAIMER, TERMS_SECTIONS, ASSISTANT_DISCLAIMER, sanitizeLegalText, LEGAL_PENDING_NOTICE } from '@trami-espana/shared';

export default function Terms() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Términos y Condiciones
                </h1>
                <p className="text-sm text-gray-500 mb-8">
                    Condiciones de uso del servicio Trami España.
                </p>

                <div className="card p-8 space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Aceptación de los términos
                        </h2>
                        <p className="text-gray-700 mb-4">
                            Al acceder y utilizar {APP_NAME}, aceptas estar sujeto a estos
                            términos y condiciones de uso.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                            <p className="text-sm text-blue-800">
                                {LEGAL_DISCLAIMER}
                            </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-4">
                            {LEGAL_PENDING_NOTICE}
                        </p>
                    </section>

                    {TERMS_SECTIONS.map((section) => (
                        <section key={section.title}>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                {section.title}
                            </h2>
                            <p className="text-gray-700 whitespace-pre-line">
                                {sanitizeLegalText(section.body)}
                            </p>
                        </section>
                    ))}

                    <section className="bg-amber-50 border-l-4 border-amber-400 p-4">
                        <h2 className="text-lg font-semibold text-amber-900 mb-2">
                            Sobre el asistente de IA
                        </h2>
                        <p className="text-sm text-amber-900 whitespace-pre-line">
                            {ASSISTANT_DISCLAIMER}
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}