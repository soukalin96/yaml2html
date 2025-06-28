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

    // Process each Level 1 key (header)
    let html = '';
    
    for (const [level1Key, level1Data] of Object.entries(data)) {
        html += `<h2 class="main-title">${level1Key}</h2>`;
        
        if (!level1Data || typeof level1Data !== 'object') {
            continue;
        }

        // Get all Level 2 keys (columns)
        const level2Keys = Object.keys(level1Data);
        
        if (level2Keys.length === 0) {
            html += '<div class="empty-state">No data available</div>';
            continue;
        }

        // Get all Level 3 keys (sub-columns) from all Level 2 entries
        const level3KeysByLevel2 = {};
        for (const level2Key of level2Keys) {
            const level2Data = level1Data[level2Key];
            if (level2Data && typeof level2Data === 'object') {
                level3KeysByLevel2[level2Key] = Object.keys(level2Data);
            } else {
                level3KeysByLevel2[level2Key] = [];
            }
        }

        // Get all Level 4 keys (main expandable rows)
        const level4Keys = new Set();
        for (const level2Key of level2Keys) {
            const level2Data = level1Data[level2Key];
            if (level2Data && typeof level2Data === 'object') {
                for (const level3Key of Object.keys(level2Data)) {
                    const level3Data = level2Data[level3Key];
                    if (level3Data && typeof level3Data === 'object') {
                        Object.keys(level3Data).forEach(key => level4Keys.add(key));
                    }
                }
            }
        }

        const level4Array = Array.from(level4Keys);

        if (level4Array.length === 0) {
            html += '<div class="empty-state">No structured data available</div>';
            continue;
        }

        // Calculate total columns needed
        let totalColumns = 0;
        for (const level2Key of level2Keys) {
            totalColumns += level3KeysByLevel2[level2Key].length;
        }

        // Create table
        html += '<table class="yaml-table">';
        
        // Level 2 header row (main columns)
        html += '<thead><tr><th rowspan="2">Regression</th>';
        level2Keys.forEach(level2Key => {
            const level3Count = level3KeysByLevel2[level2Key].length;
            if (level3Count > 0) {
                html += `<th colspan="${level3Count}" class="level2-header">${level2Key}</th>`;
            }
        });
        html += '</tr>';

        // Level 3 header row (sub-columns)
        html += '<tr>';
        level2Keys.forEach(level2Key => {
            level3KeysByLevel2[level2Key].forEach(level3Key => {
                html += `<th>${level3Key}</th>`;
            });
        });
        html += '</tr></thead><tbody>';

        let rowId = 0;

        // Main rows - Level 4 keys as expandable rows
        level4Array.forEach(level4Key => {
            const mainRowId = `main-${rowId}`;
            html += `<tr class="expandable-row" id="${mainRowId}">`;
            html += `<td><button class="expand-btn" onclick="toggleRow('${mainRowId}')">▶</button> ${level4Key}</td>`;
            
            // For each Level 2 column
            level2Keys.forEach(level2Key => {
                const level2Data = level1Data[level2Key];
                
                // For each Level 3 sub-column
                level3KeysByLevel2[level2Key].forEach(level3Key => {
                    html += '<td class="pass-fail-cell">';
                    
                    // Calculate total pass/fail for this Level 4 key in this column
                    let totalPass = 0;
                    let totalFail = 0;
                    let hasData = false;
                    
                    if (level2Data && level2Data[level3Key] && level2Data[level3Key][level4Key]) {
                        const level4Data = level2Data[level3Key][level4Key];
                        
                        // Sum up all pass/fail values from Level 5 (leaf nodes)
                        for (const [level5Key, level5Data] of Object.entries(level4Data)) {
                            if (typeof level5Data === 'object') {
                                if (level5Data.pass !== undefined) {
                                    totalPass += level5Data.pass;
                                    hasData = true;
                                }
                                if (level5Data.fail !== undefined) {
                                    totalFail += level5Data.fail;
                                    hasData = true;
                                }
                            }
                        }
                    }
                    
                    if (hasData) {
                        html += '<div class="pass-fail-display">';
                        html += `<span class="pass-value">${totalPass}</span>`;
                        html += `<span class="fail-value">${totalFail}</span>`;
                        html += '</div>';
                    } else {
                        html += '-';
                    }
                    
                    html += '</td>';
                });
            });
            
            html += '</tr>';

            // Get Level 5 keys for this Level 4
            const level5Keys = new Set();
            for (const level2Key of level2Keys) {
                const level2Data = level1Data[level2Key];
                if (level2Data && typeof level2Data === 'object') {
                    for (const level3Key of Object.keys(level2Data)) {
                        const level3Data = level2Data[level3Key];
                        if (level3Data && level3Data[level4Key] && typeof level3Data[level4Key] === 'object') {
                            Object.keys(level3Data[level4Key]).forEach(key => level5Keys.add(key));
                        }
                    }
                }
            }

            const level5Array = Array.from(level5Keys);

            // Sub-rows - Level 5 keys (like checkin+a, checkin+b, etc.) - Show Pass/Fail values
            level5Array.forEach(level5Key => {
                const subRowId = `sub-${rowId}-${level5Key.replace(/\+/g, '-')}`;
                html += `<tr class="sub-row hidden-row" data-parent="${mainRowId}" id="${subRowId}">`;
                html += `<td><button class="expand-btn" onclick="toggleRow('${subRowId}')">▶</button> ${level5Key}</td>`;
                
                // For each Level 2 column
                level2Keys.forEach(level2Key => {
                    const level2Data = level1Data[level2Key];
                    
                    // For each Level 3 sub-column
                    level3KeysByLevel2[level2Key].forEach(level3Key => {
                        html += '<td class="pass-fail-cell">';
                        
                        if (level2Data && level2Data[level3Key] && level2Data[level3Key][level4Key] && level2Data[level3Key][level4Key][level5Key]) {
                            const level5Data = level2Data[level3Key][level4Key][level5Key];
                            
                            if (typeof level5Data === 'object') {
                                // Show Pass/Fail values directly
                                const passValue = level5Data.pass !== undefined ? level5Data.pass : '-';
                                const failValue = level5Data.fail !== undefined ? level5Data.fail : '-';
                                
                                html += '<div class="pass-fail-display">';
                                html += `<span class="pass-value">${passValue}</span>`;
                                html += `<span class="fail-value">${failValue}</span>`;
                                html += '</div>';
                            } else {
                                html += `<span class="md-cell">Data available</span>`;
                            }
                        } else {
                            html += '-';
                        }
                        
                        html += '</td>';
                    });
                });
                
                html += '</tr>';

                // Metadata row - only show MD values when sub-row is expanded
                html += `<tr class="md-row hidden-row" data-parent="${subRowId}">`;
                html += `<td>Metadata</td>`;
                
                // For each Level 2 column
                level2Keys.forEach(level2Key => {
                    const level2Data = level1Data[level2Key];
                    
                    // For each Level 3 sub-column
                    level3KeysByLevel2[level2Key].forEach(level3Key => {
                        html += '<td>';
                        
                        if (level2Data && level2Data[level3Key] && level2Data[level3Key][level4Key] && level2Data[level3Key][level4Key][level5Key]) {
                            const level5Data = level2Data[level3Key][level4Key][level5Key];
                            
                            if (typeof level5Data === 'object' && level5Data.MD !== undefined) {
                                html += `<code class="md-cell">${level5Data.MD}</code>`;
                            } else {
                                html += '-';
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

        // Add Total row at the end
        html += '<tr class="total-row">';
        html += '<td><strong>Total</strong></td>';
        
        // For each Level 2 column
        level2Keys.forEach(level2Key => {
            const level2Data = level1Data[level2Key];
            
            // For each Level 3 sub-column
            level3KeysByLevel2[level2Key].forEach(level3Key => {
                html += '<td class="pass-fail-cell">';
                
                // Calculate grand total pass/fail for this column across all Level 4 keys
                let grandTotalPass = 0;
                let grandTotalFail = 0;
                let hasData = false;
                
                level4Array.forEach(level4Key => {
                    if (level2Data && level2Data[level3Key] && level2Data[level3Key][level4Key]) {
                        const level4Data = level2Data[level3Key][level4Key];
                        
                        // Sum up all pass/fail values from Level 5 (leaf nodes)
                        for (const [level5Key, level5Data] of Object.entries(level4Data)) {
                            if (typeof level5Data === 'object') {
                                if (level5Data.pass !== undefined) {
                                    grandTotalPass += level5Data.pass;
                                    hasData = true;
                                }
                                if (level5Data.fail !== undefined) {
                                    grandTotalFail += level5Data.fail;
                                    hasData = true;
                                }
                            }
                        }
                    }
                });
                
                if (hasData) {
                    html += '<div class="pass-fail-display">';
                    html += `<span class="pass-value">${grandTotalPass}</span>`;
                    html += `<span class="fail-value">${grandTotalFail}</span>`;
                    html += '</div>';
                } else {
                    html += '-';
                }
                
                html += '</td>';
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

// Auto-convert functionality removed - now file-driven only