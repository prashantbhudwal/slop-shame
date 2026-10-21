#!/bin/zsh
set -eu
TASK_BUILD_DIR="$(mktemp -d /tmp/slop-shame-v2-build.XXXXXX)"
print -r -- "$TASK_BUILD_DIR" > data/eval/raw/v2/build-directory.txt
rsync -a src public package.json pnpm-lock.yaml wxt.config.ts tsconfig.json "$TASK_BUILD_DIR/"
ln -s "$PWD/node_modules" "$TASK_BUILD_DIR/node_modules"
(cd "$TASK_BUILD_DIR" && pnpm build) > data/eval/raw/v2/build.log 2>&1
python3 - "$TASK_BUILD_DIR" "$PWD" <<'PY'
import pathlib,json,sys,hashlib
build=pathlib.Path(sys.argv[1]);root=pathlib.Path(sys.argv[2]);files=list((build/'.output/chrome-mv3').rglob('linkedin.js'))
if len(files)!=1:raise Exception(files)
p=files[0];b=p.read_bytes();result={'file':str(p.relative_to(build)),'bytes':len(b),'decimalMB':len(b)/1e6,'targetBytes':1000000,'pass':len(b)<=1000000,'sha256':hashlib.sha256(b).hexdigest(),'isolated':str(build),'installed':False}
json.dump(result,open(root/'eval/v2/bundle-size.json','w'),indent=2);print(result)
PY
rm -rf "$TASK_BUILD_DIR"
