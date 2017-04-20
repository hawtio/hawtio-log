/// <reference path="logPlugin.ts"/>
/// <reference path="logs.ts"/>
/// <reference path="log.ts"/>
var Log;
(function (Log) {
    var LogService = (function () {
        LogService.$inject = ["$q", "jolokia"];
        function LogService($q, jolokia) {
            'ngInject';
            this.$q = $q;
            this.jolokia = jolokia;
        }
        LogService.prototype.filterLogs = function (logs, filterConfig) {
            var filteredLogs = logs;
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
            filterConfig.totalCount = logs.length;
            filterConfig.resultsCount = filteredLogs.length;
            return filteredLogs;
        };
        LogService.prototype.getInitialLogs = function (mbean, resultSize) {
            var _this = this;
            return this.$q(function (resolve, reject) {
                _this.jolokia.execute(mbean, "getLogResults(int)", resultSize, { success: resolve, error: reject });
            });
        };
        LogService.prototype.getMoreLogs = function (mbean, afterTimestamp, resultSize) {
            var _this = this;
            return this.$q(function (resolve, reject) {
                _this.jolokia.execute(mbean, "jsonQueryLogResults", JSON.stringify({ afterTimestamp: afterTimestamp, count: resultSize }), { success: resolve, error: reject });
            });
        };
        return LogService;
    }());
    Log.LogService = LogService;
})(Log || (Log = {}));


/// <reference path="../../../libs/hawtio-core-dts/angular.d.ts"/>
var Log;
(function (Log) {
    function logSourceHref(row) {
        if (!row) {
            return "";
        }
        var log = row.entity;
        if (log) {
            return logSourceHrefEntity(log);
        }
        else {
            return logSourceHrefEntity(row);
        }
    }
    Log.logSourceHref = logSourceHref;
    function treeContainsLogQueryMBean(workspace) {
        return workspace.treeContainsDomainAndProperties('io.fabric8.insight', { type: 'LogQuery' }) ||
            workspace.treeContainsDomainAndProperties('org.fusesource.insight', { type: 'LogQuery' });
    }
    Log.treeContainsLogQueryMBean = treeContainsLogQueryMBean;
    function isSelectionLogQueryMBean(workspace) {
        return workspace.hasDomainAndProperties('io.fabric8.insight', { type: 'LogQuery' }) ||
            workspace.hasDomainAndProperties('org.fusesource.insight', { type: 'LogQuery' });
    }
    Log.isSelectionLogQueryMBean = isSelectionLogQueryMBean;
    function findLogQueryMBean(workspace) {
        var node = workspace.findMBeanWithProperties('io.fabric8.insight', { type: 'LogQuery' });
        if (!node) {
            node = workspace.findMBeanWithProperties('org.fusesource.insight', { type: 'LogQuery' });
        }
        return node ? node.objectName : null;
    }
    Log.findLogQueryMBean = findLogQueryMBean;
    function logSourceHrefEntity(log) {
        var fileName = Log.removeQuestion(log.fileName);
        var className = Log.removeQuestion(log.className);
        var properties = log.properties;
        var mavenCoords = "";
        if (properties) {
            mavenCoords = properties["maven.coordinates"];
        }
        if (mavenCoords && fileName) {
            var link = "#/source/view/" + mavenCoords + "/class/" + className + "/" + fileName;
            var line = log.lineNumber;
            if (line) {
                link += "?line=" + line;
            }
            return link;
        }
        else {
            return "";
        }
    }
    Log.logSourceHrefEntity = logSourceHrefEntity;
    function hasLogSourceHref(log) {
        var properties = log.properties;
        if (!properties) {
            return false;
        }
        var mavenCoords = "";
        if (properties) {
            mavenCoords = properties["maven.coordinates"];
        }
        return angular.isDefined(mavenCoords) && mavenCoords !== "";
    }
    Log.hasLogSourceHref = hasLogSourceHref;
    function hasLogSourceLineHref(log) {
        var line = log["lineNumber"];
        return angular.isDefined(line) && line !== "" && line !== "?";
    }
    Log.hasLogSourceLineHref = hasLogSourceLineHref;
    function removeQuestion(text) {
        return (!text || text === "?") ? null : text;
    }
    Log.removeQuestion = removeQuestion;
    function getLogCacheSize(localStorage) {
        var text = localStorage['logCacheSize'];
        if (text) {
            return parseInt(text);
        }
        return 1000;
    }
    Log.getLogCacheSize = getLogCacheSize;
})(Log || (Log = {}));

