import getTimeIntervals from '../../utils/getTimeIntervals';
import getTotalStats from '../../utils/getTotalStats';
import getTargetMonsterPlan, { getCurrentTargetMonsterPlan } from '../../utils/getTargetMonsterPlan';
import getDeathTimer from '../../utils/getDeathTimer';
import { MONSTER_LIFESPAN } from '../../utils/getAgeTimer';
import daysToMs from '../../utils/daysToMs';
import getMonsterIdFromHash from '../../utils/getMonsterIdFromHash';

export function getDefaultLogEntry(state) {
  return {
    logType: 'error',
    timestamp: Date.now(),
    monsterId: getMonsterIdFromHash(state?.data?.monster?.hash),
    monsterBirth: state?.data?.monster?.live_time,
  };
}

export function getResLogEntry(state, data, args = {}) {
  const eventsToLog = [
    'death',
    'departure',
    'cure',
    'exchange',
    'training',
    'cleaning',
    'meal',
    'hatching',
  ];
  if (!eventsToLog.includes(data?.event)) return null;
  const logEntry = {
    ...getDefaultLogEntry({
      ...state,
      data,
    }),
    logType: data?.event,
  };
  if (data?.event === 'exchange') {
    return {
      ...logEntry,
      ...data?.exchangeResult,
      totalStats: getTotalStats(data?.monster) + getTotalStats(args?.match),
      target_monster_name_en: args?.match?.name_en,
    };
  }
  if (data?.event === 'training') {
    return {
      ...logEntry,
      ...data?.training,
    };
  }
  if (data?.event === 'meal') {
    return {
      ...logEntry,
      ...data?.serving,
      stomach: data?.monster?.stomach,
    };
  }
  if (data?.event === 'cleaning') {
    return {
      ...logEntry,
      ...data?.cleaning,
      garbageBefore: state?.data?.monster?.garbage,
    };
  }
  if (data?.event === 'hatching') {
    return {
      ...logEntry,
      eggType: args.id,
      timestamp: data?.monster?.live_time,
    };
  }
  return logEntry;
}

export async function fetchMatchList() {
  const url = 'https://www.streetfighter.com/6/buckler/api/minigame/exchange/list';
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API ${response.status} response (${url})`);
  const { data } = await response.json();
  return data;
}

export async function fetchPockestStatus() {
  const url = 'https://www.streetfighter.com/6/buckler/api/minigame/status';
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API ${response.status} response (${url})`);
  const resJson = await response.json();
  const data = {
    event: resJson?.event || resJson?.message || resJson?.data?.message,
    ...resJson?.data,
  };
  return data;
}

export function getMonsterId(state) {
  const hashId = state?.data?.monster?.hash;
  if (!hashId) return null;
  return parseInt(hashId.slice(0, 4), 10);
}

export async function getBestMatch(state, exchangeList) {
  const monsterId = getMonsterId(state);
  const monster = state?.allMonsters?.find((m) => m.monster_id === monsterId);
  const sortedMatches = exchangeList?.map((a) => {
    const aMulti = monster?.matchFever?.includes(a.monster_id) ? 1.5 : 1;
    return {
      ...a,
      expectedPoints: getTotalStats(a) * aMulti,
    };
  })?.sort((a, b) => {
    if (state?.matchPriority === 0) {
      const aSusFever = monster?.matchSusFever?.includes(a.monster_id);
      const bSusFever = monster?.matchSusFever?.includes(b.monster_id);
      if (aSusFever && !bSusFever) return -1;
      if (bSusFever && !aSusFever) return 1;
      const aUnknown = monster?.matchUnknown?.includes(a.monster_id);
      const bUnknown = monster?.matchUnknown?.includes(b.monster_id);
      if (aUnknown && !bUnknown) return -1;
      if (bUnknown && !aUnknown) return 1;
      const aSusNormal = monster?.matchSusNormal?.includes(a.monster_id);
      const bSusNormal = monster?.matchSusNormal?.includes(b.monster_id);
      if (aSusNormal && !bSusNormal) return -1;
      if (bSusNormal && !aSusNormal) return 1;
    }
    if (a.expectedPoints > b.expectedPoints) return -1;
    if (a.expectedPoints < b.expectedPoints) return 1;
    return 0;
  });
  return sortedMatches?.[0];
}

export function getOwnedMementoMonsterIds(state) {
  return state?.allMonsters
    ?.filter((m) => m?.memento_flg)
    .map((m) => m?.monster_id) ?? [];
}

export function getCurrentMonsterLogs(state, logType) {
  return state?.log.filter((entry) => {
    if (!state?.data?.monster) return false;
    if (logType && entry?.logType !== logType) return false;
    return entry.timestamp >= state?.data?.monster?.live_time;
  });
}

export function getCurrentPlanStats(state) {
  if (state?.autoPlan) {
    return getCurrentTargetMonsterPlan(state);
  }
  return {
    stat: state?.stat,
    cleanFrequency: state?.cleanFrequency,
    feedFrequency: state?.feedFrequency,
    feedTarget: state?.feedTarget,
  };
}

export function getPlanNeglectOffset(state) {
  let ageOffset = state?.planAge && state?.planAge > 1
    ? MONSTER_LIFESPAN[Math.max(1, state.planAge - 1)] : 0;
  if (state.planAge === 5) {
    // optimize planned age so we can die just 1 hour after evolution
    ageOffset -= (24 * 60 * 60 * 1000); // -1 day (2d)
  }
  return ageOffset;
}

