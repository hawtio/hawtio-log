declare namespace Log {
    var log: Logging.Logger;
    function logSourceHref(row: any): string;
    function treeContainsLogQueryMBean(workspace: any): any;
    function isSelectionLogQueryMBean(workspace: any): any;
    function findLogQueryMBean(workspace: any): any;
    function logSourceHrefEntity(log: any): string;
    function hasLogSourceHref(log: any): boolean;
    function hasLogSourceLineHref(log: any): boolean;
    function removeQuestion(text: string): string;
    function getLogCacheSize(localStorage: any): number;
}
