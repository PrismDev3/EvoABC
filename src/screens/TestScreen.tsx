import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useGame } from '../state/GameContext';
import { useNav } from '../navigation/Navigator';
import { MAX_WORDS_PER_LIST, inspectWordList, listProgress, wordsToReview } from '../game/testplan';
import { CustomList } from '../types';
import { colors, fonts, radii, shadow, spacing, type } from '../theme';
import { ScreenHeader, ScreenScaffold } from '../components/ScreenScaffold';
import { Badge, Panel, ProgressBar } from '../components/Cards';
import { ChunkyButton, CounterChip, PillButton } from '../components/Button';
import { GameModal } from '../components/GameModal';
import { PopIn } from '../art/Effects';
import { CheckIcon, LockIcon, SparkleIcon, SoundOnIcon, TrophyIcon } from '../art/Icons';
import { haptic } from '../lib/feedback';

/**
 * My Spelling Test. A grown up types in this week's school words and the app
 * builds a study plan around them: learn the word, then practise it from
 * memory, then sit the test. Anything missed is taught again until it is
 * passed, so the list is mastered before the real school test comes around.
 */

export default function TestScreen() {
  const nav = useNav();
  const { customLists, createList, renameList, deleteList, startTestPlan } = useGame();

  const [editorOpen, setEditorOpen] = useState(false);
  const [wordText, setWordText] = useState('');
  const [nameText, setNameText] = useState('');
  const [justSaved, setJustSaved] = useState<CustomList | null>(null);
  const [renaming, setRenaming] = useState<CustomList | null>(null);
  const [renameText, setRenameText] = useState('');
  const [removing, setRemoving] = useState<CustomList | null>(null);

  const report = useMemo(() => inspectWordList(wordText), [wordText]);

  const skippedLine = useMemo(() => {
    const parts: string[] = [];
    if (report.duplicateCount > 0) parts.push(`${report.duplicateCount} repeated`);
    if (report.tooLongCount > 0) parts.push(`${report.tooLongCount} too long`);
    if (report.cappedCount > 0) parts.push(`${report.cappedCount} past the ${MAX_WORDS_PER_LIST} word limit`);
    if (report.rejected.length > 0) parts.push(`${report.rejected.length} skipped`);
    return parts;
  }, [report.cappedCount, report.duplicateCount, report.rejected.length, report.tooLongCount]);

  const startList = (list: CustomList, mode: 'all' | 'missed') => {
    startTestPlan(list.id, mode);
    nav.push('testSession', { listId: list.id });
  };

  const save = () => {
    if (report.words.length === 0) return;
    const created = createList(nameText, report.words);
    setEditorOpen(false);
    setWordText('');
    setNameText('');
    setJustSaved(created);
  };

  const saveRename = () => {
    if (renaming === null) return;
    renameList(renaming.id, renameText);
    setRenaming(null);
    haptic('light');
  };

  return (
    <ScreenScaffold scroll>
      <ScreenHeader
        title="My Spelling Test"
        subtitle="Type in the words from school and the app teaches them until the test is passed"
        onBack={() => nav.reset('home')}
        right={<CounterChip icon={<TrophyIcon size={18} />} value={`${customLists.length}`} tint={colors.card} />}
      />

      <Panel tone="card" borderColor="#D9CDFF" style={styles.introCard}>
        <View style={styles.introHead}>
          <View style={styles.introIcon}>
            <SparkleIcon size={20} color={colors.grape} />
          </View>
          <Text style={[type.h3, styles.introTitle]}>How a word list works</Text>
        </View>
        <Text style={type.body}>
          Every word is taught three times. First you see it and build it, then you spell it from memory, then the app gives a
          real dictation test with the word spoken out loud. Miss a word and it comes back for another round until you pass.
        </Text>
        <View style={styles.stepRow}>
          <StepPill index={1} label="Learn" />
          <StepPill index={2} label="Practise" />
          <StepPill index={3} label="Test" />
        </View>
        <ChunkyButton label="New word list" tone="grape" size="md" icon={<SparkleIcon size={20} />} onPress={() => setEditorOpen(true)} />
      </Panel>

      <View style={styles.listHead}>
        <TrophyIcon size={18} />
        <Text style={type.label}>MY LISTS</Text>
      </View>

      {customLists.length === 0 ? (
        <Panel tone="alt" style={styles.emptyCard}>
          <Text style={[type.h3, styles.center]}>No words yet</Text>
          <Text style={[type.body, styles.center]}>
            Ask a grown up to type in this week's spelling words. Paste them all at once, separated by spaces or commas, and your
            dinosaur will help you learn every one.
          </Text>
          <ChunkyButton label="Type in my words" tone="lava" size="md" onPress={() => setEditorOpen(true)} style={styles.emptyButton} />
        </Panel>
      ) : (
        customLists.map((list, index) => (
          <ListCard
            key={list.id}
            list={list}
            index={index}
            onStudy={(mode) => startList(list, mode)}
            onRename={() => {
              setRenaming(list);
              setRenameText(list.name);
            }}
            onDelete={() => setRemoving(list)}
          />
        ))
      )}

      <GameModal
        visible={editorOpen}
        title="New word list"
        message="Type or paste the spelling words. Letters only, separated by spaces or commas."
        gradient={['#F4F0FF', '#E4DDFF', '#C7B8FF']}
        actions={[
          { label: report.words.length > 0 ? `Save ${report.words.length} words` : 'Add some words first', tone: 'grape', onPress: save },
          { label: 'Cancel', tone: 'bone', onPress: () => setEditorOpen(false) },
        ]}
        dismissible={false}
        onDismiss={() => setEditorOpen(false)}
      >
        <TextInput
          value={nameText}
          onChangeText={setNameText}
          placeholder="Name it, for example Week of October"
          placeholderTextColor={colors.inkFaint}
          style={styles.input}
          maxLength={40}
          accessibilityLabel="List name"
        />
        <TextInput
          value={wordText}
          onChangeText={setWordText}
          placeholder="cat dog ship thumb phone"
          placeholderTextColor={colors.inkFaint}
          style={[styles.input, styles.wordsInput]}
          multiline
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel="Spelling words"
        />
        <View style={styles.previewBlock}>
          <Text style={type.label}>{`${report.words.length} WORDS READY`}</Text>
          {report.words.length > 0 ? (
            <ScrollView style={styles.chipScroll} contentContainerStyle={styles.chipWrap} nestedScrollEnabled>
              {report.words.slice(0, 24).map((word) => (
                <View key={word} style={styles.wordChip}>
                  <Text style={styles.wordChipText}>{word}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={type.small}>Words you type show up here so you can check them before saving.</Text>
          )}
          {skippedLine.length > 0 ? <Text style={[type.small, styles.skipped]}>{`Skipped: ${skippedLine.join(', ')}.`}</Text> : null}
        </View>
      </GameModal>

      <GameModal
        visible={justSaved !== null}
        badge="List saved"
        title={justSaved?.name ?? 'Saved'}
        message={`${justSaved?.words.length ?? 0} words are ready. Start the study plan now and your dino will help you master them.`}
        gradient={['#E7FFF2', '#C9F7DF', '#7BE495']}
        confetti
        actions={[
          {
            label: 'Start studying',
            tone: 'jungle',
            onPress: () => {
              const list = justSaved;
              setJustSaved(null);
              if (list !== null) startList(list, 'all');
            },
          },
          { label: 'Later', tone: 'bone', onPress: () => setJustSaved(null) },
        ]}
        onDismiss={() => setJustSaved(null)}
      />

      <GameModal
        visible={renaming !== null}
        title="Rename this list"
        gradient={['#F4F0FF', '#E4DDFF', '#C7B8FF']}
        actions={[
          { label: 'Save name', tone: 'grape', onPress: saveRename },
          { label: 'Cancel', tone: 'bone', onPress: () => setRenaming(null) },
        ]}
        onDismiss={() => setRenaming(null)}
      >
        <TextInput
          value={renameText}
          onChangeText={setRenameText}
          placeholder="List name"
          placeholderTextColor={colors.inkFaint}
          style={styles.input}
          maxLength={40}
          accessibilityLabel="New list name"
        />
      </GameModal>

      <GameModal
        visible={removing !== null}
        title="Delete this list?"
        message={`${removing?.name ?? 'This list'} and its progress will be removed from this device. This cannot be undone.`}
        gradient={['#FFEDE6', '#FFD4C4', '#FFAB90']}
        actions={[
          { label: 'Keep it', tone: 'jungle', onPress: () => setRemoving(null) },
          {
            label: 'Delete list',
            tone: 'danger',
            onPress: () => {
              const list = removing;
              setRemoving(null);
              if (list !== null) deleteList(list.id);
            },
          },
        ]}
        onDismiss={() => setRemoving(null)}
      />
    </ScreenScaffold>
  );
}

function StepPill({ index, label }: { index: number; label: string }) {
  return (
    <View style={styles.stepPill}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{index}</Text>
      </View>
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
  );
}

function ListCard({
  list,
  index,
  onStudy,
  onRename,
  onDelete,
}: {
  list: CustomList;
  index: number;
  onStudy: (mode: 'all' | 'missed') => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const progress = listProgress(list.results, list.words);
  const remaining = wordsToReview(list.results, list.words);
  const practised = useMemo(
    () => list.words.filter((word) => ((list.results[word]?.correct ?? 0) + (list.results[word]?.wrong ?? 0)) > 0).length,
    [list.results, list.words],
  );

  return (
    <PopIn delay={index * 60}>
      <Panel tone="card" borderColor={list.passed ? '#8BD9AE' : colors.cardLine} style={styles.listCard}>
        <View style={styles.listTop}>
          <View style={styles.listTitleWrap}>
            <Text style={[type.h3, styles.listTitle]} numberOfLines={1}>
              {list.name}
            </Text>
            <Text style={type.small}>
              {`${list.words.length} words, round ${list.round}, best ${list.bestScore}%`}
            </Text>
          </View>
          {list.passed ? (
            <Badge label="Passed" color={colors.success} icon={<CheckIcon size={13} />} />
          ) : (
            <Badge label={`${progress.passed}/${progress.total}`} color={colors.grape} />
          )}
        </View>

        <ProgressBar value={progress.passed} max={progress.total} gradient={['#7BE495', '#22A75D']} height={13} />
        <Text style={type.small}>
          {remaining.length === 0
            ? 'Every word has been spelled correctly in a test.'
            : `${remaining.length} word${remaining.length === 1 ? '' : 's'} still to master, ${practised} practised so far.`}
        </Text>

        <View style={styles.wordGrid}>
          {list.words.map((word) => {
            const passed = list.results[word]?.passed === true;
            return (
              <View key={word} style={[styles.listWordChip, passed ? styles.listWordPassed : styles.listWordOpen]}>
                {passed ? <CheckIcon size={12} color="#FFFFFF" /> : null}
                <Text style={[styles.listWordText, passed ? styles.listWordTextPassed : null]}>{word}</Text>
              </View>
            );
          })}
        </View>

        <ChunkyButton
          label={list.passed ? `Practise all ${list.words.length} words again` : `Study all ${list.words.length} words`}
          tone={list.passed ? 'bone' : 'jungle'}
          size="md"
          icon={<SoundOnIcon size={18} color={list.passed ? colors.ink : '#083A22'} />}
          onPress={() => onStudy('all')}
        />

        {!list.passed && remaining.length > 0 && remaining.length < list.words.length ? (
          <ChunkyButton
            label={`Only the ${remaining.length} I missed`}
            tone="grape"
            size="md"
            onPress={() => onStudy('missed')}
            style={styles.secondButton}
          />
        ) : null}

        <View style={styles.listFooter}>
          <PillButton label="Rename" onPress={onRename} icon={<SparkleIcon size={14} color={colors.inkSoft} />} />
          <PillButton label="Delete" onPress={onDelete} icon={<LockIcon size={14} color={colors.inkFaint} />} />
        </View>
      </Panel>
    </PopIn>
  );
}

const styles = StyleSheet.create({
  introCard: { gap: spacing.md },
  introHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  introIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EFEBFF', alignItems: 'center', justifyContent: 'center' },
  introTitle: { flexShrink: 1 },
  stepRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  stepPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.cardAlt, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.cardLine, paddingHorizontal: spacing.md, paddingVertical: 5 },
  stepNumber: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.grape, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontFamily: fonts.bodyBlack, fontSize: 11, color: '#FFFFFF' },
  stepLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.sm },
  emptyCard: { gap: spacing.md, alignItems: 'center', paddingVertical: spacing.xl },
  emptyButton: { marginTop: spacing.sm },
  center: { textAlign: 'center' },
  listCard: { gap: spacing.md, marginBottom: spacing.lg },
  listTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  listTitleWrap: { flex: 1 },
  listTitle: { flexShrink: 1 },
  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  listWordChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radii.pill, borderWidth: 2, paddingHorizontal: 10, paddingVertical: 4 },
  listWordPassed: { backgroundColor: colors.success, borderColor: colors.successDark },
  listWordOpen: { backgroundColor: colors.cardAlt, borderColor: colors.cardLine },
  listWordText: { fontFamily: fonts.bodyBlack, fontSize: 12, color: colors.inkSoft, letterSpacing: 0.5 },
  listWordTextPassed: { color: '#FFFFFF' },
  secondButton: { marginTop: 0 },
  listFooter: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  input: {
    width: '100%',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.cardLine,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  wordsInput: { minHeight: 92, textAlignVertical: 'top' },
  previewBlock: { width: '100%', gap: 6 },
  chipScroll: { maxHeight: 108 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 2 },
  wordChip: { backgroundColor: '#EFEBFF', borderRadius: radii.pill, borderWidth: 2, borderColor: '#D9CDFF', paddingHorizontal: 10, paddingVertical: 3 },
  wordChipText: { fontFamily: fonts.bodyBlack, fontSize: 12, color: '#5B37C9', letterSpacing: 0.5 },
  skipped: { color: colors.lavaDark },
});
