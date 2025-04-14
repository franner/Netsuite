/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */

define(['N/ui/serverWidget', 'N/search', 'N/log'],
    function(serverWidget, search, log) {

        function onRequest(context) {
            log.debug({title:'starting',details:'starting..'})
            // Create form and attach client script to it.
            var widgetForm = serverWidget.createForm({
                title: 'OE Work Order Map',
            });
            widgetForm.clientScriptModulePath = 'SuiteScripts/oe-metadata-client.js';

            widgetForm.addSubmitButton({
                label: 'Submit'
            });

            // -------------- Work order group ----------------

            var mainfieldgroup = widgetForm.addFieldGroup({
                id: 'main_fieldgroup',
                label: 'Choose work order'
            });

            var searchWoField = widgetForm.addField({
                id: 'custpage_oe_map_search_wo',
                type: serverWidget.FieldType.TEXT,
                label: 'Search Work Order',
                container: 'main_fieldgroup'
            });

            var noShowField = widgetForm.addField({
                id: 'custpage_oe_map_not_complete',
                type: serverWidget.FieldType.CHECKBOX,
                label: "Don't show Closed work orders",
            });

            if (context.request.parameters.custpage_oe_map_not_complete == 'T') {
                noShowField.defaultValue = 'T';
            }

            var showStockField = widgetForm.addField({
                id: 'custpage_oe_map_show_stock',
                type: serverWidget.FieldType.CHECKBOX,
                label: "Show Stock Items",
            });

            if (context.request.parameters.custpage_oe_map_show_stock == 'T') {
                showStockField.defaultValue = 'T';
            }

            var selectWoField = widgetForm.addField({
                id: 'custpage_oe_map_select_wo',
                type: serverWidget.FieldType.SELECT,
                label: 'Select Work order',
                container: 'main_fieldgroup'
            });

            selectWoField.addSelectOption({
                value: '-',
                text: '-'
            });
            log.debug({title:'first search',details:'first search'})
            var woMatrixSearch = search.create({
                type: "customrecord_wo_matrix",
                filters: ["isinactive","is","F"],
                columns: [
                    search.createColumn({ name: "custrecord107" }),
                    search.createColumn({ name: "custrecord108" })
                ]
            });

            var start = 0;
            var partialResults = null;

            var srchResults = woMatrixSearch.run();

            do {
                partialResults = srchResults.getRange({
                    start: start,
                    end: start + 1000
                });

                if (partialResults) {
                    for (var i in partialResults) {

                        var woId = partialResults[i].getValue({
                            name: "custrecord107",
                        });
                        var woName = partialResults[i].getText({
                            name: "custrecord107",
                        });
                        if (context.request.parameters.custpage_oe_map_select_wo == woId || context.request.parameters.woid == woId) {
                            selectWoField.addSelectOption({
                                value: woId,
                                text: woName,
                                isSelected: true
                            });
                        } else {
                            selectWoField.addSelectOption({
                                value: woId,
                                text: woName
                            });
                        }

                    }

                    start += 1000;
                }
            }
            while (partialResults && partialResults.length >= 1000);
            log.debug({title:'ending first search',details:'ending first search'})

            // woMatrixSearch.run().each(function(result) {
            //     // .run().each has a limit of 4,000 results
            //     var woName = result.getText({
            //         name: 'custrecord107'
            //     });
            //     var woId = result.getValue({
            //         name: 'custrecord107'
            //     });
            //     if (context.request.parameters.custpage_oe_map_select_wo == woId || context.request.parameters.woid == woId) {
            //         selectWoField.addSelectOption({
            //             value: woId,
            //             text: woName,
            //             isSelected: true
            //         });
            //     } else {
            //         selectWoField.addSelectOption({
            //             value: woId,
            //             text: woName
            //         });
            //     }
            //
            //     return true;
            // });

            // -------------- Sales order group ----------------

            var salefieldgroup = widgetForm.addFieldGroup({
                id: 'salesorder_fieldgroup',
                label: 'Choose Sales Order'
            });

            var searchSoField = widgetForm.addField({
                id: 'custpage_oe_map_search_so',
                type: serverWidget.FieldType.TEXT,
                label: 'Search Sales Order',
                container: 'salesorder_fieldgroup'
            });

            var selectSoField = widgetForm.addField({
                id: 'custpage_oe_map_select_so',
                type: serverWidget.FieldType.SELECT,
                label: 'Select Sales order',
                container: 'salesorder_fieldgroup'
            });

            selectSoField.addSelectOption({
                value: '-',
                text: '-'
            });

            log.debug({title:'starting 2nd search',details:'starting 2nd search'})
            var soExists = [];

            var start = 0;
            var partialResults = null;

            var srchResults = woMatrixSearch.run();
            log.debug({title:'running search 2 again',details:'running search 2 again'})
            do {
                partialResults = srchResults.getRange({
                    start: start,
                    end: start + 1000
                });
                log.debug({title:'partialResults',details:partialResults})
                if (partialResults) {
                    for (var i in partialResults) {

                        var soId = partialResults[i].getValue({
                            name: "custrecord108",
                        });
                        var soName = partialResults[i].getText({
                            name: "custrecord108",
                        });
                        if (soExists.indexOf(soId) != -1) {
                            continue;
                        } else {
                            // set main line
                            soExists.push(soId);

                            if (context.request.parameters.custpage_oe_map_select_so == soId || context.request.parameters.soid == soId) {
                                selectSoField.addSelectOption({
                                    value: soId,
                                    text: soName,
                                    isSelected: true
                                });
                            } else {
                                selectSoField.addSelectOption({
                                    value: soId,
                                    text: soName
                                });
                            }
                        }

                    }

                    start += 1000;
                }
            }
            while (partialResults && partialResults.length >= 1000);
            log.debug({title:'ending 2nd search',details:'ending 2nd search'})


            // woMatrixSearch.run().each(function(result) {
            //     // .run().each has a limit of 4,000 results
            //     var soName = result.getText({
            //         name: 'custrecord108'
            //     });
            //
            //     var soId = result.getValue({
            //         name: 'custrecord108'
            //     });
            //
            //     if (soExists.indexOf(soId) != -1) {
            //         return true;
            //     } else {
            //         // set main line
            //         soExists.push(soId);
            //
            //         if (context.request.parameters.custpage_oe_map_select_so == soId || context.request.parameters.soid == soId) {
            //             selectSoField.addSelectOption({
            //                 value: soId,
            //                 text: soName,
            //                 isSelected: true
            //             });
            //         } else {
            //             selectSoField.addSelectOption({
            //                 value: soId,
            //                 text: soName
            //             });
            //         }
            //
            //         return true;
            //     }
            // });

            // -------------- Work order information group ----------------

            log.debug({title:'we are getting through searches',details:'we are getting through searches'})
            log.debug({title:'soExists',details:soExists})


            var wofieldgroup = widgetForm.addFieldGroup({
                id: 'workorder_fieldgroup',
                label: 'Work Order Information'
            });
            var closedCountField = widgetForm.addField({
                id: 'custpage_closed_count',
                type: serverWidget.FieldType.TEXT,
                label: 'Number of closed work orders',
                container: 'workorder_fieldgroup'
            });
            closedCountField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });
            var totalCountField = widgetForm.addField({
                id: 'custpage_total_count',
                type: serverWidget.FieldType.TEXT,
                label: 'Total number of work orders',
                container: 'workorder_fieldgroup'
            });
            totalCountField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });
            var precentageField = widgetForm.addField({
                id: 'custpage_total_precentage',
                type: serverWidget.FieldType.TEXT,
                label: '% of work orders done',
                container: 'workorder_fieldgroup'
            });
            precentageField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });

            var matrixSublist = widgetForm.addSublist({
                id: 'custpage_map_sublist',
                type: serverWidget.SublistType.LIST,
                label: 'Work Order Matrix'
            });

            matrixSublist.helpText = '<div style="display:flex;"><div style="padding:6px; display:flex;"><div style="width:18px; height:18px; background-color:#13C400;"></div><p style="font-size:14px; padding-left:6px">Closed</p></div><div style="padding:6px; display:flex; margin-left:12px;"><div style="width:18px; height:18px; background-color:#FFC21C;"></div><p style="font-size:14px; padding-left:6px">In Process</p></div><div style="padding:6px; display:flex; margin-left:12px;"><div style="width:18px; height:18px; background-color:#FF5542;"></div><p style="font-size:14px; padding-left:6px">Released</p></div></div>';

            matrixSublist.addField({ id: 'custpage_sublist_level_0', type: serverWidget.FieldType.TEXTAREA, label: 'Level 0' });
            matrixSublist.addField({ id: 'custpage_sublist_level_1', type: serverWidget.FieldType.TEXTAREA, label: 'Level 1' });
            matrixSublist.addField({ id: 'custpage_sublist_level_2', type: serverWidget.FieldType.TEXTAREA, label: 'Level 2' });
            matrixSublist.addField({ id: 'custpage_sublist_level_3', type: serverWidget.FieldType.TEXTAREA, label: 'Level 3' });
            matrixSublist.addField({ id: 'custpage_sublist_level_4', type: serverWidget.FieldType.TEXTAREA, label: 'Level 4' });
            matrixSublist.addField({ id: 'custpage_sublist_level_5', type: serverWidget.FieldType.TEXTAREA, label: 'Level 5' });
            matrixSublist.addField({ id: 'custpage_sublist_level_6', type: serverWidget.FieldType.TEXTAREA, label: 'Level 6' });
            matrixSublist.addField({ id: 'custpage_sublist_level_7', type: serverWidget.FieldType.TEXTAREA, label: 'Level 7' });
            matrixSublist.addField({ id: 'custpage_sublist_level_8', type: serverWidget.FieldType.TEXTAREA, label: 'Level 8' });
            matrixSublist.addField({ id: 'custpage_sublist_level_9', type: serverWidget.FieldType.TEXTAREA, label: 'Level 9' });
            matrixSublist.addField({ id: 'custpage_sublist_level_10', type: serverWidget.FieldType.TEXTAREA, label: 'Level 10' });
            matrixSublist.addField({ id: 'custpage_sublist_level_11', type: serverWidget.FieldType.TEXTAREA, label: 'Level 11' });
            matrixSublist.addField({ id: 'custpage_sublist_level_12', type: serverWidget.FieldType.TEXTAREA, label: 'Level 12' });
            matrixSublist.addField({ id: 'custpage_sublist_level_13', type: serverWidget.FieldType.TEXTAREA, label: 'Level 13' });


            if (isNaN(context.request.parameters.custpage_oe_map_select_wo) == false || isNaN(context.request.parameters.woid) == false || isNaN(context.request.parameters.soid) == false || isNaN(context.request.parameters.custpage_oe_map_select_so) == false) {
                var filter = [
                    ["custrecord107", "is"]
                ];

                if (isNaN(context.request.parameters.custpage_oe_map_select_wo) == false) {
                    filter[0].push(context.request.parameters.custpage_oe_map_select_wo);
                } else if (isNaN(context.request.parameters.woid) == false) {
                    filter[0].push(context.request.parameters.woid);
                } else if (isNaN(context.request.parameters.soid) == false) {
                    filter = [
                        ["custrecord108", "is", context.request.parameters.soid]
                    ];
                } else if (isNaN(context.request.parameters.custpage_oe_map_select_so) == false) {
                    filter = [
                        ["custrecord108", "is", context.request.parameters.custpage_oe_map_select_so],
                        "AND",["isinactive","is","F"]
                    ];
                }
                log.debug({title:'filter',details:filter})
                var matrixSearchObj = search.create({
                    type: "customrecord_wo_matrix",
                    filters: filter,
                    columns: [
                        search.createColumn({ name: "custrecordmatrix_json" }),
                        search.createColumn({ name: "custrecordclosedcount" }),
                        search.createColumn({ name: "custrecordtotalcount" }),
                    ]
                });
                var index = -1;
                var closedwo = 0;
                var totalwo = 0;

                matrixSearchObj.run().each(function(result) {
                    // max 4000 results
                    var jsonString = result.getValue({ name: 'custrecordmatrix_json' });
                    var jsonObj = JSON.parse(jsonString);
                    var closed = result.getValue({ name: 'custrecordclosedcount' });
                    var total = result.getValue({ name: 'custrecordtotalcount' });

                    closedwo = closedwo + parseInt(closed);
                    totalwo = totalwo + parseInt(total);

                    function handleSubLevel(thisJson) {
                        if (thisJson.status != 'stock') {
                            var levelField = 'custpage_sublist_level_' + thisJson.level;
                            var atag;
                            if (thisJson.status == "Closed") {
                                atag = '<p><a style="background-color:#13C400;color:white;padding:3px;" ';
                            } else if (jsonObj.status == "In Process") {
                                atag = '<p><a style="background-color:#FFC21C;color:white;padding:3px;" ';
                            } else {
                                atag = '<p><a style="background-color:#FF5542;color:white;padding:3px;" ';
                            }
                            // https://4667410.app.netsuite.com
                            var url = atag + 'href="/app/accounting/transactions/workord.nl?id=' + thisJson.woid + '&whence=" target="_blank">' + thisJson.wotext + '</a> ' + thisJson.assemblydescription + '</p>';

                            if (context.request.parameters.custpage_oe_map_not_complete == 'T' && thisJson.status == "Closed") {
                                // do not add the line
                            } else {
                                index++;
                                matrixSublist.setSublistValue({
                                    id: levelField,
                                    line: index,
                                    value: url
                                });
                            }

                            if (thisJson.children.length > 0) {
                                for (z in thisJson.children) {
                                    handleSubLevel(thisJson.children[z]);
                                }
                            }
                        } else {
                            // this is for stock items
                            if (context.request.parameters.custpage_oe_map_show_stock == 'T') {
                                index++;

                                var thisStock = '<p>' + thisJson.name + '</p>';
                                var levelField = 'custpage_sublist_level_' + thisJson.level;

                                matrixSublist.setSublistValue({
                                    id: levelField,
                                    line: index,
                                    value: thisStock
                                });
                            }
                        }
                    }

                    var levelField = 'custpage_sublist_level_' + jsonObj.level;

                    if (jsonObj.status == "Closed") {
                        atag = '<p><a style="background-color:#13C400;color:white;padding:3px;" ';
                    } else if (jsonObj.status == "In Process") {
                        atag = '<p><a style="background-color:#FFC21C;color:white;padding:3px;" ';
                    } else {
                        atag = '<p><a style="background-color:#FF5542;color:white;padding:3px;" ';
                    }
                    // https://4667410.app.netsuite.com
                    var url = atag + 'href="/app/accounting/transactions/workord.nl?id=' + jsonObj.woid + '&whence=" target="_blank">' + jsonObj.wotext + '</a>' + jsonObj.assemblydescription + '</p>';

                    index++;
                    matrixSublist.setSublistValue({
                        id: levelField,
                        line: index,
                        value: url
                    });

                    function findCorrectLevel(thisJson, subid) {
                        if (thisJson.woid == subid) {
                            handleSubLevel(thisJson);
                        } else {
                            for (x in thisJson.children) {
                                findCorrectLevel(thisJson.children[x], subid);
                            }
                        }
                    }

                    if (jsonObj.children.length > 0) {
                        for (y in jsonObj.children) {
                            if (isNaN(context.request.parameters.subid) == false) {
                                findCorrectLevel(jsonObj.children[y], context.request.parameters.subid);
                            } else {
                                // handle normaly
                                handleSubLevel(jsonObj.children[y]);
                            }
                        }
                    }

                    return true;
                });

                log.debug({title:'drawing complete',details:'drawing complete'})

                closedCountField.defaultValue = closedwo;
                totalCountField.defaultValue = totalwo;

                var percentage = closedwo / totalwo * 100;
                precentageField.defaultValue = percentage.toFixed(2);

            }

            // Add form to ui
            context.response.writePage(widgetForm);
        }

        return {
            onRequest: onRequest
        };
    });