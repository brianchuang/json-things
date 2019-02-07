'use strict'
const Ajv = require('./node_modules/ajv/dist/ajv.min.js');
const jsonMap = require('json-source-map');
class SchemaValidator {
	constructor (lookUpTable) {
		let self = this;
		self.ajv = new Ajv({allErrors: true, jsonPointers : true});
		Object.keys(lookUpTable).forEach (function (file_type) {
			Object.keys(lookUpTable[file_type]).forEach(function (schema_type) { 
				self.ajv.addSchema(lookUpTable[file_type][schema_type], file_type + '/' + schema_type);
			});
		});
	}

	/**
	 * [testJSON description]
	 * @param  {Object} data      The JSON object to be tested
	 * @param  {String} file_type What type of file is it (i.e. signal-file)
	 * @return {String}           A string with results being the errors in the data parameter or the empty string if no error
	 */
	 testJSON (data, file_type) { 
	 	let self = this;
	 	let init_test = self.ajv.validate(file_type + '/' + 'BASE', data);
	 	if(!init_test){
	 		let pointers = jsonMap.stringify(data, null, '\t').pointers;
			//returns out relavent information such as line number/padding as to where the error is
			//return this.ajv.errors;
			let errorDialogs =  self.ajv.errors.map(error => {
				let errorDialog = {};
				if(error.keyword === 'enum')
					errorDialog['text'] = error.message + ': ' + JSON.stringify(error.params.allowedValues);
				else	
					errorDialog['text'] = error.message;
				errorDialog['type'] = error.keyword;
				errorDialog['dataPath'] = error.dataPath;
				errorDialog['path'] = pointers[error.dataPath];
				return errorDialog;
			});
			let temp = {}
			errorDialogs.forEach(error=> {
				temp[error.dataPath] = temp[error.dataPath] || error;
				if(error.type === 'enum')
					temp[error.dataPath] = error;
				if(error.type === 'required')
					temp[error.dataPath] = error;
			});	
			return Object.values(temp);
		}
		let schema_key = self.getSchemaKey(data, file_type);
		let valid = self.ajv.validate(schema_key, data);
	 	//in the case where schema_path does not exist;
	 	if(!valid){
	 		let pointers = jsonMap.stringify(data, null, '\t').pointers;
			//returns out relavent information such as line number/padding as to where the error is
			//return this.ajv.errors;
			let errorDialogs =  self.ajv.errors.map(error => {
				let errorDialog = {};
				if(error.keyword === 'enum')
					errorDialog['text'] = error.message + ': ' + JSON.stringify(error.params.allowedValues);
				else	
					errorDialog['text'] = error.message;
				errorDialog['type'] = error.keyword;
				errorDialog['dataPath'] = error.dataPath;
				errorDialog['path'] = pointers[error.dataPath];
				return errorDialog;
			});
			let temp = {}
			errorDialogs.forEach(error=> {
				temp[error.dataPath] = temp[error.dataPath] || error;
				if(error.type === 'enum')
					temp[error.dataPath] = error;
				if(error.type === 'required')
					temp[error.dataPath] = error;
			});	
			return Object.values(temp);
				// let error = ajv_errors[0];
			// return {row : error.start.line, column : error.start.column, text : error.error, type : "error"};
		}
		return '';
	}
	/**
	 * Grabs the schema file path
	 * @param  {Object} data      The JSON object to be tested
	 * @param  {String} file_type What type of file is it (i.e. signal-file)
	 * @return {String}           The schema
	 */
	 getSchemaKey (data, file_type) {
	 	if(data.type)
	 		return file_type + '/' + data.type;
	 	return '';
	 }
	}
	module.exports = SchemaValidator;
