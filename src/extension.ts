import * as vscode from 'vscode';
import * as path from 'path';
import { parseCMake, applyToText, CMakeModel, ApplyInput } from './core';


class InMemoryContentProvider implements vscode.TextDocumentContentProvider {
	private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
	onDidChange = this._onDidChange.event;
	private store = new Map<string, string>();
	set(uri: vscode.Uri, text: string) {
		this.store.set(uri.toString(), text);
		this._onDidChange.fire(uri);
	}
	delete(...uris: vscode.Uri[]) {
		for (const u of uris) {
			this.store.delete(u.toString());
		}
	}
	provideTextDocumentContent(uri: vscode.Uri): string {
		return this.store.get(uri.toString()) ?? '';
	}
}

export function activate(ctx: vscode.ExtensionContext) {
	const memProvider = new InMemoryContentProvider();
	ctx.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('cmake-gui-editor', memProvider));
	ctx.subscriptions.push(
		vscode.window.registerCustomEditorProvider(
			'cmake-gui-editor.visualEditor',
			new CMakeGuiProvider(ctx, memProvider),
			{ supportsMultipleEditorsPerDocument: false }
		)
	);
	ctx.subscriptions.push(
		vscode.commands.registerCommand('cmake-gui-editor.openVisual', async (uri?: vscode.Uri) => {
			const target = uri ?? vscode.window.activeTextEditor?.document.uri;
			if (target) {
				await vscode.commands.executeCommand('vscode.openWith', target, 'cmake-gui-editor.visualEditor');
			}
		})
	);
}

export function deactivate() { }

class CMakeGuiProvider implements vscode.CustomTextEditorProvider {
	constructor(private readonly ctx: vscode.ExtensionContext, private readonly memProvider: InMemoryContentProvider) { }
	async resolveCustomTextEditor(document: vscode.TextDocument, panel: vscode.WebviewPanel): Promise<void> {
		panel.webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(this.ctx.extensionUri, 'media')] };
		const htmlUri = vscode.Uri.joinPath(this.ctx.extensionUri, 'media', 'index.html');
		const htmlBytes = await vscode.workspace.fs.readFile(htmlUri);
		let html = Buffer.from(htmlBytes).toString('utf8');
		const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, 'media', 'app.js'));
		const csp = panel.webview.cspSource;
		html = html.replace(/\$\{cspSource\}/g, csp).replace(/\$\{appJs\}/g, String(scriptUri));
		panel.webview.html = html;
		const sendModel = () => {
			const parsed = parseCMake(document.getText());
			panel.webview.postMessage({
				type: 'init',
				model: parsed.model,
				targets: parsed.model.targets.map(t => t.name),
				chosenTarget: chooseTarget(parsed.model)
			});
		};
		sendModel();
		const changeSub = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				sendModel();
			}
		});
		panel.onDidDispose(() => changeSub.dispose());
		panel.webview.onDidReceiveMessage(async (msg) => {
			if (msg.type !== 'apply') {
				return;
			}
			const original = document.getText();
			const parsed = parseCMake(original);
			const updated = applyToText(original, parsed, msg.payload as ApplyInput);
			if (updated === original) {
				vscode.window.showInformationMessage('No changes to apply.');
				return;
			}
			const base = path.basename(document.fileName || 'CMakeLists.txt');
			const leftUri = vscode.Uri.parse(`cmake-gui-editor:Original ${encodeURIComponent(base)}`);
			const rightUri = vscode.Uri.parse(`cmake-gui-editor:Proposed ${encodeURIComponent(base)}`);
			this.memProvider.set(leftUri, original);
			this.memProvider.set(rightUri, updated);
			await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, `Proposed changes — ${base}`);
			const choice = await vscode.window.showInformationMessage('Apply changes to CMakeLists.txt?', 'Apply', 'Cancel');
			await closeDiffForUris(leftUri, rightUri);
			this.memProvider.delete(leftUri, rightUri);
			if (choice !== 'Apply') {
				return;
			}
			const edit = new vscode.WorkspaceEdit();
			edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), updated);
			await vscode.workspace.applyEdit(edit);
		});
	}
}

function chooseTarget(model: CMakeModel): string | undefined {
	return model.targets.find(t => t.kind === 'executable')?.name ?? model.targets[0]?.name;
}

async function closeDiffForUris(left: vscode.Uri, right: vscode.Uri) {
	const tabsToClose: vscode.Tab[] = [];
	for (const group of vscode.window.tabGroups.all) {
		for (const tab of group.tabs) {
			const input: any = tab.input;
			if (input && input.original && input.modified) {
				if (String(input.original) === String(left) && String(input.modified) === String(right)) {
					tabsToClose.push(tab);
				}
			}
		}
	}
	if (tabsToClose.length) {
		await vscode.window.tabGroups.close(tabsToClose, true);
	}
}
