import { APP_NAME, COOKIE_TECHNOLOGIES } from '@trami-espana/shared';

export default function Cookies() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-8">
                    Política de Cookies y Tecnologías de Almacenamiento
                </h1>

                <div className="card p-8 space-y-6">
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            1. ¿Qué son las cookies y el almacenamiento local?
                        </h2>
                        <p className="text-gray-700">
                            Las cookies son pequeños archivos de texto que se almacenan en tu
                            dispositivo al visitar un sitio web. Además, las aplicaciones web y
                            móviles pueden usar otros mecanismos de almacenamiento local
                            (localStorage / sessionStorage) que cumplen funciones similares de
                            mantener la sesión y las preferencias.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            2. Uso en {APP_NAME}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {APP_NAME} <strong>no utiliza cookies de marketing, publicidad ni
                            trackers de terceros</strong>. Solo empleamos tecnologías técnicas
                            necesarias para el funcionamiento del servicio.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            3. Tecnologías utilizadas
                        </h2>
                        <ul className="space-y-3">
                            {COOKIE_TECHNOLOGIES.map((t) => (
                                <li key={t.type} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <strong className="text-gray-900">{t.type}</strong>
                                        <span className={`text-xs px-2 py-1 rounded-full ${t.essential ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                            {t.essential ? 'Esencial' : t.tracker ? 'No esencial' : 'No utilizado'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">{t.described}</p>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            4. No se utilizan cookies no esenciales
                        </h2>
                        <p className="text-gray-700">
                            Dado que no hay análisis, publicidad ni tracking de terceros, no es
                            necesario mostrar un banner de consentimiento de cookies. La
                            información se conserva únicamente mientras se usa la aplicación.
                            No vendemos ni compartimos tus datos con anunciantes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            5. En la app móvil
                        </h2>
                        <p className="text-gray-700">
                            En la aplicación móvil usamos almacenamiento local para la sesión y
                            preferencias. No usamos identificadores de publicidad ni SDKs de
                            terceros de tracking.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            6. Gestión
                        </h2>
                        <p className="text-gray-700">
                            Puedes borrar el almacenamiento local desde los ajustes de tu
                            navegador o dispositivo. Al hacerlo, puede ser necesario iniciar
                            sesión de nuevo.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}