/// <reference types="angular" />
/// <reference types="core" />
/// <reference types="jmx" />
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
    const OPERATION_GET_LOG_RESULTS = "getLogResults(int)";
    const OPERATION_JSON_QUERY_LOG_RESULTS = "jsonQueryLogResults";
    const SEARCH_LOG_QUERY_MBEAN = "*:type=LogQuery";
    class LogsService {
        private $q;
        private jolokia;
        private localStorage;
        private logQueryBean;
        constructor($q: ng.IQService, jolokia: Jolokia.IJolokia, localStorage: Storage);
        getInitialLogs(): ng.IPromise<LogEntry[]>;
        getMoreLogs(fromTimestamp: number): ng.IPromise<LogEntry[]>;
        appendLogs(logs: LogEntry[], logEntries: LogEntry[]): LogEntry[];
        filterLogs(logs: LogEntry[], filterConfig: any): LogEntry[];
        getLogQueryMBean(): ng.IPromise<string>;
        isLogSortAsc(): boolean;
        isLogAutoScroll(): boolean;
        getLogCacheSize(): number;
        getLogBatchSize(): number;
    }
}
declare namespace Log {
    function LogConfig($routeProvider: any): void;
    function LogRun($rootScope: ng.IRootScopeService, helpRegistry: Help.HelpRegistry, preferencesRegistry: Core.PreferencesRegistry, HawtioNav: Nav.Registry, workspace: Jmx.Workspace, logsService: LogsService): void;
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
