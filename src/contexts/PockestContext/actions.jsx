import getTotalStats from '../../utils/getTotalStats';
import fetchAllMonsters from '../../utils/fetchAllMonsters';
import fetchAllHashes from '../../utils/fetchAllHashes';
import postDiscord from '../../utils/postDiscord';
import isMatchDiscovery from '../../utils/isMatchDiscovery';
import getMatchReportString from '../../utils/getMatchReportString';
import {
  getAutoPlanSettings,
  fetchPockestStatus,
  getLogEntry,
} from './getters';
import { ACTIONS } from './reducer';

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
export async function pockestRefresh(pockestState) {
  try {
    const data = await fetchPockestStatus();
    if (data?.monster && pockestState?.data?.monster?.hash !== data?.monster?.hash) {
      // add evolution to log
      data.result = {
        ...getLogEntry({ data }),
        logType: 'age',
        monsterBefore: pockestState?.data?.monster,
      };
      // send new lvl 5 monster data to discord
      if (data?.monster?.age >= 5) {
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
    }
    if (['death', 'departure'].includes(data?.event)) {
      const monster = data?.monster || pockestState?.data?.monster;
      data.result = getLogEntry({
        data: {
          ...data,
          monster,
        },
      });
    }
    return [ACTIONS.REFRESH, data];
  } catch (error) {
    return [ACTIONS.ERROR, `[pockestRefresh] ${error?.message}`];
  }
}
export async function pockestFeed() {
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
    data.result = {
      ...getLogEntry({ data }),
      ...data?.serving,
      stomach: data?.monster?.stomach,
    };
    return [ACTIONS.REFRESH, data];
  } catch (error) {
    return [ACTIONS.ERROR, `[pockestFeed] ${error?.message}`];
  }
}
export async function pockestCure() {
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
    data.result = {
      ...getLogEntry({ data }),
      ...data?.cure, // TODO: check that this is correct
    };
    return [ACTIONS.REFRESH, data];
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
    data.result = {
      ...getLogEntry({ data }),
      ...data?.cleaning,
      garbageBefore: pockestState?.data?.monster?.garbage,
    };
    return [ACTIONS.REFRESH, data];
  } catch (error) {
    return [ACTIONS.ERROR, `[pockestClean] ${error?.message}`];
  }
}
export async function pockestTrain(type) {
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
    data.result = {
      ...getLogEntry({ data }),
      ...data?.training,
    };
    return [ACTIONS.REFRESH, data];
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
    data.result = {
      ...getLogEntry({ data }),
      ...data?.exchangeResult,
      totalStats: getTotalStats(data?.monster) + getTotalStats(match),
      target_monster_name_en: match?.name_en,
    };
    const isDisc = isMatchDiscovery(pockestState, data.result);
    if (isDisc) {
      const report = `[Pockest Helper v${import.meta.env.APP_VERSION}]\n${getMatchReportString({
        pockestState,
        result: data.result,
      })}`;
      postDiscord(report);
    }
    return [ACTIONS.REFRESH, data];
  } catch (error) {
    return [ACTIONS.ERROR, `[pockestMatch] ${error?.message}`];
  }
}
export async function pockestSelectEgg(id) {
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
    data.result = {
      ...getLogEntry({ data }),
      eggType: id,
      timestamp: data?.monster?.live_time,
    };
    return [ACTIONS.REFRESH, data];
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
      data,
    ] = await Promise.all([
      fetchAllMonsters(),
      fetchAllHashes(),
      fetchPockestStatus(),
    ]);
    return [ACTIONS.INIT, {
      allMonsters,
      allHashes,
      data,
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
