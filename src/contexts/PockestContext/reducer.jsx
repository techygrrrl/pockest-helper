import log from '../../utils/log';
import {
  getDefaultLogEntry,
} from './getters';

export const ACTIONS = {
  INIT: 'POCKEST_INIT',
  INVALIDATE_SESSION: 'POCKEST_INVALIDATE_SESSION',
  UPDATE: 'POCKEST_UPDATE',
  LOADING: 'POCKEST_LOADING',
  PAUSE: 'POCKEST_PAUSE',
  ERROR: 'POCKEST_ERROR',
  ERROR_HATCH_SYNC: 'POCKEST_ERROR_HATCH_SYNC',
  SETTINGS: 'POCKEST_SETTINGS',
  SET_LOG: 'POCKEST_SET_LOG',
};

export default function REDUCER(state, [type, payload]) {
  log('STATE CHANGE', { state, type, payload });
  switch (type) {
    case ACTIONS.LOADING:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case ACTIONS.SETTINGS:
      return {
        ...state,
        monsterId: payload.monsterId ?? state?.monsterId,
        planId: payload.planId ?? state?.planId,
        statPlanId: payload.statPlanId ?? state?.statPlanId,
        planAge: payload.planAge ?? state?.planAge,
        autoPlan: payload.autoPlan ?? state?.autoPlan,
        autoFeed: payload.autoFeed ?? state?.autoFeed,
        autoClean: payload.autoClean ?? state?.autoClean,
        autoTrain: payload.autoTrain ?? state?.autoTrain,
        autoMatch: payload.autoMatch ?? state?.autoMatch,
        cleanFrequency: payload.cleanFrequency ?? state?.cleanFrequency,
        feedFrequency: payload.feedFrequency ?? state?.feedFrequency,
        feedTarget: payload.feedTarget ?? state?.feedTarget,
        stat: payload.stat ?? state?.stat,
        matchPriority: payload.matchPriority ?? state?.matchPriority,
        autoCure: payload.autoCure ?? state?.autoCure,
      };
    case ACTIONS.PAUSE:
      return {
        ...state,
        paused: payload.paused ?? state?.paused,
      };
    case ACTIONS.INIT:
      return {
        ...state,
        initialized: true,
        loading: false,
        allMonsters: payload?.allMonsters,
        allHashes: payload?.allHashes,
      };
    case ACTIONS.UPDATE:
      return {
        ...state,
        ...payload,
        loading: false,
      };
    case ACTIONS.SET_LOG:
      return {
        ...state,
        log: payload,
      };
    case ACTIONS.INVALIDATE_SESSION:
      return {
        ...state,
        paused: true,
        invalidSession: true,
      };
    case ACTIONS.ERROR:
      return {
        ...state,
        loading: false,
        error: payload,
        log: [
          ...state.log,
          {
            ...getDefaultLogEntry(state),
            logType: 'error',
            error: `${payload}`,
          },
        ],
      };
    case ACTIONS.ERROR_HATCH_SYNC:
      return {
        ...state,
        error: payload,
        eggId: null,
        eggTimestamp: state?.data?.monster?.live_time,
        statLog: state?.log?.filter((entry) => entry.timestamp > state?.data?.monster?.live_time && entry.logType === 'training').map((e) => e.type) ?? [],
        log: [
          ...state.log,
          {
            ...getDefaultLogEntry(state),
            logType: 'error',
            error: `${payload}`,
          },
        ],
      };
    default:
      return { ...state };
  }
}
