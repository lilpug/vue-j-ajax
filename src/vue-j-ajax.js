/*!
    Title: vue-j-ajax
    URL: https://github.com/lilpug/vue-j-ajax
    Version: 1.0.0
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
        //Adds a global prototype function
        Vue.prototype.$ConvertObjectToFormData = function (data) {
            //Creates the formData object
            var formData = new FormData();

            //Loops over the passed data object and converts the keys and values into the formData format
            $.each(data, function (key, value) {
                //If its a basic type then just append it otherwise loop over adding it            
                if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
                    formData.append(key, value);
                }
                else {
                    //Note: this section is general used for arrays or filelist etc
                    $.each(value, function (key2, value2) {
                        //Note:We only need the value so we use the key supplied at the start
                        formData.append(key, value2);
                    });
                }
            });

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
					this.fileUploadProgress.percentage = null;
					this.fileUploadProgress.roundedPercentage = null;
				},

				//This wraps the default form data ajax call and exposes its call back functions
				'VueJAjax': function (options) 
				{
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
					options = Object.assign(defaultOptions, options);


					//If there is parameters to send convert it to form data
					var formData = null;
					if (options.parameters) {
						formData = this.$ConvertObjectToFormData(options.parameters);
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
                'VueJAjaxFileUpload': function (options)
                {
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
					options = Object.assign(defaultOptions, options);

					//If there is parameters to send convert it to form data
					var formData = null;
					if (options.parameters) {
						formData = this.$ConvertObjectToFormData(options.parameters);
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
								this.VueClearProgressData();
							}

							if (options.failCallBack) {
								options.failCallBack(e);
							}
						}.bind(this))
						.done(function (data) {
							if (options.calculateProgress && options.autoClearProgress) {
								this.VueClearProgressData();
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