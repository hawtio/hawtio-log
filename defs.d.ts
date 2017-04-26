/// <reference path="libs/hawtio-jmx/defs.d.ts" />
declare namespace Log {
    function LogPreferencesController($scope: any, localStorage: any): void;
}
declare namespace Log {
    const LogPreferencesModule: string;
}
declare namespace Log {
    class LogEntry {
        className: string;
        containerName: string;
        exception: string;
        fileName: string;
        hasOSGiProps: boolean;
        hasLogSourceHref: boolean;
        hasLogSourceLineHref: boolean;
        host: string;
        level: string;
        levelClass: string;
        lineNumber: string;
        logger: string;
        logSourceUrl: string;
        methodName: string;
        properties: {};
        sanitizedMessage: string;
        seq: string;
        thread: string;
        timestamp: string;
        constructor(event: any);
        private static getLevelClass(level);
        private static hasOSGiProps(properties);
        private static hasLogSourceHref(properties);
        private static hasLogSourceLineHref(lineNumber);
        private static getLogSourceUrl(event);
        private static removeQuestion(text);
    }
}
declare namespace Log {
    class LogsService {
        private $q;
        private jolokia;
        private workspace;
        private localStorage;
        constructor($q: ng.IQService, jolokia: Jolokia.IJolokia, workspace: any, localStorage: Storage);
        getInitialLogs(): ng.IPromise<LogEntry[]>;
        getMoreLogs(fromTimestamp: number): ng.IPromise<LogEntry[]>;
        appendLogs(logs: LogEntry[], logEntries: LogEntry[]): LogEntry[];
        filterLogs(logs: LogEntry[], filterConfig: any): LogEntry[];
        private findLogQueryMBean();
        treeContainsLogQueryMBean(): any;
        isLogSortAsc(): boolean;
        isLogAutoScroll(): boolean;
        getLogCacheSize(): number;
        getLogBatchSize(): number;
    }
}
declare namespace Log {
    function LogConfig($routeProvider: any): void;
    function LogRun(workspace: any, helpRegistry: any, preferencesRegistry: any, logsService: any): void;
}
declare namespace Log {
    function logDateFilter($filter: any): (log: any) => any;
    /**
     * @param text {string} haystack to search through
     * @param search {string} needle to search for
     * @param [caseSensitive] {boolean} optional boolean to use case-sensitive searching
     */
    function highlight(): (text: string, searches: string[], caseSensitive: boolean) => string;
}
declare namespace Log {
    function LogsController($scope: any, $timeout: any, $uibModal: any, logsService: LogsService): void;
}
declare namespace Log {
    const LogsModule: string;
}
declare namespace Log {
}
