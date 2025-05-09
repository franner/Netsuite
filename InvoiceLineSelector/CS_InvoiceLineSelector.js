/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/ui/message'], function (currentRecord, message) {

    // Global variables to store the current modal and its close function
    var modalDivGlobal = null;
    var closeModalGlobal = function(){};

    function pageInit(context) {
        // Safe initialization
    }

    function openInvoiceLineSelector() {
        var rec = currentRecord.get();
        var lineData = [];
        var lineCount = rec.getLineCount({ sublistId: 'item' });

        // ✅ Fetch item lines dynamically from the current record
        for (var i = 0; i < lineCount; i++) {
            var itemId = rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
            var itemName = rec.getSublistText({ sublistId: 'item', fieldId: 'item', line: i });
            var description = rec.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i }) || '';
            var quantity = rec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }) || 0;
            var rate = rec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }) || 0.00;

            if (itemId) {
                lineData.push({
                    itemId: itemId,
                    itemName: itemName,
                    description: description,
                    quantity: quantity,
                    rate: rate,
                    lineIndex: i
                });
            }
        }

        if (lineData.length === 0) {
            alert("No item lines found. Add items before selecting.");
            return;
        }

        displayInvoiceLineModal(lineData);
    }

    function displayInvoiceLineModal(lineData) {
        var modalHtml = '<div id="invoiceLineModal" style="position: fixed; top: 10%; right: 0; width: 60%; max-height: 80vh; background: white; padding: 20px; border: 2px solid black; z-index: 1000; display: flex; flex-direction: column;">';

        modalHtml += '<h3 style="cursor:move;">Select Invoice Lines</h3>';
        // Top sum display
        modalHtml += '<div id="sumTop" style="margin: 10px 0; font-weight: bold;">Total Sum: 0.00</div>';
        modalHtml += '<div style="display: flex; justify-content: space-between; margin-bottom: 10px;">';
        modalHtml += '<div>';
        modalHtml += '<button id="applyChanges">Apply</button>';
        modalHtml += '<button id="closeModal">Close</button>';
        modalHtml += '</div>';
        modalHtml += '<div>';
        modalHtml += '<button id="selectAll">Select All</button>';
        modalHtml += '<button id="deselectAll">Deselect All</button>';
        modalHtml += '</div>';
        modalHtml += '</div>';
        modalHtml += '<div style="overflow-y: auto; max-height: 60vh; border: 1px solid #ccc; padding: 5px;">';
        modalHtml += '<table border="1" width="100%">';
        // Added Total header after Rate
        modalHtml += '<tr><th>Select</th><th>Item</th><th>Description</th><th>Quantity</th><th>Rate</th><th>Total</th></tr>';

        lineData.forEach(function (line, index) {
            // Calculate the total for the line
            var qty = parseFloat(line.quantity) || 0;
            var rate = parseFloat(line.rate) || 0;
            var total = (qty * rate).toFixed(2);

            modalHtml += '<tr>';
            modalHtml += '<td><input type="checkbox" class="line-select" data-index="' + index + '"></td>';
            modalHtml += '<td>' + line.itemName + '</td>';
            modalHtml += '<td>' + line.description + '</td>';
            modalHtml += '<td>' + line.quantity + '</td>';
            modalHtml += '<td>' + line.rate + '</td>';
            modalHtml += '<td>' + total + '</td>';
            modalHtml += '</tr>';
        });

        modalHtml += '</table>';
        modalHtml += '</div>';
        // Bottom sum display
        modalHtml += '<div id="sumBottom" style="margin: 10px 0; font-weight: bold;">Total Sum: 0.00</div>';
        modalHtml += '<div style="display: flex; justify-content: space-between; margin-top: 10px;">';
        modalHtml += '<div>';
        modalHtml += '<button id="applyChangesBottom">Apply</button>';
        modalHtml += '<button id="closeModalBottom">Close</button>';
        modalHtml += '</div>';
        modalHtml += '<div>';
        modalHtml += '<button id="selectAllBottom">Select All</button>';
        modalHtml += '<button id="deselectAllBottom">Deselect All</button>';
        modalHtml += '</div>';
        modalHtml += '</div>';
        modalHtml += '</div>';

        var modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        document.body.appendChild(modalDiv);

        // Make the modal draggable and resizable using jQuery UI if available
        if (window.jQuery && jQuery.ui && jQuery.ui.draggable && jQuery.ui.resizable) {
            jQuery('#invoiceLineModal').draggable({ handle: 'h3' }).resizable();
        }

        // Store modalDiv and closeModal function globally for use in applyChanges
        modalDivGlobal = modalDiv;

        // Default state: All checkboxes unchecked
        document.querySelectorAll('.line-select').forEach(function (checkbox) {
            checkbox.checked = false;
        });

        // Function to update the sum displays
        function updateSums() {
            var totalSum = 0;
            document.querySelectorAll('.line-select').forEach(function (checkbox) {
                if (checkbox.checked) {
                    var idx = checkbox.getAttribute('data-index');
                    var line = lineData[idx];
                    var qty = parseFloat(line.quantity) || 0;
                    var rate = parseFloat(line.rate) || 0;
                    totalSum += qty * rate;
                }
            });
            totalSum = totalSum.toFixed(2);
            var sumTop = document.getElementById('sumTop');
            var sumBottom = document.getElementById('sumBottom');
            if(sumTop) { sumTop.innerHTML = 'Total Sum: ' + totalSum; }
            if(sumBottom) { sumBottom.innerHTML = 'Total Sum: ' + totalSum; }
        }

        // Event listeners for checkboxes to highlight row and update sums
        document.querySelectorAll('.line-select').forEach(function (checkbox) {
            checkbox.addEventListener('change', function () {
                var tr = this.closest('tr');
                if (this.checked) {
                    tr.style.backgroundColor = 'lightgreen';
                } else {
                    tr.style.backgroundColor = '';
                }
                updateSums();
            });
        });

        // ✅ Event listeners for buttons
        document.getElementById('applyChanges').addEventListener('click', function () {
            applyChanges(lineData);
        });
        document.getElementById('applyChangesBottom').addEventListener('click', function () {
            applyChanges(lineData);
        });
        document.getElementById('closeModal').addEventListener('click', closeModal);
        document.getElementById('closeModalBottom').addEventListener('click', closeModal);

        document.getElementById('selectAll').addEventListener('click', function () {
            document.querySelectorAll('.line-select').forEach(function (checkbox) {
                checkbox.checked = true;
                var tr = checkbox.closest('tr');
                if(tr) { tr.style.backgroundColor = 'lightgreen'; }
            });
            updateSums();
        });
        document.getElementById('selectAllBottom').addEventListener('click', function () {
            document.querySelectorAll('.line-select').forEach(function (checkbox) {
                checkbox.checked = true;
                var tr = checkbox.closest('tr');
                if(tr) { tr.style.backgroundColor = 'lightgreen'; }
            });
            updateSums();
        });

        document.getElementById('deselectAll').addEventListener('click', function () {
            document.querySelectorAll('.line-select').forEach(function (checkbox) {
                checkbox.checked = false;
                var tr = checkbox.closest('tr');
                if(tr) { tr.style.backgroundColor = ''; }
            });
            updateSums();
        });
        document.getElementById('deselectAllBottom').addEventListener('click', function () {
            document.querySelectorAll('.line-select').forEach(function (checkbox) {
                checkbox.checked = false;
                var tr = checkbox.closest('tr');
                if(tr) { tr.style.backgroundColor = ''; }
            });
            updateSums();
        });

        function closeModal() {
            if (modalDiv && modalDiv.parentNode) {
                modalDiv.parentNode.removeChild(modalDiv);
            }
        }
        // Store the closeModal function globally so applyChanges can access it
        closeModalGlobal = closeModal;
    }

    function applyChanges(lineData) {
        var rec = currentRecord.get();
        var linesToRemove = [];

        // ✅ Collect all unchecked item lines
        for (var i = 0; i < lineData.length; i++) {
            var checkbox = document.querySelector('.line-select[data-index="' + i + '"]');
            if (!checkbox.checked) {
                linesToRemove.push(lineData[i].lineIndex);
            }
        }

        // ✅ Remove all lines in batch (faster than one-by-one removal)
        if (linesToRemove.length > 0) {
            linesToRemove.reverse().forEach(function (lineIndex) {
                rec.removeLine({ sublistId: 'item', line: lineIndex });
            });

            // ✅ Show success message
            message.create({
                title: "Invoice Updated",
                message: "Unselected items have been removed.",
                type: message.Type.CONFIRMATION
            }).show();
        }

        // ✅ Close modal after applying changes
        setTimeout(closeModalGlobal, 1000);
    }

    return {
        pageInit: pageInit,
        openInvoiceLineSelector: openInvoiceLineSelector
    };

});
