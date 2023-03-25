// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { generateApolloClient } from '@deep-foundation/hasura/client';
import { DeepClient } from '@deep-foundation/deeplinks/imports/client';

const PACKAGE_NAME_DEEP_EXTENSION = '@l4legenda/vscode-deep-extension';

let deep: DeepClient;

async function loginDeep() {
	const config = vscode.workspace.getConfiguration('vscode-deep-extension');
	const rootClient = generateApolloClient({
		path: config.get("path"),
		ssl: config.get("ssl"),
	});
	const unloginedDeep = new DeepClient({
		apolloClient: rootClient,
	});

	const guest = await unloginedDeep.guest();
	const guestDeep = new DeepClient({ deep: unloginedDeep, ...guest });
	const admin = await guestDeep.login({ linkId: await guestDeep.id('deep', 'admin') });
	deep = new DeepClient({ deep: guestDeep, ...admin });
}

async function activeEventsListenerFiles() {

	const projectName = vscode.workspace.workspaceFolders?.[0]?.name;


	const typeContainLinkId = await deep.id("@deep-foundation/core", 'Contain');

	const typePathFileLinkId = await deep.id(PACKAGE_NAME_DEEP_EXTENSION, 'PathFile');
	const typeProjectNameLinkId = await deep.id(PACKAGE_NAME_DEEP_EXTENSION, 'ProjectName');
	const typeOpenedLinkId = await deep.id(PACKAGE_NAME_DEEP_EXTENSION, 'Opened');
	const typeClosedLinkId = await deep.id(PACKAGE_NAME_DEEP_EXTENSION, 'Closed');

	const { data: ProjectNameArrayLinkId } = await deep.select({
		type_id: await deep.id(PACKAGE_NAME_DEEP_EXTENSION, "ProjectName")
	});

	let projectNameLinkId: number;
	if (ProjectNameArrayLinkId.length > 0) {
		const [{ id: _projectNameLinkId }] = ProjectNameArrayLinkId;
		projectNameLinkId = _projectNameLinkId;
	} else {
		const { data: [{ id: _projectNameLinkId }] } = await deep.insert({
			type_id: typeProjectNameLinkId,
			string: { data: { value: projectName } },
			in: {
				data: {
					type_id: typeContainLinkId,
					from_id: deep.linkId
				}
			},
		})
		projectNameLinkId = _projectNameLinkId;
	}


	vscode.workspace.onDidOpenTextDocument(async (file) => {
		const pathFile = file?.fileName;
		if (pathFile.endsWith(".git")) return;

		const { data: selectPathFile } = await deep.select({
			type_id: typePathFileLinkId,
			string: { value: { _eq: pathFile } }
		});

		let pathFileLinkId: number;
		if (selectPathFile.length > 0) {
			const [{ id: _pathFileLinkId }] = selectPathFile;
			pathFileLinkId = _pathFileLinkId;
		} else {
			const { data: [{ id: _pathFileLinkId }] } = await deep.insert({
				type_id: typePathFileLinkId,
				string: { data: { value: pathFile } },
				in: {
					data: {
						type_id: typeContainLinkId,
						from_id: projectNameLinkId
					}
				}
			})
			pathFileLinkId = _pathFileLinkId;
		}


		await deep.delete({
			up: {
				tree_id: { _eq: await deep.id("@deep-foundation/core", "containTree") },
				parent: {
					type_id: { _id: ["@deep-foundation/core", "Contain"] },
					to: {
						type_id: typeClosedLinkId,
						to_id: pathFileLinkId,
					},
					from_id: deep.linkId
				}
			}
		})

		await deep.insert({
			type_id: typeOpenedLinkId,
			from_id: deep.linkId,
			to_id: pathFileLinkId,
			in: {
				data: {
					type_id: typeContainLinkId,
					from_id: deep.linkId
				}
			}
		});
	});

	vscode.workspace.onDidCloseTextDocument(async (file) => {
		const pathFile = file?.fileName;
		if (pathFile.endsWith(".git")) return;

		const { data: selectPathFile } = await deep.select({
			type_id: typePathFileLinkId,
			string: { value: { _eq: pathFile } }
		});

		let pathFileLinkId: number;
		if (selectPathFile.length > 0) {
			const [{ id: _pathFileLinkId }] = selectPathFile;
			pathFileLinkId = _pathFileLinkId;
		} else {
			const { data: [{ id: _pathFileLinkId }] } = await deep.insert({
				type_id: typePathFileLinkId,
				string: { data: { value: pathFile } },
				in: {
					data: {
						type_id: typeContainLinkId,
						from_id: projectNameLinkId
					}
				}
			})
			pathFileLinkId = _pathFileLinkId;
		}

		await deep.delete({
			up: {
				tree_id: { _eq: await deep.id("@deep-foundation/core", "containTree") },
				parent: {
					type_id: { _id: ["@deep-foundation/core", "Contain"] },
					to: {
						type_id: typeOpenedLinkId,
						to_id: pathFileLinkId,
					},
					from_id: deep.linkId
				}
			}
		})

		await deep.insert({
			type_id: typeClosedLinkId,
			from_id: deep.linkId,
			to_id: pathFileLinkId,
			in: {
				data: {
					type_id: typeContainLinkId,
					from_id: deep.linkId
				}
			}
		});
	});
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	let onCommandSetPath = vscode.commands.registerCommand('vscode-deep-extension.set-path', async () => {
		const config = vscode.workspace.getConfiguration('vscode-deep-extension');
		const path = await vscode.window.showInputBox({ placeHolder: 'Path' });
		config.update("path", path, true);
		vscode.window.showInformationMessage("Path deep is updated!");
	});

	let onCommandSetSSL = vscode.commands.registerCommand('vscode-deep-extension.set-ssl', async () => {
		const config = vscode.workspace.getConfiguration('vscode-deep-extension');
		const ssl = await vscode.window.showInputBox({ placeHolder: 'SSL' });
		const isSSL = ssl?.toLocaleLowerCase() === 'true';
		config.update("ssl", isSSL, true);
		vscode.window.showInformationMessage("SSL deep is updated!");
	});

	let onCommandReconnect = vscode.commands.registerCommand('vscode-deep-extension.reconnect', async () => {
		await loginDeep();
		vscode.window.showInformationMessage("deep reconnected!");
	});

	context.subscriptions.push(onCommandSetPath);
	context.subscriptions.push(onCommandSetSSL);
	context.subscriptions.push(onCommandReconnect);

	await loginDeep();
	await activeEventsListenerFiles();


	vscode.window.showInformationMessage('deep extension started!');


}

// This method is called when your extension is deactivated
export function deactivate() { }
