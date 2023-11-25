import React from 'react';
import {
  getMonsterId,
  pockestSettings,
  usePockestContext,
} from '../../contexts/PockestContext';
import useMonsters from '../../hooks/useMonsters';

function TargetMonsterSelect() {
  const allMonsters = useMonsters();
  const {
    pockestState,
    pockestDispatch,
  } = usePockestContext();
  const availableMonsters = React.useMemo(() => {
    const monster = pockestState?.data?.monster;
    const curMonsterId = getMonsterId(pockestState);
    if (!curMonsterId) {
      return allMonsters?.filter((m) => m?.age >= 5)
        .sort((a, b) => {
          if (a.name_en < b.name_en) return -1;
          if (b.name_en < a.name_en) return 1;
          return 0;
        });
    }
    const allAvailIds = allMonsters?.filter((m) => m?.age > monster?.age)
      .reduce((all, m) => {
        const match = m.from.find((pid) => pid === curMonsterId || all.includes(pid));
        if (!match) return all;
        return [
          ...all,
          m.monster_id,
        ];
      }, [curMonsterId]);
    return allMonsters
      .filter((m) => m?.age >= 5 && allAvailIds.includes(m?.monster_id))
      .sort((a, b) => {
        if (a.name_en < b.name_en) return -1;
        if (b.name_en < a.name_en) return 1;
        return 0;
      });
  }, [pockestState, allMonsters]);
  const {
    monsterId,
    paused,
  } = pockestState;
  if (!allMonsters?.length) return '';
  return (
    <select
      className="PockestSelect"
      onChange={(e) => {
        pockestDispatch(pockestSettings({ monsterId: parseInt(e.target.value, 10) }));
      }}
      defaultValue={`${monsterId}`}
      disabled={!paused}
    >
      <option key="default" value="">
        --
      </option>
      {availableMonsters.map((monster) => (
        <option key={monster?.monster_id} value={monster?.monster_id}>
          {monster.name_en}
        </option>
      ))}
    </select>
  );
}

export default TargetMonsterSelect;