/// <reference path="../../../libs/hawtio-core-dts/hawtio-core.d.ts"/>
/// <reference path="../../../libs/hawtio-jmx/d.ts/jmx/ts/workspace.d.ts"/>
/// <reference path="logHelpers.ts"/>
/// <reference path="log.service.ts"/>
var Log;
(function (Log) {
    var pluginName = 'log';
    var hasMBean = false;
    Log._module = angular.module(pluginName, [])
        .service('logService', Log.LogService);
    Log._module.config(["$routeProvider", function ($routeProvider) {
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
        }]);
    Log._module.run(["$location", "workspace", "helpRegistry", "preferencesRegistry",
        function ($location, workspace, helpRegistry, preferencesRegistry) {
            hasMBean = Log.treeContainsLogQueryMBean(workspace);
            helpRegistry.addUserDoc('log', 'plugins/log-jmx/doc/help.md', function () {
                return Log.treeContainsLogQueryMBean(workspace);
            });
            preferencesRegistry.addTab("Server Logs", "plugins/log-jmx/html/preferences.html", function () {
                return Log.treeContainsLogQueryMBean(workspace);
            });
            workspace.topLevelTabs.push({
                id: "logs",
                content: "Logs",
                title: "View and search the logs of this container",
                isValid: function (workspace) { return Log.treeContainsLogQueryMBean(workspace); },
                href: function () { return "#/logs"; }
            });
            workspace.subLevelTabs.push({
                content: '<i class="icon-list-alt"></i> Log',
                title: "View the logs in this process",
                isValid: function (workspace) { return Log.isSelectionLogQueryMBean(workspace); },
                href: function () { return "#/logs"; }
            });
        }]);
    Log._module.filter('logDateFilter', ["$filter", function ($filter) {
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
        }]);
    /**
     * Wraps the
     * @param text {string} haystack to search through
     * @param search {string} needle to search for
     * @param [caseSensitive] {boolean} optional boolean to use case-sensitive searching
     */
    Log._module.filter('highlight', function () {
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
    });
    hawtioPluginLoader.addModule(pluginName);
})(Log || (Log = {}));

