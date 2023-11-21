import React from 'react';
import {
  pockestLoading,
  pockestClean,
  pockestFeed,
  pockestTrain,
  pockestMatch,
  usePockestContext,
} from '../../contexts/PockestContext';
import { parseDuration } from '../../utils/parseDuration';
import { getMonsterPlan, getPlanRoute, getPlanStat } from '../../utils/getMonsterPlan';
import getMatchFever from '../../utils/getMatchFever';

function LifeCycle() {
  const { pockestState, pockestDispatch } = usePockestContext();
  const {
    data,
    loading,
    autoPlan,
    autoClean,
    autoFeed,
    autoTrain,
    monsterId,
    paused,
  } = pockestState;
  const monsterPlan = React.useMemo(() => autoPlan
    && getMonsterPlan(monsterId), [autoPlan, monsterId]);
  const planRoute = React.useMemo(() => autoPlan && getPlanRoute(
    monsterPlan,
    data?.monster?.age,
  ), [autoPlan, data?.monster?.age, monsterPlan]);
  const stat = React.useMemo(() => {
    if (!autoPlan) return pockestState.stat;
    return getPlanStat(monsterPlan);
  }, [monsterPlan, autoPlan, pockestState]);
  const cleanFrequency = React.useMemo(() => {
    if (!autoPlan) return pockestState.cleanFrequency;
    return planRoute.cleanFrequency;
  }, [autoPlan, pockestState.cleanFrequency, planRoute.cleanFrequency]);
  const feedFrequency = React.useMemo(() => {
    if (!autoPlan) return pockestState.feedFrequency;
    return planRoute.feedFrequency;
  }, [autoPlan, pockestState.feedFrequency, planRoute.feedFrequency]);
  React.useEffect(() => {
    const interval = window.setInterval(async () => {
      if (loading || paused) return;
      const now = new Date();
      const {
        monster,
      } = data;
      const alive = parseDuration(now - new Date(monster.live_time));
      const aliveH = Math.floor(alive.h);
      const attemptToClean = autoClean && monster && monster?.garbage > 0;
      if (attemptToClean && (cleanFrequency === 2 || aliveH % cleanFrequency === 0)) {
        console.log(now, 'CLEAN');
        pockestDispatch(pockestLoading());
        pockestDispatch(await pockestClean());
      }
      const attemptToFeed = autoFeed && monster && monster?.stomach < 6;
      if (attemptToFeed && (feedFrequency === 4 || aliveH % feedFrequency === 0)) {
        console.log(now, 'FEED');
        pockestDispatch(pockestLoading());
        pockestDispatch(await pockestFeed());
      }
      const nextTrainingTime = monster?.training_time
        && new Date(monster?.training_time);
      if (autoTrain && nextTrainingTime && now >= nextTrainingTime) {
        console.log(now, 'TRAIN', stat);
        pockestDispatch(pockestLoading());
        pockestDispatch(await pockestTrain(stat));
      }

      const nextMatchTime = monster?.exchange_time
        && new Date(monster?.exchange_time);
      if (autoPlan && new Date() >= nextMatchTime) {
        const matchSlot = await getMatchFever(monsterId);
        console.log(now, 'MATCH', matchSlot);
        pockestDispatch(pockestLoading());
        pockestDispatch(await pockestMatch(matchSlot || 1));
      }
    }, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [
    loading,
    autoPlan,
    monsterId,
    data,
    autoClean,
    cleanFrequency,
    autoFeed,
    feedFrequency,
    autoTrain,
    stat,
    pockestDispatch,
    paused,
  ]);
}

export default LifeCycle;
