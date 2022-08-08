perl -i -lpe 'print " \"version\": \"0.0.1\"," if $. == 2'  ./node_modules/.prisma/client/package.json
yarn build
pkg --debug -t node16-macos-arm64 -o xwin-server-macos .
sed -i -e  "2d"  ./node_modules/.prisma/client/package.json