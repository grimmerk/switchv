echo "try to sign app"

# step1: add ElectronTeamID in INfo.plist 
# https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide#extra-steps-without-electron-osx-sign
plutil -replace ElectronTeamID -string "GL35G6YCWG" /Users/grimmer/git/xwin/electron/out/SwitchV-mas-arm64/SwitchV.app/Contents/Info.plist
