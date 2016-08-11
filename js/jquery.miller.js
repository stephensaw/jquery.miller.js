(function ($) {
    $.fn.miller = function (mixed) {
        var miller = this;
        var hasFocus = false;
        var currentAjaxRequest = null;
        var settings = $.extend(true, {
            'loader': function () { },
            'creator': function () { },
            'selector': function () { },
            'async': true,
            'tabindex': 0,
            'minWidth': 40,
            'carroussel': false,
            'showBreadCrumb': false,
            'clickToSelect': true,
            'dblClickToSelect': true,
            'showAdd': true,
            'allowAdd': true
        }, mixed);

        /**
		 * @returns {Object[]} Get selected path as an array.
		 */
        miller.getSelected = function () {
            var selectedNodes = getSelectedNodes();

            return getSelectedPathFromNodes(selectedNodes);
        }

        /**
		 * Add new child node for the selected node.
		 */
        miller.addNew = function () {
            addInputNode(getSelectedNodes());
        }

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
             * @param {Array} selectedNodes - An array of elements
             * @returns {string} Cache key that used to retrieve/store cache.
             */
            var getCacheKey = function (selectedNodes) {
                if (!selectedNodes || selectedNodes.length <= 0) {
                    return "";
                }

                var cacheKey = [];

                for (var i = 0, total = selectedNodes.length; i < total; i++) {
                    cacheKey.push(selectedNodes[i].data('id'));
                }

                return '|' + cacheKey.join('|');
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

            /**
             * Remove the data in the cache with the key provided.
             * @param {string} cacheKey - Key use to remove the cache.
             */
            var removeCache = function (cacheKey) {
                cachedData[cacheKey] = null;
            }

            return {
                getCache: getCache,
                setCache: setCache,
                getCacheKey: getCacheKey,
                removeCache: removeCache
            }
        }

        /**
         * Create a select button in the toolbar for selecting.
         */
        var buildAddButton = function () {
            if (!settings.showAdd || !settings.allowAdd) {
                return;
            }
            var toolbar = $('<div>', { 'class': 'toolbar' }).appendTo(miller);

            $('<span>', { 'text': 'Add' })
				.click(function () {
				    addInputNode(getSelectedNodes());
				})
				.appendTo(toolbar);
        }

        var cacheManager = new CacheManager();
        var breadCrumbManager = new BreadCrumbManager(miller);

        if (!miller.attr('tabindex')) {
            miller.attr('tabindex', settings.tabindex);
        }

        miller
            .addClass('miller')
            .focus(function () {
                hasFocus = true;
            })
            .blur(function () {
                hasFocus = false;
            });

        var columnsWrapper = $('<div>', { 'class': 'columns-wrapper' })
            .attr('tabindex', '0')
            .focus(function () {
                miller.focus();
            })
            .appendTo(miller);

        var columns = $('<div>', { 'class': 'columns' })
            .attr('tabindex', '0')
            .focus(function () {
                miller.focus();
            })
            .appendTo(columnsWrapper);

        var currentLine = null;

        buildAddButton();

        var KEYCODE_LEFT = 37;
        var KEYCODE_UP = 38;
        var KEYCODE_RIGHT = 39;
        var KEYCODE_DOWN = 40;
        var KEYCODE_ESC = 27;
        var KEYCODE_ENTER = 13;

        $(document).keypress(function (event) {
            if (hasFocus && currentLine && event.which != KEYCODE_LEFT && event.which != KEYCODE_UP && event.which != KEYCODE_RIGHT && event.which != KEYCODE_DOWN) {
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

            currentLine = line;

            breadCrumbManager.update(line);
        }

        /**
         * Creating column.
         * @param {Object[]} lines - Array of data to be created as items for the column.
         */
        var buildColumn = function (lines, initialize) {
            if (!lines || lines.length <= 0) {
                var line = $('li.parentLoading').removeClass('isParent').addClass('selected');

                return;
            }

            var parentNode = $('li.parentLoading');

            parentNode.addClass('parentSelected');

            var column = $('<ul>');
            var grip = buildResizeGrip();
            var cacheKey = cacheManager.getCacheKey(getSelectedNodes());

            if (!cacheManager.getCache(cacheKey)) {
                cacheManager.setCache(cacheKey, lines);
            }

            columns.append(column).scrollLeft(grip.width() + column.width()).append(grip);

            for (var l = 0, totalLines = lines.length; l < totalLines; l++) {
                var lineNode = buildNode(column, lines[l]);

                cacheKey = cacheKey + '|' + lineNode.data('id');
                column.append(lineNode);

                if (lines[l].children.length > 0 && initialize) {
                    if (!cacheManager.getCache(cacheKey)) {
                        cacheManager.setCache(cacheKey, lines[l].children);
                    }

                    breadCrumbManager.update(lineNode);
                    lineNode.addClass('parentSelected');
                    currentLine = lineNode;
                    buildColumn(lines[l].children, initialize);
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
            var line = $('<li>', { 'text': data['name'], 'id': data['id'] })
                .data('id', data['id'])
                .data('name', data['name'])
                .data('isParent', data['isParent'])
                .click(removeNextColumns)
                .click(getLines);

            if (settings.clickToSelect) {
                line.click(selectNode);
            }

            if (settings.dblClickToSelect) {
                line.dblclick(selectNode);
            }

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

            //currentLine = selectedLine.removeClass('parentSelected').addClass('parentLoading');
            currentLine = selectedLine;
            miller.focus();

            if (!selectedLine.data('isParent')) {
                return;
            }

            selectedLine.addClass('parentLoading');

            fetchData(getSelectedNodes(), false).always(function () {
                currentLine.removeClass('parentLoading');
            });
        }

        /**
         * Get the nodees path to the selected item in an array.
         * @param {Object[]} Array of selected elements.
         */
        var getSelectedNodes = function () {
            var nodes = [];

            $.each($(miller).find('.parentSelected, .selected'), function (key, node) {
                nodes.push($(node));
            });

            return nodes;
        }

        /**
         * Get selected item properties from the nodes.
         * @param {Object[]} selectedNodes - Array of selected elements.
         * @param {Object[]} Properties of the selected item.
         */
        var getSelectedPathFromNodes = function (selectedNodes) {
            if (!selectedNodes || selectedNodes.length <= 0) {
                return null;
            }

            var properties = [];

            for (var i = 0, total = selectedNodes.length; i < total; i++) {
                properties.push(selectedNodes[i].data());
            }

            return properties;
        }

        /**
         * Get selected item properties.
         * @param {Object} Property of the selected item.
         */
        var getSelectedItem = function () {
            var paths = getSelectedNodes();

            if (paths.length <= 0) {
                return null;
            }

            return paths[paths.length - 1].data();
        }

        /**
         * Sending request via Loader with the selected paths.
         * @param {Object[]} selectedPaths - Selected path array object.
         */
        var fetchData = function (selectedNodes, initialize) {
            var deferred = $.Deferred();

            var selectedPaths = getSelectedPathFromNodes(selectedNodes);
            var cacheKey = cacheManager.getCacheKey(selectedNodes);
            var cached = cacheManager.getCache(cacheKey);

            if (settings.async) {
                if (cached) {
                    buildColumn(cached, initialize);
                    deferred.resolve();
                    return deferred.promise();
                }

                settings.loader.call(this, selectedPaths).done(function (data) {
                    buildColumn(data, initialize);
                    deferred.resolve();
                })
                .fail(function (err) {
                    console.error(err);
                    deferred.reject();
                });
            } else {
                if (cached) {
                    buildColumn(cached, initialize);
                    deferred.resolve();
                    return deferred.promise();
                }

                var data = settings.loader.call(this, selectedPaths);
                buildColumn(data, true);
                deferred.resolve();
            }

            return deferred.promise();
        }

        /**
         * Create new input item node.
         * @param {Object[]} selectedNodes - Selected nodes array object.
         */
        var addInputNode = function (selectedNodes) {
            if (!settings.allowAdd) {
                return;
            }

            var lastNode = selectedNodes[selectedNodes.length - 1];

            var column = null;

            if (!lastNode.data('isParent')) {
                column = addInputNodeToChildNode(lastNode);
            } else {
                column = addInputNodeToParentNode(lastNode);
            }

            var inputNode = buildInputNode(column);

            column.prepend(inputNode);
            inputNode.find('input[type="text"]').focus();
        }

        /**
         * Create new input node for parent node.
         * @param {Object} lastNode - Selected node.
         * @returns {Object} Columns with the new node added.
         */
        var addInputNodeToParentNode = function (lastNode) {
            var column = lastNode.parent().next().next();

            return column;
        }

        /**
         * Create new input node for child node.
         * @param {Object} lastNode - Selected node.
         * @returns {Object} Columns with the new node added.
         */
        var addInputNodeToChildNode = function (lastNode) {
            lastNode.removeClass('selected').addClass('parent parentSelected');

            var column = $('<ul>');
            var grip = buildResizeGrip();

            columns.append(column).scrollLeft(grip.width() + column.width()).append(grip);

            return column;
        }

        /**
         * Create new input textbox for the input node.
         * @param {Object} column - The column to create the input box in.
         * @returns {Object} New input node.
         */
        var buildInputNode = function (column) {
            var inputLine = $('<li>')
        		.addClass('input')
                .click(removeNextColumns)
                .click(getLines);

            var inputBox = $('<input type="text">')
            	.keyup(function (e) {
            	    e.stopPropagation();

            	    if (e.which === KEYCODE_ENTER) {
            	        commitInputNode(e);
            	    } else if (e.which === KEYCODE_ESC) {
            	        dismissInputNode(e);
            	    }
            	})
            	.blur(commitInputNode);

            inputLine.append(inputBox);

            return inputLine;
        }

        /**
         * Commit the changes in the new input box to the server by using the creator.
         * @param {Object} e - Event for the textbox.
         */
        var commitInputNode = function (e) {
            var deferred = $.Deferred();
            var input = $(e.target);

            if (input.val().trim().length === 0) {
                dismissInputNode(e);
                return;
            }

            if (typeof (settings.creator) !== 'function' || !settings.creator) {
                return;
            }

            var cacheKey = cacheManager.getCacheKey(getSelectedNodes());

            if (settings.async) {
                settings.creator.call(this, input.val().trim()).done(function (result) {
                    updateCreatedItem(e, result);
                    cacheManager.removeCache(cacheKey);

                    deferred.resolve();
                })
            } else {
                var result = settings.creator.call(this, input.val().trim());
                updateCreatedItem(e, result);
                cacheManager.removeCache(cacheKey);
            }

            return deferred.promise();
        }

        /**
         * Refreshed the newly created item after server responded.
         * @param {Object} e - Event for the textbox.
         * @param {Object} result - Properties for newly created item.
         */
        var updateCreatedItem = function (e, result) {
            var input = $(e.target);
            var node = input.parent();

            node
        		.text(result.name)
        		.removeClass('input')
        		.attr('data-type', result.type);
            node.data('id', result.id);
            node.data('name', result.name);
            node.data('type', result.type);
            node.data('isParent', result.isParent);
            node.data('children', result.children);

            input.remove();
        }

        /**
         * Dismiss the value for the input textbox.
         * @param {Object} e - Event for the textbox.
         */
        var dismissInputNode = function (e) {
            var input = $(e.target);
            var column = input.closest('ul');
            var selectedNodes = getSelectedNodes();
            var lastNode = selectedNodes[selectedNodes.length - 1];

            if (column.find('li').length === 1) {
                lastNode.removeClass('parent parentSelected').addClass('selected');
                column.remove();
            } else {
                input.parent().remove();
            }
        }

        /**
         * Trigger the selected node back to the caller via selector.
         * @param {Object} e - Event for the node.
         */
        var selectNode = function (e) {
            var selectedPaths = miller.getSelected();

            if (typeof (settings.selector) !== 'function' || !settings.selector) {
                return;
            }

            settings.selector.call(miller, selectedPaths);
        }

        fetchData(null, true);

        return miller;
    }
})(jQuery);