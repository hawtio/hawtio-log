var Log;
(function (Log) {
    LogPreferencesController.$inject = ["$scope", "localStorage"];
    function LogPreferencesController($scope, localStorage) {
        'ngInject';
        // Initialize tooltips
        $('[data-toggle="tooltip"]').tooltip();
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
    Log.OPERATION_GET_LOG_RESULTS = "getLogResults(int)";
    Log.OPERATION_JSON_QUERY_LOG_RESULTS = "jsonQueryLogResults";
    Log.SEARCH_LOG_QUERY_MBEAN = "*:type=LogQuery";
    var LogsService = (function () {
        LogsService.$inject = ["$q", "jolokia", "localStorage"];
        function LogsService($q, jolokia, localStorage) {
            'ngInject';
            var _this = this;
            this.$q = $q;
            this.jolokia = jolokia;
            this.localStorage = localStorage;
            this.getLogQueryMBean()
                .then(function (mbean) { return _this.logQueryBean = mbean; });
        }
        LogsService.prototype.getInitialLogs = function () {
            var _this = this;
            return this.$q(function (resolve, reject) {
                _this.jolokia.execute(_this.logQueryBean, Log.OPERATION_GET_LOG_RESULTS, _this.getLogCacheSize(), {
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
            return this.$q(function (resolve, reject) {
                _this.jolokia.execute(_this.logQueryBean, Log.OPERATION_JSON_QUERY_LOG_RESULTS, JSON.stringify({ afterTimestamp: fromTimestamp, count: _this.getLogBatchSize() }), {
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
        LogsService.prototype.getLogQueryMBean = function () {
            var _this = this;
            return this.$q(function (resolve, reject) {
                _this.jolokia.search(Log.SEARCH_LOG_QUERY_MBEAN, {
                    success: function (response) {
                        if (response.length > 0) {
                            resolve(response[0]);
                        }
                        else {
                            resolve(null);
                        }
                    },
                    error: function (response) { return reject(response.error); }
                });
            });
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
    LogRun.$inject = ["$rootScope", "helpRegistry", "preferencesRegistry", "HawtioNav", "workspace", "logsService", "treeService"];
    var log = Logger.get('hawtio-log');
    var showPlugin = false;
    function LogConfig($routeProvider) {
        'ngInject';
        $routeProvider
            .when('/logs', { templateUrl: 'plugins/log-jmx/html/logs.html', reloadOnSearch: false })
            .when('/openlogs', {
            redirectTo: function () {
                // use a redirect, as the log plugin may not be valid, if we connect to a JVM which does not have the log mbean
                // in the JMX tree, and if that happens, we need to redirect to home, so another tab is selected
                if (showPlugin) {
                    return '/logs';
                }
                else {
                    return '/home';
                }
            }, reloadOnSearch: false
        });
    }
    Log.LogConfig = LogConfig;
    function LogRun($rootScope, helpRegistry, preferencesRegistry, HawtioNav, workspace, logsService, treeService) {
        'ngInject';
        logsService.getLogQueryMBean()
            .then(function (mbean) {
            if (!mbean) {
                return;
            }
            // check RBAC to figure out if this plugin should be visible
            treeService.runWhenTreeReady(function () {
                showPlugin = workspace.hasInvokeRightsForName(mbean, Log.OPERATION_GET_LOG_RESULTS);
                log.debug('RBAC - Logs tab visible:', showPlugin);
                registerPlugin(showPlugin, helpRegistry, preferencesRegistry, HawtioNav);
            });
        });
    }
    Log.LogRun = LogRun;
    function registerPlugin(active, helpRegistry, preferencesRegistry, HawtioNav) {
        helpRegistry.addUserDoc('log', 'plugins/log-jmx/doc/help.md', function () { return active; });
        preferencesRegistry.addTab("Server Logs", "plugins/log-jmx/html/log-preferences.html", function () { return active; });
        var navItem = HawtioNav.builder()
            .id('logs')
            .title(function () { return 'Logs'; })
            .isValid(function () { return active; })
            .href(function () { return '/logs'; })
            .build();
        HawtioNav.add(navItem);
    }
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
                onFilterChange: onFilterChange
            },
            isTableView: true
        };
        function onFilterChange(filters) {
            var tableScrolled = isTableScrolled();
            removePreviousLevelFilter(filters);
            $scope.messageSearchText = getMessageFilterValues(filters);
            $scope.filteredLogs = logsService.filterLogs($scope.logs, this);
            if (tableScrolled) {
                scrollTable();
            }
        }
        function removePreviousLevelFilter(filters) {
            _.remove(filters, function (filter, index) { return filter.id === 'level' && index < filters.length - 1 &&
                filters[filters.length - 1].id === 'level'; });
        }
        function getMessageFilterValues(filters) {
            return filters.filter(function (filter) { return filter.id === 'message'; }).map(function (filter) { return filter.value; });
        }
        ;
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
                    Core.notification("danger", "Failed to get a response!<br/>" + JSON.stringify(error, null, 4));
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
        logsService.getInitialLogs()
            .then(processLogEntries)
            .catch(function (error) {
            Core.notification("danger", "Failed to get a response!<br/>" + JSON.stringify(error, null, 4));
        });
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

angular.module('hawtio-log-templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('plugins/log-jmx/html/log-preferences.html','<form class="form-horizontal log-preferences-form" ng-controller="LogPreferencesController">\n\n  <div class="form-group">\n    <label class="col-md-2 control-label" for="logSortAsc">\n      Sort ascending\n      <span class="pficon pficon-info" data-toggle="tooltip" data-placement="top" title="Sort log entries by timestamp ascending"></span>\n    </label>\n    <div class="col-md-6">\n      <input type="checkbox" id="logSortAsc" ng-model="logSortAsc">\n    </div>\n  </div>\n\n  <div class="form-group">\n    <label class="col-md-2 control-label" for="logAutoScroll">\n      Auto scroll\n      <span class="pficon pficon-info" data-toggle="tooltip" data-placement="top" title="Automatically scroll when new log entries are added"></span>\n    </label>\n    <div class="col-md-6">\n      <input type="checkbox" id="logAutoScroll" ng-model="logAutoScroll">\n    </div>\n  </div>\n\n  <div class="form-group">\n    <label class="col-md-2 control-label" for="logCacheSize">\n      Log cache size\n      <span class="pficon pficon-info" data-toggle="tooltip" data-placement="top" title="The number of log messages to keep in the browser"></span>\n    </label>\n    <div class="col-md-6">\n      <input id="logCacheSize" type="number" class="form-control" ng-model="logCacheSize" min="0"/>\n    </div>\n  </div>\n\n  <div class="form-group">\n    <label class="col-md-2 control-label" for="logBatchSize">\n      Log batch size\n      <span class="pficon pficon-info" data-toggle="tooltip" data-placement="top" title="The maximum number of log messages to retrieve when loading new log lines"></span>\n    </label>\n    <div class="col-md-6">\n      <input id="logBatchSize" type="number" class="form-control" ng-model="logBatchSize" min="1" max="1000"/>\n    </div>\n  </div>\n\n</form>\n');
$templateCache.put('plugins/log-jmx/html/logs.html','<div class="log-jmx-main" ng-controller="LogsController">\n\n  <div class="log-jmx-flex-container">\n    <div class="log-jmx-fixed-toolbar">\n      <h1>Logs</h1>\n      <p ng-show="logs.length === 0">Loading...</p>\n      <div ng-show="logs.length > 0">\n        <pf-toolbar config="toolbarConfig"></pf-toolbar>\n        <table class="table table-striped log-jmx-header-table">\n          <thead>\n            <tr>\n              <th>Timestamp</th>\n              <th>Level</th>\n              <th>Logger</th>\n              <th>Message</th>\n            </tr>\n          </thead>\n        </table>\n      </div>\n    </div>\n    <div class="log-jmx-scrollable-table" ng-show="logs.length > 0">\n      <table class="table table-striped">\n        <tbody>\n          <tr ng-repeat="logEntry in filteredLogs">\n            <td>{{logEntry | logDateFilter}}</td>\n            <td class="{{logEntry.levelClass}}">{{logEntry.level}}</td>\n            <td ng-switch="logEntry.hasLogSourceHref">\n              <a href="" ng-switch-when="true" ng-click="openLogModal(logEntry)">{{logEntry.logger}}</a>\n              <span ng-switch-default>{{logEntry.logger}}</span>\n            </td>\n            <td ng-bind-html="logEntry.sanitizedMessage | highlight:messageSearchText"></td>\n          </tr>\n        </tbody>\n      </table>\n    </div>\n  </div>\n\n  <script type="text/ng-template" id="logDetailsModal.html">\n    <div class="modal-header">\n      <button type="button" class="close" aria-label="Close" ng-click="$dismiss()">\n        <span class="pficon pficon-close" aria-hidden="true"></span>\n      </button>\n      <h4 class="modal-title">Log</h4>\n    </div>\n    <div class="modal-body">\n      <dl class="dl-horizontal">\n        <dt>Timestamp</dt>\n        <dd>{{logEntry | logDateFilter}}</dd>\n        <dt>Level</dt>\n        <dd class="{{logEntry.levelClass}}">{{logEntry.level}}</dd>\n        <dt>Logger</dt>\n        <dd>{{logEntry.logger}}</dd>\n        <div ng-show="logEntry.hasLogSourceLineHref">\n          <dt>Class</dt>\n          <dd>{{logEntry.className}}</dd>\n          <dt>Method</dt>\n          <dd>{{logEntry.methodName}}</dd>\n          <dt>File</dt>\n          <dd>{{logEntry.fileName}}:{{logEntry.lineNumber}}</dd>\n        </div>\n        <div ng-show="logEntry.host">\n          <dt>Host</dt>\n          <dd>{{logEntry.host}}</dd>\n        </div>\n        <dt>Thread</dt>\n        <dd>{{logEntry.thread}}</dd>\n        <div ng-show="logEntry.hasOSGiProps">\n          <div ng-show="logEntry.properties[\'bundle.name\']">\n            <dt>Bundle Name</dt>\n            <dd>{{logEntry.properties[\'bundle.name\']}}</dd>\n          </div>\n          <div ng-show="logEntry.properties[\'bundle.id\']">\n            <dt>Bundle ID</dt>\n            <dd>{{logEntry.properties[\'bundle.id\']}}</dd>\n          </div>\n          <div ng-show="logEntry.properties[\'bundle.version\']">\n            <dt>Bundle Version</dt>\n            <dd>{{logEntry.properties[\'bundle.version\']}}</dd>\n          </div>\n        </div>\n        <dt>Message</dt>\n        <dd>{{logEntry.sanitizedMessage}}</dd>\n      </dl>\n      <dl ng-if="logEntry.exception">\n        <dt>Stack Trace</dt>\n        <dd>\n          \n            <ul class="list-unstyled">\n              <li ng-repeat="frame in logEntry.exception" class="log-jmx-stacktrace-list-item">{{frame}}</li>\n            </ul>\n          \n        </dd>\n      </dl>\n    </div>\n  </script>\n\n</div>\n');
$templateCache.put('plugins/log-jmx/doc/help.md','### Logs\n\nWhen we run middleware we spend an awful lot of time looking at and searching logs. With [hawtio](http://hawt.io/) we don\'t just do logs, we do _hawt logs_.\n\nSure logs are nicely coloured and easily filtered as you\'d expect. But with hawtio we try to link all log statements and exception stack traces to the actual lines of code which generated them; so if a log statement or line of exception doesn\'t make sense - just click the link and view the source code! Thats _hawt_!\n\nWe can\'t guarantee to always be able to do download the source code; we need to find the maven coordinates (group ID, artifact ID, version) of each log statement or line of stack trace to be able to do this. So awesomeness is not guaranteed, but it should work for projects which have published their source code to either the global or your local maven repository.\n\nWe should try encourage all projects to publish their source code to maven repositories (even if only internally to an internal maven repo for code which is not open source).\n\n##### How to enable hawtio logs\n\nHawtio uses an MBean usually called LogQuery which implements the [LogQuerySupportMBean interface](https://github.com/fusesource/fuse/blob/master/insight/insight-log-core/src/main/java/org/fusesource/insight/log/support/LogQuerySupportMBean.java#L26) from either the [insight-log](https://github.com/fusesource/fuse/tree/master/insight/insight-log) or [insight-log4j](https://github.com/fusesource/fuse/tree/master/insight/insight-log4j) bundles depending on if you are working inside or outside of OSGi respectively.\n\nIf you are using OSGi and use [Fuse Fabric](http://fuse.fusesource.org/fabric/) or [Fuse ESB](http://fusesource.com/products/fuse-esb-enterprise/) you already have [insight-log](https://github.com/fusesource/fuse/tree/master/insight/insight-log) included. If not, or you are just using Apache Karaf just add the **insight-log** bundle.\n\nIf you are not using OSGi then you just need to ensure you have [insight-log4j](https://github.com/fusesource/fuse/tree/master/insight/insight-log4j) in your WAR when you deploy hawtio; which is already included in the [hawtio sample war](https://github.com/hawtio/hawtio/tree/master/sample).\n\nThen you need to ensure that the LogQuery bean is instantiated in whatever dependency injection framework you choose. For example this is [how we initialise LogQuery](https://github.com/hawtio/hawtio/blob/master/hawtio-web/src/test/resources/applicationContext.xml#L18) in the [sample war](https://github.com/hawtio/hawtio/tree/master/sample) using spring XML:\n\n    <bean id="logQuery" class="io.fabric8.insight.log.log4j.Log4jLogQuery"\n          lazy-init="false" scope="singleton"\n          init-method="start" destroy-method="stop"/>\n\n##### Things that could go wrong\n\n* If you have no Logs tab in hawtio, then\n     * if you are in OSGi it means you are not running either the [insight-log bundle](https://github.com/fusesource/fuse/tree/master/insight/insight-log)\n     * if you are outside of OSGi it means you have not added the [insight-log4j jar](https://github.com/fusesource/fuse/tree/master/insight/insight-log4j) to your hawtio web app or you have not properly initialised the insight-log4j jar to then initialise the LogQuery mbean\n* If links don\'t appear in the Logger column on the logs tab of your hawtio then the maven coordinates cannot be resolved for some reason\n* If links are there but clicking on them cannot find any source code it generally means the maven repository resolver is not working. You maybe need to configure a local maven repository proxy so hawtio can access the source jars? Or maybe you need to start publishing the source jars?\n\n##### How hawtio logs work\n\nTo be able to link to the source we need the maven coordinates (group ID, artifact ID, version), the relative file name and line number.\n\nMost logging frameworks generate the className and/or file name along with the line number; the maven coordinates are unfortunately not yet common.\n\nThere\'s been [an idea to add better stack traces to log4j](http://macstrac.blogspot.co.uk/2008/09/better-stack-traces-in-java-with-log4j.html) along with a [patch](https://issues.apache.org/bugzilla/show_bug.cgi?id=45721) which is now included in log4j. Then a similar patch has been added to [logback](http://jira.qos.ch/browse/LOGBACK-690)\n\nThe missing part is to also add maven coordinates to non-stack traces; so all log statements have maven coordinates too. This is then implemented by either the [insight-log](https://github.com/fusesource/fuse/tree/master/insight/insight-log) or [insight-log4j](https://github.com/fusesource/fuse/tree/master/insight/insight-log4j) bundles depending on if you are working inside or outside of OSGi respectively.\n\n##### The hawtio source plugin\n\nOnce we\'ve figured out the maven coordinates, class & file name and line number we need to link to the source code from the [log plugin](https://github.com/hawtio/hawtio/tree/master/hawtio-web/src/main/webapp/app/log). This is where the [source plugin](https://github.com/hawtio/hawtio/tree/master/hawtio-web/src/main/webapp/app/source) comes in.\n\nIf you wish to use links to source code from any other [hawtio plugin](http://hawt.io/plugins/index.html) just use the following link syntax for your hypertext link:\n\n    #/source/view/:mavenCoords/:className/:fileName\n\ne.g. to link to a line of the camel source code you could use the following in your HTML:\n\n    <a href="#/source/view/org.apache.camel:camel-core:2.10.0/org.apache.camel.impl.DefaultCamelContext/DefaultCamelContext.java?line=1435">\n    org.apache.camel.impl.DefaultCamelContext.java line 1435</a>\n\nNote that the className argument is optional; its usually there as often logging frameworks have the fully qualified class name, but just a local file name (like _DefaultCamelContext.java_ above).\n\nYou can also specify a list of space separated maven coordinates in the mavenCoords parameter; the server will scan each maven coordinate in turn looking for the file. This helps deal with some uberjars which really combine multiple jars together and so require looking into the source of each of their jars.\n\n\n');}]); hawtioPluginLoader.addModule("hawtio-log-templates");