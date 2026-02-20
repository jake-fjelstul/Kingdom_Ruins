/**
 * Kingdom Ruins – Analytics public API
 */

export {
  ANALYTICS_VERSION,
  EVENTS,
  EVENT_GROUPS,
  PAYLOAD_SCHEMAS,
  playerSnapshot,
  gameStateSnapshot,
} from './schema';

export {
  createRecorder,
  setDefaultRecorder,
  getDefaultRecorder,
  exportSessionAsJSON,
} from './recorder';
