# Change Log

All notable changes to the `cnc-cvs` extension will be documented in this file.

## [v1.5.0]
- Add new resource group `Repository Changes` to distinguish from actual merge conflicts in `Conflicts`.
- Add command `merge-all` to `Repository Changes` resource group to merge all changes from the repository.
- Fix Issue #2: `windows line endings cause parseResources to fail`.
## [v1.4.0]
- Add option to `Discard All Changes` in the `Changes` resource group.
- Add command to `checkout` new folders discovered on repository not in local checkout.
- Add command to `ignore` new folders that are discovered on repository.
- Add extension setting to view and edit ignored folders.
## [v1.3.0]
- Add user confirmation for several commands (e.g. delete file, discard changes , etc).
## [v1.2.1]
- Fix slow refresh rate of CVS SCM resources.
## [v1.2.0]
- Add staging area for the changes selected for commit.
## [v1.1.0]
- Add the branch name and revision number of the file (of active editor) to the status bar.
## [v1.0.0]
- Initial release.