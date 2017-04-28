/// <reference path="includes.ts"/>
/// <reference path="log-preferences/log-preferences.module.ts"/>
/// <reference path="logs/logs.module.ts"/>

namespace Log {
  
  var pluginName = 'log';

  angular.module(pluginName, [
      LogPreferencesModule,
      LogsModule
    ]);

  hawtioPluginLoader.addModule(pluginName);
}
