# Range Sync
The Range Chrome extension, rearchitected to be lighter-weight and flexible

## Local installation
1. Pull repo
2. Go to the [extensions tab](chrome://extensions/)
3. Click “Developer mode” in the top right
4. Click “Load unpacked” in the top left
5. Select the folder called "ext"
6. Click the toggle to disable the current Range extension (you can toggle either one if you want to switch)

You can switch between prod and staging by switching what `manifest.json` file
you're using. Whichever one is named `manifest.json` will be used and the others
will be ignored.
