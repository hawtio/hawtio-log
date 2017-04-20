/// <reference path="../../../libs/hawtio-core-dts/angular.d.ts" />
/// <reference path="../../../libs/hawtio-utilities/d.ts/coreHelpers.d.ts" />
/// <reference path="../../../libs/hawtio-jmx/d.ts/jmx/ts/workspace.d.ts" />
/// <reference path="../../../libs/hawtio-ui/d.ts/toastr/ts/toastrPlugin.d.ts" />
/// <reference path="logPlugin.d.ts" />
declare namespace Log {
    interface ILog {
        seq: string;
        timestamp: string;
        level: string;
        logger: string;
        message: string;
        sanitizedMessage: string;
    }
}
