// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { generateApolloClient } from '@deep-foundation/hasura/client';
import { DeepClient } from '@deep-foundation/deeplinks/imports/client';

const rootClient = generateApolloClient({
	path: '3006-deepfoundation-dev-nz5ae840cad.ws-eu92.gitpod.io/gql',
	ssl: true,
});

const PACKAGE_NAME_DEEP_EXTENSION = '@l4legenda/vscode-deep-extension';

const unloginedDeep = new DeepClient({
	apolloClient: rootClient,
});



// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	const projectName = vscode.workspace.workspaceFolders?.[0]?.name;

	const guest = await unloginedDeep.guest();
	const guestDeep = new DeepClient({ deep: unloginedDeep, ...guest });
	const admin = await guestDeep.login({ linkId: await guestDeep.id('deep', 'admin') });
	const deep = new DeepClient({ deep: guestDeep, ...admin });

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
		console.log("ProjectNameArrayLinkId", ProjectNameArrayLinkId);
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
		console.log("create link", _projectNameLinkId)
		projectNameLinkId = _projectNameLinkId;
	}


	vscode.workspace.onDidOpenTextDocument(async (file) => {
		const pathFile = file?.fileName;
		if (pathFile.endsWith(".git")) return;
		console.log(pathFile);
		const { data: [{ id: pathFileLinkId }] } = await deep.insert({
			type_id: typePathFileLinkId,
			string: { data: { value: pathFile } },
			in: {
				data: {
					type_id: typeContainLinkId,
					from_id: projectNameLinkId
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
		})
	})

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-deep-extension" is now active!');



	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('vscode-deep-extension.helloWorld', async () => {



		vscode.window.showInformationMessage('Hello World from vscode-deep-extension!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
