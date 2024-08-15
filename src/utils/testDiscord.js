import { pockestGetters } from '../contexts/PockestContext';
import combineDiscordReports from './combineDiscordReports';
import { postDiscordTest } from './postDiscord';

const pockestState = JSON.parse(window.sessionStorage.PockestHelperState);
const matchData = {
  event: 'exchange',
  exchangeResult: {
    egg_get: false,
    egg_hash: '0006-mjDwuAKH',
    egg_id: 6,
    egg_name: '橙色のタマゴ',
    egg_name_en: 'Orange egg',
    egg_point_per_after: 88.87,
    egg_point_per_before: 83.76,
    get_egg_point: 895,
    get_memento_point: 0,
    is_spmatch: false,
    memento_get: false,
    memento_hash: '4001-URBpSzfv',
    memento_point_per_after: 100,
    memento_point_per_before: 100,
    target_monster_hash: '4066-VELEcUcu',
    target_monster_id: 4066,
  },
  monster: {
    age: 5,
    exchange_time: 1723842545000,
    exchange_time_par: 0,
    garbage: 2,
    hash: '4001-ffkNSQDX',
    live_time: 1723180652000,
    live_time_d: 1723180652000,
    max_memento_point: 5000,
    memento_flg: 0,
    memento_hash: '4001-URBpSzfv',
    memento_name: '殺意のグローブ',
    memento_name_en: 'Murderous Gloves',
    memento_point: 6863,
    name: '殺意リュウ',
    name_en: 'Evil Ryu',
    power: 3665,
    speed: 0,
    status: 1,
    stomach: 3,
    technic: 0,
    training_is_fever: false,
    training_time: 1723799343000,
    training_time_par: 0,
  },
  next_big_event_timer: 1723785452000,
  next_small_event_timer: 1723756652000,
  stamp: false,
};
const matchArgs = {
  match: {
    fighters_id: 'R. Mika',
    hash: '4066-VELEcUcu',
    monster_id: 4066,
    name: 'ファルケ',
    name_en: 'Falke',
    power: 110,
    short_id: 2009252746,
    slot: 1,
    speed: 0,
    technic: 700,
  },
};
const chunData = {
  ...pockestState?.data,
  monster: {
    ...pockestState?.data?.monster,
    age: 5,
    exchange_time: 1723750557000,
    exchange_time_par: 29,
    garbage: 0,
    hash: '4004-eJcEMJMX',
    live_time: 1723275084000,
    live_time_d: 1723275084000,
    max_memento_point: 4000,
    memento_flg: 0,
    memento_hash: '4004-bFwrKIMX',
    memento_name: 'トゲ腕輪',
    memento_name_en: 'Spiked Bracelet',
    memento_point: 4301,
    name: '春麗',
    name_en: 'Chun-Li',
    power: 0,
    speed: 2018,
    status: 1,
    stomach: 6,
    technic: 0,
    training_is_fever: false,
    training_time: 1723707355000,
    training_time_par: 58,
  },
};

export async function testDiscordMatch() {
  const isDisc = pockestGetters.isMatchDiscovery(pockestState, matchData?.exchangeResult);
  if (isDisc) {
    const report = pockestGetters
      .getDiscordReportMatch(pockestState, matchData?.exchangeResult, matchArgs?.match?.name_en);
    postDiscordTest(report);
    return report;
  }
  return null;
}

export async function testDiscordMatchManual(monsterName = 'Evil Ryu', opponentName = 'Lucia') {
  const monster = pockestState?.allMonsters?.find((m) => m.name_en === monsterName);
  const monsterHash = pockestState?.allHashes?.find((h) => h?.id?.includes(monster.monster_id))?.id;
  const opponent = pockestState?.allMonsters?.find((m) => m.name_en === opponentName);
  const state = {
    ...pockestState,
    data: {
      monster: {
        ...pockestState?.data?.monster,
        name_en: monster?.name_en,
        hash: monsterHash,
      },
    },
  };
  const result = {
    is_spmatch: monster?.matchFever?.includes(opponent.monster_id),
    target_monster_id: opponent.monster_id,
  };

  const report = pockestGetters
    .getDiscordReportMatch(state, result, opponentName);
  postDiscordTest(report);
  return report;
}

export async function testDiscordEvo() {
  const reports = [
    await pockestGetters.getDiscordReportEvoSuccess(pockestState, pockestState?.data),
    pockestGetters.getDiscordReportEvoFailure(pockestState, pockestState?.data),
    await pockestGetters.getDiscordReportMemento(pockestState, pockestState?.data),
  ];
  const report = combineDiscordReports(reports);
  await postDiscordTest(report);
  return report;
}

export async function testDiscordEvoManual() {
  const reports = [
    await pockestGetters.getDiscordReportEvoSuccess(pockestState, chunData),
    pockestGetters.getDiscordReportEvoFailure(pockestState, chunData),
    await pockestGetters.getDiscordReportMemento(pockestState, chunData),
  ];
  const report = combineDiscordReports(reports);
  await postDiscordTest(report);
  return report;
}

export async function testDiscordEvoChun() {
  const report = await pockestGetters.getDiscordReportMemento(pockestState, chunData);
  await postDiscordTest(report);
  return report;
}

export async function testDiscordMatchList() {
  const data = pockestState?.data;
  const monster = data?.monster;
  const { exchangeList } = await pockestGetters.fetchMatchList();
  console.log({ exchangeList });
  if (monster?.age >= 5) {
    // Report missing hashes, names, and stat vals to discord when found on opponents
    const missing = exchangeList.filter((m) => {
      const matchingMonster = pockestState?.allMonsters
        .find((m2) => m2?.monster_id === m?.monster_id);
      return !matchingMonster?.confirmed;
    });
    console.log({ missing });
    if (missing.length) {
      const reportReqs = missing.map((match) => pockestGetters
        .getDiscordReportSighting(pockestState, data, { match }));
      const reports = await Promise.all(reportReqs);
      console.log({ reports });
      const report = combineDiscordReports(reports);
      await postDiscordTest(report);
      return report;
    }
  }
  return null;
}

export async function testDiscordMatchListManual() {
  const data = pockestState?.data;
  const match = {
    fighters_id: 'pBun',
    hash: '4010-rZNIvHno',
    monster_id: 4010,
    name: 'エドモンド本田',
    name_en: 'Honda',
    power: 0,
    short_id: 4234122683,
    slot: 8,
    speed: 0,
    technic: 3076,
  };
  const report = await pockestGetters.getDiscordReportSighting(pockestState, data, { match });
  await postDiscordTest(report);
  return report;
}

export async function testDiscordStyles() {
  await testDiscordMatchManual('Ryu', 'Ken');
  await testDiscordMatchManual('Evil Ryu', 'Lucia');
  await testDiscordEvoManual();
  await testDiscordMatchListManual();
}
