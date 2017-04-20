/// <reference path="logPlugin.d.ts" />
/// <reference path="logs.d.ts" />
/// <reference path="log.d.ts" />
declare namespace Log {
    class LogService {
        private $q;
        private jolokia;
        constructor($q: ng.IQService, jolokia: Jolokia.IJolokia);
        filterLogs(logs: ILog[], filterConfig: any): ILog[];
        getInitialLogs(mbean: string, resultSize: number): ng.IPromise<any>;
        getMoreLogs(mbean: string, afterTimestamp: number, resultSize: number): ng.IPromise<any>;
    }
}
