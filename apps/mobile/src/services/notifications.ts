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
// SDK 53 (expo-notifications 0.31): `shouldShowAlert` pasa a estar DEPRECADO y
// son obligatorios `shouldShowBanner` y `shouldShowList`. Equivale a la
// recomendación oficial de Expo para el salto desde SDK 52.
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
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

/**
 * ============================================================
 * TRAMI ESPAÑA - Feedback háptico (v1.3.1)
 * ============================================================
 * Wrapper DEGRADABLE sobre `expo-haptics`. Si el módulo nativo no está
 * disponible (Expo Go, web, tests, binario sin el módulo), TODAS las
 * funciones son no-ops silenciosos: la app nunca falla por una vibración.
 */

type HapticsModule = typeof import('expo-haptics');

let Haptics: HapticsModule | null = null;
try {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  Haptics = require('expo-haptics') as HapticsModule;
} catch {
  // Binario no disponible: no-ops.
}

/** Feedback discreto al marcar/desmarcar un ítem de un checklist. */
export function hapticTick(): void {
  try {
    void Haptics?.selectionAsync();
  } catch {
    // Silencioso.
  }
}

/** Feedback de acción completada (guardar recordatorio, documento...). */
export function hapticSuccess(): void {
  try {
    void Haptics?.notificationAsync(
      Haptics?.NotificationFeedbackType.Success,
    );
  } catch {
    // Silencioso.
  }
}

/** Feedback de error/aviso (validación fallida). */
export function hapticWarning(): void {
  try {
    void Haptics?.notificationAsync(
      Haptics?.NotificationFeedbackType.Warning,
    );
  } catch {
    // Silencioso.
  }
}

/** Impacto ligero al abrir modales o navegar entre secciones. */
export function hapticLight(): void {
  try {
    void Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle.Light);
  } catch {
    // Silencioso.
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
  /** Aviso programado 3 meses antes del vencimiento. */
  threeMonthsBefore: boolean;
  /** Aviso programado 1 mes antes del vencimiento. */
  oneMonthBefore: boolean;
}

/**
 * Programa el conjunto de recordatorios locales de un trámite próximo a
 * vencer: un aviso 24 h antes y otro el día del vencimiento a las 09:00.
 * Los triggers en el pasado se ignoran de forma segura.
 */
export async function scheduleDeadlineNotifications(
  input: DeadlineReminderInput
): Promise<DeadlineScheduleResult> {
  const result: DeadlineScheduleResult = {
    dayBefore: false,
    dayOf: false,
    threeMonthsBefore: false,
    oneMonthBefore: false,
  };
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

  // 3) Anticipos largos (Mi Carpeta): 3 meses y 1 mes antes. Son los que
  //    generan el uso recurrente de la app, ya que dan tiempo real al
  //    usuario para renovar el documento.
  const threeMonths = new Date(deadline.getTime());
  threeMonths.setMonth(threeMonths.getMonth() - 3);
  result.threeMonthsBefore = await scheduleOneShotNotification(
    threeMonths,
    `🗓️ ${input.title} caduca en 3 meses`,
    `Empieza ahora: pide cita previa para la renovación. ${input.title}${notes}`
  );

  const oneMonth = new Date(deadline.getTime());
  oneMonth.setMonth(oneMonth.getMonth() - 1);
  result.oneMonthBefore = await scheduleOneShotNotification(
    oneMonth,
    `⚠️ ${input.title} caduca en 1 mes`,
    `Queda menos de un mes. Comprueba los requisitos y pide cita. ${input.title}${notes}`
  );

  return result;
}

export interface DocumentExpiryInput {
  /** Identificador único del documento. */
  id: string;
  /** Tipo de documento (DNI, Pasaporte, Carnet de conducir, NIE/TIE, Padrón). */
  docType: string;
  /** Fecha de caducidad. */
  expiresAt: Date;
}

/**
 * Programa la cadena completa de avisos de un documento de "Mi Carpeta":
 * 3 meses → 1 mes → 24 h → día del vencimiento. Cada aviso incluye un
 * acceso directo a la cita previa correspondiente.
 *
 * Devuelve cuántos avisos se han programado realmente (los triggers en
 * pasado se omiten de forma segura).
 */
export async function scheduleDocumentExpiryAlerts(
  input: DocumentExpiryInput
): Promise<number> {
  if (!Notifications) return 0;
  const expiresAt = new Date(input.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) return 0;

  const result = await scheduleDeadlineNotifications({
    id: input.id,
    title: input.docType,
    notes: null,
    deadline: expiresAt,
  });

  return [result.threeMonthsBefore, result.oneMonthBefore, result.dayBefore, result.dayOf]
    .filter(Boolean).length;
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

