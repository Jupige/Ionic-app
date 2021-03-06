"use strict";
var $ = require("../../core/renderer"),
    isWrapped = require("../../core/utils/variable_wrapper").isWrapped,
    dataCoreUtils = require("../../core/utils/data"),
    commonUtils = require("../../core/utils/common"),
    getDefaultAlignment = require("../../core/utils/position").getDefaultAlignment,
    extend = require("../../core/utils/extend").extend,
    inArray = require("../../core/utils/array").inArray,
    config = require("../../core/config"),
    isDefined = commonUtils.isDefined,
    objectUtils = require("../../core/utils/object"),
    errors = require("../widget/ui.errors"),
    modules = require("../grid_core/ui.grid_core.modules"),
    gridCoreUtils = require("../grid_core/ui.grid_core.utils"),
    normalizeSortingInfo = gridCoreUtils.normalizeSortingInfo,
    equalSortParameters = gridCoreUtils.equalSortParameters,
    normalizeIndexes = require("../../core/utils/array").normalizeIndexes,
    inflector = require("../../core/utils/inflector"),
    dateSerialization = require("../../core/utils/date_serialization"),
    numberLocalization = require("../../localization/number"),
    dateLocalization = require("../../localization/date"),
    messageLocalization = require("../../localization/message"),
    when = require("../../integration/jquery/deferred").when,
    DataSourceModule = require("../../data/data_source/data_source"),
    normalizeDataSourceOptions = DataSourceModule.normalizeDataSourceOptions;
var USER_STATE_FIELD_NAMES_15_1 = ["filterValues", "filterType", "fixed", "fixedPosition"],
    USER_STATE_FIELD_NAMES = ["visibleIndex", "dataField", "name", "dataType", "width", "visible", "sortOrder", "sortIndex", "groupIndex", "filterValue", "selectedFilterOperation", "added"].concat(USER_STATE_FIELD_NAMES_15_1),
    COMMAND_EXPAND_CLASS = "dx-command-expand";
