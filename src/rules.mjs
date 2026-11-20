// Ticket-02 constants which do not have their own tuning keys in Contract 1.1.
export const RULES = Object.freeze({
  jumpSpeed: 7, gravity: 20, pickupHeight: 1.5, shadeHeight: 0.8,
  moteInitial: 20, moteCap: 30, moteSpawnTicks: 240, droppedTTL: 480,
  shadeFirstTick: 300, shadeDetect: 12, shadeForget: 18, shadeSpawnTicks: 60,
  recoilTicks: 60, recoilDistance: 2, pulsePushTicks: 15, safeExitTicks: 30,
  fallHeight: -10, respawnTicks: 60,
  drifterSpeed: 7, drifterIdleSpeed: 2, drifterSpawnTicks: 1200, drifterCap: 2,
  drifterDetect: 15, drifterCarryThreshold: 5, drifterHitRadius: 1.2,
  drifterSteal: 3, drifterFleeTicks: 240, drifterDropTicks: 120,
  charmTicks: 600, charmRespawnTicks: 2700, charmSpeed: 7.2,
  windPeriod: 1800, windDuration: 300, windWarning: 120, windSpeed: 2,
});
export const PALETTE = Object.freeze({
  sky:'#0E1430', fog:'#1B2350', grass:'#2F5D50', sand:'#C9B48A', wood:'#6B4A2F', clouds:'#12384A',
  lantern:'#FFB347', lanternCore:'#FFE9B0', lanternOff:'#5B5F6E', mote:'#FFF6C2', moteGlow:'#FFE58A',
  shade:'#120A1A', shadeEdge:'#7A3CFF', stunned:'#3A3450', tunic:'#E8E2D0', scarf:'#C8102E',
  gold:'#F2C14E', drifter:'#8FA3B8', danger:'#FF5A5F', text:'#F5F1E6',
});
