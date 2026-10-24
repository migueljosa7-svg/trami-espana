/**
 * ============================================================
 * KILLER FEATURE (v1.5.0) - Teléfonos Oficiales y Urgencias
 * ============================================================
 * Tarjetas elevadas institucionales con acceso directo (un toque) a los
 * teléfonos de información de los organismos públicos españoles.
 *
 * RIGUROSIDAD DE FUENTES (verificado en los portales oficiales):
 * - 060: NO es gratuito. Resolución 30/11/2011 (BOE 16/12/2011), modificada
 *   por la de 27/07/2023: cada llamada tiene coste fijo de UNA llamada de
 *   1 minuto. Etiquetado honestamente.
 * - 020 (IMV, INSS): teléfono SIN coste para el usuario (seg-social.es).
 * - 91 542 11 76 (INSS): tarifa local/interprovincial según operador.
 * - 91 926 79 70 (cita previa SEPE): línea ordinaria (sepe.es).
 * - 091 (Policía Nacional): atención al ciudadano (DNI/NIE, denuncias).
 *
 * `tel:` abre el discador del sistema con el número limpio (sin espacios).
 * ============================================================
 */
import { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, createThemedStyles } from '../constants/theme';

interface OfficialPhone {
  id: string;
  title: string;
  subtitle: string;
  /** Número visible para el usuario (con espacios legibles). */
  number: string;
  /** Nombre del icono Ionicons. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Nota honesta sobre coste/horario (transparencia Google Policy). */
  note: string;
}

const OFFICIAL_PHONES: readonly OfficialPhone[] = [
  {
    id: 'age-060',
    title: 'Información de la AGE',
    subtitle: 'Trámites, cita previa DNI, SEPE y DGT',
    number: '060',
    icon: 'information-circle-outline',
    note: 'Atención automatizada 24 h. Con coste de una llamada de 1 min.',
  },
  {
    id: 'sepe-cita',
    title: 'SEPE — Cita previa',
    subtitle: 'Prestaciones y subsidios por desempleo',
    number: '91 926 79 70',
    icon: 'briefcase-outline',
    note: 'Llamada nacional con tarifa ordinaria de tu operador.',
  },
  {
    id: 'inss-pensiones',
    title: 'Seguridad Social — INSS',
    subtitle: 'Pensiones y otras prestaciones',
    number: '91 542 11 76',
    icon: 'heart-outline',
    note: 'Gratuito según tu tarifa plana (línea 91 con tarifa local).',
  },
  {
    id: 'imv-020',
    title: 'Ingreso Mínimo Vital',
    subtitle: 'Información del IMV (INSS)',
    number: '020',
    icon: 'wallet-outline',
    note: 'GRATUITO para el usuario. L-V, 9:00-14:30.',
  },
  {
    id: 'policia-dni',
    title: 'Policía Nacional',
    subtitle: 'DNI/NIE, pasaporte y denuncias',
    number: '091',
    icon: 'shield-half-outline',
    note: 'Atención al ciudadano. Para cita previa DNI utiliza también el 060.',
  },
] as const;

interface OfficialPhonesCardProps {
  phone: OfficialPhone;
  styles: ReturnType<typeof getStyles>;
  iconColor: string;
}

/** Tarjeta memoizada: no se repinta si no cambian sus props. */
const OfficialPhonesCard = memo(function OfficialPhonesCard({
  phone,
  styles,
  iconColor,
}: OfficialPhonesCardProps) {
  const handleCall = useCallback(() => {
    const clean = phone.number.replace(/\s+/g, '');
    Linking.openURL(`tel:${clean}`).catch(() => {
      // Sin discador disponible: degradar silenciosamente.
    });
  }, [phone.number]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handleCall}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Llamar al ${phone.title}, número ${phone.number}`}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={phone.icon} size={22} color={iconColor} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{phone.title}</Text>
        <Text style={styles.subtitle}>{phone.subtitle}</Text>
        <Text style={styles.note}>{phone.note}</Text>
      </View>
      <View style={styles.numberWrap}>
        <Ionicons name="call" size={14} color={iconColor} />
        <Text style={styles.number}>{phone.number}</Text>
      </View>
    </TouchableOpacity>
  );
});

/**
 * Sección completa de teléfonos oficiales. Pensada para montarse en la
 * Home (o cualquier pantalla) sin props: se tematiza sola con useTheme.
 */
export default function OfficialPhones() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  // Callback estable: las tarjetas memoizadas no se repintan al cambiar tema.
  const renderCard = useCallback(
    (phone: OfficialPhone) => (
      <OfficialPhonesCard key={phone.id} phone={phone} styles={styles} iconColor={colors.primary} />
    ),
    [styles, colors.primary],
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="call-outline" size={18} color={colors.text} />
        <Text style={styles.sectionTitle}>Teléfonos oficiales y urgencias</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Atención directa con un toque. Los números y sus condiciones de tarificación
        proceden de los portales oficiales de cada organismo.
      </Text>
      {OFFICIAL_PHONES.map(renderCard)}
    </View>
  );
}

const getStyles = createThemedStyles((colors, isDark) => StyleSheet.create({
    section: {
      marginBottom: 24,
      gap: 10,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
      marginBottom: 4,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      // Sombra suave coherente con el design system (elevation Android).
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.35 : 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    body: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    note: {
      fontSize: 10.5,
      color: colors.warningText,
      lineHeight: 14,
      marginTop: 2,
    },
    numberWrap: {
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 6,
    },
    number: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.3,
    },
  }));
