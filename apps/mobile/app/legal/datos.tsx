import { LEGAL_DISCLAIMER } from '@trami-espana/shared';
import LegalScreen from '../../components/LegalScreen';

export default function DatosScreen() {
    return (
        <LegalScreen
            title="Datos y privacidad"
            subtitle="Qué información guarda la aplicación y cómo la usamos."
            footer={LEGAL_DISCLAIMER}
            sections={[
                {
                    title: 'Datos que guardamos',
                    body:
                        'Solo tratamos los datos necesarios para el funcionamiento del servicio: tu correo ' +
                        'electrónico (al crear cuenta), tu nombre opcional, tus favoritos, tus recordatorios ' +
                        'y las conversaciones con el asistente.',
                },
                {
                    title: 'Datos que NO recopilamos',
                    body:
                        'No recopilamos ubicación, contactos, fotos, cámara, ni otros datos del dispositivo. ' +
                        'No usamos publicidad ni identificadores de publicidad.',
                },
                {
                    title: 'Almacenamiento y autenticación',
                    body:
                        'La autenticación y el almacenamiento de datos utilizan Supabase. Tu sesión y ' +
                        'preferencias se conservan en el almacenamiento local de tu dispositivo.',
                },
                {
                    title: 'Asistente de IA',
                    body:
                        'Las consultas que haces al asistente se guardan asociadas a tu cuenta. Evita incluir ' +
                        'datos personales sensibles innecesarios en tus consultas.',
                },
                {
                    title: 'Tus derechos',
                    body:
                        'Puedes acceder, rectificar, exportar o eliminar tus datos. Puedes eliminar tu cuenta ' +
                        'desde Perfil → Ajustes → Eliminar cuenta, o solicitarlo por correo.',
                },
            ]}
        />
    );
}
