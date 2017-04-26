namespace Log {

  export function LogPreferencesController($scope, localStorage) {
    'ngInject';
    
    Core.initPreferenceScope($scope, localStorage, {
      'logSortAsc': {
        'value': true,
        'converter': Core.parseBooleanValue
      },
      'logAutoScroll': {
        'value': true,
        'converter': Core.parseBooleanValue
      },
      'logCacheSize': {
        'value': 500,
        'converter': parseInt
      },
      'logBatchSize': {
        'value': 20,
        'converter': parseInt
      }
    });
  }

}
