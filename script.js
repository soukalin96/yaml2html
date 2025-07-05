// Global variable to store the parsed YAML data
let currentYamlData = null;
// Global variable to store the table state before a search attempt
let previousTableState = '';
let currentFileComments = {};


// NEW: Function to fetch the list of files and populate the dropdown
async function populateFileDropdown() {
    const fileDropdown = document.getElementById('fileDropdown');
    const statusDiv = document.getElementById('file-status');
    try {
        statusDiv.innerHTML = '<div class="file-status">Loading file list...</div>';
        const response = await fetch('https://soukalin96.bitbucket.io/db/index.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const fileList = await response.json();
        fileDropdown.innerHTML = '<option value="">Select a file...</option>'; // Clear and add default
        fileList.forEach(fileName => {
            const option = document.createElement('option');
            option.value = fileName;
            option.textContent = fileName;
            fileDropdown.appendChild(option);
        });
        statusDiv.innerHTML = '<div class="file-status success">✓ File list loaded.</div>';
    } catch (error) {
        statusDiv.innerHTML = `<div class="file-status error">✗ Error loading file list: ${error.message}</div>`;
        console.error("Error loading file list:", error);
    }
}

// NEW: Event listener for the Load Selected File button
document.getElementById('loadFileBtn').addEventListener('click', async function () {
    const fileDropdown = document.getElementById('fileDropdown');
    const selectedFileName = fileDropdown.value;
    const statusDiv = document.getElementById('file-status');
    if (!selectedFileName) {
        statusDiv.innerHTML = '<div class="file-status error">✗ Please select a file from the dropdown.</div>';
        return;
    }
    const fileUrl = `https://soukalin96.bitbucket.io/db/${selectedFileName}`;
    statusDiv.innerHTML = `<div class="file-status">Loading file "${selectedFileName}"...</div>`;
    try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const yamlContent = await response.text();
        const data = jsyaml.load(yamlContent);
        currentYamlData = data; // Store the data globally
        // Generate a unique ID for the file (e.g., using file name)
        const fileId = selectedFileName; // Using file name as ID for simplicity
        loadComments(fileId); // Load comments associated with this file
        statusDiv.innerHTML = `<div class="file-status success">✓ File "${selectedFileName}" loaded successfully</div>`;
        populateColumnSelection(data); // Populates Level 2 columns
        populateLevel3Filter(data); // Populates Level 3 filter
        generateTable(data); // Generate the table initially
        updateRowVisibility(); // Apply initial filters and ensure visibility
        updateSummaryTable();
        attachCommentBoxListeners(); // Attach listeners for comment boxes
    } catch (error) {
        statusDiv.innerHTML = `<div class="file-status error">✗ Error parsing YAML or fetching file: ${error.message}</div>`;
        document.getElementById('output').innerHTML = '';
        console.error("Error loading or parsing YAML:", error);
    }
});


// Original DOMContentLoaded listener, modified to call populateFileDropdown
document.addEventListener("DOMContentLoaded", () => {
    populateFileDropdown(); // Call this to populate the dropdown on page load
    const expandAllBtn = document.getElementById("expandAllBtn");
    const collapseAllBtn = document.getElementById("collapseAllBtn");
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const applyColumnSelectionBtn = document.getElementById('applyColumnSelectionBtn');
    const applyLevel3FilterBtn = document.getElementById('applyLevel3FilterBtn');
    const searchBtnRegressionSet = document.getElementById('searchBtnRegressionSet');
    const searchBtnRegression = document.getElementById('searchBtnRegression');
    const searchBtnMetadata = document.getElementById('searchBtnMetadata');
    expandAllBtn?.addEventListener("click", () => {
        document.querySelectorAll(".expandable-row").forEach(row => {
            const rowId = row.id;
            const btn = row.querySelector(".expand-btn");
            if (btn && !btn.classList.contains("expanded") && !row.classList.contains('filtered-out')) {
                toggleRow(rowId);
            }
        });
    });
    collapseAllBtn?.addEventListener("click", () => {
        document.querySelectorAll(".expandable-row").forEach(row => {
            const rowId = row.id;
            const btn = row.querySelector(".expand-btn");
            if (btn && btn.classList.contains("expanded")) {
                toggleRow(rowId);
            }
        });
    });
    resetFiltersBtn?.addEventListener('click', resetAllFilters);
    applyColumnSelectionBtn?.addEventListener('click', () => {
        if (currentYamlData) {
            generateTable(currentYamlData);
            updateRowVisibility();
            updateSummaryTable();
        }
    });
    applyLevel3FilterBtn?.addEventListener('click', () => {
        if (currentYamlData) {
            generateTable(currentYamlData);
            updateRowVisibility();
            updateSummaryTable();
        }
    });
    searchBtnRegressionSet?.addEventListener('click', () => performSearch('main'));
    searchBtnRegression?.addEventListener('click', () => performSearch('sub'));
    searchBtnMetadata?.addEventListener('click', () => performSearch('metadata'));
    attachTableEventListeners();
});


// Function to populate the Level 2 column selection dropdown
function populateColumnSelection(data) {
    const columnSelect = document.getElementById('columnSelect');
    columnSelect.innerHTML = ''; // Clear previous options

    const allLevel2Keys = new Set();

    if (data && typeof data === 'object') {
        for (const level1Key of Object.keys(data)) {
            const level1Data = data[level1Key];
            if (level1Data && typeof level1Data === 'object') {
                for (const level2Key of Object.keys(level1Data)) {
                    allLevel2Keys.add(level2Key);
                }
            }
        }
    }

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Columns';
    allOption.selected = true; // Select by default
    columnSelect.appendChild(allOption);

    Array.from(allLevel2Keys).sort().forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        option.selected = true; // Select all by default initially
        columnSelect.appendChild(option);
    });
}

