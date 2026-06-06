# Miner binaries

Put miner executables here or point to their absolute paths in `../miners.json`.

Recommended layout:

```text
apps/desktop/electron/miners/
  alpha-miner/
    alpha-miner-windows.exe
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
    "lolminer": {
      "path": "miners/lolminer/lolMiner.exe"
    }
  }
}
```

Only use official or trusted miner releases. The app starts miners visibly and only after the user clicks start.
