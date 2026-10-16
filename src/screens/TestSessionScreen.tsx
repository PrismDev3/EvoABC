import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useGame } from '../state/GameContext';
import { useNav, useParams } from '../navigation/Navigator';
import { buildTrayLetters, currentWord, isPhaseComplete, isRoundComplete, phaseHint, phaseTitle } from '../game/testplan';
import { Pattern, detectPattern, patternForWord } from '../game/phonics';
import { lookupWord } from '../data/words';
import { colors, fonts, gradients, radii, spacing, type } from '../theme';
import { ScreenHeader, ScreenScaffold } from '../components/ScreenScaffold';
import { Badge, Panel, ProgressBar, StarRow } from '../components/Cards';
import { ChunkyButton, CounterChip } from '../components/Button';
import { GameModal } from '../components/GameModal';
import { RuleCard, WordLetters } from '../components/RuleCard';
import { DragSpell } from '../components/DragSpell';
import { SpeakerButton } from '../components/Spelling';
import { Confetti, EvolveBurst, FloatingReward, PopIn, ScreenShake, SparkleRing } from '../art/Effects';
import { CheckIcon, CloseIcon, CoinIcon, GemIcon, SparkleIcon } from '../art/Icons';
import { Dino } from '../art/Dino';
import { haptic } from '../lib/feedback';
import { dictateWord, soundOut, stopSpeech, teachWord } from '../lib/tts';
import { playRoar } from '../audio/sfx';
import { TestRoundResult } from '../state/GameContext';

/**
 * My Spelling Test. A grown up types in this week's school words and this
 * screen teaches them one at a time: see it and build it, then build it from
 * memory, then a real dictation test. Any word missed is taught again in a new
 * round until the whole list is passed.
 */

const PHASES = ['learn', 'practice', 'test'] as const;

