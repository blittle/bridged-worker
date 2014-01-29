var BuildBridgedWorker = function (workerFunction, workerExportNames, mainExportNames, mainExportHandles) {
	
	var baseWorkerStr = workerFunction.toString().match(/^\s*function\s*\(\s*\)\s*\{(([\s\S](?!\}$))*[\s\S])/)[1];
	var extraWorkerStr = [];

	// build a string for the worker end of the worker-calls-funciton-in-main-thread operation
	extraWorkerStr.push("var main = {};\n");
	for(var i=0;i<mainExportNames.length;i++){
		var name = mainExportNames[i];
		if(name.charAt(name.length-1) == "*"){
			name = name.substr(0,name.length-1);
			mainExportNames[i] = name;//we need this trimmed version back in main
			extraWorkerStr.push("main." + name + " = function(/* arguments */){\n var args = Array.prototype.slice.call(arguments); var buffers = args.pop(); \n self.postMessage({foo:'" + name +  "', args:args},buffers)\n}; \n");
		}else{
			extraWorkerStr.push("main." + name + " = function(/* arguments */){\n var args = Array.prototype.slice.call(arguments); \n self.postMessage({foo:'" + name +  "', args:args})\n}; \n");
		}
	}

	// build a string for the worker end of the main-thread-calls-function-in-worker operation
	var tmpStr = [];
	for(var i=0;i<workerExportNames.length;i++){
		var name = workerExportNames[i];
		name = name.charAt(name.length-1) == "*" ? name.substr(0,name.length-1) : name;
		tmpStr.push(name + ": " + name);
	}
	extraWorkerStr.push("var foos={" + tmpStr.join(",") + "};\n");
	extraWorkerStr.push("self.onmessage = function(e){\n");
	extraWorkerStr.push("if(e.data.foo in foos) \n  foos[e.data.foo].apply(null, e.data.args); \n else \n throw(new Error('Main thread requested function ' + e.data.foo + '. But it is not available.'));\n");
	extraWorkerStr.push("\n};\n");

	var fullWorkerStr = baseWorkerStr + "\n\n/*==== STUFF ADDED BY BuildBridgeWorker ==== */\n\n" + extraWorkerStr.join("");

	// create the worker
	var url = window.URL.createObjectURL(new Blob([fullWorkerStr],{type:'text/javascript'}));
	var theWorker = new Worker(url);

	// buid a funcion for the main part of worker-calls-function-in-main-thread operation
	theWorker.onmessage = function(e){
		var fooInd = mainExportNames.indexOf(e.data.foo);
		if(fooInd != -1)
			mainExportHandles[fooInd].apply(null, e.data.args);
		else
			throw(new Error("Worker requested function " + e.data.foo + ". But it is not available."));
	}

	// build an array of functions for the main part of main-thread-calls-function-in-worker operation
	var ret = {blobURL: url};//this is useful to know for debugging if you have loads of bridged workers in blobs with random names
	var makePostMessageForFunction = function(name,hasBuffers){
		if(hasBuffers)
			return function(/*args...,[ArrayBuffer,..]*/){var args = Array.prototype.slice.call(arguments); var buffers = args.pop(); theWorker.postMessage({foo:name,args:args},buffers);}
		else
			return function(/*args...*/){var args = Array.prototype.slice.call(arguments);  theWorker.postMessage({foo:name,args:args});};
	}

	for(var i=0;i<workerExportNames.length;i++){
		var name = workerExportNames[i];
		if(name.charAt(name.length-1) == "*"){
			name = name.substr(0,name.length-1);
			ret[name] = makePostMessageForFunction(name,true);
		}else{
			ret[name] = makePostMessageForFunction(name,false);
		}
	}

	return ret; //we return an object which lets the main thread call the worker.  The object will take care of the communication in the other direction.
}