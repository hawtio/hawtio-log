/// <reference path="logs.service.ts"/>

namespace Log {
  
  var hasMBean = false;

  export function LogConfig($routeProvider) {
    'ngInject';
    
    $routeProvider.
      when('/logs', {templateUrl: 'plugins/log-jmx/html/logs.html', reloadOnSearch: false}).
      when('/openlogs', {redirectTo: () => {
        // use a redirect, as the log plugin may not be valid, if we connect to a JVM which does not have the log mbean
        // in the JMX tree, and if that happens, we need to redirect to home, so another tab is selected
        if (hasMBean) {
          return '/logs'
        } else {
          return '/home'
        }
      }, reloadOnSearch: false});
  }

  export function LogRun(workspace, helpRegistry, preferencesRegistry, logsService) {
    'ngInject';

    hasMBean = logsService.treeContainsLogQueryMBean();

    helpRegistry.addUserDoc('log', 'plugins/log-jmx/doc/help.md', () => {
      return logsService.treeContainsLogQueryMBean();
    });

    preferencesRegistry.addTab("Server Logs", "plugins/log-jmx/html/log-preferences.html", () => {
      return logsService.treeContainsLogQueryMBean();
    });

    workspace.topLevelTabs.push({
      id: "logs",
      content: "Logs",
      title: "View and search the logs of this container",
      isValid: workspace => logsService.treeContainsLogQueryMBean(),
      href: () => "/logs"
    });
  }

}
