import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCitySuggestions } from '@/lib/queries';
import { theme } from '@/constants/theme';

export function CityAutocomplete({
  value,
  onChangeText,
  focused,
  onFocus,
  onBlur,
  placeholder = 'e.g. Edinburgh',
}: {
  value: string;
  onChangeText: (text: string) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  placeholder?: string;
}) {
  const { data: suggestions } = useCitySuggestions(value);
  const showSuggestions = focused && value.length >= 2 && (suggestions ?? []).length > 0;

  return (
    <View>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {showSuggestions && (
        <View style={styles.suggestionsBox}>
          {(suggestions ?? []).map((city) => (
            <Pressable
              key={city}
              style={styles.suggestionRow}
              onPress={() => {
                onChangeText(city);
                onBlur();
              }}
            >
              <Text style={styles.suggestionText}>{city}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#191922',
    color: theme.text,
  },
  inputFocused: {
    borderColor: theme.borderActive,
    backgroundColor: '#1c1c28',
  },
  suggestionsBox: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionRow: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  suggestionText: { color: theme.text, fontSize: 13, fontWeight: '600' },
});
