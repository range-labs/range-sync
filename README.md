# Range Sync
The Range Chrome extension, rearchitected to be lighter-weight and flexible

## Local installation
1. Pull repo
2. Go to the [extensions tab](chrome://extensions/)
3. Click "Load unpacked" and select the `range-sync/ext` folder
4. You should start getting activity under the "Chrome Extension" provider

You can switch between prod and staging by switching what `manifest.json` file
you're using. Whichever one is named `manifest.json` will be used and the other
will be ignored.
