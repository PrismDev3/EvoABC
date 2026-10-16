import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { colors, fonts, gradients, radii, spacing, type } from '../theme';
import { ScreenHeader, ScreenScaffold } from '../components/ScreenScaffold';
import { ChunkyButton, CounterChip, PillButton } from '../components/Button';
import { Badge, Divider, InfoRow, Panel, ProgressBar, StatPill } from '../components/Cards';
import { GameModal } from '../components/GameModal';
import {
  CheckIcon,
  CoinIcon,
  EggIcon,
  FlameIcon,
  GearsIcon,
  HeartIcon,
  MicIcon,
  MusicIcon,
  PawIcon,
  SparkleIcon,
  SpeakerIcon,
  StarIcon,
  TrophyIcon,
  VibrateIcon,
} from '../art/Icons';
import { useGame } from '../state/GameContext';
import { useNav } from '../navigation/Navigator';
import { TAG_LABELS, TAG_ORDER } from '../data/words';
import { englishVoices, getVoiceId, speakLine, speakWord } from '../lib/tts';
import { lifetimeXp } from '../game/economy';
import { haptic } from '../lib/feedback';
import { playSfx } from '../audio/sfx';

const SPEEDS: { label: string; rate: number }[] = [
  { label: 'Slow', rate: 0.6 },
  { label: 'Normal', rate: 0.82 },
  { label: 'Fast', rate: 1 },
];
/** School words are dictated slowly so every sound can be heard. */
const DICTATION_SPEEDS: { label: string; rate: number }[] = [
  { label: 'Slow', rate: 0.6 },
  { label: 'Normal', rate: 0.72 },
  { label: 'Fast', rate: 0.9 },
];
const VOICE_ROWS = 8;
const GATE_CHOICES = [24, 28, 32, 21];
const GATE_ANSWER = 28;

interface ToggleRowProps {
  label: string;
  hint: string;
  value: boolean;
  onChange: (next: boolean) => void;
  /** Optional icon, always drawn in the same size badge so the rows line up. */
  icon?: React.ReactNode;
}

function ToggleRow({ label, hint, value, onChange, icon }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      {icon !== undefined ? <View style={styles.toggleBadge}>{icon}</View> : null}
      <View style={styles.toggleText}>
        <Text style={type.bodyBold}>{label}</Text>
        <Text style={type.small}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(next) => {
          haptic('select');
          onChange(next);
        }}
        trackColor={{ false: colors.locked, true: colors.jungle }}
        thumbColor={colors.card}
        ios_backgroundColor={colors.locked}
        accessibilityLabel={label}
      />
    </View>
  );
}

function barGradient(percent: number): readonly [string, string, ...string[]] {
  if (percent >= 75) return gradients.jungle;
  if (percent >= 50) return gradients.gold;
  return gradients.lava;
}

