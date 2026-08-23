import { PRIVACY_SECTIONS, sanitizeLegalText, LEGAL_DISCLAIMER, LEGAL_PENDING_NOTICE } from '@trami-espana/shared';
import LegalScreen, { LegalSection } from '../../components/LegalScreen';

export default function PrivacyPolicyScreen() {
    const sections: LegalSection[] = PRIVACY_SECTIONS.map((s) => ({
        title: s.title,
        body: sanitizeLegalText(s.body),
    }));

    return (
        <LegalScreen
            title="Política de privacidad"
            subtitle="Cómo recopilamos, utilizamos y protegemos tu información personal."
            notice={LEGAL_PENDING_NOTICE}
            sections={sections}
            footer={LEGAL_DISCLAIMER}
        />
    );
}
