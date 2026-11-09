document.addEventListener('DOMContentLoaded', () => {
    const escapeHtml = (value) => String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    const promptInput    = document.getElementById('promptInput');
    const searchBtn      = document.getElementById('searchBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const outputSection  = document.getElementById('outputSection');
    const answerText     = document.getElementById('answerText');
    const sqlText        = document.getElementById('sqlText');
    const sqlCard        = document.getElementById('sqlCard');
    const chartCreatedCard = document.getElementById('chartCreatedCard');

    const tableContainer = document.getElementById('tableContainer');
    const REQUEST_TIMEOUT_MS = 60_000;

    async function fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            return await fetch(url, { ...options, signal: controller.signal });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    function showToast(message) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <div class="toast-icon">✓</div>
            <div>${message}</div>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    searchBtn.addEventListener('click', async () => {
        const question = promptInput.value.trim();
        if (!question) return;

        // Reset UI to loading state
        searchBtn.disabled = true;
        loadingIndicator.style.display = 'block';
        outputSection.style.display = 'none';
        chartCreatedCard.style.display = 'none';
        sqlCard.style.display = 'block';
        tableContainer.innerHTML = ''; // clear previous table

        try {
            const response = await fetchWithTimeout('/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });

            if (!response.ok) throw new Error(`Request failed (${response.status})`);

            const data = await response.json();

            if (data.error) {
                // ── Error state ──────────────────────────────────────────────
                answerText.textContent = `System Error:\n\n${data.error}`;
                answerText.style.color = 'red';
                sqlCard.style.display = 'none';
                chartCreatedCard.style.display = 'none';

            } else if (data.is_chart) {
                answerText.style.color = '';
                // ── Chart routed to Dashboard ────────────────────────────────
                // Show a minimal "answer" so the answer card isn't empty
                answerText.innerText = data.answer;
                // Hide SQL card — not relevant for chart-only flow
                sqlCard.style.display = 'none';
                // Show the animated "Chart created on Dashboard" card
                chartCreatedCard.style.display = 'flex';
                showToast('Chart generated successfully.');

            } else {
                answerText.style.color = '';
                // ── Normal data query ────────────────────────────────────────
                answerText.innerText = data.answer;
                sqlText.innerText = data.sql_query;
                sqlCard.style.display = 'block';
                chartCreatedCard.style.display = 'none';

                // Render HTML Table if raw_result is provided
                if (data.raw_result && data.raw_result !== 'no results found') {
                    const rows = data.raw_result.trim().split('\n');
                    if (rows.length > 0) {
                        createSmartTable(data.raw_result, tableContainer);
                        showToast('Table generated successfully.');
                    }
                }
            }

            outputSection.style.display = 'flex';

            // Async follow-up question suggestions
            const followupContainer = document.getElementById('followupContainer');
            if (followupContainer) followupContainer.innerHTML = '';
            if (!data.error) {
                fetchFollowups(question, data.answer || data.raw_result || '', followupContainer);
            }

        } catch (error) {
            answerText.innerText = 'Failed to connect to the server.';
            sqlCard.style.display = 'none';
            outputSection.style.display = 'flex';
        } finally {
            searchBtn.disabled = false;
            loadingIndicator.style.display = 'none';
        }
    });

    // ── Starter Prompt Chips ──────────────────────────────────────────────
    document.querySelectorAll('.starter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.getAttribute('data-prompt');
            if (prompt) {
                promptInput.value = prompt;
                searchBtn.click();
            }
        });
    });

    // ── Copy Buttons (SQL & Answer) ───────────────────────────────────────
    const copySqlBtn = document.getElementById('copySqlBtn');
    if (copySqlBtn) {
        copySqlBtn.addEventListener('click', () => {
            const sql = sqlText.textContent;
            if (sql) {
                navigator.clipboard.writeText(sql).then(() => {
                    showToast('SQL query copied to clipboard!');
                }).catch(() => {
                    showToast('Copied SQL to clipboard');
                });
            }
        });
    }

    const copyAnswerBtn = document.getElementById('copyAnswerBtn');
    if (copyAnswerBtn) {
        copyAnswerBtn.addEventListener('click', () => {
            const answer = answerText.textContent;
            if (answer) {
                navigator.clipboard.writeText(answer).then(() => {
                    showToast('Answer copied to clipboard!');
                }).catch(() => {
                    showToast('Copied answer to clipboard');
                });
            }
        });
    }

    // Allow Enter to submit (Shift+Enter for new line)
    promptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            searchBtn.click();
        }
    });

    // ── Schema Sidebar Logic ───────────────────────────────────────────────
    const schemaList = document.getElementById('schemaList');
    const schemaSearchInput = document.getElementById('schemaSearchInput');
    let allSchemaData = [];

    async function loadSchema() {
        try {
            const res = await fetchWithTimeout('/schema');
            if (!res.ok) throw new Error(`Schema request failed (${res.status})`);
            allSchemaData = await res.json();
            
            if (allSchemaData.error) {
                schemaList.innerHTML = `<div style="color:red; padding: 1rem;">Failed to load schema: ${allSchemaData.error}</div>`;
                return;
            }
            renderSchema(allSchemaData);
        } catch (e) {
            schemaList.innerHTML = `<div style="color:red; padding: 1rem;">Failed to fetch schema.</div>`;
        }
    }

    function renderSchema(data) {
        if (!schemaList) return;
        schemaList.innerHTML = '';
        const countBadge = document.getElementById('schemaCountBadge');
        if (countBadge) {
            countBadge.textContent = `${data.length} Tables`;
        }

        if (data.length === 0) {
            schemaList.innerHTML = `<div style="padding: 1rem; color: var(--text-muted);">No tables found.</div>`;
            return;
        }

        data.forEach(tableObj => {
            const item = document.createElement('div');
            item.className = 'schema-table-item';

            // Table Header
            const header = document.createElement('div');
            header.className = 'schema-table-header';
            header.innerHTML = `
                <svg class="sketch-icon blue" width="18" height="18" viewBox="0 0 24 24" style="margin-right:10px;">
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                </svg>
                <div class="table-name">${escapeHtml(tableObj.table)}</div>
                <div class="table-toggle" style="font-size:0.75rem; color:var(--text-muted); font-family:'JetBrains Mono';">▾</div>
            `;
            header.addEventListener('click', () => {
                item.classList.toggle('expanded');
            });

            // Columns Container
            const colsDiv = document.createElement('div');
            colsDiv.className = 'schema-columns';

            tableObj.columns.forEach(col => {
                const colItem = document.createElement('div');
                colItem.className = 'schema-col-item';
                
                let badges = '';
                if (col.primary_key) badges += '<span class="pk-badge" title="Primary Key">PK</span>';
                if (col.foreign_key) badges += '<span class="fk-badge" title="Foreign Key">FK</span>';

                colItem.innerHTML = `
                    <div class="col-name" style="cursor:copy;" title="Click to insert into prompt">${escapeHtml(col.name)} ${badges}</div>
                    <div class="col-type">${escapeHtml(col.type.split('(')[0].toUpperCase())}</div>
                `;
                colItem.querySelector('.col-name').addEventListener('click', (e) => {
                    promptInput.value += (promptInput.value && !promptInput.value.endsWith(' ') ? ' ' : '') + col.name;
                    promptInput.focus();
                });
                colsDiv.appendChild(colItem);
            });

            header.querySelector('.table-name').style.cursor = 'copy';
            header.querySelector('.table-name').title = 'Click to insert into prompt';
            header.querySelector('.table-name').addEventListener('click', (e) => {
                e.stopPropagation(); // prevent toggle
                promptInput.value += (promptInput.value && !promptInput.value.endsWith(' ') ? ' ' : '') + tableObj.table;
                promptInput.focus();
            });

            item.appendChild(header);
            item.appendChild(colsDiv);
            schemaList.appendChild(item);
        });
    }

    if (schemaSearchInput) {
        schemaSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (!query) {
                renderSchema(allSchemaData);
                return;
            }

            const filtered = allSchemaData.map(tableObj => {
                // If table matches, show all columns
                if (tableObj.table.toLowerCase().includes(query)) {
                    return tableObj;
                }
                // Otherwise, filter columns
                const matchingCols = tableObj.columns.filter(col => col.name.toLowerCase().includes(query));
                if (matchingCols.length > 0) {
                    return { ...tableObj, columns: matchingCols };
                }
                return null;
            }).filter(Boolean);
            
            renderSchema(filtered);
            
            // Auto-expand if searching
            if (query && schemaList) {
                const items = schemaList.querySelectorAll('.schema-table-item');
                items.forEach(item => item.classList.add('expanded'));
            }
        });
    }

    // Initialize Schema
    if (schemaList) {
        loadSchema();
    }

    // ── Follow-up Suggestions ──────────────────────────────────────────────
    async function fetchFollowups(question, answer, container) {
        try {
            const res = await fetchWithTimeout('/followup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, answer: answer.substring(0, 500) })
            });
            const data = await res.json();
            if (data.questions && data.questions.length > 0) {
                container.innerHTML = '';
                const wrapper = document.createElement('div');
                wrapper.className = 'followup-container';
                const label = document.createElement('div');
                label.className = 'followup-label';
                label.textContent = '💡 Ask a follow-up:';
                wrapper.appendChild(label);
                data.questions.forEach(q => {
                    const chip = document.createElement('button');
                    chip.className = 'followup-chip';
                    chip.textContent = q;
                    chip.addEventListener('click', () => {
                        promptInput.value = q;
                        searchBtn.click();
                    });
                    wrapper.appendChild(chip);
                });
                container.appendChild(wrapper);
            }
        } catch(e) {
            // Silently fail — follow-ups are non-critical
        }
    }

    // Auto-run if ?q= query param is provided in URL
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q');
    if (initialQuery) {
        promptInput.value = initialQuery;
        searchBtn.click();
    }
});
