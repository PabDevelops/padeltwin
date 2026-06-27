import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.updated}>Last updated: {new Date().toLocaleDateString('en-GB')}</Text>

      <Section title="Who we are">
        PadelTwin is a padel matchmaking, ranking, and social app. This policy explains what data we
        collect, why, and how you can control or delete it.
      </Section>

      <Section title="What we collect">
        Account details (name, email), profile information you provide (level, city, photo, club,
        equipment), match results and ELO history, messages with other players, push notification
        tokens, and content you post (achievements, follows, vibs, reports).
      </Section>

      <Section title="How we use it">
        To run matchmaking, rankings, and the social feed; to send you push notifications about
        activity relevant to you (messages, requests, results); and to moderate the app (reviewing
        reports, blocked users, coach applications).
      </Section>

      <Section title="Who can see your data">
        Your profile, ELO, and match history are visible to other players. Direct messages are only
        visible to the two people in that conversation. We never sell your data to third parties.
      </Section>

      <Section title="Blocking and reporting">
        You can block another player at any time from their profile — this hides you from each
        other and stops new contact. You can report a profile for review. Reports are reviewed
        manually by us.
      </Section>

      <Section title="Account deletion">
        You can permanently delete your account at any time from Profile → Privacy & Safety →
        Delete my account. This removes your profile, matches, messages, and stats. This action
        cannot be undone.
      </Section>

      <Section title="Contact">
        For privacy questions or data requests, contact us at the support address listed on the app
        store listing.
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 20, gap: 16 },
  updated: { color: theme.textMuted, fontSize: 11, fontWeight: '700' },
  section: { backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  sectionTitle: { color: theme.accent, fontSize: 12, fontWeight: '900', letterSpacing: 0.5, marginBottom: 8 },
  body: { color: theme.text, fontSize: 13, lineHeight: 20 },
});
