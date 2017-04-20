/// <reference path="../../../libs/hawtio-core-dts/angular.d.ts"/>

namespace Log {

  export function logSourceHref(row) {
    if (!row) {
      return "";
    }
    var log = row.entity;
    if (log) {
      return logSourceHrefEntity(log);
    } else {
      return logSourceHrefEntity(row);
    }
  }

  export function treeContainsLogQueryMBean(workspace) {
    return workspace.treeContainsDomainAndProperties('io.fabric8.insight', {type: 'LogQuery'}) ||
      workspace.treeContainsDomainAndProperties('org.fusesource.insight', {type: 'LogQuery'});
  }

  export function isSelectionLogQueryMBean(workspace) {
    return workspace.hasDomainAndProperties('io.fabric8.insight', {type: 'LogQuery'}) ||
      workspace.hasDomainAndProperties('org.fusesource.insight', {type: 'LogQuery'});
  }

  export function findLogQueryMBean(workspace) {
    var node = workspace.findMBeanWithProperties('io.fabric8.insight', {type: 'LogQuery'});
    if (!node) {
      node = workspace.findMBeanWithProperties('org.fusesource.insight', {type: 'LogQuery'});
    }
    return node ? node.objectName : null;
  }

  export function logSourceHrefEntity(log) {
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
    } else {
      return "";
    }
  }

  export function hasLogSourceHref(log) {
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

  export function hasLogSourceLineHref(log) {
    var line = log["lineNumber"];
    return angular.isDefined(line) && line !== "" && line !== "?";
  }

  export function removeQuestion(text: string): string {
    return (!text || text === "?") ? null : text;
  }

  export function getLogCacheSize(localStorage) {
    var text = localStorage['logCacheSize'];
    if (text) {
      return parseInt(text);
    }
    return 1000;
  }
}
