const SchemaValidator = require('./schema-validator');
const Promise = require ('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const lookUpJSONSchema = {
	"signal-file" : {
		"BASE" : {
			"$schema": "http://json-schema.org/draft-07/schema#",
			"properties" : {
				"type" : {
					"type" : "string",
					"enum" : ["CX", "PL", "SAM", "TIMED", "TS", "VTIMED"]
				}
			},
			"additionalProperties" : true,
			"required" : ["type"]
		},

		"CX" : {
			"$schema": "http://json-schema.org/draft-07/schema#",
			"properties" : {
				"type" : {
					"const" : "CX"
				},
				"parameters" : {
					"type" : "object",
					"properties" : {
						"FILPARM": {"type" : "number"},
						"DATA" : {"type" : "string"},
						"CUSTOM" : {"type" : "string"},
						"FILTER" : {
							"type" : "string",
							"enum" : ["RNYQUIST", "RECTANGLE", "NYQUIST"]
						},
						"SRATE": {"type" : "number"},
						"DENCODE" : {
							"type" : "string", 
							"enum" : ["OFF", "ON"]
						},
						"CHANNEL" : {"type" : "string"},
						"MOD" : {"type" : "string"}
					},
					"additionalProperties" : false,
					"required" : ["DATA", "FILTER", "SRATE", "DENCODE", "CHANNEL", "MOD"],
					"if" : {
						"properties" : {
							"DATA" : {"const" : "CUSTOM"}
						}
					},
					"then" : {
						"required" : ["CUSTOM"]
					}
				}
			},
			"additionalProperties" : false,
			"required" : ["type", "parameters"]
		},
		"PL" : {
			"$schema": "http://json-schema.org/draft-07/schema#",
			"properties" : {
				"type" : {"constant" : "PL"},
				"parameters" : {
					"type" : "object", 
					"properties" : {
						"PRI" : {"type" : "number"},
						"PW" : {"type" : "number"}
					},
					"additionalProperties" : false,
					"required" : ["PRI", "PW"]
				}
			},
			"additionalProperties" : false,
			"required" : ["parameters"]
		},
		"SAM" : {
			"$schema": "http://json-schema.org/draft-07/schema#",
			"properties" : {
				"type" : {"const" : "SAM"},
				"parameters" : {
					"type" : "object", 
					"properties" : {
						"sampleRate" : {"type" : "number"},
						"signalFile" : {
							"type" : "string",
							"pattern" : "^.*\\.prm\s*$"
						},
						"filterBW" : {"type" : "number"}
					},
					"additionalProperties" : false,
					"required" : ["sampleRate", "signalFile"]
				}
			},
			"additionalProperties" : false,
			"required" : ["parameters"]
		},
		"TIMED" : {
			"$schema": "http://json-schema.org/draft-07/schema#",
			"properties" : {
				"type" : {"constant" : "TIMED"},
				"parameters" : {
					"type" : "object", 
					"properties" : {
						"CodePerNav" : {"type" : "number"},
						"NavMode" : {"type" : "string"},
						"NAVFile" : {"type" : "string"},
						"ModulationMode": {"type" : "string"},
						"NavRate" : {"type" : "number"},
						"CodeFile" : {"type" : "string"},
						"CodeLength" : {"type" : "number"}
					},
					"additionalProperties" : false,
					"required" : ["CodePerNav", "NavMode", "NAVFile", "ModulationMode", "NavRate", "CodeFile"]
				}
			},
			"additionalProperties" : false,
			"required" : ["parameters"]
		},
		"TS" : {
			"$schema": "http://json-schema.org/draft-07/schema#",
			"properties" : {
				"type" : {"constant" : "TS"},
				"parameters" : {
					"type" : "object", 
					"properties" : {
						"V2I" : {"type" : "number"},
						"V1I" : {"type" : "number"},
						"V1Q" : {"type" : "number"},
						"V2Q" : {"type" : "number"}
					},
					"if" : {
						"not" : {
							"properties" : {}
						}
					},
					"then" : {

						"required" : ["V2I", "V1I", "V1Q", "V2Q"]
					},

					"additionalProperties" : false
				},
			},
			"additionalProperties" : false,
			"required" : ["parameters"]
		},
		"VTIMED" : {
			"$schema": "http://json-schema.org/draft-07/schema#",
			"properties" : {
				"type" : {"const" : "VTIMED"},
				"parameters" : {
					"type" : "object", 
					"properties" : {
						"CodePerNav" : {"type" : "number"},
						"NavMode" : {"type" : "string"},
						"NAVFile" : {"type" : "string"},
						"ModulationMode": {"type" : "string"},
						"NavRate" : {"type" : "number"},
						"CodeFile" : {
							"type" : "string",
							"pattern" : "^.*\.Code\s*$"
						},
						"CodeLength" : {"type" : "number"}
					},
					"additionalProperties" : false,
					"required" : ["CodePerNav", "NavMode", "NAVFile", "ModulationMode", "NavRate", "CodeFile"]
				}
			},
			"additionalProperties" : false,
			"required" : ["parameters"]
		}
	}
};

