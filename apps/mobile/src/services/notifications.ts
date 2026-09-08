// ===========================================
// TRAMI ESPAÑA - Notificaciones locales (Expo Notifications)
// ===========================================
// Servicio centralizado para programar recordatorios locales de trámites
// próximos a vencer. Se usan triggers locales (sin push remoto):
//  - Notificación 24 h antes de la fecha límite ("vence pronto").
//  - Notificación el día del vencimiento.
//
// El módulo se importa de forma diferida (require en try/catch) para que
// la app nunca falle si el binario nativo no está disponible.

import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

let Notifications: NotificationsModule | null = null;
try {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  Notifications = require('expo-notifications') as NotificationsModule;
} catch {
  // Binario no disponible: el resto de funciones se degradan a no-op.
}

// Tipos derivados del módulo (compatibles con SDK 50).
type NotificationTriggerInput = NonNullable<
  Parameters<NotificationsModule['scheduleNotificationAsync']>[0]
>['trigger'];

const ANDROID_CHANNEL_ID = 'trami-reminders';

// Handler global: muestra la notificación incluso en primer plano.
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // Silencioso.
  }
}

/** Crea el canal de Android (necesario desde Android 8+). */
async function ensureAndroidChannel(): Promise<void> {
  if (!Notifications || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Recordatorios de trámites',
      description: 'Avisos de fechas límite y vencimientos de tus trámites',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch {
    // Silencioso: sin canal la notificación usará el canal por defecto.
  }
}

/** Solicita permiso de notificaciones. Devuelve true si fue concedido. */
export async function ensureNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    if (current.status === 'undetermined' || current.canAskAgain) {
      const request = await Notifications.requestPermissionsAsync();
      return request.status === 'granted';
    }
    return false;
  } catch {
    return false;
  }
}

/** Cancela TODAS las notificaciones programadas de la app. */
export async function cancelAllScheduledNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Silencioso.
  }
}

/** Programa una notificación puntual en una fecha concreta. */
export async function scheduleOneShotNotification(
  date: Date,
  title: string,
  body: string
): Promise<boolean> {
  if (!Notifications) return false;
  const millis = date.getTime() - Date.now();
  if (millis <= 0) return false;
  try {
    await ensureAndroidChannel();
    const trigger: NotificationTriggerInput = {
      seconds: Math.max(1, Math.floor(millis / 1000)),
      repeats: false,
    } as NotificationTriggerInput;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger,
    });
    return true;
  } catch {
    return false;
  }
}

export interface DeadlineReminderInput {
  /** Identificador único del recordatorio (para logs). */
  id: string;
  /** Nombre del trámite o título del recordatorio. */
  title: string;
  /** Notas adicionales del recordatorio. */
  notes?: string | null;
  /** Fecha límite de vencimiento. */
  deadline: Date;
}

export interface DeadlineScheduleResult {
  /** Notificación programada 24 h antes del vencimiento. */
  dayBefore: boolean;
  /** Notificación programada el día del vencimiento (a las 09:00). */
  dayOf: boolean;
}

/**
 * Programa el conjunto de recordatorios locales de un trámite próximo a
 * vencer: un aviso 24 h antes y otro el día del vencimiento a las 09:00.
 * Los triggers en el pasado se ignoran de forma segura.
 */
export async function scheduleDeadlineNotifications(
  input: DeadlineReminderInput
): Promise<DeadlineScheduleResult> {
  const result: DeadlineScheduleResult = { dayBefore: false, dayOf: false };
  if (!Notifications) return result;

  const deadline = new Date(input.deadline);
  if (Number.isNaN(deadline.getTime())) return result;

  const notes = input.notes ? ` — ${input.notes}` : '';

  // 1) Aviso 24 h antes ("próximo a vencer").
  const dayBefore = new Date(deadline.getTime() - 24 * 60 * 60 * 1000);
  result.dayBefore = await scheduleOneShotNotification(
    dayBefore,
    '⏰ Tu trámite vence mañana',
    `${input.title}${notes || ` vence el ${deadline.toLocaleDateString('es-ES')}`}`
  );

  // 2) Aviso el día del vencimiento a las 09:00 locales.
  const dayOf = new Date(deadline);
  dayOf.setHours(9, 0, 0, 0);
  result.dayOf = await scheduleOneShotNotification(
    dayOf,
    `📌 Vence hoy: ${input.title}`,
    `Hoy es la fecha límite${notes}. No lo dejes para el último momento.`
  );

  return result;
}

/**
 * Re-programa los recordatorios de una lista completa (p. ej. al abrir
 * la pantalla de recordatorios): cancela todo y vuelve a programar los
 * NO completados cuya fecha esté en el futuro. Devuelve cuántos avisos
 * se han programado.
 */
export async function syncUpcomingDeadlineNotifications(
  reminders: Array<{
    id: string;
    title: string;
    description?: string | null;
    reminder_date: string;
    is_completed: boolean;
  }>
): Promise<number> {
  if (!Notifications) return 0;
  await cancelAllScheduledNotifications();
  let scheduled = 0;
  const now = Date.now();
  for (const reminder of reminders) {
    if (reminder.is_completed) continue;
    const deadline = new Date(reminder.reminder_date);
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= now) continue;
    const result = await scheduleDeadlineNotifications({
      id: reminder.id,
      title: reminder.title,
      notes: reminder.description ?? null,
      deadline,
    });
    if (result.dayBefore) scheduled += 1;
    if (result.dayOf) scheduled += 1;
  }
  return scheduled;
}