/// <reference path="../../../libs/hawtio-core-dts/angular.d.ts"/>
/// <reference path="../../../libs/hawtio-utilities/d.ts/coreHelpers.d.ts"/>
/// <reference path="../../../libs/hawtio-jmx/d.ts/jmx/ts/workspace.d.ts"/>
/// <reference path="../../../libs/hawtio-ui/d.ts/toastr/ts/toastrPlugin.d.ts"/>
/// <reference path="logPlugin.ts"/>
/// <reference path="log.service.ts"/>
/// <reference path="log.ts"/>
var Log;
(function (Log) {
    Log._module.controller("Log.LogController", ["$scope", "$rootScope", "$routeParams", "$location", "localStorage",
        "workspace", "$timeout", "$window", "$document", "$templateCache", "$uibModal", 'logService', function ($scope, $rootScope, $routeParams, $location, localStorage, workspace, $timeout, $window, $document, $templateCache, $uibModal, logService) {
            var DEFAULT_MAX_SIZE = 1000;
            var UPDATE_SIZE = 20;
            var UPDATE_INTERVAL = 5000;
            var maxSize = Log.getLogCacheSize(localStorage) || DEFAULT_MAX_SIZE;
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
                        $scope.messageSearchText = getMessageFilterValues(filters);
                        $scope.filteredLogs = logService.filterLogs($scope.logs, this);
                    }
                }
            };
            $scope.showRowDetails = false;
            $scope.showRaw = {
                expanded: false
            };
            var logQueryMBean = Log.findLogQueryMBean(workspace);
            $scope.getLevelClass = function (level) { return 'text-' + Core.logLevelClass(level); };
            function getMessageFilterValues(filters) {
                return filters.filter(function (filter) { return filter.id === 'message'; }).map(function (filter) { return filter.value; });
            }
            ;
            $scope.selectedClass = function ($index) {
                if ($index === $scope.selectedRowIndex) {
                    return 'selected';
                }
                return '';
            };
            $scope.$watch('selectedRowIndex', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    if (newValue < 0 || newValue > $scope.logs.length) {
                        $scope.selectedRow = null;
                        $scope.showRowDetails = false;
                        return;
                    }
                    $scope.selectedRow = $scope.logs[newValue];
                    if (!$scope.showRowDetails) {
                        $scope.showRowDetails = true;
                    }
                }
            });
            $scope.hasOSGiProps = function (row) {
                return row && 'properties' in row && Object.keys(row.properties).some(function (key) { return key.indexOf('bundle') === 0; });
            };
            $scope.openLogModal = function (log) {
                console.log(log);
                var modalScope = $scope.$new(true);
                modalScope.log = log;
                $uibModal.open({
                    templateUrl: 'logDetailsModal.html',
                    scope: modalScope
                })
                    .result.finally(function () { return modalScope.$destroy(); });
            };
            $scope.selectRow = function ($index) {
                // in case the user clicks a row, closes the slideout and clicks
                // the row again
                if ($scope.selectedRowIndex == $index) {
                    $scope.showRowDetails = true;
                    return;
                }
                $scope.selectedRowIndex = $index;
            };
            $scope.getSelectedRowJson = function () {
                return angular.toJson($scope.selectedRow, true);
            };
            $scope.logSourceHref = Log.logSourceHref;
            $scope.hasLogSourceHref = function (row) {
                if (!row) {
                    return false;
                }
                return Log.hasLogSourceHref(row);
            };
            $scope.hasLogSourceLineHref = function (row) {
                if (!row) {
                    return false;
                }
                return Log.hasLogSourceLineHref(row);
            };
            $scope.formatStackTrace = Log.formatStackTrace;
            function loadLogs(response) {
                if (response.events) {
                    updateView(response.events);
                }
                scheduleNextRequest(response);
            }
            function updateView(logs) {
                logs.forEach(function (log) { return log.sanitizedMessage = Core.escapeHtml(log.message); });
                (_a = $scope.logs).push.apply(_a, logs);
                if ($scope.logs.length > maxSize) {
                    $scope.logs.splice(0, $scope.logs.length - maxSize);
                }
                $scope.filteredLogs = logService.filterLogs($scope.logs, $scope.toolbarConfig.filterConfig);
                var _a;
            }
            function scheduleNextRequest(response) {
                $timeout(function () {
                    logService.getMoreLogs(logQueryMBean, response.toTimestamp, UPDATE_SIZE)
                        .then(loadLogs)
                        .catch(function (response) {
                        Core.notification("error", "Failed to get a response! " + JSON.stringify(response.error, null, 4));
                    });
                }, UPDATE_INTERVAL);
            }
            if (logQueryMBean) {
                logService.getInitialLogs(logQueryMBean, maxSize)
                    .then(loadLogs)
                    .catch(function (response) {
                    Core.notification("error", "Failed to get a response! " + JSON.stringify(response.error, null, 4));
                });
            }
        }]);
})(Log || (Log = {}));

