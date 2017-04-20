/// <reference path="logPlugin.ts"/>
/// <reference path="logs.ts"/>
/// <reference path="log.ts"/>

namespace Log {

  export class LogService {

    constructor(private $q: ng.IQService, private jolokia: Jolokia.IJolokia) {
      'ngInject';
    }

    filterLogs(logs: ILog[], filterConfig): ILog[] {
      let filteredLogs = logs;
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
      filterConfig.totalCount = logs.length;
      filterConfig.resultsCount = filteredLogs.length;
      return filteredLogs;
    }

    getInitialLogs(mbean: string, resultSize: number): ng.IPromise<any> {
      return this.$q((resolve, reject) => {
        this.jolokia.execute(mbean, "getLogResults(int)", resultSize, { success: resolve, error: reject });
      });
    }

    getMoreLogs(mbean: string, afterTimestamp: number, resultSize: number): ng.IPromise<any> {
      return this.$q((resolve, reject) => {
        this.jolokia.execute(mbean, "jsonQueryLogResults",
          JSON.stringify({ afterTimestamp: afterTimestamp, count: resultSize }),
          { success: resolve, error: reject });
      });
    }

  }

}