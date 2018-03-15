/// <reference path="log-preferences/log-preferences.module.ts"/>
/// <reference path="logs/logs.module.ts"/>

namespace Log {

  const pluginName: string = 'log';

  angular.module(pluginName, [
    LogPreferencesModule,
    LogsModule
  ]);

  hawtioPluginLoader.addModule(pluginName);
}
