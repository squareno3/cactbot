'use strict';

UserConfig.registerOptions('cactbot', {
  options: [
    {
      id: 'ShowDeveloperOptions',
      name: {
        en: 'Show developer options',
      },
      type: 'checkbox',
      default: false,
    },
    {
      id: 'ReloadOnFileChange',
      name: {
        en: 'Reload overlay on file change',
      },
      type: 'checkbox',
      default: false,
    },
  ],
});
