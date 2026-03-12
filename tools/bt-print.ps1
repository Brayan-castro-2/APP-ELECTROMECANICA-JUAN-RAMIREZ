# bt-print.ps1
# Imprime un ticket ESC/POS en la impresora JP80H via Bluetooth RFCOMM directo
# Funciona como Waiterio en Android: solo necesita la MAC, sin "conectar" desde Windows
#
# Uso: powershell -ExecutionPolicy Bypass -File bt-print.ps1 -dataFile "C:\tmp\ticket.bin" -mac "86:67:7A:B9:0F:7F"

param(
    [string]$dataFile,          # Ruta al archivo binario con datos ESC/POS
    [string]$mac = "86:67:7A:B9:0F:7F"  # MAC de la JP80H
)

# Convierte MAC "86:67:7A:B9:0F:7F" a ulong para WinRT
function Convert-MacToUlong {
    param([string]$macAddress)
    $hex = $macAddress.Replace(":", "").Replace("-", "")
    return [System.Convert]::ToUInt64($hex, 16)
}

# Helper async/await para WinRT en PowerShell
function Await-Task {
    param($asyncOperation)
    try {
        $awaiter = $asyncOperation.GetAwaiter()
        $deadline = [DateTime]::Now.AddSeconds(10)
        while (-not $awaiter.IsCompleted) { 
            Start-Sleep -Milliseconds 100
            if ([DateTime]::Now -gt $deadline) {
                throw "Timeout esperando operacion Bluetooth"
            }
        }
        return $awaiter.GetResult()
    } catch {
        throw $_.Exception
    }
}

try {
    # Cargar tipos WinRT necesarios
    $null = [Windows.Devices.Bluetooth.BluetoothDevice, Windows.Devices.Bluetooth, ContentType=WindowsRuntime]
    $null = [Windows.Devices.Bluetooth.Rfcomm.RfcommServiceId, Windows.Devices.Bluetooth, ContentType=WindowsRuntime]
    $null = [Windows.Networking.Sockets.StreamSocket, Windows.Networking.Sockets, ContentType=WindowsRuntime]
    $null = [Windows.Storage.Streams.DataWriter, Windows.Storage.Streams, ContentType=WindowsRuntime]
    $null = [Windows.Devices.Bluetooth.Rfcomm.RfcommDeviceService, Windows.Devices.Bluetooth, ContentType=WindowsRuntime]

    # Leer datos del archivo binario
    if (-not (Test-Path $dataFile)) {
        throw "Archivo de datos no encontrado: $dataFile"
    }
    $ticketData = [System.IO.File]::ReadAllBytes($dataFile)

    # Convertir MAC a direccion ulong
    $btAddr = Convert-MacToUlong $mac
    Write-Host "Conectando a JP80H ($mac)..."

    # Obtener dispositivo Bluetooth por direccion MAC
    $deviceAsync = [Windows.Devices.Bluetooth.BluetoothDevice]::FromBluetoothAddressAsync($btAddr)
    $device = Await-Task $deviceAsync

    if ($null -eq $device) {
        throw "Dispositivo no encontrado. Verifica que la JP80H este encendida y dentro del rango."
    }

    # Obtener servicios RFCOMM del dispositivo (Serial Port Profile = 0x1101)
    $servicesAsync = $device.GetRfcommServicesAsync()
    $servicesResult = Await-Task $servicesAsync

    if ($servicesResult.Services.Count -eq 0) {
        throw "No se encontraron servicios RFCOMM en el dispositivo. Asegurate que la impresora soporte SPP."
    }

    # Usar el primer servicio (o buscar SPP 0x1101 especificamente)
    $service = $servicesResult.Services | Where-Object {
        try { $_.ServiceId.AsShortId() -eq 0x1101 } catch { $false }
    } | Select-Object -First 1

    if ($null -eq $service) {
        # Fallback: usar el primer servicio disponible
        $service = $servicesResult.Services[0]
    }

    # Conectar via StreamSocket RFCOMM
    $socket = [Windows.Networking.Sockets.StreamSocket]::new()
    Write-Host "Abriendo conexion RFCOMM..."
    $connectAsync = $socket.ConnectAsync($service.ConnectionHostName, $service.ConnectionServiceName)
    Await-Task $connectAsync

    Write-Host "Enviando datos ESC/POS ($($ticketData.Length) bytes)..."

    # Escribir datos usando DataWriter
    $writer = [Windows.Storage.Streams.DataWriter]::new($socket.OutputStream)
    $writer.WriteBytes($ticketData)
    Await-Task ($writer.StoreAsync())
    Await-Task ($writer.FlushAsync())

    # Liberar recursos
    $writer.DetachStream()
    $socket.Dispose()
    $device.Dispose()

    Write-Host "PRINT_OK"
    exit 0

} catch {
    $errMsg = $_.Exception.Message
    if (-not $errMsg) {
        $errMsg = $_.ToString()
    }
    Write-Error "ERROR: $errMsg"
    exit 1
}
