perl -i -lpe 'print " \"version\": \"0.0.1\"," if $. == 2'  ./node_modules/.prisma/client/package.json
yarn build
rm -rf ./node_modules/.prisma/client/libquery_engine-darwin-arm64.dylib.node.bak
pkg -o xwin-server-macos .
sed -i -e  "2d"  ./node_modules/.prisma/client/package.json