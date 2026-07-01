# Sendet Testpunkte an Firebase, um die Live-Karte ohne Handy zu prüfen.
# Aufruf:
#   .\scripts\simulate-track.ps1 -DbUrl "https://<projectId>-default-rtdb.europe-west1.firebasedatabase.app" -Secret "<DB_SECRET>"
param(
    [Parameter(Mandatory=$true)][string]$DbUrl,
    [Parameter(Mandatory=$true)][string]$Secret,
    [int]$IntervalSec = 3
)
$endpoint = "$DbUrl/tracks/2026.json?auth=$Secret"
# Ein paar Punkte vom Gardasee Richtung Westen
$route = @(
    @{ lat = 45.6495; lon = 10.6853 },
    @{ lat = 45.6510; lon = 10.6300 },
    @{ lat = 45.6600; lon = 10.5600 },
    @{ lat = 45.6720; lon = 10.4800 },
    @{ lat = 45.6850; lon = 10.4000 },
    @{ lat = 45.7000; lon = 10.3200 }
)
foreach ($pt in $route) {
    $epoch = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $body = @{ lat = $pt.lat; lon = $pt.lon; t = $epoch; spd = 12.5 } | ConvertTo-Json -Compress
    Invoke-RestMethod -Method Post -Uri $endpoint -Body $body -ContentType 'application/json' | Out-Null
    Write-Host "gesendet: $($pt.lat), $($pt.lon)"
    Start-Sleep -Seconds $IntervalSec
}
Write-Host "Fertig. Karte auf explore-2026.html prüfen."