// NEW: Function to populate the Level 3 filter dropdown
function populateLevel3Filter(data) {
    const level3FilterSelect = document.getElementById('level3FilterSelect');
    level3FilterSelect.innerHTML = ''; // Clear previous options

    const allLevel3Keys = new Set();

    if (data && typeof data === 'object') {
        for (const level1Key of Object.keys(data)) {
            const level1Data = data[level1Key];
            if (level1Data && typeof level1Data === 'object') {
                for (const level2Key of Object.keys(level1Data)) {
                    const level2Data = level1Data[level2Key];
                    if (level2Data && typeof level2Data === 'object') {
                        for (const level3Key of Object.keys(level2Data)) {
                            allLevel3Keys.add(level3Key);
                        }
                    }
                }
            }
        }
    }

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Regression Sets';
    allOption.selected = true; // Select by default
    level3FilterSelect.appendChild(allOption);

    Array.from(allLevel3Keys).sort().forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        option.selected = true; // Select all by default initially
        level3FilterSelect.appendChild(option);
    });
}


function showError(message) {
    document.getElementById('output').innerHTML = `<div class="error">${message}</div>`;
}

function generateTable(data) {
    const output = document.getElementById('output');

    if (!data || typeof data !== 'object') {
        showError('Invalid data structure');
        return;
    }

    let html = '';
    const filterFails = document.getElementById('filterZeroFails')?.checked;

    // Get selected Level 2 columns
    const columnSelect = document.getElementById('columnSelect');
    let selectedLevel2Columns = [];
    if (columnSelect) {
        const allOptionSelected = Array.from(columnSelect.options).some(option => option.value === 'all' && option.selected);
        if (allOptionSelected) {
            const allLevel2Keys = new Set();
            for (const level1Key of Object.keys(data)) {
                const level1Data = data[level1Key];
                if (level1Data && typeof level1Data === 'object') {
                    for (const level2Key of Object.keys(level1Data)) {
                        allLevel2Keys.add(level2Key);
                    }
                }
            }
            selectedLevel2Columns = Array.from(allLevel2Keys);
        } else {
            selectedLevel2Columns = Array.from(columnSelect.selectedOptions).map(option => option.value);
        }
    }

    // NEW: Get selected Level 3 filter values
    const level3FilterSelect = document.getElementById('level3FilterSelect');
    let selectedLevel3FilterValues = [];
    if (level3FilterSelect) {
        const allOptionSelected = Array.from(level3FilterSelect.options).some(option => option.value === 'all' && option.selected);
        if (allOptionSelected) {
            const allLevel3Keys = new Set();
            for (const level1Key of Object.keys(data)) {
                const level1Data = data[level1Key];
                if (level1Data && typeof level1Data === 'object') {
                    for (const level2Key of Object.keys(level1Data)) {
                        const level2Data = level1Data[level2Key];
                        if (level2Data && typeof level2Data === 'object') {
                            for (const level3Key of Object.keys(level2Data)) {
                                allLevel3Keys.add(level3Key);
                            }
                        }
                    }
                }
            }
            selectedLevel3FilterValues = Array.from(allLevel3Keys);
        } else {
            selectedLevel3FilterValues = Array.from(level3FilterSelect.selectedOptions).map(option => option.value);
        }
    }


    for (const [level1Key, level1Data] of Object.entries(data)) {
        // Wrap each level 1 section in a collapsible div
        html += `<div class="level0-collapsible-section">`;
        html += `<div class="level0-collapsible-header">`; // Removed onclick here
        html += `<button class="level0-expand-btn">▶</button>`;
        html += `<h2 class="main-title" style="margin:0; background:none; color:inherit; padding:0;">${level1Key}</h2>`;
        html += `</div>`; // Close level0-collapsible-header
        html += `<div class="level0-collapsible-content">`; // Content to be collapsed

        if (!level1Data || typeof level1Data !== 'object') {
            html += '<div class="empty-state">No data available for this section</div>';
            html += `</div></div>`; // Close level0-collapsible-content and level0-collapsible-section
            continue;
        }

        // Filter level2Keys based on selectedLevel2Columns
        const level2Keys = Object.keys(level1Data).filter(key => selectedLevel2Columns.includes(key));
        if (level2Keys.length === 0) {
            html += '<div class="empty-state">No data available for selected Level 2 columns</div>';
            html += `</div></div>`; // Close level0-collapsible-content and level0-collapsible-section
            continue;
        }

        const level3KeysByLevel2 = {};
        for (const level2Key of level2Keys) {
            const level2Data = level1Data[level2Key];
            // Filter level3Keys based on selectedLevel3FilterValues
            level3KeysByLevel2[level2Key] = level2Data && typeof level2Data === 'object'
                ? Object.keys(level2Data).filter(key => selectedLevel3FilterValues.includes(key)) : [];
        }

        // Only consider level2Keys that have at least one selected level3Key
        const filteredLevel2Keys = level2Keys.filter(level2Key => level3KeysByLevel2[level2Key].length > 0);

        const level4Keys = new Set();
        for (const level2Key of filteredLevel2Keys) {
            const level2Data = level1Data[level2Key];
            for (const level3Key of level3KeysByLevel2[level2Key]) {
                const level3Data = level2Data[level3Key];
                for (const level4Key of Object.keys(level3Data || {})) {
                    level4Keys.add(level4Key);
                }
            }
        }

        const level4Array = Array.from(level4Keys);
        if (level4Array.length === 0 && (selectedLevel2Columns.length > 0 || selectedLevel3FilterValues.length > 0)) {
            html += '<div class="empty-state">No structured data available for selected columns/filters</div>';
            html += `</div></div>`; // Close level0-collapsible-content and level0-collapsible-section
            continue;
        } else if (level4Array.length === 0) {
            html += '<div class="empty-state">No structured data available</div>';
            html += `</div></div>`; // Close level0-collapsible-content and level0-collapsible-section
            continue;
        }


        html += '<table class="yaml-table"><thead><tr><th rowspan="2" class="fixed-first-col">Regression</th>';
        filteredLevel2Keys.forEach(level2Key => {
            const count = level3KeysByLevel2[level2Key].length;
            if (count > 0) {
                html += `<th colspan="${count}" class="level2-header">${level2Key}</th>`;
            }
        });
        html += '</tr><tr>';
        filteredLevel2Keys.forEach(level2Key => {
            level3KeysByLevel2[level2Key].forEach(level3Key => {
                html += `<th class="fixed-sub-col">${level3Key}</th>`;
            });
        });
        html += '</tr></thead><tbody>';

        let rowId = 0;

        level4Array.forEach(level4Key => {
            // Calculate total fails for the Level 4 main row
            let totalFailsForMainRow = 0;
            const level5KeysForMainRow = new Set();
            for (const level2Key of filteredLevel2Keys) {
                const level2Data = level1Data[level2Key];
                for (const level3Key of level3KeysByLevel2[level2Key]) {
                    const l3 = level2Data[level3Key];
                    if (l3?.[level4Key] && typeof l3[level4Key] === 'object') {
                        Object.keys(l3[level4Key]).forEach(k => level5KeysForMainRow.add(k));
                    }
                }
            }

            level5KeysForMainRow.forEach(level5Key => {
                for (const level2Key of filteredLevel2Keys) {
                    for (const level3Key of level3KeysByLevel2[level2Key]) {
                        const val = level1Data?.[level2Key]?.[level3Key]?.[level4Key]?.[level5Key];
                        if (val && typeof val.fail === 'number') totalFailsForMainRow += val.fail;
                    }
                }
            });

            const shouldHideMainRow = filterFails && totalFailsForMainRow === 0;

            const mainRowId = `main-${rowId}`;
            html += `<tr class="expandable-row ${shouldHideMainRow ? 'filtered-out' : ''}" id="${mainRowId}">`;
            html += `<td class="fixed-first-col"><button class="expand-btn" data-row-id="${mainRowId}">▶</button> ${level4Key}</td>`; // Added data-row-id

            filteredLevel2Keys.forEach(level2Key => {
                const level2Data = level1Data[level2Key];
                level3KeysByLevel2[level2Key].forEach(level3Key => {
                    let totalPass = 0, totalFail = 0, hasData = false;
                    const cellData = level2Data?.[level3Key]?.[level4Key];
                    for (const val of Object.values(cellData || {})) {
                        if (typeof val === 'object' && val !== null) {
                            if (typeof val.pass === 'number') totalPass += val.pass;
                            if (typeof val.fail === 'number') totalFail += val.fail;
                            hasData = true;
                        }
                    }
                    html += '<td class="pass-fail-cell">';
                    html += hasData
                        ? `<div class="pass-fail-display"><span class="pass-value">${totalPass}</span><span class="fail-value">${totalFail}</span></div>`
                        : '-';
                    html += '</td>';
                });
            });
            html += '</tr>';

            const level5Keys = new Set();
            for (const level2Key of filteredLevel2Keys) {
                const level2Data = level1Data[level2Key];
                for (const level3Key of level3KeysByLevel2[level2Key]) {
                    const l3 = level2Data[level3Key];
                    if (l3?.[level4Key] && typeof l3[level4Key] === 'object') {
                        Object.keys(l3[level4Key]).forEach(k => level5Keys.add(k));
                    }
                }
            }

            const level5Array = Array.from(level5Keys);

            level5Array.forEach(level5Key => {
                let totalFails = 0;
                for (const level2Key of filteredLevel2Keys) {
                    for (const level3Key of level3KeysByLevel2[level2Key]) {
                        const val = level1Data?.[level2Key]?.[level3Key]?.[level4Key]?.[level5Key];
                        if (val && typeof val.fail === 'number') totalFails += val.fail;
                    }
                }

                const shouldHideSubRow = filterFails && totalFails === 0;
                const subRowId = `sub-${rowId}-${level5Key.replace(/[^a-zA-Z0-9-_]/g, '-')}`;
                html += `<tr class="sub-row hidden-row ${shouldHideSubRow || shouldHideMainRow ? 'filtered-out' : ''}" data-parent="${mainRowId}" id="${subRowId}">`;
                html += `<td class="fixed-first-col"><button class="expand-btn" data-row-id="${subRowId}">▶</button> ${level5Key}</td>`; // Added data-row-id

                filteredLevel2Keys.forEach(level2Key => {
                    const level2Data = level1Data[level2Key];
                    level3KeysByLevel2[level2Key].forEach(level3Key => {
                        const val = level2Data?.[level3Key]?.[level4Key]?.[level5Key];
                        html += '<td class="pass-fail-cell">';
                        if (typeof val === 'object' && val !== null) {
                            html += `<div class="pass-fail-display"><span class="pass-value">${val.pass ?? '-'}</span><span class="fail-value">${val.fail ?? '-'}</span></div>`;
                        } else {
                            html += '-';
                        }
                        html += '</td>';
                    });
                });

                html += '</tr>';

                // MD row
                html += `<tr class="md-row hidden-row ${shouldHideSubRow || shouldHideMainRow ? 'filtered-out' : ''}" data-parent="${subRowId}"><td class="fixed-first-col">Metadata</td>`;
                filteredLevel2Keys.forEach(level2Key => {
                    const level2Data = level1Data[level2Key];
                    level3KeysByLevel2[level2Key].forEach(level3Key => {
                        const val = level2Data?.[level3Key]?.[level4Key]?.[level5Key];
                        html += '<td class="fixed-md-col">';
                        if (val && val.MD) {
                            if (typeof val.MD === 'object' && val.MD !== null) {
                                html += `<code class="md-cell">${JSON.stringify(val.MD, null, 2)}</code>`;
                                // NEW: Add data attributes to uniquely identify the comment
                                const commentId = `${level1Key}-${level2Key}-${level3Key}-${level4Key}-${level5Key}`;
                                const existingComment = currentFileComments[commentId] || '';
                                html += `<textarea class="md-individual-comment-box" data-comment-id="${commentId}" placeholder="Add comment...">${existingComment}</textarea>`;
                            }
                        } else {
                            html += '-';
                        }
                        html += '</td>';
                    });
                });
                html += '</tr>';


            });

            rowId++;
        });

        html += '</tbody>'; // Close tbody here

        // Total row (now in tfoot)
        html += '<tfoot>';
        html += '<tr class="total-row"><td class="fixed-first-col-total"><strong>Total</strong></td>';
        filteredLevel2Keys.forEach(level2Key => {
            const level2Data = level1Data[level2Key];
            level3KeysByLevel2[level2Key].forEach(level3Key => {
                let totalPass = 0, totalFail = 0;
                level4Array.forEach(level4Key => {
                    const val = level2Data?.[level3Key]?.[level4Key];
                    for (const v of Object.values(val || {})) {
                        if (typeof v === 'object' && v !== null) {
                            if (typeof v.pass === 'number') totalPass += v.pass;
                            if (typeof v.fail === 'number') totalFail += v.fail;
                        }
                    }
                });
                const soverallGrandTotal = totalPass + totalFail;
                const soverallPassPercentage = soverallGrandTotal > 0 ? parseFloat(((totalPass / soverallGrandTotal) * 100).toFixed(1)) : 'N/A';
                const soverallFailPercentage = soverallGrandTotal > 0 ? parseFloat(((totalFail / soverallGrandTotal) * 100).toFixed(1)) : 'N/A';
                // html += `<td class="pass-fail-cell-total"><div class="pass-fail-display"><span class="pass-value">${totalPass}</span><span class="fail-value">${totalFail} (</span></div></td>`;
                html += `<td class="pass-fail-cell-total"><div class="pass-fail-display"><span class="pass-value">${soverallPassPercentage}%</span><span class="fail-value">${soverallFailPercentage}%</span></div></td>`;

            });
        });
        html += '</tr>';
        html += '</tfoot>'; // Close tfoot here

        html += '</table>'; // Close table here


        // NEW: Add the summary table here
        // html += generateSummaryTable(level1Data, filteredLevel2Keys, level3KeysByLevel2, level4Array);
        html += `<div class="summary-table-wrapper"></div>`;
        html += `</div></div>`; // Close level0-collapsible-content and level0-collapsible-section
    }

    output.innerHTML = html || '<div class="empty-state">No data to display</div>';
    attachTableEventListeners(); // Attach event listeners after HTML is rendered
    updateSummaryTable(); // Call it here initially
}

