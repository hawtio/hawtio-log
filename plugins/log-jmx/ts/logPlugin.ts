/// <reference path="../../../libs/hawtio-core-dts/hawtio-core.d.ts"/>
/// <reference path="../../../libs/hawtio-jmx/d.ts/jmx/ts/workspace.d.ts"/>
/// <reference path="logHelpers.ts"/>
/// <reference path="log.service.ts"/>

namespace Log {
  
  var pluginName = 'log';
  var hasMBean = false;

  export var _module = angular.module(pluginName, [])
    .service('logService', LogService);

  _module.config(["$routeProvider", ($routeProvider) => {
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
      }, reloadOnSearch: false})
  }]);

  _module.run(["$location", "workspace", "helpRegistry", "preferencesRegistry",
    ($location:ng.ILocationService, workspace:Workspace, helpRegistry, preferencesRegistry) => {

    hasMBean = treeContainsLogQueryMBean(workspace);

    helpRegistry.addUserDoc('log', 'plugins/log-jmx/doc/help.md', () => {
      return treeContainsLogQueryMBean(workspace);
    });

    preferencesRegistry.addTab("Server Logs", "plugins/log-jmx/html/preferences.html", () => {
        return treeContainsLogQueryMBean(workspace);
      });

    workspace.topLevelTabs.push({
      id: "logs",
      content: "Logs",
      title: "View and search the logs of this container",
      isValid: (workspace:Workspace) => treeContainsLogQueryMBean(workspace),
      href: () => "#/logs"
    });

    workspace.subLevelTabs.push({
      content: '<i class="icon-list-alt"></i> Log',
      title: "View the logs in this process",
      isValid: (workspace:Workspace) => isSelectionLogQueryMBean(workspace),
      href: () => "#/logs"
    });
  }]);

  _module.filter('logDateFilter', ["$filter", ($filter) => {
    var standardDateFilter = $filter('date');
    return function (log) {
      if (!log) {
        return null;
      }
      // if there is a seq in the reply, then its the timestamp with milli seconds
      if (log.seq) {
        return standardDateFilter(log.seq, 'yyyy-MM-dd HH:mm:ss.sss')
      } else {
        return standardDateFilter(log.timestamp, 'yyyy-MM-dd HH:mm:ss')
      }
    }
  }]);

  /**
   * Wraps the
   * @param text {string} haystack to search through
   * @param search {string} needle to search for
   * @param [caseSensitive] {boolean} optional boolean to use case-sensitive searching
   */
  _module.filter('highlight', function () {
    return function (text: string, searches: string[], caseSensitive: boolean) {
      searches.forEach(search => {
        text = text.toString();
        search = search.toString();
        if (caseSensitive) {
          text = text.split(search).join('<mark>' + search + '</mark>');
        } else {
          text = text.replace(new RegExp(search, 'gi'), '<mark>$&</mark>');
        }
      });
      return text;
    };
  });

  hawtioPluginLoader.addModule(pluginName);
}
