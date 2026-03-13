# detect-bt.ps1
# Lista dispositivos Bluetooth emparejados y sus MAC addresses para ayudar en la configuracion.

Write-Host "Buscando dispositivos Bluetooth emparejados..." -ForegroundColor Cyan
Write-Host "--------------------------------------------------"

try {
    $null = [Windows.Devices.Enumeration.DeviceInformation, Windows.Devices.Enumeration, ContentType=WindowsRuntime]
    $selector = [Windows.Devices.Bluetooth.BluetoothDevice]::GetDeviceSelector()
    $devicesAsync = [Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($selector)
    
    # Esperar el resultado
    while ($devicesAsync.Status -eq 'Started') { Start-Sleep -Milliseconds 100 }
    $devices = $devicesAsync.GetResults()

    if ($devices.Count -eq 0) {
        Write-Host "No se encontraron dispositivos Bluetooth emparejados." -ForegroundColor Yellow
        Write-Host "Asegurate de que la impresora este emparejada en la configuracion de Windows."
    } else {
        foreach ($dev in $devices) {
            $name = $dev.Name
            $id = $dev.Id # Contiene la MAC al final
            
            # Extraer MAC del ID (ej: Bluetooth#Bluetooth86:67:7a:b9:0f:7f)
            if ($id -match "([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}") {
                $mac = $matches[0].ToUpper()
                Write-Host "Dispositivo: $name" -ForegroundColor White
                Write-Host "MAC:         $mac" -ForegroundColor Green
                Write-Host "--------------------------------------------------"
            }
        }
    }
} catch {
    Write-Error "Error detectando dispositivos: $($_.Exception.Message)"
}

Write-Host "`nPresiona cualquier tecla para salir..."
$null = [Console]::ReadKey()
