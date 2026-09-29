# Windows Setup Instructions

## Issue: PowerShell Execution Policy

If you're seeing this error:
```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running 
scripts is disabled on this system.
```

## Solutions

### Option 1: Enable Scripts for Current User (Recommended)

1. **Open PowerShell as Administrator**
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

2. **Run this command:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Type `Y` and press Enter to confirm**

4. **Verify:**
   ```powershell
   Get-ExecutionPolicy
   ```
   Should show: `RemoteSigned`

### Option 2: Bypass for Single Session

If you don't want to change the policy permanently:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

This only affects the current PowerShell session.

### Option 3: Use CMD Instead

Use Command Prompt (cmd.exe) instead of PowerShell:
```cmd
npm run dev
npm test
npm run typecheck
```

## Running the Project

After fixing the execution policy:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment:**
   ```bash
   copy .env.example .env
   ```

3. **Edit `.env` and add:**
   ```env
   WEBHOOK_SECRET=your-secret-key-here
   NEXT_PUBLIC_SOROBAN_CONTRACT_ID=your-contract-id
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Run tests:**
   ```bash
   npm test
   ```

6. **Type check:**
   ```bash
   npm run typecheck
   ```

## Testing the API Features

### Test Batch Submissions

Create `test-api.js`:
```javascript
async function testBatch() {
  const response = await fetch('http://localhost:3000/api/batch/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'individual',
      items: [
        { id: 'test-1', data: { name: 'Test Project', category: 'DeFi' } }
      ]
    })
  });
  
  const result = await response.json();
  console.log('Result:', JSON.stringify(result, null, 2));
}

testBatch();
```

Run with:
```bash
node test-api.js
```

### View Interactive Docs

Open browser to:
- API Docs: http://localhost:3000/api/docs
- OpenAPI Spec: http://localhost:3000/api/openapi

## Common Windows Issues

### Issue: Port 3000 Already in Use

**Solution:**
```bash
# Use different port
set PORT=3001 && npm run dev
```

Or find and kill the process:
```powershell
# Find process
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Issue: Git Line Endings

**Solution:**
```bash
git config core.autocrlf true
```

### Issue: Long Path Names

**Solution:**
```powershell
# Enable long paths (Admin PowerShell)
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

## Recommended Tools for Windows

1. **Windows Terminal** - Modern terminal with tabs
   - Install from Microsoft Store

2. **Git for Windows** - Includes Git Bash
   - Download from git-scm.com

3. **Node Version Manager (nvm-windows)**
   - Manage multiple Node.js versions
   - Download from github.com/coreybutler/nvm-windows

4. **VS Code Extensions:**
   - REST Client - Test API endpoints
   - Thunder Client - API testing
   - ESLint - Code linting
   - Prettier - Code formatting

## Next Steps

1. ✅ Fix PowerShell execution policy
2. ✅ Install dependencies
3. ✅ Configure environment variables
4. ✅ Start development server
5. ✅ Test the API endpoints
6. ✅ View interactive documentation

## Need Help?

- Check `docs/api/GETTING_STARTED.md`
- View examples in `examples/` folder
- Read API docs at `/api/docs`
