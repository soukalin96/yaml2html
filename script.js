// No sample data or auto-load functionality needed

// File input handler
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const statusDiv = document.getElementById('file-status');
    
    if (file) {
        // Show loading status
        statusDiv.innerHTML = '<div class="file-status">Loading file...</div>';
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const yamlContent = e.target.result;
                const data = jsyaml.load(yamlContent);
                
                // Show success status
                statusDiv.innerHTML = `<div class="file-status success">✓ File "${file.name}" loaded successfully</div>`;
                
                // Generate table immediately
                generateTable(data);
            } catch (error) {
                // Show error status
                statusDiv.innerHTML = `<div class="file-status error">✗ Error parsing YAML: ${error.message}</div>`;
                document.getElementById('output').innerHTML = '';
            }
        };
        reader.onerror = function() {
            statusDiv.innerHTML = '<div class="file-status error">✗ Error reading file</div>';
        };
        reader.readAsText(file);
    } else {
        statusDiv.innerHTML = '';
        document.getElementById('output').innerHTML = '';
    }
});

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

    for (const [level1Key, level1Data] of Object.entries(data)) {
        html += `<h2 class="main-title">${level1Key}</h2>`;

        if (!level1Data || typeof level1Data !== 'object') continue;

        const level2Keys = Object.keys(level1Data);
        if (level2Keys.length === 0) {
            html += '<div class="empty-state">No data available</div>';
            continue;
        }

        const level3KeysByLevel2 = {};
        for (const level2Key of level2Keys) {
            const level2Data = level1Data[level2Key];
            level3KeysByLevel2[level2Key] = level2Data && typeof level2Data === 'object'
                ? Object.keys(level2Data) : [];
        }

        const level4Keys = new Set();
        for (const level2Key of level2Keys) {
            const level2Data = level1Data[level2Key];
            for (const level3Key of Object.keys(level2Data || {})) {
                const level3Data = level2Data[level3Key];
                for (const level4Key of Object.keys(level3Data || {})) {
                    level4Keys.add(level4Key);
                }
            }
        }

        const level4Array = Array.from(level4Keys);
        if (level4Array.length === 0) {
            html += '<div class="empty-state">No structured data available</div>';
            continue;
        }

        html += '<table class="yaml-table"><thead><tr><th rowspan="2">Regression</th>';
        level2Keys.forEach(level2Key => {
            const count = level3KeysByLevel2[level2Key].length;
            if (count > 0) {
                html += `<th colspan="${count}" class="level2-header">${level2Key}</th>`;
            }
        });
        html += '</tr><tr>';
        level2Keys.forEach(level2Key => {
            level3KeysByLevel2[level2Key].forEach(level3Key => {
                html += `<th>${level3Key}</th>`;
            });
        });
        html += '</tr></thead><tbody>';

        let rowId = 0;

        level4Array.forEach(level4Key => {
            const mainRowId = `main-${rowId}`;
            html += `<tr class="expandable-row" id="${mainRowId}">`;
            html += `<td><button class="expand-btn" onclick="toggleRow('${mainRowId}')">▶</button> ${level4Key}</td>`;

            level2Keys.forEach(level2Key => {
                const level2Data = level1Data[level2Key];
                level3KeysByLevel2[level2Key].forEach(level3Key => {
                    let totalPass = 0, totalFail = 0, hasData = false;
                    const cellData = level2Data?.[level3Key]?.[level4Key];
                    for (const val of Object.values(cellData || {})) {
                        if (typeof val === 'object') {
                            if (val.pass) totalPass += val.pass;
                            if (val.fail) totalFail += val.fail;
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

            // --- Level 5 sub-rows
            const level5Keys = new Set();
            for (const level2Key of level2Keys) {
                const level2Data = level1Data[level2Key];
                for (const level3Key of Object.keys(level2Data || {})) {
                    const l3 = level2Data[level3Key];
                    if (l3?.[level4Key]) {
                        Object.keys(l3[level4Key]).forEach(k => level5Keys.add(k));
                    }
                }
            }

            const level5Array = Array.from(level5Keys);
            const filterFails = document.getElementById('filterZeroFails')?.checked;

            level5Array.forEach(level5Key => {
                let totalFails = 0;
                for (const level2Key of level2Keys) {
                    const level2Data = level1Data[level2Key];
                    for (const level3Key of Object.keys(level2Data || {})) {
                        const val = level2Data[level3Key]?.[level4Key]?.[level5Key];
                        if (val?.fail) totalFails += val.fail;
                    }
                }

                const shouldHide = filterFails && totalFails === 0;
                const subRowId = `sub-${rowId}-${level5Key.replace(/\+/g, '-')}`;
                html += `<tr class="sub-row hidden-row ${shouldHide ? 'filtered-out' : ''}" data-parent="${mainRowId}" id="${subRowId}">`;
                html += `<td><button class="expand-btn" onclick="toggleRow('${subRowId}')">▶</button> ${level5Key}</td>`;

                level2Keys.forEach(level2Key => {
                    const level2Data = level1Data[level2Key];
                    level3KeysByLevel2[level2Key].forEach(level3Key => {
                        const val = level2Data?.[level3Key]?.[level4Key]?.[level5Key];
                        html += '<td class="pass-fail-cell">';
                        if (typeof val === 'object') {
                            html += `<div class="pass-fail-display"><span class="pass-value">${val.pass ?? '-'}</span><span class="fail-value">${val.fail ?? '-'}</span></div>`;
                        } else {
                            html += '-';
                        }
                        html += '</td>';
                    });
                });

                html += '</tr>';

                html += `<tr class="md-row hidden-row ${shouldHide ? 'filtered-out' : ''}" data-parent="${subRowId}"><td>Metadata</td>`;
                level2Keys.forEach(level2Key => {
                    const level2Data = level1Data[level2Key];
                    level3KeysByLevel2[level2Key].forEach(level3Key => {
                        const val = level2Data?.[level3Key]?.[level4Key]?.[level5Key];
                        html += '<td>';
                        html += val?.MD ? `<code class="md-cell">${val.MD}</code>` : '-';
                        html += '</td>';
                    });
                });
                html += '</tr>';
            });

            rowId++;
        });

        // Total row (unchanged)
        html += '<tr class="total-row"><td><strong>Total</strong></td>';
        level2Keys.forEach(level2Key => {
            const level2Data = level1Data[level2Key];
            level3KeysByLevel2[level2Key].forEach(level3Key => {
                let totalPass = 0, totalFail = 0;
                level4Array.forEach(level4Key => {
                    const val = level2Data?.[level3Key]?.[level4Key];
                    for (const v of Object.values(val || {})) {
                        if (v?.pass) totalPass += v.pass;
                        if (v?.fail) totalFail += v.fail;
                    }
                });
                html += `<td class="pass-fail-cell"><div class="pass-fail-display"><span class="pass-value">${totalPass}</span><span class="fail-value">${totalFail}</span></div></td>`;
            });
        });
        html += '</tr>';

        html += '</tbody></table>';
    }

    output.innerHTML = html || '<div class="empty-state">No data to display</div>';
}


function toggleRow(rowId) {
    const row = document.getElementById(rowId);
    const expandBtn = row.querySelector('.expand-btn');
    const isExpanded = expandBtn.classList.contains('expanded');
    
    // Toggle the expand button
    expandBtn.classList.toggle('expanded');
    
    // Find all child rows
    const allRows = document.querySelectorAll(`tr[data-parent="${rowId}"]`);
    
    allRows.forEach(childRow => {
        if (isExpanded) {
            childRow.classList.add('hidden-row');
            // Also collapse any expanded children
            const childExpandBtn = childRow.querySelector('.expand-btn');
            if (childExpandBtn) {
                childExpandBtn.classList.remove('expanded');
                const grandChildren = document.querySelectorAll(`tr[data-parent="${childRow.id}"]`);
                grandChildren.forEach(gc => gc.classList.add('hidden-row'));
            }
        } else {
            childRow.classList.remove('hidden-row');
        }
    });
}

function formatNestedData(data, depth = 0) {
    let html = '';
    const indent = '  '.repeat(depth);
    
    if (typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'object' && value !== null) {
                html += `<div class="cell-data">${indent}${key}:</div>`;
                html += formatNestedData(value, depth + 1);
            } else {
                html += `<div class="cell-data">${indent}${key}: ${value}</div>`;
            }
        }
    } else {
        html += `<div class="cell-data">${indent}${data}</div>`;
    }
    
    return html;
}


document.getElementById('filterZeroFails')?.addEventListener('change', () => {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const yamlContent = e.target.result;
                const data = jsyaml.load(yamlContent);
                generateTable(data);
            } catch (error) {
                console.error(error);
            }
        };
        reader.readAsText(fileInput.files[0]);
    }
});


// Expand All / Collapse All Level 4 rows
document.addEventListener("DOMContentLoaded", () => {
    const expandAllBtn = document.getElementById("expandAllBtn");
    const collapseAllBtn = document.getElementById("collapseAllBtn");

    expandAllBtn?.addEventListener("click", () => {
        document.querySelectorAll(".expandable-row").forEach(row => {
            const rowId = row.id;
            const btn = row.querySelector(".expand-btn");
            if (btn && !btn.classList.contains("expanded")) {
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
});



// Auto-convert functionality removed - now file-driven only