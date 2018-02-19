/*!
    Title: vue-j-ajax
    URL: https://github.com/lilpug/vue-j-ajax
    Version: 1.6.0
    Author: David Whitehead
    Copyright (c) David Whitehead
    Copyright license: MIT
    Description: vue-j-ajax is a simple vuejs plugin which wraps jQuery AJAX calls up and sends any data in the form data format.	         
    Requires: jQuery 2.2+
*/
var VueJAjax =
{
    install: function (Vue, options)
    {
		//Adds a global prototype function that converts a data object from null to undefined format so it does not go to the server as "null"
		//Note: this is needed as vuejs uses the default null state internally and can be often sent to the server as "null"
		Vue.prototype.$ObjectNullToUndefined = function (data)
        {
			//Creates a new object
			var filteredData = {};
			
			//Loops over the data object
			$.each(data, function(key, value)
			{
				//Checks if the property is null if so sets it to undefined
				if(value === null)
				{
					filteredData[key] = undefined;
				}
				//Checks if the property is another object type and if so recursively pushes it through the same function
				else if(typeof value === "object" & (!(value instanceof File) && !(value instanceof FileList) && !(value instanceof Array)))
				{
					filteredData[key] = this.$ObjectNullToUndefined(value);
				}
				//Otherwise simply add the generic value for the property
				else
				{
					filteredData[key] = value;
				}
			}.bind(this));
			
			//Returns the updated object data
			return filteredData;
		};
		
        //Adds a global prototype function to convert object data to formdata recursively
        Vue.prototype.$ConvertObjectToFormData = function (data, formData, parentName)
        {
            //Creates the formData object
            var formData = formData || new FormData();

            //Loops over the passed data object and converts the keys and values into the formData format
            $.each(data, function (key, value)
            {
                //If its a basic type then just append it otherwise loop over adding it            
                if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number")
                {
                    //Has a parent value so use this with the key
                    if (parentName != null && parentName != undefined)
                    {
                        //Stores the key while its being built
                        key = parentName + "[" + key + "]";
                    }

                    formData.append(key, value);
                }
                else if (typeof value === "object" && (!(value instanceof File) && !(value instanceof FileList) && !(value instanceof Array)) )
                {   
                    //used to store the compiled name
                    var name = key;

                    //Checks if the parent name is empty as shows this is the first time, otherwise also use the parentName supplied
                    if (parentName != null && parentName != undefined)
                    {
                        name = parentName + "[" + key + "]"; 
                    }

                    this.$ConvertObjectToFormData(value, formData, name);
                }
                else 
                {
                    //Has a parent value so use this with the key
                    if (parentName != null && parentName != undefined)
                    {
                        //Stores the key while its being built
                        key = parentName + "[" + key + "]";
                    }

                    //Note: this section is general used for arrays or filelist etc
                    $.each(value, function (key2, value2)
                    {
                        //Note:We only need the value so we use the key supplied at the start
                        formData.append(key, value2);
                    });
                }
            }.bind(this));

            //Returns the converted object
            return formData;
        };

        //Adds the extra global functions and reactive data to all vue instances
        Vue.mixin({
            data: function () {
                return {
                    fileUploadProgress:
                    {
                        totalSize: null,
                        currentUploadSize: null,
                        percentage: null,
                        roundedPercentage: null
                    }
                };
            },
            methods:
            {
                //This functions resets the reactive data
                'VueJAjaxClearProgressData': function () {
                    this.fileUploadProgress.totalSize = null;
                    this.fileUploadProgress.currentUploadSize = null;
                    this.fileUploadProgress.percentage = 0;
                    this.fileUploadProgress.roundedPercentage = 0;
                },

                //This wraps the default form data ajax call and exposes its call back functions
                'VueJAjax': function (options) {
                    //Sets up the default options
                    defaultOptions =
                        {
                            parameters: null,
                            method: null,
                            url: null,
                            dataReturnType: null,
                            doneCallBack: null,
                            failCallBack: null,

                            //default is 24 hour timeout
                            timeout: 1000 * 60 * 60 * 24
                        };

                    //Merges the default options with the supplied one so we have all variable requirements
                    options = $.extend(defaultOptions, options);
                        
                    //If there is parameters to send convert it to form data
                    var formData = null;
                    if (options.parameters) 
					{
						//Converts any null instances to undefined so the server understands them correctly
						formData = this.$ObjectNullToUndefined(options.parameters);
						
						//Processes the data object into formdata format
                        formData = this.$ConvertObjectToFormData(formData);
                    }
                        
                    //Runs and returns the ajax methods promise and hits the callbacks if supplied
                    return $.ajax(
                        {
                            type: options.method,
                            url: options.url,

                            timeout: options.timeout,

                            contentType: false,
                            processData: false,

                            dataType: options.dataReturnType,
                            data: formData
                        })
                        .fail(function (e) {
                            if (options.failCallBack) {
                                options.failCallBack(e);
                            }
                        })
                        .done(function (data) {
                            if (options.doneCallBack) {
                                options.doneCallBack(data);
                            }
                        });
                },

                //This wraps the default form data ajax call and exposes its call back functions along with a progress listener
                'VueJAjaxFileUpload': function (options) {
                    //Sets up the default options
                    defaultOptions =
                        {
                            parameters: null,
                            method: null,
                            url: null,
                            dataReturnType: null,
                            doneCallBack: null,
                            failCallBack: null,
                            calculateProgress: true,
                            autoClearProgress: false,

                            //default is 24 hour timeout
                            timeout: 1000 * 60 * 60 * 24
                        };

                    //Merges the default options with the supplied one so we have all variable requirements
                    options = $.extend(defaultOptions, options);

                    //If there is parameters to send convert it to form data
                    var formData = null;
                    if (options.parameters) 
					{
						//Converts any null instances to undefined so the server understands them correctly
						formData = this.$ObjectNullToUndefined(options.parameters);
						
						//Processes the data object into formdata format
                        formData = this.$ConvertObjectToFormData(formData);
                    }

                    //Note: this has to be done here as the "this" context cannot be passed through otherwise.
                    var progress = null;
                    if (options.calculateProgress) {
                        progress = function (e) {
                            //This function is used to convert the bytes supplied into their correct format for user output
                            function bytesToSize(bytes) {
                                if (bytes === 0) return '0 Byte';
                                var k = 1024;
                                var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
                                var i = Math.floor(Math.log(bytes) / Math.log(k));
                                return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
                            }

                            //Checks the length is computable and the blockui dialog box exists
                            if (e.lengthComputable) {
                                var max = e.total;
                                var current = e.loaded;

                                this.fileUploadProgress.totalSize = bytesToSize(max);
                                this.fileUploadProgress.currentUploadSize = bytesToSize(current);

                                var Percentage = (current * 100) / max;
                                if (Percentage >= 100) {
                                    this.fileUploadProgress.percentage = "100%";
                                    this.fileUploadProgress.roundedPercentage = "100%";
                                }
                                else {
                                    this.fileUploadProgress.percentage = Percentage + "%";
                                    this.fileUploadProgress.roundedPercentage = Math.round(Percentage) + "%";
                                }
                            }
                        }.bind(this);
                    }

                    //Runs and returns the ajax methods promise and hits the callbacks if supplied
                    return $.ajax(
                    {
                        type: options.method,
                        url: options.url,

                        //default is 24 hour timeout
                        timeout: options.timeout,

                        //deals with attaching a function to update the progress information
                        xhr: function () {
                            var myXhr = $.ajaxSettings.xhr();
                            if (myXhr.upload && options.calculateProgress) {
                                myXhr.upload.addEventListener('progress', function (e) {
                                    progress(e);
                                }, false);
                            }
                            return myXhr;
                        },

                        contentType: false,
                        processData: false,

                        dataType: options.dataReturnType,
                        data: formData
                    })
                    .fail(function (e) {
                        if (options.calculateProgress && options.autoClearProgress) {
                            this.VueJAjaxClearProgressData();
                        }

                        if (options.failCallBack) {
                            options.failCallBack(e);
                        }
                    }.bind(this))
                    .done(function (data) {
                        if (options.calculateProgress && options.autoClearProgress) {
                            this.VueJAjaxClearProgressData();
                        }

                        if (options.doneCallBack) {
                            options.doneCallBack(data);
                        }
                    }.bind(this));
                }
            }
        });
    }
};