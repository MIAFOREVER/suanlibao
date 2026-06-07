# Miner binaries

Put miner executables here or point to their absolute paths in `../miners.json`.

Recommended layout:

```text
apps/desktop/electron/miners/
  alpha-miner/
    alpha-miner-windows.exe
  alpha-miner-amd/
    alpha-miner-amd-win-v1.0.0.exe
  lolminer/
    lolMiner.exe
    msvcp140.dll
```

Then set:

```json
{
  "kernels": {
    "alpha-miner": {
      "path": "miners/alpha-miner/alpha-miner-windows.exe"
    },
    "alpha-miner-amd": {
      "path": "miners/alpha-miner-amd/alpha-miner-amd-win-v1.0.0.exe"
    },
    "lolminer": {
      "path": "miners/lolminer/lolMiner.exe"
    }
  }
}
```

Only use official or trusted miner releases. The app starts miners visibly and only after the user clicks start.
