import * as vscode from "vscode";
import { CvsSourceControl } from "./cvsSourceControl";
import { CvsDocumentContentProvider } from "./cvsDocumentContentProvider";
import { CVS_SCHEME } from "./cvsRepository";
import { ConfigManager } from "./configManager";

let cvsDocumentContentProvider: CvsDocumentContentProvider;
let configManager: ConfigManager;
const cvsSourceControlRegister = new Map<vscode.Uri, CvsSourceControl>();

export function activate(context: vscode.ExtensionContext) {
  console.log('"cvs-scm" is now active');

  cvsDocumentContentProvider = new CvsDocumentContentProvider();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      CVS_SCHEME,
      cvsDocumentContentProvider
    )
  );

  configManager = new ConfigManager(context);

  initializeWorkspaceFolders(context);

  cvsSourceControlRegister.forEach((sourceControl) => {
    sourceControl.getCvsState();
  });

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.refresh",
      async (sourceControlPane: vscode.SourceControl) => {
        // check CVS repository for local and remote changes
        const sourceControl = await pickSourceControl(sourceControlPane);
        if (sourceControl) {
          sourceControl.getCvsState();
        } else {
          cvsSourceControlRegister.forEach((sourceControl) => {
            sourceControl.getCvsState();
          });
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.commit",
      async (sourceControlPane: vscode.SourceControl) => {
        const consulta = await vscode.window.showInputBox({
          placeHolder: "Numero da Consulta no Interpres:",
        });
        const sourceControl = await pickSourceControl(sourceControlPane);
        if (sourceControl) {
          sourceControl.commitAll(consulta);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.stage",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        const sourceControl = findSourceControl(resourceStates[0].resourceUri);
        if (sourceControl) {
          for (const resource of resourceStates) {
            // automatically "cvs remove" any deleted files if staged
            if (resource.contextValue === "deleted") {
              await sourceControl.removeFileFromCvs(resource.resourceUri);
            }
            sourceControl.stageFile(resource.resourceUri);
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.unstage",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        const sourceControl = findSourceControl(resourceStates[0].resourceUri);
        if (sourceControl) {
          for (const resource of resourceStates) {
            sourceControl.unstageFile(resource.resourceUri);
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.stage-all",
      async (sourceControlResourceGroup: vscode.SourceControlResourceGroup) => {
        if (sourceControlResourceGroup.resourceStates.length > 0) {
          const sourceControl = findSourceControl(
            sourceControlResourceGroup.resourceStates[0].resourceUri
          );
          if (sourceControl) {
            sourceControl.stageAll();
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.unstage-all",
      async (sourceControlResourceGroup: vscode.SourceControlResourceGroup) => {
        if (sourceControlResourceGroup.resourceStates.length > 0) {
          const sourceControl = findSourceControl(
            sourceControlResourceGroup.resourceStates[0].resourceUri
          );
          if (sourceControl) {
            sourceControl.unstageAll();
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.discard",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        const option = await vscode.window.showWarningMessage(
          `Are you sure you want to discard Changes?`,
          { modal: true },
          `Yes`
        );
        if (option === `Yes`) {
          const sourceControl = findSourceControl(
            resourceStates[0].resourceUri
          );
          if (sourceControl) {
            for (const resource of resourceStates) {
              sourceControl.revertFile(resource.resourceUri);
            }
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.force-revert",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        const option = await vscode.window.showWarningMessage(
          `Are you sure you want to discard merge and revert to HEAD?`,
          { modal: true },
          `Yes`
        );
        if (option === `Yes`) {
          const sourceControl = findSourceControl(
            resourceStates[0].resourceUri
          );
          if (sourceControl) {
            for (const resource of resourceStates) {
              sourceControl.forceRevert(resource.resourceUri);
            }
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.add",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        // slect file to be added to repo on next commit
        const sourceControl = findSourceControl(resourceStates[0].resourceUri);
        if (sourceControl) {
          for (const resource of resourceStates) {
            sourceControl.addFile(resource.resourceUri);
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.add-folder",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        const option = await vscode.window.showWarningMessage(
          `Are you sure you want to add the selected folder(s) to the repository?`,
          { modal: true },
          `Yes`
        );
        if (option === `Yes`) {
          const sourceControl = findSourceControl(
            resourceStates[0].resourceUri
          );
          if (sourceControl) {
            for (const resource of resourceStates) {
              sourceControl.addFile(resource.resourceUri);
            }
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.undo-add",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        const option = await vscode.window.showWarningMessage(
          `Are you sure you want to discard changes?`,
          { modal: true },
          `Yes`
        );
        if (option === `Yes`) {
          const sourceControl = findSourceControl(
            resourceStates[0].resourceUri
          );
          if (sourceControl) {
            for (const resource of resourceStates) {
              sourceControl.undoAdd(resource.resourceUri);
            }
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.delete",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        const option = await vscode.window.showWarningMessage(
          `Are you sure you want to delete?`,
          { modal: true },
          `Yes`
        );
        if (option === `Yes`) {
          const sourceControl = findSourceControl(
            resourceStates[0].resourceUri
          );
          if (sourceControl) {
            for (const resource of resourceStates) {
              sourceControl.deleteUri(resource.resourceUri);
            }
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.restore",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        // restore deleted source file
        const sourceControl = findSourceControl(resourceStates[0].resourceUri);
        if (sourceControl) {
          for (const resource of resourceStates) {
            sourceControl.recoverDeletedFile(resource.resourceUri);
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.remove",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        const option = await vscode.window.showWarningMessage(
          `Are you sure you want to remove from the repository?`,
          { modal: true },
          `Yes`
        );
        if (option === `Yes`) {
          const sourceControl = findSourceControl(
            resourceStates[0].resourceUri
          );
          if (sourceControl) {
            for (const resource of resourceStates) {
              sourceControl.removeFileFromCvs(resource.resourceUri);
            }
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.undo-remove",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        // undo the removal of a file
        const sourceControl = findSourceControl(resourceStates[0].resourceUri);
        if (sourceControl) {
          for (const resource of resourceStates) {
            await sourceControl.addFile(resource.resourceUri);
            await sourceControl.recoverDeletedFile(resource.resourceUri);
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.merge-latest",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        const option = await vscode.window.showWarningMessage(
          `Are you sure you want to merge the latest changes from the repository for the selected item(s)?`,
          { modal: true },
          `Yes`
        );
        if (option === `Yes`) {
          const sourceControl = findSourceControl(
            resourceStates[0].resourceUri
          );
          if (sourceControl) {
            for (const resource of resourceStates) {
              sourceControl.mergeLatest(resource.resourceUri);
            }
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.openFile",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        const sourceControl = findSourceControl(resourceStates[0].resourceUri);
        if (sourceControl) {
          for (const resource of resourceStates) {
            vscode.commands.executeCommand("vscode.open", resource.resourceUri);
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders((e) => {
      e.added.forEach((wf) => {
        initializeFolder(wf, context);
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.ignore-folder",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        const option = await vscode.window.showWarningMessage(
          `Are you sure you want to ignore the selected folder(s) from cvs update?`,
          { modal: true },
          `Yes`
        );
        if (option === `Yes`) {
          const sourceControl = findSourceControl(
            resourceStates[0].resourceUri
          );
          if (sourceControl) {
            for (const resource of resourceStates) {
              sourceControl.ignoreFolder(resource.resourceUri);
            }
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.checkout-folder-recursive",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        const option = await vscode.window.showWarningMessage(
          `Are you sure you want to checkout the selected folder(s) (including subfolders)?`,
          { modal: true },
          `Yes`
        );
        if (option === `Yes`) {
          const sourceControl = findSourceControl(
            resourceStates[0].resourceUri
          );
          if (sourceControl) {
            for (const resource of resourceStates) {
              sourceControl.checkoutFolder(resource.resourceUri);
            }
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.checkout-folder",
      async (...resourceStates: vscode.SourceControlResourceState[]) => {
        const option = await vscode.window.showWarningMessage(
          `Are you sure you want to checkout the selected folder(s)?`,
          { modal: true },
          `Yes`
        );
        if (option === `Yes`) {
          const sourceControl = findSourceControl(
            resourceStates[0].resourceUri
          );
          if (sourceControl) {
            for (const resource of resourceStates) {
              sourceControl.checkoutFolder(resource.resourceUri, false);
            }
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.discard-all",
      async (sourceControlResourceGroup: vscode.SourceControlResourceGroup) => {
        const option = await vscode.window.showWarningMessage(
          `Are you sure you want to discard all changes?`,
          { modal: true },
          `Yes`
        );
        if (option === `Yes`) {
          if (sourceControlResourceGroup.resourceStates.length > 0) {
            const sourceControl = findSourceControl(
              sourceControlResourceGroup.resourceStates[0].resourceUri
            );

            if (sourceControl) {
              sourceControlResourceGroup.resourceStates.forEach(
                (resourceState) => {
                  if (resourceState.contextValue === "modified") {
                    sourceControl.revertFile(resourceState.resourceUri);
                  } else if (resourceState.contextValue === "added") {
                    sourceControl.undoAdd(resourceState.resourceUri);
                  } else if (resourceState.contextValue === "removed") {
                    sourceControl.addFile(resourceState.resourceUri);
                  } else if (resourceState.contextValue === "deleted") {
                    sourceControl.recoverDeletedFile(resourceState.resourceUri);
                  }
                }
              );
            }
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cnc-cvs.merge-all",
      async (sourceControlResourceGroup: vscode.SourceControlResourceGroup) => {
        const option = await vscode.window.showWarningMessage(
          `Are you sure you want to merge all repository changes into the local checkout?`,
          { modal: true },
          `Yes`
        );
        if (option === `Yes`) {
          if (sourceControlResourceGroup.resourceStates.length > 0) {
            const sourceControl = findSourceControl(
              sourceControlResourceGroup.resourceStates[0].resourceUri
            );

            if (sourceControl) {
              sourceControlResourceGroup.resourceStates.forEach(
                (resourceState) => {
                  if (resourceState.contextValue === "directory") {
                    sourceControl.checkoutFolder(resourceState.resourceUri);
                  } else if (
                    resourceState.contextValue === "removedFromRepo" ||
                    resourceState.contextValue === "checkout" ||
                    resourceState.contextValue === "patch" ||
                    resourceState.contextValue === "merge"
                  ) {
                    sourceControl.mergeLatest(resourceState.resourceUri);
                  }
                }
              );
            }
          }
        }
      }
    )
  );
}

function findSourceControl(resource: vscode.Uri): CvsSourceControl | undefined {
  for (const uri of cvsSourceControlRegister.keys()) {
    if (resource.fsPath.includes(uri.fsPath)) {
      return cvsSourceControlRegister.get(uri);
    }
  }

  return undefined;
}

async function pickSourceControl(
  sourceControlPane: vscode.SourceControl
): Promise<CvsSourceControl | undefined> {
  if (sourceControlPane && sourceControlPane.rootUri) {
    return cvsSourceControlRegister.get(sourceControlPane.rootUri);
  }

  if (cvsSourceControlRegister.size === 0) {
    return undefined;
  } else if (cvsSourceControlRegister.size === 1) {
    return [...cvsSourceControlRegister.values()][0];
  } else {
    return undefined;
  }
}

async function initializeWorkspaceFolders(
  context: vscode.ExtensionContext
): Promise<void> {
  if (!vscode.workspace.workspaceFolders) {
    return;
  }

  const folderPromises = vscode.workspace.workspaceFolders.map(
    async (folder) => await initializeFolder(folder, context)
  );
  await Promise.all(folderPromises);
}

async function initializeFolder(
  folder: vscode.WorkspaceFolder,
  context: vscode.ExtensionContext
): Promise<void> {
  const cvsSourceControl = new CvsSourceControl(
    context,
    folder.uri,
    cvsDocumentContentProvider,
    configManager
  );
  registerCvsSourceControl(cvsSourceControl, context);
}

function registerCvsSourceControl(
  cvsSourceControl: CvsSourceControl,
  context: vscode.ExtensionContext
) {
  cvsSourceControlRegister.set(
    cvsSourceControl.getWorkspaceFolder(),
    cvsSourceControl
  );
  context.subscriptions.push(cvsSourceControl);
}

// this method is called when your extension is deactivated
export function deactivate() {}
