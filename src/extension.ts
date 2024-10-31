import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	let timeout: NodeJS.Timeout | undefined = undefined;

	const hiddenLeadingSpaceDecorationType = vscode.window.createTextEditorDecorationType({
		textDecoration: '; font-size: 0%'
	});

	let activeEditor = vscode.window.activeTextEditor;
	let lastRenderEnabled = false;
	const headerRegex = /^\s*(module|class)/;

	function updateDecorations() {
		if (!activeEditor) {
			return;
		}

		const enabled = vscode.workspace.getConfiguration('hideRubyNesting').enabled;

		if (!enabled && !lastRenderEnabled) { return; }

		const lineCount = activeEditor.document.lineCount;

		let indentHeader = 0;
		let headerStarted = false;
		for (let i = 0; i < lineCount; i++) {
			const line = activeEditor.document.lineAt(i);

			if (headerStarted && !line.text.match(headerRegex)) {
				// break
				i = lineCount;
			} else if (headerStarted && line.text.match(headerRegex)) {
				indentHeader = line.firstNonWhitespaceCharacterIndex;
			} else if (!headerStarted && line.text.match(headerRegex)) {
				headerStarted = true;
			}
		}

		if (!enabled && lastRenderEnabled) {
			indentHeader = 0;
		}

		const leadingSpaces: vscode.DecorationOptions[] = [];
		for (let i = 0; i < lineCount; i++) {
			const line = activeEditor.document.lineAt(i);
			const startPos = line.range.start;
			const spaces = Math.min(line.firstNonWhitespaceCharacterIndex, indentHeader);
			const endPos = line.range.start.translate({ characterDelta: spaces });
			const decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: 'hidden spaces' };
			leadingSpaces.push(decoration);
		}

		lastRenderEnabled = enabled;
		activeEditor.setDecorations(hiddenLeadingSpaceDecorationType, leadingSpaces);
	}

	function triggerUpdateDecorations(throttle = false) {
		if (timeout) {
			clearTimeout(timeout);
			timeout = undefined;
		}
		if (throttle) {
			timeout = setTimeout(updateDecorations, 200);
		} else {
			updateDecorations();
		}
	}

	if (activeEditor) {
		triggerUpdateDecorations();
	}

	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateDecorations(false);
		}
	}, null, context.subscriptions);

}
