import { registerSettingsHandlers } from '../lib/settings/background';
import { registerStoreHandlers } from '../lib/store/background';

export default defineBackground(() => {
  registerStoreHandlers();
  registerSettingsHandlers();
});
