// @ts-check

// Script run within the webview itself.
(function () {

	// Get a reference to the VS Code webview api.
	// We use this API to post messages back to our extension.

	// @ts-ignore
	const vscode = acquireVsCodeApi();

	const addButtonContainer = document.querySelector('.add-button');
	addButtonContainer.querySelector('button').addEventListener('click', () => {
		vscode.postMessage({
			type: 'add'
		});
	})

	const errorContainer = document.createElement('div');
	document.body.appendChild(errorContainer);
	errorContainer.className = 'error'
	errorContainer.style.display = 'none'
	
	const tableContainer = /** @type {HTMLTableElement} */ (document.querySelector('.stepTable'));
	tableContainer.style.width  = '100%';
	tableContainer.setAttribute('border', '1');
    
	const descriptionContainer = /** @type {HTMLDivElement} */ (document.getElementById('description-container'));
	descriptionContainer.setAttribute('contenteditable', 'true');
	descriptionContainer.setAttribute('border', '1');
	descriptionContainer.style.width = '100%';
	descriptionContainer.style.height = '100%';
	descriptionContainer.addEventListener('focus', () => {
		// @ts-ignore
		descriptionContainer.startEditValue = descriptionContainer.innerText;
	});
	descriptionContainer.addEventListener('blur', () => {
		// @ts-ignore
		if (descriptionContainer.startEditValue != descriptionContainer.innerText) vscode.postMessage({ type: 'edit', field:'description', id: '', value: descriptionContainer.innerText});
	});
	
	const ticketContainer = /** @type {HTMLSpanElement} */ (document.getElementById('ticket'));
	ticketContainer.setAttribute('contenteditable', 'true');
	ticketContainer.addEventListener('focus', () => {
		// @ts-ignore
		ticketContainer.startEditValue = ticketContainer.innerText;
	});
	ticketContainer.addEventListener('blur', () => {
		// @ts-ignore
		if (ticketContainer.startEditValue != ticketContainer.innerText) vscode.postMessage({ type: 'edit', field:'ticket', id: '', value: ticketContainer.innerText});
	});
	ticketContainer.addEventListener('keypress', (e) => {
		if (e.code == 'Enter'){ 
			e.preventDefault();
			e.stopImmediatePropagation();
		};
	});

	const captionContainer = /** @type {HTMLSpanElement} */ (document.getElementById('caption'));
	captionContainer.setAttribute('contenteditable', 'true');
	captionContainer.addEventListener('focus', () => {
		// @ts-ignore
		captionContainer.startEditValue = captionContainer.innerText;
	});
	captionContainer.addEventListener('blur', () => {
		// @ts-ignore
		if (captionContainer.startEditValue != captionContainer.innerText) vscode.postMessage({ type: 'edit', field:'caption', id: '', value: captionContainer.innerText});
	});
	captionContainer.addEventListener('keypress', (e) => {
		if (e.code == 'Enter'){ 
			e.preventDefault();
			e.stopImmediatePropagation();
		};
	});

	/**
	 * Render the document in the webview.
	 */
	function updateContent(/** @type {string} */ text) {
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
	
		// Render the scratches
		tableContainer.innerHTML = '';

		const addTh = function(	/** @type {HTMLTableRowElement} */ owner, 
								/** @type {string} */ elementType, 
								/** @type {string} */ value, 
								/** @type {string} */ className){
			let el = document.createElement(elementType);
			el.innerText = value;
			el.className = className;
			owner.appendChild(el);
		}

		const addElement = function(/** @type {HTMLTableRowElement} */ owner, 
									/** @type {string} */ elementType, 
									/** @type {any} */ value, 
									/** @type {string} */ className, 
									/** @type {string} */ id, 
									/** @type {string} */ rowSpan, 
									/** @type {boolean} */ selectAll){
			let el = document.createElement(elementType);
			el.id = className + '_' + id;
			el.setAttribute('contenteditable', 'true');
			if(rowSpan != undefined) el.setAttribute('rowspan', rowSpan);
			el.innerText = value;
			el.className = className;
			if (selectAll == true) {
				el.addEventListener('focus', () => {
					// @ts-ignore
					el.startEditValue = el.innerText;
					let selection = window.getSelection();        
					let range = document.createRange();
					range.selectNodeContents(el);
					selection.removeAllRanges();
					selection.addRange(range);
				});
			} else {
				el.addEventListener('focus', () => {
					// @ts-ignore
					el.startEditValue = el.innerText;
				});
			}
			el.addEventListener('keypress', (e) => {
				if (e.code == 'Enter'){ 
					e.preventDefault();
					e.stopImmediatePropagation();
				};
			});
			el.addEventListener('blur', () => {
				// @ts-ignore
				if (el.startEditValue != el.innerText) vscode.postMessage({ type: 'edit', field:className, id: id, value: el.innerText});
			});
			owner.appendChild(el);
		}
		const addActionButton = function(	/** @type {{ id: string; }} */ step, 
											/** @type {HTMLTableCellElement} */ td, 
											/** @type {string} */ buttonText, 
											/** @type {string} */ clickAction) {
			
			const actionButton = document.createElement('button');
			actionButton.id = clickAction + '-button_' + step.id;
			actionButton.className = clickAction + '-button';
			actionButton.tabIndex = -1;
			actionButton.textContent = buttonText;
			actionButton.addEventListener('click', () => {
				vscode.postMessage({ type: clickAction, id: step.id, });
			});
			td.appendChild(actionButton);
		}

		const thead = document.createElement('thead');
		const tr = document.createElement('tr');
		
		addTh(tr, 'th', '#', 'num-h');
		addTh(tr, 'th', 'Step', 'step-h');
		addTh(tr, 'th', 'Plan time', 'planTime-h');
		addTh(tr, 'th', 'Real time', 'realTime-h');
		addTh(tr, 'th', 'Done', 'done-h');
		// addTh(tr, 'th', 'Description', 'description');
		addTh(tr, 'th', '', 'action-td');
		
		thead.appendChild(tr);
		tableContainer.appendChild(thead);

		let tbody = document.createElement('tbody');
		for (const step of json.stepTable || []) {
		
			let tr = document.createElement('tr');

			let td = document.createElement('td');
			td.className = 'num';
			td.id = 'num_' + step.id;
			td.setAttribute('rowspan', '2')
			td.innerText = step.num;
			tr.appendChild(td);
			
			// td.style.border = '1px solid black'
			// addElement(tr, 'td', step.num, 'num', step.id, "2");
			addElement(tr, 'td', step.step, 'step', step.id);
			addElement(tr, 'td', step.planTime, 'planTime', step.id, '2', true);
			addElement(tr, 'td', step.realTime, 'realTime', step.id, '2', true);
			// addElement(tr, 'td', step.done, 'done', step.id, '2');
			// addElement(tr, 'td', step.description, 'description', step.id);
			
			td = document.createElement('td');
			td.id = 'done_' + step.id;
			td.className = 'done';
			td.setAttribute('rowspan', '2')
			const check = document.createElement('input');
			check.id = 'check_' + step.id;
			check.type = 'checkbox';
			check.checked = step.done;
			check.addEventListener('change', () => {
				vscode.postMessage({ type: 'edit', field:'done', id: step.id, value: check.checked});
			});
			td.appendChild(check);
			tr.appendChild(td);
			
			td = document.createElement('td');
			td.id = 'action-td_' + step.id;
			td.className = 'action-td';
			td.tabIndex = -1;
			td.setAttribute('rowspan', '2');
			
			addActionButton(step, td, '\u2716', 'delete');
			addActionButton(step, td, '\u25b2', 'up');
			addActionButton(step, td, '\u25bc', 'down');
			addActionButton(step, td, '\u2380', 'insert');
			
			tr.appendChild(td);
			
			tbody.appendChild(tr);

			tr = document.createElement('tr');
			const ds = document.createElement('td');
			ds.id = 'description_' + step.id;
			ds.setAttribute('contenteditable', 'true');
			ds.innerText = step.description;
			ds.className = 'description';
			ds.addEventListener('focus', () => {
				// @ts-ignore
				ds.startEditValue = ds.innerText;
			});
			ds.addEventListener('blur', () => {
				// @ts-ignore
				if (ds.startEditValue != ds.innerText) vscode.postMessage({ type: 'edit', field:'description', id: step.id, value: ds.innerText});
			});
			tr.appendChild(ds);
			tbody.appendChild(tr);

		}

		tableContainer.appendChild(tbody);

		const tfoot = document.createElement('tfoot');
		const tf = document.createElement('tr');
		let td = document.createElement('td');
		td.setAttribute('colspan', '2')
		td.innerText = '';
		tf.appendChild(td);
		
		td = document.createElement('td');
		td.className = 'planTime';
		td.innerText = json.planTime;
		tf.appendChild(td);

		td = document.createElement('td');
		td.className = 'realTime';
		td.innerText = json.realTime;
		tf.appendChild(td);

		td = document.createElement('td');
		td.setAttribute('colspan', '3')
		td.innerText = '';
		tf.appendChild(td);

		tfoot.appendChild(tf);
		tableContainer.appendChild(tfoot);

		descriptionContainer.innerText = json.description;

		if (thisId != '') document.getElementById(thisId).focus();

	}

	// Handle messages sent from the extension to the webview
	window.addEventListener('message', event => {
		const message = event.data; // The json data that the extension sent
		switch (message.type) {
			case 'update':
				const text = message.text;

				// Update our webview's content
				updateContent(text);

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
