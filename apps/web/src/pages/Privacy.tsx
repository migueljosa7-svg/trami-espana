import { APP_NAME, LEGAL_DISCLAIMER, PRIVACY_SECTIONS, sanitizeLegalText, LEGAL_PENDING_NOTICE } from '@trami-espana/shared';

export default function Privacy() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Política de Privacidad
                </h1>
                <p className="text-sm text-gray-500 mb-8">
                    Actualizada para la preparación de la publicación del servicio.
                </p>

                <div className="card p-8 space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Introducción
                        </h2>
                        <p className="text-gray-700 mb-4">
                            En {APP_NAME}, nos tomamos muy en serio tu privacidad. Esta política
                            describe cómo recopilamos, utilizamos y protegemos tu información
                            personal, de acuerdo con el Reglamento General de Protección de Datos
                            (RGPD) y la Ley Orgánica 3/2018 de Protección de Datos (LOPDGDD).
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

                    {PRIVACY_SECTIONS.map((section) => (
                        <section key={section.title}>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                {section.title}
                            </h2>
                            <p className="text-gray-700 whitespace-pre-line">
                                {sanitizeLegalText(section.body)}
                            </p>
                        </section>
                    ))}

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Contacto
                        </h2>
                        <p className="text-gray-700">
                            Si tienes preguntas sobre esta política o deseas ejercer tus derechos,
                            puedes contactarnos a través de la página de contacto.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}