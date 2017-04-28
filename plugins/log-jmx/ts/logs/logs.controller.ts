/// <reference path="logs.service.ts"/>
/// <reference path="log-entry.ts"/>

namespace Log {

  export function LogsController($scope, $timeout, $uibModal, logsService: LogsService) {
    'ngInject';

    const UPDATE_SIZE = 20;
    const UPDATE_INTERVAL_MILLIS = 5000;
    const scrollableTable = document.querySelector('.log-jmx-scrollable-table');
    
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
        onFilterChange: onFilterChange
      }
    }

    function onFilterChange(filters) {
      let tableScrolled = isTableScrolled();
      
      removePreviousLevelFilter(filters);
      $scope.messageSearchText = getMessageFilterValues(filters);
      $scope.filteredLogs = logsService.filterLogs($scope.logs, this);
      
      if (tableScrolled) {
        scrollTable();
      }
    }

    function removePreviousLevelFilter(filters: any[]) {
      _.remove(filters, (filter, index) => filter.id === 'level' && index < filters.length - 1 &&
        filters[filters.length - 1].id === 'level');
    }

    function getMessageFilterValues(filters: any[]) {
      return filters.filter(filter => filter.id === 'message').map(filter => filter.value);
    };

    $scope.openLogModal = (logEntry: LogEntry) => {
      $scope.logEntry = logEntry;
      $uibModal.open({
        templateUrl: 'logDetailsModal.html',
        size: 'lg',
        appendTo: $(document.querySelector('.log-jmx-main')),
        scope: $scope
      });
    }

    function processLogEntries(response) {
      if (response.logEntries.length > 0) {
        let tableScrolled = isTableScrolled();
        
        logsService.appendLogs($scope.logs, response.logEntries);
        $scope.filteredLogs = logsService.filterLogs($scope.logs, $scope.toolbarConfig.filterConfig);
        
        if (tableScrolled) {
          scrollTable();
        }
      }
      scheduleNextRequest(response.toTimestamp);
    }

    function scheduleNextRequest(fromTimestamp: number) {
      $timeout(() => {
        logsService.getMoreLogs(fromTimestamp)
          .then(processLogEntries)
          .catch(error => {
            Core.notification("error", "Failed to get a response! " + JSON.stringify(error, null, 4));
          });
      }, UPDATE_INTERVAL_MILLIS);
    }

    function isTableScrolled() {
      if (logsService.isLogSortAsc()) {
        return scrollableTable.scrollHeight - scrollableTable.scrollTop === scrollableTable.clientHeight;
      } else {
        return scrollableTable.scrollTop === 0;
      }
    }

    function scrollTable() {
      if (logsService.isLogAutoScroll()) {
        if (logsService.isLogSortAsc()) {
          $timeout(() => scrollableTable.scrollTop = scrollableTable.scrollHeight - scrollableTable.clientHeight, 0);
        } else {
          $timeout(() => scrollableTable.scrollTop = 0, 0);
        }
      }
    }

    logsService.getInitialLogs()
      .then(processLogEntries)
      .catch(error => {
        Core.notification("error", "Failed to get a response! " + JSON.stringify(error, null, 4));
      });
  }

}
