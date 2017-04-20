/// <reference path="../../../libs/hawtio-core-dts/angular.d.ts"/>
/// <reference path="../../../libs/hawtio-utilities/d.ts/coreHelpers.d.ts"/>
/// <reference path="../../../libs/hawtio-jmx/d.ts/jmx/ts/workspace.d.ts"/>
/// <reference path="../../../libs/hawtio-ui/d.ts/toastr/ts/toastrPlugin.d.ts"/>
/// <reference path="logPlugin.ts"/>
/// <reference path="log.service.ts"/>
/// <reference path="log.ts"/>

namespace Log {

  _module.controller("Log.LogController", ["$scope", "$rootScope", "$routeParams", "$location", "localStorage",
    "workspace", "$timeout", "$window", "$document", "$templateCache", "$uibModal", 'logService', ($scope, $rootScope,
    $routeParams, $location, localStorage, workspace: Workspace, $timeout, $window, $document, $templateCache,
    $uibModal, logService: LogService) => {

    const DEFAULT_MAX_SIZE = 1000;
    const UPDATE_SIZE = 20;
    const UPDATE_INTERVAL = 5000;
    let maxSize = getLogCacheSize(localStorage) || DEFAULT_MAX_SIZE;
    
    $scope.logs = [];
    $scope.filteredLogs = [];
    $scope.messageSearchText = [];
    
    $scope.toolbarConfig = {
      filterConfig: {
        fields: [
          {
            id: 'level',
            title: 'Level',
            placeholder: 'Filter by level...',
            filterType: 'select',
            filterValues: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR']
          },
          {
            id: 'logger',
            title:  'Logger',
            placeholder: 'Filter by logger...',
            filterType: 'text'
          },
          {
            id: 'message',
            title:  'Message',
            placeholder: 'Filter by message...',
            filterType: 'text'
          }
        ],
        totalCount: $scope.logs.length,
        resultsCount: $scope.filteredLogs.length,
        appliedFilters: [],
        onFilterChange(filters) {
          $scope.messageSearchText = getMessageFilterValues(filters);
          $scope.filteredLogs = logService.filterLogs($scope.logs, this);
        }
      }
    }

    $scope.showRowDetails = false;
    $scope.showRaw = {
      expanded: false
    };

    const logQueryMBean = Log.findLogQueryMBean(workspace);

    $scope.getLevelClass = level => 'text-' + Core.logLevelClass(level);

    function getMessageFilterValues(filters) {
      return filters.filter(filter => filter.id === 'message').map(filter => filter.value);
    };

    $scope.selectedClass = ($index) => {
      if ($index === $scope.selectedRowIndex) {
        return 'selected';
      }
      return '';
    };

    $scope.$watch('selectedRowIndex', (newValue, oldValue) => {
      if (newValue !== oldValue) {
        if (newValue < 0 || newValue > $scope.logs.length) {
          $scope.selectedRow = null;
          $scope.showRowDetails = false;
          return;
        }
        $scope.selectedRow = $scope.logs[newValue];
        if (!$scope.showRowDetails) {
          $scope.showRowDetails = true;
        }
      }
    });

    $scope.hasOSGiProps = (row) => {
      return row && 'properties' in row && Object.keys(row.properties).some(key => key.indexOf('bundle') === 0);
    };

    $scope.openLogModal = (log) => {
      console.log(log);
      let modalScope = $scope.$new(true);
      modalScope.log = log;
      $uibModal.open({
        templateUrl: 'logDetailsModal.html',
        scope: modalScope
      })
      .result.finally(() => modalScope.$destroy());
    }

    $scope.selectRow = ($index) => {
      // in case the user clicks a row, closes the slideout and clicks
      // the row again
      if ($scope.selectedRowIndex == $index) {
        $scope.showRowDetails = true;
        return;
      }
      $scope.selectedRowIndex = $index;
    };

    $scope.getSelectedRowJson = () => {
      return angular.toJson($scope.selectedRow, true);
    };

    $scope.logSourceHref = Log.logSourceHref;

    $scope.hasLogSourceHref = (row) => {
      if (!row) {
        return false;
      }
      return Log.hasLogSourceHref(row);
    };

    $scope.hasLogSourceLineHref = (row) => {
      if (!row) {
        return false;
      }
      return Log.hasLogSourceLineHref(row);
    };

    $scope.formatStackTrace = formatStackTrace;

    function loadLogs(response) {
      if (response.events) {
        updateView(response.events);
      }
      scheduleNextRequest(response);
    }

    function updateView(logs) {
      logs.forEach((log:ILog) => log.sanitizedMessage = Core.escapeHtml(log.message));
      
      $scope.logs.push(...logs);

      if ($scope.logs.length > maxSize) {
        $scope.logs.splice(0, $scope.logs.length - maxSize);
      }

      $scope.filteredLogs = logService.filterLogs($scope.logs, $scope.toolbarConfig.filterConfig);
    }

    function scheduleNextRequest(response) {
      $timeout(() => {
        logService.getMoreLogs(logQueryMBean, response.toTimestamp, UPDATE_SIZE)
          .then(loadLogs)
          .catch(response => {
            Core.notification("error", "Failed to get a response! " + JSON.stringify(response.error, null, 4));
          });
      }, UPDATE_INTERVAL);
    }

    if (logQueryMBean) {
      logService.getInitialLogs(logQueryMBean, maxSize)
        .then(loadLogs)
        .catch(response => {
          Core.notification("error", "Failed to get a response! " + JSON.stringify(response.error, null, 4));
        });
    }
  }]);
}
