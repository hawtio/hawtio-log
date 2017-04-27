var Log;
(function (Log) {
    LogPreferencesController.$inject = ["$scope", "localStorage"];
    function LogPreferencesController($scope, localStorage) {
        'ngInject';
        Core.initPreferenceScope($scope, localStorage, {
            'logSortAsc': {
                'value': true,
                'converter': Core.parseBooleanValue
            },
            'logAutoScroll': {
                'value': true,
                'converter': Core.parseBooleanValue
            },
            'logCacheSize': {
                'value': 500,
                'converter': parseInt
            },
            'logBatchSize': {
                'value': 20,
                'converter': parseInt
            }
        });
    }
    Log.LogPreferencesController = LogPreferencesController;
})(Log || (Log = {}));
/// <reference path="log-preferences.controller.ts"/>
var Log;
(function (Log) {
    Log.LogPreferencesModule = angular
        .module('log-preferences', [])
        .controller('LogPreferencesController', Log.LogPreferencesController)
        .name;
})(Log || (Log = {}));
var Log;
(function (Log) {
    var LogEntry = (function () {
        function LogEntry(event) {
            this.className = event.className;
            this.containerName = event.containerName;
            this.exception = event.exception;
            this.fileName = event.fileName;
            this.hasOSGiProps = LogEntry.hasOSGiProps(event.properties);
            this.hasLogSourceHref = LogEntry.hasLogSourceHref(event.properties);
            this.hasLogSourceLineHref = LogEntry.hasLogSourceLineHref(event.lineNumber);
            this.host = event.host;
            this.level = event.level;
            this.levelClass = LogEntry.getLevelClass(event.level);
            this.lineNumber = event.lineNumber;
            this.logger = event.logger;
            this.logSourceUrl = LogEntry.getLogSourceUrl(event);
            this.methodName = event.methodName;
            this.properties = event.properties;
            this.sanitizedMessage = Core.escapeHtml(event.message);
            this.seq = event.seq;
            this.thread = event.thread;
            this.timestamp = event.timestamp;
        }
        LogEntry.getLevelClass = function (level) {
            switch (level) {
                case 'INFO': return 'text-info';
                case 'WARN': return 'text-warning';
                case 'ERROR': return 'text-danger';
                default: return '';
            }
        };
        ;
        LogEntry.hasOSGiProps = function (properties) {
            return properties && Object.keys(properties).some(function (key) { return key.indexOf('bundle') === 0; });
        };
        ;
        LogEntry.hasLogSourceHref = function (properties) {
            return properties && properties['maven.coordinates'] && properties['maven.coordinates'] !== '';
        };
        LogEntry.hasLogSourceLineHref = function (lineNumber) {
            return lineNumber && lineNumber !== "" && lineNumber !== "?";
        };
        LogEntry.getLogSourceUrl = function (event) {
            var fileName = LogEntry.removeQuestion(event.fileName);
            var className = LogEntry.removeQuestion(event.className);
            var properties = event.properties;
            var mavenCoords = "";
            if (properties) {
                mavenCoords = properties["maven.coordinates"];
            }
            if (mavenCoords && fileName) {
                var link = "#/source/view/" + mavenCoords + "/class/" + className + "/" + fileName;
                var line = event.lineNumber;
                if (line) {
                    link += "?line=" + line;
                }
                return link;
            }
            else {
                return "";
            }
        };
        LogEntry.removeQuestion = function (text) {
            return (!text || text === "?") ? null : text;
        };
        return LogEntry;
    }());
    Log.LogEntry = LogEntry;
})(Log || (Log = {}));
/// <reference path="log-entry.ts"/>
var Log;
(function (Log) {
    var LogsService = (function () {
        LogsService.$inject = ["$q", "jolokia", "workspace", "localStorage"];
        function LogsService($q, jolokia, workspace, localStorage) {
            'ngInject';
            this.$q = $q;
            this.jolokia = jolokia;
            this.workspace = workspace;
            this.localStorage = localStorage;
        }
        LogsService.prototype.getInitialLogs = function () {
            var _this = this;
            var logQueryBean = this.findLogQueryMBean();
            return this.$q(function (resolve, reject) {
                _this.jolokia.execute(logQueryBean, "getLogResults(int)", _this.getLogCacheSize(), {
                    success: function (response) {
                        if (response.events) {
                            response.logEntries = response.events.map(function (event) { return new Log.LogEntry(event); });
                            response.events = null;
                        }
                        else {
                            response.logEntries = [];
                        }
                        resolve(response);
                    },
                    error: function (response) { return reject(response.error); }
                });
            });
        };
        LogsService.prototype.getMoreLogs = function (fromTimestamp) {
            var _this = this;
            var logQueryBean = this.findLogQueryMBean();
            return this.$q(function (resolve, reject) {
                _this.jolokia.execute(logQueryBean, "jsonQueryLogResults", JSON.stringify({ afterTimestamp: fromTimestamp, count: _this.getLogBatchSize() }), {
                    success: function (response) {
                        if (response.events) {
                            response.logEntries = response.events.map(function (event) { return new Log.LogEntry(event); });
                            response.events = null;
                        }
                        else {
                            response.logEntries = [];
                        }
                        resolve(response);
                    },
                    error: function (response) { return reject(response.error); }
                });
            });
        };
        LogsService.prototype.appendLogs = function (logs, logEntries) {
            logs.push.apply(logs, logEntries);
            var logCacheSize = this.getLogCacheSize();
            if (logs.length > logCacheSize) {
                logs.splice(0, logs.length - logCacheSize);
            }
            return logs;
        };
        LogsService.prototype.filterLogs = function (logs, filterConfig) {
            var filteredLogs = logs.slice();
            filterConfig.appliedFilters.forEach(function (filter) {
                switch (filter.id) {
                    case 'level':
                        filteredLogs = filteredLogs.filter(function (log) { return log.level === filter.value; });
                        break;
                    case 'logger':
                        filteredLogs = filteredLogs.filter(function (log) { return log.logger.indexOf(filter.value) !== -1; });
                        break;
                    case 'message':
                        filteredLogs = filteredLogs.filter(function (log) {
                            return log.sanitizedMessage.toLowerCase().indexOf(filter.value.toLowerCase()) !== -1;
                        });
                        break;
                }
            });
            if (!this.isLogSortAsc()) {
                filteredLogs = filteredLogs.reverse();
            }
            filterConfig.totalCount = logs.length;
            filterConfig.resultsCount = filteredLogs.length;
            return filteredLogs;
        };
        LogsService.prototype.findLogQueryMBean = function () {
            var node = this.workspace.findMBeanWithProperties('io.fabric8.insight', { type: 'LogQuery' });
            if (!node) {
                node = this.workspace.findMBeanWithProperties('org.fusesource.insight', { type: 'LogQuery' });
            }
            return node ? node.objectName : null;
        };
        LogsService.prototype.treeContainsLogQueryMBean = function () {
            return this.workspace.treeContainsDomainAndProperties('io.fabric8.insight', { type: 'LogQuery' }) ||
                this.workspace.treeContainsDomainAndProperties('org.fusesource.insight', { type: 'LogQuery' });
        };
        LogsService.prototype.isLogSortAsc = function () {
            var logSortAsc = this.localStorage.getItem('logSortAsc');
            return logSortAsc !== 'false';
        };
        LogsService.prototype.isLogAutoScroll = function () {
            var logAutoScroll = this.localStorage.getItem('logAutoScroll');
            return logAutoScroll !== 'false';
        };
        LogsService.prototype.getLogCacheSize = function () {
            var logCacheSize = this.localStorage.getItem('logCacheSize');
            return logCacheSize !== null ? parseInt(logCacheSize) : 500;
        };
        LogsService.prototype.getLogBatchSize = function () {
            var logBatchSize = this.localStorage.getItem('logBatchSize');
            return logBatchSize !== null ? parseInt(logBatchSize) : 20;
        };
        return LogsService;
    }());
    Log.LogsService = LogsService;
})(Log || (Log = {}));
/// <reference path="logs.service.ts"/>
var Log;
(function (Log) {
    LogConfig.$inject = ["$routeProvider"];
    LogRun.$inject = ["workspace", "helpRegistry", "preferencesRegistry", "logsService"];
    var hasMBean = false;
    function LogConfig($routeProvider) {
        'ngInject';
        $routeProvider.
            when('/logs', { templateUrl: 'plugins/log-jmx/html/logs.html', reloadOnSearch: false }).
            when('/openlogs', { redirectTo: function () {
                // use a redirect, as the log plugin may not be valid, if we connect to a JVM which does not have the log mbean
                // in the JMX tree, and if that happens, we need to redirect to home, so another tab is selected
                if (hasMBean) {
                    return '/logs';
                }
                else {
                    return '/home';
                }
            }, reloadOnSearch: false });
    }
    Log.LogConfig = LogConfig;
    function LogRun(workspace, helpRegistry, preferencesRegistry, logsService) {
        'ngInject';
        hasMBean = logsService.treeContainsLogQueryMBean();
        helpRegistry.addUserDoc('log', 'plugins/log-jmx/doc/help.md', function () {
            return logsService.treeContainsLogQueryMBean();
        });
        preferencesRegistry.addTab("Server Logs", "plugins/log-jmx/html/log-preferences.html", function () {
            return logsService.treeContainsLogQueryMBean();
        });
        workspace.topLevelTabs.push({
            id: "logs",
            content: "Logs",
            title: "View and search the logs of this container",
            isValid: function (workspace) { return logsService.treeContainsLogQueryMBean(); },
            href: function () { return "/logs"; }
        });
    }
    Log.LogRun = LogRun;
})(Log || (Log = {}));
var Log;
(function (Log) {
    logDateFilter.$inject = ["$filter"];
    function logDateFilter($filter) {
        'ngInject';
        var standardDateFilter = $filter('date');
        return function (log) {
            if (!log) {
                return null;
            }
            // if there is a seq in the reply, then its the timestamp with milli seconds
            if (log.seq) {
                return standardDateFilter(log.seq, 'yyyy-MM-dd HH:mm:ss.sss');
            }
            else {
                return standardDateFilter(log.timestamp, 'yyyy-MM-dd HH:mm:ss');
            }
        };
    }
    Log.logDateFilter = logDateFilter;
    /**
     * @param text {string} haystack to search through
     * @param search {string} needle to search for
     * @param [caseSensitive] {boolean} optional boolean to use case-sensitive searching
     */
    function highlight() {
        return function (text, searches, caseSensitive) {
            searches.forEach(function (search) {
                text = text.toString();
                search = search.toString();
                if (caseSensitive) {
                    text = text.split(search).join('<mark>' + search + '</mark>');
                }
                else {
                    text = text.replace(new RegExp(search, 'gi'), '<mark>$&</mark>');
                }
            });
            return text;
        };
    }
    Log.highlight = highlight;
})(Log || (Log = {}));
/// <reference path="logs.service.ts"/>
/// <reference path="log-entry.ts"/>
var Log;
(function (Log) {
    LogsController.$inject = ["$scope", "$timeout", "$uibModal", "logsService"];
    function LogsController($scope, $timeout, $uibModal, logsService) {
        'ngInject';
        var UPDATE_SIZE = 20;
        var UPDATE_INTERVAL_MILLIS = 5000;
        var scrollableTable = document.querySelector('.log-jmx-scrollable-table');
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
                        title: 'Logger',
                        placeholder: 'Filter by logger...',
                        filterType: 'text'
                    },
                    {
                        id: 'message',
                        title: 'Message',
                        placeholder: 'Filter by message...',
                        filterType: 'text'
                    }
                ],
                totalCount: $scope.logs.length,
                resultsCount: $scope.filteredLogs.length,
                appliedFilters: [],
                onFilterChange: function (filters) {
                    removePreviousLevelFilter(filters);
                    $scope.messageSearchText = getMessageFilterValues(filters);
                    $scope.filteredLogs = logsService.filterLogs($scope.logs, this);
                }
            }
        };
        function getMessageFilterValues(filters) {
            return filters.filter(function (filter) { return filter.id === 'message'; }).map(function (filter) { return filter.value; });
        }
        ;
        function removePreviousLevelFilter(filters) {
            _.remove(filters, function (filter, index) { return filter.id === 'level' && index < filters.length - 1; });
        }
        $scope.openLogModal = function (logEntry) {
            $scope.logEntry = logEntry;
            $uibModal.open({
                templateUrl: 'logDetailsModal.html',
                size: 'lg',
                appendTo: $(document.querySelector('.log-jmx-main')),
                scope: $scope
            });
        };
        function processLogEntries(response) {
            if (response.logEntries.length > 0) {
                var tableScrolled = isTableScrolled();
                logsService.appendLogs($scope.logs, response.logEntries);
                $scope.filteredLogs = logsService.filterLogs($scope.logs, $scope.toolbarConfig.filterConfig);
                if (tableScrolled) {
                    scrollTable();
                }
            }
            scheduleNextRequest(response.toTimestamp);
        }
        function scheduleNextRequest(fromTimestamp) {
            $timeout(function () {
                logsService.getMoreLogs(fromTimestamp)
                    .then(processLogEntries)
                    .catch(function (error) {
                    Core.notification("error", "Failed to get a response! " + JSON.stringify(error, null, 4));
                });
            }, UPDATE_INTERVAL_MILLIS);
        }
        function isTableScrolled() {
            if (logsService.isLogSortAsc()) {
                return scrollableTable.scrollHeight - scrollableTable.scrollTop === scrollableTable.clientHeight;
            }
            else {
                return scrollableTable.scrollTop === 0;
            }
        }
        function scrollTable() {
            if (logsService.isLogAutoScroll()) {
                if (logsService.isLogSortAsc()) {
                    $timeout(function () { return scrollableTable.scrollTop = scrollableTable.scrollHeight - scrollableTable.clientHeight; }, 0);
                }
                else {
                    $timeout(function () { return scrollableTable.scrollTop = 0; }, 0);
                }
            }
        }
        if (logsService.treeContainsLogQueryMBean()) {
            logsService.getInitialLogs()
                .then(processLogEntries)
                .catch(function (error) {
                Core.notification("error", "Failed to get a response! " + JSON.stringify(error, null, 4));
            });
        }
    }
    Log.LogsController = LogsController;
})(Log || (Log = {}));
/// <reference path="logs.config.ts"/>
/// <reference path="logs.filters.ts"/>
/// <reference path="logs.controller.ts"/>
/// <reference path="logs.service.ts"/>
var Log;
(function (Log) {
    Log.LogsModule = angular
        .module('logs', [])
        .config(Log.LogConfig)
        .run(Log.LogRun)
        .filter('logDateFilter', Log.logDateFilter)
        .filter('highlight', Log.highlight)
        .controller('LogsController', Log.LogsController)
        .service('logsService', Log.LogsService)
        .name;
})(Log || (Log = {}));
/// <reference path="../../../libs/hawtio-jmx/defs.d.ts"/>
/// <reference path="log-preferences/log-preferences.module.ts"/>
/// <reference path="logs/logs.module.ts"/>
var Log;
(function (Log) {
    var pluginName = 'log';
    angular.module(pluginName, [
        Log.LogPreferencesModule,
        Log.LogsModule
    ]);
    hawtioPluginLoader.addModule(pluginName);
})(Log || (Log = {}));

