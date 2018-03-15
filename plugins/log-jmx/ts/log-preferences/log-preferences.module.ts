/// <reference path="log-preferences.controller.ts"/>

namespace Log {

  export const LogPreferencesModule = angular
    .module('log-preferences', [])
    .controller('LogPreferencesController', LogPreferencesController)
    .name;

}