export function getPlanStunOffset(state) {
  if (state?.planAge === 6) return null;
  const ageOffset = state?.planAge && state?.planAge > 1
    ? Math.max(0, MONSTER_LIFESPAN[Math.max(1, state.planAge - 1)] - (4 * 60 * 60 * 1000))
    : 0;
  return ageOffset;
}

export function getCurrentPlanSchedule(state) {
  const targetPlan = getTargetMonsterPlan(state);
  const birth = state?.data?.monster?.live_time;
  if (!birth) return {};
  const neglectOffset = getPlanNeglectOffset(state);
  const cleanSchedule = state?.autoPlan ? ['planDiv1', 'planDiv2', 'planDiv3']
    .reduce((fullSchedule, div) => {
      const spec = targetPlan[div];
      if (!spec) return fullSchedule;
      if (spec.startTime > neglectOffset) return fullSchedule;
      const start = birth + spec.startTime;
      const end = spec.endTime > neglectOffset ? birth + neglectOffset : birth + spec.endTime;
      const schedule = getTimeIntervals(
        start,
        end,
        state?.planAge === 5 && div === 'planDiv3' ? 6 : spec.cleanFrequency,
        spec.cleanOffset,
      );
      return [
        ...fullSchedule,
        ...schedule,
      ];
    }, []) : getTimeIntervals(
    birth,
    birth + 7 * 24 * 60 * 60 * 1000,
    state?.cleanFrequency,
    0,
  );
  const feedSchedule = state?.autoPlan ? ['planDiv1', 'planDiv2', 'planDiv3']
    .reduce((fullSchedule, div) => {
      const spec = targetPlan[div];
      if (!spec) return fullSchedule;
      if (spec.startTime > neglectOffset) return fullSchedule;
      const start = birth + spec.startTime;
      const end = spec.endTime > neglectOffset ? birth + neglectOffset : birth + spec.endTime;
      const schedule = getTimeIntervals(
        start,
        end,
        spec.feedFrequency,
        spec.feedOffset,
      ).map((s) => ({
        ...s,
        feedTarget: spec.feedTarget,
      }));
      return [
        ...fullSchedule,
        ...schedule,
      ];
    }, []) : getTimeIntervals(
    birth,
    birth + 7 * 24 * 60 * 60 * 1000,
    state?.feedFrequency,
    0,
  );
  const trainSchedule = (Array.from(new Array(14))).reduce((fullSchedule, _unused, index) => {
    const startOffset = (12 * 60 * 60 * 1000) * index;
    if (startOffset > neglectOffset) return fullSchedule;
    return [
      ...fullSchedule,
      {
        start: birth + startOffset,
        stat: state?.statPlanId?.split('')?.[index] || state?.planId?.slice(-2, -1),
      },
    ];
  }, []);
  return {
    cleanSchedule,
    feedSchedule,
    trainSchedule,
  };
}

export function getCurrentPlanScheduleWindows(state) {
  const { cleanSchedule, feedSchedule } = getCurrentPlanSchedule(state);
  const now = new Date();
  const nextCleanWindow = cleanSchedule?.find((scheduleWindow) => now < scheduleWindow.start);
  const currentCleanWindow = cleanSchedule?.find(
    (scheduleWindow) => now >= scheduleWindow.start && now <= scheduleWindow.end,
  );
  const nextFeedWindow = feedSchedule?.find((scheduleWindow) => now < scheduleWindow.start);
  const currentFeedWindow = feedSchedule?.find(
    (scheduleWindow) => now >= scheduleWindow.start && now <= scheduleWindow.end,
  );
  return {
    nextCleanWindow,
    currentCleanWindow,
    nextFeedWindow,
    currentFeedWindow,
  };
}

export function getAutoPlanSettings(state, settingOverrides = {}) {
  const payload = {
    ...settingOverrides,
  };
  const data = state?.data;
  const now = Date.now();
  const birthTimestamp = state?.eggTimestamp === data?.monster?.live_time
    ? state?.eggTimestamp
    : data?.monster?.live_time;
  const deathTimestamp = getDeathTimer({
    ...state,
    data,
  });
  const isMonsterDead = data?.event === 'death' || now >= deathTimestamp;
  const isMonsterDeparted = data?.event === 'departure' || now >= (birthTimestamp + daysToMs(7));
  const isMonsterMissing = data?.event === 'monster_not_found';
  if (isMonsterDead || isMonsterDeparted || isMonsterMissing) {
    payload.autoPlay = true;
    payload.paused = true;
    payload.statLog = [];
    payload.eggId = null;
    payload.eggTimestamp = null;
  }
  if (settingOverrides.autoPlan ?? state.autoPlan) {
    const targetMonsterPlan = getCurrentTargetMonsterPlan({
      ...state,
      ...payload,
      data,
    });
    payload.autoPlan = true;
    payload.autoClean = true;
    payload.autoFeed = true;
    payload.autoTrain = true;
    payload.autoMatch = true;
    payload.autoCure = true;
    payload.planId = targetMonsterPlan?.planId;
    payload.statPlanId = targetMonsterPlan?.statPlanId;
    payload.planAge = targetMonsterPlan?.planAge;
    payload.stat = targetMonsterPlan?.stat;
    payload.cleanOffset = targetMonsterPlan?.cleanOffset;
    payload.feedOffset = targetMonsterPlan?.feedOffset;
    payload.cleanFrequency = targetMonsterPlan?.cleanFrequency;
    payload.feedFrequency = targetMonsterPlan?.feedFrequency;
    payload.feedTarget = targetMonsterPlan?.feedTarget;
  }
  return payload;
}