function toggleRow(rowId) {
    const row = document.getElementById(rowId);
    const expandBtn = row.querySelector('.expand-btn');
    const isExpanded = expandBtn.classList.contains('expanded');

    expandBtn.classList.toggle('expanded');

    const allRows = document.querySelectorAll(`tr[data-parent="${rowId}"]`);
    allRows.forEach(childRow => {
        // Only toggle visibility if the child row is not already hidden by a filter
        const isFilteredOut = childRow.classList.contains('filtered-out'); // Check only for 'filtered-out' class
        const isCurrentlyHiddenByDisplay = childRow.style.display === 'none'; // Check if display:none is applied

        if (isExpanded) {
            childRow.classList.add('hidden-row');
            const childExpandBtn = childRow.querySelector('.expand-btn');
            if (childExpandBtn) {
                childExpandBtn.classList.remove('expanded');
                const grandChildren = document.querySelectorAll(`tr[data-parent="${childRow.id}"]`);
                grandChildren.forEach(gc => gc.classList.add('hidden-row'));
            }
        } else {
            // If not expanded, show the row unless it's filtered out by the 'filtered-out' class
            // or if it was explicitly hidden by a search filter (display:none)
            if (!isFilteredOut && isCurrentlyHiddenByDisplay) { // Changed condition to check if it was hidden by display:none
                childRow.style.display = ''; // Show the row
                childRow.classList.remove('hidden-row'); // Ensure hidden-row class is removed
            } else if (!isFilteredOut) { // If not filtered out and not hidden by display:none, just remove hidden-row
                childRow.classList.remove('hidden-row');
            }
        }
    });
}

