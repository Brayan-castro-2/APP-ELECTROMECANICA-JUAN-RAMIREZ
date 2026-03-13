# bt-print.ps1
# Imprime un ticket ESC/POS en la impresora JP80H via Bluetooth (RFCOMM) o COM port.
#
# Uso: 
#   Bluetooth: powershell.exe -File bt-print.ps1 -dataFile "ticket.bin" -mac "86:67:7A:B9:0F:7F"
#   COM port:  powershell.exe -File bt-print.ps1 -dataFile "ticket.bin" -com "COM3"

param(
    [string]$dataFile,
    [string]$mac = $null,
    [string]$com = $null,
    [int]$baud = 9600
)

function Convert-MacToUlong {
    param([string]$macAddress)
    $hex = $macAddress.Replace(":", "").Replace("-", "")
    return [System.Convert]::ToUInt64($hex, 16)
}

function Await-Task {
    param($asyncOp)
    $deadline = [DateTime]::Now.AddSeconds(15)
    while ($asyncOp.Status -eq 'Started' -or $asyncOp.Status -eq 'Running') {
        Start-Sleep -Milliseconds 50
        if ([DateTime]::Now -gt $deadline) { throw "Timeout esperando operacion Bluetooth (15s)" }
    }
    if ($asyncOp.Status -eq 'Error') { throw "Error en operacion Bluetooth: $($asyncOp.ErrorCode)" }
    if ($asyncOp.Status -eq 'Canceled') { throw "Operacion Bluetooth cancelada" }
    try { return $asyncOp.GetResults() } catch { return $null }
}

try {
    if (-not (Test-Path $dataFile)) { throw "Archivo de datos no encontrado: $dataFile" }
    $ticketData = [System.IO.File]::ReadAllBytes($dataFile)

    if ($com) {
        # --- MODO COM PORT ---
        Write-Host "Conectando a puerto $com ($baud baud)..."
        $port = New-Object System.IO.Ports.SerialPort($com, $baud, [System.IO.Ports.Parity]::None, 8, [System.IO.Ports.StopBits]::One)
        $port.Open()
        try {
            $port.Write($ticketData, 0, $ticketData.Length)
            # Esperar un poco a que el buffer se vacie
            Start-Sleep -Milliseconds 500
            Write-Host "PRINT_OK"
        } finally {
            $port.Close()
        }
        exit 0
    } elseif ($mac) {
        # --- MODO BLUETOOTH RFCOMM ---
        $null = [Windows.Devices.Bluetooth.BluetoothDevice, Windows.Devices.Bluetooth, ContentType=WindowsRuntime]
        $null = [Windows.Devices.Bluetooth.Rfcomm.RfcommServiceId, Windows.Devices.Bluetooth, ContentType=WindowsRuntime]
        $null = [Windows.Networking.Sockets.StreamSocket, Windows.Networking.Sockets, ContentType=WindowsRuntime]
        $null = [Windows.Storage.Streams.DataWriter, Windows.Storage.Streams, ContentType=WindowsRuntime]
        $null = [Windows.Devices.Bluetooth.Rfcomm.RfcommDeviceService, Windows.Devices.Bluetooth, ContentType=WindowsRuntime]

        $btAddr = Convert-MacToUlong $mac
        Write-Host "Conectando a dispositivo Bluetooth MAC: $mac..."
        $deviceAsync = [Windows.Devices.Bluetooth.BluetoothDevice]::FromBluetoothAddressAsync($btAddr)
        $device = Await-Task $deviceAsync

        if ($null -eq $device) {
            throw "Dispositivo no encontrado. Verifica que la impresora este encendida, vinculada y dentro del rango."
        }

        $servicesAsync = $device.GetRfcommServicesAsync()
        $servicesResult = Await-Task $servicesAsync

        if ($servicesResult.Services.Count -eq 0) {
            throw "No se encontraron servicios RFCOMM. Asegurate que la impresora soporte SPP (Serial Port Profile)."
        }

        $service = $servicesResult.Services | Where-Object {
            try { $_.ServiceId.AsShortId() -eq 0x1101 } catch { $false }
        } | Select-Object -First 1
        if ($null -eq $service) { $service = $servicesResult.Services[0] }

        $socket = [Windows.Networking.Sockets.StreamSocket]::new()
        $connectAsync = $socket.ConnectAsync($service.ConnectionHostName, $service.ConnectionServiceName)
        Await-Task $connectAsync

        Write-Host "Enviando datos ($($ticketData.Length) bytes)..."
        $writer = [Windows.Storage.Streams.DataWriter]::new($socket.OutputStream)
        $writer.WriteBytes($ticketData)
        Await-Task ($writer.StoreAsync())
        Await-Task ($writer.FlushAsync())

        $writer.DetachStream()
        $socket.Dispose()
        $device.Dispose()

        Write-Host "PRINT_OK"
        exit 0
    } else {
        throw "Debes especificar -mac o -com"
    }

} catch {
    $errMsg = $_.Exception.Message
    if (-not $errMsg) { $errMsg = $_.ToString() }
    Write-Error "ERROR: $errMsg"
    exit 1
}