export default function SettingsScreen() {
  const nav = useNav();
  const { profile, updateSettings, resetProfile, totalStars, voices, voiceLabel, chooseVoice, previewVoice } = useGame();
  const { settings, stats, streak } = profile;

  const [gateOpen, setGateOpen] = useState(false);
  const [zoneUnlocked, setZoneUnlocked] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const practiced = stats.correct + stats.wrong;
  const accuracy = practiced === 0 ? 0 : Math.round((stats.correct / practiced) * 100);
  const lifetime = lifetimeXp(profile.level, profile.xp);

  const trickyWords = useMemo(
    () =>
      Object.entries(stats.perWord)
        .map(([word, entry]) => ({ word, wrong: entry.wrong, correct: entry.correct }))
        .filter((item) => item.wrong > 0)
        .sort((a, b) => b.wrong - a.wrong || a.word.localeCompare(b.word))
        .slice(0, 6),
    [stats.perWord],
  );

  const installedVoices = useMemo(() => englishVoices(), [voices]);
  const activeVoiceId = settings.voiceId ?? getVoiceId();

  const answerGate = (value: number) => {
    if (value === GATE_ANSWER) {
      playSfx('correct');
      haptic('success');
      setGateError(null);
      setGateOpen(false);
      setZoneUnlocked(true);
      return;
    }
    haptic('warning');
    playSfx('wrong');
    setGateError('Not quite. Try another answer.');
  };

  const finishReset = () => {
    setConfirmReset(false);
    setZoneUnlocked(false);
    resetProfile();
    nav.reset('onboarding');
  };

  return (
    <ScreenScaffold scroll>
      <ScreenHeader
        title="Settings"
        subtitle="Sound, reading pace and the grown up zone"
        onBack={() => (nav.canGoBack ? nav.pop() : nav.reset('home'))}
        right={<CounterChip icon={<StarIcon size={18} />} value={totalStars} />}
      />

      <Panel style={styles.block}>
        <View style={styles.blockTitle}>
          <GearsIcon size={22} />
          <Text style={type.h2}>Sound and feel</Text>
        </View>
        <ToggleRow
          label="Sound effects"
          hint="Coins, roars and fanfares"
          value={settings.sfx}
          onChange={(next) => updateSettings({ sfx: next })}
          icon={<SpeakerIcon size={20} />}
        />
        <Divider />
        <ToggleRow
          label="Adventure music"
          hint="A catchy background loop"
          value={settings.music}
          onChange={(next) => updateSettings({ music: next })}
          icon={<MusicIcon size={20} />}
        />
        <Divider />
        <ToggleRow
          label="Vibration"
          hint="A little buzz on every tap"
          value={settings.haptics}
          onChange={(next) => updateSettings({ haptics: next })}
          icon={<VibrateIcon size={20} />}
        />
        <Divider />
        <ToggleRow
          label="Read words out loud"
          hint="The app speaks each word for you"
          value={settings.speech}
          onChange={(next) => updateSettings({ speech: next })}
          icon={<MicIcon size={20} />}
        />
      </Panel>

      <Panel style={styles.block}>
        <View style={styles.blockTitle}>
          <SparkleIcon size={22} />
          <Text style={type.h2}>Reading pace</Text>
        </View>
        <Text style={type.small}>Two voices to set: the one that reads sentences, and the one that dictates words.</Text>

        <View style={styles.paceGroup}>
          <View style={styles.paceHead}>
            <View style={styles.paceBadge}>
              <SpeakerIcon size={20} />
            </View>
            <View style={styles.paceText}>
              <Text style={type.bodyBold} numberOfLines={1}>
                Sentence voice
              </Text>
              <Text style={type.small}>Hints, rule cards and praise</Text>
            </View>
            <PillButton
              label="Hear it"
              tone="gem"
              icon={<SpeakerIcon size={15} color={colors.gemDark} />}
              onPress={() => speakLine('Listen carefully, then build the word.')}
            />
          </View>
          <View style={styles.speedRow}>
            {SPEEDS.map((speed) => (
              <PillButton
                key={speed.label}
                label={speed.label}
                tone="gem"
                selected={Math.abs(settings.speechRate - speed.rate) < 0.06}
                onPress={() => updateSettings({ speechRate: speed.rate })}
              />
            ))}
          </View>
        </View>

        <Divider />

        <View style={styles.paceGroup}>
          <View style={styles.paceHead}>
            <View style={styles.paceBadge}>
              <MicIcon size={20} />
            </View>
            <View style={styles.paceText}>
              <Text style={type.bodyBold} numberOfLines={1}>
                Word voice
              </Text>
              <Text style={type.small}>Spelling words, dictated slowly</Text>
            </View>
            <PillButton
              label="Hear it"
              tone="grape"
              icon={<MicIcon size={15} color={colors.grapeDark} />}
              onPress={() => speakWord('MAP')}
            />
          </View>
          <Text style={type.small}>Tap Hear it and check the last sound of the word is clear.</Text>
          <View style={styles.speedRow}>
            {DICTATION_SPEEDS.map((speed) => (
              <PillButton
                key={`dictation-${speed.label}`}
                label={speed.label}
                tone="grape"
                selected={Math.abs(settings.dictationRate - speed.rate) < 0.06}
                onPress={() => updateSettings({ dictationRate: speed.rate })}
              />
            ))}
          </View>
        </View>
        <Divider />
        <InfoRow label="Works without internet" value="Yes, everything is on the device" />
        <InfoRow label="Ads and sign ups" value="None, ever" />
      </Panel>

      <Panel style={styles.block}>
        <View style={styles.blockTitle}>
          <HeartIcon size={22} />
          <Text style={type.h2}>Parent zone</Text>
        </View>
        <Text style={type.small}>
          A quick sum keeps this area for grown ups. It holds the practice report and the reset button.
        </Text>
        {zoneUnlocked ? (
          <View style={styles.parentOpen}>
            <Badge label="Grown ups only" color={colors.grape} />
            <ChunkyButton label="Lock it again" tone="bone" size="md" onPress={() => setZoneUnlocked(false)} />
          </View>
        ) : (
          <ChunkyButton
            label="Enter parent zone"
            tone="grape"
            size="md"
            onPress={() => {
              setGateError(null);
              setGateOpen(true);
            }}
          />
        )}
      </Panel>

      {zoneUnlocked ? (
        <>
          <Panel style={styles.block}>
            <Text style={type.h2}>Practice report</Text>
            <Text style={type.small}>Everything here comes from what your reader has done on this device.</Text>
            <View style={styles.pillRow}>
              <StatPill icon={<PawIcon size={20} />} value={practiced} label="words spelled" />
              <StatPill icon={<CheckIcon size={20} color={colors.successDark} />} value={`${accuracy}%`} label="accuracy" />
              <StatPill icon={<FlameIcon size={20} />} value={stats.bestCombo} label="best combo" />
            </View>
            <Divider />
            <InfoRow label="Levels cleared" value={`${stats.levelsCleared}`} />
            <InfoRow label="Play sessions" value={`${stats.sessions}`} />
            <InfoRow label="Eggs hatched" value={`${stats.eggsHatched}`} />
            <InfoRow label="Stars collected" value={`${totalStars}`} />
            <InfoRow label="Days in a row" value={`${streak.count}`} />
            <InfoRow label="Lifetime XP" value={`${lifetime}`} />
          </Panel>

          <Panel style={styles.block}>
            <Text style={type.h2}>Accuracy by word type</Text>
            <Text style={type.small}>Where the reading is strong and where it needs another run.</Text>
            <Divider />
            {TAG_ORDER.map((tag) => {
              const entry = stats.perTag[tag] ?? { correct: 0, wrong: 0 };
              const total = entry.correct + entry.wrong;
              const percent = total === 0 ? 0 : Math.round((entry.correct / total) * 100);
              return (
                <View key={tag} style={styles.tagRow}>
                  <View style={styles.tagHead}>
                    <Text style={type.bodyBold}>{TAG_LABELS[tag]}</Text>
                    <Text style={type.small}>
                      {total === 0 ? 'Not started yet' : `${percent}% of ${total} tries`}
                    </Text>
                  </View>
                  <ProgressBar value={percent} max={100} gradient={barGradient(percent)} height={12} />
                </View>
              );
            })}
          </Panel>

          <Panel style={styles.block}>
            <View style={styles.blockTitle}>
              <TrophyIcon size={22} />
              <Text style={type.h2}>Words worth another run</Text>
            </View>
            {trickyWords.length === 0 ? (
              <Text style={type.small}>Nothing to fix yet. Every word so far has landed on the first try.</Text>
            ) : (
              <View style={styles.chipRow}>
                {trickyWords.map((item) => (
                  <View key={item.word} style={styles.chip}>
                    <Text style={styles.chipWord}>{item.word}</Text>
                    <Text style={styles.chipCount}>{`${item.wrong} misses`}</Text>
                  </View>
                ))}
              </View>
            )}
            <Divider />
            <Text style={type.small}>
              Tip: read these words out loud together and tap the speaker in a level to hear them again.
            </Text>
          </Panel>

          <Panel style={styles.block}>
            <View style={styles.blockTitle}>
              <SparkleIcon size={22} />
              <Text style={type.h2}>Spelling voice</Text>
            </View>
            <Text style={type.small}>
              EvoABC uses the good voices already built into this device instead of a tinny computer voice. Now using:{' '}
              {voiceLabel}.
            </Text>
            <View style={styles.voiceList}>
              {installedVoices.length === 0 ? (
                <Text style={type.small}>
                  The device did not offer any voices to choose from, so the system default will read the words.
                </Text>
              ) : (
                installedVoices.slice(0, VOICE_ROWS).map((voice) => {
                  const active = activeVoiceId === voice.id;
                  return (
                    <Pressable
                      key={voice.id}
                      onPress={() => chooseVoice(voice.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Use the voice ${voice.name}`}
                      accessibilityState={{ selected: active }}
                      style={[styles.voiceRow, active ? styles.voiceRowActive : null]}
                    >
                      <View style={styles.voiceBadge}>
                        <MicIcon size={18} color={active ? colors.successDark : colors.inkFaint} />
                      </View>
                      <View style={styles.voiceText}>
                        <Text style={type.bodyBold} numberOfLines={1}>
                          {voice.name}
                        </Text>
                        <Text style={type.small} numberOfLines={1}>
                          {voice.note}
                        </Text>
                      </View>
                      {active ? <CheckIcon size={20} color={colors.successDark} /> : null}
                    </Pressable>
                  );
                })
              )}
            </View>
            <ChunkyButton label="Hear this voice" tone="gem" size="md" onPress={previewVoice} />
            <ChunkyButton label="Use the best available voice" tone="bone" size="md" onPress={() => chooseVoice(null)} />
            <Divider />
            <Text style={type.small}>
              For the clearest spelling voice a grown up can download an Enhanced or Premium voice in the device settings, under
              Accessibility, then Spoken Content, then Voices. The app picks the best one it can find automatically.
            </Text>
          </Panel>

          <Panel style={styles.block}>
            <View style={styles.blockTitle}>
              <CoinIcon size={22} />
              <Text style={type.h2}>Start over</Text>
            </View>
            <Text style={type.small}>
              This erases the dinosaur, coins, gems, eggs and every star. It cannot be undone.
            </Text>
            <ChunkyButton label="Reset all progress" tone="danger" size="md" onPress={() => setConfirmReset(true)} />
          </Panel>
        </>
      ) : null}

      <Panel style={styles.block}>
        <View style={styles.blockTitle}>
          <EggIcon size={22} />
          <Text style={type.h2}>About EvoABC</Text>
        </View>
        <InfoRow label="Version" value="1.1.0" />
        <InfoRow label="Levels" value="29 regions, 174 levels" />
        <InfoRow label="Words" value="288 first grade words" />
        <InfoRow label="Storage" value="Saved on this device only" />
        <Divider />
        <Text style={type.small}>
          EvoABC teaches ten units in order, from short vowels through letter teams, blends, tricky letters like ph and quiet
          k, magic e, vowel teams, bossy r and bigger words, all the way to heart words and long kaiju words. My Spelling Test
          can also teach the exact words from a school list until the child passes them here.
        </Text>
      </Panel>

      <GameModal
        visible={gateOpen}
        badge="Grown ups only"
        title="What is 7 x 4?"
        message="Answer to open the practice report."
        gradient={gradients.grape}
        onDismiss={() => setGateOpen(false)}
        actions={[{ label: 'Close', tone: 'bone', onPress: () => setGateOpen(false) }]}
      >
        <View style={styles.choiceGrid}>
          {GATE_CHOICES.map((value) => (
            <View key={`gate-${value}`} style={styles.choiceCell}>
              <ChunkyButton label={`${value}`} tone="bone" size="md" onPress={() => answerGate(value)} />
            </View>
          ))}
        </View>
        {gateError !== null ? <Text style={styles.gateError}>{gateError}</Text> : null}
      </GameModal>

      <GameModal
        visible={confirmReset}
        badge="Parent zone"
        title="Reset everything?"
        message="Your dinosaur, tokens, eggs and stars would all be gone. This cannot be undone."
        gradient={gradients.lava}
        onDismiss={() => setConfirmReset(false)}
        actions={[
          { label: 'Keep my progress', tone: 'jungle', onPress: () => setConfirmReset(false) },
          { label: 'Reset all progress', tone: 'danger', onPress: finishReset },
        ]}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.md, gap: spacing.xs },
  blockTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm, minHeight: 56 },
  toggleBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardAlt,
    borderWidth: 2,
    borderColor: colors.cardLine,
  },
  toggleText: { flex: 1, flexShrink: 1 },
  speedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  paceGroup: { marginTop: spacing.md, gap: spacing.xs },
  paceHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52 },
  paceBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardAlt,
    borderWidth: 2,
    borderColor: colors.cardLine,
  },
  paceText: { flex: 1, flexShrink: 1 },
  voiceBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.cardLine,
  },
  parentOpen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap', marginTop: spacing.sm },
  pillRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  tagRow: { paddingVertical: spacing.sm, gap: 4 },
  tagHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: { backgroundColor: '#FFF0F1', borderColor: '#FFBFC3', borderWidth: 2, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: 6, alignItems: 'center' },
  chipWord: { fontFamily: fonts.displayMid, fontSize: 17, color: colors.dangerDark },
  chipCount: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', marginTop: spacing.sm, rowGap: spacing.sm },
  choiceCell: { width: '48%' },
  voiceList: { gap: spacing.sm, marginTop: spacing.sm },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.cardLine,
    backgroundColor: colors.cardAlt,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 58,
  },
  voiceRowActive: { borderColor: colors.success, backgroundColor: '#E9FBF1' },
  voiceText: { flex: 1, flexShrink: 1 },
  gateError: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dangerDark, textAlign: 'center', marginTop: spacing.sm },
});