export default function TestSessionScreen() {
  const nav = useNav();
  const params = useParams<{ listId?: string }>();
  const game = useGame();
  const { activeList, testPlan, customLists, startTestPlan, testAnswer, advanceTestPhase, finishTestRound, exitTestPlan } = game;
  const { width } = useWindowDimensions();

  const listId = params.listId ?? testPlan?.listId ?? activeList?.id ?? customLists[0]?.id ?? null;
  const list = useMemo(() => customLists.find((entry) => entry.id === listId) ?? activeList, [activeList, customLists, listId]);

  const [feedback, setFeedback] = useState<{ correct: boolean; word: string } | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const [roundResult, setRoundResult] = useState<TestRoundResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [showRoundCard, setShowRoundCard] = useState(false);
  const startedRef = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start the plan when this screen opens for a list that is not running yet.
  useEffect(() => {
    if (listId === null) return;
    if (startedRef.current === listId) return;
    if (testPlan !== null && testPlan.listId === listId) {
      startedRef.current = listId;
      return;
    }
    startedRef.current = listId;
    startTestPlan(listId, 'all');
  }, [listId, startTestPlan, testPlan]);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      stopSpeech();
    };
  }, []);

  const plan = testPlan !== null && testPlan.listId === listId ? testPlan : null;
  const word = plan === null ? null : currentWord(plan);
  const phase = plan?.phase ?? 'learn';

  const entry = word === null ? null : lookupWord(word);
  const pattern: Pattern | null = word === null ? null : patternForWord(word, entry);

  // Dictation: practice and test words are heard, never seen.
  useEffect(() => {
    if (plan === null || word === null) return undefined;
    if (plan.phase !== 'practice' && plan.phase !== 'test') return undefined;
    const delay = plan.phase === 'test' ? 650 : 520;
    // Said twice: a school list is the one place a word has to land first time.
    const speakTimer = setTimeout(() => dictateWord(word), delay);
    return () => clearTimeout(speakTimer);
  }, [plan?.index, plan?.phase, plan?.round, word]);

  // Phase changes and a finished test are driven from the plan itself.
  useEffect(() => {
    if (plan === null || feedback !== null) return;
    if (plan.phase === 'test') {
      if (isRoundComplete(plan)) setShowRoundCard(true);
      return;
    }
    if (plan.phase !== 'done' && isPhaseComplete(plan) && plan.order.length > 0) {
      advanceTestPhase();
    }
  }, [advanceTestPhase, feedback, plan]);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (plan === null || word === null || feedback !== null) return;
      testAnswer(correct);
      setFeedback({ correct, word });
      if (correct) setBurstKey((key) => key + 1);
      else setShakeKey((key) => key + 1);
      const delay = correct ? 900 : 2400;
      timer.current = setTimeout(() => setFeedback(null), delay);
    },
    [feedback, plan, testAnswer, word],
  );

  const trayLetters = useMemo(() => {
    if (word === null || plan === null) return [];
    const seed = plan.round * 997 + plan.index * 31 + word.length;
    return buildTrayLetters(word, plan.phase, seed);
  }, [plan, word]);

  const tileSize = useMemo(() => {
    const longest = Math.max(4, word?.length ?? 4);
    const usable = width - spacing.lg * 4 - 24;
    return Math.max(34, Math.min(56, Math.floor(usable / longest) - 8));
  }, [width, word?.length]);

  const teachAgain = useCallback(() => {
    if (word === null) return;
    teachWord(word);
  }, [word]);

  // Sound it out reads the word in its letter sounds, which is what a grown up
  // would do at the kitchen table when a word will not stick.
  const soundItOut = useCallback(() => {
    if (word === null) return;
    soundOut(word);
  }, [word]);

  const finishRound = useCallback(() => {
    const result = finishTestRound();
    setShowRoundCard(false);
    if (result !== null && result.passed) setRoundResult(result);
    else if (result !== null) haptic('warning');
  }, [finishTestRound]);

  const leave = useCallback(
    (target: 'test' | 'home') => {
      exitTestPlan();
      if (target === 'test') nav.reset('test');
      else nav.reset('home');
    },
    [exitTestPlan, nav],
  );

  if (list === undefined || list === null) {
    return (
      <ScreenScaffold>
        <ScreenHeader title="Spelling test" onBack={() => nav.reset('test')} />
        <Panel>
          <Text style={type.body}>That word list is not here any more.</Text>
          <ChunkyButton label="Back to my words" tone="grape" size="md" onPress={() => nav.reset('test')} style={styles.spaced} />
        </Panel>
      </ScreenScaffold>
    );
  }

  // A finished list lands here, which is also the state after dismissing the celebration.
  if (plan !== null && plan.phase === 'done' && word === null) {
    return (
      <ScreenScaffold gradient={gradients.jungle}>
        <ScreenHeader title={list.name} onBack={() => leave('test')} />
        <View style={styles.center}>
          <View style={styles.passedArt}>
            <EvolveBurst run tint={colors.jungle} />
            <Dino skin={game.equippedSkin} stageIndex={game.stageIndex} size={150} />
          </View>
          <Text style={[type.h1, styles.centerText]}>Test passed</Text>
          <Text style={[type.body, styles.centerText]}>Every word on this list was spelled correctly in a real test.</Text>
          <View style={styles.passedRow}>
            <Badge label={`Best ${list.bestScore}%`} color={colors.success} />
            <Badge label={`${list.round} rounds`} color={colors.grape} />
          </View>
          <View style={styles.passedActions}>
            <ChunkyButton label="Practise it again" tone="jungle" size="md" onPress={() => startTestPlan(list.id, 'all')} />
            <ChunkyButton label="Back to my words" tone="bone" size="md" onPress={() => leave('test')} />
          </View>
        </View>
      </ScreenScaffold>
    );
  }

  if (plan === null || word === null) {
    return (
      <ScreenScaffold>
        <View style={styles.center}>
          <Text style={type.h2}>Getting the flashcards out</Text>
        </View>
      </ScreenScaffold>
    );
  }

  const phaseIndex = PHASES.indexOf(plan.phase as (typeof PHASES)[number]);
  const progress = plan.order.length === 0 ? 0 : Math.min(1, plan.index / plan.order.length);
  const hideWord = plan.phase !== 'learn';

  return (
    <ScreenScaffold
      gradient={plan.phase === 'test' ? gradients.grape : gradients.sky}
      scroll
      scrollEnabled={!dragging}
      padded={false}
      contentStyle={styles.screenPadding}
    >
      <ScreenHeader
        title={list.name}
        subtitle={`${phaseTitle(plan.phase)}. ${phaseHint(plan.phase)}`}
        compact
        onBack={() => setQuitOpen(true)}
        right={<CounterChip icon={<SparkleIcon size={18} color={colors.grape} />} value={`Round ${plan.round}`} tint={colors.card} />}
      />

      <View style={styles.phaseRow}>
        {PHASES.map((name, index) => (
          <View key={name} style={styles.phasePillWrap}>
            <View
              style={[
                styles.phasePill,
                {
                  backgroundColor: index < phaseIndex ? colors.success : index === phaseIndex ? colors.grape : colors.card,
                  borderColor: index <= phaseIndex ? 'rgba(255,255,255,0.7)' : colors.cardLine,
                },
              ]}
            >
              <Text style={[styles.phaseText, { color: index <= phaseIndex ? '#FFFFFF' : colors.inkFaint }]}>
                {index + 1}. {phaseTitle(name as (typeof PHASES)[number])}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <ProgressBar value={plan.index} max={plan.order.length} gradient={['#B39CFF', '#7B5CFF']} height={14} />
      <Text style={[type.small, styles.progressLine]}>{`Word ${Math.min(plan.index + 1, plan.order.length)} of ${plan.order.length} in this round`}</Text>

      <ScreenShake trigger={shakeKey} intensity={11}>
        <View style={styles.body}>
          {plan.phase === 'learn' ? (
            <RuleCard
              title={pattern !== null ? `${pattern.label}: ${pattern.pair}` : 'Look and remember'}
              text={pattern !== null ? pattern.tip : 'Say the word out loud, then build it letter by letter.'}
              focusPair={pattern?.pair ?? 'word'}
              tint={pattern?.label === 'Quiet letter' ? colors.lava : colors.grape}
              onSpeak={teachAgain}
              word={word}
              pattern={pattern}
            />
          ) : null}

          <Panel tone="card" style={styles.boardCard}>
            <Text style={type.label}>{hideWord ? 'LISTEN AND SPELL' : 'BUILD THE WORD'}</Text>
            {hideWord ? (
              <View style={styles.hiddenWord}>
                <View style={styles.hiddenBadge}>
                  <Text style={styles.hiddenMark}>?</Text>
                </View>
                <View style={styles.hiddenActions}>
                  <SpeakerButton onPress={() => word !== null && dictateWord(word)} label="Hear it again" tint={colors.gem} size={46} />
                  <SpeakerButton onPress={soundItOut} label="Sound it out" tint={colors.jungle} size={46} />
                  <SpeakerButton onPress={teachAgain} label="Spell it with me" tint={colors.amber} size={46} />
                </View>
              </View>
            ) : (
              <View style={styles.visibleWord}>
                <WordLetters word={word} pattern={pattern} size={34} />
                <SpeakerButton onPress={teachAgain} label="Hear it and spell it" tint={colors.grape} size={46} />
                <SpeakerButton onPress={soundItOut} label="Sound it out" tint={colors.jungle} size={46} />
              </View>
            )}
          </Panel>

          <PopIn key={`${plan.phase}-${plan.round}-${plan.index}-${word}`} style={styles.playArea}>
            <DragSpell
              word={word}
              letters={trayLetters}
              tileSize={tileSize}
              locked={feedback !== null}
              onDragStateChange={setDragging}
              onSolved={() => handleAnswer(true)}
              onWrong={() => handleAnswer(false)}
            />
          </PopIn>

          {feedback !== null ? (
            <View style={styles.feedbackWrap} pointerEvents="none">
              <FloatingReward
                trigger={burstKey}
                label={feedback.correct ? 'That is right!' : 'We will practise it'}
                tint={feedback.correct ? colors.success : colors.danger}
              />
              <SparkleRing trigger={burstKey} tint={colors.amber} />
            </View>
          ) : null}
        </View>
      </ScreenShake>

      <Panel tone="glass" style={styles.footer}>
        <View style={styles.footerRow}>
          <View style={[styles.footerIcon, { backgroundColor: feedback === null ? colors.cardAlt : feedback.correct ? colors.success : colors.danger }]}>
            {feedback === null ? <SparkleIcon size={20} color={colors.grape} /> : feedback.correct ? <CheckIcon size={20} /> : <CloseIcon size={18} />}
          </View>
          <Text style={[type.bodyBold, styles.footerText]} numberOfLines={3}>
            {feedback === null
              ? plan.phase === 'learn'
                ? 'Look at every letter before you build it'
                : plan.phase === 'test'
                  ? 'A real spelling test. Listen once, then spell it'
                  : 'The word is hiding. Spell what you heard'
              : feedback.correct
                ? 'Monster roar! Correct.'
                : `${feedback.word} is spelled like this. Listen again.`}
          </Text>
        </View>
      </Panel>

      <GameModal
        visible={quitOpen}
        title="Leave the practice?"
        message="Your list stays saved, and you can carry on from this round whenever you like."
        gradient={gradients.bone}
        actions={[
          { label: 'Keep practising', tone: 'grape', onPress: () => setQuitOpen(false) },
          { label: 'Back to my words', tone: 'bone', onPress: () => leave('test') },
        ]}
        onDismiss={() => setQuitOpen(false)}
      />

      <GameModal
        visible={showRoundCard}
        badge={`Round ${plan.round} test`}
        title={plan.lastScore >= 100 ? 'Every word correct!' : `${plan.lastScore}% this time`}
        message={
          plan.missed.length === 0
            ? 'You spelled the whole list correctly.'
            : `Let us master ${plan.missed.length === 1 ? 'this word' : 'these words'} next: ${plan.missed.join(', ')}`
        }
        gradient={gradients.gold}
        confetti={plan.lastScore >= 100}
        mascot={<Dino skin={game.equippedSkin} stageIndex={game.stageIndex} size={120} />}
        actions={[{ label: plan.missed.length === 0 ? 'Celebrate' : 'Teach me those words', tone: 'grape', onPress: finishRound }]}
        dismissible={false}
        onDismiss={finishRound}
      />

      <GameModal
        visible={roundResult !== null}
        badge="Test passed"
        title="Your spelling test is passed"
        message={roundResult === null ? undefined : `You earned 250 coins, 6 gems and 140 XP. ${roundResult.evolved ? `${roundResult.stageName} has evolved!` : ''}`}
        gradient={gradients.grape}
        confetti
        mascot={
          roundResult !== null ? (
            <View style={styles.celebrateArt}>
              <EvolveBurst run tint={colors.grape} />
              <Dino skin={game.equippedSkin} stageIndex={game.stageIndex} size={150} />
            </View>
          ) : null
        }
        actions={[
          { label: 'Play my words again', tone: 'jungle', onPress: () => leave('test') },
          { label: 'Spell some levels', tone: 'bone', onPress: () => leave('home') },
        ]}
        onDismiss={() => leave('test')}
      >
        <View style={styles.rewardRow}>
          <StarRow count={3} size={26} />
          <View style={styles.rewardChips}>
            <CounterChip icon={<CoinIcon size={18} />} value="+250" />
            <CounterChip icon={<GemIcon size={17} />} value="+6" tint={colors.cardAlt} />
          </View>
        </View>
      </GameModal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  screenPadding: { paddingHorizontal: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  spaced: { marginTop: spacing.md },
  phaseRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm, flexWrap: 'wrap' },
  phasePillWrap: { flexGrow: 1 },
  phasePill: { borderRadius: radii.pill, borderWidth: 2, paddingHorizontal: spacing.md, paddingVertical: 6, alignItems: 'center' },
  phaseText: { fontFamily: fonts.bodyBlack, fontSize: 11, letterSpacing: 0.4 },
  progressLine: { marginTop: 4, marginBottom: spacing.md },
  body: { flex: 1, gap: spacing.md, paddingBottom: spacing.md },
  boardCard: { gap: spacing.md, alignItems: 'center' },
  visibleWord: { alignItems: 'center', gap: spacing.md },
  hiddenWord: { alignItems: 'center', gap: spacing.md },
  hiddenBadge: { width: 84, height: 84, borderRadius: 26, backgroundColor: colors.cardAlt, borderWidth: 3, borderColor: colors.cardLine, alignItems: 'center', justifyContent: 'center' },
  hiddenMark: { fontFamily: fonts.display, fontSize: 44, color: colors.inkFaint },
  hiddenActions: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  playArea: { width: '100%' },
  feedbackWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: spacing.md, marginTop: spacing.sm },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  footerIcon: { width: 38, height: 38, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  footerText: { flex: 1 },
  celebrateArt: { alignItems: 'center', justifyContent: 'center', width: 170, height: 170 },
  passedArt: { alignItems: 'center', justifyContent: 'center', width: 170, height: 170 },
  centerText: { textAlign: 'center' },
  passedRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  passedActions: { width: '100%', maxWidth: 340, gap: spacing.sm, marginTop: spacing.lg },
  rewardRow: { alignItems: 'center', gap: spacing.sm },
  rewardChips: { flexDirection: 'row', gap: spacing.sm },
});
