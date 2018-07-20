/// <reference path="logs.service.ts"/>

namespace Log {

  const log: Logging.Logger = Logger.get('hawtio-log');

  let showPlugin: boolean = false;

  export function LogConfig($routeProvider): void {
    'ngInject';

    $routeProvider
      .when('/logs', { templateUrl: 'plugins/log-jmx/html/logs.html', reloadOnSearch: false })
      .when('/openlogs', {
        redirectTo: () => {
          // use a redirect, as the log plugin may not be valid, if we connect to a JVM which does not have the log mbean
          // in the JMX tree, and if that happens, we need to redirect to home, so another tab is selected
          if (showPlugin) {
            return '/logs'
          } else {
            return '/home'
          }
        }, reloadOnSearch: false
      });
  }

  export function LogRun(
    $rootScope: ng.IRootScopeService,
    helpRegistry: Help.HelpRegistry,
    preferencesRegistry: Core.PreferencesRegistry,
    HawtioNav: Nav.Registry,
    workspace: Jmx.Workspace,
    logsService: LogsService,
    treeService: Jmx.TreeService): void {
    'ngInject';

    logsService.getLogQueryMBean()
      .then(mbean => {
        if (!mbean) {
          return;
        }

        // check RBAC to figure out if this plugin should be visible
        treeService.runWhenTreeReady(() => {
          showPlugin = workspace.hasInvokeRightsForName(mbean, OPERATION_GET_LOG_RESULTS);
          log.debug('RBAC - Logs tab visible:', showPlugin);
          registerPlugin(showPlugin, helpRegistry, preferencesRegistry, HawtioNav);
        });
      });
  }

  function registerPlugin(
    active: boolean,
    helpRegistry: Help.HelpRegistry,
    preferencesRegistry: Core.PreferencesRegistry,
    HawtioNav: Nav.Registry): void {

    helpRegistry.addUserDoc(
      'log',
      'plugins/log-jmx/doc/help.md',
      () => active);

    preferencesRegistry.addTab(
      "Server Logs",
      "plugins/log-jmx/html/log-preferences.html",
      () => active);

    let navItem = HawtioNav.builder()
      .id('logs')
      .title(() => 'Logs')
      .isValid(() => active)
      .href(() => '/logs')
      .build();
    HawtioNav.add(navItem);
  }

}