module.exports = {
    defaultOptions: function() {
        return {
            commonColumnSettings: {
                allowFiltering: true,
                allowHiding: true,
                allowSorting: true,
                allowEditing: true,
                encodeHtml: true,
                trueText: messageLocalization.format("dxDataGrid-trueText"),
                falseText: messageLocalization.format("dxDataGrid-falseText")
            },
            allowColumnReordering: false,
            allowColumnResizing: false,
            columnResizingMode: "nextColumn",
            columnMinWidth: void 0,
            adaptColumnWidthByRatio: true,
            columns: void 0,
            regenerateColumnsByVisibleItems: false,
            customizeColumns: null,
            dateSerializationFormat: void 0
        }
    },
    controllers: {
        columns: modules.Controller.inherit(function() {
            var DEFAULT_COLUMN_OPTIONS = {
                    visible: true,
                    showInColumnChooser: true
                },
                DATATYPE_OPERATIONS = {
                    number: ["=", "<>", "<", ">", "<=", ">=", "between"],
                    string: ["contains", "notcontains", "startswith", "endswith", "=", "<>"],
                    date: ["=", "<>", "<", ">", "<=", ">=", "between"]
                },
                COLUMN_INDEX_OPTIONS = {
                    visibleIndex: true,
                    groupIndex: true,
                    grouped: true,
                    sortIndex: true,
                    sortOrder: true
                },
                GROUP_LOCATION = "group",
                COLUMN_CHOOSER_LOCATION = "columnChooser";
            var createColumn = function(that, columnOptions, userStateColumnOptions, bandColumn) {
                var calculatedColumnOptions, commonColumnOptions = {};
                if (columnOptions) {
                    if (commonUtils.isString(columnOptions)) {
                        columnOptions = {
                            dataField: columnOptions
                        }
                    }
                    if (columnOptions.command) {
                        return extend(true, {}, columnOptions)
                    } else {
                        commonColumnOptions = that.getCommonSettings();
                        if (userStateColumnOptions && userStateColumnOptions.name && userStateColumnOptions.dataField) {
                            columnOptions = extend({}, columnOptions, {
                                dataField: userStateColumnOptions.dataField
                            })
                        }
                        calculatedColumnOptions = that._createCalculatedColumnOptions(columnOptions, bandColumn);
                        return extend(true, {}, DEFAULT_COLUMN_OPTIONS, commonColumnOptions, calculatedColumnOptions, columnOptions, {
                            selector: null
                        })
                    }
                }
            };
            var createColumnsFromOptions = function(that, columnsOptions, bandColumn) {
                var result = [];
                if (columnsOptions) {
                    $.each(columnsOptions, function(index, columnOptions) {
                        var userStateColumnOptions = that._columnsUserState && checkUserStateColumn(columnOptions, that._columnsUserState[index]) && that._columnsUserState[index],
                            column = createColumn(that, columnOptions, userStateColumnOptions, bandColumn);
                        if (column) {
                            if (bandColumn) {
                                column.ownerBand = bandColumn
                            }
                            result.push(column);
                            if (column.isBand) {
                                result = result.concat(createColumnsFromOptions(that, column.columns, column));
                                delete column.columns
                            }
                        }
                    })
                }
                return result
            };
            var getParentBandColumns = function(columnIndex, columns) {
                var result = [],
                    columnID = columns[columnIndex].ownerBand;
                if (isDefined(columnID)) {
                    $.each(columns, function(index, column) {
                        if (column.index === columnID) {
                            result.unshift(column);
                            if (isDefined(column.ownerBand)) {
                                result = getParentBandColumns(index, columns).concat(result)
                            } else {
                                return false
                            }
                        }
                    })
                }
                return result
            };
            var getColumnByIndexes = function(that, columnIndexes) {
                var result, columns = that._columns,
                    callbackFilter = function(column) {
                        return column.ownerBand === result.index
                    };
                for (var i = 0; i < columnIndexes.length; i++) {
                    result = columns[columnIndexes[i]];
                    if (result) {
                        columns = that._columns.filter(callbackFilter)
                    }
                }
                return result
            };
            var calculateColspan = function(that, columnID, columns) {
                var colspan = 0;
                columns = columns || that.getChildrenByBandColumn(columnID);
                $.each(columns, function(_, column) {
                    if (column.visible && column.ownerBand === columnID) {
                        if (column.isBand) {
                            colspan += calculateColspan(that, column.index, columns)
                        } else {
                            colspan += 1
                        }
                    }
                });
                return colspan
            };
            var processBandColumns = function(that, columns) {
                var i, column, rowspan, colspan, rowCount = that.getRowCount();
                for (i = 0; i < columns.length; i++) {
                    column = columns[i];
                    if (column.visible || column.command) {
                        if (column.isBand) {
                            colspan = calculateColspan(that, column.index);
                            column.colspan = colspan
                        }
                        if (!column.isBand || !column.colspan) {
                            rowspan = rowCount - (!column.command && !isDefined(column.groupIndex) ? getParentBandColumns(i, columns).length : 0);
                            if (rowspan > 1) {
                                column.rowspan = rowspan
                            }
                        }
                    }
                }
            };
            var getValueDataType = function(value) {
                var dataType = commonUtils.type(value);
                if ("string" !== dataType && "boolean" !== dataType && "number" !== dataType && "date" !== dataType && "object" !== dataType) {
                    dataType = void 0
                }
                return dataType
            };
            var getSerializationFormat = function(dataType, value) {
                switch (dataType) {
                    case "date":
                        return dateSerialization.getDateSerializationFormat(value);
                    case "number":
                        if (commonUtils.isString(value)) {
                            return "string"
                        }
                        if (commonUtils.isNumeric(value)) {
                            return null
                        }
                }
            };
            var updateSerializers = function(options, dataType) {
                if (!options.deserializeValue) {
                    if ("date" === dataType) {
                        options.deserializeValue = function(value) {
                            return dateSerialization.deserializeDate(value)
                        };
                        options.serializeValue = function(value) {
                            return dateSerialization.serializeDate(value, this.serializationFormat)
                        }
                    }
                    if ("number" === dataType) {
                        options.deserializeValue = function(value) {
                            var parsedValue = parseFloat(value);
                            return isNaN(parsedValue) ? value : parsedValue
                        };
                        options.serializeValue = function(value) {
                            return isDefined(value) && "string" === this.serializationFormat ? value.toString() : value
                        }
                    }
                }
            };
            var getAlignmentByDataType = function(dataType, isRTL) {
                switch (dataType) {
                    case "number":
                        return "right";
                    case "boolean":
                        return "center";
                    default:
                        return getDefaultAlignment(isRTL)
                }
            };
            var getCustomizeTextByDataType = function(dataType) {
                if ("boolean" === dataType) {
                    return function(e) {
                        if (true === e.value) {
                            return this.trueText || "true"
                        } else {
                            if (false === e.value) {
                                return this.falseText || "false"
                            } else {
                                return e.valueText || ""
                            }
                        }
                    }
                }
            };
            var createColumnsFromDataSource = function(that, dataSource) {
                var fieldName, i, firstItems = that._getFirstItems(dataSource),
                    processedFields = {},
                    result = [];
                for (i = 0; i < firstItems.length; i++) {
                    if (firstItems[i]) {
                        for (fieldName in firstItems[i]) {
                            if (!commonUtils.isFunction(firstItems[i][fieldName]) || isWrapped(firstItems[i][fieldName])) {
                                processedFields[fieldName] = true
                            }
                        }
                    }
                }
                for (fieldName in processedFields) {
                    if (0 !== fieldName.indexOf("__")) {
                        var column = createColumn(that, fieldName);
                        result.push(column)
                    }
                }
                return result
            };
            var updateColumnIndexes = function(that) {
                $.each(that._columns, function(index, column) {
                    column.index = index
                });
                $.each(that._columns, function(index, column) {
                    if (commonUtils.isObject(column.ownerBand)) {
                        column.ownerBand = column.ownerBand.index
                    }
                });
                $.each(that._commandColumns, function(index, column) {
                    column.index = -(index + 1)
                })
            };
            var updateColumnGroupIndexes = function(that, currentColumn) {
                normalizeIndexes(that._columns, "groupIndex", currentColumn, function(column) {
                    var grouped = column.grouped;
                    delete column.grouped;
                    return grouped
                })
            };
            var updateColumnSortIndexes = function(that, currentColumn) {
                $.each(that._columns, function(index, column) {
                    if (isDefined(column.sortIndex) && !isSortOrderValid(column.sortOrder)) {
                        delete column.sortIndex
                    }
                });
                normalizeIndexes(that._columns, "sortIndex", currentColumn, function(column) {
                    return !isDefined(column.groupIndex) && isSortOrderValid(column.sortOrder)
                })
            };
            var updateColumnVisibleIndexes = function(that, currentColumn) {
                var i, key, column, bandColumnIndex, parentBandColumns, bandColumns = {},
                    columns = [];
                for (i = 0; i < that._columns.length; i++) {
                    column = that._columns[i];
                    parentBandColumns = getParentBandColumns(i, that._columns);
                    if (parentBandColumns.length) {
                        bandColumnIndex = parentBandColumns[parentBandColumns.length - 1].index;
                        bandColumns[bandColumnIndex] = bandColumns[bandColumnIndex] || [];
                        bandColumns[bandColumnIndex].push(column)
                    } else {
                        columns.push(column)
                    }
                }
                for (key in bandColumns) {
                    normalizeIndexes(bandColumns[key], "visibleIndex", currentColumn)
                }
                normalizeIndexes(columns, "visibleIndex", currentColumn)
            };
            var getColumnIndexByVisibleIndex = function(that, visibleIndex, location) {
                var column, rowIndex = commonUtils.isObject(visibleIndex) ? visibleIndex.rowIndex : null,
                    columns = location === GROUP_LOCATION ? that.getGroupColumns() : location === COLUMN_CHOOSER_LOCATION ? that.getChooserColumns() : that.getVisibleColumns(rowIndex);
                visibleIndex = commonUtils.isObject(visibleIndex) ? visibleIndex.columnIndex : visibleIndex;
                column = columns[visibleIndex];
                return column && isDefined(column.index) ? column.index : -1
            };
            var moveColumnToGroup = function(that, column, groupIndex) {
                var i, groupColumns = that.getGroupColumns();
                if (groupIndex >= 0) {
                    for (i = 0; i < groupColumns.length; i++) {
                        if (groupColumns[i].groupIndex >= groupIndex) {
                            groupColumns[i].groupIndex++
                        }
                    }
                } else {
                    groupIndex = 0;
                    for (i = 0; i < groupColumns.length; i++) {
                        groupIndex = Math.max(groupIndex, groupColumns[i].groupIndex + 1)
                    }
                }
                column.groupIndex = groupIndex
            };
            var checkUserStateColumn = function(column, userStateColumn) {
                return column && userStateColumn && userStateColumn.name === column.name && (userStateColumn.dataField === column.dataField || column.name)
            };
            var applyUserState = function(that) {
                var column, columnUserState, userStateColumnIndex, i, columnsUserState = that._columnsUserState,
                    ignoreColumnOptionNames = that._ignoreColumnOptionNames || [],
                    columns = that._columns,
                    columnCountById = {},
                    resultColumns = [],
                    allColumnsHaveState = true,
                    userStateColumnIndexes = [];

                function applyFieldsState(column, userStateColumn) {
                    var fieldName;
                    if (!userStateColumn) {
                        return
                    }
                    for (var index = 0; index < USER_STATE_FIELD_NAMES.length; index++) {
                        fieldName = USER_STATE_FIELD_NAMES[index];
                        if (inArray(fieldName, ignoreColumnOptionNames) >= 0) {
                            continue
                        }
                        if ("dataType" === fieldName) {
                            column[fieldName] = column[fieldName] || userStateColumn[fieldName]
                        } else {
                            if (inArray(fieldName, USER_STATE_FIELD_NAMES_15_1) >= 0) {
                                if (fieldName in userStateColumn) {
                                    column[fieldName] = userStateColumn[fieldName]
                                }
                            } else {
                                column[fieldName] = userStateColumn[fieldName]
                            }
                        }
                    }
                }

                function findUserStateColumn(columnsUserState, column) {
                    var id = column.name || column.dataField,
                        count = columnCountById[id] || 0;
                    for (var j = 0; j < columnsUserState.length; j++) {
                        if (checkUserStateColumn(column, columnsUserState[j])) {
                            if (count) {
                                count--
                            } else {
                                columnCountById[id] = columnCountById[id] || 0;
                                columnCountById[id]++;
                                return j
                            }
                        }
                    }
                    return -1
                }
                if (columnsUserState) {
                    for (i = 0; i < columns.length; i++) {
                        userStateColumnIndex = findUserStateColumn(columnsUserState, columns[i]);
                        allColumnsHaveState = allColumnsHaveState && userStateColumnIndex >= 0;
                        userStateColumnIndexes.push(userStateColumnIndex)
                    }
                    for (i = 0; i < columns.length; i++) {
                        column = columns[i];
                        userStateColumnIndex = userStateColumnIndexes[i];
                        if (that._hasUserState || allColumnsHaveState) {
                            applyFieldsState(column, columnsUserState[userStateColumnIndex])
                        }
                        if (userStateColumnIndex >= 0 && isDefined(columnsUserState[userStateColumnIndex].initialIndex)) {
                            resultColumns[userStateColumnIndex] = column
                        } else {
                            resultColumns.push(column)
                        }
                    }
                    for (i = 0; i < columnsUserState.length; i++) {
                        columnUserState = columnsUserState[i];
                        if (columnUserState.added && findUserStateColumn(columns, columnUserState) < 0) {
                            column = createColumn(that, columnUserState.added);
                            applyFieldsState(column, columnUserState);
                            resultColumns.push(column)
                        }
                    }
                    assignColumns(that, resultColumns)
                }
            };
            var updateIndexes = function(that, column) {
                updateColumnIndexes(that);
                updateColumnGroupIndexes(that, column);
                updateColumnSortIndexes(that, column);
                updateColumnVisibleIndexes(that, column)
            };
            var assignColumns = function(that, columns) {
                that._columns = columns;
                that._visibleColumns = void 0;
                that._fixedColumns = void 0;
                that._rowCount = void 0;
                that.updateColumnDataTypes()
            };
            var updateColumnChanges = function(that, changeType, optionName, columnIndex) {
                var columnChanges = that._columnChanges || {
                    optionNames: {
                        length: 0
                    },
                    changeTypes: {
                        length: 0
                    },
                    columnIndex: columnIndex
                };
                optionName = optionName || "all";
                optionName = optionName.split(".")[0];
                var changeTypes = columnChanges.changeTypes;
                if (changeType && !changeTypes[changeType]) {
                    changeTypes[changeType] = true;
                    changeTypes.length++
                }
                var optionNames = columnChanges.optionNames;
                if (optionName && !optionNames[optionName]) {
                    optionNames[optionName] = true;
                    optionNames.length++
                }
                if (void 0 === columnIndex || columnIndex !== columnChanges.columnIndex) {
                    delete columnChanges.columnIndex
                }
                that._columnChanges = columnChanges;
                that._visibleColumns = void 0;
                that._fixedColumns = void 0;
                that._rowCount = void 0
            };
            var fireColumnsChanged = function(that) {
                var onColumnsChanging = that.option("onColumnsChanging"),
                    columnChanges = that._columnChanges;
                if (that.isInitialized() && !that._updateLockCount && columnChanges) {
                    if (onColumnsChanging) {
                        that._updateLockCount++;
                        onColumnsChanging(extend({
                            component: that.component
                        }, columnChanges));
                        that._updateLockCount--
                    }
                    that._columnChanges = void 0;
                    if (columnChanges.optionNames && (columnChanges.optionNames.dataField || columnChanges.optionNames.lookup)) {
                        that.reinit()
                    } else {
                        that.columnsChanged.fire(columnChanges)
                    }
                }
            };
            var columnOptionCore = function(that, column, optionName, value, notFireEvent) {
                var prevValue, optionSetter, columns, changeType, optionGetter = dataCoreUtils.compileGetter(optionName),
                    columnIndex = column.index;
                if (3 === arguments.length) {
                    return optionGetter(column, {
                        functionsAsIs: true
                    })
                }
                prevValue = optionGetter(column, {
                    functionsAsIs: true
                });
                if (prevValue !== value) {
                    if ("groupIndex" === optionName) {
                        changeType = "grouping"
                    } else {
                        if ("sortIndex" === optionName || "sortOrder" === optionName) {
                            changeType = "sorting"
                        } else {
                            changeType = "columns"
                        }
                    }
                    optionSetter = dataCoreUtils.compileSetter(optionName);
                    optionSetter(column, value, {
                        functionsAsIs: true
                    });
                    if (!isDefined(prevValue) && !isDefined(value)) {
                        notFireEvent = true
                    }
                    if (!notFireEvent) {
                        if (inArray(optionName, USER_STATE_FIELD_NAMES) < 0 && "visibleWidth" !== optionName) {
                            columns = that.option("columns");
                            column = columns && columns[columnIndex];
                            if (commonUtils.isString(column)) {
                                column = columns[columnIndex] = {
                                    dataField: column
                                }
                            }
                            if (column) {
                                optionSetter(column, value, {
                                    functionsAsIs: true
                                })
                            }
                        }
                        updateColumnChanges(that, changeType, optionName, columnIndex)
                    }
                }
            };
            var isSortOrderValid = function(sortOrder) {
                return "asc" === sortOrder || "desc" === sortOrder
            };
            var addExpandColumn = function(that) {
                that.addCommandColumn({
                    command: "expand",
                    width: "auto",
                    cssClass: COMMAND_EXPAND_CLASS,
                    allowEditing: false,
                    allowGrouping: false,
                    allowSorting: false,
                    allowResizing: false,
                    allowReordering: false,
                    allowHiding: false
                })
            };
            var defaultSetCellValue = function(data, value) {
                var name, i, path = this.dataField.split("."),
                    dotCount = path.length - 1;
                if (this.serializeValue) {
                    value = this.serializeValue(value)
                }
                for (i = 0; i < dotCount; i++) {
                    name = path[i];
                    data = data[name] = data[name] || {}
                }
                data[path[dotCount]] = value
            };
            var getDataColumns = function(columns, rowIndex, bandColumnID) {
                var result = [];
                rowIndex = rowIndex || 0;
                columns[rowIndex] && $.each(columns[rowIndex], function(_, column) {
                    if (column.ownerBand === bandColumnID || isDefined(column.groupIndex)) {
                        if (!column.isBand || !column.colspan) {
                            if (!column.command || rowIndex < 1) {
                                result.push(column)
                            }
                        } else {
                            result.push.apply(result, getDataColumns(columns, rowIndex + 1, column.index))
                        }
                    }
                });
                return result
            };
            var isChildrenColumnVisibleInHeaders = function(that, columnID) {
                var result;
                $.each(that.getChildrenByBandColumn(columnID), function(_, column) {
                    if (column.visible) {
                        if (column.isBand) {
                            result = isChildrenColumnVisibleInHeaders(that, column.index)
                        } else {
                            if (column.ownerBand === columnID) {
                                result = true
                            }
                        }
                    }
                    return !result
                });
                return result
            };
            var getRowCount = function(that, level, bandColumnIndex) {
                var rowCount, visibleInHeaders;
                level = level || 1;
                rowCount = level;
                $.each(that._columns, function(_, column) {
                    if (column.isBand && column.visible && column.ownerBand === bandColumnIndex) {
                        visibleInHeaders = isChildrenColumnVisibleInHeaders(that, column.index);
                        if (visibleInHeaders) {
                            rowCount = Math.max(rowCount, getRowCount(that, level + 1, column.index))
                        }
                    }
                });
                return rowCount
            };
            var getFixedPosition = function(column) {
                return !column.fixedPosition ? "left" : column.fixedPosition
            };
            var processExpandColumns = function(columns, expandColumns, columnIndex) {
                var rowspan = columns[columnIndex] && columns[columnIndex].rowspan,
                    expandColumnsByRow = expandColumns.slice(0);
                if (rowspan > 1) {
                    expandColumnsByRow = $.map(expandColumnsByRow, function(expandColumn) {
                        return extend({}, expandColumn, {
                            rowspan: rowspan
                        })
                    })
                }
                expandColumnsByRow.unshift(columnIndex, 0);
                columns.splice.apply(columns, expandColumnsByRow);
                return rowspan || 1
            };
            var digitsCount = function(number) {
                var i;
                for (i = 0; number > 1; i++) {
                    number /= 10
                }
                return i
            };
            var numberToString = function(number, digitsCount) {
                var str = number ? number.toString() : "0";
                while (str.length < digitsCount) {
                    str = "0" + str
                }
                return str
            };
            return {
                _getFirstItems: function(dataSource) {
                    var groupsCount, items = [];
                    var getFirstItemsCore = function(items, groupsCount) {
                        var i, childItems;
                        if (!items || !groupsCount) {
                            return items
                        }
                        for (i = 0; i < items.length; i++) {
                            childItems = getFirstItemsCore(items[i].items || items[i].collapsedItems, groupsCount - 1);
                            if (childItems && childItems.length) {
                                return childItems
                            }
                        }
                    };
                    if (dataSource && dataSource.items().length > 0) {
                        groupsCount = normalizeSortingInfo(dataSource.group()).length;
                        items = getFirstItemsCore(dataSource.items(), groupsCount) || []
                    }
                    return items
                },
                _endUpdateCore: function() {
                    fireColumnsChanged(this)
                },
                init: function() {
                    var that = this,
                        columns = that.option("columns");
                    that._commandColumns = that._commandColumns || [];
                    that._columns = that._columns || [];
                    addExpandColumn(that);
                    that._isColumnsFromOptions = !!columns;
                    if (that._isColumnsFromOptions) {
                        assignColumns(that, columns ? createColumnsFromOptions(that, columns) : []);
                        applyUserState(that)
                    } else {
                        assignColumns(that, that._columnsUserState ? createColumnsFromOptions(that, that._columnsUserState) : that._columns)
                    }
                    if (that._dataSourceApplied) {
                        that.applyDataSource(that._dataSource, true)
                    } else {
                        updateIndexes(that)
                    }
                },
                callbackNames: function() {
                    return ["columnsChanged"]
                },
                optionChanged: function(args) {
                    switch (args.name) {
                        case "adaptColumnWidthByRatio":
                            args.handled = true;
                            break;
                        case "columns":
                            args.handled = true;
                            if (args.name === args.fullName) {
                                this._columnsUserState = null;
                                this._ignoreColumnOptionNames = null;
                                this.init()
                            } else {
                                this._columnOptionChanged(args)
                            }
                            break;
                        case "commonColumnSettings":
                        case "columnAutoWidth":
                        case "allowColumnResizing":
                        case "allowColumnReordering":
                        case "columnFixing":
                        case "grouping":
                        case "groupPanel":
                        case "regenerateColumnsByVisibleItems":
                        case "customizeColumns":
                        case "editing":
                        case "columnHidingEnabled":
                        case "dateSerializationFormat":
                        case "columnResizingMode":
                        case "columnMinWidth":
                            args.handled = true;
                            this.reinit();
                            break;
                        case "rtlEnabled":
                            this.reinit();
                            break;
                        default:
                            this.callBase(args)
                    }
                },
                _columnOptionChanged: function(args) {
                    var column, columnIndexes = [],
                        columnOptionValue = {},
                        columnOptionName = args.fullName.replace(/columns\[(\d+)\]\.?/gi, function(_, columnIndex) {
                            columnIndexes.push(parseInt(columnIndex));
                            return ""
                        });
                    if (columnIndexes.length) {
                        column = getColumnByIndexes(this, columnIndexes);
                        if (columnOptionName) {
                            columnOptionValue[columnOptionName] = args.value
                        } else {
                            columnOptionValue = args.value
                        }
                    }
                    if (column) {
                        this.columnOption(column.index, columnOptionValue)
                    }
                },
                publicMethods: function() {
                    return ["addColumn", "deleteColumn", "columnOption", "columnCount", "clearSorting", "clearGrouping", "getVisibleColumns"]
                },
                applyDataSource: function(dataSource, forceApplying) {
                    var that = this,
                        isDataSourceLoaded = dataSource && dataSource.isLoaded();
                    that._dataSource = dataSource;
                    if (!that._dataSourceApplied || 0 === that._dataSourceColumnsCount || forceApplying || that.option("regenerateColumnsByVisibleItems")) {
                        if (isDataSourceLoaded) {
                            if (!that._isColumnsFromOptions) {
                                assignColumns(that, createColumnsFromDataSource(that, dataSource));
                                that._dataSourceColumnsCount = that._columns.length;
                                applyUserState(that)
                            }
                            return that.updateColumns(dataSource, forceApplying)
                        } else {
                            that._dataSourceApplied = false
                        }
                    } else {
                        if (isDataSourceLoaded && !that.isAllDataTypesDefined(true) && that.updateColumnDataTypes(dataSource)) {
                            updateColumnChanges(that, "columns");
                            fireColumnsChanged(that)
                        }
                    }
                },
                reset: function() {
                    this._dataSourceApplied = false;
                    this._dataSourceColumnsCount = void 0;
                    this.reinit()
                },
                reinit: function() {
                    this._columnsUserState = this.getUserState();
                    this._ignoreColumnOptionNames = null;
                    this.init()
                },
                isInitialized: function() {
                    return !!this._columns.length || !!this.option("columns")
                },
                isDataSourceApplied: function() {
                    return this._dataSourceApplied
                },
                getCommonSettings: function() {
                    var commonColumnSettings = this.option("commonColumnSettings") || {},
                        groupingOptions = this.option("grouping") || {},
                        groupPanelOptions = this.option("groupPanel") || {};
                    return extend({
                        allowFixing: this.option("columnFixing.enabled"),
                        allowResizing: this.option("allowColumnResizing"),
                        allowReordering: this.option("allowColumnReordering"),
                        minWidth: this.option("columnMinWidth"),
                        autoExpandGroup: groupingOptions.autoExpandAll,
                        allowCollapsing: groupingOptions.allowCollapsing,
                        allowGrouping: groupPanelOptions.allowColumnDragging && groupPanelOptions.visible || groupingOptions.contextMenuEnabled
                    }, commonColumnSettings)
                },
                isColumnOptionUsed: function(optionName) {
                    for (var i = 0; i < this._columns.length; i++) {
                        if (this._columns[i][optionName]) {
                            return true
                        }
                    }
                },
                isAllDataTypesDefined: function(checkSerializers) {
                    var i, columns = this._columns;
                    if (!columns.length) {
                        return false
                    }
                    for (i = 0; i < columns.length; i++) {
                        if (!columns[i].dataType || checkSerializers && columns[i].deserializeValue && void 0 === columns[i].serializationFormat) {
                            return false
                        }
                    }
                    return true
                },
                getColumns: function() {
                    return this._columns
                },
                getGroupColumns: function() {
                    var result = [];
                    $.each(this._columns, function() {
                        var column = this;
                        if (isDefined(column.groupIndex)) {
                            result[column.groupIndex] = column
                        }
                    });
                    return result
                },
                getVisibleColumns: function(rowIndex) {
                    this._visibleColumns = this._visibleColumns || this._getVisibleColumnsCore();
                    rowIndex = isDefined(rowIndex) ? rowIndex : this._visibleColumns.length - 1;
                    return this._visibleColumns[rowIndex] || []
                },
                getFixedColumns: function(rowIndex) {
                    this._fixedColumns = this._fixedColumns || this._getFixedColumnsCore();
                    rowIndex = isDefined(rowIndex) ? rowIndex : this._fixedColumns.length - 1;
                    return this._fixedColumns[rowIndex] || []
                },
                _getFixedColumnsCore: function() {
                    var i, j, column, prevColumn, notFixedColumnCount, transparentColumnIndex, lastFixedPosition, visibleColumns, that = this,
                        result = [],
                        rowCount = that.getRowCount(),
                        isColumnFixing = that._isColumnFixing(),
                        transparentColumn = {
                            command: "transparent"
                        },
                        transparentColspan = 0;
                    if (isColumnFixing) {
                        for (i = 0; i <= rowCount; i++) {
                            notFixedColumnCount = 0;
                            lastFixedPosition = null;
                            transparentColumnIndex = null;
                            visibleColumns = that.getVisibleColumns(i);
                            for (j = 0; j < visibleColumns.length; j++) {
                                prevColumn = visibleColumns[j - 1];
                                column = visibleColumns[j];
                                if (!column.command) {
                                    if (!column.fixed) {
                                        if (0 === i) {
                                            if (column.isBand && column.colspan) {
                                                transparentColspan += column.colspan
                                            } else {
                                                transparentColspan++
                                            }
                                        }
                                        notFixedColumnCount++;
                                        if (!isDefined(transparentColumnIndex)) {
                                            transparentColumnIndex = j
                                        }
                                    } else {
                                        if (prevColumn && prevColumn.fixed && getFixedPosition(prevColumn) !== getFixedPosition(column)) {
                                            if (!isDefined(transparentColumnIndex)) {
                                                transparentColumnIndex = j
                                            }
                                        } else {
                                            lastFixedPosition = column.fixedPosition
                                        }
                                    }
                                }
                            }
                            if (0 === i && (0 === notFixedColumnCount || notFixedColumnCount >= visibleColumns.length)) {
                                return []
                            }
                            if (!isDefined(transparentColumnIndex)) {
                                transparentColumnIndex = "right" === lastFixedPosition ? 0 : visibleColumns.length
                            }
                            result[i] = visibleColumns.slice(0);
                            if (!transparentColumn.colspan) {
                                transparentColumn.colspan = transparentColspan
                            }
                            result[i].splice(transparentColumnIndex, notFixedColumnCount, transparentColumn)
                        }
                    }
                    return result
                },
                _isColumnFixing: function() {
                    var isColumnFixing = this.option("columnFixing.enabled");
                    !isColumnFixing && $.each(this._columns, function(_, column) {
                        if (column.fixed) {
                            isColumnFixing = true;
                            return false
                        }
                    });
                    return isColumnFixing
                },
                _getExpandColumnsCore: function() {
                    return this.getGroupColumns()
                },
                getExpandColumns: function() {
                    var expandColumn, expandColumns = this._getExpandColumnsCore();
                    if (expandColumns.length) {
                        expandColumn = this.columnOption("command:expand")
                    }
                    expandColumns = $.map(expandColumns, function(column) {
                        return extend({}, column, {
                            visibleWidth: "auto"
                        }, expandColumn, {
                            index: column.index
                        })
                    });
                    return expandColumns
                },
                _getVisibleColumnsCore: function() {
                    var i, firstPositiveIndexColumn, isFixedToEnd, that = this,
                        result = [],
                        rowspanExpandColumns = 0,
                        expandColumns = that.getExpandColumns(),
                        rowCount = that.getRowCount(),
                        positiveIndexedColumns = [],
                        negativeIndexedColumns = [],
                        notGroupedColumnsCount = 0,
                        rtlEnabled = that.option("rtlEnabled"),
                        columns = extend(true, [], that._columns.length ? that._commandColumns.concat(that._columns) : []),
                        columnDigitsCount = digitsCount(columns.length);
                    processBandColumns(that, columns);
                    for (i = 0; i < rowCount; i++) {
                        result[i] = [];
                        negativeIndexedColumns[i] = [{}];
                        positiveIndexedColumns[i] = [{}, {}, {}]
                    }
                    $.each(columns, function(index) {
                        var rowIndex, indexedColumns, column = this,
                            visibleIndex = column.visibleIndex,
                            parentBandColumns = getParentBandColumns(index, columns),
                            visible = column.visible && that.isParentColumnVisible(column.index);
                        if (visible && (!isDefined(column.groupIndex) || column.showWhenGrouped)) {
                            rowIndex = parentBandColumns.length;
                            if (visibleIndex < 0) {
                                visibleIndex = -visibleIndex;
                                indexedColumns = negativeIndexedColumns[rowIndex]
                            } else {
                                column.fixed = parentBandColumns.length ? parentBandColumns[0].fixed : column.fixed;
                                column.fixedPosition = parentBandColumns.length ? parentBandColumns[0].fixedPosition : column.fixedPosition;
                                if (column.fixed || column.command) {
                                    isFixedToEnd = "right" === column.fixedPosition;
                                    if (rtlEnabled) {
                                        isFixedToEnd = !isFixedToEnd
                                    }
                                    if (isFixedToEnd || column.command) {
                                        indexedColumns = positiveIndexedColumns[rowIndex][2]
                                    } else {
                                        indexedColumns = positiveIndexedColumns[rowIndex][0]
                                    }
                                } else {
                                    indexedColumns = positiveIndexedColumns[rowIndex][1]
                                }
                            }
                            if (parentBandColumns.length) {
                                visibleIndex = numberToString(visibleIndex, columnDigitsCount);
                                for (i = parentBandColumns.length - 1; i >= 0; i--) {
                                    visibleIndex = numberToString(parentBandColumns[i].visibleIndex, columnDigitsCount) + visibleIndex
                                }
                            }
                            indexedColumns[visibleIndex] = indexedColumns[visibleIndex] || [];
                            indexedColumns[visibleIndex].push(column);
                            notGroupedColumnsCount++
                        }
                    });
                    $.each(result, function(rowIndex) {
                        objectUtils.orderEach(negativeIndexedColumns[rowIndex], function(_, columns) {
                            result[rowIndex].unshift.apply(result[rowIndex], columns)
                        });
                        firstPositiveIndexColumn = result[rowIndex].length;
                        $.each(positiveIndexedColumns[rowIndex], function(index, columnsByFixing) {
                            objectUtils.orderEach(columnsByFixing, function(_, columnsByVisibleIndex) {
                                result[rowIndex].push.apply(result[rowIndex], columnsByVisibleIndex)
                            })
                        });
                        if (rowspanExpandColumns < rowIndex + 1) {
                            rowspanExpandColumns += processExpandColumns(result[rowIndex], expandColumns, firstPositiveIndexColumn)
                        }
                    });
                    result.push(getDataColumns(result));
                    if (!notGroupedColumnsCount && that._columns.length) {
                        result[rowCount].push({
                            command: "empty"
                        })
                    }
                    return result
                },
                getInvisibleColumns: function(columns, bandColumnIndex) {
                    var hiddenColumnsByBand, that = this,
                        result = [];
                    columns = columns || that._columns;
                    $.each(columns, function(_, column) {
                        if (column.ownerBand !== bandColumnIndex) {
                            return
                        }
                        if (column.isBand) {
                            if (!column.visible) {
                                hiddenColumnsByBand = that.getChildrenByBandColumn(column.index)
                            } else {
                                hiddenColumnsByBand = that.getInvisibleColumns(that.getChildrenByBandColumn(column.index), column.index)
                            }
                            if (hiddenColumnsByBand.length) {
                                result.push(column);
                                result = result.concat(hiddenColumnsByBand)
                            }
                            return
                        }
                        if (!column.visible) {
                            result.push(column)
                        }
                    });
                    return result
                },
                getChooserColumns: function(getAllColumns) {
                    var columns = getAllColumns ? this.getColumns() : this.getInvisibleColumns();
                    return commonUtils.grep(columns, function(column) {
                        return column.showInColumnChooser
                    })
                },
                allowMoveColumn: function(fromVisibleIndex, toVisibleIndex, sourceLocation, targetLocation) {
                    var that = this,
                        columnIndex = getColumnIndexByVisibleIndex(that, fromVisibleIndex, sourceLocation),
                        sourceColumn = that._columns[columnIndex];
                    if (sourceColumn && (sourceColumn.allowReordering || sourceColumn.allowGrouping || sourceColumn.allowHiding)) {
                        if (sourceLocation === targetLocation) {
                            if (sourceLocation === COLUMN_CHOOSER_LOCATION) {
                                return false
                            }
                            fromVisibleIndex = commonUtils.isObject(fromVisibleIndex) ? fromVisibleIndex.columnIndex : fromVisibleIndex;
                            toVisibleIndex = commonUtils.isObject(toVisibleIndex) ? toVisibleIndex.columnIndex : toVisibleIndex;
                            return fromVisibleIndex !== toVisibleIndex && fromVisibleIndex + 1 !== toVisibleIndex
                        } else {
                            if (sourceLocation === GROUP_LOCATION && targetLocation !== COLUMN_CHOOSER_LOCATION || targetLocation === GROUP_LOCATION) {
                                return sourceColumn && sourceColumn.allowGrouping
                            } else {
                                if (sourceLocation === COLUMN_CHOOSER_LOCATION || targetLocation === COLUMN_CHOOSER_LOCATION) {
                                    return sourceColumn && sourceColumn.allowHiding
                                }
                            }
                        }
                        return true
                    }
                    return false
                },
                moveColumn: function(fromVisibleIndex, toVisibleIndex, sourceLocation, targetLocation) {
                    var targetGroupIndex, column, that = this,
                        fromIndex = getColumnIndexByVisibleIndex(that, fromVisibleIndex, sourceLocation),
                        toIndex = getColumnIndexByVisibleIndex(that, toVisibleIndex, targetLocation),
                        isGroupMoving = sourceLocation === GROUP_LOCATION || targetLocation === GROUP_LOCATION;
                    if (fromIndex >= 0) {
                        column = that._columns[fromIndex];
                        toVisibleIndex = commonUtils.isObject(toVisibleIndex) ? toVisibleIndex.columnIndex : toVisibleIndex;
                        targetGroupIndex = toIndex >= 0 ? that._columns[toIndex].groupIndex : -1;
                        if (isDefined(column.groupIndex) && sourceLocation === GROUP_LOCATION) {
                            if (targetGroupIndex > column.groupIndex) {
                                targetGroupIndex--
                            }
                            delete column.groupIndex;
                            delete column.sortOrder;
                            updateColumnGroupIndexes(that)
                        }
                        if (targetLocation === GROUP_LOCATION) {
                            moveColumnToGroup(that, column, targetGroupIndex);
                            updateColumnGroupIndexes(that)
                        } else {
                            if (toVisibleIndex >= 0) {
                                var targetColumn = that._columns[toIndex];
                                if (!targetColumn || column.ownerBand !== targetColumn.ownerBand) {
                                    column.visibleIndex = void 0
                                } else {
                                    if (column.fixed ^ targetColumn.fixed) {
                                        column.visibleIndex = void 0
                                    } else {
                                        column.visibleIndex = targetColumn.visibleIndex
                                    }
                                }
                                updateColumnVisibleIndexes(that, column)
                            }
                        }
                        var isVisible = targetLocation !== COLUMN_CHOOSER_LOCATION,
                            changeType = isGroupMoving ? "grouping" : "columns";
                        if (column.visible !== isVisible) {
                            column.visible = isVisible;
                            updateColumnChanges(that, changeType, "visible", column.index)
                        } else {
                            updateColumnChanges(that, changeType)
                        }
                        fireColumnsChanged(that)
                    }
                },
                changeSortOrder: function(columnIndex, sortOrder) {
                    var that = this,
                        sortingOptions = that.option("sorting"),
                        sortingMode = sortingOptions && sortingOptions.mode,
                        needResetSorting = "single" === sortingMode || !sortOrder,
                        allowSorting = "single" === sortingMode || "multiple" === sortingMode,
                        column = that._columns[columnIndex],
                        nextSortOrder = function(column) {
                            if ("ctrl" === sortOrder) {
                                if (!("sortOrder" in column && "sortIndex" in column)) {
                                    return false
                                }
                                delete column.sortOrder;
                                delete column.sortIndex
                            } else {
                                if (isDefined(column.groupIndex) || isDefined(column.sortIndex)) {
                                    column.sortOrder = "desc" === column.sortOrder ? "asc" : "desc"
                                } else {
                                    column.sortOrder = "asc"
                                }
                            }
                            return true
                        },
                        isSortingChanged = false;
                    if (allowSorting && column && column.allowSorting) {
                        if (needResetSorting && !isDefined(column.groupIndex)) {
                            $.each(that._columns, function(index) {
                                if (index !== columnIndex && this.sortOrder && !isDefined(this.groupIndex)) {
                                    delete this.sortOrder;
                                    delete this.sortIndex;
                                    isSortingChanged = true
                                }
                            })
                        }
                        if (isSortOrderValid(sortOrder)) {
                            if (column.sortOrder !== sortOrder) {
                                column.sortOrder = sortOrder;
                                isSortingChanged = true
                            }
                        } else {
                            if ("none" === sortOrder) {
                                if (column.sortOrder) {
                                    delete column.sortIndex;
                                    delete column.sortOrder;
                                    isSortingChanged = true
                                }
                            } else {
                                isSortingChanged = nextSortOrder(column)
                            }
                        }
                    }
                    if (isSortingChanged) {
                        updateColumnSortIndexes(that);
                        updateColumnChanges(that, "sorting");
                        fireColumnsChanged(that)
                    }
                },
                getSortDataSourceParameters: function(useLocalSelector) {
                    var that = this,
                        sortColumns = [],
                        sort = [];
                    $.each(that._columns, function() {
                        if ((this.dataField || this.selector || this.calculateCellValue) && isDefined(this.sortIndex) && !isDefined(this.groupIndex)) {
                            sortColumns[this.sortIndex] = this
                        }
                    });
                    $.each(sortColumns, function() {
                        var sortOrder = this && this.sortOrder;
                        if (isSortOrderValid(sortOrder)) {
                            sort.push({
                                selector: this.calculateSortValue || this.displayField || this.calculateDisplayValue || useLocalSelector && this.selector || this.dataField || this.calculateCellValue,
                                desc: "desc" === this.sortOrder
                            })
                        }
                    });
                    return sort.length > 0 ? sort : null
                },
                getGroupDataSourceParameters: function(useLocalSelector) {
                    var group = [];
                    $.each(this.getGroupColumns(), function() {
                        var selector = this.calculateGroupValue || this.displayField || this.calculateDisplayValue || useLocalSelector && this.selector || this.dataField || this.calculateCellValue;
                        if (selector) {
                            group.push({
                                selector: selector,
                                desc: "desc" === this.sortOrder,
                                isExpanded: !!this.autoExpandGroup
                            })
                        }
                    });
                    return group.length > 0 ? group : null
                },
                refresh: function(updateNewLookupsOnly) {
                    var deferreds = [];
                    $.each(this._columns, function() {
                        var lookup = this.lookup;
                        if (lookup && !this.calculateDisplayValue) {
                            if (updateNewLookupsOnly && lookup.valueMap) {
                                return
                            }
                            if (lookup.update) {
                                deferreds.push(lookup.update())
                            }
                        }
                    });
                    return when.apply($, deferreds)
                },
                _updateColumnOptions: function(column) {
                    column.selector = column.selector || function(data) {
                        return column.calculateCellValue(data)
                    };
                    $.each(["calculateSortValue", "calculateGroupValue", "calculateDisplayValue"], function(_, calculateCallbackName) {
                        var calculateCallback = column[calculateCallbackName];
                        if (commonUtils.isFunction(calculateCallback) && !calculateCallback.originalCallback) {
                            column[calculateCallbackName] = function(data) {
                                return calculateCallback.call(column, data)
                            };
                            column[calculateCallbackName].originalCallback = calculateCallback
                        }
                    });
                    if (commonUtils.isString(column.calculateDisplayValue)) {
                        column.displayField = column.calculateDisplayValue;
                        column.calculateDisplayValue = dataCoreUtils.compileGetter(column.displayField)
                    }
                    if (column.calculateDisplayValue) {
                        column.displayValueMap = column.displayValueMap || {}
                    }
                    updateSerializers(column, column.dataType);
                    var lookup = column.lookup;
                    if (lookup) {
                        updateSerializers(lookup, lookup.dataType)
                    }
                    var dataType = lookup ? lookup.dataType : column.dataType;
                    if (dataType) {
                        column.alignment = column.alignment || getAlignmentByDataType(dataType, this.option("rtlEnabled"));
                        column.format = column.format || gridCoreUtils.getFormatByDataType(dataType);
                        column.customizeText = column.customizeText || getCustomizeTextByDataType(dataType);
                        if (!isDefined(column.filterOperations)) {
                            column.filterOperations = !lookup && DATATYPE_OPERATIONS[dataType] || []
                        }
                        column.defaultFilterOperation = column.filterOperations && column.filterOperations[0] || "=";
                        column.showEditorAlways = isDefined(column.showEditorAlways) ? column.showEditorAlways : "boolean" === dataType && !column.cellTemplate
                    }
                },
                updateColumnDataTypes: function(dataSource) {
                    var that = this,
                        dateSerializationFormat = that.option("dateSerializationFormat"),
                        firstItems = that._getFirstItems(dataSource),
                        isColumnDataTypesUpdated = false;
                    $.each(that._columns, function(index, column) {
                        var i, value, dataType, lookupDataType, valueDataType, lookup = column.lookup;
                        if ("date" === column.dataType && void 0 === column.serializationFormat) {
                            column.serializationFormat = dateSerializationFormat
                        }
                        if (lookup && "date" === lookup.dataType && void 0 === column.serializationFormat) {
                            lookup.serializationFormat = dateSerializationFormat
                        }
                        if (column.calculateCellValue && firstItems.length) {
                            if (!column.dataType || lookup && !lookup.dataType) {
                                for (i = 0; i < firstItems.length; i++) {
                                    value = column.calculateCellValue(firstItems[i]);
                                    valueDataType = column.dataType || getValueDataType(value);
                                    dataType = dataType || valueDataType;
                                    if (dataType && valueDataType && dataType !== valueDataType) {
                                        dataType = "string"
                                    }
                                    if (lookup) {
                                        valueDataType = lookup.dataType || getValueDataType(gridCoreUtils.getDisplayValue(column, value, firstItems[i]));
                                        lookupDataType = lookupDataType || valueDataType;
                                        if (lookupDataType && valueDataType && lookupDataType !== valueDataType) {
                                            lookupDataType = "string"
                                        }
                                    }
                                }
                                column.dataType = dataType;
                                if (lookup) {
                                    lookup.dataType = lookupDataType
                                }
                                if (dataType) {
                                    isColumnDataTypesUpdated = true
                                }
                            }
                            if (void 0 === column.serializationFormat || lookup && void 0 === lookup.serializationFormat) {
                                for (i = 0; i < firstItems.length; i++) {
                                    value = column.calculateCellValue(firstItems[i], true);
                                    if (void 0 === column.serializationFormat) {
                                        column.serializationFormat = getSerializationFormat(column.dataType, value)
                                    }
                                    if (lookup && void 0 === lookup.serializationFormat) {
                                        lookup.serializationFormat = getSerializationFormat(lookup.dataType, lookup.calculateCellValue(value, true))
                                    }
                                }
                            }
                        }
                        that._updateColumnOptions(column)
                    });
                    return isColumnDataTypesUpdated
                },
                _customizeColumns: function(columns) {
                    var that = this,
                        customizeColumns = that.option("customizeColumns");
                    if (customizeColumns) {
                        customizeColumns(columns);
                        assignColumns(that, createColumnsFromOptions(that, columns))
                    }
                },
                updateColumns: function(dataSource, forceApplying) {
                    var sortParameters, groupParameters, that = this;
                    if (!forceApplying) {
                        that.updateSortingGrouping(dataSource)
                    }
                    if (!dataSource || dataSource.isLoaded()) {
                        sortParameters = dataSource ? dataSource.sort() || [] : that.getSortDataSourceParameters();
                        groupParameters = dataSource ? dataSource.group() || [] : that.getGroupDataSourceParameters();
                        that._customizeColumns(that._columns);
                        updateIndexes(that);
                        return when(that.refresh(true)).always(function() {
                            that._updateChanges(dataSource, {
                                sorting: sortParameters,
                                grouping: groupParameters
                            });
                            fireColumnsChanged(that)
                        })
                    }
                },
                _updateChanges: function(dataSource, parameters) {
                    var that = this;
                    if (dataSource) {
                        that.updateColumnDataTypes(dataSource);
                        that._dataSourceApplied = true
                    }
                    if (!equalSortParameters(parameters.sorting, that.getSortDataSourceParameters())) {
                        updateColumnChanges(that, "sorting")
                    }
                    if (!equalSortParameters(parameters.grouping, that.getGroupDataSourceParameters())) {
                        updateColumnChanges(that, "grouping")
                    }
                    updateColumnChanges(that, "columns")
                },
                updateSortingGrouping: function(dataSource, fromDataSource) {
                    var sortParameters, groupParameters, columnsGroupParameters, columnsSortParameters, isColumnsChanged, that = this,
                        updateSortGroupParameterIndexes = function(columns, sortParameters, indexParameterName) {
                            var i, selector, isExpanded;
                            $.each(columns, function(index, column) {
                                delete column[indexParameterName];
                                if (sortParameters) {
                                    for (i = 0; i < sortParameters.length; i++) {
                                        selector = sortParameters[i].selector;
                                        isExpanded = sortParameters[i].isExpanded;
                                        if (selector === column.dataField || selector === column.name || selector === column.selector || selector === column.calculateCellValue || selector === column.calculateGroupValue) {
                                            column.sortOrder = column.sortOrder || (sortParameters[i].desc ? "desc" : "asc");
                                            if (void 0 !== isExpanded) {
                                                column.autoExpandGroup = isExpanded
                                            }
                                            column[indexParameterName] = i;
                                            break
                                        }
                                    }
                                }
                            })
                        };
                    if (dataSource) {
                        sortParameters = normalizeSortingInfo(dataSource.sort());
                        groupParameters = normalizeSortingInfo(dataSource.group());
                        columnsGroupParameters = that.getGroupDataSourceParameters();
                        columnsSortParameters = that.getSortDataSourceParameters();
                        if (!that._columns.length) {
                            $.each(groupParameters, function(index, group) {
                                that._columns.push(group.selector)
                            });
                            $.each(sortParameters, function(index, sort) {
                                that._columns.push(sort.selector)
                            });
                            assignColumns(that, createColumnsFromOptions(that, that._columns))
                        }
                        if ((fromDataSource || !columnsGroupParameters && !that._hasUserState) && !equalSortParameters(groupParameters, columnsGroupParameters)) {
                            updateSortGroupParameterIndexes(that._columns, groupParameters, "groupIndex");
                            if (fromDataSource) {
                                updateColumnChanges(that, "grouping");
                                isColumnsChanged = true
                            }
                        }
                        if ((fromDataSource || !columnsSortParameters && !that._hasUserState) && !equalSortParameters(sortParameters, columnsSortParameters)) {
                            updateSortGroupParameterIndexes(that._columns, sortParameters, "sortIndex");
                            if (fromDataSource) {
                                updateColumnChanges(that, "sorting");
                                isColumnsChanged = true
                            }
                        }
                        if (isColumnsChanged) {
                            fireColumnsChanged(that)
                        }
                    }
                },
                updateFilter: function(filter, remoteFiltering, columnIndex) {
                    var that = this;
                    if (!Array.isArray(filter)) {
                        return filter
                    }
                    var column, i;
                    filter = extend([], filter);
                    columnIndex = filter.columnIndex || columnIndex;
                    if (commonUtils.isString(filter[0])) {
                        column = that.columnOption(filter[0]);
                        if (remoteFiltering) {
                            if (config().forceIsoDateParsing && column && column.serializeValue && filter.length > 1) {
                                filter[filter.length - 1] = column.serializeValue(filter[filter.length - 1])
                            }
                        } else {
                            if (column && column.selector) {
                                filter[0] = column.selector;
                                filter[0].columnIndex = column.index
                            }
                        }
                    } else {
                        if (commonUtils.isFunction(filter[0])) {
                            filter[0].columnIndex = columnIndex
                        }
                    }
                    for (i = 0; i < filter.length; i++) {
                        filter[i] = that.updateFilter(filter[i], remoteFiltering, columnIndex)
                    }
                    return filter
                },
                columnCount: function() {
                    return this._columns.length
                },
                columnOption: function(identifier, option, value, notFireEvent) {
                    var i, needUpdateIndexes, column, that = this,
                        identifierOptionName = commonUtils.isString(identifier) && identifier.substr(0, identifier.indexOf(":")),
                        columns = identifier < 0 || "command" === identifierOptionName ? that._commandColumns : that._columns;
                    if (void 0 === identifier) {
                        return
                    }
                    if (identifierOptionName) {
                        identifier = identifier.substr(identifierOptionName.length + 1)
                    }
                    for (i = 0; i < columns.length; i++) {
                        if (identifierOptionName) {
                            if ("" + columns[i][identifierOptionName] === identifier) {
                                column = columns[i];
                                break
                            }
                        } else {
                            if (columns[i].index === identifier || columns[i].name === identifier || columns[i].dataField === identifier || columns[i].caption === identifier) {
                                column = columns[i];
                                break
                            }
                        }
                    }
                    if (column) {
                        if (1 === arguments.length) {
                            return extend({}, column)
                        }
                        if (commonUtils.isString(option)) {
                            if (2 === arguments.length) {
                                return columnOptionCore(that, column, option)
                            } else {
                                needUpdateIndexes = needUpdateIndexes || COLUMN_INDEX_OPTIONS[option];
                                columnOptionCore(that, column, option, value, notFireEvent)
                            }
                        } else {
                            if (commonUtils.isObject(option)) {
                                $.each(option, function(optionName, value) {
                                    needUpdateIndexes = needUpdateIndexes || COLUMN_INDEX_OPTIONS[optionName];
                                    columnOptionCore(that, column, optionName, value, notFireEvent)
                                })
                            }
                        }
                        if (needUpdateIndexes) {
                            updateIndexes(that, column)
                        }
                        fireColumnsChanged(that)
                    }
                },
                clearSorting: function() {
                    var i, that = this,
                        columnCount = this.columnCount();
                    that.beginUpdate();
                    for (i = 0; i < columnCount; i++) {
                        that.columnOption(i, "sortOrder", void 0)
                    }
                    that.endUpdate()
                },
                clearGrouping: function() {
                    var i, that = this,
                        columnCount = this.columnCount();
                    that.beginUpdate();
                    for (i = 0; i < columnCount; i++) {
                        that.columnOption(i, "groupIndex", void 0)
                    }
                    that.endUpdate()
                },
                getVisibleIndex: function(index, rowIndex) {
                    var i, columns = this.getVisibleColumns(rowIndex);
                    for (i = columns.length - 1; i >= 0; i--) {
                        if (columns[i].index === index) {
                            return i
                        }
                    }
                    return -1
                },
                addColumn: function(options) {
                    var that = this,
                        column = createColumn(that, options);
                    column.added = options;
                    that._columns.push(column);
                    updateIndexes(that, column);
                    that.updateColumns(that._dataSource)
                },
                deleteColumn: function(id) {
                    var that = this,
                        columnIndex = that.columnOption(id, "index");
                    if (columnIndex >= 0) {
                        that._columns.splice(columnIndex, 1);
                        updateIndexes(that);
                        that.updateColumns(that._dataSource)
                    }
                },
                addCommandColumn: function(options) {
                    var i, commandColumns = this._commandColumns;
                    for (i = 0; i < commandColumns.length; i++) {
                        if (commandColumns[i].command === options.command) {
                            return
                        }
                    }
                    commandColumns.push(options)
                },
                getUserState: function() {
                    var i, columns = this._columns,
                        result = [];

                    function handleStateField(index, value) {
                        if (void 0 !== columns[i][value]) {
                            result[i][value] = columns[i][value]
                        }
                    }
                    for (i = 0; i < columns.length; i++) {
                        result[i] = {};
                        $.each(USER_STATE_FIELD_NAMES, handleStateField)
                    }
                    return result
                },
                setUserState: function(state) {
                    var commonColumnSettings, that = this,
                        ignoreColumnOptionNames = that.option("stateStoring.ignoreColumnOptionNames");
                    if (!ignoreColumnOptionNames) {
                        ignoreColumnOptionNames = [];
                        commonColumnSettings = that.getCommonSettings();
                        if (!that.option("columnChooser.enabled")) {
                            ignoreColumnOptionNames.push("visible")
                        }
                        if ("none" === that.option("sorting.mode")) {
                            ignoreColumnOptionNames.push("sortIndex", "sortOrder")
                        }
                        if (!commonColumnSettings.allowGrouping) {
                            ignoreColumnOptionNames.push("groupIndex")
                        }
                        if (!commonColumnSettings.allowFixing) {
                            ignoreColumnOptionNames.push("fixed", "fixedPosition")
                        }
                        if (!commonColumnSettings.allowResizing) {
                            ignoreColumnOptionNames.push("width", "visibleWidth")
                        }
                        if (!that.option("filterRow.visible")) {
                            ignoreColumnOptionNames.push("filterValue", "selectedFilterOperation")
                        }
                        if (!that.option("headerFilter.visible")) {
                            ignoreColumnOptionNames.push("filterValues", "filterType")
                        }
                    }
                    that._columnsUserState = state;
                    that._ignoreColumnOptionNames = ignoreColumnOptionNames;
                    that._hasUserState = !!state;
                    that.init()
                },
                _createCalculatedColumnOptions: function(columnOptions, bandColumn) {
                    var getter, calculatedColumnOptions = {},
                        dataField = columnOptions.dataField;
                    if (Array.isArray(columnOptions.columns) && columnOptions.columns.length || columnOptions.isBand) {
                        calculatedColumnOptions.isBand = true;
                        dataField = null
                    }
                    if (dataField) {
                        if (commonUtils.isString(dataField)) {
                            getter = dataCoreUtils.compileGetter(dataField);
                            calculatedColumnOptions = {
                                caption: inflector.captionize(dataField),
                                calculateCellValue: function(data, skipDeserialization) {
                                    var value = getter(data);
                                    return this.deserializeValue && !skipDeserialization ? this.deserializeValue(value) : value
                                },
                                setCellValue: defaultSetCellValue,
                                parseValue: function(text) {
                                    var result, parsedValue, column = this;
                                    if ("number" === column.dataType) {
                                        if (commonUtils.isString(text)) {
                                            parsedValue = numberLocalization.parse(text);
                                            if (commonUtils.isNumeric(parsedValue)) {
                                                result = parsedValue
                                            }
                                        } else {
                                            if (isDefined(text)) {
                                                result = Number(text)
                                            }
                                        }
                                    } else {
                                        if ("boolean" === column.dataType) {
                                            if (text === column.trueText) {
                                                result = true
                                            } else {
                                                if (text === column.falseText) {
                                                    result = false
                                                }
                                            }
                                        } else {
                                            if ("date" === column.dataType) {
                                                parsedValue = dateLocalization.parse(text, column.format);
                                                if (parsedValue) {
                                                    result = parsedValue
                                                }
                                            } else {
                                                result = text
                                            }
                                        }
                                    }
                                    return result
                                }
                            }
                        }
                        calculatedColumnOptions.allowFiltering = true
                    } else {
                        calculatedColumnOptions.allowFiltering = !!columnOptions.calculateFilterExpression
                    }
                    calculatedColumnOptions.calculateFilterExpression = function() {
                        return gridCoreUtils.defaultCalculateFilterExpression.apply(this, arguments)
                    };
                    calculatedColumnOptions.createFilterExpression = function() {
                        var result;
                        if (this.calculateFilterExpression) {
                            result = this.calculateFilterExpression.apply(this, arguments)
                        }
                        if (commonUtils.isFunction(result)) {
                            result = [result, "=", true]
                        } else {
                            if (result) {
                                result.columnIndex = this.index
                            }
                        }
                        return result
                    };
                    if (!dataField || !commonUtils.isString(dataField)) {
                        extend(true, calculatedColumnOptions, {
                            allowSorting: false,
                            allowGrouping: false,
                            calculateCellValue: function() {
                                return null
                            }
                        })
                    }
                    if (bandColumn) {
                        calculatedColumnOptions.allowFixing = false
                    }
                    if (columnOptions.dataType) {
                        calculatedColumnOptions.userDataType = columnOptions.dataType
                    }
                    if (columnOptions.selectedFilterOperation) {
                        calculatedColumnOptions.defaultSelectedFilterOperation = columnOptions.selectedFilterOperation
                    }
                    if (columnOptions.lookup) {
                        calculatedColumnOptions.lookup = {
                            calculateCellValue: function(value, skipDeserialization) {
                                if (this.valueExpr) {
                                    value = this.valueMap && this.valueMap[value]
                                }
                                return this.deserializeValue && !skipDeserialization ? this.deserializeValue(value) : value
                            },
                            updateValueMap: function() {
                                var calculateValue, calculateDisplayValue, item, i;
                                this.valueMap = {};
                                if (this.items) {
                                    calculateValue = dataCoreUtils.compileGetter(this.valueExpr);
                                    calculateDisplayValue = dataCoreUtils.compileGetter(this.displayExpr);
                                    for (i = 0; i < this.items.length; i++) {
                                        item = this.items[i];
                                        this.valueMap[calculateValue(item)] = calculateDisplayValue(item)
                                    }
                                }
                            },
                            update: function() {
                                var dataSourceOptions, that = this,
                                    dataSource = that.dataSource;
                                if (dataSource) {
                                    if (commonUtils.isFunction(dataSource) && !isWrapped(dataSource)) {
                                        dataSource = dataSource({})
                                    }
                                    if (commonUtils.isObject(dataSource) || Array.isArray(dataSource)) {
                                        if (that.valueExpr) {
                                            dataSourceOptions = normalizeDataSourceOptions(dataSource);
                                            dataSourceOptions.paginate = false;
                                            dataSource = new DataSourceModule.DataSource(dataSourceOptions);
                                            return dataSource.load().done(function(data) {
                                                that.items = data;
                                                that.updateValueMap && that.updateValueMap()
                                            })
                                        }
                                    } else {
                                        errors.log("E1016")
                                    }
                                } else {
                                    that.updateValueMap && that.updateValueMap()
                                }
                            }
                        }
                    }
                    calculatedColumnOptions.resizedCallbacks = $.Callbacks();
                    if (columnOptions.resized) {
                        calculatedColumnOptions.resizedCallbacks.add(columnOptions.resized.bind(columnOptions))
                    }
                    $.each(calculatedColumnOptions, function(optionName) {
                        var defaultOptionName;
                        if (commonUtils.isFunction(calculatedColumnOptions[optionName]) && 0 !== optionName.indexOf("default")) {
                            defaultOptionName = "default" + optionName.charAt(0).toUpperCase() + optionName.substr(1);
                            calculatedColumnOptions[defaultOptionName] = calculatedColumnOptions[optionName]
                        }
                    });
                    return calculatedColumnOptions
                },
                getRowCount: function() {
                    this._rowCount = this._rowCount || getRowCount(this);
                    return this._rowCount
                },
                getRowIndex: function(columnIndex, alwaysGetRowIndex) {
                    var column = this._columns[columnIndex];
                    return column && (alwaysGetRowIndex || column.visible && !(column.command || isDefined(column.groupIndex))) ? getParentBandColumns(columnIndex, this._columns).length : 0
                },
                getChildrenByBandColumn: function(bandColumnIndex, rowIndex) {
                    var that = this;
                    if (isDefined(rowIndex)) {
                        return commonUtils.grep(that.getVisibleColumns(rowIndex), function(column) {
                            return column.ownerBand === bandColumnIndex && !column.command
                        })
                    } else {
                        return that._columns.filter(function(column) {
                            return (!isDefined(column.groupIndex) || column.showWhenGrouped) && that.isParentBandColumn(column.index, bandColumnIndex)
                        })
                    }
                },
                isParentBandColumn: function(columnIndex, bandColumnIndex) {
                    var result = false,
                        column = this._columns[columnIndex],
                        parentBandColumns = column && getParentBandColumns(columnIndex, this._columns);
                    if (parentBandColumns) {
                        $.each(parentBandColumns, function(_, bandColumn) {
                            if (bandColumn.index === bandColumnIndex) {
                                result = true;
                                return false
                            }
                        })
                    }
                    return result
                },
                isParentColumnVisible: function(columnIndex) {
                    var result = true,
                        bandColumns = columnIndex >= 0 && getParentBandColumns(columnIndex, this._columns);
                    bandColumns && $.each(bandColumns, function(_, bandColumn) {
                        result = result && bandColumn.visible;
                        return result
                    });
                    return result
                }
            }
        }())
    }
};