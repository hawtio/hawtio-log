/// <reference path="logs.config.ts"/>
/// <reference path="logs.filters.ts"/>
/// <reference path="logs.controller.ts"/>
/// <reference path="logs.service.ts"/>

namespace Log {

  export const LogsModule = angular
    .module('logs', [])
    .config(LogConfig)
    .run(LogRun)
    .filter('logDateFilter', logDateFilter)
    .filter('highlight', highlight)
    .controller('LogsController', LogsController)
    .service('logsService', LogsService)
    .name;

}
