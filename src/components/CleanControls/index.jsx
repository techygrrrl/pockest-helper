import React from 'react';
import {
  pockestSettings,
  usePockestContext,
  getCurrentPlanScheduleWindows,
} from '../../contexts/PockestContext';
import './index.css';
import useNow from '../../hooks/useNow';
import { parseDurationStr } from '../../utils/parseDuration';
import getGarbageTimer from '../../utils/getGarbageTimer';
import LogCountLine from '../LogCountLine';

// CONSTS
const CLEAN_INTERVAL = {
  2: 'Every 2h',
  4: 'Every 4h',
  12: 'Every 12h',
  24: 'Every 24h',
  36: 'Every 36h',
};

function CleanControls() {
  const {
    pockestState,
    pockestDispatch,
  } = usePockestContext();
  const now = useNow();
  const {
    currentCleanWindow,
    nextCleanWindow,
  } = React.useMemo(() => getCurrentPlanScheduleWindows(pockestState), [pockestState]);
  const garbageTimer = React.useMemo(() => getGarbageTimer(pockestState), [pockestState]);

  const {
    data,
    autoPlan,
    autoClean,
    paused,
    cleanFrequency,
  } = pockestState;
  return (
    <div className="CleanControls">
      <div className="PockestLine">
        <label className="PockestCheck" htmlFor="PockestHelper_AutoClean">
          <input
            id="PockestHelper_AutoClean"
            className="PockestCheck-input"
            type="checkbox"
            onChange={(e) => pockestDispatch(pockestSettings({ autoClean: e.target.checked }))}
            checked={autoClean}
            disabled={!paused || autoPlan}
          />
          <span className="PockestCheck-text">Clean</span>
        </label>
        <span className="PockestText">
          <span className="PockestIcon">💩</span>
          {' '}
          {typeof data?.monster?.garbage === 'number' ? `${data?.monster?.garbage}/12` : '--'}
        </span>
      </div>
      <div className="PockestLine">
        <span className="PockestText">
          Next Poop
        </span>
        <span className="PockestText PockestLine-value">
          {(() => {
            const nextSmall = data?.next_small_event_timer;
            if (!nextSmall) return '--';
            if (!garbageTimer) return '??';
            return parseDurationStr(garbageTimer - now.getTime());
          })()}
        </span>
      </div>
      <div className="PockestLine">
        <span className="PockestText">Clean Frequency</span>
        <select
          className="PockestSelect"
          onChange={(e) => {
            pockestDispatch(pockestSettings({ cleanFrequency: parseInt(e.target.value, 10) }));
          }}
          value={cleanFrequency}
          disabled={!paused || autoPlan}
        >
          {Object.keys(CLEAN_INTERVAL).map((k) => (
            <option key={k} value={k}>
              {CLEAN_INTERVAL[k]}
            </option>
          ))}
        </select>
      </div>
      <div className="PockestLine">
        <span className="PockestText">
          Next Clean
        </span>
        <span className="PockestText PockestLine-value">
          {(() => {
            if (cleanFrequency === 2 || !nextCleanWindow) return '--';
            return parseDurationStr(nextCleanWindow.start - now.getTime());
          })()}
        </span>
      </div>
      <div className="PockestLine">
        <span className="PockestText">
          Current Clean
        </span>
        <span className="PockestText PockestLine-value">
          {(() => {
            if (cleanFrequency === 2) return '∞';
            if (!currentCleanWindow) return '--';
            return parseDurationStr(currentCleanWindow.end - now.getTime());
          })()}
        </span>
      </div>
      <LogCountLine
        title="Cleanings"
        logTypes={['cleaning']}
      />
    </div>
  );
}

export default CleanControls;