// New function to toggle the visibility of the level 0 collapsible content
function toggleLevel0Collapse(headerElement) {
    const expandBtn = headerElement.querySelector('.level0-expand-btn');
    const content = headerElement.nextElementSibling; // The content div is the next sibling

    if (content && expandBtn) {
        expandBtn.classList.toggle('expanded');
        content.classList.toggle('hidden');
    }
}

// Function to attach event listeners to dynamically created table elements
function attachTableEventListeners() {
    // Attach listeners for main and sub-row expand buttons
    document.querySelectorAll('.expand-btn').forEach(button => {
        // Remove existing listener to prevent duplicates
        button.removeEventListener('click', handleExpandButtonClick);
        // Add new listener
        button.addEventListener('click', handleExpandButtonClick);
    });

    // Attach listeners for level 0 collapsible headers
    document.querySelectorAll('.level0-collapsible-header').forEach(header => {
        // Remove existing listener to prevent duplicates
        header.removeEventListener('click', handleLevel0HeaderClick);
        // Add new listener
        header.addEventListener('click', handleLevel0HeaderClick);
    });
}

// Event handler for expand buttons (main and sub-rows)
function handleExpandButtonClick(event) {
    const rowId = event.currentTarget.dataset.rowId; // Get the row ID from data-row-id attribute
    if (rowId) {
        toggleRow(rowId);
    }
}

