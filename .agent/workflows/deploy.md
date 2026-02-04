---
description: Build, verify, commit, and push changes to remote
---

1. Run the build command to verify project integrity.
   - Command: `export PATH=$PATH:/Users/jinho/.nvm/versions/node/v24.11.0/bin && npm run build`
   - If the build fails:
     - Analyze the error log.
     - Fix the code issues.
     - Repeat step 1 until the build succeeds.
     - **Note:** If the error is an `EPERM` permission error in `node_modules`, this requires user intervention. Stop and ask the user to run `sudo chown -R $USER node_modules` or similar.

2. Stage all changes.
   - Command: `git add .`

3. Generate a commit message based on the changes.
   - Command: `git commit -m "[Appropriate message]"`

4. Push to the remote repository.
   - Command: `git push origin main`
