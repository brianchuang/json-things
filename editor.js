'use-strict'
const ace = require('./ace/ace');
const range = ace.require('ace/range').Range;
const Promise = require('./node_modules/bluebird/js/browser/bluebird.min');
const Ajv = require('./node_modules/ajv/dist/ajv.min.js');
const jsonMap = require('json-source-map');

class Editor {
    constructor(container_id, schemas, path_to_self, ace_options, style_options) {
        let self = this;
        ace.config.set("packaged", true);
        ace.config.set('basePath', path_to_self + '/ace/');
        self.editor = ace.edit(container_id, ace_options);
        $(window).resize(function () {
            self.editor.resize();
        });
        self.validator = new SchemaValidator(schemas);
        self.ace_options = ace_options;
        self.container_id = container_id;
        self.ace_marker_holder = [];
        self.line_marker_style = style_options.line || 'editor_line-highlight';
        self.text_marker_style = style_options.text || 'editor_error-highlight';
    }

    checkValid() {
        let self = this;

        let file_data = $('#editor').text();
        try {
            $('[data-toggle="tooltip"]').tooltip('dispose');
        } catch (e) {
            $('[data-toggle="tooltip"]').tooltip('destroy');
        }
        let deleted_markers = [];
        while (self.ace_marker_holder.length > 0) {
            let remove_id = self.ace_marker_holder.pop();

            self.editor.getSession().removeMarker(remove_id);
            deleted_markers.push(self.checkMarkerDeleted(self.ace_marker_holder.length));
        }
        return Promise.all(deleted_markers).then(function () {

            return Promise.resolve().then(function () {
                let file_text = self.editor.getSession().getValue().trim();
                if (file_text === '') {
                    return Promise.resolve(false);
                }
                let annotations = self.editor.getSession().getAnnotations();
                if (annotations.length == 0) {
                    let promises = [];
                    file_data = JSON.parse(file_text);
                    self.editor.getSession().setValue(JSON.stringify(file_data, null, "    "));
                    let schema_errors = self.validator.testJSON(file_data, 'signal-file');
                    if (schema_errors.length > 0) {
                        schema_errors.forEach(error => {
                            let marker_range = undefined;
                            if (error.type === 'required') {
                                try {
                                    marker_range = new range(error.path.key.line, error.path.key.column, error.path.keyEnd.line, error.path.keyEnd.column);
                                    marker_range.start = self.editor.getSession().doc.createAnchor(marker_range.start);
                                    marker_range.end = self.editor.getSession().doc.createAnchor(marker_range.end);
                                } catch (e) {
                                    marker_range = new range(error.path.value.line, error.path.value.column, error.path.valueEnd.line, error.path.valueEnd.column);
                                    marker_range.start = self.editor.getSession().doc.createAnchor(marker_range.start);
                                    marker_range.end = self.editor.getSession().doc.createAnchor(marker_range.end);
                                }
                            } else {
                                marker_range = new range(error.path.value.line, error.path.value.column, error.path.valueEnd.line, error.path.valueEnd.column);
                                marker_range.start = self.editor.getSession().doc.createAnchor(marker_range.start);
                                marker_range.end = self.editor.getSession().doc.createAnchor(marker_range.end);
                            }
                            self.ace_marker_holder.push(self.editor.getSession().addMarker(marker_range, self.line_marker_style + ' marker_' + self.ace_marker_holder.length, 'fullLine'));

                            self.ace_marker_holder.push(self.editor.getSession().addMarker(marker_range, self.text_marker_style + ' marker_' + self.ace_marker_holder.length, 'text'));
                            let marker_label = 'marker_' + (self.ace_marker_holder.length - 1);
                            promises.push(self.checkMarker({label: marker_label, text: error.text}));
                        });
                        Promise.all(promises).then(data => {
                            for (let i = 0; i < data.length; i++) {
                                self.createTooltip(data[i].label, data[i].text);
                            }
                            $('body').tooltip({
                                selector: '[data-toggle="tooltip"]',
                                placement: "bottom"
                            })
                        });
                        return Promise.resolve(false);
                    }

                    return Promise.resolve(true);
                }
                return Promise.resolve(false);
            });

        });
    }

