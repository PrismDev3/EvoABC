import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useGame } from '../state/GameContext';
import { useNav, useParams } from '../navigation/Navigator';
import { getLevel, getRegion } from '../data/levels';
import { encouragement } from '../game/session';
import { coinsForCorrect } from '../game/economy';
import { SessionSummary } from '../types';
import { colors, fonts, gradients, radii, spacing, type } from '../theme';
import { ScreenScaffold, ScreenHeader } from '../components/ScreenScaffold';
import { CueIcon } from '../art/CueIcon';
import { Badge, Panel } from '../components/Cards';
import { SessionTopBar } from '../components/Hud';
import { LetterTile, PictureCue, SpeakerButton, WordSlots } from '../components/Spelling';
import { DragSpell } from '../components/DragSpell';
import { GameModal } from '../components/GameModal';
import { FloatingReward, PopIn, ScreenShake, SparkleRing } from '../art/Effects';
import { CheckIcon, CloseIcon, SparkleIcon } from '../art/Icons';
import { WordLetters } from '../components/RuleCard';
import { lookupWord } from '../data/words';
import { Pattern, patternForWord } from '../game/phonics';
import { haptic } from '../lib/feedback';
import { playSfx } from '../audio/sfx';
import { dictateWord, hintEnding, soundOut, speakLine, speakSentence, stopSpeech, teachWord } from '../lib/tts';

/**
 * One learning level: five words, three hearts, three spelling modes.
 * The screen only draws; every rule lives in src/game/session.ts and is applied
 * by the game context, which also plays the sounds and the haptics.
 *
 * The teaching card that used to sit above every question was half a screen
 * tall and, worse, printed the word the child was being asked to spell. It is
 * one line now: the pattern for this word and a tap to open the whole rule. The
 * letters appear once the answer is in, which is when they teach something.
 */

