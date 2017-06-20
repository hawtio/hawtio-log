/// <reference path="log-entry.ts"/>

namespace Log {

  export class LogsService {

    private logQueryBean: string;

    constructor(private $q: ng.IQService, private jolokia: Jolokia.IJolokia, private localStorage: Storage) {
      'ngInject';
      this.getLogQueryMBean()
        .then(mbean => this.logQueryBean = mbean);
    }

    getInitialLogs(): ng.IPromise<LogEntry[]> {
      return this.$q((resolve, reject) => {
        this.jolokia.execute(this.logQueryBean, "getLogResults(int)", this.getLogCacheSize(), { 
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
      return this.$q((resolve, reject) => {
        this.jolokia.execute(this.logQueryBean, "jsonQueryLogResults",
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

    getLogQueryMBean(): ng.IPromise<string> {
      return this.$q((resolve, reject) => {
        this.jolokia.search('*:type=LogQuery', {
            success: response => {
              if (response.length > 0) {
                resolve(response[0])
              } else {
                resolve(null);
              }
            },
            error: response => reject(response.error)
          });
      });      
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