angular.module('hawtio-log-templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('plugins/log-jmx/html/log-preferences.html','<form class="form-horizontal" ng-controller="LogPreferencesController">\n\n  <div class="form-group">\n    <label class="col-sm-2 control-label" for="logSortAsc">Sort ascending</label>\n    <div class="col-sm-10">\n      <input type="checkbox" id="logSortAsc" ng-model="logSortAsc">\n      <span class="help-block">Sort log entries by timestamp ascending</span>\n    </div>\n  </div>\n\n  <div class="form-group">\n    <label class="col-sm-2 control-label" for="logAutoScroll">Auto scroll</label>\n    <div class="col-sm-10">\n      <input type="checkbox" id="logAutoScroll" ng-model="logAutoScroll">\n      <span class="help-block">Automatically scroll when new log entries are added</span>\n    </div>\n  </div>\n\n  <div class="form-group">\n    <label class="col-sm-2 control-label" for="logCacheSize" title="The number of log messages to keep in the browser">Log\n      cache size</label>\n    <div class="col-sm-10">\n      <input id="logCacheSize" type="number" ng-model="logCacheSize" min="0"/>\n    </div>\n  </div>\n\n  <div class="form-group">\n    <label class="col-sm-2 control-label" for="logBatchSize" title="The maximum number of log messages to retrieve when loading new log lines">Log\n      batch size</label>\n    <div class="col-sm-10">\n      <input id="logBatchSize" type="number" ng-model="logBatchSize" min="1" max="1000"/>\n    </div>\n  </div>\n\n</form>\n');
$templateCache.put('plugins/log-jmx/html/logs.html','<div class="log-jmx-main" ng-controller="LogsController">\n\n  <div class="log-jmx-flex-container">\n    <div class="log-jmx-fixed-toolbar">\n      <h1>Log</h1>\n      <div ng-show="logs.length === 0">\n        <div class="spinner spinner-lg loading-page"></div>\n      </div>\n      <div ng-show="logs.length > 0">\n        <pf-toolbar config="toolbarConfig"></pf-toolbar>\n        <table class="table table-striped log-jmx-header-table">\n          <thead>\n            <tr>\n              <th>Timestamp</th>\n              <th>Level</th>\n              <th>Logger</th>\n              <th>Message</th>\n            </tr>\n          </thead>\n        </table>\n      </div>\n    </div>\n    <div class="log-jmx-scrollable-table" ng-show="logs.length > 0">\n      <table class="table table-striped">\n        <tbody>\n          <tr ng-repeat="logEntry in filteredLogs">\n            <td><samp>{{logEntry | logDateFilter}}</samp></td>\n            <td class="{{logEntry.levelClass}}"><samp>{{logEntry.level}}</samp></td>\n            <td ng-switch="logEntry.hasLogSourceHref">\n              <a href="" ng-switch-when="true" ng-click="openLogModal(logEntry)"><samp>{{logEntry.logger}}</samp></a>\n              <samp ng-switch-default>{{logEntry.logger}}</samp>\n            </td>\n            <td><samp ng-bind-html="logEntry.sanitizedMessage | highlight:messageSearchText"></samp></td>\n          </tr>\n        </tbody>\n      </table>\n    </div>\n  </div>\n\n  <script type="text/ng-template" id="logDetailsModal.html">\n    <div class="modal-header">\n      <button type="button" class="close" aria-label="Close" ng-click="$dismiss()">\n        <span class="pficon pficon-close" aria-hidden="true"></span>\n      </button>\n      <h4 class="modal-title">Log</h4>\n    </div>\n    <div class="modal-body">\n      <dl class="dl-horizontal">\n        <dt>Timestamp</dt>\n        <dd><samp>{{logEntry | logDateFilter}}</samp></dd>\n        <dt>Level</dt>\n        <dd class="{{logEntry.levelClass}}"><samp>{{logEntry.level}}</samp></dd>\n        <dt>Logger</dt>\n        <dd><samp>{{logEntry.logger}}</samp></dd>\n        <div ng-show="logEntry.hasLogSourceLineHref">\n          <dt>Class</dt>\n          <dd><samp>{{logEntry.className}}</samp></dd>\n          <dt>Method</dt>\n          <dd><samp>{{logEntry.methodName}}</samp></dd>\n          <dt>File</dt>\n          <dd><samp>{{logEntry.fileName}}:{{logEntry.lineNumber}}</samp></dd>\n        </div>\n        <div ng-show="logEntry.host">\n          <dt>Host</dt>\n          <dd><samp>{{logEntry.host}}</samp></dd>\n        </div>\n        <dt>Thread</dt>\n        <dd><samp>{{logEntry.thread}}</samp></dd>\n        <div ng-show="logEntry.hasOSGiProps">\n          <div ng-show="logEntry.properties[\'bundle.name\']">\n            <dt>Bundle Name</dt>\n            <dd><samp>{{logEntry.properties[\'bundle.name\']}}</samp></dd>\n          </div>\n          <div ng-show="logEntry.properties[\'bundle.id\']">\n            <dt>Bundle ID</dt>\n            <dd><samp>{{logEntry.properties[\'bundle.id\']}}</samp></dd>\n          </div>\n          <div ng-show="logEntry.properties[\'bundle.version\']">\n            <dt>Bundle Version</dt>\n            <dd><samp>{{logEntry.properties[\'bundle.version\']}}</samp></dd>\n          </div>\n        </div>\n        <dt>Message</dt>\n        <dd><samp>{{logEntry.sanitizedMessage}}</samp></dd>\n      </dl>\n      <dl ng-if="logEntry.exception">\n        <dt>Stack Trace</dt>\n        <dd>\n          <samp>\n            <ul class="list-unstyled">\n              <li ng-repeat="frame in logEntry.exception" class="log-jmx-stacktrace-list-item">{{frame}}</li>\n            </ul>\n          </samp>\n        </dd>\n      </dl>\n    </div>\n  </script>\n\n</div>\n');}]); hawtioPluginLoader.addModule("hawtio-log-templates");