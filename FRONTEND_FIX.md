# Fixing Frontend Dependencies Error

If you're encountering the error:
```
Error: Cannot find module '...\node_modules\isexe\index.js'
```

This indicates corrupted or incomplete `node_modules`. Follow these steps to fix it:

## Quick Fix (Recommended)

Run these commands in order:

```powershell
# Navigate to frontend directory
cd frontend

# Remove corrupted node_modules
Remove-Item -Recurse -Force node_modules

# Remove package-lock.json
Remove-Item -Force package-lock.json

# Clear npm cache (optional but recommended)
npm cache clean --force

# Reinstall all dependencies
npm install
```

## Alternative: Using npm commands

```powershell
cd frontend
npm cache clean --force
rm -r -force node_modules
rm package-lock.json
npm install
```

## If the error persists

1. **Check Node.js version**: Make sure you're using Node.js v14 or higher
   ```powershell
   node --version
   ```

2. **Try using yarn instead**:
   ```powershell
   cd frontend
   npm install -g yarn
   yarn install
   ```

3. **Delete and recreate package.json dependencies**:
   - Check if all dependencies in `package.json` are valid
   - Remove any suspicious or duplicate entries
   - Run `npm install` again

4. **Check disk space**: Ensure you have enough free space on your drive

5. **Run as Administrator**: Sometimes Windows permissions can cause issues
   - Right-click PowerShell/Command Prompt
   - Select "Run as Administrator"
   - Try the commands again

## After successful installation

Once `npm install` completes successfully, start the development server:

```powershell
cd frontend
npm start
```

The frontend should start on `http://localhost:3000`

## Common Issues

### Issue: "npm ERR! code ENOENT"
- Solution: Make sure you're in the `frontend` directory

### Issue: "npm ERR! code ELIFECYCLE"
- Solution: Clear cache and try again: `npm cache clean --force && npm install`

### Issue: Installation takes too long
- Solution: This is normal for the first install. React and MUI have many dependencies. Be patient!

### Issue: "Permission denied" errors
- Solution: Run PowerShell/Command Prompt as Administrator

## Verification

After installation, verify the setup:

```powershell
cd frontend
npm list --depth=0
```

This should show all installed packages without errors.


