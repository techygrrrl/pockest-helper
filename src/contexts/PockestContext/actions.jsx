import fetchAllMonsters from '../../utils/fetchAllMonsters';
import fetchAllHashes from '../../utils/fetchAllHashes';
import postDiscord from '../../utils/postDiscord';
import isMatchDiscovery from '../../utils/isMatchDiscovery';
import getMatchReportString from '../../utils/getMatchReportString';
import {
  getAutoPlanSettings,
  fetchPockestStatus,
  getDefaultLogEntry,
  getResLogEntry,
} from './getters';
import { ACTIONS } from './reducer';
import { getCurrentTargetMonsterPlan } from '../../utils/getTargetMonsterPlan';
import getDeathTimer from '../../utils/getDeathTimer';
import daysToMs from '../../utils/daysToMs';

export function pockestLoading() {
  return [ACTIONS.LOADING];
}
export function pockestPause(paused) {
  return [ACTIONS.PAUSE, {
    paused,
  }];
}
export function pockestSettings(settings) {
  return [ACTIONS.SETTINGS, settings];
}
export function pockestPlanSettings(pockestState) {
  const newSettings = getAutoPlanSettings(pockestState);
  return [ACTIONS.SETTINGS, newSettings];
}
export async function pockestUpdate(pockestState, data, args = {}) {
  const newLogs = [];
  try {
    const payload = { data };

    // Add any new log entries
    const dataEventLogEntry = getResLogEntry(pockestState, data, args);
    if (dataEventLogEntry) newLogs.push(dataEventLogEntry);
    if (data?.monster && pockestState?.data?.monster?.hash !== data?.monster?.hash) {
      newLogs.push({
        ...getDefaultLogEntry(pockestState, data, args),
        logType: 'age',
        monsterBefore: pockestState?.data?.monster,
      });
    }

    // Discord reporting for age 5 monsters
    if (data?.monster && pockestState?.data?.monster?.hash !== data?.monster?.hash
        && data?.monster?.age >= 5) {
      const reports = [];
      const matchingHash = pockestState?.allHashes
        .find((m2) => m2?.id === data?.monster?.hash);
      if (!matchingHash) {
        reports.push(`New monster: ${data?.monster?.name_en}: ${data?.monster?.hash} (P: ${data?.monster?.power}, S: ${data?.monster?.speed}, T: ${data?.monster?.technic})`);
      }
      const matchingMementoHash = pockestState?.allHashes
        .find((m2) => m2?.id === data?.monster?.memento_hash);
      if (!matchingMementoHash) {
        reports.push(`New memento: ${data?.monster?.memento_name_en}: ${data?.monster?.memento_hash} (${data?.monster?.name_en})`);
      }
      if (reports.length) {
        const missingReport = `[Pockest Helper v${import.meta.env.APP_VERSION}]\n${reports.join('\n')}`;
        postDiscord(missingReport);
      }
    }

    // Payload updates
    const now = (new Date()).getTime();
    const birthTimestamp = pockestState?.eggTimestamp === data?.monster?.live_time
      ? pockestState?.eggTimestamp
      : data?.monster?.live_time;
    const deathTimestamp = getDeathTimer({
      ...pockestState,
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
    if (data?.event === 'training') {
      payload.statLog = [
        ...pockestState.statLog,
        data?.training?.type,
      ];
    }
    if (data?.event === 'cleaning') {
      payload.cleanTimestamp = now;
    }
    if (data?.event === 'hatching') {
      payload.eggId = args?.eggType;
      payload.eggTimestamp = data?.monster?.live_time;
    }
    if (pockestState.autoPlan) {
      const targetMonsterPlan = getCurrentTargetMonsterPlan({
        ...pockestState,
        ...payload,
        data,
      });
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
    if (newLogs.length) {
      payload.log = [
        ...pockestState.log,
        ...newLogs,
      ];
    }
    return [ACTIONS.UPDATE, payload];
  } catch (error) {
    return [ACTIONS.ERROR, `[pockestUpdate] ${error?.message}`];
  }
}
export async function pockestStatus(pockestState) {
  try {
    const data = await fetchPockestStatus();
    return await pockestUpdate(pockestState, data);
  } catch (error) {
    return [ACTIONS.ERROR, `[pockestStatus] ${error?.message}`];
  }
}
export async function pockestFeed(pockestState) {
  try {
    const url = 'https://www.streetfighter.com/6/buckler/api/minigame/serving';
    const response = await fetch(url, {
      body: '{"type":1}',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`API ${response.status} response (${url})`);
    const resJson = await response.json();
    const data = {
      event: resJson.event,
      ...resJson.data,
    };
    return await pockestUpdate(pockestState, data);
  } catch (error) {
    return [ACTIONS.ERROR, `[pockestFeed] ${error?.message}`];
  }
}
export async function pockestCure(pockestState) {
  try {
    const url = 'https://www.streetfighter.com/6/buckler/api/minigame/cure';
    const response = await fetch(url, {
      body: '{"type":1}',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`API ${response.status} response (${url})`);
    const resJson = await response.json();
    const data = {
      event: resJson.event,
      ...resJson.data,
    };
    return await pockestUpdate(pockestState, data);
  } catch (error) {
    return [ACTIONS.ERROR, `[pockestCure] ${error?.message}`];
  }
}
export async function pockestClean(pockestState) {
  try {
    const url = 'https://www.streetfighter.com/6/buckler/api/minigame/cleaning';
    const response = await fetch(url, {
      body: '{"type":1}',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`API ${response.status} response (${url})`);
    const resJson = await response.json();
    const data = {
      event: resJson.event,
      ...resJson.data,
    };
    return await pockestUpdate(pockestState, data);
  } catch (error) {
    return [ACTIONS.ERROR, `[pockestClean] ${error?.message}`];
  }
}
export async function pockestTrain(pockestState, type) {
  try {
    if (type < 1 || type > 3) {
      throw new Error(`Invalid param: type needs to be 1, 2, or 3. Received ${type}.`);
    }
    const url = 'https://www.streetfighter.com/6/buckler/api/minigame/training';
    const response = await fetch(url, {
      body: `{"type":${type}}`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`API ${response.status} response (${url})`);
    const resJson = await response.json();
    const data = {
      event: resJson.event,
      ...resJson.data,
    };
    if (data?.event !== 'training') {
      throw new Error(`Buckler Response: ${data?.event || data?.message}`);
    }
    return await pockestUpdate(pockestState, data, { type });
  } catch (error) {
    return [ACTIONS.ERROR, `[pockestTrain] ${error?.message}`];
  }
}
export async function pockestMatch(pockestState, match) {
  try {
    if (match?.slot < 1) {
      throw new Error(`Invalid param: slot needs to be > 1, receive ${match}`);
    }
    const url = 'https://www.streetfighter.com/6/buckler/api/minigame/exchange/start';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ slot: match?.slot }),
    });
    if (!response.ok) throw new Error(`API ${response.status} response (${url})`);
    const resJson = await response.json();
    const data = {
      event: resJson.event,
      ...resJson.data,
    };
    if (data?.exchangable === false) {
      throw new Error(`Buckler Response: ${data?.event || data?.message}`);
    }
    const isDisc = isMatchDiscovery(pockestState, data.result);
    if (isDisc) {
      const report = `[Pockest Helper v${import.meta.env.APP_VERSION}]\n${getMatchReportString({
        pockestState,
        result: data.result,
      })}`;
      postDiscord(report);
    }
    return await pockestUpdate(pockestState, data, { match });
  } catch (error) {
    return [ACTIONS.ERROR, `[pockestMatch] ${error?.message}`];
  }
}
export async function pockestSelectEgg(pockestState, id) {
  try {
    if (id < 1) throw new Error(`Invalid param: id needs to be > 0, received ${id}`);
    const url = 'https://www.streetfighter.com/6/buckler/api/minigame/eggs';
    const response = await fetch(url, {
      body: `{"id":${id}}`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`API ${response.status} response (${url})`);
    const resJson = await response.json();
    const data = {
      event: resJson.event,
      ...resJson.data,
    };
    return await pockestUpdate(pockestState, data, { id });
  } catch (error) {
    return [ACTIONS.ERROR, `[pockestSelectEgg] ${error?.message}`];
  }
}
export function pockestClearLog(pockestState, logTypes) {
  if (!Array.isArray(logTypes)) {
    return [ACTIONS.ERROR, `[pockestClearLog] logTypes ${logTypes} needs to be an array`];
  }
  const newLog = pockestState?.log
    ?.filter((entry) => !logTypes.includes(entry.logType)
    || entry.timestamp >= pockestState?.data?.monster?.live_time);
  return [ACTIONS.SET_LOG, newLog];
}
export async function pockestInit() {
  try {
    const [
      allMonsters,
      allHashes,
    ] = await Promise.all([
      fetchAllMonsters(),
      fetchAllHashes(),
    ]);
    return [ACTIONS.INIT, {
      allMonsters,
      allHashes,
    }];
  } catch (error) {
    return [ACTIONS.ERROR, `[pockestInit] ${error?.message}`];
  }
}
export function pockestInvalidateSession() {
  return [ACTIONS.INVALIDATE_SESSION];
}
export function pockestErrorHatchSync(errMsg) {
  return [ACTIONS.ERROR_HATCH_SYNC, errMsg];
}
