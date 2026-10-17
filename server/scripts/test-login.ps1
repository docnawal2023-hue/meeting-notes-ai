$body = @{ email = "test@example.com"; password = "123456" } | ConvertTo-Json
$res = Invoke-RestMethod -Uri http://localhost:5000/api/auth/login -Method Post -Body $body -ContentType "application/json"
$headers = @{ Authorization = "Bearer $($res.token)" }
$base = "http://localhost:5000/api"
$list = Invoke-RestMethod -Uri "$base/meetings" -Headers $headers
$id = ($list.meetings | Where-Object { $_.status -eq "done" } | Select-Object -First 1)._id
Write-Host "Ready. Meeting id: $id"
