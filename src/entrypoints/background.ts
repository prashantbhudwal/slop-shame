import { registerStoreHandlers } from '../lib/store/background';

export default defineBackground(() => {
  registerStoreHandlers();
});
