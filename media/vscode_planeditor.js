// @ts-check

// Script run within the webview itself.
(function () {

	// Get a reference to the VS Code webview api.
	// We use this API to post messages back to our extension.

	// @ts-ignore
	const vscode = acquireVsCodeApi();
	
	let timeFormat = 'time';

	const tableContainer = /** @type {HTMLTableElement} */ (document.querySelector('.stepTable'));
	tableContainer.style.width = '100%';
	tableContainer.setAttribute('border', '1');
	
	function addTableFoot(json, tableContainer) {
	
		const tfoot = document.createElement('tfoot');
		const tf = document.createElement('tr');
		
		let td = document.createElement('td');
		td.setAttribute('colspan', '2');
		td.innerText = '';
		tf.appendChild(td);
	
		td = document.createElement('td');
		td.className = 'planTime';
		td.innerText = toTime(json.planTime);
		tf.appendChild(td);
	
		td = document.createElement('td');
		td.className = 'realTime';
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
		if (timeFormat == 'time'){
			if (typeof value === 'string' && /\d+\:\d\d/.test(value)) return value;
			if (typeof value === 'string' && /\d*([.,]\d+)?/.test(value)){
				value = parseFloat(value.replace(/,/, '.'));
			};
			if (typeof value === 'number' && Number.isFinite(value)) {
				let h = Math.trunc(value).toString();
				let l = Math.trunc(60 * (value - Math.trunc(value))).toString();
				return h + ':' + ((l.length == 1)? '0' + l: l);
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
			});
		}
		if (edit && notEnter) {
			el.addEventListener('keypress', (e) => {
				if (e.code == 'Enter') {
					e.preventDefault();
					e.stopImmediatePropagation();
				};
			});
		}
		if (edit) {
			el.addEventListener('blur', () => {
				// @ts-ignore
				if (el.startEditValue != el.innerText) vscode.postMessage(
					{ type: 'edit', field: el.className, id: id, value: el.innerText }
				);
			});
		}
	}

	const addElement = (
		/** @type {HTMLTableRowElement} */ owner,
		/** @type {string} */ elementType,
		/** @type {any} */ value,
		/** @type {string} */ className,
		/** @type {string} */ id,
		/** @type {string} */ rowSpan,
		/** @type {boolean} */ selectAll,
		editable = true
	) => {
		let el = document.createElement(elementType);
		el.id = className + '_' + id;
		if (editable) el.setAttribute('contenteditable', 'true');
		if (rowSpan != undefined)
			el.setAttribute('rowspan', rowSpan);
		el.innerText = value;
		el.className = className;
		addAction(el, id, editable, true, selectAll);
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
		actionButton.textContent = buttonText;
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
			td.id = 'num_' + step.id;
			if (lineCount) td.setAttribute('rowspan', lineCount);
			td.innerText = step.num;
			tr.appendChild(td);

			addElement(tr, 'td', step.step, 'step', step.id);
			addElement(tr, 'td', toTime(step.planTime), 'planTime', step.id, lineCount, true, step.subStep?.length == 0);
			addElement(tr, 'td', toTime(step.realTime), 'realTime', step.id, lineCount, true, step.subStep?.length == 0);

			td = document.createElement('td');
			td.id = 'done_' + step.id;
			td.className = 'done';
			if (lineCount) td.setAttribute('rowspan', '2')
			const check = document.createElement('input');
			check.id = 'check_' + step.id;
			check.type = 'checkbox';
			check.checked = step.done;
			check.disabled = step.subStep?.length > 0 ?? false;
			check.addEventListener('change', () => {
				vscode.postMessage({ type: 'edit', field: 'done', id: step.id, value: check.checked });
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
				ds.id = 'description_' + step.id;
				ds.setAttribute('contenteditable', 'true');
				ds.innerText = step.description;
				ds.className = 'description';
				addAction(ds, step.id, true);
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
	errorContainer.style.display = 'none'

	const descriptionContainer = /** @type {HTMLDivElement} */ (document.getElementById('description-container'));
	descriptionContainer.setAttribute('contenteditable', 'true');
	descriptionContainer.setAttribute('border', '1');
	descriptionContainer.style.width = '100%';
	descriptionContainer.style.height = '100%';
	addAction(descriptionContainer, '');

	const ticketContainer = /** @type {HTMLSpanElement} */ (document.getElementById('ticket'));
	ticketContainer.setAttribute('contenteditable', 'true');
	addAction(ticketContainer, '', true, true);

	const captionContainer = /** @type {HTMLSpanElement} */ (document.getElementById('caption'));
	captionContainer.setAttribute('contenteditable', 'true');
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
			tableContainer.style.display = 'none';
			errorContainer.innerText = 'Error: Document is not valid json';
			errorContainer.style.display = '';
			return;
		}

		tableContainer.style.display = '';
		errorContainer.style.display = 'none';

		ticketContainer.innerText = json.ticket;
		captionContainer.innerText = json.caption;

		tableContainer.innerHTML = '';

		addTableHead(tableContainer);

		let tbody = document.createElement('tbody');
		loop(tbody, json.stepTable);
		tableContainer.appendChild(tbody);

		addTableFoot(json, tableContainer);

		descriptionContainer.innerText = json.description;
		
		if (nawId != '') {document.getElementById('step_' + nawId)?.focus() } 
		else if (thisId != '') document.getElementById(thisId).focus();

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