// Event handler for level 0 collapsible headers
function handleLevel0HeaderClick(event) {
    toggleLevel0Collapse(event.currentTarget);
}


// New function to update row visibility based on all filters
function updateRowVisibility() {
    const mainSearchFilter = document.getElementById('searchInput').value;
    const subRowSearchFilter = document.getElementById('searchSubRowInput').value;
    const metadataSearchFilter = document.getElementById('searchMetadataInput').value;
    const filterZeroFails = document.getElementById('filterZeroFails')?.checked;

    let mainRegex, subRowRegex, metadataRegex;

    try {
        mainRegex = mainSearchFilter ? new RegExp(mainSearchFilter, 'i') : null;
        subRowRegex = subRowSearchFilter ? new RegExp(subRowSearchFilter, 'i') : null;
        metadataRegex = metadataSearchFilter ? new RegExp(metadataSearchFilter, 'i') : null;
    } catch (e) {
        alert("Invalid regular expression: " + e.message);
        return false; // Indicate that an error occurred
    }

    let matchFound = false;

    // Step 1: Filter MD rows
    const mdRows = document.querySelectorAll('.md-row');
    mdRows.forEach(mdRow => {
        const mdCells = mdRow.querySelectorAll('.md-cell');
        let isVisibleByMetadataSearch = false;
        if (!metadataRegex) { // If no regex is provided, it's always visible by this filter
            isVisibleByMetadataSearch = true;
        } else {
            mdCells.forEach(cell => {
                // Skip cells that contain only "-"
                if (cell.textContent.trim() === '-') {
                    return; // Equivalent to continue in forEach
                }
                if (metadataRegex.test(cell.textContent)) {
                    isVisibleByMetadataSearch = true;
                }
            });
        }

        const isFilteredOutByFails = mdRow.classList.contains('filtered-out');

        if (isVisibleByMetadataSearch && !isFilteredOutByFails) {
            mdRow.style.display = '';
        } else {
            mdRow.style.display = 'none';
        }
    });

    // Step 2: Filter Sub-rows based on their own search and visible MD rows
    const subRows = document.querySelectorAll('.sub-row');
    subRows.forEach(subRow => {
        const subRowName = subRow.querySelector('.fixed-first-col').textContent;
        let isVisibleBySubRowSearch = false;
        if (!subRowRegex) {
            isVisibleBySubRowSearch = true;
        } else {
            isVisibleBySubRowSearch = subRowRegex.test(subRowName);
        }

        const isFilteredOutByFails = subRow.classList.contains('filtered-out');

        const mdRow = document.querySelector(`tr[data-parent="${subRow.id}"]`);
        const isMdRowVisible = mdRow && mdRow.style.display !== 'none';
        const isMdFilterEmpty = !metadataRegex;

        if (isVisibleBySubRowSearch && !isFilteredOutByFails && (isMdRowVisible || isMdFilterEmpty)) {
            subRow.style.display = '';
        } else {
            subRow.style.display = 'none';
            const expandBtn = subRow.querySelector('.expand-btn');
            if (expandBtn && expandBtn.classList.contains('expanded')) {
                toggleRow(subRow.id); // Collapse if hidden
            }
        }
    });

    // Step 3: Filter Main rows based on their own search and visible Sub-rows
    const mainRows = document.querySelectorAll('.expandable-row');
    mainRows.forEach(mainRow => {
        const mainRegressionName = mainRow.querySelector('.fixed-first-col').textContent;
        let isVisibleByMainSearch = false;
        if (!mainRegex) {
            isVisibleByMainSearch = true;
        } else {
            isVisibleByMainSearch = mainRegex.test(mainRegressionName);
        }

        const isFilteredOutByFails = mainRow.classList.contains('filtered-out');

        const hasVisibleChildren = Array.from(document.querySelectorAll(`tr[data-parent="${mainRow.id}"]`))
            .some(childRow => childRow.style.display !== 'none');

        if (isVisibleByMainSearch && !isFilteredOutByFails && hasVisibleChildren) {
            mainRow.style.display = '';
            matchFound = true; // At least one main row is visible
        } else {
            mainRow.style.display = 'none';
            const expandBtn = mainRow.querySelector('.expand-btn');
            if (expandBtn && expandBtn.classList.contains('expanded')) {
                toggleRow(mainRow.id); // Collapse if hidden
            }
        }
    });

    // Step 4: Update visibility of Level 0 collapsible sections
    const level0Sections = document.querySelectorAll('.level0-collapsible-section');
    level0Sections.forEach(section => {
        const content = section.querySelector('.level0-collapsible-content');
        const tablesInContent = content.querySelectorAll('table.yaml-table');
        let anyTableVisible = false;

        tablesInContent.forEach(table => {
            // Check for visible rows in the main table
            const visibleRowsMainTable = table.querySelectorAll('tr:not(.filtered-out):not([style*="display: none"])');
            if (visibleRowsMainTable.length > 0) {
                anyTableVisible = true;
            }
            // Check for visible rows in the summary table (if it exists within the same content)
            // This assumes the summary table is also a .yaml-table
            const summaryTable = section.querySelector('.yaml-table:last-of-type'); // Assuming summary is the last table
            if (summaryTable) {
                const visibleRowsSummaryTable = summaryTable.querySelectorAll('tr:not(.filtered-out):not([style*="display: none"])');
                if (visibleRowsSummaryTable.length > 0) {
                    anyTableVisible = true;
                }
            }
        });

        if (anyTableVisible) {
            section.style.display = ''; // Show the entire level 0 section
        } else {
            section.style.display = 'none'; // Hide the entire level 0 section
        }
    });


    return matchFound;
}

