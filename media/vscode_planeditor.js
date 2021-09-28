// @ts-check

// Script run within the webview itself.
(function () {

	// Get a reference to the VS Code webview api.
	// We use this API to post messages back to our extension.

	// @ts-ignore
	const vscode = acquireVsCodeApi();

	let timeFormat = 'time';

	const tableContainer = /** @type {HTMLTableElement} */ (document.querySelector('.stepTable'));
	// tableContainer.style.width = '100%';
	// tableContainer.setAttribute('border', '1');

	function addTableFoot(json, tableContainer) {

		const tfoot = document.createElement('tfoot');
		const tf = document.createElement('tr');

		let td = document.createElement('td');
		td.setAttribute('colspan', '2');
		td.innerText = '';
		tf.appendChild(td);

		td = document.createElement('td');
		td.className = 'planTime';
		td.setAttribute('data-field', 'planTime');
		td.innerText = toTime(json.planTime);
		tf.appendChild(td);

		td = document.createElement('td');
		td.className = 'realTime';
		td.setAttribute('data-field', 'realTime');
		td.innerText = toTime(json.realTime);
		tf.appendChild(td);

		td = document.createElement('td');
		td.setAttribute('colspan', '3');
		td.innerText = '';
		tf.appendChild(td);

		tfoot.appendChild(tf);
		tableContainer.appendChild(tfoot);
	}

	function addTableHead(tableContainer) {

		const addTh = (
			/** @type {HTMLTableRowElement} */ owner,
			/** @type {string} */ elementType,
			/** @type {string} */ value,
			/** @type {string} */ className
		) => {
			let el = document.createElement(elementType);
			el.innerText = value;
			el.className = className;
			owner.appendChild(el);
		}

		const thead = document.createElement('thead');
		const tr = document.createElement('tr');

		addTh(tr, 'th', '#', 'num-h');
		addTh(tr, 'th', 'Step', 'step-h');
		addTh(tr, 'th', 'Plan time', 'planTime-h');
		addTh(tr, 'th', 'Real time', 'realTime-h');
		addTh(tr, 'th', 'Done', 'done-h');
		addTh(tr, 'th', '', 'action-td');

		thead.appendChild(tr);
		tableContainer.appendChild(thead);
	}

	const toTime = (value) => {
		if (timeFormat == 'time') {
			if (typeof value === 'string' && /\d+\:\d\d/.test(value)) return value;
			if (typeof value === 'string' && /\d*([.,]\d+)?/.test(value)) {
				value = parseFloat(value.replace(/,/, '.'));
			};
			if (typeof value === 'number' && Number.isFinite(value)) {
				let h = Math.trunc(value).toString();
				let l = Math.trunc(60 * (value - Math.trunc(value))).toString();
				return h + ':' + ((l.length == 1) ? '0' + l : l);
			};
			return value;
		}
		else {
			if (typeof value == 'number') return value
			else value = value.toString();
			if (/\d+\:\d\d/.test(value)) {
				let arr = value.split(/:/);
				return parseInt(arr[0]) + parseInt(arr[1]) / 60;
			} else {
				return parseFloat(value.replace(/,/g, '.'));
			}
		}
	}

	const addAction = (
		/** @type {HTMLElement} */ el,
		/** @type {string} */ id,
		edit = true,
		notEnter = false,
		selectAll = false
	) => {
		if (selectAll) {
			el.addEventListener('focus', () => {
				// @ts-ignore
				el.startEditValue = el.innerText;
				let selection = window.getSelection();
				let range = document.createRange();
				range.selectNodeContents(el);
				selection.removeAllRanges();
				selection.addRange(range);
			});
		} else if (edit) {
			el.addEventListener('focus', () => {
				// @ts-ignore
				el.startEditValue = el.innerText;
				// console.log(el.innerText);
			});
		}
		if (edit) {
			el.addEventListener('keypress', (e) => {
				if (e.code == 'Enter' && (notEnter || e.ctrlKey)) {
					e.preventDefault();
					e.stopImmediatePropagation();

					window.getSelection().removeAllRanges();

					const universe = document.querySelectorAll('input, *[contenteditable="true"]');
					const list = Array.prototype.filter.call(universe, (item) => { return item.tabIndex >= 0 });
					const index = list.indexOf(el);
					const nextNode = (list[index + 1] ?? universe[0]);
					nextNode?.focus();
				} else {
					// @ts-ignore
					if (el.startEditValue != el.innerText) vscode.postMessage(
						{ type: 'lifeEdit', field: el.getAttribute('data-field'), id: id, value: el.innerText }
					);
				}
			});
			if (!notEnter) el.addEventListener('keydown', function (e) {
				if (e.key == 'Tab') {
					e.preventDefault();
					const sel = window.getSelection();
					sel.collapseToStart();
					let range = sel.getRangeAt(0);
					const node = sel.focusNode;
					const start = range.startOffset;
					switch (node.nodeName.toLowerCase()) {
						case 'pre':
							let subNode = node.childNodes[start];
							if (subNode.nodeName.toLowerCase() == 'br') {
								subNode = document.createTextNode('  \n');
								node.replaceChild(subNode, node.childNodes[start]);
								range.setStart(subNode, 2);
								range.setEnd(subNode, 2);
							};
							break;
						case 'div':
							// @ts-ignore
							node.innerText = node.innerText.substring(0, start) + "  " + node.innerText.substring(range.endOffset);
							range.setStart(node, start + 2);
							range.setEnd(node, start + 2);
							break;
						default:
							node.nodeValue = node.nodeValue.substring(0, start) + "  " + node.nodeValue.substring(range.endOffset);
							range.setStart(node, start + 2);
							range.setEnd(node, start + 2);
					};
				}
			});
			el.addEventListener('blur', () => {
				// @ts-ignore
				if (el.startEditValue != el.innerText) vscode.postMessage(
					{ type: 'edit', field: el.getAttribute('data-field'), id: id, value: el.innerText }
				);
			});
		}
	}

	const addElement = (
		/** @type {HTMLTableRowElement} */ owner,
		/** @type {string} */ elementType,
		/** @type {any} */ value,
		/** @type {string} */ field,
		/** @type {string} */ id,
		option = {}
	) => {
		let el = document.createElement(elementType);
		el.id = field + '_' + id;
		if (option.editable != false) {
			el.setAttribute('contenteditable', 'true');
			el.tabIndex = 0;
		};
		if (option.rowSpan != undefined)
			el.setAttribute('rowspan', option.rowSpan);
		el.innerText = value;
		el.className = field + ((option.addClassName !== undefined) ? ' ' + option.addClassName : '');
		el.setAttribute('data-field', field);
		addAction(el, id, option.editable != false, true, option.selectAll);
		owner.appendChild(el);
	}

	const addActionButton = (
		/** @type {{ id: string; }} */ step,
		/** @type {HTMLTableCellElement} */ td,
		/** @type {string} */ buttonText,
		/** @type {string} */ clickAction
	) => {

		const actionButton = document.createElement('button');
		actionButton.id = clickAction + '-button_' + step.id;
		actionButton.className = clickAction + '-button button';
		actionButton.tabIndex = -1;
		actionButton.innerText = buttonText;
		actionButton.addEventListener('click', () => {
			vscode.postMessage({ type: clickAction, id: step.id, });
		});
		td.appendChild(actionButton);
	}

	const loop = (/** @type {HTMLTableSectionElement} */ tbody, /** @type {array} */ arr) => {
		for (const step of arr || []) {

			const lineCount = (step.description == '') ? undefined : '2';

			let tr = document.createElement('tr');

			let td = document.createElement('td');
			td.className = 'num';
			td.setAttribute('data-field', 'num');
			td.id = 'num_' + step.id;
			if (lineCount) td.setAttribute('rowspan', lineCount);
			td.innerText = step.num;
			tr.appendChild(td);

			addElement(tr, 'td', step.step, 'step', step.id, {
				addClassName: 'level_' + (step.num.match(/\./g)?.length || '0')
			});
			addElement(tr, 'td', toTime(step.planTime), 'planTime', step.id, {
				rowSpan: lineCount,
				selectAll: true,
				editable: step.subStep?.length == 0
			});
			addElement(tr, 'td', toTime(step.realTime), 'realTime', step.id, {
				rowSpan: lineCount,
				selectAll: true,
				editable: step.subStep?.length == 0
			});

			td = document.createElement('td');
			td.id = 'done_' + step.id;
			td.className = 'done';
			td.setAttribute('data-field', 'done');
			if (lineCount) td.setAttribute('rowspan', '2')
			const check = document.createElement('input');
			check.id = 'check_' + step.id;
			check.type = 'checkbox';
			check.checked = step.done;
			check.disabled = step.subStep?.length > 0 ?? false;
			if (check.disabled) check.tabIndex = -1;
			check.addEventListener('change', () => {
				vscode.postMessage({ type: 'edit', field: 'done', id: step.id, value: check.checked });
			});
			check.addEventListener('keypress', (e) => {
				if (e.code == 'Enter') {
					e.preventDefault();
					e.stopImmediatePropagation();

					const universe = document.querySelectorAll('input, *[contenteditable="true"]');
					const list = Array.prototype.filter.call(universe, (item) => { return item.tabIndex >= 0 });
					const index = list.indexOf(check);
					const nextNode = (list[index + 1] ?? universe[0]);
					nextNode?.focus();
				};
			});
			td.appendChild(check);
			tr.appendChild(td);

			td = document.createElement('td');
			td.id = 'action-td_' + step.id;
			td.className = 'action-td';
			td.tabIndex = -1;
			if (lineCount) td.setAttribute('rowspan', lineCount);

			addActionButton(step, td, '\u2716', 'delete');
			addActionButton(step, td, '\u25b2', 'up');
			addActionButton(step, td, '\u25bc', 'down');
			addActionButton(step, td, '\u2380', 'insert');
			if (step.description == '') addActionButton(step, td, '\u2026', 'desc');
			// addActionButton(step, td, '\u2380', 'right');

			tr.appendChild(td);
			tbody.appendChild(tr);

			if (step.description != '') {
				const tr = document.createElement('tr');
				const ds = document.createElement('td');
				ds.className = 'description';
				const edit = document.createElement('pre');
				edit.id = 'description_' + step.id;
				edit.setAttribute('contenteditable', 'true');
				edit.tabIndex = 0;
				edit.innerText = step.description;
				edit.className = 'description';
				edit.setAttribute('data-field', 'description');
				addAction(edit, step.id, true);
				ds.appendChild(edit);
				tr.appendChild(ds);
				tbody.appendChild(tr);
			};
			loop(tbody, step.subStep);
		};

	}

	document.getElementById('add-button').querySelector('button').addEventListener('click', () => {
		vscode.postMessage({ type: 'add' });
	})

	const errorContainer = document.createElement('div');
	document.body.appendChild(errorContainer);
	errorContainer.className = 'error'
	// errorContainer.style.display = 'none'
	errorContainer.hidden = true;

	const descriptionContainer = /** @type {HTMLDivElement} */ (document.getElementById('description-container'));
	descriptionContainer.setAttribute('contenteditable', 'true');
	descriptionContainer.tabIndex = 0;
	// descriptionContainer.setAttribute('border', '1');
	descriptionContainer.setAttribute('data-field', 'description')
	// descriptionContainer.style.width = '100%';
	// descriptionContainer.style.height = '100%';
	addAction(descriptionContainer, '');

	const ticketContainer = /** @type {HTMLSpanElement} */ (document.getElementById('ticket'));
	ticketContainer.setAttribute('contenteditable', 'true');
	ticketContainer.tabIndex = 0;
	ticketContainer.setAttribute('data-field', 'ticket');
	addAction(ticketContainer, '', true, true);

	const captionContainer = /** @type {HTMLSpanElement} */ (document.getElementById('caption'));
	captionContainer.setAttribute('contenteditable', 'true');
	captionContainer.tabIndex = 0;
	captionContainer.setAttribute('data-field', 'caption');
	addAction(captionContainer, '', true, true);

	/**
	 * Render the document in the webview.
	 */
	function updateContent(/** @type {string} */ text, nawId) {
		let json;

		const thisId = document.activeElement.id;

		try {
			if (!text) {
				text = '{}';
			}
			json = JSON.parse(text);
		} catch {
			// tableContainer.style.display = 'none';
			tableContainer.hidden = true;
			errorContainer.innerText = 'Error: Document is not valid json';
			// errorContainer.style.display = '';
			errorContainer.hidden = false;
			return;
		}

		// tableContainer.style.display = '';
		// errorContainer.style.display = 'none';
		errorContainer.hidden = true;
		tableContainer.hidden = false;

		ticketContainer.innerText = json.ticket;
		captionContainer.innerText = json.caption;

		tableContainer.innerHTML = '';

		addTableHead(tableContainer);

		let tbody = document.createElement('tbody');
		loop(tbody, json.stepTable);
		tableContainer.appendChild(tbody);

		addTableFoot(json, tableContainer);

		descriptionContainer.innerText = json.description;

		if (nawId != '') {
			const el = document.getElementById(nawId);
			if (el !== null) {
				const selection = window.getSelection();
				const range = document.createRange();
				range.selectNodeContents(el);
				selection.removeAllRanges();
				selection.addRange(range);
				el.focus();
			}
		} else if (thisId != '') document.getElementById(thisId)?.focus();

	}

	// Handle messages sent from the extension to the webview
	window.addEventListener('message', event => {
		const message = event.data; // The json data that the extension sent
		switch (message.type) {
			case 'update':
				const text = message.text;
				timeFormat = message.timeFormat;
				// Update our webview's content
				updateContent(text, message.nawId);

				// Then persist state information.
				// This state is returned in the call to `vscode.getState` below when a webview is reloaded.
				vscode.setState({ text });

				return;
		}
	});

	// Webviews are normally torn down when not visible and re-created when they become visible again.
	// State lets us save information across these re-loads
	const state = vscode.getState();
	if (state) {
		updateContent(state.text);
	}
}());
