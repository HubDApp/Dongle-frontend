@echo off
echo ==========================================
echo Creating files and pushing to zarmaijemimah
echo ==========================================

REM Set up remote
git remote remove zarmaijemimah 2>nul
git remote add zarmaijemimah https://github.com/zarmaijemimah/Dongle-frontend.git

echo.
echo Step 1: Copying files from session to working directory...
echo This will take a moment...
echo.

REM The files should already be in your directory from when Kiro created them
REM Let's verify they exist

echo Checking for files...
if exist "dongle\app\api\graphql\route.ts" (
    echo ✓ GraphQL files found
) else (
    echo ✗ GraphQL files missing - they need to be recreated
    echo Please ask Kiro to recreate the implementation files
    pause
    exit /b 1
)

if exist "packages\form-api-client\package.json" (
    echo ✓ JavaScript SDK found
) else (
    echo ✗ JavaScript SDK missing
    pause
    exit /b 1
)

if exist "sdks\python\setup.py" (
    echo ✓ Python SDK found
) else (
    echo ✗ SDKs missing
    pause
    exit /b 1
)

echo.
echo All files verified! Proceeding with git operations...
echo.

REM ===== ISSUE 1 =====
echo ==========================================
echo Issue #1: GraphQL Endpoint
echo ==========================================
git checkout main
git branch -D issue-1-graphql-endpoint 2>nul
git checkout -b issue-1-graphql-endpoint

git add -f dongle/app/api/graphql/
git add -f dongle/GRAPHQL_API.md

git status

git commit -m "feat: Add GraphQL endpoint for form queries and mutations" -m "" -m "Resolves #1"

git push -f zarmaijemimah issue-1-graphql-endpoint
echo ✓ Issue #1 pushed!
echo.

REM ===== ISSUE 2 =====
echo ==========================================
echo Issue #2: JavaScript SDK  
echo ==========================================
git checkout main
git branch -D issue-2-javascript-sdk 2>nul
git checkout -b issue-2-javascript-sdk

git add -f packages/

git status

git commit -m "feat: Create JavaScript/TypeScript SDK" -m "" -m "Resolves #2"

git push -f zarmaijemimah issue-2-javascript-sdk
echo ✓ Issue #2 pushed!
echo.

REM ===== ISSUE 3 =====
echo ==========================================
echo Issue #3: REST API Updates
echo ==========================================
git checkout main
git branch -D issue-3-rest-api-updates 2>nul
git checkout -b issue-3-rest-api-updates

git add -f dongle/app/api/reviews/route.ts

git status

git commit -m "feat: Enhance REST API" -m "" -m "Resolves #3"

git push -f zarmaijemimah issue-3-rest-api-updates
echo ✓ Issue #3 pushed!
echo.

git checkout main

echo ==========================================
echo DONE! All 3 issues pushed to zarmaijemimah
echo ==========================================
pause