function updateSummaryTable() {
    const outputDiv = document.getElementById('output');
    const level0Sections = outputDiv.querySelectorAll('.level0-collapsible-section');

    level0Sections.forEach(section => {
        const level1KeyElement = section.querySelector('.main-title');
        if (!level1KeyElement) return; // Skip if main-title not found (e.g., empty section)
        const level1Key = level1KeyElement.textContent;
        const level1Data = currentYamlData[level1Key];

        // Find the existing summary table wrapper for this section
        let summaryTableWrapper = section.querySelector('.summary-table-wrapper');

        // If the wrapper doesn't exist (shouldn't happen if generateTable is correct, but good for robustness)
        if (!summaryTableWrapper) {
            summaryTableWrapper = document.createElement('div');
            summaryTableWrapper.classList.add('summary-table-wrapper');
            // Append it to the level0-collapsible-content, assuming it's the last child
            section.querySelector('.level0-collapsible-content').appendChild(summaryTableWrapper);
        }

        // Clear previous content before adding new
        summaryTableWrapper.innerHTML = '';

        let visibleLevel4Keys = new Set();
        // Iterate through the main table within this section to find visible main rows
        // Ensure we only look within the current section's main table
        const mainTable = section.querySelector('table.yaml-table');
        if (mainTable) {
            mainTable.querySelectorAll('.expandable-row').forEach(mainRow => {
                // Check if the row is explicitly hidden by display: none or filtered-out class
                if (mainRow.style.display !== 'none' && !mainRow.classList.contains('filtered-out')) {
                    // Extract the regression name (level4Key) from the first cell
                    // Use a more robust way to get the text, removing the expand button's text
                    const firstCellText = mainRow.querySelector('.fixed-first-col').textContent;
                    const regressionName = firstCellText.replace(/▶\s*/, '').trim(); // Remove the play button character and leading/trailing spaces
                    visibleLevel4Keys.add(regressionName);
                }
            });
        }

        // If no visible regressions, show an empty state or hide the summary section
        if (visibleLevel4Keys.size === 0) {
            summaryTableWrapper.innerHTML = '<div class="empty-state" style="margin-top: 20px;">No regressions visible for summary.</div>';
            return; // Exit for this section
        }

        // Re-calculate filteredLevel2Keys and level3KeysByLevel2 based on current selections
        // This part is crucial to ensure the summary calculation uses the correct columns/filters
        const columnSelect = document.getElementById('columnSelect');
        let selectedLevel2Columns = [];
        if (columnSelect) {
            const allOptionSelected = Array.from(columnSelect.options).some(option => option.value === 'all' && option.selected);
            if (allOptionSelected) {
                const allLevel2Keys = new Set();
                // Re-derive all possible level2 keys from currentYamlData
                if (currentYamlData && typeof currentYamlData === 'object') {
                    for (const l1Key of Object.keys(currentYamlData)) {
                        const l1Data = currentYamlData[l1Key];
                        if (l1Data && typeof l1Data === 'object') {
                            for (const l2Key of Object.keys(l1Data)) {
                                allLevel2Keys.add(l2Key);
                            }
                        }
                    }
                }
                selectedLevel2Columns = Array.from(allLevel2Keys);
            } else {
                selectedLevel2Columns = Array.from(columnSelect.selectedOptions).map(option => option.value);
            }
        }

        const level3FilterSelect = document.getElementById('level3FilterSelect');
        let selectedLevel3FilterValues = [];
        if (level3FilterSelect) {
            const allOptionSelected = Array.from(level3FilterSelect.options).some(option => option.value === 'all' && option.selected);
            if (allOptionSelected) {
                const allLevel3Keys = new Set();
                // Re-derive all possible level3 keys from currentYamlData
                if (currentYamlData && typeof currentYamlData === 'object') {
                    for (const l1Key of Object.keys(currentYamlData)) {
                        const l1Data = currentYamlData[l1Key];
                        if (l1Data && typeof l1Data === 'object') {
                            for (const l2Key of Object.keys(l1Data)) {
                                const l2Data = l1Data[l2Key];
                                if (l2Data && typeof l2Data === 'object') {
                                    for (const l3Key of Object.keys(l2Data)) {
                                        allLevel3Keys.add(l3Key);
                                    }
                                }
                            }
                        }
                    }
                }
                selectedLevel3FilterValues = Array.from(allLevel3Keys);
            } else {
                selectedLevel3FilterValues = Array.from(level3FilterSelect.selectedOptions).map(option => option.value);
            }
        }

        const filteredLevel2Keys = Object.keys(level1Data).filter(key => selectedLevel2Columns.includes(key));
        const level3KeysByLevel2 = {};
        for (const level2Key of filteredLevel2Keys) {
            const level2Data = level1Data[level2Key];
            level3KeysByLevel2[level2Key] = level2Data && typeof level2Data === 'object'
                ? Object.keys(level2Data).filter(key => selectedLevel3FilterValues.includes(key)) : [];
        }


        let newSummaryHtml = `<div class="main-title" style="margin-top: 30px;">Total Pass/Fail Summary by Regression</div>`;
        newSummaryHtml += `<table class="yaml-table"><thead><tr>`;
        newSummaryHtml += `<th>Regression</th>`;
        newSummaryHtml += `<th>Total Pass</th>`;
        newSummaryHtml += `<th>Total Fail</th>`;
        newSummaryHtml += `<th>Pass %</th>`;
        newSummaryHtml += `<th>Fail %</th>`;
        // ADD THIS LINE for the new header
        newSummaryHtml += `<th>Comments</th>`;
        newSummaryHtml += `</tr></thead><tbody>`;

        let overallTotalPass = 0;
        let overallTotalFail = 0;

        Array.from(visibleLevel4Keys).sort().forEach(level4Key => { // Sort for consistent order
            let totalPassForRegression = 0;
            let totalFailForRegression = 0;

            // Ensure level1Data[level2Key] exists before accessing
            for (const level2Key of filteredLevel2Keys) {
                const level2Data = level1Data[level2Key];
                if (level2Data) { // Check if level2Data exists
                    for (const level3Key of level3KeysByLevel2[level2Key]) {
                        const cellData = level2Data?.[level3Key]?.[level4Key];
                        if (cellData) { // Check if cellData exists
                            for (const val of Object.values(cellData)) {
                                if (typeof val === 'object' && val !== null) {
                                    if (typeof val.pass === 'number') totalPassForRegression += val.pass;
                                    if (typeof val.fail === 'number') totalFailForRegression += val.fail;
                                }
                            }
                        }
                    }
                }
            }

            overallTotalPass += totalPassForRegression;
            overallTotalFail += totalFailForRegression;

            const overallTotal = totalPassForRegression + totalFailForRegression;
            const passPercentage = overallTotal > 0 ? parseFloat(((totalPassForRegression / overallTotal) * 100).toFixed(2)) : 'N/A';
            const failPercentage = overallTotal > 0 ? parseFloat(((totalFailForRegression / overallTotal) * 100).toFixed(2)) : 'N/A';

            let passPercentageStyle = '';
            if (passPercentage === 100) {
                passPercentageStyle = `style="color: var(--pass-color); font-weight: bold;"`;
            }

            let failPercentageStyle = '';
            if (failPercentage > 0) {
                failPercentageStyle = `style="color: var(--fail-color); font-weight: bold;"`;
            }

            let regressionCellStyle = '';
            if (passPercentage === 100) {
                regressionCellStyle = `style="background-color: var(--pass-color); color: white;"`;
            } else if (failPercentage > 0) {
                regressionCellStyle = `style="background-color: var(--fail-color); color: white;"`;
            }


            newSummaryHtml += `<tr>`;
            newSummaryHtml += `<td class="fixed-first-col" ${regressionCellStyle}>${level4Key}</td>`;
            newSummaryHtml += `<td class="pass-fail-cell">${totalPassForRegression}</td>`;
            newSummaryHtml += `<td class="pass-fail-cell">${totalFailForRegression}</td>`;
            newSummaryHtml += `<td class="pass-fail-cell" ${passPercentageStyle}>${passPercentage !== 'N/A' ? `${passPercentage}%` : 'N/A'}</td>`;
            newSummaryHtml += `<td class="pass-fail-cell" ${failPercentageStyle}>${failPercentage !== 'N/A' ? `${failPercentage}%` : 'N/A'}</td>`;
            newSummaryHtml += `<td class="cell_summary-comment-box">`;
            // NEW: Add data attribute to uniquely identify the comment
            const summaryCommentId = `summary-${level1Key}-${level4Key}`; // Ensure uniqueness across level1 sections
            const existingSummaryComment = currentFileComments[summaryCommentId] || '';
            newSummaryHtml += `<textarea class="summary-comment-box" data-comment-id="${summaryCommentId}" placeholder="Add comment...">${existingSummaryComment}</textarea></td>`;
            newSummaryHtml += `</tr>`;
        });

        newSummaryHtml += `</tbody>`; // Close tbody here

        // Add the total row for the summary table
        const overallGrandTotal = overallTotalPass + overallTotalFail;
        const overallPassPercentage = overallGrandTotal > 0 ? parseFloat(((overallTotalPass / overallGrandTotal) * 100).toFixed(2)) : 'N/A';
        const overallFailPercentage = overallGrandTotal > 0 ? parseFloat(((overallTotalFail / overallGrandTotal) * 100).toFixed(2)) : 'N/A';

        let overallPassPercentageStyle = '';
        if (overallPassPercentage === 100) {
            overallPassPercentageStyle = `style="color: var(--pass-color); font-weight: bold;"`;
        }

        let overallFailPercentageStyle = '';
        if (overallFailPercentage > 0) {
            overallFailPercentageStyle = `style="color: var(--fail-color); font-weight: bold;"`;
        }

        newSummaryHtml += `<tfoot>`;
        newSummaryHtml += `<tr class="total-row">`;
        newSummaryHtml += `<td class="fixed-first-col-total"><strong>Overall Total</strong></td>`;
        newSummaryHtml += `<td class="pass-fail-cell-total">${overallTotalPass}</td>`;
        newSummaryHtml += `<td class="pass-fail-cell-total">${overallTotalFail}</td>`;
        newSummaryHtml += `<td class="pass-fail-cell-total" ${overallPassPercentageStyle}>${overallPassPercentage !== 'N/A' ? `${overallPassPercentage}%` : 'N/A'}</td>`;
        newSummaryHtml += `<td class="pass-fail-cell-total" ${overallFailPercentageStyle}>${overallFailPercentage !== 'N/A' ? `${overallFailPercentage}%` : 'N/A'}</td>`;
        // ADD AN EMPTY CELL FOR THE TOTAL ROW IN THE COMMENTS COLUMN
        newSummaryHtml += `<td class="pass-fail-cell-total"></td>`;
        newSummaryHtml += `</tr>`;
        newSummaryHtml += `</tfoot>`; // Close tfoot here

        newSummaryHtml += `</table>`;
        summaryTableWrapper.innerHTML = newSummaryHtml; // Update the content
    });
}

