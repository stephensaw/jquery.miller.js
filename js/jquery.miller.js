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
            'pane': {
                'options': {}
            }
        }, mixed);
        var cachedData = {};

        this.selected = function () {
        	return getSelectedPath();
        }

        if (!miller.attr('tabindex')) {
            miller.attr('tabindex', settings.tabindex);
        }

        miller
            .addClass('miller')
            .focus(function () { hasFocus = true; })
            .blur(function () { hasFocus = false; });

        var path = $('<div>', { 'class': 'path' }).appendTo(miller);
        var columns = $('<div>', { 'class': 'columns' }).appendTo(miller);
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

                if (newCurrentLine.length && !newCurrentLine.parent().hasClass('pane')) {
                    currentLine = newCurrentLine.click();
                }

                return false;
            }
        });

        var removeNextColumns = function () {
            var line = $(this);
            var column = line.parent();

            column.nextAll().slice(1).remove();
            column.find('li').removeClass('selected parentSelected');
            line.addClass(line.hasClass('parent') ? 'parentSelected' : 'selected');

            var node = $('<span>', { 'text': line.text() })
                .data('id', line.data('id'))
                .data('type', line.data('type'))
                .data('name', line.data('name'))
                .data('isParent', line.data('isParent'))
                .click(function () {
                    columns.children().slice((($(this).index() * 2) + 4)).remove();
                    columns.children('ul:last').find('li').removeClass('parentSelected');
                    path.children().slice($(this).index() + 1).remove();
                }).appendTo(path);

            var child = column.index();

            child -= (child - (child / 2));
            path.scrollLeft(node.position().left).children().slice(child, -1).remove();
        }

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

        var buildResizeGrip = function (width) {
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

        var getLines = function (event) {
            var selectedLine = $(event.currentTarget);

            if (!selectedLine.data('isParent')) {
                return;
            }

            currentLine = selectedLine.removeClass('parentSelected').addClass('parentLoading');

            fetchData(getSelectedPath()).always(function () {
                currentLine.removeClass('parentLoading');
            });
        }

        var getSelectedPath =  function () {
            var path = [];

            $.each($(miller).find('div.path span'), function (key, node) {
                path.push($(node).data());
            });

            return path;
        }

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

        var setCache = function (cacheKey, data) {
        	cachedData[cacheKey] = data;
        }

        var getCache = function (cacheKey) {
        	return cachedData[cacheKey];
        }

        var fetchData = function (selectedPaths) {
            var deferred = $.Deferred();

            var cached = getCache(getCacheKey(selectedPaths));

            if (settings.async) {         	
            	if (cached) {
            		buildColumn(cached);
            		deferred.resolve();
            		return deferred.promise();
            	}

                loader.call(this, selectedPaths).done(function (data) {
                	setCache(getCacheKey(selectedPaths), data);
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
                setCache(getCacheKey(selectedPaths), data);
                buildColumn(data);
                deferred.resolve();
            }

            return deferred.promise();
        }

        fetchData();

        return miller;
    }
})(jQuery);