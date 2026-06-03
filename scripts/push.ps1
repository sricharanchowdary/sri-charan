param(
  [string]$Message = 'Finalize portfolio: tests, testing doc, submission email, update links'
)

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error 'git not found. Install git and re-run this script.'
  exit 1
}

try { git init } catch {}
git add .
try { git commit -m $Message } catch { Write-Host 'Nothing to commit' }

try { git branch -M main } catch {}
try {
  git remote get-url origin >/dev/null 2>&1
} catch {
  git remote add origin https://github.com/sricharanchowdary/sri-charan.git
}

git push -u origin main
