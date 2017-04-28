/// <reference path="log-entry.ts"/>

namespace Log {

  export class LogsService {

    constructor(private $q: ng.IQService, private jolokia: Jolokia.IJolokia, private workspace,
      private localStorage: Storage) {
      'ngInject';
    }

    getInitialLogs(): ng.IPromise<LogEntry[]> {
      let logQueryBean = this.findLogQueryMBean();
      
      return this.$q((resolve, reject) => {
        this.jolokia.execute(logQueryBean, "getLogResults(int)", this.getLogCacheSize(), { 
          success: response => {
            if (response.events) {
              response.logEntries = response.events.map(event => new LogEntry(event));
              response.events = null;
            } else {
              response.logEntries = [];
            }
            resolve(response);
          },
          error: response => reject(response.error)
        });
      });
    }

    getMoreLogs(fromTimestamp: number): ng.IPromise<LogEntry[]> {
      let logQueryBean = this.findLogQueryMBean();
      
      return this.$q((resolve, reject) => {
        this.jolokia.execute(logQueryBean, "jsonQueryLogResults",
          JSON.stringify({ afterTimestamp: fromTimestamp, count: this.getLogBatchSize() }), {
            success: response => {
              if (response.events) {
                response.logEntries = response.events.map(event => new LogEntry(event));
                response.events = null;
              } else {
                response.logEntries = [];
              }
              resolve(response);
            },
            error: response => reject(response.error)
          });
      });
    }

    appendLogs(logs: LogEntry[], logEntries: LogEntry[]): LogEntry[] {
      logs.push(...logEntries);

      let logCacheSize = this.getLogCacheSize();
      if (logs.length > logCacheSize) {
        logs.splice(0, logs.length - logCacheSize);
      }

      return logs;
    }

    filterLogs(logs: LogEntry[], filterConfig): LogEntry[] {
      let filteredLogs = [...logs];
      
      filterConfig.appliedFilters.forEach(filter => {
        switch (filter.id) {
          case 'level':
            filteredLogs = filteredLogs.filter(log => log.level === filter.value)
            break;
          case 'logger':
            filteredLogs = filteredLogs.filter(log => log.logger.indexOf(filter.value) !== -1)
            break;
          case 'message':
            filteredLogs = filteredLogs.filter(log =>
              log.sanitizedMessage.toLowerCase().indexOf(filter.value.toLowerCase()) !== -1)
            break;
        }
      });
      
      if (!this.isLogSortAsc()) {
        filteredLogs = filteredLogs.reverse();
      }
      
      filterConfig.totalCount = logs.length;
      filterConfig.resultsCount = filteredLogs.length;
      
      return filteredLogs;
    }

    private findLogQueryMBean() {
      var node = this.workspace.findMBeanWithProperties('io.fabric8.insight', {type: 'LogQuery'});
      if (!node) {
        node = this.workspace.findMBeanWithProperties('org.fusesource.insight', {type: 'LogQuery'});
      }
      return node ? node.objectName : null;
    }

    treeContainsLogQueryMBean() {
      return this.workspace.treeContainsDomainAndProperties('io.fabric8.insight', {type: 'LogQuery'}) ||
        this.workspace.treeContainsDomainAndProperties('org.fusesource.insight', {type: 'LogQuery'});
    }

    isLogSortAsc(): boolean {
      let logSortAsc = this.localStorage.getItem('logSortAsc');
      return logSortAsc !== 'false';
    }

    isLogAutoScroll(): boolean {
      let logAutoScroll = this.localStorage.getItem('logAutoScroll');
      return logAutoScroll !== 'false';
    }

    getLogCacheSize(): number {
      let logCacheSize = this.localStorage.getItem('logCacheSize');
      return logCacheSize !== null ? parseInt(logCacheSize) : 500;
    }

    getLogBatchSize(): number {
      let logBatchSize = this.localStorage.getItem('logBatchSize');
      return logBatchSize !== null ? parseInt(logBatchSize) : 20;
    }

  }

}