    checkMarkerDeleted(marker_id) {
        let self = this;
        let marker_label = '.marker_' + marker_id;
        return Promise.resolve().then(function () {
            if ($(marker_label).length === 0) {
                return Promise.resolve();
            } else
                return Promise.delay(100).then(() => {
                    return self.checkMarkerDeleted(marker_id);
                });
        });
    }

    checkMarker(marker_data) {
        let self = this;
        return Promise.resolve().then(function () {
            if ($('.' + marker_data.label).length > 0) {
                return Promise.resolve();
            } else
                return Promise.delay(100).then(() => {
                    return self.checkMarker(marker_data);
                });
        }).return(marker_data);
    }

    createTooltip(marker_label, text) {
        $('.' + marker_label).attr('data-toggle', 'tooltip');
        $('.' + marker_label).attr('data-container', 'body');
        $('.' + marker_label).attr('title', text);
    }

    setTheme(theme_path) {
        let self = this;
        self.editor.setTheme(theme_path);
        self.ace_options['theme'] = theme_path;
    }

    destroy() {
        let self = this;
        if (self.editor !== undefined) {
            self.editor.destroy();
            $(window).off('resize');
            let oldDiv = self.editor.container;
            let newDiv = oldDiv.cloneNode(false);
            oldDiv.parentNode.replaceChild(newDiv, oldDiv);
            self.editor = undefined;
            $('#' + self.container_id).removeAttr('class');
            $('#' + self.container_id).removeAttr('style');
        }
    }

    recreate() {
        let self = this;
        self.destroy();
        self.editor = ace.edit(self.container_id, self.ace_options);
    }

    getContent() {
        let self = this;
        return self.editor.getValue();
    }
}

class SchemaValidator {
    constructor(lookUpTable) {
        let self = this;
        self.ajv = new Ajv({allErrors: true, jsonPointers: true});
        Object.keys(lookUpTable).forEach(function (file_type) {
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
    testJSON(data, file_type) {
        let self = this;
        let init_test = self.ajv.validate(file_type + '/' + 'BASE', data);
        if (!init_test) {
            let pointers = jsonMap.stringify(data, null, '\t').pointers;
            //returns out relavent information such as line number/padding as to where the error is
            //return this.ajv.errors;
            let errorDialogs = self.ajv.errors.map(error => {
                let errorDialog = {};
                if (error.keyword === 'enum')
                    errorDialog['text'] = error.message + ': ' + JSON.stringify(error.params.allowedValues);
                else
                    errorDialog['text'] = error.message;
                errorDialog['type'] = error.keyword;
                errorDialog['dataPath'] = error.dataPath;
                errorDialog['path'] = pointers[error.dataPath];
                return errorDialog;
            });
            let temp = {}
            errorDialogs.forEach(error => {
                temp[error.dataPath] = temp[error.dataPath] || error;
                if (error.type === 'enum')
                    temp[error.dataPath] = error;
                if (error.type === 'required')
                    temp[error.dataPath] = error;
            });
            return Object.values(temp);
        }
        let schema_key = self.getSchemaKey(data, file_type);
        let valid = self.ajv.validate(schema_key, data);
        //in the case where schema_path does not exist;
        if (!valid) {
            let pointers = jsonMap.stringify(data, null, '\t').pointers;
            //returns out relavent information such as line number/padding as to where the error is
            //return this.ajv.errors;
            let errorDialogs = self.ajv.errors.map(error => {
                let errorDialog = {};
                if (error.keyword === 'enum')
                    errorDialog['text'] = error.message + ': ' + JSON.stringify(error.params.allowedValues);
                else
                    errorDialog['text'] = error.message;
                errorDialog['type'] = error.keyword;
                errorDialog['dataPath'] = error.dataPath;
                errorDialog['path'] = pointers[error.dataPath];
                return errorDialog;
            });
            let temp = {}
            errorDialogs.forEach(error => {
                temp[error.dataPath] = temp[error.dataPath] || error;
                if (error.type === 'enum')
                    temp[error.dataPath] = error;
                if (error.type === 'required')
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
    getSchemaKey(data, file_type) {
        if (data.type)
            return file_type + '/' + data.type;
        return '';
    }
}

module.exports = Editor;