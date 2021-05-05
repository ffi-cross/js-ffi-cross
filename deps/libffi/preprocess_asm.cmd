@echo off

cl /nologo /EP /I%1 /I%2 /I%3 /DPIC /DFFI_BUILDING /DHAVECONFIG_H %4 > %5
