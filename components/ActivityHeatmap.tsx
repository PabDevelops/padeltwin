import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

interface DayActivity {
  date: string;
  played: number;
  wins: number;
}

interface ActivityHeatmapProps {
  results: { created_at: string; won: boolean }[];
  weeks?: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildDayBuckets(weeks: number): DayActivity[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Align the grid end to the upcoming Saturday so columns are full weeks.
  const endDow = today.getDay();
  const gridEnd = new Date(today);
  gridEnd.setDate(today.getDate() + (6 - endDow));
  const totalDays = weeks * 7;
  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridEnd.getDate() - totalDays + 1);

  const columns: DayActivity[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: DayActivity[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + w * 7 + d);
      col.push({ date: date.toISOString().slice(0, 10), played: 0, wins: 0 });
    }
    columns.push(col);
  }
  return columns;
}

function intensityColor(played: number, wins: number) {
  if (played === 0) return '#1A1B20';
  const winRate = wins / played;
  if (winRate >= 0.6) return theme.accent;
  if (winRate > 0) return 'rgba(198, 255, 51, 0.45)';
  return 'rgba(255, 59, 48, 0.55)';
}

export function ActivityHeatmap({ results, weeks = 14 }: ActivityHeatmapProps) {
  const columns = buildDayBuckets(weeks);
  const dateIndex = new Map<string, { col: number; row: number }>();
  columns.forEach((col, ci) => col.forEach((day, ri) => dateIndex.set(day.date, { col: ci, row: ri })));

  for (const r of results) {
    const key = new Date(r.created_at).toISOString().slice(0, 10);
    const pos = dateIndex.get(key);
    if (!pos) continue;
    const day = columns[pos.col][pos.row];
    day.played += 1;
    if (r.won) day.wins += 1;
  }

  const totalPlayed = results.length;
  const activeDays = columns.flat().filter((d) => d.played > 0).length;

  // Month label placed above the first column that lands in a new month.
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  columns.forEach((col, ci) => {
    const m = new Date(col[0].date).getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col: ci, label: MONTH_LABELS[m] });
      lastMonth = m;
    }
  });

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.title}>ACTIVITY</Text>
        <Text style={styles.subtitle}>{totalPlayed} matches · {activeDays} active days</Text>
      </View>

      <View style={styles.monthRow}>
        {monthLabels.map((m) => (
          <Text key={m.col} style={[styles.monthLabel, { left: m.col * 13 }]}>{m.label}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {columns.map((col, ci) => (
          <View key={ci} style={styles.column}>
            {col.map((day, ri) => (
              <View
                key={ri}
                style={[styles.cell, { backgroundColor: intensityColor(day.played, day.wins) }]}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.legendRow}>
        <Text style={styles.legendLabel}>Less</Text>
        <View style={[styles.cell, styles.legendCell, { backgroundColor: '#1A1B20' }]} />
        <View style={[styles.cell, styles.legendCell, { backgroundColor: 'rgba(255, 59, 48, 0.55)' }]} />
        <View style={[styles.cell, styles.legendCell, { backgroundColor: 'rgba(198, 255, 51, 0.45)' }]} />
        <View style={[styles.cell, styles.legendCell, { backgroundColor: theme.accent }]} />
        <Text style={styles.legendLabel}>More</Text>
      </View>
    </View>
  );
}

const CELL_SIZE = 10;
const CELL_GAP = 3;

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 11, fontWeight: '900', color: theme.textMuted, letterSpacing: 1.5 },
  subtitle: { fontSize: 10, color: theme.textMuted, fontWeight: '600' },
  monthRow: { height: 14, position: 'relative', marginBottom: 2 },
  monthLabel: { position: 'absolute', fontSize: 9, color: theme.textMuted, fontWeight: '700' },
  grid: { flexDirection: 'row', gap: CELL_GAP },
  column: { gap: CELL_GAP },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'flex-end' },
  legendCell: { width: 8, height: 8 },
  legendLabel: { fontSize: 9, color: theme.textMuted, fontWeight: '600' },
});
