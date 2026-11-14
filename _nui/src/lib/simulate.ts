type Step = [delayMs: number, message: Record<string, unknown>];

const CORE_INIT = ['rage::fwConfigManager', 'CStreaming', 'CModelInfo', 'CScaleformMgr', 'CPathFind', 'CTimeCycle'];
const RESOURCES = ['cobalt_core', 'cobalt_inventory', 'npwd', 'cobalt_hud', 'cobalt_garages', 'cobalt_map'];
const FILE_TYPES = ['ytyp', 'ydr', 'ytd', 'ymap', 'meta'];
const BEFORE_MAP_INIT = ['CGameWorld', 'CPopZones', 'CWeather'];
const AFTER_MAP_INIT = ['CGarages', 'CPedPopulation', 'CVehiclePopulation', 'CRadar', 'CDoorSystem'];
const SESSION_INIT = ['CNetwork', 'CPlayerInfo', 'CScriptHud', 'CGameLogic'];

function initOrder(type: string, names: string[], delay: number): Step[] {
  return [
    [delay, { eventName: 'startInitFunctionOrder', type, order: 1, count: names.length }],
    ...names.flatMap((name, idx): Step[] => [
      [delay, { eventName: 'initFunctionInvoking', type, name, idx }],
      [delay / 2, { eventName: 'initFunctionInvoked', type, name }],
    ]),
    [delay, { eventName: 'endInitFunction', type }],
  ];
}

function steps(): Step[] {
  const files = Array.from({ length: 214 }, (_, i) => {
    const resource = RESOURCES[i % RESOURCES.length];
    const type = FILE_TYPES[i % FILE_TYPES.length];
    return `resources:/${resource}/stream/${resource}_${i}.${type}`;
  });

  return [
    ...initOrder('INIT_CORE', CORE_INIT, 250),
    [200, { eventName: 'loadProgress', loadFraction: 0.08 }],
    [200, { eventName: 'startDataFileEntries', count: files.length }],
    ...files.flatMap((name, i): Step[] => {
      const entry: Step = [30, { eventName: 'onDataFileEntry', name, isNew: true }];
      if (i % 20 !== 0) return [entry];

      return [entry, [0, { eventName: 'loadProgress', loadFraction: 0.08 + (i / files.length) * 0.4 }]];
    }),
    [200, { eventName: 'endDataFileEntries' }],
    [100, { eventName: 'loadProgress', loadFraction: 0.1 }],
    ...initOrder('INIT_BEFORE_MAP_LOADED', BEFORE_MAP_INIT, 300),
    ...Array.from({ length: 8 }, (_, idx): Step => [400, { eventName: 'performMapLoadFunction', idx: idx + 1 }]),
    [100, { eventName: 'loadProgress', loadFraction: 0.7 }],
    ...initOrder('INIT_AFTER_MAP_LOADED', AFTER_MAP_INIT, 300),
    [100, { eventName: 'loadProgress', loadFraction: 0.9 }],
    ...initOrder('INIT_SESSION', SESSION_INIT, 500),
  ];
}

export async function replay() {
  for (const [delay, message] of steps()) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    window.postMessage(message, '*');
  }
}