// New function to handle search for different levels
function performSearch(filterType) {
    if (!currentYamlData) {
        alert("Please load a YAML file first.");
        return;
    }
    // No need to save previousTableState if we re-generate and then filter
    // previousTableState = document.getElementById('output').innerHTML; // Remove this line
    // Re-generate the table to reset all display states before applying new filters
    generateTable(currentYamlData);
    // Now apply all filters and update visibility
    const matchFound = updateRowVisibility();
    // NEW: Update the summary table after visibility has been applied
    updateSummaryTable();
    attachCommentBoxListeners(); // NEW: Re-attach listeners after re-generating/updating
    // Check if any search filter is active
    const anySearchActive = document.getElementById('searchInput').value !== '' ||
        document.getElementById('searchSubRowInput').value !== '' ||
        document.getElementById('searchMetadataInput').value !== '';
    if (!matchFound && anySearchActive) {
        alert("No match found!");
        // If no match, you might want to clear the summary table or show a "No data" message
        // For now, it will just show the summary of whatever is visible (which might be nothing)
    }
}


document.getElementById('filterZeroFails')?.addEventListener('change', () => {
    performSearch('main'); // Trigger a full re-evaluation of visibility
});

// Function to reset all search filters
function resetAllFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchSubRowInput').value = '';
    document.getElementById('searchMetadataInput').value = '';
    document.getElementById('filterZeroFails').checked = false;
    const columnSelect = document.getElementById('columnSelect');
    if (columnSelect) {
        Array.from(columnSelect.options).forEach(option => {
            option.selected = (option.value === 'all' || option.value !== 'all');
        });
    }
    const level3FilterSelect = document.getElementById('level3FilterSelect');
    if (level3FilterSelect) {
        Array.from(level3FilterSelect.options).forEach(option => {
            option.selected = (option.value === 'all' || option.value !== 'all');
        });
    }

    // Instead of reading from fileInput, we now check currentYamlData
    if (currentYamlData) {
        // Re-process the current data
        populateColumnSelection(currentYamlData);
        populateLevel3Filter(currentYamlData);
        generateTable(currentYamlData);
        updateRowVisibility();
        updateSummaryTable();
        attachCommentBoxListeners();
    } else {
        document.getElementById('output').innerHTML = '';
        currentYamlData = null;
        document.getElementById('columnSelect').innerHTML = '';
        document.getElementById('level3FilterSelect').innerHTML = '';
        document.querySelectorAll('.summary-table-container').forEach(container => container.innerHTML = '');
    }
    // Optionally, reset the dropdown selection
    document.getElementById('fileDropdown').value = '';
}

