***Exported data are not guaranteed to be correct, since there are no descriptions for many values - many meanings are only approximated and many values change between sessions***

***I am currently working on Java version, that will replace & include everything in one package - GUI included.***

### About
Purpose of this project is to create simple scripts for Shakes & Fidget that collect data from .HAR files and output structured .JSON files or .XLSX tables

In the current state, the only available scripts are aimed at exporting guild members list and their statistics

_Create an issue on GitHub if you found a bug or your exported files do not match reality_

### How to use
To create a .JSON file, drag you .HAR file over har_to_json.py
If you want to create also .XLSX spreadsheet, drag your newly created .JSON over to json_to_xlsx.py

If you have downloaded XLSX template and placed it next to json_to_xlsx.py, your .XLSX will also include pre-stylized sheet with proper formatting, value highliting, etc ...

##### Where to get .HAR file
- Open Shakes & Fidget in **browser**, press **F12** and navigate over to **Network** tab   
- **Reload** the page and wait for the game to finish loading   
- Once loaded, head over to guild and **click on all members** of your guild   
- When finished, **save** the captured network activity

### Downloads
- [HAR to JSON](https://raw.githubusercontent.com/HafisCZ/SF-Exporter/master/har_to_json.py)
- [JSON to XLSX](https://raw.githubusercontent.com/HafisCZ/SF-Exporter/master/json_to_xlsx.py)

- [XLSX template](https://raw.githubusercontent.com/HafisCZ/SF-Exporter/master/template.xlsx)


_Use this script to dump all values into .xlsx, since json_to_xlsx filters certain items out:_
- [XLSX Dump](https://raw.githubusercontent.com/HafisCZ/SF-Exporter/master/dump.py)

### Required packages
- [openpyxl](https://pypi.org/project/openpyxl/)
