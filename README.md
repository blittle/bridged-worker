BridgedWorker
=============

BridgedWorker is a function that makes communication between worker and main thread simple. It also means you can keep all related code in the same file, which is convenient. The source code is written by Daniel Manson and taken with permission from https://gist.github.com/d1manson/6714892.

## API
```javascript
BuildBridgedWorker = function(workerFunction,workerExportNames,mainExportNames,mainExportHandles)
```
 - **workerFunction** is a function, the interior of which will be turned into a string and used as a worker
 - **workerExportNames** should be an array of string function names available to main 
 - **mainExportNames** should be an array of string function names available to worker
 - **mainExportHandles** should be an array of the actual functions corresponding to the functions in main for both Names arrays, if the function name ends in an asterisk it means that the last argument passed is going to be an array of ArrayBuffers

The result of all this work is that inside the worker we can call main.SomeMainFunction(thing,otherthing,more,[buffer1,buffer2]) and in main we can call myWorker. `SomeWorkerFunction(hello,world,[buffer1,buffer2])`

## Example
```javascript
var workerCode = function () {
    "use strict;" //this will become the first line of the worker

    CalculateSomething(a, b, c, d) {
        var v = a + b + c + d; //trivial calculation
        main.DisplayResult(v, "hello");
    }

    CalculateSomethingBig(buff, d) {
        var v = new Uint32Array(buff);
        for (var i = 0; i <= v.length; i++) {
            v[i] /= d;
        }
        main.PlotFraction(v.buffer, "done", 0, 2, "world", [v.buffer]);
        //the buffer is fully transfered to the main thread (google "transferable objects javascript")
    }

    //the BuildBridgedWorker will add some extra code on the end to form the complete worker code
}

var DisplayResult = function (val, str) {
    // do something here
}

var PlotFraction = function (buffer, str1, p1, p2, str2) {
    // do something here
}

var theWorker = BuildBridgedWorker(workerCode, ["CalculateSomething", "CalculateSomethingBig*"], //note asterisk indicating ArrayBuffer transfer
    ["DisplayResult", "PlotFraction*"], [DisplayResult, PlotFraction]);

// Some example inputs
var w = 9,
    x = 100,
    y = 0,
    z = 2;
var v = new Uint32Array(100);

// And this is how you call the functions in the worker...

theWorker.CalculateSomething(w, x, y, z);
theWorker.CalculateSomethingBig(v.buffer, x, [v.buffer]);

// Note that with the CalculateSomethingBig the buffer is transfered to the worker thread (and dissapears on the main thread)
  ```
