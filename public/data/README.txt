Analytics data folder

Option A – Multiple sessions (json_files)
  - Put exported session files in: public/data/json_files/
  - Each file name should start with kingdom-ruins-analytics- (e.g. kingdom-ruins-analytics-1771088543653.json).
  - Each file is one session (one game); the app loads all of them when you list them in the manifest.
  - Edit public/data/json_files/manifest.json and set it to a JSON array of those file names, e.g.:
    ["kingdom-ruins-analytics-1771088543653.json", "kingdom-ruins-analytics-1771088543654.json"]
  - The Analytics page will fetch the manifest, then fetch each file and combine them.

Option B – Single file (legacy)
  - Place a single events.json in public/data/events.json (one JSON array of all events).
  - Used as fallback if the manifest is missing or lists no files.

How to get export files: Finish a game, click "Export analytics (JSON)" on the victory screen, then save the downloaded file into public/data/json_files/ and add its name to manifest.json.

You can also upload one or more JSON files directly from the Analytics page.