/// <reference path="../../../libs/hawtio-utilities/d.ts/baseHelpers.d.ts"/>
/// <reference path="../../../libs/hawtio-utilities/d.ts/preferenceHelpers.d.ts"/>
/// <reference path="logPlugin.ts"/>
var Log;
(function (Log) {
    Log._module.controller("Log.PreferencesController", ["$scope", "localStorage", function ($scope, localStorage) {
            Core.initPreferenceScope($scope, localStorage, {
                'logCacheSize': {
                    'value': 1000,
                    'converter': parseInt
                },
                'logSortAsc': {
                    'value': true,
                    'converter': Core.parseBooleanValue
                },
                'logAutoScroll': {
                    'value': true,
                    'converter': Core.parseBooleanValue
                },
                'logBatchSize': {
                    'value': 20,
                    'converter': parseInt,
                    'post': function (newValue) {
                        $scope.$emit('logBatchSize', newValue);
                    }
                }
            });
        }]);
})(Log || (Log = {}));

angular.module('hawtio-log-templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('plugins/log-jmx/html/logs.html','<div class="log-jmx-main" ng-controller="Log.LogController">\n\n  <div class="log-jmx-flex-container">\n    <div class="log-jmx-fixed-toolbar">\n      <h1>Log</h1>\n      <div ng-show="logs.length === 0">\n        <div class="spinner spinner-lg loading-page"></div>\n      </div>\n      <div ng-show="logs.length > 0">\n        <pf-toolbar config="toolbarConfig"></pf-toolbar>\n        <table class="table table-striped table-bordered log-jmx-header-table">\n          <thead>\n            <tr>\n              <th>Timestamp</th>\n              <th>Level</th>\n              <th>Logger</th>\n              <th>Message</th>\n            </tr>\n          </thead>\n        </table>\n      </div>\n    </div>\n    <div class="log-jmx-scrollable-table">\n      <div ng-show="logs.length > 0">\n        <table class="table table-striped table-bordered">\n          <tbody>\n            <tr ng-repeat="log in filteredLogs">\n              <td>{{log | logDateFilter}}</td>\n              <td class="{{getLevelClass(log.level)}}">{{log.level}}</td>\n              <td ng-switch="hasLogSourceHref(log)">\n                <a href="" ng-switch-when="true" ng-click="openLogModal(log)">{{log.logger}}</a>\n                <span ng-switch-default>{{log.logger}}</span>          \n              </td>\n              <td ng-bind-html="log.sanitizedMessage | highlight:messageSearchText"></td>\n            </tr>\n          </tbody>\n        </table>\n      </div>\n    </div>\n  </div>\n\n  <script type="text/ng-template" id="logDetailsModal.html">\n    <div class="modal-header">\n      <button type="button" class="close" aria-label="Close" ng-click="$dismiss()">\n        <span class="pficon pficon-close" aria-hidden="true"></span>\n      </button>\n      <h4 class="modal-title">Log Details</h4>\n    </div>\n    <div class="modal-body">\n      <dl class="dl-horizontal">\n        <dt>Timestamp</dt>\n        <dd>{{log.timestamp}}</dd>\n      </dl>\n    </div>\n  </script>\n\n  <!--div ng-show="showRowDetails" class="log-info-panel">\n    <div class="log-info-panel-frame">\n      <div class="log-info-panel-header">\n\n        <div class="row-fluid">\n          <button class="btn" ng-click="showRowDetails = false"><i class="icon-remove"></i> Close</button>\n          <div class="btn-group"\n             style="margin-top: 9px;"\n             hawtio-pager="logs"\n             on-index-change="selectRow"\n             row-index="selectedRowIndex">\n             </div>\n          <span>{{selectedRow | logDateFilter}}</span>\n          <span class="text-{{logClass(selectedRow)}}"><i class="{{logIcon(selectedRow)}}"></i> <strong>{{selectedRow.level}}</strong></span>\n        </div>\n\n        <div class="row-fluid">\n          <span title="{{selectedRow.logger}}" ng-switch="hasLogSourceHref(selectedRow)">\n            <strong>Logger:</strong>\n            <a ng-href="{{logSourceHref(selectedRow)}}" ng-switch-when="true">{{selectedRow.logger}}</a>\n            <span ng-switch-default>{{selectedRow.logger}}</span>\n          </span>\n        </div>\n      </div>\n\n      <div class="log-info-panel-body">\n\n        <div class="row-fluid" ng-show="hasLogSourceLineHref(selectedRow)">\n          <span><strong>Class:</strong> <span class="green">{{selectedRow.className}}</span></span>\n          <span><strong>Method:</strong> {{selectedRow.methodName}}</span>\n          <span><strong>File:</strong> <span class="blue">{{selectedRow.fileName}}</span>:<span class="green">{{selectedRow.lineNumber}}</span></span>\n        </div>\n\n        <div class="row-fluid">\n          <span ng-show="selectedRow.host"><strong>Host:</strong> {{selectedRow.host}}</span>\n          <span><strong>Thread:</strong> {{selectedRow.thread}}</span>\n        </div>\n\n        <div class="row-fluid" ng-show="hasOSGiProps(selectedRow)">\n          <span ng-show="selectedRow.properties[\'bundle.name\']">\n            <strong>Bundle Name:</strong> <span class="green">{{selectedRow.properties[\'bundle.name\']}}</span>\n          </span>\n          <span ng-show="selectedRow.properties[\'bundle.id\']">\n            <strong>Bundle ID:</strong> {{selectedRow.properties[\'bundle.id\']}}\n          </span>\n          <span ng-show="selectedRow.properties[\'bundle.version\']">\n            <strong>Bundle Version:</strong> {{selectedRow.properties[\'bundle.version\']}}\n          </span>\n         </div>\n\n        <div class="row-fluid">\n          <dl class="log-message">\n            <dt>\n              <span>Message:</span>\n              <button class="btn"\n                      zero-clipboard\n                      data-clipboard-text="{{selectedRow.message}}"\n                      title="Click to copy this message to the clipboard">\n                <i class="icon-copy"></i>\n              </button>\n            </dt>\n            <dd>\n              <pre ng-bind-html="selectedRow.sanitizedMessage"></pre>\n            </dd>\n          </dl>\n          <dl class="log-stack-trace" ng-hide="!selectedRow.exception">\n            <dt>\n              <span>Stack Trace:</span>\n              <button class="btn"\n                      zero-clipboard\n                      data-clipboard-text="{{selectedRow.exception}}"\n                      title="Click to copy this stacktrace to the clipboard">\n                <i class="icon-copy"></i>\n              </button>\n            </dt>\n            <dd ng-bind-html-unsafe="formatStackTrace(selectedRow.exception)"></dd>\n          </dl>\n        </div>\n\n      </div>\n    </div>\n  </div-->\n\n</div>\n');
$templateCache.put('plugins/log-jmx/html/preferences.html','<div ng-controller="Log.PreferencesController">\n\n  <form class="form-horizontal">\n    <label class="control-label">Sort ascending</label>\n    <div class="control-group">\n      <div class="controls">\n        <input type="checkbox" ng-model="logSortAsc">\n        <span class="help-block">Ascending inserts new log lines in the bottom, descending inserts new log lines in the top</span>\n      </div>\n    </div>\n  </form>\n\n  <form class="form-horizontal">\n    <label class="control-label">Auto scroll</label>\n    <div class="control-group">\n      <div class="controls">\n        <input type="checkbox" ng-model="logAutoScroll">\n        <span class="help-block">Whether to automatic scroll window when new log lines are added</span>\n      </div>\n    </div>\n  </form>\n\n  <form class="form-horizontal">\n    <div class="control-group">\n      <label class="control-label" for="logCacheSize" title="The number of log messages to keep in the browser">Log\n        cache size</label>\n      <div class="controls">\n        <input id="logCacheSize" type="number" ng-model="logCacheSize" min="0"/>\n      </div>\n    </div>\n  </form>\n\n  <form class="form-horizontal">\n    <div class="control-group">\n      <label class="control-label" for="logBatchSize" title="The maximum number of log messages to retrieve when loading new log lines">Log\n        batch size</label>\n      <div class="controls">\n        <input id="logBatchSize" type="number" ng-model="logBatchSize" min="1" max="1000"/>\n      </div>\n    </div>\n  </form>\n\n</div>\n');}]); hawtioPluginLoader.addModule("hawtio-log-templates");