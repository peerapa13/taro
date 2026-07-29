$imgDir = 'D:\dev\taro\assets\img'
$agent  = 'Mozilla/5.0 (compatible; educational-tarot-app/1.0; +https://example.com)'

# Use thumbnail API to get 300px versions (smaller = faster, less rate-limit)
$cards = @(
  @{ out='lovers.jpg';     file='RWS_Tarot_06_Lovers.jpg' },
  @{ out='chariot.jpg';    file='RWS_Tarot_07_Chariot.jpg' },
  @{ out='wheel.jpg';      file='RWS_Tarot_10_Wheel_of_Fortune.jpg' },
  @{ out='justice.jpg';    file='RWS_Tarot_11_Justice.jpg' },
  @{ out='hanged_man.jpg'; file='RWS_Tarot_12_Hanged_Man.jpg' },
  @{ out='temperance.jpg'; file='RWS_Tarot_14_Temperance.jpg' },
  @{ out='devil.jpg';      file='RWS_Tarot_15_Devil.jpg' },
  @{ out='star.jpg';       file='RWS_Tarot_17_Star.jpg' },
  @{ out='moon.jpg';       file='RWS_Tarot_18_Moon.jpg' },
  @{ out='judgement.jpg';  file='RWS_Tarot_20_Judgement.jpg' },
  @{ out='world.jpg';      file='RWS_Tarot_21_World.jpg' }
)

foreach ($card in $cards) {
  $dest    = Join-Path $imgDir $card.out
  $encoded = [Uri]::EscapeDataString("File:$($card.file)")
  $apiUrl  = "https://en.wikipedia.org/w/api.php?action=query&titles=$encoded&prop=imageinfo&iiprop=url&iiurlwidth=300&format=json"

  Write-Host "Fetching info for $($card.out)..."
  try {
    $raw    = Invoke-WebRequest -Uri $apiUrl -UserAgent $agent -UseBasicParsing -TimeoutSec 15
    $json   = $raw.Content | ConvertFrom-Json
    $pagesObj = $json.query.pages
    # Get the first page regardless of page ID
    $page   = $pagesObj.PSObject.Properties.Value | Select-Object -First 1
    $imgUrl = $page.imageinfo[0].thumburl
    if (-not $imgUrl) { $imgUrl = $page.imageinfo[0].url }

    if ($imgUrl) {
      Write-Host "  Downloading from $imgUrl"
      Invoke-WebRequest -Uri $imgUrl -OutFile $dest -UserAgent $agent -UseBasicParsing -TimeoutSec 30
      $sz = (Get-Item $dest).Length
      Write-Host "  OK - $([math]::Round($sz/1KB,0)) KB"
    } else {
      Write-Host "  SKIP: No URL found"
    }
  } catch {
    Write-Host "  FAIL: $_"
  }
  Start-Sleep -Seconds 2
}

Write-Host "`nFinal count: $((Get-ChildItem $imgDir).Count) files"
Get-ChildItem $imgDir | Select-Object Name,@{N='KB';E={[math]::Round($_.Length/1KB,0)}} | Format-Table
