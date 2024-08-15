import React from 'react';
import PropTypes from 'prop-types';
import {
  usePockestContext,
} from '../../contexts/PockestContext';
import isMatchDiscovery from '../../utils/isMatchDiscovery';
import getMatchReportString from '../../utils/getMatchReportString';
import { postDiscordMatch, getDiscordCooldown, getDiscordReportStatus } from '../../utils/postDiscord';
import './index.css';

function MatchDiscoveryLog({
  title,
  rows,
}) {
  const [discordCooldown, setDiscordCooldown] = React.useState(getDiscordCooldown() || 0);
  const textAreaEl = React.useRef();
  const {
    pockestState,
  } = usePockestContext();
  const contentData = React.useMemo(
    () => {
      const d = pockestState?.log?.filter((entry) => ['exchange'].includes(entry.logType));
      return d.filter((entry) => entry.logType === 'exchange' && isMatchDiscovery(pockestState, entry));
    },
    [pockestState],
  );
  const content = React.useMemo(() => contentData.map((entry) => getMatchReportString({
    pockestState,
    result: entry,
    isRelTime: true,
  })).join('\n'), [contentData, pockestState]);
  React.useEffect(() => {
    if (!textAreaEl?.current) return () => {};
    textAreaEl.current.scrollTop = textAreaEl.current.scrollHeight;
    return () => {};
  }, [content]);
  React.useEffect(() => {
    const interval = window.setInterval(() => {
      const newCooldown = getDiscordCooldown();
      setDiscordCooldown(newCooldown);
    }, 500);
    return () => {
      window.clearInterval(interval);
    };
  }, []);
  if (!contentData?.length) return '';
  return (
    <div className="MatchDiscoveryLog">
      <header className="MatchDiscoveryLog-header">
        <p className="MatchDiscoveryLog-title">
          {title}
          {' '}
          (
          {contentData?.length || 0}
          )
        </p>
      </header>
      <div className="MatchDiscoveryLog-content">
        <textarea
          ref={textAreaEl}
          className="PockestTextArea MatchDiscoveryLog-textarea"
          value={`[Pockest Helper v${import.meta.env.APP_VERSION}]\n${content}`}
          readOnly
          rows={rows}
        />
        <div
          className="MatchDiscoveryLog-buttons"
        >
          <button
            type="button"
            className="PockestLink MatchDiscoveryLog-copy"
            aria-label={`Copy ${title.toLowerCase()} to clipboard`}
            onClick={() => navigator.clipboard.writeText(content)}
          >
            📋 Copy
          </button>
          {!getDiscordReportStatus() ? (
            <button
              type="button"
              className="PockestLink MatchDiscoveryLog-clear"
              aria-label={`Clear ${title.toLowerCase()}`}
              onClick={async () => {
                if (discordCooldown) return;
                await postDiscordMatch({ content });
              }}
              disabled={discordCooldown}
              title={discordCooldown ? 'Please wait 60 seconds before submitting again' : 'Manually submit a report in automated report failed'}
            >
              💬 Discord Report
              {discordCooldown ? ` (${discordCooldown})` : ''}
            </button>
          ) : ''}
        </div>
      </div>
    </div>
  );
}

MatchDiscoveryLog.defaultProps = {
  title: 'Log',
  rows: 12,
};

MatchDiscoveryLog.propTypes = {
  title: PropTypes.string,
  rows: PropTypes.number,
};

export default MatchDiscoveryLog;