test('testJSON with empty object to return no errors messages',  () => {
	let Validator = new SchemaValidator(lookUpJSONSchema);
	let data = {
	};
	let result =  Validator.testJSON(data, 'signal-file');
	console.log(result)
	expect(result.type).not.toBe('');
});

test('testJSON with no type to return errors', () => {
	let Validator = new SchemaValidator(lookUpJSONSchema);
	let data = {
	};
	let result =  Validator.testJSON(data, 'signal-file');
	expect(result).not.toBe('');
});

test('testJSON on CX file with no parameters to return error messages',  () => {
	let Validator = new SchemaValidator(lookUpJSONSchema);
	let data = {"type": "TIMED", "parameters": {"CodePerNav": 100000.0, "NAVFile": "zeros.Nav", "ModulationMode": "100.0 0.0:-100.0 0.0", "NavRate": 1.0, "CodeFile": "prn18ups10.Code"}}
	let result = Validator.testJSON(data, 'signal-file');
	console.log(result);
	expect(result).not.toBe('');
});

// //read contents of directory

// function readDirectoryFiles (dir_path) { 
// 	let JSON_file_contents = [];
// 	return fs.readdirAsync(dir_path).then(function (files) {
// 		files.forEach(function (file) {
// 			JSON_file_contents.push(fs.readFileAsync(dir_path + file, 'utf8'));
// 		});
// 		return Promise.all(JSON_file_contents).then(function(file_contents) {
// 			return file_contents;
// 		})
// 	}); 
// }

// test('Schema works on all sample CX', async () => {
// 	let Validator = new SchemaValidator(lookUpJSONSchema);
// 	let results = await readDirectoryFiles('./signal-files/CX/');
// 	results.forEach(function (json_text) {
// 		expect(Validator.testJSON(JSON.parse(json_text), 'signal-file')).toBe('');
// 	});
// });

// test('Schema works on all sample PL', async () => {
// 	let Validator = new SchemaValidator(lookUpJSONSchema);
// 	let results = await readDirectoryFiles('./signal-files/PL/');
// 	results.forEach(function (json_text) {
// 		expect(Validator.testJSON(JSON.parse(json_text), 'signal-file')).toBe('');
// 	});
// });

// test('Schema works on all sample SAM', async () => {
// 	let Validator = new SchemaValidator(lookUpJSONSchema);
// 	let results = await readDirectoryFiles('./signal-files/SAM/');
// 	results.forEach(function (json_text) {
// 		if(Validator.testJSON(JSON.parse(json_text), 'signal-file'))
// 			console.log(json_text);
// 		expect(Validator.testJSON(JSON.parse(json_text), 'signal-file')).toBe('');
// 	});
// });

// test('Schema works on all sample TIMED', async () => {
// 	let Validator = new SchemaValidator(lookUpJSONSchema);
// 	let results = await readDirectoryFiles('./signal-files/TIMED/');
// 	results.forEach(function (json_text) {
// 		expect(Validator.testJSON(JSON.parse(json_text), 'signal-file')).toBe('');
// 	});
// });

// test('Schema works on all sample TS', async () => {
// 	let Validator = new SchemaValidator(lookUpJSONSchema);
// 	let results = await readDirectoryFiles('./signal-files/TS/');
// 	results.forEach(function (json_text) {
// 		expect(Validator.testJSON(JSON.parse(json_text), 'signal-file')).toBe('');
// 	});
// });

// test('Schema works on all sample VTIMED', async () => {
// 	let Validator = new SchemaValidator(lookUpJSONSchema);
// 	let results = await readDirectoryFiles('./signal-files/VTIMED/');
// 	results.forEach(function (json_text) {
// 		expect(Validator.testJSON(JSON.parse(json_text), 'signal-file')).toBe('');
// 	});
// });