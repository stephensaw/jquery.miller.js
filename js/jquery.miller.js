(function ($) {
    $.fn.miller = function (mixed) {
        var miller = this;
        var hasFocus = false;
        var currentAjaxRequest = null;
        var settings = $.extend(true, {
            'loader': function () {},
            'async': true,
            'tabindex': 0,
            'minWidth': 40,
            'carroussel': false,
            'showBreadCrumb': false
        }, mixed);
       
        /**
         * Breadcrumb manager.
         * @constructor
         * @param {Object} parentContainer - Parent container to render in.
         */
        var BreadCrumbManager = function (parentContainer) {
            var container = parentContainer;
            var breadCrumb = null;

			breadCrumb = $('<div>', { 'class': 'path' }).appendTo(container);
	        
	        /**
	         * Update the breadcrumb with selected item.
	         * @param {Object} line - Selected item.
	         */
            var update = function (line) {
            	if (!settings.showBreadCrumb) {
            		return;
            	}

            	var column = line.parent();
				var node = $('<span>', { 'text': line.text() })
	                .data('id', line.data('id'))
	                .data('type', line.data('type'))
	                .data('name', line.data('name'))
	                .data('isParent', line.data('isParent'))
	                .click(function () {
	                    columns.children().slice((($(this).index() * 2) + 4)).remove();
	                    columns.children('ul:last').find('li').removeClass('parentSelected');
	                    breadCrumb.children().slice($(this).index() + 1).remove();
	                }).appendTo(breadCrumb);

	            var child = column.index();

	            child -= (child - (child / 2));
	            breadCrumb.scrollLeft(node.position().left).children().slice(child, -1).remove();
            }

            return {
            	update: update
            }
        }

        /**
         * Cache manager.
         * @constructor
         */
        var CacheManager = function () {
            var cachedData = {};

            /**
             * Get the cache key used to retrieve/store cache from selected path.
             * @param {Array} selectedPaths - An array of object with 'id' properties.
             * @returns {string} Cache key that used to retrieve/store cache.
             */
            var getCacheKey = function (selectedPaths) {
                if (!selectedPaths) {
                    return "";
                }

                var cacheKey = [];

                for (var i = 0, total = selectedPaths.length; i < total; i++) {
                    cacheKey.push(selectedPaths[i].id);
                }

                return cacheKey.join('|');
            }

            /**
             * Store the data in the cache with the key provided.
             * @param {string} cacheKey - Key use to store the cache.
             * @param {Array} data - Data to be stored.
             */
            var setCache = function (cacheKey, data) {
                cachedData[cacheKey] = data;
            }

            /**
             * Get the data in the cache with the key provided.
             * @param {string} cacheKey - Key use to store the cache.
             * @param {Array} data - Data to be stored.
             */
            var getCache = function (cacheKey) {
                return cachedData[cacheKey];
            }

            return {
                getCache: getCache,
                setCache: setCache,
                getCacheKey: getCacheKey
            }
        }

        var cacheManager = new CacheManager();
        var breadCrumbManager = new BreadCrumbManager(miller);

        /**
		 * @returns {Object[]} Get selected path as an array.
		 */
        miller.selected = function () {
            return getSelectedPath();
        }

        if (!miller.attr('tabindex')) {
            miller.attr('tabindex', settings.tabindex);
        }

        miller
            .addClass('miller')
            .focus(function () { hasFocus = true; })
            .blur(function () { hasFocus = false; });

        var columnsWrapper = $('<div>', { 'class': 'columns-wrapper'});
        var columns = $('<div>', { 'class': 'columns' }).appendTo(columnsWrapper);

        columnsWrapper.appendTo(miller);
        
        var currentLine = null;

        var KEYCODE_LEFT = 37;
        var KEYCODE_UP = 38;
        var KEYCODE_RIGHT = 39;
        var KEYCODE_DOWN = 40;

        $(document).keypress(function (event) {
            if (hasFocus && currentLine && event.which != KEYCODE_LEFT && event.which != KEYCODE_UP8 && event.which != KEYCODE_RIGHT && event.which != KEYCODE_DOWN) {
                var newCurrentLine = currentLine.parent().children().filter(function () { return $(this).text().match(new RegExp('^' + String.fromCharCode(event.which))); }).first();

                if (newCurrentLine.length) {
                    currentLine = newCurrentLine.click();
                }
            }
        });

        $(document).keydown(function (event) {
            if (hasFocus && currentLine && (event.which == KEYCODE_LEFT || event.which == KEYCODE_UP || event.which == KEYCODE_RIGHT || event.which == KEYCODE_DOWN)) {
                var newCurrentLine = [];
                var scrollTop = currentLine.parent().scrollTop();

                switch (event.which) {
                    case KEYCODE_LEFT:
                        newCurrentLine = currentLine.parent().prev().prev().find('li.parentSelected');
                        break;

                    case KEYCODE_UP:
                        newCurrentLine = currentLine.prev();

                        if (!newCurrentLine.length && settings.carroussel) {
                            newCurrentLine = currentLine.parent().find('li:last');
                            scrollTop = newCurrentLine.position().top;
                        }

                        break;

                    case KEYCODE_RIGHT:
                        newCurrentLine = currentLine.parent().next().next().find('li:first');
                        break;

                    case KEYCODE_DOWN:
                        newCurrentLine = currentLine.next();

                        if (!newCurrentLine.length && settings.carroussel) {
                            newCurrentLine = currentLine.parent().find('li:first');
                            scrollTop = 0;
                        }

                        break;
                }

                if (newCurrentLine.length) {
                    currentLine = newCurrentLine.click();
                }

                return false;
            }
        });

		/**
         * Remove columns after selected column.
         */
        var removeNextColumns = function () {
            var line = $(this);
            var column = line.parent();

            column.nextAll().slice(1).remove();
            column.find('li').removeClass('selected parentSelected');
            line.addClass(line.hasClass('parent') ? 'parentSelected' : 'selected');

            breadCrumbManager.update(line);
        }

		/**
         * Creating column.
         * @param {Object[]} lines - Array of data to be created as items for the column.
         */
        var buildColumn = function (lines) {
            if (!lines || lines.length <= 0) {
                var line = $('li.parentLoading').removeClass('isParent').addClass('selected');

                return;
            }

            $('li.parentLoading').addClass('parentSelected');

            var column = $('<ul>');
            var grip = buildResizeGrip();

            columns.append(column).scrollLeft(grip.width() + column.width()).append(grip);
            
            for (var l = 0, totalLines = lines.length; l < totalLines; l++) {
                var lineNode = buildNode(column, lines[l]);

                column.append(lineNode);

                if (lines[l].children.length > 0) {
                    lineNode.addClass("parentSelected");
                    buildColumn(lines[l].children);
                }
            }
        }

		/**
         * Add the grip for the column for resizing.
         */
        var buildResizeGrip = function () {
            return $('<div>', { 'class': 'grip' })
                        .mousedown(function (event) {
                            var x = event.pageX;
                            var cursor = columns.css('cursor');
                            var grip = $(this);

                            columns
                                .css('cursor', 'col-resize')
                                .mousemove(function (event) {
                                    var column = grip.prev();
                                    var delta = event.pageX - x;
                                    var newWidth = column.width() + delta;

                                    if (newWidth > settings.minWidth) {
                                        column.width(newWidth);
                                    }

                                    x = event.pageX;
                                })
                                .mouseup(function () {
                                    columns.off('mousemove').css('cursor', cursor);
                                });
                        });
        }

		/**
         * Add the item into the column.
         * @parem {Object} column - The HTML container for the column.
         * @param {Object[]} data - Array of object consist of all of their data() properties.
         */
        var buildNode = function (column, data) {
            var line = $('<li>', { 'text': data['name'] })
                .data('id', data['id'])
                .data('name', data['name'])
                .data('isParent', data['isParent'])
                .click(removeNextColumns)
                .click(getLines);

            if (data['isParent']) {
                line.addClass('parent');
            }

            if (data['type']) {
                line.attr('data-type', data['type']);
            }

            return line;
        }

		/**
         * Get the selected item, and to trigger data fetching.
         * @param {Object} event - Click event.
         */
        var getLines = function (event) {
            var selectedLine = $(event.currentTarget);

            if (!selectedLine.data('isParent')) {
                return;
            }

            //currentLine = selectedLine.removeClass('parentSelected').addClass('parentLoading');
            currentLine = selectedLine.addClass('parentLoading');

            fetchData(getSelectedPath()).always(function () {
                currentLine.removeClass('parentLoading');
            });
        }

		/**
         * Get the path to the selected item in an array.
         * @param {Object[]} Array of object consist of all of their data() properties.
         */
        var getSelectedPath =  function () {
            var path = [];

            $.each($(miller).find('.parentSelected, .selected'), function (key, node) {
                path.push($(node).data());
            });

            return path;
        }

		/**
         * Sending request via Loader with the selected paths.
         * @param {selectedPaths} Selected path array object.
         */
        var fetchData = function (selectedPaths) {
            var deferred = $.Deferred();

            var cacheKey = cacheManager.getCacheKey(selectedPaths);
            var cached = cacheManager.getCache(cacheKey);

            if (settings.async) {           
                if (cached) {
                    buildColumn(cached);
                    deferred.resolve();
                    return deferred.promise();
                }

                loader.call(this, selectedPaths).done(function (data) {
                    cacheManager.setCache(cacheKey, data);
                    buildColumn(data);
                    deferred.resolve();
                })
                .fail(function (err) {
                    console.error(err);
                    deferred.reject();
                });
            } else {
                if (cached) {
                    buildColumn(cached);
                    deferred.resolve();
                    return deferred.promise();
                }

                var data = loader.call(this, selectedPaths);
                cacheManager.setCache(cacheKey, data);
                buildColumn(data);
                deferred.resolve();
            }

            return deferred.promise();
        }

        fetchData();

        return miller;
    }
})(jQuery);