export default function PlayScreen() {
  const nav = useNav();
  const params = useParams<{ levelId?: string }>();
  const game = useGame();
  const { session, startLevel, answer, nextQuestion, finishLevel, abandonLevel, nextLevel } = game;
  const { width, height } = useWindowDimensions();

  const levelId = params.levelId ?? nextLevel.id;
  const level = useMemo(() => getLevel(levelId), [levelId]);
  const region = useMemo(() => getRegion(level.regionId), [level.regionId]);

  const [feedback, setFeedback] = useState<{ correct: boolean; word: string } | null>(null);
  const [chosenLetter, setChosenLetter] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [lostSummary, setLostSummary] = useState<SessionSummary | null>(null);
  const startedRef = useRef<string | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The "it ends with puh" hint that follows a miss in listen mode. */
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);

  // Start a fresh session whenever this screen opens for a level.
  useEffect(() => {
    startedRef.current = levelId;
    finishedRef.current = false;
    setFeedback(null);
    setChosenLetter(null);
    setTipOpen(false);
    startLevel(levelId);
  }, [levelId, startLevel]);

  const question = session === null ? null : session.queue[session.index] ?? null;
  const word = question?.word ?? null;
  const mode = question?.mode ?? 'build';
  const modeLabel = mode === 'build' ? 'Build the word' : mode === 'missing' ? 'Which letter fits?' : 'Listen and spell';

  // The teaching hook for the word on screen: authored focus letters when the
  // bank has them, otherwise whatever pattern detection finds.
  const wordEntry = word === null ? null : lookupWord(word.word);
  const pattern: Pattern | null = word === null ? null : patternForWord(word.word, wordEntry);
  const ruleLine = `${region.rule.title}. ${region.rule.text}`;

  const tileSize = useMemo(() => {
    const longest = Math.max(4, word?.word.length ?? 4);
    const usable = width - spacing.lg * 2 - 24;
    return Math.max(36, Math.min(58, Math.floor(usable / longest) - 8));
  }, [width, word?.word.length]);

  // The picture and the board share the screen, so the art gives way on a
  // short phone instead of pushing the letters off the bottom.
  const cueSize = useMemo(() => Math.max(84, Math.min(116, Math.round(height * 0.15))), [height]);

  // Read the word out loud in the listen mode, and whenever the word changes.
  useEffect(() => {
    if (word === null) return undefined;
    if (mode !== 'listen') return undefined;
    const timer = setTimeout(() => {
      speakSentence(word.hint, word.word);
    }, 420);
    return () => clearTimeout(timer);
  }, [mode, question?.attempt, question?.word.word, word]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current !== null) clearTimeout(advanceTimer.current);
      if (hintTimer.current !== null) clearTimeout(hintTimer.current);
      stopSpeech();
    };
  }, []);

  const handleAnswer = useCallback(
    (correct: boolean, chosen?: string) => {
      if (session === null || session.outcome !== 'playing' || feedback !== null) return;
      const currentWord = session.queue[session.index]?.word.word ?? '';
      answer(correct);
      setFeedback({ correct, word: currentWord });
      if (chosen !== undefined) setChosenLetter(chosen);
      if (correct) setBurstKey((key) => key + 1);
      else setShakeKey((key) => key + 1);
      const delay = correct ? 780 : 1750;
      advanceTimer.current = setTimeout(() => {
        setFeedback(null);
        setChosenLetter(null);
        nextQuestion();
      }, delay);
      // In listen mode the word was never on screen, so a miss gets the ending
      // said back: the last sound is what a phone speaker eats first.
      if (!correct && mode === 'listen') {
        if (hintTimer.current !== null) clearTimeout(hintTimer.current);
        hintTimer.current = setTimeout(() => hintEnding(currentWord), 620);
      }
    },
    [answer, feedback, mode, nextQuestion, session],
  );

  // Wrap up the session exactly once, whether it was won or ran out of hearts.
  useEffect(() => {
    if (session === null || !session.finished || feedback !== null || finishedRef.current) return;
    finishedRef.current = true;
    const summary = finishLevel();
    if (summary === null) return;
    if (summary.won) {
      nav.replace('result');
    } else {
      setLostSummary(summary);
    }
  }, [feedback, finishLevel, nav, session]);

  const restart = useCallback(() => {
    setLostSummary(null);
    setFeedback(null);
    setChosenLetter(null);
    finishedRef.current = false;
    startedRef.current = levelId;
    startLevel(levelId);
  }, [levelId, startLevel]);

  const leaveToMap = useCallback(() => {
    abandonLevel();
    nav.reset('map');
  }, [abandonLevel, nav]);

  if (session === null) {
    return (
      <ScreenScaffold gradient={gradients.sky}>
        <View style={styles.loading}>
          <Text style={type.h2}>Warming up the volcano</Text>
        </View>
      </ScreenScaffold>
    );
  }

  const missingFilled: (string | null)[] =
    word === null || question === null
      ? []
      : word.word
          .split('')
          .map((letter, index) => (index === question.missingIndex ? null : letter));

  // A missed word is requeued, so the queue can grow past its first length.
  const progress = session.total === 0 ? 0 : Math.min(1, session.index / session.total);

  return (
    <ScreenScaffold gradient={gradients.sky} scroll scrollEnabled={!dragging} padded={false} contentStyle={styles.screenPadding}>
      <ScreenHeader
        title={level.title}
        subtitle={
          <View style={styles.regionRow}>
            <CueIcon cue={region.cue} size={26} />
            <Text style={type.body} numberOfLines={1}>
              {region.name}
            </Text>
          </View>
        }
        compact
        onBack={() => setQuitOpen(true)}
        right={<Badge label={modeLabel} color={region.accent} />}
      />

      <SessionTopBar hearts={session.hearts} maxHearts={session.maxHearts} progress={progress} combo={session.combo} />

      <ScreenShake trigger={shakeKey} intensity={12}>
        <View style={styles.body}>
          <Panel tone="card" style={styles.wordCard}>
            <Pressable
              onPress={() => {
                playSfx('tap');
                haptic('light');
                setTipOpen((open) => !open);
              }}
              accessibilityRole="button"
              accessibilityLabel={tipOpen ? 'Hide the rule' : 'Show the rule for this word'}
              style={styles.tipBar}
              hitSlop={{ top: 6, bottom: 6 }}
            >
              <View style={[styles.tipBadge, { backgroundColor: `${region.accent}22` }]}>
                <SparkleIcon size={18} color={region.accent} />
              </View>
              <Text style={[type.bodyBold, styles.tipTitle]} numberOfLines={1}>
                {region.rule.title}
              </Text>
              <Badge label={pattern?.pair ?? region.rule.focusPair} color={region.accent} />
              <Text style={[styles.tipToggle, { color: region.accent }]}>{tipOpen ? '-' : '+'}</Text>
            </Pressable>

            {tipOpen ? (
              <View style={styles.tipBody}>
                <Text style={[type.body, styles.tipText]}>{region.rule.text}</Text>
                <View style={styles.tipExamples}>
                  {region.rule.examples.slice(0, 4).map((example) => (
                    <View key={example} style={styles.tipChip}>
                      <Text style={styles.tipChipText}>{example.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
                <SpeakerButton onPress={() => speakLine(ruleLine)} label="Hear the rule" tint={region.accent} size={40} />
              </View>
            ) : null}

            <View style={styles.cardTop}>
              <PictureCue cue={word?.cue ?? ''} hint={word?.hint ?? ''} fallback={word?.word ?? ''} tint={colors.cardAlt} size={cueSize} />
            </View>

            {feedback !== null && word !== null ? (
              <View style={styles.revealRow}>
                <WordLetters word={word.word} pattern={pattern} size={30} />
              </View>
            ) : null}

            {mode === 'listen' ? (
              <View style={styles.listenRow}>
                <SpeakerButton
                  stacked
                  onPress={() => (word === null ? undefined : speakSentence(word.hint, word.word))}
                  label="Say it again"
                  tint={colors.gem}
                  size={48}
                />
                <SpeakerButton stacked onPress={() => (word === null ? undefined : soundOut(word.word))} label="Sound it out" tint={colors.amber} size={48} />
                <SpeakerButton stacked onPress={() => (word === null ? undefined : teachWord(word.word))} label="Spell it with me" tint={colors.grape} size={48} />
              </View>
            ) : (
              <SpeakerButton
                onPress={() => (word === null ? undefined : word.sentence !== undefined ? speakSentence(word.sentence, word.word) : dictateWord(word.word))}
                label={word?.sentence !== undefined ? 'Hear it in a sentence' : 'Hear the word'}
                tint={colors.cardAlt}
                size={46}
              />
            )}
            {word?.sentence !== undefined && mode !== 'listen' ? (
              <Text style={[type.body, styles.sentence]} numberOfLines={2}>
                {word.sentence}
              </Text>
            ) : null}
          </Panel>

          <PopIn key={`${question?.word.word}-${question?.attempt}`} style={styles.playArea}>
            {mode === 'build' && question !== null && word !== null ? (
              <DragSpell
                word={word.word}
                letters={question.letters}
                tileSize={tileSize}
                locked={feedback !== null}
                onDragStateChange={setDragging}
                onSolved={() => handleAnswer(true)}
                onWrong={() => handleAnswer(false)}
              />
            ) : null}

            {mode === 'listen' && question !== null && word !== null ? (
              <DragSpell
                word={word.word}
                letters={question.letters}
                tileSize={tileSize}
                locked={feedback !== null}
                onDragStateChange={setDragging}
                onSolved={() => handleAnswer(true)}
                onWrong={() => handleAnswer(false)}
              />
            ) : null}

            {mode === 'missing' && question !== null && word !== null ? (
              <View style={styles.missingBlock}>
                <WordSlots
                  total={word.word.length}
                  filled={missingFilled}
                  size={Math.max(42, tileSize)}
                  activeIndex={question.missingIndex}
                  highlightIndex={feedback === null ? -1 : question.missingIndex}
                />
                <Text style={[type.h3, styles.pickLabel]}>Tap the letter that fits!</Text>
                <View style={styles.choices}>
                  {question.choices.map((letter) => {
                    const isAnswer = letter === word.word[question.missingIndex];
                    const state = feedback === null ? 'idle' : chosenLetter === letter ? (feedback.correct ? 'correct' : 'wrong') : isAnswer && !feedback.correct ? 'correct' : 'ghost';
                    return (
                      <LetterTile
                        key={`choice-${letter}`}
                        letter={letter}
                        size={Math.max(46, Math.min(64, tileSize + 6))}
                        state={state}
                        disabled={feedback !== null}
                        onPress={() => handleAnswer(isAnswer === true, letter)}
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}
          </PopIn>

          {feedback !== null ? (
            <View style={styles.feedbackWrap} pointerEvents="none">
              <FloatingReward
                trigger={burstKey}
                label={feedback.correct ? `+${coinsForCorrect(session.combo, question?.attempt ?? 0)} coins` : 'Keep going!'}
                tint={feedback.correct ? colors.success : colors.danger}
              />
              <SparkleRing trigger={burstKey} tint={colors.amber} />
            </View>
          ) : null}
        </View>
      </ScreenShake>

      <View style={styles.footer}>
        <Panel tone="glass" style={styles.footerCard}>
          <View style={styles.footerRow}>
            <View style={[styles.feedbackIcon, { backgroundColor: feedback === null ? colors.cardAlt : feedback.correct ? colors.success : colors.danger }]}>
              {feedback === null ? <SparkleIcon size={22} color={colors.grape} /> : feedback.correct ? <CheckIcon size={22} /> : <CloseIcon size={20} />}
            </View>
            <Text style={[type.bodyBold, styles.footerText]} numberOfLines={2}>
              {feedback === null
                ? session.combo >= 3
                  ? `Combo x${session.combo}! The kaiju is roaring!`
                  : question === null
                    ? 'Get ready!'
                    : mode === 'listen'
                      ? 'Listen closely, then build the word!'
                      : 'Sound it out, one letter at a time!'
                : feedback.correct
                  ? 'Yes! That is right!'
                  : `The word is ${feedback.word}. You can do it!`}
            </Text>
          </View>
        </Panel>
      </View>

      <GameModal
        visible={quitOpen}
        title="Leave this level?"
        message="Your hearts refill when you come back, and the words will be waiting."
        gradient={gradients.bone}
        actions={[
          { label: 'Keep spelling', tone: 'jungle', onPress: () => setQuitOpen(false) },
          {
            label: 'Back to the map',
            tone: 'bone',
            onPress: () => {
              setQuitOpen(false);
              leaveToMap();
            },
          },
        ]}
        onDismiss={() => setQuitOpen(false)}
      />

      <GameModal
        visible={lostSummary !== null}
        badge="Try again"
        title="Those hearts are all used up"
        message={lostSummary === null ? undefined : `${encouragement(lostSummary.mistakes)} You still earned ${lostSummary.coins} coins.`}
        gradient={gradients.bone}
        confetti={false}
        mascot={null}
        actions={[
          { label: 'Run it again', tone: 'lava', onPress: restart },
          { label: 'Back to the map', tone: 'bone', onPress: leaveToMap },
        ]}
        onDismiss={restart}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screenPadding: { paddingHorizontal: spacing.lg },
  regionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  body: { flex: 1, gap: spacing.md },
  wordCard: { gap: spacing.sm, alignItems: 'center' },
  tipBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '100%', paddingVertical: spacing.xs },
  tipBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { flex: 1, flexShrink: 1 },
  tipToggle: { fontFamily: fonts.display, fontSize: 22, width: 20, textAlign: 'center' },
  tipBody: { width: '100%', gap: spacing.sm, paddingBottom: spacing.xs },
  tipText: { color: colors.inkSoft },
  tipExamples: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tipChip: { backgroundColor: colors.cardAlt, borderWidth: 2, borderColor: colors.cardLine, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 3 },
  tipChipText: { fontFamily: fonts.bodyBlack, fontSize: 12, color: colors.inkSoft, letterSpacing: 0.6 },
  cardTop: { alignItems: 'center' },
  revealRow: { alignItems: 'center', paddingVertical: spacing.xs },
  listenRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', gap: spacing.sm },
  sentence: { textAlign: 'center', color: colors.ink },
  playArea: { width: '100%' },
  missingBlock: { alignItems: 'center', gap: spacing.md, width: '100%' },
  pickLabel: { textAlign: 'center' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  // The reward floats up over the picture instead of over the letter board,
  // where the child's finger is working.
  feedbackWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'flex-start' },
  footer: { paddingVertical: spacing.md },
  footerCard: { padding: spacing.md },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  feedbackIcon: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  footerText: { flex: 1 },
});