// NEW: Function to attach event listeners to comment boxes
function attachCommentBoxListeners() {
    document.querySelectorAll('.md-individual-comment-box, .summary-comment-box').forEach(textarea => {
        textarea.removeEventListener('input', handleCommentInput); // Prevent duplicate listeners
        textarea.addEventListener('input', handleCommentInput);
    });
}

// Modified loadComments and saveComments to use the selected file name as ID
function handleCommentInput(event) {
    const textarea = event.target;
    const commentId = textarea.dataset.commentId;
    if (commentId) {
        currentFileComments[commentId] = textarea.value;
        const fileDropdown = document.getElementById('fileDropdown');
        const selectedFileName = fileDropdown.value;
        if (selectedFileName) {
            saveComments(selectedFileName); // Use selected file name as ID
        }
    }
}


// NEW: Function to load comments from localStorage
function loadComments(fileId) {
    const storedComments = localStorage.getItem(`yaml_comments_${fileId}`);
    if (storedComments) {
        try {
            currentFileComments = JSON.parse(storedComments);
        } catch (e) {
            console.error("Error parsing stored comments:", e);
            currentFileComments = {};
        }
    } else {
        currentFileComments = {};
    }
}

// NEW: Function to save comments to localStorage
function saveComments(fileId) {
    try {
        localStorage.setItem(`yaml_comments_${fileId}`, JSON.stringify(currentFileComments));
    } catch (e) {
        console.error("Error saving comments to localStorage:", e);
    }
}


