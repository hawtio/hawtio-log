/// <reference path="logs.service.ts"/>

namespace Log {

  let hasMBean: boolean = false;

  export function LogConfig($routeProvider): void {
    'ngInject';

    $routeProvider
      .when('/logs', { templateUrl: 'plugins/log-jmx/html/logs.html', reloadOnSearch: false })
      .when('/openlogs', {
        redirectTo: () => {
          // use a redirect, as the log plugin may not be valid, if we connect to a JVM which does not have the log mbean
          // in the JMX tree, and if that happens, we need to redirect to home, so another tab is selected
          if (hasMBean) {
            return '/logs'
          } else {
            return '/home'
          }
        }, reloadOnSearch: false
      });
  }

  export function LogRun(helpRegistry: Help.HelpRegistry, preferencesRegistry: Core.PreferencesRegistry,
    HawtioNav: Nav.Registry, logsService: LogsService): void {
    'ngInject';

    logsService.getLogQueryMBean()
      .then(mbean => {
        hasMBean = mbean !== null;

        helpRegistry.addUserDoc('log', 'plugins/log-jmx/doc/help.md', () => {
          return hasMBean;
        });

        preferencesRegistry.addTab("Server Logs", "plugins/log-jmx/html/log-preferences.html", () => {
          return hasMBean;
        });

        let navItem = HawtioNav.builder()
          .id('logs')
          .title(() => 'Logs')
          .isValid(() => hasMBean)
          .href(() => '/logs')
          .build();
        HawtioNav.add(navItem);
      });
  }

}
